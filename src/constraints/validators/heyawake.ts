/**
 * Heyawake Puzzle Validator
 *
 * Based on pzprjs/src/variety/heyawake.js checklist:
 * - checkShadeCellExist (at least one shaded cell)
 * - checkAdjacentShadeCell (no adjacent black cells)
 * - checkConnectUnshadeRB (all white cells connected)
 * - checkShadeCellCount (room shade count matches clue)
 * - checkCountinuousUnshadeCell (no straight white path crossing 2+ room borders)
 */

import {
  registerCheckFunction,
  type ValidationContext,
  type CheckResult,
} from './core';

// Shaded cell color
const SHADE_COLORS = ['#000000', '#444444', '#808080'];

/**
 * Check if a cell is shaded (black)
 */
function isShaded(ctx: ValidationContext, row: number, col: number): boolean {
  const cellId = `cell-${row}-${col}`;
  const surfaces = ctx.puzzle.answer.surfaces;

  for (const surface of Object.values(surfaces)) {
    if (surface.cellId === cellId && SHADE_COLORS.includes(surface.color)) {
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
 * Get room ID for a cell
 */
function getRoomId(ctx: ValidationContext, row: number, col: number): number | undefined {
  const roomMap = ctx.puzzle.problem.roomMap;
  if (!roomMap) return undefined;
  const cellId = `cell-${row}-${col}`;
  return roomMap[cellId];
}

/**
 * Get all cells in a connected region (using flood fill)
 */
function getConnectedRegion(
  ctx: ValidationContext,
  startRow: number,
  startCol: number,
  isTarget: (row: number, col: number) => boolean
): Set<string> {
  const region = new Set<string>();
  const queue: { row: number; col: number }[] = [{ row: startRow, col: startCol }];
  const key = (r: number, c: number) => `${r}-${c}`;

  while (queue.length > 0) {
    const { row, col } = queue.shift()!;
    const k = key(row, col);

    if (region.has(k)) continue;
    if (!inBounds(ctx, row, col)) continue;
    if (!isTarget(row, col)) continue;

    region.add(k);

    // Add orthogonal neighbors
    queue.push({ row: row - 1, col });
    queue.push({ row: row + 1, col });
    queue.push({ row, col: col - 1 });
    queue.push({ row, col: col + 1 });
  }

  return region;
}

/**
 * Get cells grouped by room ID
 */
function getRoomCells(ctx: ValidationContext): Map<number, { row: number; col: number }[]> {
  const rooms = new Map<number, { row: number; col: number }[]>();
  const roomMap = ctx.puzzle.problem.roomMap;

  if (!roomMap) return rooms;

  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const roomId = getRoomId(ctx, row, col);
      if (roomId !== undefined) {
        if (!rooms.has(roomId)) {
          rooms.set(roomId, []);
        }
        rooms.get(roomId)!.push({ row, col });
      }
    }
  }

  return rooms;
}

/**
 * Get the number clue for a room (if any)
 */
function getRoomClue(ctx: ValidationContext, roomCells: { row: number; col: number }[]): number | null {
  for (const cell of roomCells) {
    const num = ctx.getNumber(cell.row, cell.col);
    if (num !== null) {
      const parsed = parseInt(num);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

// ========================================
// Data-Driven Check Functions
// ========================================

/**
 * checkShadeCellExist - At least one shaded cell must exist
 */
function checkShadeCellExist(ctx: ValidationContext): CheckResult {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      if (isShaded(ctx, row, col)) {
        return { ok: true }; // Found at least one shaded cell
      }
    }
  }
  return { ok: false };
}

/**
 * checkAdjacentShadeCell - Shaded cells cannot be orthogonally adjacent
 */
function checkAdjacentShadeCell(ctx: ValidationContext): CheckResult {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      if (!isShaded(ctx, row, col)) continue;

      // Check right neighbor
      if (col + 1 < ctx.grid.cols && isShaded(ctx, row, col + 1)) {
        return {
          ok: false,
          elements: [`cell-${row}-${col}`, `cell-${row}-${col + 1}`],
        };
      }
      // Check bottom neighbor
      if (row + 1 < ctx.grid.rows && isShaded(ctx, row + 1, col)) {
        return {
          ok: false,
          elements: [`cell-${row}-${col}`, `cell-${row + 1}-${col}`],
        };
      }
    }
  }
  return { ok: true };
}

/**
 * checkConnectUnshadeRB - All unshaded (white) cells must be connected
 */
function checkConnectUnshadeRB(ctx: ValidationContext): CheckResult {
  // Find all unshaded cells
  const unshadedCells: { row: number; col: number }[] = [];
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      if (!isShaded(ctx, row, col)) {
        unshadedCells.push({ row, col });
      }
    }
  }

  if (unshadedCells.length === 0) return { ok: true };

  // Get connected region starting from first unshaded cell
  const connected = getConnectedRegion(
    ctx,
    unshadedCells[0].row,
    unshadedCells[0].col,
    (r, c) => !isShaded(ctx, r, c)
  );

  // Check if all unshaded cells are connected
  if (connected.size !== unshadedCells.length) {
    return { ok: false };
  }
  return { ok: true };
}

