/**
 * Point System Tests
 *
 * Tests for Penpa-compatible Point type system
 */

import { describe, it, expect } from 'vitest';
import {
  PointType,
  PointUse,
  createPoint,
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
  describe('createPoint', () => {
    it('creates point with default values', () => {
      const point = createPoint();

      expect(point.x).toBe(0);
      expect(point.y).toBe(0);
      expect(point.type).toBe(PointType.CELL);
      expect(point.use).toBe(PointUse.UNUSED);
      expect(point.adjacent).toEqual([]);
    });

    it('creates point with overrides', () => {
      const point = createPoint({
        x: 100,
        y: 200,
        type: PointType.VERTEX,
        use: PointUse.INSIDE,
      });

      expect(point.x).toBe(100);
      expect(point.y).toBe(200);
      expect(point.type).toBe(PointType.VERTEX);
      expect(point.use).toBe(PointUse.INSIDE);
    });
  });

  describe('generateSquareGridPoints', () => {
    it('generates correct number of points for 3x3 grid', () => {
      const grid = generateSquareGridPoints(3, 3, 40, 2);

      // Extended grid is 7x7 = 49 cells
      // Vertices: 8x8 = 64
      // Horizontal edges: 7x8 = 56
      // Vertical edges: 8x7 = 56
      // Total: 49 + 64 + 56 + 56 = 225
      const expectedCells = 7 * 7;
      const expectedVertices = 8 * 8;
      const expectedEdgeH = 7 * 8;
      const expectedEdgeV = 8 * 7;
      const expectedTotal = expectedCells + expectedVertices + expectedEdgeH + expectedEdgeV;

      expect(grid.points.length).toBe(expectedTotal);
    });

    it('sets correct center list for 3x3 grid', () => {
      const grid = generateSquareGridPoints(3, 3, 40, 2);

      // Center list should contain 3x3 = 9 cells
      expect(grid.centerList.length).toBe(9);
    });

    it('sets grid dimensions correctly', () => {
      const grid = generateSquareGridPoints(5, 4, 50, 2);

      expect(grid.nx).toBe(5);
      expect(grid.ny).toBe(4);
      expect(grid.nx0).toBe(9); // 5 + 2*2
      expect(grid.ny0).toBe(8); // 4 + 2*2
      expect(grid.size).toBe(50);
      expect(grid.border).toBe(2);
    });

    it('marks inside cells correctly', () => {
      const grid = generateSquareGridPoints(3, 3, 40, 2);

      // Check that center cells are marked as inside
      for (const idx of grid.centerList) {
        expect(grid.points[idx].use).toBe(PointUse.INSIDE);
      }
    });

    it('marks outside cells correctly', () => {
      const grid = generateSquareGridPoints(3, 3, 40, 2);

      // First cell (0,0 in extended grid) should be outside
      expect(grid.points[0].use).toBe(PointUse.OUTSIDE);
    });

    it('sets correct coordinates for cells', () => {
      const grid = generateSquareGridPoints(3, 3, 40, 2);
      const size = 40;

      // Cell at (0,0) in actual grid is at (2,2) in extended grid
      const cellIdx = getCellIndex(0, 0, grid.nx0, 2);
      const cell = grid.points[cellIdx];

      expect(cell.x).toBe((2 + 0.5) * size); // 100
      expect(cell.y).toBe((2 + 0.5) * size); // 100
    });

    it('sets adjacent cells correctly', () => {
      const grid = generateSquareGridPoints(3, 3, 40, 2);

      // Center cell (1,1) should have 4 adjacent cells
      const centerIdx = getCellIndex(1, 1, grid.nx0, 2);
      const center = grid.points[centerIdx];

      expect(center.adjacent.length).toBe(4);
    });

    it('sets diagonal adjacent cells correctly', () => {
      const grid = generateSquareGridPoints(3, 3, 40, 2);

      // Center cell (1,1) should have 4 diagonal adjacent cells
      const centerIdx = getCellIndex(1, 1, grid.nx0, 2);
      const center = grid.points[centerIdx];

      expect(center.adjacent_dia.length).toBe(4);
    });

    it('sets surround vertices correctly', () => {
      const grid = generateSquareGridPoints(3, 3, 40, 2);

      const cellIdx = getCellIndex(1, 1, grid.nx0, 2);
      const cell = grid.points[cellIdx];

      expect(cell.surround.length).toBe(4);

      // All surround points should be vertices
      for (const idx of cell.surround) {
        expect(grid.points[idx].type).toBe(PointType.VERTEX);
      }
    });

    it('sets neighbor edges correctly', () => {
      const grid = generateSquareGridPoints(3, 3, 40, 2);

      const cellIdx = getCellIndex(1, 1, grid.nx0, 2);
      const cell = grid.points[cellIdx];

      expect(cell.neighbor.length).toBe(4);

      // All neighbor points should be edges
      for (const idx of cell.neighbor) {
        const edgeType = grid.points[idx].type;
        expect([PointType.EDGE_H, PointType.EDGE_V]).toContain(edgeType);
      }
    });

    it('sets edge_to_vertex correctly', () => {
      const grid = generateSquareGridPoints(3, 3, 40, 2);

      // Find a horizontal edge
      const edgeHIdx = getEdgeHIndex(1, 1, grid.nx0, grid.ny0, 2);
      const edgeH = grid.points[edgeHIdx];

      expect(edgeH.edge_to_vertex).toBeDefined();
      expect(edgeH.edge_to_vertex!.length).toBe(2);

      // Both endpoints should be vertices
      for (const idx of edgeH.edge_to_vertex!) {
        expect(grid.points[idx].type).toBe(PointType.VERTEX);
      }
    });
  });

  describe('index functions', () => {
    const nx0 = 7;
    const ny0 = 7;
    const border = 2;

    it('getCellIndex returns correct index', () => {
      const idx = getCellIndex(0, 0, nx0, border);
      expect(idx).toBe(2 * nx0 + 2); // (0+2)*7 + (0+2) = 16
    });

    it('getCellPosition returns correct position', () => {
      const idx = getCellIndex(1, 2, nx0, border);
      const pos = getCellPosition(idx, nx0, border);

      expect(pos?.row).toBe(1);
      expect(pos?.col).toBe(2);
    });

    it('getVertexIndex returns index in vertex range', () => {
      const cellCount = nx0 * ny0;
      const idx = getVertexIndex(0, 0, nx0, ny0, border);

      expect(idx).toBeGreaterThanOrEqual(cellCount);
    });

    it('getEdgeHIndex returns index in edge range', () => {
      const cellCount = nx0 * ny0;
      const vertexCount = (nx0 + 1) * (ny0 + 1);
      const idx = getEdgeHIndex(0, 0, nx0, ny0, border);

      expect(idx).toBeGreaterThanOrEqual(cellCount + vertexCount);
    });

    it('getEdgeVIndex returns index in edge range', () => {
      const cellCount = nx0 * ny0;
      const vertexCount = (nx0 + 1) * (ny0 + 1);
      const edgeHCount = nx0 * (ny0 + 1);
      const idx = getEdgeVIndex(0, 0, nx0, ny0, border);

      expect(idx).toBeGreaterThanOrEqual(cellCount + vertexCount + edgeHCount);
    });
  });

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

  describe('findNearestPoint', () => {
    it('finds nearest cell point', () => {
      const grid = generateSquareGridPoints(3, 3, 40, 2);
      const size = 40;

      // Position near center of cell (1,1)
      const x = (2 + 1 + 0.5) * size;
      const y = (2 + 1 + 0.5) * size;

      const idx = findNearestPoint(x, y, grid, [PointType.CELL]);

      expect(idx).not.toBeNull();
      expect(grid.points[idx!].type).toBe(PointType.CELL);
    });

    it('finds nearest vertex point', () => {
      const grid = generateSquareGridPoints(3, 3, 40, 2);
      const size = 40;

      // Position near a vertex
      const x = (2 + 1) * size;
      const y = (2 + 1) * size;

      const idx = findNearestPoint(x, y, grid, [PointType.VERTEX]);

      expect(idx).not.toBeNull();
      expect(grid.points[idx!].type).toBe(PointType.VERTEX);
    });
  });

  describe('getAdjacentCells', () => {
    it('returns 4 adjacent cells for center cell', () => {
      const grid = generateSquareGridPoints(3, 3, 40, 2);
      const centerIdx = getCellIndex(1, 1, grid.nx0, grid.border);

      const adjacent = getAdjacentCells(centerIdx, grid, false);

      expect(adjacent.length).toBe(4);
    });

    it('returns 8 adjacent cells with diagonals', () => {
      const grid = generateSquareGridPoints(3, 3, 40, 2);
      const centerIdx = getCellIndex(1, 1, grid.nx0, grid.border);

      const adjacent = getAdjacentCells(centerIdx, grid, true);

      expect(adjacent.length).toBe(8);
    });

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
