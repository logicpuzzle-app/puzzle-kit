/**
 * Simple Gako Puzzle Validator
 *
 * Based on pzprjs/src/variety/simplegako.js checklist:
 * - checkRowsColsTooManyNumber
 * - checkRowsColsNotEnoughNumber
 * - checkNoNumCell
 */

import {
  registerCheckFunction,
  type ValidationContext,
  type CheckResult,
} from './core';
import { getDirectionalCluesFromElements } from '../../utils/numberEntries';

/**
 * Build a map of cellId -> number from problem/answer layers.
 */
function buildNumberMap(ctx: ValidationContext): Map<string, number> {
  const map = new Map<string, number>();

  const addNumbers = (numbers: Record<string, { cellId: string; value: string }>, overwrite: boolean) => {
    for (const num of Object.values(numbers)) {
      if (!overwrite && map.has(num.cellId)) continue;
      const value = parseInt(String(num.value), 10);
      if (!isNaN(value)) {
        map.set(num.cellId, value);
      }
    }
  };

  const addDirectionalClues = (
    elements: ValidationContext['puzzle']['problem'] | ValidationContext['puzzle']['answer'],
    overwrite: boolean
  ) => {
    const clues = getDirectionalCluesFromElements(elements);
    for (const clue of clues) {
      if (clue.char !== undefined) continue;
      if (!overwrite && map.has(clue.cellId)) continue;
      const value = parseInt(String(clue.value), 10);
      if (!isNaN(value)) {
        map.set(clue.cellId, value);
      }
    }
  };

  addNumbers(ctx.puzzle.problem.numbers || {}, true);
  addDirectionalClues(ctx.puzzle.problem, false);
  addNumbers(ctx.puzzle.answer.numbers || {}, false);
  addDirectionalClues(ctx.puzzle.answer, false);

  return map;
}

/**
 * Check if the row/column count for each number satisfies a predicate.
 */
function checkRowsColsNumber(
  ctx: ValidationContext,
  evalFunc: (count: number, num: number) => boolean
): CheckResult {
  const numberMap = buildNumberMap(ctx);
  const rows = ctx.grid.rows;
  const cols = ctx.grid.cols;

  const getNumber = (row: number, col: number): number | null => {
    return numberMap.get(`cell-${row}-${col}`) ?? null;
  };

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const num = getNumber(row, col);
      if (num === null || num <= 0) continue;

      let count = 0;
      for (let c = 0; c < cols; c++) {
        if (getNumber(row, c) === num) count++;
      }
      for (let r = 0; r < rows; r++) {
        if (getNumber(r, col) === num) count++;
      }
      count -= 1;

      if (evalFunc(count, num)) {
        return { ok: false, elements: [`cell-${row}-${col}`] };
      }
    }
  }

  return { ok: true };
}

/**
 * checkRowsColsTooManyNumber - Same-number count exceeds the cell number.
 */
function checkRowsColsTooManyNumber(ctx: ValidationContext): CheckResult {
  return checkRowsColsNumber(ctx, (count, num) => count > num);
}

/**
 * checkRowsColsNotEnoughNumber - Same-number count is below the cell number.
 */
function checkRowsColsNotEnoughNumber(ctx: ValidationContext): CheckResult {
  return checkRowsColsNumber(ctx, (count, num) => count < num);
}

/**
 * checkNoNumCell - All cells must be filled with numbers.
 */
function checkNoNumCell(ctx: ValidationContext): CheckResult {
  const numberMap = buildNumberMap(ctx);
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      if (!numberMap.has(`cell-${row}-${col}`)) {
        return { ok: false, elements: [`cell-${row}-${col}`] };
      }
    }
  }
  return { ok: true };
}

// Register check functions
registerCheckFunction('checkRowsColsTooManyNumber', checkRowsColsTooManyNumber);
registerCheckFunction('checkRowsColsNotEnoughNumber', checkRowsColsNotEnoughNumber);
registerCheckFunction('checkNoNumCell', checkNoNumCell);
