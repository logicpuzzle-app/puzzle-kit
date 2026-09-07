import type { PaintCategory, PaintColorSwatch } from './types';

export const PAINT_CATEGORIES: Array<{ id: PaintCategory; labelKey: string }> = [
  { id: 'surface', labelKey: 'tool.surface' },
  { id: 'number', labelKey: 'tool.number' },
  { id: 'symbol', labelKey: 'tool.symbol' },
  { id: 'line', labelKey: 'tool.line' },
  { id: 'word', labelKey: 'tool.word' },
  { id: 'freehand', labelKey: 'tool.line.direction.freehand' },
];

export const PAINT_COLOR_SWATCHES: PaintColorSwatch[] = [
  { id: 'green', color: '#00A000', labelKey: 'paint.color.green', fallback: 'Green' },
  { id: 'blue', color: '#1E4FBF', labelKey: 'paint.color.blue', fallback: 'Blue' },
  { id: 'red', color: '#C3352E', labelKey: 'paint.color.red', fallback: 'Red' },
  { id: 'purple', color: '#6E3FA8', labelKey: 'paint.color.purple', fallback: 'Purple' },
  { id: 'black', color: '#1F1F1F', labelKey: 'paint.color.black', fallback: 'Black' },
];
