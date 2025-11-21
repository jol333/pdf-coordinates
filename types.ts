export interface AnnotationPoint {
  id: string;
  pageIndex: number; // 1-based index for UI, but we might handle 0-based internally
  x: number; // PDF Point coordinates (bottom-left origin)
  y: number; // PDF Point coordinates (bottom-left origin)
  displayX: number; // CSS/View coordinates relative to page top-left (unscaled)
  displayY: number; // CSS/View coordinates relative to page top-left (unscaled)
}

export interface PageDimensions {
  width: number;
  height: number;
}

export enum ToolMode {
  VIEW = 'VIEW',
  ANNOTATE = 'ANNOTATE',
}

export enum CoordinateOrigin {
  BOTTOM_LEFT = 'BOTTOM_LEFT',
  TOP_LEFT = 'TOP_LEFT',
  TOP_RIGHT = 'TOP_RIGHT',
  BOTTOM_RIGHT = 'BOTTOM_RIGHT',
}