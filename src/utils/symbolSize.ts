import type { SymbolSize } from '../types';

export const SYMBOL_SIZE_PRESETS = { small: 0.5, medium: 0.7, large: 1, largest: 1.3 } as const;
export const MIN_SYMBOL_SCALE = 0.1;
export const MAX_SYMBOL_SCALE = 3;

export function isSymbolSize(value: unknown): value is SymbolSize {
  return typeof value === 'number'
    ? Number.isFinite(value) && value >= MIN_SYMBOL_SCALE && value <= MAX_SYMBOL_SCALE
    : typeof value === 'string' && Object.hasOwn(SYMBOL_SIZE_PRESETS, value);
}

/** Preserve legacy preset rendering; malformed imported values use the old small fallback. */
export function resolveSymbolSize(size: unknown): number {
  if (!isSymbolSize(size)) return SYMBOL_SIZE_PRESETS.small;
  return typeof size === 'number' ? size : SYMBOL_SIZE_PRESETS[size];
}
