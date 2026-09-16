export const CORNER_SYMBOLS = [
  'quarter-top-left', 'quarter-top-right', 'quarter-bottom-right', 'quarter-bottom-left',
  'arc-top-left', 'arc-top-right', 'arc-bottom-right', 'arc-bottom-left',
] as const;

export type CornerSymbolType = typeof CORNER_SYMBOLS[number];

export function isCornerSymbol(type: string): type is CornerSymbolType {
  return (CORNER_SYMBOLS as readonly string[]).includes(type);
}
