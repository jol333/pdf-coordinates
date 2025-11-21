import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Page, pdfjs } from 'react-pdf';
import { AnnotationPoint, CoordinateOrigin, PageDimensions } from '../types';

// Configure worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfCanvasProps {
  pageNumber: number;
  scale: number;
  annotations: AnnotationPoint[];
  origin: CoordinateOrigin;
  pageDimensions: PageDimensions | null;
  selectedId: string | null;
  hoveredId: string | null;
  isPanning: boolean; // New prop to control interaction mode
  onAddAnnotation: (ann: AnnotationPoint) => void;
  onSelectAnnotation: (id: string) => void;
  onUpdateAnnotationPosition: (id: string, x: number, y: number) => void;
  onPageLoadSuccess: (page: any) => void;
}

export const PdfCanvas: React.FC<PdfCanvasProps> = ({
  pageNumber,
  scale,
  annotations,
  origin,
  pageDimensions,
  selectedId,
  hoveredId,
  isPanning,
  onAddAnnotation,
  onSelectAnnotation,
  onUpdateAnnotationPosition,
  onPageLoadSuccess,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const lastDragEndTime = useRef<number>(0);
  
  // Dragging State
  const [dragState, setDragState] = useState<{
    id: string;
    startX: number;
    startY: number;
    initialPdfX: number;
    initialPdfY: number;
  } | null>(null);

  // Filter annotations for this page
  const pageAnnotations = annotations.filter((a) => a.pageIndex === pageNumber);

  // Handle dragging logic via window listeners to ensure smooth drag even if mouse leaves element
  useEffect(() => {
    if (!dragState) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - dragState.startX;
        const deltaY = e.clientY - dragState.startY;

        // Convert delta to PDF coordinate space
        // X axis: Right is positive.
        // Y axis: Up is positive (PDF standard), but CSS/Screen Y Down is positive.
        // So, screen deltaY needs to be inverted for PDF Y.
        const pdfDeltaX = deltaX / scale;
        const pdfDeltaY = -(deltaY / scale);

        let newX = dragState.initialPdfX + pdfDeltaX;
        let newY = dragState.initialPdfY + pdfDeltaY;

        // Clamp to page boundaries if dimensions are known
        if (pageDimensions) {
            newX = Math.max(0, Math.min(newX, pageDimensions.width));
            newY = Math.max(0, Math.min(newY, pageDimensions.height));
        }

        onUpdateAnnotationPosition(dragState.id, newX, newY);
    };

    const handleWindowMouseUp = () => {
        setDragState(null);
        lastDragEndTime.current = Date.now();
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
        window.removeEventListener('mousemove', handleWindowMouseMove);
        window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [dragState, scale, pageDimensions, onUpdateAnnotationPosition]);


  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // Prevent adding point if we are panning or just finished a drag
      if (isPanning) return;
      if (Date.now() - lastDragEndTime.current < 100) return;
      
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;

      // Unscale to get CSS points (approx PDF points usually)
      const unscaledX = offsetX / scale;
      const unscaledY = offsetY / scale;

      const pageHeightPoints = rect.height / scale;
      
      // Standard PDF: Bottom-Left origin
      const pdfX = unscaledX;
      const pdfY = pageHeightPoints - unscaledY;

      const newAnnotation: AnnotationPoint = {
        id: Math.random().toString(36).slice(2) + Date.now().toString(36),
        pageIndex: pageNumber,
        x: pdfX,
        y: pdfY,
        displayX: unscaledX, 
        displayY: unscaledY,
      };

      onAddAnnotation(newAnnotation);
    },
    [pageNumber, scale, onAddAnnotation, isPanning]
  );

  const handleAnnotationMouseDown = (e: React.MouseEvent, ann: AnnotationPoint) => {
    e.stopPropagation(); // Prevent click on canvas from firing
    
    // If we are panning (e.g. Space held), don't select/drag points
    if (isPanning) return;

    onSelectAnnotation(ann.id);
    
    setDragState({
        id: ann.id,
        startX: e.clientX,
        startY: e.clientY,
        initialPdfX: ann.x,
        initialPdfY: ann.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (isPanning || dragState) {
        setHoverPos(null);
        return;
      }
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setHoverPos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
      });
  };

  const handleMouseLeave = () => {
      setHoverPos(null);
  };

  const getLabelText = (ann: AnnotationPoint) => {
    if (!pageDimensions) return `x:${Math.round(ann.x)}, y:${Math.round(ann.y)}`;
    
    let x = ann.x;
    let y = ann.y;

    switch (origin) {
      case CoordinateOrigin.TOP_LEFT:
        y = pageDimensions.height - ann.y;
        break;
      case CoordinateOrigin.TOP_RIGHT:
        x = pageDimensions.width - ann.x;
        y = pageDimensions.height - ann.y;
        break;
      case CoordinateOrigin.BOTTOM_RIGHT:
        x = pageDimensions.width - ann.x;
        break;
      case CoordinateOrigin.BOTTOM_LEFT:
      default:
        // already correct
        break;
    }

    return `x:${Math.round(x)}, y:${Math.round(y)}`;
  };

  // Determine where to place the label relative to the dot (CSS positioning)
  const getLabelPositionStyle = (ann: AnnotationPoint) => {
    const defaultStyle: React.CSSProperties = { left: '4px', bottom: '4px' };
    if (!pageDimensions) return defaultStyle;

    const { width, height } = pageDimensions; // PDF dimensions
    const ESTIMATED_WIDTH = 110; 
    const ESTIMATED_HEIGHT = 30;

    // CSS displayY is distance from Top. If small, we are near top edge.
    const isNearTop = ann.displayY < ESTIMATED_HEIGHT;
    // CSS displayX is distance from Left. If (displayX + width) > PageWidth, we are near right edge.
    const isNearRight = ann.displayX + ESTIMATED_WIDTH > width;

    const style: React.CSSProperties = {};

    if (isNearRight) {
      style.right = '4px'; // Anchor right side of label to left of dot (offset by dot radius effectively handled by parent centering)
    } else {
      style.left = '4px';
    }

    if (isNearTop) {
      style.top = '4px'; // Anchor top of label to bottom of dot
    } else {
      style.bottom = '4px';
    }

    return style;
  };

  // Determine cursor style
  let cursorStyle = 'cursor-crosshair';
  if (dragState) cursorStyle = 'cursor-grabbing';
  else if (isPanning) cursorStyle = 'cursor-grab';

  return (
    <div 
      ref={containerRef}
      className={`relative inline-block shadow-xl group select-none leading-none ${cursorStyle}`}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <Page
        pageNumber={pageNumber}
        scale={scale}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        onLoadSuccess={onPageLoadSuccess}
        className="pdf-page-container block"
      />

      {/* Hover Cursor Guide - Only show if not dragging and not panning */}
      {hoverPos && !dragState && !isPanning && (
          <div 
            className="pointer-events-none absolute z-50 flex flex-col items-start"
            style={{ 
                left: hoverPos.x, 
                top: hoverPos.y 
            }}
          >
             <div className="ml-4 mt-4 bg-slate-800/90 text-white text-[10px] px-2 py-1 rounded shadow border border-slate-600 backdrop-blur-sm whitespace-nowrap">
                Click to Add Point
             </div>
          </div>
      )}

      {/* Render Existing Annotations */}
      {pageAnnotations.map((ann) => {
        const isSelected = selectedId === ann.id;
        const isHovered = hoveredId === ann.id;
        const labelStyle = getLabelPositionStyle(ann);
        const isDragging = dragState?.id === ann.id;

        return (
          <div
            key={ann.id}
            onMouseDown={(e) => handleAnnotationMouseDown(e, ann)}
            onClick={(e) => e.stopPropagation()}
            className={`absolute z-10 transition-transform duration-200 ease-out
                ${isDragging ? 'cursor-grabbing scale-110 z-50' : isPanning ? 'cursor-grab' : 'cursor-pointer'}
                ${isHovered && !isDragging && !isPanning ? 'z-20 scale-150' : ''}
            `}
            style={{
              left: ann.displayX * scale,
              top: ann.displayY * scale,
              // Disable transition during drag for responsiveness
              transition: isDragging ? 'none' : 'transform 0.2s ease-out'
            }}
          >
            {/* Glow Effect for Sidebar Hover */}
            {(isHovered || isDragging) && (
               <div className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-red-500/50 rounded-full blur-sm animate-pulse" />
            )}

            {/* The Marker Dot */}
            <div 
              className={`absolute -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full transition-all
                ${isSelected || isDragging ? 'bg-red-500 ring-2 ring-white scale-125' : 'bg-red-600'}
              `} 
            />
            
            {/* The Label */}
            <div 
              className={`absolute text-[10px] px-1.5 py-0.5 font-mono font-bold rounded-sm shadow-sm whitespace-nowrap leading-tight transition-colors pointer-events-none
                ${isSelected || isDragging ? 'bg-red-500 text-white ring-1 ring-white' : 'bg-red-600 text-white'}
              `}
              style={labelStyle}
            >
              {getLabelText(ann)}
            </div>
          </div>
        );
      })}
    </div>
  );
};