import type { MenuDefinition, MenuItem } from '../toolbar/menu';

export type TranslateFn = (key: string, ...args: Array<string | number | Record<string, unknown>>) => string;

export type PaintCategory = 'surface' | 'number' | 'word' | 'symbol' | 'line' | 'freehand';

export type PaintMenuItem = MenuItem;
export type PaintMenu = MenuDefinition;

export type PaintAdjustMode = 'answer' | 'board' | 'image';

export type PdfImagePage = {
  pageNumber: number;
  dataUrl: string;
};

export type PaintColorSwatch = {
  id: string;
  color: string;
  labelKey: string;
  fallback: string;
};

export type ResizeHandleType = 'nw' | 'ne' | 'sw' | 'se';

export type BoardResizeHandleType = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';
