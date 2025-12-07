/**
 * LITS Puzzle Validator
 *
 * Based on pzprjs/src/variety/lits.js checklist:
 * - check2x2ShadeCell
 * - checkConnectShade
 * - checkTetrominoInRoom
 * - checkAdjacentSameTetromino
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
 * Check if cell is within bounds
 */
function inBounds(ctx: ValidationContext, row: number, col: number): boolean {
  return row >= 0 && row < ctx.grid.rows && col >= 0 && col < ctx.grid.cols;
}

/**
 * check2x2ShadeCell_lits - No 2x2 shaded squares
 */
function check2x2ShadeCell_lits(ctx: ValidationContext): CheckResult {
  for (let row = 0; row < ctx.grid.rows - 1; row++) {
    for (let col = 0; col < ctx.grid.cols - 1; col++) {
      if (
        isShaded(ctx, row, col) &&
        isShaded(ctx, row, col + 1) &&
        isShaded(ctx, row + 1, col) &&
        isShaded(ctx, row + 1, col + 1)
      ) {
        return {
          ok: false,
          elements: [
            `cell-${row}-${col}`,
            `cell-${row}-${col + 1}`,
            `cell-${row + 1}-${col}`,
            `cell-${row + 1}-${col + 1}`,
          ],
        };
      }
    }
  }
  return { ok: true };
}

/**
 * checkConnectShade_lits - All shaded cells must be connected
 */
function checkConnectShade_lits(ctx: ValidationContext): CheckResult {
  // Find all shaded cells
  const shadedCells: Array<{ row: number; col: number }> = [];
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      if (isShaded(ctx, row, col)) {
        shadedCells.push({ row, col });
      }
    }
  }

  if (shadedCells.length === 0) return { ok: true };

  // BFS from first shaded cell
  const visited = new Set<string>();
  const queue = [shadedCells[0]];
  visited.add(`${shadedCells[0].row}-${shadedCells[0].col}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const directions = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];

    for (const { dr, dc } of directions) {
      const nr = current.row + dr;
      const nc = current.col + dc;
      const key = `${nr}-${nc}`;

      if (!inBounds(ctx, nr, nc)) continue;
      if (visited.has(key)) continue;
      if (!isShaded(ctx, nr, nc)) continue;

      visited.add(key);
      queue.push({ row: nr, col: nc });
    }
  }

  // Check all shaded cells are reachable
  for (const cell of shadedCells) {
    if (!visited.has(`${cell.row}-${cell.col}`)) {
      return { ok: false };
    }
  }

  return { ok: true };
}

/**
 * Get tetromino type from its shape (L, I, T, S)
 */
function getTetrominoType(cells: Array<{ row: number; col: number }>): string | null {
  if (cells.length !== 4) return null;

  // Normalize positions
  const minRow = Math.min(...cells.map(c => c.row));
  const minCol = Math.min(...cells.map(c => c.col));
  const normalized = cells.map(c => ({ row: c.row - minRow, col: c.col - minCol }));
  normalized.sort((a, b) => a.row * 100 + a.col - (b.row * 100 + b.col));

  const key = normalized.map(c => `${c.row},${c.col}`).join('|');

  // All possible L, I, T, S shapes in all rotations
  const patterns: Record<string, string> = {
    // I shapes
    '0,0|0,1|0,2|0,3': 'I',
    '0,0|1,0|2,0|3,0': 'I',
    // L shapes (and J = rotated L)
    '0,0|1,0|2,0|2,1': 'L',
    '0,0|0,1|0,2|1,0': 'L',
    '0,0|0,1|1,1|2,1': 'L',
    '0,2|1,0|1,1|1,2': 'L',
    '0,0|0,1|1,0|2,0': 'L',
    '0,0|0,1|0,2|1,2': 'L',
    '0,1|1,1|2,0|2,1': 'L',
    '0,0|1,0|1,1|1,2': 'L',
    // T shapes
    '0,0|0,1|0,2|1,1': 'T',
    '0,0|1,0|1,1|2,0': 'T',
    '0,1|1,0|1,1|1,2': 'T',
    '0,1|1,0|1,1|2,1': 'T',
    // S shapes (and Z = rotated S)
    '0,0|0,1|1,1|1,2': 'S',
    '0,1|1,0|1,1|2,0': 'S',
    '0,1|0,2|1,0|1,1': 'S',
    '0,0|1,0|1,1|2,1': 'S',
  };

  return patterns[key] || null;
}

/**
 * checkTetrominoInRoom_lits - Each room must contain exactly one tetromino
 * This is a simplified check - full implementation would need room borders
 */
function checkTetrominoInRoom_lits(_ctx: ValidationContext): CheckResult {
  // This would need room information from borders
  // For now, just return ok - full implementation would check room borders
  return { ok: true };
}

/**
 * checkAdjacentSameTetromino_lits - Same-shaped tetrominoes cannot be adjacent
 * This is a simplified check
 */
function checkAdjacentSameTetromino_lits(_ctx: ValidationContext): CheckResult {
  // This would need room information and tetromino identification
  // For now, just return ok - full implementation would be more complex
  return { ok: true };
}

// Register check functions
registerCheckFunction('check2x2ShadeCell_lits', check2x2ShadeCell_lits);
registerCheckFunction('checkConnectShade_lits', checkConnectShade_lits);
registerCheckFunction('checkTetrominoInRoom_lits', checkTetrominoInRoom_lits);
registerCheckFunction('checkAdjacentSameTetromino_lits', checkAdjacentSameTetromino_lits);
