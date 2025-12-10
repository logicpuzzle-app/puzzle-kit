/**
 * Line Render Utility Tests
 *
 * Tests for line rendering utilities (stroke width, dasharray, arrows, paths)
 */

import { describe, it, expect } from 'vitest';
import {
  getStrokeWidth,
  getStrokeDasharray,
  getArrowPoints,
  buildPathFromPoints,
  shortenPathEnds,
  getLineRenderParams,
  isLineToolCategory,
  LINE_TOOL_CATEGORIES,
} from '../utils/lineRender';

describe('Line Render Utilities', () => {
  describe('getStrokeWidth', () => {
    it('returns correct width for each thickness', () => {
      expect(getStrokeWidth('thinnest')).toBe(1);
      expect(getStrokeWidth('thin')).toBe(2);
      expect(getStrokeWidth('normal')).toBe(3);
      expect(getStrokeWidth('thick')).toBe(5);
      expect(getStrokeWidth('thickest')).toBe(8);
    });

    it('returns default width for unknown thickness', () => {
      expect(getStrokeWidth('unknown' as any)).toBe(3);
    });
  });

  describe('getStrokeDasharray', () => {
    it('returns correct dasharray for each style', () => {
      expect(getStrokeDasharray('solid')).toBeUndefined();
      expect(getStrokeDasharray('dashed')).toBe('8,4');
      expect(getStrokeDasharray('dotted')).toBe('2,4');
      expect(getStrokeDasharray('double')).toBeUndefined();
    });
  });

  describe('getArrowPoints', () => {
    it('returns empty points for zero-length line', () => {
      const result = getArrowPoints(10, 10, 10, 10, 6, 'endpoint');
      expect(result.points).toBe('');
      expect(result.cx).toBe(10);
      expect(result.cy).toBe(10);
    });

    it('returns valid points for horizontal line with forward direction', () => {
      const result = getArrowPoints(0, 0, 100, 0, 10, 'endpoint', 'forward');
      expect(result.points).not.toBe('');
      expect(result.cx).toBe(100);
      expect(result.cy).toBe(0);
    });

    it('returns valid points for horizontal line with backward direction', () => {
      const result = getArrowPoints(0, 0, 100, 0, 10, 'endpoint', 'backward');
      expect(result.points).not.toBe('');
      expect(result.cx).toBe(0);
      expect(result.cy).toBe(0);
    });

    it('returns midpoint position for midpoint arrows', () => {
      const result = getArrowPoints(0, 0, 100, 0, 10, 'midpoint', 'forward');
      expect(result.cx).toBe(50);
      expect(result.cy).toBe(0);
    });

    it('handles diagonal lines', () => {
      const result = getArrowPoints(0, 0, 100, 100, 10, 'endpoint', 'forward');
      expect(result.points).not.toBe('');
      expect(result.cx).toBe(100);
      expect(result.cy).toBe(100);
    });

    it('places tip at endpoint when tipAtEndpoint is true', () => {
      const result = getArrowPoints(0, 0, 100, 0, 10, 'endpoint', 'forward', true);
      // When tipAtEndpoint is true, the tip should be at exactly (100, 0)
      expect(result.points).toContain('100,0');
    });
  });

  describe('buildPathFromPoints', () => {
    it('builds path from single point', () => {
      const path = buildPathFromPoints([{ x: 10, y: 20 }]);
      expect(path).toBe('M 10 20');
    });

    it('builds path from multiple points', () => {
      const path = buildPathFromPoints([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ]);
      expect(path).toBe('M 0 0 L 100 0 L 100 100');
    });

    it('handles empty array', () => {
      const path = buildPathFromPoints([]);
      expect(path).toBe('');
    });
  });

  describe('shortenPathEnds', () => {
    it('returns same points if no shortening', () => {
      const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
      const result = shortenPathEnds(points, 0, 0);
      expect(result).toEqual(points);
    });

    it('shortens start of path', () => {
      const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
      const result = shortenPathEnds(points, 10, 0);
      expect(result[0].x).toBe(10);
      expect(result[0].y).toBe(0);
      expect(result[1]).toEqual({ x: 100, y: 0 });
    });

    it('shortens end of path', () => {
      const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
      const result = shortenPathEnds(points, 0, 10);
      expect(result[0]).toEqual({ x: 0, y: 0 });
      expect(result[1].x).toBe(90);
      expect(result[1].y).toBe(0);
    });

    it('shortens both ends', () => {
      const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
      const result = shortenPathEnds(points, 10, 10);
      expect(result[0].x).toBe(10);
      expect(result[1].x).toBe(90);
    });

    it('handles diagonal lines', () => {
      const points = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
      const result = shortenPathEnds(points, 14.14, 0); // ~10 * sqrt(2)
      expect(result[0].x).toBeCloseTo(10, 0);
      expect(result[0].y).toBeCloseTo(10, 0);
    });

    it('handles multi-point paths', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 100, y: 0 },
      ];
      const result = shortenPathEnds(points, 10, 10);
      expect(result[0].x).toBe(10);
      expect(result[2].x).toBe(90);
      // Middle point should be unchanged
      expect(result[1]).toEqual({ x: 50, y: 0 });
    });

    it('handles path too short to shorten', () => {
      const points = [{ x: 0, y: 0 }, { x: 5, y: 0 }];
      const result = shortenPathEnds(points, 10, 0);
      // Should not shorten if line is shorter than shorten amount
      expect(result[0]).toEqual({ x: 0, y: 0 });
    });
  });

  describe('getLineRenderParams', () => {
    it('returns correct params for normal single line', () => {
      const params = getLineRenderParams('normal', false);
      expect(params.strokeWidth).toBe(3);
      expect(params.doubleGap).toBe(7.5); // 3 * 2.5
      expect(params.totalWidth).toBe(3);
      expect(params.arrowSize).toBe(9); // 3 * 3
    });

    it('returns correct params for double line', () => {
      const params = getLineRenderParams('normal', true);
      expect(params.strokeWidth).toBe(1.5); // 3 * 0.5
      expect(params.doubleGap).toBe(3.75); // 1.5 * 2.5
      expect(params.totalWidth).toBeCloseTo(5.25); // 1.5 + 3.75
      expect(params.arrowSize).toBeCloseTo(15.75); // 5.25 * 3
    });

    it('has minimum stroke width of 1 for double lines', () => {
      const params = getLineRenderParams('thinnest', true);
      expect(params.strokeWidth).toBe(1); // max(1, 1 * 0.5) = 1
    });
  });

  describe('isLineToolCategory', () => {
    it('returns true for line category', () => {
      expect(isLineToolCategory('line')).toBe(true);
    });

    it('returns true for edge category', () => {
      expect(isLineToolCategory('edge')).toBe(true);
    });

    it('returns true for wall category', () => {
      expect(isLineToolCategory('wall')).toBe(true);
    });

    it('returns false for non-line categories', () => {
      expect(isLineToolCategory('surface')).toBe(false);
      expect(isLineToolCategory('number')).toBe(false);
      expect(isLineToolCategory('symbol')).toBe(false);
      expect(isLineToolCategory('select')).toBe(false);
    });
  });

  describe('LINE_TOOL_CATEGORIES', () => {
    it('contains all line-related categories', () => {
      expect(LINE_TOOL_CATEGORIES).toContain('line');
      expect(LINE_TOOL_CATEGORIES).toContain('edge');
      expect(LINE_TOOL_CATEGORIES).toContain('wall');
      expect(LINE_TOOL_CATEGORIES).toHaveLength(3);
    });
  });
});
