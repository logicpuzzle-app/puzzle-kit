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

  describe('gaps inside the topology bounds', () => {
    // A void cell is removed from the topology, leaving a hole inside the bounding box.
    // isPointInBounds still accepts points in that hole, so the nearest-cell fallback
    // decides what happens there.
    const grid: GridConfig = { ...baseGrid, rows: 3, cols: 3, voidCells: ['cell-1-1'] };
    const topology = squareGridToTopology(grid);
    const holeCenter = { x: 15, y: 15 };

    it('does not resolve a cell for a point inside an excluded hole', () => {
      // Regression: the fallback ran unbounded, so clicking the excluded (grey) area
      // snapped to an adjacent cell and edited it.
      const result = resolveCell(holeCenter, { grid, useTopology: true, topology });
      expect(result).toBeNull();
    });

    it('still resolves points that lie inside a real cell', () => {
      const result = resolveCell({ x: 5, y: 5 }, { grid, useTopology: true, topology });
      expect(result?.cellId).toBe('cell-0-0');
    });

    it('honours an explicit maxDistance for the fallback snap', () => {
      const result = resolveCell(
        holeCenter,
        { grid, useTopology: true, topology },
        { maxDistance: 1000 }
      );
      expect(result?.cellId).toBeDefined();
    });
  });
});
