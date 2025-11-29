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

  describe('getPyramidRowCellCount', () => {
    it('returns 1 for row 0', () => {
      expect(getPyramidRowCellCount(0)).toBe(1);
    });

    it('returns 3 for row 1', () => {
      expect(getPyramidRowCellCount(1)).toBe(3);
    });

    it('returns 5 for row 2', () => {
      expect(getPyramidRowCellCount(2)).toBe(5);
    });

    it('follows 2n+1 formula', () => {
      for (let row = 0; row < 10; row++) {
        expect(getPyramidRowCellCount(row)).toBe(2 * row + 1);
      }
    });
  });

  describe('getPyramidTotalCells', () => {
    it('returns 1 for height 1', () => {
      expect(getPyramidTotalCells(1)).toBe(1);
    });

    it('returns 4 for height 2', () => {
      expect(getPyramidTotalCells(2)).toBe(4);
    });

    it('returns 9 for height 3', () => {
      expect(getPyramidTotalCells(3)).toBe(9);
    });

    it('follows n^2 formula', () => {
      for (let height = 1; height <= 10; height++) {
        expect(getPyramidTotalCells(height)).toBe(height * height);
      }
    });
  });

  describe('getPyramidCellIndex', () => {
    it('returns 0 for (0, 0)', () => {
      expect(getPyramidCellIndex(0, 0)).toBe(0);
    });

    it('returns 1 for (1, 0)', () => {
      expect(getPyramidCellIndex(1, 0)).toBe(1);
    });

    it('returns 4 for (2, 0)', () => {
      expect(getPyramidCellIndex(2, 0)).toBe(4);
    });
  });

  describe('getPyramidCellPosition', () => {
    it('returns (0, 0) for index 0', () => {
      const pos = getPyramidCellPosition(0, 5);
      expect(pos).toEqual({ row: 0, col: 0 });
    });

    it('returns (1, 0) for index 1', () => {
      const pos = getPyramidCellPosition(1, 5);
      expect(pos).toEqual({ row: 1, col: 0 });
    });

    it('returns (1, 2) for index 3', () => {
      const pos = getPyramidCellPosition(3, 5);
      expect(pos).toEqual({ row: 1, col: 2 });
    });

    it('returns null for out of bounds index', () => {
      expect(getPyramidCellPosition(-1, 5)).toBeNull();
      expect(getPyramidCellPosition(25, 5)).toBeNull();
    });

    it('is inverse of getPyramidCellIndex', () => {
      const height = 5;
      for (let row = 0; row < height; row++) {
        const cellsInRow = getPyramidRowCellCount(row);
        for (let col = 0; col < cellsInRow; col++) {
          const idx = getPyramidCellIndex(row, col);
          const pos = getPyramidCellPosition(idx, height);
          expect(pos).toEqual({ row, col });
        }
      }
    });
  });

  describe('generatePyramidGridPoints', () => {
    it('generates correct number of cells', () => {
      const height = 4;
      const grid = generatePyramidGridPoints(height, 40, 2);

      const cellCount = grid.points.filter((p) => p?.type === PointType.CELL).length;
      expect(cellCount).toBe(getPyramidTotalCells(height));
    });

    it('all cells are inside', () => {
      const grid = generatePyramidGridPoints(3, 40, 2);

      for (const idx of grid.centerList) {
        expect(grid.points[idx].use).toBe(PointUse.INSIDE);
      }
    });

    it('sets centerList correctly', () => {
      const height = 4;
      const grid = generatePyramidGridPoints(height, 40, 2);

      expect(grid.centerList.length).toBe(getPyramidTotalCells(height));
    });

    it('sets triangle cell degree to 3', () => {
      const grid = generatePyramidGridPoints(3, 40, 2);

      for (const idx of grid.centerList) {
        expect(grid.points[idx].degree).toBe(3);
      }
    });

    it('stores triangle orientation in type2', () => {
      const grid = generatePyramidGridPoints(3, 40, 2);

      // Check apex (row 0, col 0) - should be upward
      expect(grid.points[0].type2).toBe(0);

      // Check row 1 alternation
      expect(grid.points[1].type2).toBe(0); // col 0 - upward
      expect(grid.points[2].type2).toBe(1); // col 1 - downward
      expect(grid.points[3].type2).toBe(0); // col 2 - upward
    });

    it('generates vertices', () => {
      const grid = generatePyramidGridPoints(3, 40, 2);

      const vertices = grid.points.filter((p) => p?.type === PointType.VERTEX);
      expect(vertices.length).toBeGreaterThan(0);
    });

    it('generates edges', () => {
      const grid = generatePyramidGridPoints(3, 40, 2);

      const edges = grid.points.filter(
        (p) => p?.type === PointType.EDGE_H || p?.type === PointType.EDGE_V
      );
      expect(edges.length).toBeGreaterThan(0);
    });

    it('sets adjacent cells for apex', () => {
      const grid = generatePyramidGridPoints(3, 40, 2);

      // Apex (index 0) should have 1 neighbor (the cell below in row 1)
      const apex = grid.points[0];
      expect(apex.adjacent.length).toBe(1);
    });

    it('sets adjacent cells for middle cell', () => {
      const grid = generatePyramidGridPoints(4, 40, 2);

      // Row 2, col 2 (middle of row 2, upward triangle)
      const idx = getPyramidCellIndex(2, 2);
      const cell = grid.points[idx];

      // Should have left, right, and bottom neighbors
      expect(cell.adjacent.length).toBe(3);
    });
  });

  describe('pyramidToPixel', () => {
    it('apex is at correct position', () => {
      const height = 3;
      const size = 40;
      const border = 2;

      const pixel = pyramidToPixel(0, 0, height, size, border);

      // Apex should be centered
      expect(pixel.x).toBeGreaterThan(0);
      expect(pixel.y).toBeGreaterThan(0);
    });

    it('cells in same row have increasing x', () => {
      const height = 4;
      const size = 40;
      const border = 2;

      for (let row = 1; row < height; row++) {
        let prevX = -Infinity;
        const cellsInRow = getPyramidRowCellCount(row);

        for (let col = 0; col < cellsInRow; col++) {
          const pixel = pyramidToPixel(row, col, height, size, border);
          expect(pixel.x).toBeGreaterThan(prevX);
          prevX = pixel.x;
        }
      }
    });

    it('cells in increasing rows have increasing y', () => {
      const height = 4;
      const size = 40;
      const border = 2;

      let prevY = -Infinity;

      for (let row = 0; row < height; row++) {
        const pixel = pyramidToPixel(row, 0, height, size, border);
        // First cell of each row should have y greater than previous row
        // (accounting for upward triangle positioning)
        if (row > 0) {
          expect(pixel.y).toBeGreaterThan(prevY - size);
        }
        prevY = pixel.y;
      }
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

  describe('integration', () => {
    it('grid cell indices match centerList', () => {
      const height = 4;
      const grid = generatePyramidGridPoints(height, 40, 2);

      for (let i = 0; i < grid.centerList.length; i++) {
        const idx = grid.centerList[i];
        expect(idx).toBe(i);
      }
    });

    it('cell positions match index', () => {
      const height = 4;
      const grid = generatePyramidGridPoints(height, 40, 2);

      for (let row = 0; row < height; row++) {
        const cellsInRow = getPyramidRowCellCount(row);
        for (let col = 0; col < cellsInRow; col++) {
          const idx = getPyramidCellIndex(row, col);
          const cell = grid.points[idx];

          expect(cell.index).toEqual([row, col]);
        }
      }
    });

    it('all cells have valid surround vertices', () => {
      const grid = generatePyramidGridPoints(4, 40, 2);
      const cellCount = getPyramidTotalCells(4);

      for (const idx of grid.centerList) {
        const cell = grid.points[idx];

        // Each triangle should have 3 or fewer surrounding vertices
        expect(cell.surround.length).toBeLessThanOrEqual(3);

        for (const vertexIdx of cell.surround) {
          expect(vertexIdx).toBeGreaterThanOrEqual(cellCount);
          expect(grid.points[vertexIdx]).toBeDefined();
          expect(grid.points[vertexIdx].type).toBe(PointType.VERTEX);
        }
      }
    });
  });
});
