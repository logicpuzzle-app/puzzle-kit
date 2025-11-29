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
  getTriVertices,
  getTriNeighbors,
  triDistance,
  isUpwardTriangle,
} from '../types/triPoint';
import { PointType, PointUse } from '../types/point';

const SQRT3 = Math.sqrt(3);
const TRI_HEIGHT_FACTOR = SQRT3 / 2;

describe('Triangle Grid Point System', () => {
  describe('isUpwardTriangle', () => {
    it('returns true for (0, 0)', () => {
      expect(isUpwardTriangle(0, 0)).toBe(true);
    });

    it('returns false for (0, 1)', () => {
      expect(isUpwardTriangle(0, 1)).toBe(false);
    });

    it('returns false for (1, 0)', () => {
      expect(isUpwardTriangle(1, 0)).toBe(false);
    });

    it('returns true for (1, 1)', () => {
      expect(isUpwardTriangle(1, 1)).toBe(true);
    });

    it('alternates correctly in row', () => {
      for (let col = 0; col < 10; col++) {
        const expected = col % 2 === 0;
        expect(isUpwardTriangle(0, col)).toBe(expected);
      }
    });

    it('alternates correctly between rows', () => {
      for (let row = 0; row < 10; row++) {
        const expected = row % 2 === 0;
        expect(isUpwardTriangle(row, 0)).toBe(expected);
      }
    });
  });

  describe('generateTriGridPoints', () => {
    it('generates grid with correct dimensions', () => {
      const grid = generateTriGridPoints(6, 4, 40, 2);

      expect(grid.nx).toBe(6);
      expect(grid.ny).toBe(4);
      expect(grid.nx0).toBe(10); // 6 + 2*2
      expect(grid.ny0).toBe(8); // 4 + 2*2
      expect(grid.size).toBe(40);
      expect(grid.border).toBe(2);
    });

    it('generates correct number of cell centers', () => {
      const grid = generateTriGridPoints(4, 4, 40, 2);
      const nx0 = 8;
      const ny0 = 8;

      // Cell centers
      const cellCount = nx0 * ny0;
      expect(grid.points.filter((p) => p?.type === PointType.CELL).length).toBe(
        cellCount
      );
    });

    it('sets correct centerList for inside cells', () => {
      const grid = generateTriGridPoints(4, 3, 40, 2);

      // Should have 4x3 = 12 inside cells
      expect(grid.centerList.length).toBe(12);

      // All centerList cells should be inside
      for (const idx of grid.centerList) {
        expect(grid.points[idx].use).toBe(PointUse.INSIDE);
      }
    });

    it('marks outside cells correctly', () => {
      const grid = generateTriGridPoints(4, 4, 40, 2);

      // First cell (0,0) should be outside
      expect(grid.points[0].use).toBe(PointUse.OUTSIDE);
    });

    it('sets triangle cell degree to 3', () => {
      const grid = generateTriGridPoints(4, 4, 40, 2);

      for (const idx of grid.centerList) {
        expect(grid.points[idx].degree).toBe(3);
      }
    });

    it('stores triangle orientation in type2', () => {
      const grid = generateTriGridPoints(4, 4, 40, 2);
      const nx0 = 8;

      // Check first inside cell (at border, border)
      const border = 2;
      const firstInsideIdx = border * nx0 + border;
      const cell = grid.points[firstInsideIdx];

      expect(cell.type2).toBeDefined();
      // type2 should be 0 (upward) or 1 (downward)
      expect([0, 1]).toContain(cell.type2);
    });

    it('generates vertices', () => {
      const grid = generateTriGridPoints(4, 4, 40, 2);

      // Should have vertex points
      const vertices = grid.points.filter((p) => p?.type === PointType.VERTEX);
      expect(vertices.length).toBeGreaterThan(0);
    });

    it('generates edges', () => {
      const grid = generateTriGridPoints(4, 4, 40, 2);

      // Should have edge points
      const edges = grid.points.filter(
        (p) => p?.type === PointType.EDGE_H || p?.type === PointType.EDGE_V
      );
      expect(edges.length).toBeGreaterThan(0);
    });

    it('calculates adjacent cells correctly for upward triangle', () => {
      const grid = generateTriGridPoints(6, 6, 40, 2);
      const nx0 = 10;
      const border = 2;

      // Get a center upward triangle (row 2, col 2 in extended grid)
      // This should be at (border, border) which is upward
      const cellIdx = (border + 1) * nx0 + border;
      const cell = grid.points[cellIdx];

      // Upward triangle should have up to 3 adjacent cells
      expect(cell.adjacent.length).toBeLessThanOrEqual(3);
      expect(cell.adjacent.length).toBeGreaterThan(0);
    });

    it('sets surround vertices for cells', () => {
      const grid = generateTriGridPoints(4, 4, 40, 2);

      for (const idx of grid.centerList) {
        const cell = grid.points[idx];
        // Triangle should have 3 surrounding vertices
        expect(cell.surround.length).toBe(3);
      }
    });
  });

  describe('pixelToTri', () => {
    it('converts pixel near origin to (0, 0)', () => {
      const size = 40;
      const halfWidth = size / 2;
      const triHeight = size * TRI_HEIGHT_FACTOR;

      // Position inside first triangle
      const result = pixelToTri(halfWidth / 2, triHeight / 2, size);

      expect(result.col).toBe(0);
      expect(result.row).toBe(0);
    });

    it('returns correct isUpward for (0, 0)', () => {
      const size = 40;
      const halfWidth = size / 2;
      const triHeight = size * TRI_HEIGHT_FACTOR;

      const result = pixelToTri(halfWidth / 2, triHeight / 2, size);

      expect(result.isUpward).toBe(true);
    });

    it('returns correct isUpward for (0, 1)', () => {
      const size = 40;
      const halfWidth = size / 2;
      const triHeight = size * TRI_HEIGHT_FACTOR;

      const result = pixelToTri(halfWidth * 1.5, triHeight / 2, size);

      expect(result.col).toBe(1);
      expect(result.isUpward).toBe(false);
    });
  });

  describe('triToPixel', () => {
    it('converts (0, 0) to correct pixel position', () => {
      const size = 40;
      const result = triToPixel(0, 0, size);

      const halfWidth = size / 2;
      const triHeight = size * TRI_HEIGHT_FACTOR;

      expect(result.x).toBeCloseTo(halfWidth, 5);
      // Upward triangle center is at 2/3 height from top
      expect(result.y).toBeCloseTo(triHeight * (2 / 3), 5);
    });

    it('converts (1, 0) to correct position for downward triangle', () => {
      const size = 40;
      const result = triToPixel(1, 0, size);

      const halfWidth = size / 2;
      const triHeight = size * TRI_HEIGHT_FACTOR;

      expect(result.x).toBeCloseTo(halfWidth * 2, 5);
      // Downward triangle center is at 1/3 height from top
      expect(result.y).toBeCloseTo(triHeight * (1 / 3), 5);
    });

    it('produces consistent results for basic conversions', () => {
      const size = 40;

      // Test a few specific known-good conversions
      const pixel00 = triToPixel(0, 0, size);
      expect(pixel00.x).toBeGreaterThan(0);
      expect(pixel00.y).toBeGreaterThan(0);

      const pixel10 = triToPixel(1, 0, size);
      expect(pixel10.x).toBeGreaterThan(pixel00.x);

      const pixel01 = triToPixel(0, 1, size);
      expect(pixel01.y).toBeGreaterThan(pixel00.y);
    });
  });

  describe('getTriVertices', () => {
    it('returns 3 vertices for upward triangle', () => {
      const vertices = getTriVertices(100, 100, 40, true);

      expect(vertices.length).toBe(3);
    });

    it('returns 3 vertices for downward triangle', () => {
      const vertices = getTriVertices(100, 100, 40, false);

      expect(vertices.length).toBe(3);
    });

    it('upward triangle has top vertex above center', () => {
      const centerY = 100;
      const vertices = getTriVertices(100, centerY, 40, true);

      // First vertex (top) should be above center
      expect(vertices[0].y).toBeLessThan(centerY);
    });

    it('downward triangle has bottom vertex below center', () => {
      const centerY = 100;
      const vertices = getTriVertices(100, centerY, 40, false);

      // First vertex (bottom) should be below center
      expect(vertices[0].y).toBeGreaterThan(centerY);
    });

    it('vertices form equilateral triangle', () => {
      const size = 40;
      const vertices = getTriVertices(100, 100, size, true);

      // Calculate distances between vertices
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

      // All sides should be equal (equilateral)
      expect(dist01).toBeCloseTo(dist12, 5);
      expect(dist12).toBeCloseTo(dist20, 5);
    });
  });

  describe('getTriNeighbors', () => {
    it('returns up to 3 neighbors for center cell', () => {
      const neighbors = getTriNeighbors(3, 2, 8, 6);

      expect(neighbors.length).toBe(3);
    });

    it('returns fewer neighbors for edge cell', () => {
      const neighbors = getTriNeighbors(0, 0, 8, 6);

      // Corner upward triangle has 2 neighbors (right and bottom)
      expect(neighbors.length).toBeLessThan(3);
    });

    it('returns correct neighbors for upward triangle', () => {
      // Upward triangle at (2, 2)
      const neighbors = getTriNeighbors(2, 2, 8, 6);

      const neighborCoords = neighbors.map((n) => `${n.col},${n.row}`);

      // Should have left, right, and bottom neighbors
      expect(neighborCoords).toContain('1,2'); // Left
      expect(neighborCoords).toContain('3,2'); // Right
      expect(neighborCoords).toContain('2,3'); // Bottom
    });

    it('returns correct neighbors for downward triangle', () => {
      // Downward triangle at (1, 2)
      const neighbors = getTriNeighbors(1, 2, 8, 6);

      const neighborCoords = neighbors.map((n) => `${n.col},${n.row}`);

      // Should have left, right, and top neighbors
      expect(neighborCoords).toContain('0,2'); // Left
      expect(neighborCoords).toContain('2,2'); // Right
      expect(neighborCoords).toContain('1,1'); // Top
    });

    it('respects grid bounds', () => {
      const neighbors = getTriNeighbors(0, 0, 4, 4);

      for (const n of neighbors) {
        expect(n.col).toBeGreaterThanOrEqual(0);
        expect(n.col).toBeLessThan(4);
        expect(n.row).toBeGreaterThanOrEqual(0);
        expect(n.row).toBeLessThan(4);
      }
    });
  });

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

  describe('integration', () => {
    it('grid cell positions match triToPixel output', () => {
      const grid = generateTriGridPoints(4, 4, 40, 2);
      const size = 40;
      const border = 2;

      for (const idx of grid.centerList) {
        const cell = grid.points[idx];
        const [row, col] = cell.index!;

        // Convert from grid coords (with border offset) to pixel
        const expected = triToPixel(col + border, row + border, size);

        expect(cell.x).toBeCloseTo(expected.x, 5);
        expect(cell.y).toBeCloseTo(expected.y, 5);
      }
    });

    it('all inside cells have valid surround vertices', () => {
      const grid = generateTriGridPoints(4, 4, 40, 2);

      for (const idx of grid.centerList) {
        const cell = grid.points[idx];

        for (const vertexIdx of cell.surround) {
          expect(vertexIdx).toBeGreaterThanOrEqual(0);
          expect(vertexIdx).toBeLessThan(grid.points.length);
          expect(grid.points[vertexIdx]).toBeDefined();
          expect(grid.points[vertexIdx].type).toBe(PointType.VERTEX);
        }
      }
    });
  });
});
