/**
 * Hooks Tests
 *
 * Tests for custom React hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  findPointsInBounds,
  findCellsInBounds,
  type SelectionBounds,
} from '../hooks/useRectangleSelect';
import { getRightClickAction } from '../hooks/useRightClick';
import type { PenpaKeyboardState } from '../hooks/usePenpaKeyboard';

describe('useRectangleSelect utilities', () => {
  describe('findPointsInBounds', () => {
    const testPoints = [
      { x: 10, y: 10 },
      { x: 50, y: 50 },
      { x: 100, y: 100 },
      { x: 150, y: 150 },
      { x: 200, y: 200 },
    ];

    it('finds points within bounds', () => {
      const bounds: SelectionBounds = {
        minX: 40,
        minY: 40,
        maxX: 160,
        maxY: 160,
        width: 120,
        height: 120,
      };

      const found = findPointsInBounds(testPoints, bounds);
      expect(found).toHaveLength(3);
      expect(found).toContainEqual({ x: 50, y: 50 });
      expect(found).toContainEqual({ x: 100, y: 100 });
      expect(found).toContainEqual({ x: 150, y: 150 });
    });

    it('includes points on boundary', () => {
      const bounds: SelectionBounds = {
        minX: 50,
        minY: 50,
        maxX: 100,
        maxY: 100,
        width: 50,
        height: 50,
      };

      const found = findPointsInBounds(testPoints, bounds);
      expect(found).toHaveLength(2);
      expect(found).toContainEqual({ x: 50, y: 50 });
      expect(found).toContainEqual({ x: 100, y: 100 });
    });

    it('returns empty array when no points in bounds', () => {
      const bounds: SelectionBounds = {
        minX: 300,
        minY: 300,
        maxX: 400,
        maxY: 400,
        width: 100,
        height: 100,
      };

      const found = findPointsInBounds(testPoints, bounds);
      expect(found).toHaveLength(0);
    });

    it('handles empty points array', () => {
      const bounds: SelectionBounds = {
        minX: 0,
        minY: 0,
        maxX: 100,
        maxY: 100,
        width: 100,
        height: 100,
      };

      const found = findPointsInBounds([], bounds);
      expect(found).toHaveLength(0);
    });
  });

  describe('findCellsInBounds', () => {
    const testCells = [
      { id: 'cell-0-0', x: 25, y: 25 },
      { id: 'cell-0-1', x: 75, y: 25 },
      { id: 'cell-1-0', x: 25, y: 75 },
      { id: 'cell-1-1', x: 75, y: 75 },
    ];

    it('returns cell IDs within bounds', () => {
      const bounds: SelectionBounds = {
        minX: 0,
        minY: 0,
        maxX: 50,
        maxY: 100,
        width: 50,
        height: 100,
      };

      const found = findCellsInBounds(testCells, bounds);
      expect(found).toHaveLength(2);
      expect(found).toContain('cell-0-0');
      expect(found).toContain('cell-1-0');
    });

    it('returns all cells for large bounds', () => {
      const bounds: SelectionBounds = {
        minX: 0,
        minY: 0,
        maxX: 100,
        maxY: 100,
        width: 100,
        height: 100,
      };

      const found = findCellsInBounds(testCells, bounds);
      expect(found).toHaveLength(4);
    });
  });
});

describe('useRightClick utilities', () => {
  describe('getRightClickAction', () => {
    it('returns secondary for surface mode', () => {
      expect(getRightClickAction('surface')).toBe('secondary');
    });

    it('returns cycle for surface multicolor mode', () => {
      expect(getRightClickAction('surface', 'multicolor')).toBe('cycle');
    });

    it('returns delete for line modes', () => {
      expect(getRightClickAction('line')).toBe('delete');
      expect(getRightClickAction('lineE')).toBe('delete');
      expect(getRightClickAction('wall')).toBe('delete');
    });

    it('returns delete for number mode', () => {
      expect(getRightClickAction('number')).toBe('delete');
    });

    it('returns toggle for symbol mode', () => {
      expect(getRightClickAction('symbol')).toBe('toggle');
    });

    it('returns delete for special mode', () => {
      expect(getRightClickAction('special')).toBe('delete');
    });

    it('returns delete for cage mode', () => {
      expect(getRightClickAction('cage')).toBe('delete');
    });

    it('returns delete as default', () => {
      expect(getRightClickAction('unknown')).toBe('delete');
    });
  });
});

describe('PenpaKeyboardState', () => {
  it('has correct type structure', () => {
    const state: PenpaKeyboardState = {
      editMode: 'surface',
      layerMode: 'question',
      submode: 'surface',
      styleIndex: 1,
      colorIndex: 1,
      sizeIndex: 0,
    };

    expect(state.editMode).toBe('surface');
    expect(state.layerMode).toBe('question');
    expect(state.submode).toBe('surface');
    expect(state.styleIndex).toBe(1);
    expect(state.colorIndex).toBe(1);
    expect(state.sizeIndex).toBe(0);
  });

  it('accepts all edit modes', () => {
    const modes = ['surface', 'line', 'lineE', 'wall', 'number', 'symbol', 'special', 'cage', 'combi', 'sudoku', 'board', 'move'];

    for (const mode of modes) {
      const state: PenpaKeyboardState = {
        editMode: mode as PenpaKeyboardState['editMode'],
        layerMode: 'question',
        submode: mode,
        styleIndex: 1,
        colorIndex: 1,
        sizeIndex: 0,
      };
      expect(state.editMode).toBe(mode);
    }
  });

  it('accepts all layer modes', () => {
    const modes = ['question', 'answer', 'both'];

    for (const mode of modes) {
      const state: PenpaKeyboardState = {
        editMode: 'surface',
        layerMode: mode as PenpaKeyboardState['layerMode'],
        submode: 'surface',
        styleIndex: 1,
        colorIndex: 1,
        sizeIndex: 0,
      };
      expect(state.layerMode).toBe(mode);
    }
  });
});
