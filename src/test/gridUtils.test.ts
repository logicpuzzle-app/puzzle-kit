import { describe, it, expect } from 'vitest';
import {
  generateGridPoints,
  getCellId,
  getVertexId,
  getEdgeHId,
  getEdgeVId,
  getCellIndexById,
  getVertexIndexById,
  findNearestCell,
  findNearestVertex,
  getCellCenter,
  getVertexPosition,
  getGridDimensions,
  isPointInGrid,
} from '../utils/gridUtils';
import { parseEdgeId } from '../utils/gridIds';
import type { GridConfig } from '../types';

const defaultGrid: GridConfig = {
  rows: 10,
  cols: 10,
  cellSize: 40,
  outerPadding: 20,
  showGrid: true,
  gridStyle: 'normal',
  gridType: 'square',
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  frameStyle: 'normal',
  frameColor: '#000000',
  gridColor: '#000000',
  backgroundColor: '#ffffff',
};

describe('gridUtils', () => {
  describe('ID generation', () => {
    it('generates correct cell ID', () => {
      expect(getCellId(0, 0)).toBe('cell-0-0');
      expect(getCellId(5, 7)).toBe('cell-5-7');
    });

    it('generates correct vertex ID', () => {
      expect(getVertexId(0, 0)).toBe('vertex-0-0');
      expect(getVertexId(10, 10)).toBe('vertex-10-10');
    });

    it('generates correct edge IDs', () => {
      expect(getEdgeHId(0, 0)).toBe('edge-h-0-0');
      expect(getEdgeVId(0, 0)).toBe('edge-v-0-0');
    });
  });

  describe('ID lookup', () => {
    it('looks up valid cell IDs (including margin cells)', () => {
      const grid: GridConfig = { ...defaultGrid, rows: 3, cols: 3, marginTop: 1, marginLeft: 2 };
      expect(getCellIndexById('cell-0-0', grid)).toEqual({ row: 0, col: 0 });
      // Margin cells can use negative indices in IDs
      expect(getCellIndexById('cell--1--2', grid)).toEqual({ row: -1, col: -2 });
    });

    it('returns null for unknown cell ID', () => {
      expect(getCellIndexById('invalid', defaultGrid)).toBeNull();
      expect(getCellIndexById('vertex-0-0', defaultGrid)).toBeNull();
    });

    it('looks up valid vertex IDs', () => {
      const grid: GridConfig = { ...defaultGrid, rows: 3, cols: 3 };
      expect(getVertexIndexById('vertex-3-3', grid)).toEqual({ row: 3, col: 3 });
    });

    it('returns null for unknown vertex ID', () => {
      expect(getVertexIndexById('cell-0-0', defaultGrid)).toBeNull();
    });

    it('parses valid horizontal edge ID', () => {
      expect(parseEdgeId('edge-h-3-5')).toEqual({ type: 'h', row: 3, col: 5 });
      expect(parseEdgeId('edge-h-0-0')).toEqual({ type: 'h', row: 0, col: 0 });
    });

    it('parses valid vertical edge ID', () => {
      expect(parseEdgeId('edge-v-3-5')).toEqual({ type: 'v', row: 3, col: 5 });
      expect(parseEdgeId('edge-v-0-0')).toEqual({ type: 'v', row: 0, col: 0 });
    });

    it('returns null for invalid edge ID', () => {
      expect(parseEdgeId('cell-0-0')).toBeNull();
      expect(parseEdgeId('vertex-0-0')).toBeNull();
      expect(parseEdgeId('edge-0-0')).toBeNull();
      expect(parseEdgeId('')).toBeNull();
    });
  });

  describe('generateGridPoints', () => {
    it('generates correct number of points', () => {
      const grid: GridConfig = { ...defaultGrid, rows: 3, cols: 3 };
      const points = generateGridPoints(grid);

      // Cells: 3x3 = 9
      // Vertices: 4x4 = 16
      // Horizontal edges: 4x3 = 12
      // Vertical edges: 3x4 = 12
      // Total: 9 + 16 + 12 + 12 = 49
      expect(points.length).toBe(49);
    });

    it('generates cell centers at correct positions', () => {
      const grid: GridConfig = { ...defaultGrid, rows: 2, cols: 2 };
      const points = generateGridPoints(grid);
      const cellPoints = points.filter(p => p.type === 'cell');

      expect(cellPoints).toHaveLength(4);

      // First cell center should be at (padding + cellSize/2, padding + cellSize/2)
      const firstCell = cellPoints.find(p => p.id === 'cell-0-0');
      expect(firstCell).toBeDefined();
      expect(firstCell?.x).toBe(20 + 20); // padding + cellSize/2
      expect(firstCell?.y).toBe(20 + 20);
    });

    it('generates vertices at correct positions', () => {
      const grid: GridConfig = { ...defaultGrid, rows: 2, cols: 2 };
      const points = generateGridPoints(grid);
      const vertexPoints = points.filter(p => p.type === 'vertex');

      expect(vertexPoints).toHaveLength(9); // 3x3 vertices for 2x2 grid

      const topLeft = vertexPoints.find(p => p.id === 'vertex-0-0');
      expect(topLeft?.x).toBe(20); // just padding
      expect(topLeft?.y).toBe(20);
    });
  });

  describe('position calculations', () => {
    it('calculates cell center correctly', () => {
      const center = getCellCenter(0, 0, defaultGrid);
      expect(center.x).toBe(40); // padding(20) + cellSize/2(20)
      expect(center.y).toBe(40);

      const center2 = getCellCenter(1, 2, defaultGrid);
      expect(center2.x).toBe(20 + 2 * 40 + 20); // 120
      expect(center2.y).toBe(20 + 1 * 40 + 20); // 80
    });

    it('calculates vertex position correctly', () => {
      const pos = getVertexPosition(0, 0, defaultGrid);
      expect(pos.x).toBe(20);
      expect(pos.y).toBe(20);

      const pos2 = getVertexPosition(1, 1, defaultGrid);
      expect(pos2.x).toBe(60); // padding + cellSize
      expect(pos2.y).toBe(60);
    });
  });

  describe('findNearestCell', () => {
    it('finds correct cell for point inside', () => {
      const point = { x: 50, y: 50 }; // Should be in cell (0, 0)
      const result = findNearestCell(point, defaultGrid);
      expect(result).toEqual({ row: 0, col: 0 });
    });

    it('finds correct cell for different position', () => {
      const point = { x: 100, y: 100 }; // Should be in cell (2, 2) - accounting for padding
      const result = findNearestCell(point, defaultGrid);
      expect(result).toEqual({ row: 2, col: 2 });
    });

    it('returns null for point outside grid', () => {
      const point = { x: 500, y: 500 }; // Outside 10x10 grid
      const result = findNearestCell(point, defaultGrid);
      expect(result).toBeNull();
    });

    it('returns null for negative coordinates', () => {
      const point = { x: -10, y: -10 };
      const result = findNearestCell(point, defaultGrid);
      expect(result).toBeNull();
    });
  });

  describe('findNearestVertex', () => {
    it('finds vertex when point is close', () => {
      const point = { x: 22, y: 22 }; // Close to vertex (0,0) at (20, 20)
      const result = findNearestVertex(point, defaultGrid, 10);
      expect(result).toEqual({ row: 0, col: 0 });
    });

    it('returns null when point is too far', () => {
      const point = { x: 40, y: 40 }; // Cell center, far from any vertex
      const result = findNearestVertex(point, defaultGrid, 5);
      expect(result).toBeNull();
    });
  });

  describe('getGridDimensions', () => {
    it('calculates correct dimensions', () => {
      const dims = getGridDimensions(defaultGrid);
      expect(dims.width).toBe(10 * 40 + 20 * 2); // cols * cellSize + padding * 2 = 440
      expect(dims.height).toBe(10 * 40 + 20 * 2); // 440
    });
  });

  describe('isPointInGrid', () => {
    it('returns true for point inside grid', () => {
      const point = { x: 100, y: 100 };
      expect(isPointInGrid(point, defaultGrid)).toBe(true);
    });

    it('returns false for point outside grid', () => {
      const point = { x: 500, y: 500 };
      expect(isPointInGrid(point, defaultGrid)).toBe(false);
    });

    it('returns true for point on boundary', () => {
      const point = { x: 20, y: 20 }; // Top-left corner
      expect(isPointInGrid(point, defaultGrid)).toBe(true);
    });
  });
});
