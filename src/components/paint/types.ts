import type { TFunction } from 'i18next';
import type { MenuDefinition, MenuItem } from '../toolbar/menu';

/**
 * The translate function handed down from `useTranslation()`.
 *
 * A hand-rolled signature here made every component prop reject the real `TFunction`,
 * whose overloads (key, key + defaultValue, key + options) are narrower than a rest
 * parameter. Alias the i18next type so call sites keep working and the props accept
 * what `useTranslation()` actually returns.
 */
export type TranslateFn = TFunction;

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
