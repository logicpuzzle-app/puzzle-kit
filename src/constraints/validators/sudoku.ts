/**
 * Sudoku Puzzle Validator
 *
 * Based on pzprjs/src/variety/sudoku.js checklist:
 * - checkRowNumber
 * - checkColNumber
 * - checkBlockNumber
 * - checkEmptyCell
 */

import {
  registerCheckFunction,
  type ValidationContext,
  type CheckResult,
} from './core';

/**
 * Get number at position (from problem or answer)
 */
function getNumber(ctx: ValidationContext, row: number, col: number): number | null {
  const cellId = `cell-${row}-${col}`;

  // Check problem numbers
  const problemNumbers = ctx.puzzle.problem.numbers || {};
  for (const num of Object.values(problemNumbers)) {
    if (num.cellId === cellId) {
      const v = parseInt(String(num.value), 10);
      return isNaN(v) ? null : v;
    }
  }

  // Check answer numbers
  const answerNumbers = ctx.puzzle.answer.numbers || {};
  for (const num of Object.values(answerNumbers)) {
    if (num.cellId === cellId) {
      const v = parseInt(String(num.value), 10);
      return isNaN(v) ? null : v;
    }
  }

  return null;
}

/**
 * checkRowNumber - Each row must have unique numbers 1-9
 */
function checkRowNumber(ctx: ValidationContext): CheckResult {
  for (let row = 0; row < ctx.grid.rows; row++) {
    const seen = new Map<number, string>();
    for (let col = 0; col < ctx.grid.cols; col++) {
      const num = getNumber(ctx, row, col);
      if (num === null) continue;

      const existing = seen.get(num);
      if (existing) {
        return { ok: false, elements: [existing, `cell-${row}-${col}`] };
      }
      seen.set(num, `cell-${row}-${col}`);
    }
  }
  return { ok: true };
}

/**
 * checkColNumber - Each column must have unique numbers 1-9
 */
function checkColNumber(ctx: ValidationContext): CheckResult {
  for (let col = 0; col < ctx.grid.cols; col++) {
    const seen = new Map<number, string>();
    for (let row = 0; row < ctx.grid.rows; row++) {
      const num = getNumber(ctx, row, col);
      if (num === null) continue;

      const existing = seen.get(num);
      if (existing) {
        return { ok: false, elements: [existing, `cell-${row}-${col}`] };
      }
      seen.set(num, `cell-${row}-${col}`);
    }
  }
  return { ok: true };
}

/**
 * checkBlockNumber - Each 3x3 box must have unique numbers 1-9
 */
function checkBlockNumber(ctx: ValidationContext): CheckResult {
  const boxSize = 3;

  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const seen = new Map<number, string>();
      const startRow = boxRow * boxSize;
      const startCol = boxCol * boxSize;

      for (let dr = 0; dr < boxSize; dr++) {
        for (let dc = 0; dc < boxSize; dc++) {
          const row = startRow + dr;
          const col = startCol + dc;
          const num = getNumber(ctx, row, col);
          if (num === null) continue;

          const existing = seen.get(num);
          if (existing) {
            return { ok: false, elements: [existing, `cell-${row}-${col}`] };
          }
          seen.set(num, `cell-${row}-${col}`);
        }
      }
    }
  }
  return { ok: true };
}

/**
 * checkEmptyCell - All cells must be filled
 */
function checkEmptyCell(ctx: ValidationContext): CheckResult {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const num = getNumber(ctx, row, col);
      if (num === null) {
        return { ok: false, elements: [`cell-${row}-${col}`] };
      }
    }
  }
  return { ok: true };
}

// Register check functions
registerCheckFunction('checkRowNumber', checkRowNumber);
registerCheckFunction('checkColNumber', checkColNumber);
registerCheckFunction('checkBlockNumber', checkBlockNumber);
registerCheckFunction('checkEmptyCell', checkEmptyCell);
