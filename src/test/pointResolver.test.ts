import { describe, it, expect } from 'vitest';
import type { GridConfig } from '../types';
import { squareGridToTopology } from '../utils/topology/regular/square';
import { resolveCell, resolveGridPoint } from '../utils/pointResolver';

const baseGrid: GridConfig = {
  rows: 2,
  cols: 2,
  cellSize: 10,
  outerPadding: 0,
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

describe('pointResolver', () => {
  describe('standard grid bounds', () => {
    it('returns null when point is outside grid bounds', () => {
      const result = resolveCell(
        { x: -5, y: 5 },
        { grid: baseGrid, useTopology: false, topology: null }
      );
      expect(result).toBeNull();
    });

    it('returns cell when point is inside grid bounds', () => {
      const result = resolveCell(
        { x: 5, y: 5 },
        { grid: baseGrid, useTopology: false, topology: null }
      );
      expect(result?.cellId).toBe('cell-0-0');
    });
  });

  describe('topology outboard handling', () => {
    const grid: GridConfig = {
      ...baseGrid,
      rows: 2,
      cols: 2,
      marginTop: 1,
    };
    const topology = squareGridToTopology(grid);

    it('skips outboard cell when allowOutboard is false', () => {
      const result = resolveCell(
        { x: 5, y: 5 },
        { grid, useTopology: true, topology },
        { allowOutboard: false }
      );
      expect(result).toBeNull();
    });

    it('returns outboard cell when allowOutboard is true', () => {
      const result = resolveCell(
        { x: 5, y: 5 },
        { grid, useTopology: true, topology },
        { allowOutboard: true }
      );
      expect(result?.cellId).toBe('cell-0-0');
      expect(result?.outboard).toBe(true);
    });

    it('respects allowOutboard for grid point resolution', () => {
      const withoutOutboard = resolveGridPoint(
        { x: 5, y: 5 },
        { grid, useTopology: true, topology },
        ['cell'],
        false,
        { allowOutboard: false }
      );
      const withOutboard = resolveGridPoint(
        { x: 5, y: 5 },
        { grid, useTopology: true, topology },
        ['cell'],
        false,
        { allowOutboard: true }
      );
      expect(withoutOutboard).toBeNull();
      expect(withOutboard?.id).toBe('cell-0-0');
    });
  });
});
