import { describe, it, expect } from 'vitest';
import {
  getDistance,
  getMidpoint,
  getDelta,
  isDoubleTap,
  isDragStarted,
  calculatePinchScale,
  isPinchGesture,
  shouldTriggerLongPress,
  DEFAULT_THRESHOLDS,
  type TapRecord,
  type Point,
} from '../hooks/gestureUtils';

describe('gestureUtils', () => {
  describe('getDistance', () => {
    it('calculates distance between two points', () => {
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 3, y: 4 };
      expect(getDistance(p1, p2)).toBe(5);
    });

    it('returns 0 for same point', () => {
      const p: Point = { x: 10, y: 20 };
      expect(getDistance(p, p)).toBe(0);
    });

    it('handles negative coordinates', () => {
      const p1: Point = { x: -3, y: -4 };
      const p2: Point = { x: 0, y: 0 };
      expect(getDistance(p1, p2)).toBe(5);
    });
  });

  describe('getMidpoint', () => {
    it('calculates midpoint between two points', () => {
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 10, y: 20 };
      expect(getMidpoint(p1, p2)).toEqual({ x: 5, y: 10 });
    });

    it('handles same point', () => {
      const p: Point = { x: 5, y: 5 };
      expect(getMidpoint(p, p)).toEqual({ x: 5, y: 5 });
    });
  });

  describe('getDelta', () => {
    it('calculates delta between two points', () => {
      const from: Point = { x: 10, y: 20 };
      const to: Point = { x: 15, y: 25 };
      expect(getDelta(from, to)).toEqual({ x: 5, y: 5 });
    });

    it('handles negative delta', () => {
      const from: Point = { x: 10, y: 20 };
      const to: Point = { x: 5, y: 10 };
      expect(getDelta(from, to)).toEqual({ x: -5, y: -10 });
    });
  });

  describe('isDoubleTap', () => {
    const thresholds = {
      doubleTapDelay: DEFAULT_THRESHOLDS.doubleTapDelay,
      dragThreshold: DEFAULT_THRESHOLDS.dragThreshold,
    };

    it('returns false when no previous tap', () => {
      const currentTap: TapRecord = { x: 100, y: 100, timestamp: 1000 };
      expect(isDoubleTap(currentTap, null, thresholds)).toBe(false);
    });

    it('returns true for quick tap in same position', () => {
      const lastTap: TapRecord = { x: 100, y: 100, timestamp: 1000 };
      const currentTap: TapRecord = { x: 102, y: 102, timestamp: 1100 }; // 100ms later, 2.8px away
      expect(isDoubleTap(currentTap, lastTap, thresholds)).toBe(true);
    });

    it('returns false for tap too far away', () => {
      const lastTap: TapRecord = { x: 100, y: 100, timestamp: 1000 };
      const currentTap: TapRecord = { x: 120, y: 120, timestamp: 1100 }; // 28px away
      expect(isDoubleTap(currentTap, lastTap, thresholds)).toBe(false);
    });

    it('returns false for tap after delay', () => {
      const lastTap: TapRecord = { x: 100, y: 100, timestamp: 1000 };
      const currentTap: TapRecord = { x: 100, y: 100, timestamp: 1500 }; // 500ms later
      expect(isDoubleTap(currentTap, lastTap, thresholds)).toBe(false);
    });
  });

  describe('isDragStarted', () => {
    it('returns false when distance is below threshold', () => {
      const start: Point = { x: 100, y: 100 };
      const current: Point = { x: 105, y: 105 }; // ~7px
      expect(isDragStarted(start, current, DEFAULT_THRESHOLDS.dragThreshold)).toBe(false);
    });

    it('returns true when distance exceeds threshold', () => {
      const start: Point = { x: 100, y: 100 };
      const current: Point = { x: 115, y: 100 }; // 15px
      expect(isDragStarted(start, current, DEFAULT_THRESHOLDS.dragThreshold)).toBe(true);
    });

    it('returns false when at exact threshold', () => {
      const start: Point = { x: 100, y: 100 };
      const current: Point = { x: 110, y: 100 }; // exactly 10px
      expect(isDragStarted(start, current, DEFAULT_THRESHOLDS.dragThreshold)).toBe(false);
    });
  });

  describe('calculatePinchScale', () => {
    it('returns 1 when distance unchanged', () => {
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 100, y: 0 };
      expect(calculatePinchScale(p1, p2, 100)).toBe(1);
    });

    it('returns 2 when distance doubles', () => {
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 200, y: 0 };
      expect(calculatePinchScale(p1, p2, 100)).toBe(2);
    });

    it('returns 0.5 when distance halves', () => {
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 50, y: 0 };
      expect(calculatePinchScale(p1, p2, 100)).toBe(0.5);
    });
  });

  describe('isPinchGesture', () => {
    it('returns false for small scale changes', () => {
      expect(isPinchGesture(1.05, DEFAULT_THRESHOLDS.pinchThreshold)).toBe(false);
      expect(isPinchGesture(0.95, DEFAULT_THRESHOLDS.pinchThreshold)).toBe(false);
    });

    it('returns true for significant scale changes', () => {
      expect(isPinchGesture(1.2, DEFAULT_THRESHOLDS.pinchThreshold)).toBe(true);
      expect(isPinchGesture(0.8, DEFAULT_THRESHOLDS.pinchThreshold)).toBe(true);
    });

    it('handles boundary cases with floating point', () => {
      // Note: Due to floating point precision, 1.1 - 1 = 0.10000000000000009
      // which is > 0.1, so isPinchGesture(1.1, 0.1) returns true
      // This is expected behavior for floating point comparisons
      expect(isPinchGesture(1.09, 0.1)).toBe(false); // |0.09| > 0.1 is false
      expect(isPinchGesture(0.91, 0.1)).toBe(false); // |0.09| > 0.1 is false
      expect(isPinchGesture(1.15, 0.1)).toBe(true);  // |0.15| > 0.1 is true
      expect(isPinchGesture(0.85, 0.1)).toBe(true);  // |0.15| > 0.1 is true
    });
  });

  describe('shouldTriggerLongPress', () => {
    it('returns true when not dragging and single touch', () => {
      expect(shouldTriggerLongPress(false, 1)).toBe(true);
    });

    it('returns false when dragging', () => {
      expect(shouldTriggerLongPress(true, 1)).toBe(false);
    });

    it('returns false when multiple touches', () => {
      expect(shouldTriggerLongPress(false, 2)).toBe(false);
    });

    it('returns false when no touches', () => {
      expect(shouldTriggerLongPress(false, 0)).toBe(false);
    });
  });
});
