/**
 * Norinori Highlight Provider
 *
 * Highlights rooms that contain exactly two shaded cells.
 */

import {
  registerHighlightProvider,
  type HighlightContext,
  type HighlightOutput,
  type HighlightFill,
} from './core';

const SHADE_COLORS = new Set(['#000000', '#444444', '#808080']);
const HIGHLIGHT_COLOR = '#60ffa0';
const HIGHLIGHT_OPACITY = 1;

const getExcludedCells = (ctx: HighlightContext): Set<string> => {
  const { disabledCells, voidCells, outboardCells } = ctx.grid;
  return new Set([...(disabledCells || []), ...(voidCells || []), ...(outboardCells || [])]);
};

const getShadedCells = (ctx: HighlightContext): Set<string> => {
  const surfaces = ctx.puzzle.answer.surfaces || {};
  return new Set(
    Object.values(surfaces)
      .filter((surface) => SHADE_COLORS.has(surface.color))
      .map((surface) => surface.cellId)
  );
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

registerHighlightProvider('norinori.room-complete', (ctx): HighlightOutput => {
  const roomMap = ctx.puzzle.problem.roomMap;
  if (!roomMap) return { fills: [] };

  const shadedCells = getShadedCells(ctx);
  const excludedCells = getExcludedCells(ctx);
  const rooms = getRoomCells(ctx, excludedCells);
  const fills: HighlightFill[] = [];

  rooms.forEach((cells) => {
    const shadedInRoom = cells.filter((cellId) => shadedCells.has(cellId));
    if (shadedInRoom.length !== 2) return;

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
