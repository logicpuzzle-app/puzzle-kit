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

  describe('findNearestCell', () => {

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

it('generates a rectangular board with stable IDs, positions and dimensions', () => {
  const grid = { ...defaultGrid, rows: 2, cols: 3 };
  const points = generateGridPoints(grid);
  expect(points).toHaveLength(35); // 6 cells, 12 vertices, 9 horizontal and 8 vertical edges
  expect(points.find(p => p.id === getCellId(1, 2))).toMatchObject({ id: 'cell-1-2', type: 'cell', x: 120, y: 80 });
  expect(points.find(p => p.id === getVertexId(2, 3))).toMatchObject({ id: 'vertex-2-3', type: 'vertex', x: 140, y: 100 });
  expect(points.find(p => p.id === getEdgeHId(1, 2))).toMatchObject({ id: 'edge-h-1-2', x: 120, y: 60 });
  expect(points.find(p => p.id === getEdgeVId(1, 2))).toMatchObject({ id: 'edge-v-1-2', x: 100, y: 80 });
  expect(getCellCenter(1, 2, grid)).toEqual({ x: 120, y: 80 });
  expect(getVertexPosition(2, 3, grid)).toEqual({ x: 140, y: 100 });
  expect(getGridDimensions(grid)).toEqual({ width: 160, height: 120 });
});
