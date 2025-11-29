import { describe, it, expect } from 'vitest';
import {
  getHexCenter,
  getHexVertices,
  getHexSize,
  findNearestHexCell,
  getHexGridDimensions,
  getTriangleCenter,
  getTriangleVertices,
  getTriangleSize,
  getTriangleOrientation,
  findNearestTriangleCell,
  getPyramidCenter,
  getPyramidVertices,
  findNearestPyramidCell,
  getPyramidRowCols,
  getHexCellId,
  getTriCellId,
  getPyramidCellId,
  parseHexCellId,
  parseTriCellId,
  parsePyramidCellId,
} from '../utils/hexGridUtils';
import type { GridConfig } from '../types';

const createHexGrid = (rows = 5, cols = 5): GridConfig => ({
  rows,
  cols,
  cellSize: 40,
  outerPadding: 20,
  showGrid: true,
  gridStyle: 'normal',
  gridType: 'hex',
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  frameStyle: 'normal',
  frameColor: '#000000',
  gridColor: '#000000',
  backgroundColor: '#ffffff',
});

describe('hexGridUtils', () => {
  describe('Hexagonal Grid', () => {
    describe('getHexSize', () => {
      it('calculates correct hex dimensions', () => {
        const size = getHexSize(40);
        expect(size.width).toBeCloseTo(Math.sqrt(3) * 20);
        expect(size.height).toBe(40);
      });
    });

    describe('getHexCenter', () => {
      it('calculates center for first hex', () => {
        const grid = createHexGrid();
        const center = getHexCenter(0, 0, grid);
        expect(center.x).toBeGreaterThan(0);
        expect(center.y).toBeGreaterThan(0);
      });

      it('different columns have different offsets', () => {
        const grid = createHexGrid();
        const center0 = getHexCenter(0, 0, grid);
        const center1 = getHexCenter(0, 1, grid);
        // Odd column has y offset
        expect(center1.y).not.toBe(center0.y);
      });
    });

    describe('getHexVertices', () => {
      it('returns 6 vertices', () => {
        const grid = createHexGrid();
        const vertices = getHexVertices(0, 0, grid);
        expect(vertices).toHaveLength(6);
      });

      it('vertices form a closed hexagon', () => {
        const grid = createHexGrid();
        const vertices = getHexVertices(0, 0, grid);
        // All vertices should be roughly equidistant from center
        const center = getHexCenter(0, 0, grid);
        const distances = vertices.map(v =>
          Math.sqrt(Math.pow(v.x - center.x, 2) + Math.pow(v.y - center.y, 2))
        );
        const avgDist = distances.reduce((a, b) => a + b) / distances.length;
        distances.forEach(d => {
          expect(d).toBeCloseTo(avgDist, 0);
        });
      });
    });

    describe('findNearestHexCell', () => {
      it('finds cell when point is at center', () => {
        const grid = createHexGrid();
        const center = getHexCenter(2, 2, grid);
        const result = findNearestHexCell(center, grid);
        expect(result).toEqual({ row: 2, col: 2 });
      });

      it('returns null for point outside grid', () => {
        const grid = createHexGrid();
        const result = findNearestHexCell({ x: -100, y: -100 }, grid);
        expect(result).toBeNull();
      });
    });

    describe('getHexGridDimensions', () => {
      it('calculates grid dimensions', () => {
        const grid = createHexGrid(5, 5);
        const dims = getHexGridDimensions(grid);
        expect(dims.width).toBeGreaterThan(0);
        expect(dims.height).toBeGreaterThan(0);
      });
    });
  });

  describe('Triangular Grid', () => {
    describe('getTriangleOrientation', () => {
      it('alternates between up and down', () => {
        expect(getTriangleOrientation(0, 0)).toBe('up');
        expect(getTriangleOrientation(0, 1)).toBe('down');
        expect(getTriangleOrientation(1, 0)).toBe('down');
        expect(getTriangleOrientation(1, 1)).toBe('up');
      });
    });

    describe('getTriangleSize', () => {
      it('calculates correct dimensions', () => {
        const size = getTriangleSize(40);
        expect(size.width).toBe(40);
        expect(size.height).toBeCloseTo((Math.sqrt(3) / 2) * 40);
      });
    });

    describe('getTriangleVertices', () => {
      it('returns 3 vertices for up-pointing triangle', () => {
        const grid: GridConfig = { ...createHexGrid(), gridType: 'triangle' };
        const vertices = getTriangleVertices(0, 0, grid);
        expect(vertices).toHaveLength(3);
      });

      it('returns 3 vertices for down-pointing triangle', () => {
        const grid: GridConfig = { ...createHexGrid(), gridType: 'triangle' };
        const vertices = getTriangleVertices(0, 1, grid);
        expect(vertices).toHaveLength(3);
      });
    });

    describe('findNearestTriangleCell', () => {
      it('finds cell when point is at center', () => {
        const grid: GridConfig = { ...createHexGrid(), gridType: 'triangle' };
        const center = getTriangleCenter(0, 0, grid);
        const result = findNearestTriangleCell(center, grid);
        expect(result).not.toBeNull();
      });
    });
  });

  describe('Pyramid Grid', () => {
    describe('getPyramidRowCols', () => {
      it('returns correct number of columns per row', () => {
        expect(getPyramidRowCols(0)).toBe(1);
        expect(getPyramidRowCols(1)).toBe(2);
        expect(getPyramidRowCols(2)).toBe(3);
        expect(getPyramidRowCols(4)).toBe(5);
      });
    });

    describe('getPyramidVertices', () => {
      it('returns 3 vertices', () => {
        const grid: GridConfig = { ...createHexGrid(), gridType: 'pyramid' };
        const vertices = getPyramidVertices(0, 0, grid);
        expect(vertices).toHaveLength(3);
      });
    });

    describe('findNearestPyramidCell', () => {
      it('finds cell when point is at center', () => {
        const grid: GridConfig = { ...createHexGrid(), gridType: 'pyramid' };
        const center = getPyramidCenter(0, 0, grid);
        const result = findNearestPyramidCell(center, grid);
        expect(result).toEqual({ row: 0, col: 0 });
      });
    });
  });

  describe('Cell ID functions', () => {
    describe('hex cell IDs', () => {
      it('generates correct hex cell ID', () => {
        expect(getHexCellId(2, 3)).toBe('hex-2-3');
      });

      it('parses hex cell ID', () => {
        expect(parseHexCellId('hex-2-3')).toEqual({ row: 2, col: 3 });
      });

      it('returns null for invalid hex cell ID', () => {
        expect(parseHexCellId('cell-0-0')).toBeNull();
        expect(parseHexCellId('invalid')).toBeNull();
      });
    });

    describe('triangle cell IDs', () => {
      it('generates correct tri cell ID', () => {
        expect(getTriCellId(1, 4)).toBe('tri-1-4');
      });

      it('parses tri cell ID', () => {
        expect(parseTriCellId('tri-1-4')).toEqual({ row: 1, col: 4 });
      });

      it('returns null for invalid tri cell ID', () => {
        expect(parseTriCellId('hex-0-0')).toBeNull();
      });
    });

    describe('pyramid cell IDs', () => {
      it('generates correct pyramid cell ID', () => {
        expect(getPyramidCellId(3, 2)).toBe('pyr-3-2');
      });

      it('parses pyramid cell ID', () => {
        expect(parsePyramidCellId('pyr-3-2')).toEqual({ row: 3, col: 2 });
      });

      it('returns null for invalid pyramid cell ID', () => {
        expect(parsePyramidCellId('cell-0-0')).toBeNull();
      });
    });
  });
});