/**
 * checkShadeCellCount - Room shade count must match the clue number
 */
function checkShadeCellCount(ctx: ValidationContext): CheckResult {
  const roomMap = ctx.puzzle.problem.roomMap;
  if (!roomMap || Object.keys(roomMap).length === 0) {
    return { ok: true }; // Skip check - no room information available
  }

  const rooms = getRoomCells(ctx);

  for (const [roomId, cells] of rooms) {
    const clue = getRoomClue(ctx, cells);
    if (clue === null) continue; // No clue for this room

    // Count shaded cells in this room
    let shadedCount = 0;
    for (const cell of cells) {
      if (isShaded(ctx, cell.row, cell.col)) {
        shadedCount++;
      }
    }

    if (shadedCount !== clue) {
      // Find the clue cell for error reporting
      let clueCellId = `cell-${cells[0].row}-${cells[0].col}`;
      for (const cell of cells) {
        if (ctx.getNumber(cell.row, cell.col) !== null) {
          clueCellId = `cell-${cell.row}-${cell.col}`;
          break;
        }
      }
      return { ok: false, elements: [clueCellId] };
    }
  }
  return { ok: true };
}

/**
 * checkCountinuousUnshadeCell - A straight line of white cells cannot cross 2+ room borders
 *
 * This checks that a horizontal or vertical line of unshaded cells
 * does not pass through more than one room boundary without being interrupted by a shaded cell.
 */
function checkCountinuousUnshadeCell(ctx: ValidationContext): CheckResult {
  const roomMap = ctx.puzzle.problem.roomMap;
  if (!roomMap || Object.keys(roomMap).length === 0) {
    return { ok: true }; // Skip check - no room information available
  }

  // Check horizontal lines
  for (let row = 0; row < ctx.grid.rows; row++) {
    let startCol = -1;
    let roomBordersCrossed = 0;
    let lastRoomId: number | undefined = undefined;
    let lineCells: { row: number; col: number }[] = [];

    for (let col = 0; col <= ctx.grid.cols; col++) {
      const inGrid = col < ctx.grid.cols;
      const shaded = inGrid && isShaded(ctx, row, col);
      const currentRoomId = inGrid ? getRoomId(ctx, row, col) : undefined;

      if (inGrid && !shaded) {
        // Unshaded cell - continue or start line
        if (startCol === -1) {
          startCol = col;
          lastRoomId = currentRoomId;
          lineCells = [{ row, col }];
        } else {
          lineCells.push({ row, col });
          // Check if we crossed a room border
          if (lastRoomId !== undefined && currentRoomId !== undefined && lastRoomId !== currentRoomId) {
            roomBordersCrossed++;
          }
          lastRoomId = currentRoomId;
        }
      } else {
        // Shaded cell or end of row - check the line
        if (startCol !== -1 && roomBordersCrossed >= 2) {
          // Error: white line crosses 2+ room borders
          const errorCells = lineCells.map(c => `cell-${c.row}-${c.col}`);
          return { ok: false, elements: errorCells };
        }
        // Reset
        startCol = -1;
        roomBordersCrossed = 0;
        lastRoomId = undefined;
        lineCells = [];
      }
    }
  }

  // Check vertical lines
  for (let col = 0; col < ctx.grid.cols; col++) {
    let startRow = -1;
    let roomBordersCrossed = 0;
    let lastRoomId: number | undefined = undefined;
    let lineCells: { row: number; col: number }[] = [];

    for (let row = 0; row <= ctx.grid.rows; row++) {
      const inGrid = row < ctx.grid.rows;
      const shaded = inGrid && isShaded(ctx, row, col);
      const currentRoomId = inGrid ? getRoomId(ctx, row, col) : undefined;

      if (inGrid && !shaded) {
        // Unshaded cell - continue or start line
        if (startRow === -1) {
          startRow = row;
          lastRoomId = currentRoomId;
          lineCells = [{ row, col }];
        } else {
          lineCells.push({ row, col });
          // Check if we crossed a room border
          if (lastRoomId !== undefined && currentRoomId !== undefined && lastRoomId !== currentRoomId) {
            roomBordersCrossed++;
          }
          lastRoomId = currentRoomId;
        }
      } else {
        // Shaded cell or end of column - check the line
        if (startRow !== -1 && roomBordersCrossed >= 2) {
          // Error: white line crosses 2+ room borders
          const errorCells = lineCells.map(c => `cell-${c.row}-${c.col}`);
          return { ok: false, elements: errorCells };
        }
        // Reset
        startRow = -1;
        roomBordersCrossed = 0;
        lastRoomId = undefined;
        lineCells = [];
      }
    }
  }
  return { ok: true };
}

// ========================================
// Register Check Functions
// ========================================

registerCheckFunction('checkShadeCellExist', checkShadeCellExist);
registerCheckFunction('checkAdjacentShadeCell', checkAdjacentShadeCell);
registerCheckFunction('checkConnectUnshadeRB', checkConnectUnshadeRB);
registerCheckFunction('checkShadeCellCount', checkShadeCellCount);
registerCheckFunction('checkCountinuousUnshadeCell', checkCountinuousUnshadeCell);
