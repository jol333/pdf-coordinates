import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { AnnotationPoint, CoordinateOrigin } from '../types';

export const saveAnnotatedPdf = async (
  originalPdfBytes: ArrayBuffer,
  annotations: AnnotationPoint[],
  fileName: string,
  origin: CoordinateOrigin = CoordinateOrigin.BOTTOM_LEFT
): Promise<void> => {
  try {
    const pdfDoc = await PDFDocument.load(originalPdfBytes);
    const pages = pdfDoc.getPages();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Group annotations by page
    const annotationsByPage: Record<number, AnnotationPoint[]> = {};
    annotations.forEach((ann) => {
      if (!annotationsByPage[ann.pageIndex]) {
        annotationsByPage[ann.pageIndex] = [];
      }
      annotationsByPage[ann.pageIndex].push(ann);
    });

    // Process each page
    Object.keys(annotationsByPage).forEach((pageIdxStr) => {
      const pageIndex = parseInt(pageIdxStr, 10) - 1;
      if (pageIndex >= 0 && pageIndex < pages.length) {
        const page = pages[pageIndex];
        const pageAnns = annotationsByPage[parseInt(pageIdxStr, 10)];
        const { width, height } = page.getSize();

        pageAnns.forEach((ann) => {
          // Constants for styling
          const DOT_RADIUS = 3;
          const CORNER_RADIUS = 3;
          const TEXT_SIZE = 8;
          const PADDING = 2;
          const RED_COLOR = rgb(0.8, 0.1, 0.1);
          const WHITE_COLOR = rgb(1, 1, 1);

          // 1. Calculate Display Text based on Origin
          let displayX = ann.x;
          let displayY = ann.y;

          switch (origin) {
            case CoordinateOrigin.TOP_LEFT:
              displayX = ann.x;
              displayY = height - ann.y;
              break;
            case CoordinateOrigin.TOP_RIGHT:
              displayX = width - ann.x;
              displayY = height - ann.y;
              break;
            case CoordinateOrigin.BOTTOM_RIGHT:
              displayX = width - ann.x;
              displayY = ann.y;
              break;
            case CoordinateOrigin.BOTTOM_LEFT:
            default:
              displayX = ann.x;
              displayY = ann.y;
              break;
          }

          // 2. Draw the Red Dot (Circle)
          page.drawCircle({
            x: ann.x,
            y: ann.y,
            size: DOT_RADIUS,
            color: RED_COLOR,
            borderWidth: 0,
          });

          // 3. Prepare Text Label
          const text = `x:${Math.round(displayX)}, y:${Math.round(displayY)}`;
          const textWidth = helveticaFont.widthOfTextAtSize(text, TEXT_SIZE);
          const textHeight = helveticaFont.heightAtSize(TEXT_SIZE);
          
          const boxWidth = textWidth + PADDING * 2;
          const boxHeight = textHeight + PADDING * 2;

          // 4. Calculate Box Dimensions & Position
          // Requirement: "Top right corner of red dot and bottom left corner of red container... should be same"
          // Default Base position (Top-Right quadrant relative to dot center)
          // PDF Coords: x moves right, y moves up.
          let boxX = ann.x + DOT_RADIUS;
          let boxY = ann.y + DOT_RADIUS;

          // Boundary Checks
          // Check Right Edge: If box extends past width, flip to Left side
          if (boxX + boxWidth > width) {
             // New position: x - r - boxWidth (This aligns box right edge with dot left edge)
             boxX = ann.x - DOT_RADIUS - boxWidth;
          }

          // Check Top Edge: If box extends past height, flip to Bottom side
          if (boxY + boxHeight > height) {
             // New position: y - r - boxHeight (This aligns box top edge with dot bottom edge)
             boxY = ann.y - DOT_RADIUS - boxHeight;
          }

          // 5. Draw Rounded Rectangle for Text Background
          // Central Horizontal Rect
          page.drawRectangle({
            x: boxX,
            y: boxY + CORNER_RADIUS,
            width: boxWidth,
            height: boxHeight - 2 * CORNER_RADIUS,
            color: RED_COLOR,
          });
          // Central Vertical Rect
          page.drawRectangle({
            x: boxX + CORNER_RADIUS,
            y: boxY,
            width: boxWidth - 2 * CORNER_RADIUS,
            height: boxHeight,
            color: RED_COLOR,
          });
          // Four Corners
          page.drawCircle({ x: boxX + CORNER_RADIUS, y: boxY + CORNER_RADIUS, size: CORNER_RADIUS, color: RED_COLOR, borderWidth: 0 }); // Bottom Left
          page.drawCircle({ x: boxX + boxWidth - CORNER_RADIUS, y: boxY + CORNER_RADIUS, size: CORNER_RADIUS, color: RED_COLOR, borderWidth: 0 }); // Bottom Right
          page.drawCircle({ x: boxX + boxWidth - CORNER_RADIUS, y: boxY + boxHeight - CORNER_RADIUS, size: CORNER_RADIUS, color: RED_COLOR, borderWidth: 0 }); // Top Right
          page.drawCircle({ x: boxX + CORNER_RADIUS, y: boxY + boxHeight - CORNER_RADIUS, size: CORNER_RADIUS, color: RED_COLOR, borderWidth: 0 }); // Top Left

          // 6. Draw Text
          page.drawText(text, {
            x: boxX + PADDING,
            y: boxY + PADDING + 1.5,
            size: TEXT_SIZE,
            font: helveticaFont,
            color: WHITE_COLOR,
          });
        });
      }
    });

    const modifiedPdfBytes = await pdfDoc.save();
    const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `annotated_${fileName}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error saving PDF:', error);
    throw new Error('Failed to save annotated PDF.');
  }
};