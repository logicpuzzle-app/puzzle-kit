/**
 * Akari (Light Up) Highlight Provider
 *
 * Highlights cells lit by placed lamps (cross-shaped beams).
 */

import { getCellIndexById } from '../../utils/gridUtils';
import { registerHighlightProvider, type HighlightContext, type HighlightOutput, type HighlightFill } from './core';

const WALL_COLORS = new Set(['#000000', '#444444']);
const LIGHT_COLOR = '#ffe08a';
const LIGHT_OPACITY = 0.45;

const isWallCell = (ctx: HighlightContext, cellId: string): boolean => {
  const surfaces = ctx.puzzle.problem.surfaces || {};
  const numbers = ctx.puzzle.problem.numbers || {};

  if (Object.values(numbers).some((num) => num.cellId === cellId)) {
    return true;
  }

  return Object.values(surfaces).some(
    (surface) => surface.cellId === cellId && WALL_COLORS.has(surface.color)
  );
};

const getLampCells = (ctx: HighlightContext): string[] => {
  const symbols = ctx.puzzle.answer.symbols || {};
  return Object.values(symbols)
    .filter((symbol) => symbol.symbolType === 'circle')
    .map((symbol) => symbol.cellId);
};

const getVisibleCells = (ctx: HighlightContext, startCellId: string): string[] => {
  const index = getCellIndexById(startCellId, ctx.grid);
  if (!index) return [];
  const { row, col } = index;
  const visible: string[] = [];
  const directions = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ];

  directions.forEach(({ dr, dc }) => {
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < ctx.grid.rows && c >= 0 && c < ctx.grid.cols) {
      const cellId = `cell-${r}-${c}`;
      if (isWallCell(ctx, cellId)) {
        break;
      }
      visible.push(cellId);
      r += dr;
      c += dc;
    }
  });

  return visible;
};

registerHighlightProvider('akari.light-beams', (ctx): HighlightOutput => {
  const lampCells = getLampCells(ctx);
  if (lampCells.length === 0) return { fills: [] };

  const litCells = new Set<string>();
  lampCells.forEach((cellId) => {
    if (!isWallCell(ctx, cellId)) {
      litCells.add(cellId);
    }
    getVisibleCells(ctx, cellId).forEach((visibleId) => litCells.add(visibleId));
  });

  const fills: HighlightFill[] = Array.from(litCells).map((cellId) => ({
    cellId,
    color: LIGHT_COLOR,
    opacity: LIGHT_OPACITY,
    layer: 'under-lines',
  }));

  return { fills };
});
