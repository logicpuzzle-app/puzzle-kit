/**
 * Triangle Grid Point System Tests
 *
 * Tests for Penpa-compatible triangular grid Point generation
 */

import { describe, it, expect } from 'vitest';
import {
  generateTriGridPoints,
  pixelToTri,
  triToPixel,
  getTriNeighbors,
  triDistance,
  isUpwardTriangle,
} from '../types/triPoint';
import { PointType, PointUse } from '../types/point';

describe('Triangle Grid Point System', () => {
  describe('triDistance', () => {
    it('returns 0 for same cell', () => {
      expect(triDistance(2, 2, 2, 2, 8, 6)).toBe(0);
    });

    it('returns 1 for horizontally adjacent cells', () => {
      // Left/right neighbors
      expect(triDistance(2, 2, 3, 2, 8, 6)).toBe(1);
      expect(triDistance(2, 2, 1, 2, 8, 6)).toBe(1);
    });

    it('is symmetric', () => {
      const d1 = triDistance(0, 0, 3, 2, 8, 6);
      const d2 = triDistance(3, 2, 0, 0, 8, 6);

      expect(d1).toBe(d2);
    });

    it('increases with distance', () => {
      const d1 = triDistance(2, 2, 3, 2, 8, 6);
      const d2 = triDistance(2, 2, 5, 4, 8, 6);

      expect(d2).toBeGreaterThan(d1);
    });
  });
});

it('generates alternating triangle cells with valid vertex references and edges', () => {
  const grid = generateTriGridPoints(4, 3, 40, 2);
  const cells = grid.centerList.map(id => grid.points[id]);
  expect(cells).toHaveLength(12);
  expect(grid.points[0].use).toBe(PointUse.OUTSIDE);
  for (const cell of cells) {
    expect(cell).toMatchObject({ type: PointType.CELL, use: PointUse.INSIDE, degree: 3 });
    expect(cell.surround).toHaveLength(3);
    for (const id of cell.surround) expect(grid.points[id].type).toBe(PointType.VERTEX);
  }
  for (const [row, col, x, y, type2] of [[0, 0, 60, 92.3760430703, 0], [0, 1, 80, 80.8290376865, 1], [1, 0, 60, 115.470053838, 1]]) {
    const cell = cells.find(c => c.index?.[0] === row && c.index[1] === col)!;
    expect(cell).toMatchObject({ x, type2 });
    expect(cell.y).toBeCloseTo(y, 5);
  }
  const center = cells.find(c => c.index?.[0] === 1 && c.index[1] === 1)!;
  expect(center.adjacent.map(id => grid.points[id].index?.join(',')).sort()).toEqual(['1,0', '1,2', '2,1']);
  const edges = grid.points.filter(p => p.use === PointUse.INSIDE && (p.type === PointType.EDGE_H || p.type === PointType.EDGE_V));
  expect(new Set(edges.map(p => p.type))).toEqual(new Set([PointType.EDGE_H, PointType.EDGE_V]));
});

it('keeps fixed centers and orientation when changing triangle columns or rows', () => {
  for (const [col, row, x, y, up] of [[0, 0, 20, 23.0940107676, true], [1, 0, 40, 11.5470053838, false], [0, 1, 20, 46.1880215352, false]] as const) {
    expect(isUpwardTriangle(row, col)).toBe(up);
    expect(triToPixel(col, row, 40)).toEqual({ x, y: expect.closeTo(y, 5) });
  }
  // Interior probes are independent of the center conversion and avoid shared edges.
  expect(pixelToTri(10, 20, 40)).toEqual({ col: 0, row: 0, isUpward: true });
  expect(pixelToTri(30, 10, 40)).toEqual({ col: 1, row: 0, isUpward: false });
});

it('selects exact triangle neighbors for both orientations and the board corner', () => {
  expect(getTriNeighbors(2, 2, 8, 6).map(n => n.col + ',' + n.row).sort()).toEqual(['1,2', '2,3', '3,2']);
  expect(getTriNeighbors(1, 2, 8, 6).map(n => n.col + ',' + n.row).sort()).toEqual(['0,2', '1,1', '2,2']);
  expect(getTriNeighbors(0, 0, 8, 6).map(n => n.col + ',' + n.row).sort()).toEqual(['0,1', '1,0']);
});
