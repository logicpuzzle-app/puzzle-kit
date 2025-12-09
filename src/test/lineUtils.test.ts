/**
 * Line Utils Tests
 *
 * Tests for line utility functions
 */

import { describe, it, expect, vi } from 'vitest';
import {
  determineLineAction,
  determineFillMode,
  determineSegmentAction,
  getClickColor,
  areVerticesOrthogonallyAdjacent,
  pointDistance,
  executeLineAction,
  FREEHAND_MIN_DISTANCE,
} from '../utils/lineUtils';

describe('lineUtils', () => {
  describe('determineLineAction', () => {
    const targetColor = '#000000';
    const otherColor = '#ff0000';

    describe('with shift key', () => {
      it('returns remove when line exists', () => {
        expect(determineLineAction(true, targetColor, targetColor)).toBe('remove');
        expect(determineLineAction(true, otherColor, targetColor)).toBe('remove');
      });

      it('returns skip when no line exists', () => {
        expect(determineLineAction(true, null, targetColor)).toBe('skip');
      });
    });

    describe('without shift key', () => {
      it('returns remove when same color line exists', () => {
        expect(determineLineAction(false, targetColor, targetColor)).toBe('remove');
      });

      it('returns replace when different color line exists', () => {
        expect(determineLineAction(false, otherColor, targetColor)).toBe('replace');
      });

      it('returns add when no line exists', () => {
        expect(determineLineAction(false, null, targetColor)).toBe('add');
      });
    });
  });

  describe('determineFillMode', () => {
    const targetColor = '#000000';
    const otherColor = '#ff0000';

    it('returns erase when shift key is pressed', () => {
      expect(determineFillMode(true, null, targetColor)).toBe('erase');
      expect(determineFillMode(true, targetColor, targetColor)).toBe('erase');
      expect(determineFillMode(true, otherColor, targetColor)).toBe('erase');
    });

    it('returns erase when same color line exists', () => {
      expect(determineFillMode(false, targetColor, targetColor)).toBe('erase');
    });

    it('returns draw when different color line exists', () => {
      expect(determineFillMode(false, otherColor, targetColor)).toBe('draw');
    });

    it('returns draw when no line exists', () => {
      expect(determineFillMode(false, null, targetColor)).toBe('draw');
    });
  });

  describe('determineSegmentAction', () => {
    const targetColor = '#000000';
    const otherColor = '#ff0000';

    describe('in erase mode', () => {
      it('returns skip when no line exists', () => {
        expect(determineSegmentAction('erase', false, null, targetColor)).toBe('skip');
      });

      it('returns remove when same color line exists', () => {
        expect(determineSegmentAction('erase', false, targetColor, targetColor)).toBe('remove');
      });

      it('returns remove when shift key is pressed regardless of color', () => {
        expect(determineSegmentAction('erase', true, otherColor, targetColor)).toBe('remove');
        expect(determineSegmentAction('erase', true, targetColor, targetColor)).toBe('remove');
      });

      it('returns skip when different color line exists without shift', () => {
        expect(determineSegmentAction('erase', false, otherColor, targetColor)).toBe('skip');
      });
    });

    describe('in draw mode', () => {
      it('returns add when no line exists', () => {
        expect(determineSegmentAction('draw', false, null, targetColor)).toBe('add');
      });

      it('returns replace when different color line exists', () => {
        expect(determineSegmentAction('draw', false, otherColor, targetColor)).toBe('replace');
      });

      it('returns skip when same color line exists', () => {
        expect(determineSegmentAction('draw', false, targetColor, targetColor)).toBe('skip');
      });
    });
  });

  describe('getClickColor', () => {
    const primary = '#000000';
    const secondary = '#ffffff';

    it('returns primary color for left click', () => {
      expect(getClickColor(primary, secondary, false)).toBe(primary);
    });

    it('returns secondary color for right click', () => {
      expect(getClickColor(primary, secondary, true)).toBe(secondary);
    });
  });

  describe('areVerticesOrthogonallyAdjacent', () => {
    it('returns true for horizontally adjacent vertices', () => {
      expect(areVerticesOrthogonallyAdjacent('vertex-0-0', 'vertex-0-1')).toBe(true);
      expect(areVerticesOrthogonallyAdjacent('vertex-5-3', 'vertex-5-4')).toBe(true);
    });

    it('returns true for vertically adjacent vertices', () => {
      expect(areVerticesOrthogonallyAdjacent('vertex-0-0', 'vertex-1-0')).toBe(true);
      expect(areVerticesOrthogonallyAdjacent('vertex-3-5', 'vertex-4-5')).toBe(true);
    });

    it('returns false for diagonally adjacent vertices', () => {
      expect(areVerticesOrthogonallyAdjacent('vertex-0-0', 'vertex-1-1')).toBe(false);
      expect(areVerticesOrthogonallyAdjacent('vertex-2-3', 'vertex-3-4')).toBe(false);
    });

    it('returns false for non-adjacent vertices', () => {
      expect(areVerticesOrthogonallyAdjacent('vertex-0-0', 'vertex-0-2')).toBe(false);
      expect(areVerticesOrthogonallyAdjacent('vertex-0-0', 'vertex-2-0')).toBe(false);
      expect(areVerticesOrthogonallyAdjacent('vertex-0-0', 'vertex-2-2')).toBe(false);
    });

    it('returns true for non-parseable IDs (topology mode)', () => {
      // In topology mode, IDs may not match vertex-row-col pattern
      expect(areVerticesOrthogonallyAdjacent('v-abc', 'v-def')).toBe(true);
      expect(areVerticesOrthogonallyAdjacent('topo-vertex-1', 'topo-vertex-2')).toBe(true);
    });
  });

  describe('pointDistance', () => {
    it('returns 0 for same point', () => {
      expect(pointDistance({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(0);
      expect(pointDistance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
    });

    it('calculates horizontal distance correctly', () => {
      expect(pointDistance({ x: 0, y: 0 }, { x: 3, y: 0 })).toBe(3);
      expect(pointDistance({ x: 0, y: 0 }, { x: -4, y: 0 })).toBe(4);
    });

    it('calculates vertical distance correctly', () => {
      expect(pointDistance({ x: 0, y: 0 }, { x: 0, y: 5 })).toBe(5);
      expect(pointDistance({ x: 0, y: 0 }, { x: 0, y: -6 })).toBe(6);
    });

    it('calculates diagonal distance correctly', () => {
      expect(pointDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5); // 3-4-5 triangle
      expect(pointDistance({ x: 0, y: 0 }, { x: 5, y: 12 })).toBe(13); // 5-12-13 triangle
    });

    it('is symmetric', () => {
      const p1 = { x: 1, y: 2 };
      const p2 = { x: 4, y: 6 };
      expect(pointDistance(p1, p2)).toBe(pointDistance(p2, p1));
    });
  });

  describe('FREEHAND_MIN_DISTANCE', () => {
    it('is defined and positive', () => {
      expect(FREEHAND_MIN_DISTANCE).toBeDefined();
      expect(FREEHAND_MIN_DISTANCE).toBeGreaterThan(0);
    });
  });

  describe('executeLineAction', () => {
    it('calls removeFn for remove action', () => {
      const addFn = vi.fn();
      const removeFn = vi.fn();
      const newElement = { color: '#000' };

      executeLineAction('remove', addFn, removeFn, 'existing-id', newElement);

      expect(removeFn).toHaveBeenCalledWith('existing-id');
      expect(addFn).not.toHaveBeenCalled();
    });

    it('calls both removeFn and addFn for replace action', () => {
      const addFn = vi.fn();
      const removeFn = vi.fn();
      const newElement = { color: '#000' };

      executeLineAction('replace', addFn, removeFn, 'existing-id', newElement);

      expect(removeFn).toHaveBeenCalledWith('existing-id');
      expect(addFn).toHaveBeenCalledWith(newElement);
    });

    it('calls addFn for add action', () => {
      const addFn = vi.fn();
      const removeFn = vi.fn();
      const newElement = { color: '#000' };

      executeLineAction('add', addFn, removeFn, undefined, newElement);

      expect(addFn).toHaveBeenCalledWith(newElement);
      expect(removeFn).not.toHaveBeenCalled();
    });

    it('calls nothing for skip action', () => {
      const addFn = vi.fn();
      const removeFn = vi.fn();
      const newElement = { color: '#000' };

      executeLineAction('skip', addFn, removeFn, 'existing-id', newElement);

      expect(addFn).not.toHaveBeenCalled();
      expect(removeFn).not.toHaveBeenCalled();
    });

    it('does not call removeFn if existingId is undefined', () => {
      const addFn = vi.fn();
      const removeFn = vi.fn();

      executeLineAction('remove', addFn, removeFn, undefined, undefined);

      expect(removeFn).not.toHaveBeenCalled();
    });

    it('does not call addFn if newElement is undefined', () => {
      const addFn = vi.fn();
      const removeFn = vi.fn();

      executeLineAction('add', addFn, removeFn, undefined, undefined);

      expect(addFn).not.toHaveBeenCalled();
    });
  });
});
