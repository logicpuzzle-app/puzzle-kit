import type { TFunction } from 'i18next';

export type TranslateFn = TFunction;

export type PaintCategory = 'surface' | 'number' | 'word' | 'symbol' | 'line' | 'freehand';

export type PaintMenuItem = {
  labelKey: string;
  action?: () => void;
  divider?: boolean;
  disabled?: boolean;
  checked?: boolean;
};

export type PaintMenu = {
  labelKey: string;
  items: PaintMenuItem[];
};

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
