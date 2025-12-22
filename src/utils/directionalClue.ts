export type PenpaDirection = 0 | 1 | 2 | 3 | 4;

const ARROW_TO_PENPA_DIRECTION: Record<number, PenpaDirection> = {
  [-1]: 0, // none
  0: 1, // up
  1: 3, // left
  2: 4, // right
  3: 2, // down
};

const PENPA_TO_ARROW_DIRECTION: Record<number, number> = {
  0: -1, // none
  1: 0, // up
  2: 3, // down
  3: 1, // left
  4: 2, // right
};

export function toPenpaDirection(arrowDirection: number): PenpaDirection {
  return ARROW_TO_PENPA_DIRECTION[arrowDirection] ?? 0;
}

export function toArrowDirection(penpaDirection: number): number {
  return PENPA_TO_ARROW_DIRECTION[penpaDirection] ?? -1;
}
