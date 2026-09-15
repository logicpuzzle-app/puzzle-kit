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
} from '../utils/lineUtils';

describe('lineUtils', () => {
  describe('determineLineAction', () => {
    const targetColor = '#000000';
    const otherColor = '#ff0000';

    describe('with shift key', () => {
      it('returns remove when line exists', () => {
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

  it('selects primary or secondary color according to the mouse button', () => {
    expect(getClickColor('#000000', '#ffffff', false)).toBe('#000000');
    expect(getClickColor('#000000', '#ffffff', true)).toBe('#ffffff');
  });

  describe('areVerticesOrthogonallyAdjacent', () => {
    it('returns true for horizontally adjacent vertices', () => {
      expect(areVerticesOrthogonallyAdjacent('vertex-0-0', 'vertex-0-1')).toBe(true);
    });

    it('returns true for vertically adjacent vertices', () => {
      expect(areVerticesOrthogonallyAdjacent('vertex-0-0', 'vertex-1-0')).toBe(true);
    });

    it('returns false for diagonally adjacent vertices', () => {
      expect(areVerticesOrthogonallyAdjacent('vertex-0-0', 'vertex-1-1')).toBe(false);
    });

    it('returns false for non-adjacent vertices', () => {
      expect(areVerticesOrthogonallyAdjacent('vertex-0-0', 'vertex-0-2')).toBe(false);
    });

    it('returns true for non-parseable IDs (topology mode)', () => {
      // In topology mode, IDs may not match vertex-row-col pattern
      expect(areVerticesOrthogonallyAdjacent('v-abc', 'v-def')).toBe(true);
    });
  });

  it('measures distance from both coordinate differences', () => {
    expect(pointDistance({ x: 7, y: 2 }, { x: 4, y: 6 })).toBe(5);
  });

  describe('executeLineAction', () => {
    it('removes the old line and returns the replacement id', () => {
      const addFn = vi.fn(() => 'replacement-id');
      const removeFn = vi.fn();
      const newElement = { color: '#000' };

      expect(executeLineAction('replace', addFn, removeFn, 'existing-id', newElement)).toBe('replacement-id');

      expect(removeFn).toHaveBeenCalledWith('existing-id');
      expect(addFn).toHaveBeenCalledWith(newElement);
    });

    it('calls nothing for skip action', () => {
      const addFn = vi.fn();
      const removeFn = vi.fn();
      const newElement = { color: '#000' };

      executeLineAction('skip', addFn, removeFn, 'existing-id', newElement);

      expect(addFn).not.toHaveBeenCalled();
      expect(removeFn).not.toHaveBeenCalled();
    });

  });
});
