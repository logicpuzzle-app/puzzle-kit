/**
 * Pyramid Grid Point System Tests
 *
 * Tests for Penpa-compatible pyramid grid Point generation
 */

import { describe, it, expect } from 'vitest';
import {
  generatePyramidGridPoints,
  pixelToPyramid,
  pyramidToPixel,
  getPyramidVertices,
  getPyramidNeighbors,
  isPyramidUpward,
  getPyramidRowCellCount,
  getPyramidTotalCells,
  getPyramidCellIndex,
  getPyramidCellPosition,
} from '../types/pyramidPoint';
import { PointType, PointUse } from '../types/point';

const SQRT3 = Math.sqrt(3);
const TRI_HEIGHT_FACTOR = SQRT3 / 2;

describe('Pyramid Grid Point System', () => {
  describe('isPyramidUpward', () => {
    it('returns true for column 0', () => {
      expect(isPyramidUpward(0, 0)).toBe(true);
      expect(isPyramidUpward(1, 0)).toBe(true);
    });

    it('alternates with column', () => {
      expect(isPyramidUpward(1, 0)).toBe(true);
      expect(isPyramidUpward(1, 1)).toBe(false);
      expect(isPyramidUpward(1, 2)).toBe(true);
    });
  });

  describe('pixelToPyramid', () => {
    it('returns null for position outside pyramid', () => {
      const result = pixelToPyramid(-10, -10, 3, 40, 2);
      expect(result).toBeNull();
    });

    it('returns null for row out of bounds', () => {
      const size = 40;
      const triHeight = size * TRI_HEIGHT_FACTOR;
      const border = 2;

      // Position in row -1
      const result = pixelToPyramid(100, border * triHeight - 1, 3, size, border);
      expect(result).toBeNull();
    });
  });

  describe('getPyramidVertices', () => {
    it('returns 3 vertices for upward triangle', () => {
      const vertices = getPyramidVertices(100, 100, 40, true);
      expect(vertices.length).toBe(3);
    });

    it('returns 3 vertices for downward triangle', () => {
      const vertices = getPyramidVertices(100, 100, 40, false);
      expect(vertices.length).toBe(3);
    });

    it('upward triangle has top vertex above center', () => {
      const centerY = 100;
      const vertices = getPyramidVertices(100, centerY, 40, true);
      expect(vertices[0].y).toBeLessThan(centerY);
    });

    it('downward triangle has bottom vertex below center', () => {
      const centerY = 100;
      const vertices = getPyramidVertices(100, centerY, 40, false);
      expect(vertices[0].y).toBeGreaterThan(centerY);
    });

    it('vertices form equilateral triangle', () => {
      const size = 40;
      const vertices = getPyramidVertices(100, 100, size, true);

      const dist01 = Math.hypot(
        vertices[1].x - vertices[0].x,
        vertices[1].y - vertices[0].y
      );
      const dist12 = Math.hypot(
        vertices[2].x - vertices[1].x,
        vertices[2].y - vertices[1].y
      );
      const dist20 = Math.hypot(
        vertices[0].x - vertices[2].x,
        vertices[0].y - vertices[2].y
      );

      expect(dist01).toBeCloseTo(dist12, 5);
      expect(dist12).toBeCloseTo(dist20, 5);
    });
  });

  describe('getPyramidNeighbors', () => {
    it('apex has 1 neighbor', () => {
      const neighbors = getPyramidNeighbors(0, 0, 3);
      expect(neighbors.length).toBe(1);
    });

    it('row 1 edge cells have 2 neighbors', () => {
      // Left edge of row 1
      const leftNeighbors = getPyramidNeighbors(1, 0, 3);
      expect(leftNeighbors.length).toBe(2);

      // Right edge of row 1
      const rightNeighbors = getPyramidNeighbors(1, 2, 3);
      expect(rightNeighbors.length).toBe(2);
    });

    it('middle downward cell has 3 neighbors', () => {
      // Row 1, col 1 (downward, middle)
      const neighbors = getPyramidNeighbors(1, 1, 3);
      expect(neighbors.length).toBe(3);
    });

    it('respects height bounds', () => {
      const height = 3;
      const neighbors = getPyramidNeighbors(2, 2, height);

      for (const n of neighbors) {
        expect(n.row).toBeGreaterThanOrEqual(0);
        expect(n.row).toBeLessThan(height);
        expect(n.col).toBeGreaterThanOrEqual(0);
        expect(n.col).toBeLessThan(getPyramidRowCellCount(n.row));
      }
    });
  });
});

it('maps pyramid indices across row starts, ends and out-of-bounds boundaries', () => {
  for (const [id, row, col] of [[0, 0, 0], [3, 1, 2], [4, 2, 0], [8, 2, 4], [9, 3, 0], [15, 3, 6]]) {
    expect(getPyramidCellIndex(row, col)).toBe(id);
    expect(getPyramidCellPosition(id, 4)).toEqual({ row, col });
  }
  expect(getPyramidCellPosition(-1, 4)).toBeNull();
  expect(getPyramidCellPosition(16, 4)).toBeNull();
});

it('generates the pyramid rows, centered geometry, neighbors and vertex references', () => {
  const grid = generatePyramidGridPoints(4, 40, 2);
  const cells = grid.centerList.map(id => grid.points[id]);
  expect(cells).toHaveLength(16);
  expect(getPyramidTotalCells(4)).toBe(16);
  expect([0, 1, 2, 3].map(row => cells.filter(cell => cell.index?.[0] === row).length)).toEqual([1, 3, 5, 7]);
  expect(getPyramidRowCellCount(3)).toBe(7);
  for (const cell of cells) {
    expect(cell).toMatchObject({ type: PointType.CELL, use: PointUse.INSIDE, degree: 3 });
    expect(cell.surround).toHaveLength(3);
    for (const vertex of cell.surround) expect(grid.points[vertex].type).toBe(PointType.VERTEX);
  }
  // Apex and both orientations on the next row; fixed coordinates, not generated expectations.
  for (const [row, col, x, y, type2] of [[0, 0, 120, 92.3760430703, 0], [1, 0, 100, 127.0170592217, 0], [1, 1, 120, 115.470053838, 1], [1, 2, 140, 127.0170592217, 0]]) {
    const cell = cells.find(c => c.index?.[0] === row && c.index[1] === col)!;
    expect(cell).toMatchObject({ x, type2 });
    expect(cell.y).toBeCloseTo(y, 5);
    expect(pyramidToPixel(row, col, 4, 40, 2)).toEqual({ x, y: expect.closeTo(y, 5) });
  }
  const apex = cells.find(c => c.index?.[0] === 0)!;
  expect(apex.adjacent.map(id => grid.points[id].index)).toEqual([[1, 1]]);
  const middle = cells.find(c => c.index?.[0] === 2 && c.index[1] === 2)!;
  expect(middle.adjacent.map(id => grid.points[id].index?.join(',')).sort()).toEqual(['2,1', '2,3', '3,3']);
  expect(new Set(grid.points.filter(p => p.type === PointType.EDGE_H || p.type === PointType.EDGE_V).map(p => p.type))).toEqual(new Set([PointType.EDGE_H, PointType.EDGE_V]));
});
