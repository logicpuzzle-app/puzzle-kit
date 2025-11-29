/**
 * Grid Point Utilities Tests
 *
 * Tests for the integrated grid point system
 */

import { describe, it, expect } from 'vitest';
import {
  generateGridPoints,
  getCellCenters,
  getInsideCellCenters,
  getVertexPoints,
  getEdgePoints,
  findNearestCell,
  findNearestVertex,
  findNearestEdge,
  getGridBounds,
  getGridViewBox,
  pointIndexToKey,
  edgeToKey,
  parseEdgeKey,
  getCellDegree,
  getVerticesPerCell,
  getEdgesPerCell,
} from '../utils/gridPointUtils';
import { GridConfig } from '../types';
import { PointType, PointUse } from '../types/point';

const createTestGrid = (
  gridType: 'square' | 'hex' | 'triangle' | 'pyramid' = 'square'
): GridConfig => ({
  rows: 5,
  cols: 5,
  cellSize: 40,
  outerPadding: 20,
  showGrid: true,
  gridStyle: 'normal',
  gridType,
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  frameStyle: 'normal',
  frameColor: '#000000',
  gridColor: '#000000',
  backgroundColor: '#ffffff',
});

describe('Grid Point Utilities', () => {
  describe('generateGridPoints', () => {
    it('generates points for square grid', () => {
      const grid = createTestGrid('square');
      const points = generateGridPoints(grid);

      expect(points.nx).toBe(5);
      expect(points.ny).toBe(5);
      expect(points.points.length).toBeGreaterThan(0);
    });

    it('generates points for hex grid', () => {
      const grid = createTestGrid('hex');
      const points = generateGridPoints(grid);

      expect(points.nx).toBe(5);
      expect(points.ny).toBe(5);
      expect(points.points.length).toBeGreaterThan(0);
    });

    it('generates points for triangle grid', () => {
      const grid = createTestGrid('triangle');
      const points = generateGridPoints(grid);

      // Triangle grid has 2*cols columns
      expect(points.nx).toBe(10);
      expect(points.ny).toBe(5);
      expect(points.points.length).toBeGreaterThan(0);
    });

    it('generates points for pyramid grid', () => {
      const grid = createTestGrid('pyramid');
      const points = generateGridPoints(grid);

      // Pyramid uses rows as height
      expect(points.points.length).toBeGreaterThan(0);
    });
  });

  describe('getCellCenters', () => {
    it('returns cell centers from square grid', () => {
      const grid = createTestGrid('square');
      const points = generateGridPoints(grid);
      const centers = getCellCenters(points);

      expect(centers.length).toBeGreaterThan(0);
      centers.forEach((center) => {
        expect(center.type).toBe(PointType.CELL);
      });
    });

    it('returns cell centers from hex grid', () => {
      const grid = createTestGrid('hex');
      const points = generateGridPoints(grid);
      const centers = getCellCenters(points);

      expect(centers.length).toBeGreaterThan(0);
    });
  });

  describe('getInsideCellCenters', () => {
    it('returns only inside cells', () => {
      const grid = createTestGrid('square');
      const points = generateGridPoints(grid);
      const insideCenters = getInsideCellCenters(points);

      insideCenters.forEach((center) => {
        expect(center.use).toBe(PointUse.INSIDE);
      });
    });

    it('returns 25 cells for 5x5 square grid', () => {
      const grid = createTestGrid('square');
      const points = generateGridPoints(grid);
      const insideCenters = getInsideCellCenters(points);

      expect(insideCenters.length).toBe(25);
    });
  });

  describe('getVertexPoints', () => {
    it('returns vertex points from square grid', () => {
      const grid = createTestGrid('square');
      const points = generateGridPoints(grid);
      const vertices = getVertexPoints(points);

      expect(vertices.length).toBeGreaterThan(0);
      vertices.forEach((v) => {
        expect(v.type).toBe(PointType.VERTEX);
        expect(v.use).toBe(PointUse.INSIDE);
      });
    });
  });

  describe('getEdgePoints', () => {
    it('returns edge points from square grid', () => {
      const grid = createTestGrid('square');
      const points = generateGridPoints(grid);
      const edges = getEdgePoints(points);

      expect(edges.length).toBeGreaterThan(0);
      edges.forEach((e) => {
        expect([PointType.EDGE_H, PointType.EDGE_V]).toContain(e.type);
        expect(e.use).toBe(PointUse.INSIDE);
      });
    });
  });

  describe('findNearestCell', () => {
    it('finds cell at center position', () => {
      const grid = createTestGrid('square');
      const points = generateGridPoints(grid);

      // Center of first inside cell
      const cellIdx = findNearestCell(
        (2 + 0.5) * 40, // First inside cell at (0,0) with border=2
        (2 + 0.5) * 40,
        points
      );

      expect(cellIdx).not.toBeNull();
    });

    it('returns null for position far outside grid', () => {
      const grid = createTestGrid('square');
      const points = generateGridPoints(grid);

      const cellIdx = findNearestCell(-1000, -1000, points, 50);

      expect(cellIdx).toBeNull();
    });
  });

  describe('findNearestVertex', () => {
    it('finds vertex at grid intersection', () => {
      const grid = createTestGrid('square');
      const points = generateGridPoints(grid);

      // Vertex at (2,2) with border
      const vertexIdx = findNearestVertex(2 * 40, 2 * 40, points);

      expect(vertexIdx).not.toBeNull();
      if (vertexIdx !== null) {
        expect(points.points[vertexIdx].type).toBe(PointType.VERTEX);
      }
    });
  });

  describe('findNearestEdge', () => {
    it('finds edge on cell boundary', () => {
      const grid = createTestGrid('square');
      const points = generateGridPoints(grid);

      // Edge between first two inside cells
      const edgeIdx = findNearestEdge((2 + 0.5) * 40, 2 * 40, points);

      expect(edgeIdx).not.toBeNull();
      if (edgeIdx !== null) {
        expect([PointType.EDGE_H, PointType.EDGE_V]).toContain(
          points.points[edgeIdx].type
        );
      }
    });
  });

  describe('getGridBounds', () => {
    it('returns correct bounds for square grid', () => {
      const grid = createTestGrid('square');
      const points = generateGridPoints(grid);
      const bounds = getGridBounds(points);

      expect(bounds.minX).toBeLessThan(bounds.maxX);
      expect(bounds.minY).toBeLessThan(bounds.maxY);
      expect(bounds.width).toBeGreaterThan(0);
      expect(bounds.height).toBeGreaterThan(0);
    });
  });

  describe('getGridViewBox', () => {
    it('returns valid viewBox string', () => {
      const grid = createTestGrid('square');
      const points = generateGridPoints(grid);
      const viewBox = getGridViewBox(points);

      expect(viewBox).toMatch(/^-?\d+(\.\d+)? -?\d+(\.\d+)? \d+(\.\d+)? \d+(\.\d+)?$/);
    });

    it('includes padding', () => {
      const grid = createTestGrid('square');
      const points = generateGridPoints(grid);
      const bounds = getGridBounds(points);
      const padding = 30;
      const viewBox = getGridViewBox(points, padding);

      const [x, y, width, height] = viewBox.split(' ').map(Number);

      expect(x).toBeLessThan(bounds.minX);
      expect(y).toBeLessThan(bounds.minY);
      expect(width).toBeGreaterThan(bounds.width);
      expect(height).toBeGreaterThan(bounds.height);
    });
  });

  describe('pointIndexToKey', () => {
    it('converts index to string', () => {
      expect(pointIndexToKey(0)).toBe('0');
      expect(pointIndexToKey(42)).toBe('42');
      expect(pointIndexToKey(1000)).toBe('1000');
    });
  });

  describe('edgeToKey', () => {
    it('creates consistent key regardless of order', () => {
      const key1 = edgeToKey(10, 20);
      const key2 = edgeToKey(20, 10);

      expect(key1).toBe(key2);
      expect(key1).toBe('10,20');
    });
  });

  describe('parseEdgeKey', () => {
    it('parses valid edge key', () => {
      const result = parseEdgeKey('10,20');

      expect(result).toEqual([10, 20]);
    });

    it('returns null for invalid key', () => {
      expect(parseEdgeKey('invalid')).toBeNull();
      expect(parseEdgeKey('10')).toBeNull();
      expect(parseEdgeKey('a,b')).toBeNull();
    });
  });

  describe('getCellDegree', () => {
    it('returns 4 for square grid', () => {
      expect(getCellDegree('square')).toBe(4);
    });

    it('returns 6 for hex grid', () => {
      expect(getCellDegree('hex')).toBe(6);
    });

    it('returns 3 for triangle grid', () => {
      expect(getCellDegree('triangle')).toBe(3);
    });

    it('returns 3 for pyramid grid', () => {
      expect(getCellDegree('pyramid')).toBe(3);
    });
  });

  describe('getVerticesPerCell', () => {
    it('returns 4 for square grid', () => {
      expect(getVerticesPerCell('square')).toBe(4);
    });

    it('returns 6 for hex grid', () => {
      expect(getVerticesPerCell('hex')).toBe(6);
    });

    it('returns 3 for triangle grid', () => {
      expect(getVerticesPerCell('triangle')).toBe(3);
    });
  });

  describe('getEdgesPerCell', () => {
    it('returns 4 for square grid', () => {
      expect(getEdgesPerCell('square')).toBe(4);
    });

    it('returns 6 for hex grid', () => {
      expect(getEdgesPerCell('hex')).toBe(6);
    });

    it('returns 3 for triangle grid', () => {
      expect(getEdgesPerCell('triangle')).toBe(3);
    });
  });

  describe('integration with different grid types', () => {
    const gridTypes: Array<'square' | 'hex' | 'triangle' | 'pyramid'> = [
      'square',
      'hex',
      'triangle',
      'pyramid',
    ];

    gridTypes.forEach((gridType) => {
      it(`generates valid points for ${gridType} grid`, () => {
        const grid = createTestGrid(gridType);
        const points = generateGridPoints(grid);

        // Basic validity checks
        expect(points.points.length).toBeGreaterThan(0);
        expect(points.centerList.length).toBeGreaterThan(0);

        // All centerList indices should be valid
        for (const idx of points.centerList) {
          expect(idx).toBeGreaterThanOrEqual(0);
          expect(idx).toBeLessThan(points.points.length);
          expect(points.points[idx]).toBeDefined();
        }
      });

      it(`can find cells in ${gridType} grid`, () => {
        const grid = createTestGrid(gridType);
        const points = generateGridPoints(grid);

        const insideCenters = getInsideCellCenters(points);
        if (insideCenters.length > 0) {
          const firstCell = insideCenters[0];
          const foundIdx = findNearestCell(firstCell.x, firstCell.y, points);

          expect(foundIdx).not.toBeNull();
        }
      });
    });
  });
});
