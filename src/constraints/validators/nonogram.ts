/**
 * Nonogram (Picross) Puzzle Validator
 *
 * Based on pzprjs/src/variety/nonogram.js checklist:
 * - checkRowClue
 * - checkColClue
 */

import {
  registerCheckFunction,
  type ValidationContext,
  type CheckResult,
} from './core';

const SHADE_COLOR = '#000000';

/**
 * Check if a cell is shaded
 */
function isShaded(ctx: ValidationContext, row: number, col: number): boolean {
  const cellId = `cell-${row}-${col}`;
  const surfaces = ctx.puzzle.answer.surfaces || {};

  for (const surface of Object.values(surfaces)) {
    if (surface.cellId === cellId && surface.color === SHADE_COLOR) {
      return true;
    }
  }
  return false;
}

/**
 * Get row clues (array of numbers for each row)
 */
function getRowClues(ctx: ValidationContext, row: number): number[] | null {
  const clues = ctx.puzzle.problem.rowClues || {};

  for (const clue of Object.values(clues)) {
    if (clue.row === row) {
      return clue.values || [];
    }
  }
  return null;
}

/**
 * Get column clues (array of numbers for each column)
 */
function getColClues(ctx: ValidationContext, col: number): number[] | null {
  const clues = ctx.puzzle.problem.colClues || {};

  for (const clue of Object.values(clues)) {
    if (clue.col === col) {
      return clue.values || [];
    }
  }
  return null;
}

/**
 * Get consecutive shaded groups in a line
 */
function getConsecutiveGroups(shaded: boolean[]): number[] {
  const groups: number[] = [];
  let currentGroup = 0;

  for (const s of shaded) {
    if (s) {
      currentGroup++;
    } else if (currentGroup > 0) {
      groups.push(currentGroup);
      currentGroup = 0;
    }
  }

  if (currentGroup > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * checkRowClue_nonogram - Row shading must match clues
 */
function checkRowClue_nonogram(ctx: ValidationContext): CheckResult {
  for (let row = 0; row < ctx.grid.rows; row++) {
    const clues = getRowClues(ctx, row);
    if (clues === null) continue;

    // Get shaded pattern for this row
    const shaded: boolean[] = [];
    for (let col = 0; col < ctx.grid.cols; col++) {
      shaded.push(isShaded(ctx, row, col));
    }

    const groups = getConsecutiveGroups(shaded);

    // Compare groups with clues
    if (groups.length !== clues.length) {
      return { ok: false, elements: [`row-${row}`] };
    }

    for (let i = 0; i < groups.length; i++) {
      if (groups[i] !== clues[i]) {
        return { ok: false, elements: [`row-${row}`] };
      }
    }
  }
  return { ok: true };
}

/**
 * checkColClue_nonogram - Column shading must match clues
 */
function checkColClue_nonogram(ctx: ValidationContext): CheckResult {
  for (let col = 0; col < ctx.grid.cols; col++) {
    const clues = getColClues(ctx, col);
    if (clues === null) continue;

    // Get shaded pattern for this column
    const shaded: boolean[] = [];
    for (let row = 0; row < ctx.grid.rows; row++) {
      shaded.push(isShaded(ctx, row, col));
    }

    const groups = getConsecutiveGroups(shaded);

    // Compare groups with clues
    if (groups.length !== clues.length) {
      return { ok: false, elements: [`col-${col}`] };
    }

    for (let i = 0; i < groups.length; i++) {
      if (groups[i] !== clues[i]) {
        return { ok: false, elements: [`col-${col}`] };
      }
    }
  }
  return { ok: true };
}

// Register check functions
registerCheckFunction('checkRowClue_nonogram', checkRowClue_nonogram);
registerCheckFunction('checkColClue_nonogram', checkColClue_nonogram);
