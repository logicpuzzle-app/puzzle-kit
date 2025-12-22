/**
 * Simple Loop Puzzle Validator
 *
 * Based on pzprjs/src/variety/country.js (simpleloop checklist):
 * - checkNoLine (every non-empty cell must be on the loop)
 */

import {
  registerCheckFunction,
  type ValidationContext,
  type CheckResult,
} from './core';

const EMPTY_COLORS = new Set(['#000000']);

const getEmptyCellSet = (ctx: ValidationContext): Set<string> => {
  const emptyCells = new Set<string>();
  Object.values(ctx.puzzle.problem.surfaces || {}).forEach((surface) => {
    if (surface.displayMode === 'dot' || (surface.color && EMPTY_COLORS.has(surface.color))) {
      emptyCells.add(surface.cellId);
    }
  });
  return emptyCells;
};

/**
 * checkNoLine - All non-empty cells must have at least one line.
 */
function checkNoLine(ctx: ValidationContext): CheckResult {
  const emptyCells = getEmptyCellSet(ctx);

  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const cellId = `cell-${row}-${col}`;
      if (emptyCells.has(cellId)) continue;
      const lineInfo = ctx.getCellLines(row, col);
      if (lineInfo.count === 0) {
        return { ok: false, elements: [cellId] };
      }
    }
  }
  return { ok: true };
}

registerCheckFunction('checkNoLine', checkNoLine);
