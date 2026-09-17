import type { GridConfig } from '../types';

/** The fallback belongs to the caller's declared format, never to an ID spelling. */
export function triangleColumns(grid: GridConfig, fallback: 'cell' | 'pair'): number {
  return grid.cols * ((grid.triangleColumnUnit ?? fallback) === 'pair' ? 2 : 1);
}

/** Materialize the old format convention once at a board creation/import boundary. */
export function normalizeTriangleColumns(grid: GridConfig, useTopology: boolean): GridConfig {
  if (grid.triangleColumnUnit !== undefined && grid.triangleColumnUnit !== 'cell' && grid.triangleColumnUnit !== 'pair') {
    throw new Error('Invalid triangle column unit');
  }
  return grid.gridType === 'triangle' && grid.triangleColumnUnit === undefined
    ? { ...grid, triangleColumnUnit: useTopology ? 'cell' : 'pair' } : grid;
}
