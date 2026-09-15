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
} from '../utils/lineRender';

describe('Line Render Utilities', () => {
  describe('getStrokeWidth', () => {
    it('distinguishes thin and normal strokes', () => {
      expect(getStrokeWidth('thin')).toBe(2);
      expect(getStrokeWidth('normal')).toBe(3);
    });

    it('returns default width for unknown thickness', () => {
      expect(getStrokeWidth('unknown' as Parameters<typeof getStrokeWidth>[0])).toBe(3);
    });
  });

  describe('getStrokeDasharray', () => {
    it('returns correct dasharray for each style', () => {
      expect(getStrokeDasharray('solid')).toBeUndefined();
      expect(getStrokeDasharray('dashed')).toBe('8,4');
      expect(getStrokeDasharray('dotted')).toBe('2,4');
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

    it('shortens a bent path asymmetrically without moving its middle point', () => {
      expect(shortenPathEnds([{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 80 }], 10, 20)).toEqual([
        { x: 10, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 60 },
      ]);
    });

    it('leaves the start intact when only the end is shortened', () => {
      expect(shortenPathEnds([{ x: 0, y: 0 }, { x: 100, y: 0 }], 0, 10)).toEqual([
        { x: 0, y: 0 }, { x: 90, y: 0 },
      ]);
    });

    it('handles diagonal lines', () => {
      const points = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
      const result = shortenPathEnds(points, 14.14, 0); // ~10 * sqrt(2)
      expect(result[0].x).toBeCloseTo(10, 0);
      expect(result[0].y).toBeCloseTo(10, 0);
    });

    it('handles path too short to shorten', () => {
      const points = [{ x: 0, y: 0 }, { x: 5, y: 0 }];
      const result = shortenPathEnds(points, 10, 0);
      // Should not shorten if line is shorter than shorten amount
      expect(result[0]).toEqual({ x: 0, y: 0 });
    });
  });

  describe('getLineRenderParams', () => {
    it('keeps double strokes readable and scales their arrow to the wider line', () => {
      const single = getLineRenderParams('normal', false);
      const double = getLineRenderParams('normal', true);
      expect(single.strokeWidth).toBe(3);
      expect(single.totalWidth).toBe(3);
      expect(double.strokeWidth).toBeLessThan(single.strokeWidth);
      expect(double.doubleGap).toBeGreaterThan(double.strokeWidth);
      expect(double.totalWidth).toBeGreaterThan(single.totalWidth);
      expect(double.arrowSize).toBeGreaterThan(single.arrowSize);
      expect(getLineRenderParams('thinnest', true).strokeWidth).toBe(1);
    });
  });

  it('recognizes line tools and rejects unrelated tools', () => {
    expect(isLineToolCategory('line')).toBe(true);
    expect(isLineToolCategory('surface')).toBe(false);
  });
});
