/**
 * Norinori Puzzle Validator
 *
 * Based on pzprjs/src/variety/lits.js checklist for norinori:
 * - checkOverShadeCell (shaded block size <= 2)
 * - checkSingleShadeCell (shaded block size >= 2)
 * - checkOverShadeCellInArea (room shaded count <= 2)
 * - checkSingleShadeCellInArea (room shaded count != 1)
 * - checkNoShadeCellInArea (room shaded count > 0)
 */

import { getCellIndexById } from '../../utils/gridUtils';
import {
  registerCheckFunction,
  type ValidationContext,
  type CheckResult,
} from './core';

const SHADE_COLORS = new Set(['#000000', '#444444', '#808080']);

const getExcludedCells = (ctx: ValidationContext): Set<string> => {
  const { disabledCells, voidCells, outboardCells } = ctx.grid;
  return new Set([...(disabledCells || []), ...(voidCells || []), ...(outboardCells || [])]);
};

const getShadedCells = (ctx: ValidationContext): Set<string> => {
  const shaded = new Set<string>();
  Object.values(ctx.puzzle.answer.surfaces || {}).forEach((surface) => {
    if (surface.color && SHADE_COLORS.has(surface.color)) {
      shaded.add(surface.cellId);
    }
  });
  return shaded;
};

const collectShadedComponents = (
  ctx: ValidationContext,
  shadedCells: Set<string>,
  excludedCells: Set<string>
): string[][] => {
  const visited = new Set<string>();
  const components: string[][] = [];

  shadedCells.forEach((cellId) => {
    if (visited.has(cellId) || excludedCells.has(cellId)) return;
    const queue = [cellId];
    const component: string[] = [];
    visited.add(cellId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);
      const index = getCellIndexById(current, ctx.grid);
      if (!index) continue;
      const { row, col } = index;
      const neighbors = [
        `cell-${row - 1}-${col}`,
        `cell-${row + 1}-${col}`,
        `cell-${row}-${col - 1}`,
        `cell-${row}-${col + 1}`,
      ];

      neighbors.forEach((neighbor) => {
        if (!shadedCells.has(neighbor) || visited.has(neighbor) || excludedCells.has(neighbor)) {
          return;
        }
        visited.add(neighbor);
        queue.push(neighbor);
      });
    }

    components.push(component);
  });

  return components;
};

const getRoomCells = (ctx: ValidationContext, excludedCells: Set<string>): Map<number, string[]> => {
  const roomMap = ctx.puzzle.problem.roomMap;
  const rooms = new Map<number, string[]>();
  if (!roomMap) return rooms;

  Object.entries(roomMap).forEach(([cellId, roomId]) => {
    if (excludedCells.has(cellId)) return;
    if (!rooms.has(roomId)) rooms.set(roomId, []);
    rooms.get(roomId)!.push(cellId);
  });

  return rooms;
};

/**
 * checkOverShadeCell - No shaded block larger than 2 cells.
 */
function checkOverShadeCell(ctx: ValidationContext): CheckResult {
  const excludedCells = getExcludedCells(ctx);
  const shadedCells = getShadedCells(ctx);
  const components = collectShadedComponents(ctx, shadedCells, excludedCells);

  for (const component of components) {
    if (component.length > 2) {
      return { ok: false, elements: component };
    }
  }
  return { ok: true };
}

/**
 * checkSingleShadeCell - No shaded block of size 1.
 */
function checkSingleShadeCell(ctx: ValidationContext): CheckResult {
  const excludedCells = getExcludedCells(ctx);
  const shadedCells = getShadedCells(ctx);
  const components = collectShadedComponents(ctx, shadedCells, excludedCells);

  for (const component of components) {
    if (component.length < 2) {
      return { ok: false, elements: component };
    }
  }
  return { ok: true };
}

/**
 * checkOverShadeCellInArea - Each room has at most 2 shaded cells.
 */
function checkOverShadeCellInArea(ctx: ValidationContext): CheckResult {
  const roomMap = ctx.puzzle.problem.roomMap;
  if (!roomMap || Object.keys(roomMap).length === 0) {
    return { ok: true };
  }

  const excludedCells = getExcludedCells(ctx);
  const shadedCells = getShadedCells(ctx);
  const rooms = getRoomCells(ctx, excludedCells);

  for (const cells of rooms.values()) {
    const shadedInRoom = cells.filter((cellId) => shadedCells.has(cellId));
    if (shadedInRoom.length > 2) {
      return { ok: false, elements: shadedInRoom };
    }
  }
  return { ok: true };
}

/**
 * checkSingleShadeCellInArea - A room cannot have exactly one shaded cell.
 */
function checkSingleShadeCellInArea(ctx: ValidationContext): CheckResult {
  const roomMap = ctx.puzzle.problem.roomMap;
  if (!roomMap || Object.keys(roomMap).length === 0) {
    return { ok: true };
  }

  const excludedCells = getExcludedCells(ctx);
  const shadedCells = getShadedCells(ctx);
  const rooms = getRoomCells(ctx, excludedCells);

  for (const cells of rooms.values()) {
    const shadedInRoom = cells.filter((cellId) => shadedCells.has(cellId));
    if (shadedInRoom.length === 1) {
      return { ok: false, elements: shadedInRoom };
    }
  }
  return { ok: true };
}

/**
 * checkNoShadeCellInArea - Each room must contain at least one shaded cell.
 */
function checkNoShadeCellInArea(ctx: ValidationContext): CheckResult {
  const roomMap = ctx.puzzle.problem.roomMap;
  if (!roomMap || Object.keys(roomMap).length === 0) {
    return { ok: true };
  }

  const excludedCells = getExcludedCells(ctx);
  const shadedCells = getShadedCells(ctx);
  const rooms = getRoomCells(ctx, excludedCells);

  for (const cells of rooms.values()) {
    const shadedInRoom = cells.filter((cellId) => shadedCells.has(cellId));
    if (shadedInRoom.length === 0) {
      return { ok: false, elements: cells };
    }
  }
  return { ok: true };
}

registerCheckFunction('checkOverShadeCell', checkOverShadeCell);
registerCheckFunction('checkSingleShadeCell', checkSingleShadeCell);
registerCheckFunction('checkOverShadeCellInArea', checkOverShadeCellInArea);
registerCheckFunction('checkSingleShadeCellInArea', checkSingleShadeCellInArea);
registerCheckFunction('checkNoShadeCellInArea', checkNoShadeCellInArea);
