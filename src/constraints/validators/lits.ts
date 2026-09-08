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

import { getLitsRooms, getLitsShape, isLitsShaded, litsNeighbors } from '../helpers/lits';

/**
 * Check if a cell is shaded
 */
function isShaded(ctx: ValidationContext, row: number, col: number): boolean {
  const cellId = `cell-${row}-${col}`;
  if (ctx.grid.disabledCells?.includes(cellId) || ctx.grid.voidCells?.includes(cellId) || ctx.grid.outboardCells?.includes(cellId)) return false;
  return isLitsShaded(ctx.puzzle, cellId);
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

function checkTetrominoInRoom_lits(ctx: ValidationContext): CheckResult {
  const rooms = getLitsRooms(ctx);
  if (!rooms) return { ok: false };
  const invalid = [...rooms.values()].filter(cells => !getLitsShape(cells.filter(id => isLitsShaded(ctx.puzzle, id))));
  return { ok: invalid.length === 0, elements: invalid.flat() };
}

function checkAdjacentSameTetromino_lits(ctx: ValidationContext): CheckResult {
  const rooms = getLitsRooms(ctx);
  if (!rooms) return { ok: false };
  const owners = new Map<string, { room: number; shape: string }>();
  for (const [room, cells] of rooms) {
    const shaded = cells.filter(id => isLitsShaded(ctx.puzzle, id));
    const shape = getLitsShape(shaded);
    if (shape) shaded.forEach(id => owners.set(id, { room, shape }));
  }
  for (const [id, owner] of owners) {
    for (const neighbor of litsNeighbors(id)) {
      const other = owners.get(neighbor);
      if (other && other.room !== owner.room && other.shape === owner.shape) {
        return { ok: false, elements: [id, neighbor] };
      }
    }
  }
  return { ok: true };
}

registerCheckFunction('check2x2ShadeCell_lits', check2x2ShadeCell_lits);
registerCheckFunction('checkConnectShade_lits', checkConnectShade_lits);
registerCheckFunction('checkTetrominoInRoom_lits', checkTetrominoInRoom_lits);
registerCheckFunction('checkAdjacentSameTetromino_lits', checkAdjacentSameTetromino_lits);
