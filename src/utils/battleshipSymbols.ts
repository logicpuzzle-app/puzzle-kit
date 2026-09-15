export const BATTLESHIP_SYMBOLS = [
  'ship_single', 'ship_middle_h', 'ship_left', 'ship_top',
  'ship_right', 'ship_bottom', 'water', 'ship_dot',
] as const;
export type BattleshipSymbolType = typeof BATTLESHIP_SYMBOLS[number] | 'ship_middle_v';

export function isBattleshipSymbol(type: string): type is BattleshipSymbolType {
  return type === 'ship_middle_v' || (BATTLESHIP_SYMBOLS as readonly string[]).includes(type);
}

