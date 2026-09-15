import type { SymbolElement } from '../types';
import { BATTLESHIP_SYMBOLS } from './battleshipSymbols';

// Penpa class_square.js draw_battleship: variant is scoped to its category.
// The tuple's third entry controls drawing order, not symbol size.
export function decodePenpaBattleship(
  variant: number, category: string,
): Pick<SymbolElement, 'symbolType' | 'color' | 'fillColor' | 'size'> | undefined {
  if (!['battleship_B', 'battleship_G', 'battleship_W'].includes(category)) return;
  const symbolType = BATTLESHIP_SYMBOLS[variant - 1];
  if (!symbolType) return;
  const color = category === 'battleship_G' ? '#999999' : '#000000';
  return { symbolType, color, size: 'large',
    fillColor: category === 'battleship_W' && variant <= 6 ? 'none' : color };
}
