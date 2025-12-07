/**
 * Kakuro Puzzle Validator
 *
 * Based on pzprjs/src/variety/kakuro.js checklist:
 * - checkSameNumberInLine
 * - checkSumOfNumberInLine
 * - checkNoNumCell
 */

import {
  registerCheckFunction,
  type ValidationContext,
  type CheckResult,
} from './core';

/**
 * Check if a cell is a clue cell (wall with numbers)
 */
function isClueCell(ctx: ValidationContext, row: number, col: number): boolean {
  const cellId = `cell-${row}-${col}`;
  const clueCells = ctx.puzzle.problem.clueCells || {};

  for (const clue of Object.values(clueCells)) {
    if (clue.cellId === cellId) {
      return true;
    }
  }
  return false;
}

/**
 * Get answer number at position
 */
function getAnswerNumber(ctx: ValidationContext, row: number, col: number): number | null {
  const cellId = `cell-${row}-${col}`;
  const numbers = ctx.puzzle.answer.numbers || {};

  for (const num of Object.values(numbers)) {
    if (num.cellId === cellId) {
      const v = parseInt(String(num.value), 10);
      return isNaN(v) ? null : v;
    }
  }
  return null;
}

/**
 * Get clue for a run (horizontal or vertical sum)
 */
function getClueForRun(
  ctx: ValidationContext,
  row: number,
  col: number,
  direction: 'h' | 'v'
): number | null {
  // Look backwards to find the clue cell
  let r = row, c = col;
  while (true) {
    if (direction === 'h') {
      c--;
    } else {
      r--;
    }
    if (r < 0 || c < 0) break;
    if (isClueCell(ctx, r, c)) {
      // Get the appropriate clue (horizontal or vertical)
      const cellId = `cell-${r}-${c}`;
      const clueCells = ctx.puzzle.problem.clueCells || {};
      for (const clue of Object.values(clueCells)) {
        if (clue.cellId === cellId) {
          return direction === 'h' ? clue.horizontal : clue.vertical;
        }
      }
      break;
    }
  }
  return null;
}

/**
 * Get cells in a run starting from a position
 */
function getRunCells(
  ctx: ValidationContext,
  startRow: number,
  startCol: number,
  direction: 'h' | 'v'
): Array<{ row: number; col: number }> {
  const cells: Array<{ row: number; col: number }> = [];
  let r = startRow, c = startCol;

  while (r < ctx.grid.rows && c < ctx.grid.cols) {
    if (isClueCell(ctx, r, c)) break;
    cells.push({ row: r, col: c });

    if (direction === 'h') {
      c++;
    } else {
      r++;
    }
  }

  return cells;
}

/**
 * checkSameNumberInLine_kakuro - No duplicate numbers in same run
 */
function checkSameNumberInLine_kakuro(ctx: ValidationContext): CheckResult {
  const processed = new Set<string>();

  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      if (isClueCell(ctx, row, col)) continue;

      // Check horizontal run
      const hKey = `h-${row}-${col}`;
      if (!processed.has(hKey)) {
        // Find start of horizontal run
        let startCol = col;
        while (startCol > 0 && !isClueCell(ctx, row, startCol - 1)) {
          startCol--;
        }

        const hCells = getRunCells(ctx, row, startCol, 'h');
        for (const cell of hCells) {
          processed.add(`h-${cell.row}-${cell.col}`);
        }

        const seen = new Map<number, string>();
        for (const cell of hCells) {
          const num = getAnswerNumber(ctx, cell.row, cell.col);
          if (num === null) continue;

          const existing = seen.get(num);
          if (existing) {
            return { ok: false, elements: [existing, `cell-${cell.row}-${cell.col}`] };
          }
          seen.set(num, `cell-${cell.row}-${cell.col}`);
        }
      }

      // Check vertical run
      const vKey = `v-${row}-${col}`;
      if (!processed.has(vKey)) {
        // Find start of vertical run
        let startRow = row;
        while (startRow > 0 && !isClueCell(ctx, startRow - 1, col)) {
          startRow--;
        }

        const vCells = getRunCells(ctx, startRow, col, 'v');
        for (const cell of vCells) {
          processed.add(`v-${cell.row}-${cell.col}`);
        }

        const seen = new Map<number, string>();
        for (const cell of vCells) {
          const num = getAnswerNumber(ctx, cell.row, cell.col);
          if (num === null) continue;

          const existing = seen.get(num);
          if (existing) {
            return { ok: false, elements: [existing, `cell-${cell.row}-${cell.col}`] };
          }
          seen.set(num, `cell-${cell.row}-${cell.col}`);
        }
      }
    }
  }

  return { ok: true };
}

/**
 * checkSumOfNumberInLine_kakuro - Sum of numbers must match clue
 */
function checkSumOfNumberInLine_kakuro(ctx: ValidationContext): CheckResult {
  const processed = new Set<string>();

  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      if (isClueCell(ctx, row, col)) continue;

      // Check horizontal run
      const hKey = `h-${row}-${col}`;
      if (!processed.has(hKey)) {
        let startCol = col;
        while (startCol > 0 && !isClueCell(ctx, row, startCol - 1)) {
          startCol--;
        }

        const hCells = getRunCells(ctx, row, startCol, 'h');
        for (const cell of hCells) {
          processed.add(`h-${cell.row}-${cell.col}`);
        }

        const clue = getClueForRun(ctx, row, startCol, 'h');
        if (clue !== null) {
          let sum = 0;
          let allFilled = true;
          for (const cell of hCells) {
            const num = getAnswerNumber(ctx, cell.row, cell.col);
            if (num === null) {
              allFilled = false;
              break;
            }
            sum += num;
          }

          if (allFilled && sum !== clue) {
            return {
              ok: false,
              elements: hCells.map(c => `cell-${c.row}-${c.col}`),
            };
          }
        }
      }

      // Check vertical run
      const vKey = `v-${row}-${col}`;
      if (!processed.has(vKey)) {
        let startRow = row;
        while (startRow > 0 && !isClueCell(ctx, startRow - 1, col)) {
          startRow--;
        }

        const vCells = getRunCells(ctx, startRow, col, 'v');
        for (const cell of vCells) {
          processed.add(`v-${cell.row}-${cell.col}`);
        }

        const clue = getClueForRun(ctx, startRow, col, 'v');
        if (clue !== null) {
          let sum = 0;
          let allFilled = true;
          for (const cell of vCells) {
            const num = getAnswerNumber(ctx, cell.row, cell.col);
            if (num === null) {
              allFilled = false;
              break;
            }
            sum += num;
          }

          if (allFilled && sum !== clue) {
            return {
              ok: false,
              elements: vCells.map(c => `cell-${c.row}-${c.col}`),
            };
          }
        }
      }
    }
  }

  return { ok: true };
}

/**
 * checkNoNumCell_kakuro - All cells must have numbers
 */
function checkNoNumCell_kakuro(ctx: ValidationContext): CheckResult {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      if (isClueCell(ctx, row, col)) continue;

      const num = getAnswerNumber(ctx, row, col);
      if (num === null) {
        return { ok: false, elements: [`cell-${row}-${col}`] };
      }
    }
  }
  return { ok: true };
}

// Register check functions
registerCheckFunction('checkSameNumberInLine_kakuro', checkSameNumberInLine_kakuro);
registerCheckFunction('checkSumOfNumberInLine_kakuro', checkSumOfNumberInLine_kakuro);
registerCheckFunction('checkNoNumCell_kakuro', checkNoNumCell_kakuro);
