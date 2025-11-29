/**
 * Hex Grid Point System Tests
 *
 * Tests for Penpa-compatible hex grid Point generation
 */

import { describe, it, expect } from 'vitest';
import {
  generateHexGridPoints,
  pixelToHex,
  hexToPixel,
  getHexVertices,
  getHexNeighbors,
  hexDistance,
} from '../types/hexPoint';
import { PointType, PointUse } from '../types/point';

const SQRT3 = Math.sqrt(3);

describe('Hex Grid Point System', () => {
  describe('generateHexGridPoints', () => {
    it('generates grid with correct dimensions', () => {
      const grid = generateHexGridPoints(5, 5, 40, 2);

      expect(grid.nx).toBe(5);
      expect(grid.ny).toBe(5);
      expect(grid.nx0).toBe(9); // 5 + 2*2
      expect(grid.ny0).toBe(9); // 5 + 2*2
      expect(grid.size).toBe(40);
      expect(grid.border).toBe(2);
    });

    it('generates correct number of cell centers', () => {
      const grid = generateHexGridPoints(3, 3, 40, 2);
      const nx0 = 7;
      const ny0 = 7;

      // Cell centers
      const cellCount = nx0 * ny0;
      expect(grid.points.filter((p) => p?.type === PointType.CELL).length).toBe(
        cellCount
      );
    });

    it('sets correct centerList for inside cells', () => {
      const grid = generateHexGridPoints(3, 3, 40, 2);

      // Should have 3x3 = 9 inside cells
      expect(grid.centerList.length).toBe(9);

      // All centerList cells should be inside
      for (const idx of grid.centerList) {
        expect(grid.points[idx].use).toBe(PointUse.INSIDE);
      }
    });

    it('marks outside cells correctly', () => {
      const grid = generateHexGridPoints(3, 3, 40, 2);

      // First cell (0,0) should be outside
      expect(grid.points[0].use).toBe(PointUse.OUTSIDE);
    });

    it('sets hex cell degree to 6', () => {
      const grid = generateHexGridPoints(3, 3, 40, 2);

      for (const idx of grid.centerList) {
        expect(grid.points[idx].degree).toBe(6);
      }
    });

    it('generates vertices with degree 3', () => {
      const grid = generateHexGridPoints(3, 3, 40, 2);

      // Find a vertex
      const vertex = grid.points.find((p) => p?.type === PointType.VERTEX);
      expect(vertex).toBeDefined();
      expect(vertex!.degree).toBe(3);
    });

    it('generates edges', () => {
      const grid = generateHexGridPoints(3, 3, 40, 2);

      // Should have edge points
      const edges = grid.points.filter((p) => p?.type === PointType.EDGE_H);
      expect(edges.length).toBeGreaterThan(0);
    });

    it('calculates adjacent cells for center cell', () => {
      const grid = generateHexGridPoints(5, 5, 40, 2);
      const nx0 = 9;

      // Get a center cell (row 2, col 2 in extended grid)
      const centerIdx = 4 * nx0 + 4; // Middle of 9x9 extended grid
      const cell = grid.points[centerIdx];

      // Hex cell should have up to 6 adjacent cells
      expect(cell.adjacent.length).toBeGreaterThan(0);
      expect(cell.adjacent.length).toBeLessThanOrEqual(6);
    });

    it('handles odd and even row offsets', () => {
      const grid = generateHexGridPoints(5, 5, 40, 2);
      const size = 40;
      const hexWidth = size * SQRT3;
      const nx0 = 9;

      // Even row (row 0) - no offset
      const evenRowCell = grid.points[0];
      expect(evenRowCell.x).toBeCloseTo(hexWidth / 2, 5);

      // Odd row (row 1) - offset by hexWidth/2
      const oddRowCell = grid.points[nx0];
      expect(oddRowCell.x).toBeCloseTo(hexWidth, 5);
    });
  });

  describe('pixelToHex', () => {
    it('converts pixel at origin to (0, 0)', () => {
      const size = 40;
      const result = pixelToHex(size * SQRT3 / 2, size, size);

      expect(result.q).toBe(0);
      expect(result.r).toBe(0);
    });

    it('converts pixel in second column', () => {
      const size = 40;
      const hexWidth = size * SQRT3;
      const result = pixelToHex(hexWidth + hexWidth / 2, size, size);

      expect(result.q).toBe(1);
      expect(result.r).toBe(0);
    });

    it('handles odd row offset', () => {
      const size = 40;
      const hexHeight = size * 2;
      const rowHeight = hexHeight * 0.75;
      const hexWidth = size * SQRT3;

      // Position in row 1 (odd), col 0
      // Odd rows are shifted right by hexWidth/2
      const result = pixelToHex(hexWidth, rowHeight + size, size);

      expect(result.r).toBe(1);
    });
  });

  describe('hexToPixel', () => {
    it('converts (0, 0) to correct pixel position', () => {
      const size = 40;
      const result = hexToPixel(0, 0, size);

      const hexWidth = size * SQRT3;
      const hexHeight = size * 2;

      expect(result.x).toBeCloseTo(hexWidth / 2, 5);
      expect(result.y).toBeCloseTo(hexHeight / 2, 5);
    });

    it('converts (1, 0) to correct position', () => {
      const size = 40;
      const result = hexToPixel(1, 0, size);

      const hexWidth = size * SQRT3;
      const hexHeight = size * 2;

      expect(result.x).toBeCloseTo(hexWidth + hexWidth / 2, 5);
      expect(result.y).toBeCloseTo(hexHeight / 2, 5);
    });

    it('applies odd row offset for (0, 1)', () => {
      const size = 40;
      const result = hexToPixel(0, 1, size);

      const hexWidth = size * SQRT3;
      const hexHeight = size * 2;
      const rowHeight = hexHeight * 0.75;

      // Odd row offset
      expect(result.x).toBeCloseTo(hexWidth / 2 + hexWidth / 2, 5);
      expect(result.y).toBeCloseTo(rowHeight + hexHeight / 2, 5);
    });

    it('is inverse of pixelToHex for grid-aligned points', () => {
      const size = 40;

      for (let q = 0; q < 3; q++) {
        for (let r = 0; r < 3; r++) {
          const pixel = hexToPixel(q, r, size);
          const hex = pixelToHex(pixel.x, pixel.y, size);

          expect(hex.q).toBe(q);
          expect(hex.r).toBe(r);
        }
      }
    });
  });

  describe('getHexVertices', () => {
    it('returns 6 vertices', () => {
      const vertices = getHexVertices(100, 100, 40);

      expect(vertices.length).toBe(6);
    });

    it('vertices are at correct distance from center', () => {
      const centerX = 100;
      const centerY = 100;
      const size = 40;
      const vertices = getHexVertices(centerX, centerY, size);

      for (const vertex of vertices) {
        const dist = Math.hypot(vertex.x - centerX, vertex.y - centerY);
        expect(dist).toBeCloseTo(size, 5);
      }
    });

    it('first vertex is at top (pointy-top orientation)', () => {
      const centerX = 100;
      const centerY = 100;
      const size = 40;
      const vertices = getHexVertices(centerX, centerY, size);

      // First vertex should be at top (angle -PI/2)
      expect(vertices[0].x).toBeCloseTo(centerX, 5);
      expect(vertices[0].y).toBeCloseTo(centerY - size, 5);
    });

    it('vertices are evenly spaced at 60 degrees', () => {
      const vertices = getHexVertices(100, 100, 40);

      for (let i = 0; i < 6; i++) {
        const next = (i + 1) % 6;
        const v1 = vertices[i];
        const v2 = vertices[next];

        // Distance between adjacent vertices should be size (for pointy-top)
        const dist = Math.hypot(v2.x - v1.x, v2.y - v1.y);
        expect(dist).toBeCloseTo(40, 5);
      }
    });
  });

  describe('getHexNeighbors', () => {
    it('returns up to 6 neighbors for center cell', () => {
      const neighbors = getHexNeighbors(2, 2, 5, 5);

      expect(neighbors.length).toBe(6);
    });

    it('returns fewer neighbors for edge cell', () => {
      const neighbors = getHexNeighbors(0, 0, 5, 5);

      // Corner cell has 3 neighbors
      expect(neighbors.length).toBeLessThan(6);
    });

    it('returns correct neighbors for even row', () => {
      const neighbors = getHexNeighbors(2, 2, 5, 5);

      // Even row neighbors (offset pattern)
      const neighborCoords = neighbors.map((n) => `${n.q},${n.r}`);

      // Should include W, E neighbors
      expect(neighborCoords).toContain('1,2'); // W
      expect(neighborCoords).toContain('3,2'); // E
    });

    it('returns correct neighbors for odd row', () => {
      const neighbors = getHexNeighbors(2, 1, 5, 5);

      // Odd row neighbors
      const neighborCoords = neighbors.map((n) => `${n.q},${n.r}`);

      // Should include W, E neighbors
      expect(neighborCoords).toContain('1,1'); // W
      expect(neighborCoords).toContain('3,1'); // E
    });

    it('respects grid bounds', () => {
      const neighbors = getHexNeighbors(0, 0, 3, 3);

      for (const n of neighbors) {
        expect(n.q).toBeGreaterThanOrEqual(0);
        expect(n.q).toBeLessThan(3);
        expect(n.r).toBeGreaterThanOrEqual(0);
        expect(n.r).toBeLessThan(3);
      }
    });
  });

  describe('hexDistance', () => {
    it('returns 0 for same cell', () => {
      expect(hexDistance(2, 2, 2, 2)).toBe(0);
    });

    it('returns 1 for adjacent cells', () => {
      // Direct neighbors
      expect(hexDistance(2, 2, 3, 2)).toBe(1); // E
      expect(hexDistance(2, 2, 1, 2)).toBe(1); // W
    });

    it('calculates distance for non-adjacent cells', () => {
      const dist = hexDistance(0, 0, 3, 3);
      expect(dist).toBeGreaterThan(0);
    });

    it('is symmetric', () => {
      const d1 = hexDistance(0, 0, 3, 2);
      const d2 = hexDistance(3, 2, 0, 0);

      expect(d1).toBe(d2);
    });

    it('follows triangle inequality', () => {
      const a = { q: 0, r: 0 };
      const b = { q: 2, r: 1 };
      const c = { q: 4, r: 2 };

      const ab = hexDistance(a.q, a.r, b.q, b.r);
      const bc = hexDistance(b.q, b.r, c.q, c.r);
      const ac = hexDistance(a.q, a.r, c.q, c.r);

      expect(ac).toBeLessThanOrEqual(ab + bc);
    });
  });

  describe('integration', () => {
    it('grid cell positions match hexToPixel output', () => {
      const grid = generateHexGridPoints(3, 3, 40, 2);
      const size = 40;
      const border = 2;

      for (const idx of grid.centerList) {
        const cell = grid.points[idx];
        const [row, col] = cell.index!;

        // Convert from grid coords (with border offset) to pixel
        const expected = hexToPixel(col + border, row + border, size);

        expect(cell.x).toBeCloseTo(expected.x, 5);
        expect(cell.y).toBeCloseTo(expected.y, 5);
      }
    });
  });
});
