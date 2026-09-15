/**
 * Point System Tests
 *
 * Tests for Penpa-compatible Point type system
 */

import { describe, it, expect } from 'vitest';
import {
  PointType,
  PointUse,
  generateSquareGridPoints,
  getCellIndex,
  getVertexIndex,
  getEdgeHIndex,
  getEdgeVIndex,
  getCellPosition,
  isPointInBounds,
  findCellAtPosition,
  findNearestPoint,
  getAdjacentCells,
} from '../types/point';

describe('Point System', () => {
  describe('isPointInBounds', () => {
    it('returns true for points inside grid', () => {
      const grid = generateSquareGridPoints(3, 3, 40, 2);

      for (const idx of grid.centerList) {
        expect(isPointInBounds(idx, grid)).toBe(true);
      }
    });

    it('returns false for points outside grid', () => {
      const grid = generateSquareGridPoints(3, 3, 40, 2);

      // First cell in extended grid is outside
      expect(isPointInBounds(0, grid)).toBe(false);
    });

    it('returns false for invalid indices', () => {
      const grid = generateSquareGridPoints(3, 3, 40, 2);

      expect(isPointInBounds(-1, grid)).toBe(false);
      expect(isPointInBounds(grid.points.length + 1, grid)).toBe(false);
    });
  });

  describe('findCellAtPosition', () => {
    it('finds correct cell for position inside grid', () => {
      const grid = generateSquareGridPoints(3, 3, 40, 2);
      const size = 40;

      // Position in center of cell (1,1)
      const x = (2 + 1 + 0.5) * size; // Account for border
      const y = (2 + 1 + 0.5) * size;

      const idx = findCellAtPosition(x, y, grid);
      const expectedIdx = getCellIndex(1, 1, grid.nx0, grid.border);

      expect(idx).toBe(expectedIdx);
    });

    it('returns null for position outside grid', () => {
      const grid = generateSquareGridPoints(3, 3, 40, 2);

      const idx = findCellAtPosition(-10, -10, grid);
      expect(idx).toBeNull();
    });
  });

  describe('getAdjacentCells', () => {

    it('returns fewer adjacent cells for corner cell', () => {
      const grid = generateSquareGridPoints(3, 3, 40, 2);
      const cornerIdx = getCellIndex(0, 0, grid.nx0, grid.border);

      const adjacent = getAdjacentCells(cornerIdx, grid, false);

      // Corner cell has only 2 adjacent cells inside the grid
      expect(adjacent.length).toBeLessThan(4);
    });

    it('returns empty array for invalid cell', () => {
      const grid = generateSquareGridPoints(3, 3, 40, 2);

      const adjacent = getAdjacentCells(-1, grid);

      expect(adjacent).toEqual([]);
    });
  });
});

it('links square cells to their actual neighboring geometry', () => {
  const grid = generateSquareGridPoints(3, 3, 40, 2);
  expect(grid.centerList).toHaveLength(9);
  for (const id of grid.centerList) expect(grid.points[id]).toMatchObject({ type: PointType.CELL, use: PointUse.INSIDE });
  expect(grid.points[0].use).toBe(PointUse.OUTSIDE);
  const centerId = getCellIndex(1, 1, grid.nx0, grid.border);
  const center = grid.points[centerId];
  expect(center).toMatchObject({ index: [1, 1], x: 140, y: 140 });
  expect(getCellPosition(centerId, grid.nx0, grid.border)).toEqual({ row: 1, col: 1 });
  const coords = (ids: number[]) => ids.map(id => [grid.points[id].x, grid.points[id].y]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const orthogonal = [[100, 140], [140, 100], [140, 180], [180, 140]];
  const diagonal = [[100, 100], [100, 180], [180, 100], [180, 180]];
  expect(coords(center.adjacent)).toEqual(orthogonal);
  expect(coords(center.adjacent_dia)).toEqual(diagonal);
  expect(coords(getAdjacentCells(centerId, grid))).toEqual(orthogonal);
  expect(coords(getAdjacentCells(centerId, grid, true))).toEqual([...orthogonal, ...diagonal].sort((a, b) => a[0] - b[0] || a[1] - b[1]));
  expect(coords(center.surround)).toEqual([[120, 120], [120, 160], [160, 120], [160, 160]]);
  for (const id of center.surround) expect(grid.points[id].type).toBe(PointType.VERTEX);
  expect(coords(center.neighbor)).toEqual([[120, 140], [140, 120], [140, 160], [160, 140]]);
  expect(grid.points[getVertexIndex(1, 1, grid.nx0, grid.ny0, 2)]).toMatchObject({ type: PointType.VERTEX, x: 120, y: 120 });
  const horizontal = grid.points[getEdgeHIndex(1, 1, grid.nx0, grid.ny0, 2)];
  const vertical = grid.points[getEdgeVIndex(1, 1, grid.nx0, grid.ny0, 2)];
  expect(horizontal).toMatchObject({ type: PointType.EDGE_H, x: 140, y: 120 });
  expect(vertical).toMatchObject({ type: PointType.EDGE_V, x: 120, y: 140 });
  expect(coords(horizontal.edge_to_vertex!)).toEqual([[120, 120], [160, 120]]);
  expect(coords(vertical.edge_to_vertex!)).toEqual([[120, 120], [120, 160]]);
});

it('nearest-point search filters point kinds and ignores outside points', () => {
  const grid = generateSquareGridPoints(3, 3, 40, 2);
  expect(findNearestPoint(81, 81, grid)).toBe(67); // inside corner vertex
  expect(findNearestPoint(81, 81, grid, [PointType.CELL])).toBe(16);
  expect(findNearestPoint(20, 20, grid, [PointType.CELL])).toBe(16); // outside center is ignored
  expect(findNearestPoint(81, 81, grid, [])).toBeNull();
});
