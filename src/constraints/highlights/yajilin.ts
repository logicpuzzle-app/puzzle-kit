/**
 * Yajilin Highlight Provider
 *
 * Grays out clue numbers once the required shaded cells are satisfied.
 */

import { getCellIndexById } from '../../utils/gridUtils';
import { getDirectionalCluesFromElements } from '../../utils/numberEntries';
import { registerHighlightProvider, type HighlightContext, type HighlightOutput } from './core';

const SHADE_COLORS = new Set(['#000000', '#444444', '#808080']);
const SATISFIED_COLOR = '#8c8c8c';

type Direction = 'up' | 'down' | 'left' | 'right';

const isShaded = (ctx: HighlightContext, cellId: string): boolean => {
  const surfaces = ctx.puzzle.answer.surfaces || {};
  return Object.values(surfaces).some(
    (surface) => surface.cellId === cellId && SHADE_COLORS.has(surface.color)
  );
};

const penpaDirectionToDirection = (dir: number | undefined): Direction | null => {
  switch (dir) {
    case 1: return 'up';
    case 2: return 'down';
    case 3: return 'left';
    case 4: return 'right';
    default: return null;
  }
};

const countShadedInDirection = (ctx: HighlightContext, startCellId: string, direction: Direction): number => {
  const index = getCellIndexById(startCellId, ctx.grid);
  if (!index) return 0;
  let { row, col } = index;
  let count = 0;

  while (true) {
    switch (direction) {
      case 'up': row -= 1; break;
      case 'down': row += 1; break;
      case 'left': col -= 1; break;
      case 'right': col += 1; break;
    }
    if (row < 0 || row >= ctx.grid.rows || col < 0 || col >= ctx.grid.cols) {
      break;
    }
    const cellId = `cell-${row}-${col}`;
    if (isShaded(ctx, cellId)) {
      count += 1;
    }
  }

  return count;
};

registerHighlightProvider('yajilin.clue-satisfied', (ctx): HighlightOutput => {
  const clues = getDirectionalCluesFromElements(ctx.puzzle.problem);
  const textStyles: HighlightOutput['textStyles'] = [];

  clues.forEach((clue) => {
    const value = typeof clue.value === 'number' ? clue.value : null;
    if (value === null || value < 0) return;

    let cellId: string | null = null;
    if (clue.cellId) {
      cellId = clue.cellId;
    } else if (clue.cell !== undefined) {
      cellId = `cell-${Math.floor(clue.cell / ctx.grid.cols)}-${clue.cell % ctx.grid.cols}`;
    }
    if (!cellId) return;

    const direction = penpaDirectionToDirection(clue.direction);
    if (!direction) return;

    const shadedCount = countShadedInDirection(ctx, cellId, direction);
    if (shadedCount === value) {
      textStyles.push({
        cellId,
        target: 'directional',
        color: SATISFIED_COLOR,
      });
    }
  });

  return { textStyles };
});
