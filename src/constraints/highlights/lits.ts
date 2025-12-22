/**
 * LITS Highlight Provider
 *
 * Highlights rooms when a complete tetromino (4 connected shaded cells) is present.
 */

import {
  registerHighlightProvider,
  type HighlightContext,
  type HighlightOutput,
  type HighlightFill,
} from './core';
import { getCellIndexById } from '../../utils/gridUtils';

const SHADE_COLORS = new Set(['#000000', '#444444', '#808080']);
const HIGHLIGHT_COLOR = '#60ffa0';
const HIGHLIGHT_OPACITY = 1;

const getShadedCells = (ctx: HighlightContext): Set<string> => {
  const surfaces = ctx.puzzle.answer.surfaces || {};
  return new Set(
    Object.values(surfaces)
      .filter((surface) => SHADE_COLORS.has(surface.color))
      .map((surface) => surface.cellId)
  );
};

const getExcludedCells = (ctx: HighlightContext): Set<string> => {
  const { disabledCells, voidCells, outboardCells } = ctx.grid;
  return new Set([...(disabledCells || []), ...(voidCells || []), ...(outboardCells || [])]);
};

const getRoomCells = (ctx: HighlightContext, excludedCells: Set<string>): Map<number, string[]> => {
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

const areCellsConnected = (cellIds: string[], ctx: HighlightContext): boolean => {
  if (cellIds.length === 0) return false;
  const cellSet = new Set(cellIds);
  const visited = new Set<string>();
  const queue = [cellIds[0]];
  visited.add(cellIds[0]);

  while (queue.length > 0) {
    const current = queue.shift()!;
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
      if (!cellSet.has(neighbor) || visited.has(neighbor)) return;
      visited.add(neighbor);
      queue.push(neighbor);
    });
  }

  return visited.size === cellIds.length;
};

registerHighlightProvider('lits.tetromino-region', (ctx): HighlightOutput => {
  const shadedCells = getShadedCells(ctx);
  const excludedCells = getExcludedCells(ctx);
  const roomMap = ctx.puzzle.problem.roomMap;
  if (!roomMap) return { fills: [] };

  const rooms = getRoomCells(ctx, excludedCells);
  const fills: HighlightFill[] = [];

  rooms.forEach((cells) => {
    const shadedInRoom = cells.filter((cellId) => shadedCells.has(cellId));
    if (shadedInRoom.length !== 4) return;
    if (!areCellsConnected(shadedInRoom, ctx)) return;

    cells.forEach((cellId) => {
      fills.push({
        cellId,
        color: HIGHLIGHT_COLOR,
        opacity: HIGHLIGHT_OPACITY,
        layer: 'under-surfaces',
      });
    });
  });

  return { fills };
});
