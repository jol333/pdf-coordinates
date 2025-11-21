import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Document } from 'react-pdf';
import { PDFDocument } from 'pdf-lib';
import {
  Upload,
  Download,
  ZoomIn,
  ZoomOut,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileText,
  MousePointerClick,
  AlertCircle,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowDownRight,
  RotateCcw
} from 'lucide-react';
import { PdfCanvas } from './components/PdfCanvas';
import { AnnotationPoint, CoordinateOrigin, PageDimensions } from './types';
import { saveAnnotatedPdf } from './services/pdfModifier';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [annotations, setAnnotations] = useState<AnnotationPoint[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [origin, setOrigin] = useState<CoordinateOrigin>(CoordinateOrigin.BOTTOM_LEFT);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pageDimensions, setPageDimensions] = useState<Record<number, PageDimensions>>({});

  // Canvas Viewport State
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const dragStartRef = useRef<{ x: number, y: number } | null>(null);

  // Keyboard shortcuts for deletion and tool toggling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if the user is interacting with an input element
      const target = e.target as HTMLElement;
      const isInputActive = target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isInputActive) {
        return; // Let default behavior handle inputs (e.g. backspace deletes text)
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        handleDeleteAnnotation(selectedId);
        setSelectedId(null);
      }
      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsDraggingCanvas(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedId]);

  // Canvas Panning (Wheel / Trackpad) logic
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    const handleWheel = (e: WheelEvent) => {
      // Prevent default browser scrolling / navigation / zoom
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom disabled per request.
        // We intentionally do nothing here to ignore zoom gestures.
        return;
      } else {
        // Pan (Trackpad gives both X and Y)
        setPan(prev => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY
        }));
      }
    };

    // Use { passive: false } to allow preventing default
    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, []);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0]) {
      const selectedFile = files[0];
      if (selectedFile.type !== 'application/pdf') {
        setError('Please select a valid PDF file.');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setAnnotations([]);
      setPageNumber(1);
      setPageDimensions({});
      setSelectedId(null);
      setPan({ x: 0, y: 0 }); // Reset view to center
      setScale(1.0);

      const reader = new FileReader();
      reader.onload = async (e) => {
        if (e.target?.result) {
          const buffer = e.target.result as ArrayBuffer;
          setFileData(buffer);
          // Pre-load dimensions using pdf-lib
          try {
            const pdfDoc = await PDFDocument.load(buffer);
            const pages = pdfDoc.getPages();
            const dims: Record<number, PageDimensions> = {};
            pages.forEach((p, idx) => {
              dims[idx + 1] = { width: p.getWidth(), height: p.getHeight() };
            });
            setPageDimensions(dims);
          } catch (err) {
            console.error("Error reading PDF dimensions:", err);
          }
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handleAddAnnotation = (ann: AnnotationPoint) => {
    setAnnotations((prev) => [...prev, ann]);
    setSelectedId(ann.id);
  };

  const handleDeleteAnnotation = (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleSave = async () => {
    if (!fileData || !file) return;
    setIsSaving(true);
    try {
      await saveAnnotatedPdf(fileData, annotations, file.name, origin);
    } catch (e) {
      console.error(e);
      setError('Failed to save the PDF. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const changePage = (offset: number) => {
    setPageNumber((prev) => Math.min(Math.max(1, prev + offset), numPages));
  };

  const handleResetView = () => {
    setPan({ x: 0, y: 0 });
    setScale(1.0);
  };

  // Coordinate Conversion Helpers
  const getDisplayCoordinates = (ann: AnnotationPoint) => {
    const dims = pageDimensions[ann.pageIndex];
    if (!dims) return { x: ann.x, y: ann.y };

    switch (origin) {
      case CoordinateOrigin.TOP_LEFT: return { x: ann.x, y: dims.height - ann.y };
      case CoordinateOrigin.TOP_RIGHT: return { x: dims.width - ann.x, y: dims.height - ann.y };
      case CoordinateOrigin.BOTTOM_RIGHT: return { x: dims.width - ann.x, y: ann.y };
      default: return { x: ann.x, y: ann.y };
    }
  };

  const updateAnnotationFromDisplay = (id: string, newX: number | null, newY: number | null) => {
    setAnnotations(prev => prev.map(ann => {
      if (ann.id !== id) return ann;
      const dims = pageDimensions[ann.pageIndex];
      if (!dims) return ann;

      // Revert display coordinates to canonical based on current origin
      let canonicalX = ann.x;
      let canonicalY = ann.y;

      if (newX !== null) {
        switch (origin) {
          case CoordinateOrigin.TOP_RIGHT:
          case CoordinateOrigin.BOTTOM_RIGHT:
            canonicalX = dims.width - newX;
            break;
          default:
            canonicalX = newX;
        }
      }

      if (newY !== null) {
        switch (origin) {
          case CoordinateOrigin.TOP_LEFT:
          case CoordinateOrigin.TOP_RIGHT:
            canonicalY = dims.height - newY;
            break;
          default:
            canonicalY = newY;
        }
      }

      // We need to update displayX/displayY as well for UI rendering
      const cssDisplayY = dims.height - canonicalY;
      const cssDisplayX = canonicalX;

      return {
        ...ann,
        x: canonicalX,
        y: canonicalY,
        displayX: cssDisplayX,
        displayY: cssDisplayY
      };
    }));
  };

  const handleUpdateAnnotationPosition = (id: string, x: number, y: number) => {
    setAnnotations(prev => prev.map(ann => {
      if (ann.id !== id) return ann;
      const dims = pageDimensions[ann.pageIndex];

      let displayX = x;
      // Default if dims missing
      let displayY = ann.displayY;

      if (dims) {
        displayY = dims.height - y;
      }

      return {
        ...ann,
        x,
        y,
        displayX,
        displayY
      };
    }));
  };

  const sortedAnnotations = useMemo(() => {
    return [...annotations].sort((a, b) => {
      if (a.pageIndex !== b.pageIndex) return a.pageIndex - b.pageIndex;

      // Sort visually Top to Bottom:
      // In PDF coords (Bottom-Left origin), higher Y is higher on page.
      // So sort by Y descending.
      // Use a small tolerance for floating point comparisons if roughly on same line, then sort left-to-right
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 2) {
        return yDiff;
      }
      return a.x - b.x;
    });
  }, [annotations]);


  // Drag-to-Pan Logic (Space + Click)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Only allow pan if Space is pressed or Middle Mouse button
    if (isSpacePressed || e.button === 1) {
      e.preventDefault();
      setIsDraggingCanvas(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    } else {
      // Regular click handling falls through to elements
      setSelectedId(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas && dragStartRef.current) {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      setPan(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingCanvas(false);
    dragStartRef.current = null;
  };


  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">

      {/* Sidebar */}
      <aside className="w-80 flex flex-col border-r border-slate-800 bg-slate-900 z-20 shrink-0 shadow-2xl">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <MousePointerClick className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">PDF Coordinates</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">Click points to annotate. Use trackpad to pan.</p>
        </div>

        {/* File Upload */}
        {!file && (
          <div className="p-4 border-b border-slate-800 bg-slate-900/50">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:bg-slate-800/50 hover:border-indigo-500 transition-all group">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-3 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                <p className="mb-1 text-sm text-slate-400"><span className="font-semibold">Click to select PDF</span></p>
                <p className="text-xs text-slate-500">PDF files only</p>
              </div>
              <input type="file" className="hidden" accept="application/pdf" onChange={onFileChange} />
            </label>
          </div>
        )}

        {/* File Info */}
        {file && (
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center space-x-3 overflow-hidden">
              <FileText className="w-5 h-5 text-indigo-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{file.name}</p>
              </div>
            </div>
            <button
              onClick={() => { setFile(null); setFileData(null); setAnnotations([]); }}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Settings / Origin Selector */}
        {file && (
          <div className="p-4 border-b border-slate-800 bg-slate-900/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Coordinate Origin</span>
            </div>
            <div className="flex items-center justify-between bg-slate-800 p-2 rounded-lg border border-slate-700">
              <div className="text-xs text-slate-400 flex flex-col space-y-1 pl-2">
                <span>Current: <span className="text-indigo-400 font-mono font-bold">{origin.replace('_', ' ')}</span></span>
                <span className="text-[10px] opacity-60">Origin (0,0) location</span>
              </div>

              {/* Visual Selector Grid */}
              <div className="grid grid-cols-2 gap-1 w-16 h-16 bg-slate-900 p-1 rounded border border-slate-700">
                <button
                  onClick={() => setOrigin(CoordinateOrigin.TOP_LEFT)}
                  title="Top Left"
                  className={`rounded-sm flex items-center justify-center transition-all ${origin === CoordinateOrigin.TOP_LEFT ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-600 hover:bg-slate-700'}`}
                >
                  <ArrowUpLeft className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setOrigin(CoordinateOrigin.TOP_RIGHT)}
                  title="Top Right"
                  className={`rounded-sm flex items-center justify-center transition-all ${origin === CoordinateOrigin.TOP_RIGHT ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-600 hover:bg-slate-700'}`}
                >
                  <ArrowUpRight className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setOrigin(CoordinateOrigin.BOTTOM_LEFT)}
                  title="Bottom Left (Standard)"
                  className={`rounded-sm flex items-center justify-center transition-all ${origin === CoordinateOrigin.BOTTOM_LEFT ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-600 hover:bg-slate-700'}`}
                >
                  <ArrowDownLeft className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setOrigin(CoordinateOrigin.BOTTOM_RIGHT)}
                  title="Bottom Right"
                  className={`rounded-sm flex items-center justify-center transition-all ${origin === CoordinateOrigin.BOTTOM_RIGHT ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-600 hover:bg-slate-700'}`}
                >
                  <ArrowDownRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Annotations List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Points List</h3>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{annotations.length}</span>
          </div>

          {annotations.length === 0 ? (
            <div className="text-center py-10 px-4">
              <p className="text-slate-600 text-sm">No points added yet.</p>
              <p className="text-slate-700 text-xs mt-1">Click anywhere on the PDF page to add a coordinate marker.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedAnnotations.map((ann, idx) => {
                const displayCoords = getDisplayCoordinates(ann);
                const isSelected = selectedId === ann.id;
                const isHovered = hoveredId === ann.id;

                // Check if we need to render a page header
                const showPageHeader = idx === 0 || ann.pageIndex !== sortedAnnotations[idx - 1].pageIndex;

                return (
                  <React.Fragment key={ann.id}>
                    {showPageHeader && (
                      <div className="mt-4 mb-2 first:mt-0">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                          Page {ann.pageIndex}
                        </h4>
                      </div>
                    )}
                    <div
                      onMouseEnter={() => setHoveredId(ann.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => setSelectedId(ann.id)}
                      className={`group flex items-center justify-between p-2 border rounded-lg transition-all cursor-pointer
                                        ${isSelected
                          ? 'bg-indigo-900/20 border-indigo-500/50'
                          : isHovered
                            ? 'bg-slate-800 border-slate-600'
                            : 'bg-slate-800/50 border-slate-700/50'
                        }
                                    `}
                    >
                      {/* Index Badge */}
                      <div className={`flex-shrink-0 flex items-center justify-center w-5 h-5 rounded text-[10px] font-mono font-bold mr-2 ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                        {idx + 1}
                      </div>

                      {/* Coordinates Input Group */}
                      <div className="flex items-center space-x-2 flex-1 mr-2">
                        <div className="flex items-center bg-slate-950/50 rounded px-1.5 py-0.5 border border-slate-700/50 focus-within:border-indigo-500/50 flex-1">
                          <span className="text-[10px] text-slate-500 mr-1 font-mono">X</span>
                          <input
                            type="number"
                            value={Math.round(displayCoords.x)}
                            onChange={(e) => updateAnnotationFromDisplay(ann.id, parseFloat(e.target.value) || 0, null)}
                            className="w-full bg-transparent text-xs font-mono text-white focus:outline-none min-w-0"
                          />
                        </div>
                        <div className="flex items-center bg-slate-950/50 rounded px-1.5 py-0.5 border border-slate-700/50 focus-within:border-indigo-500/50 flex-1">
                          <span className="text-[10px] text-slate-500 mr-1 font-mono">Y</span>
                          <input
                            type="number"
                            value={Math.round(displayCoords.y)}
                            onChange={(e) => updateAnnotationFromDisplay(ann.id, null, parseFloat(e.target.value) || 0)}
                            className="w-full bg-transparent text-xs font-mono text-white focus:outline-none min-w-0"
                          />
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteAnnotation(ann.id); }}
                        className={`p-1 rounded flex-shrink-0 transition-all ${isSelected || isHovered ? 'text-red-400 hover:bg-red-400/20' : 'text-transparent group-hover:text-slate-500'}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-slate-800 bg-slate-900">
          <button
            onClick={handleSave}
            disabled={!file || annotations.length === 0 || isSaving}
            className={`flex items-center justify-center w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all shadow-lg ${!file || annotations.length === 0
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-indigo-500/25'
              }`}
          >
            {isSaving ? (
              <span className="flex items-center space-x-2">
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                <span>Processing...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area (Infinite Canvas) */}
      <main className="flex-1 flex flex-col relative bg-slate-950 h-full overflow-hidden">
        {/* Toolbar */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-20 pointer-events-auto shrink-0" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center space-x-4">
            <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
              <button
                onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                disabled={!file}
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="w-16 text-center text-xs font-mono text-slate-300">{Math.round(scale * 100)}%</span>
              <button
                onClick={() => setScale(s => Math.min(3.0, s + 0.2))}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                disabled={!file}
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {numPages > 0 && (
              <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
                <button
                  onClick={() => changePage(-1)}
                  disabled={pageNumber <= 1}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 text-xs font-mono text-slate-300">
                  Page {pageNumber} / {numPages}
                </span>
                <button
                  onClick={() => changePage(1)}
                  disabled={pageNumber >= numPages}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Pan Hint */}
            <div className="text-[10px] text-slate-500 hidden md:flex items-center space-x-2 bg-slate-800/50 px-2 py-1 rounded border border-slate-700/30">
              <span className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300 font-mono">Space</span>
              <span>+ Drag to Pan</span>
            </div>

            {/* Reset Button */}
            <button
              onClick={handleResetView}
              disabled={!file}
              className={`p-1.5 rounded-lg transition-all flex items-center space-x-2 border border-transparent
                        ${!file ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-700'}
                    `}
              title="Reset Zoom & Position"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-xs font-medium hidden sm:inline">Reset</span>
            </button>

            {error && (
              <div className="flex items-center space-x-2 text-red-400 text-sm bg-red-400/10 px-3 py-1.5 rounded-full border border-red-400/20">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </header>

        {/* Viewport */}
        <div
          ref={viewportRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          className={`flex-1 overflow-hidden relative bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] flex items-center justify-center
                ${isSpacePressed || isDraggingCanvas ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
            `}
        >
          {!file ? (
            <div className="flex flex-col items-center justify-center text-slate-600 pointer-events-none">
              <div className="w-24 h-24 bg-slate-900 rounded-2xl border-2 border-dashed border-slate-800 flex items-center justify-center mb-4">
                <FileText className="w-10 h-10 opacity-20" />
              </div>
              <p>Upload a PDF to begin</p>
            </div>
          ) : (
            <div
              className="transition-transform duration-75 ease-linear will-change-transform"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px)`
              }}
            >
              <Document
                file={file}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex flex-col items-center space-y-4 p-20 bg-slate-900/50 rounded-xl backdrop-blur-sm border border-slate-800">
                    <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                    <p className="text-sm text-slate-400 animate-pulse">Loading PDF...</p>
                  </div>
                }
                error={
                  <div className="text-red-400 p-10 bg-slate-900/80 rounded-xl border border-red-500/20 flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5" />
                    <span>Error loading PDF. Please try another file.</span>
                  </div>
                }
              >
                <div className="shadow-2xl rounded-sm overflow-hidden ring-1 ring-white/10 bg-white">
                  <PdfCanvas
                    pageNumber={pageNumber}
                    scale={scale}
                    annotations={annotations}
                    origin={origin}
                    pageDimensions={pageDimensions[pageNumber] || null}
                    selectedId={selectedId}
                    hoveredId={hoveredId}
                    isPanning={isSpacePressed || isDraggingCanvas}
                    onAddAnnotation={handleAddAnnotation}
                    onSelectAnnotation={setSelectedId}
                    onUpdateAnnotationPosition={handleUpdateAnnotationPosition}
                    onPageLoadSuccess={() => console.log(`Page ${pageNumber} loaded`)}
                  />
                </div>
              </Document>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;