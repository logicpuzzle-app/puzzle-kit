import { describe, it, expect } from 'vitest';
import { calculateSimpleFlickDirection, calculateTopologyFlickDirection } from '../hooks/inputStrategies';

describe('inputStrategies', () => {

  describe('Flick Direction Calculation', () => {
    const threshold = 10;

    it('returns no direction when below threshold', () => {
      const result = calculateSimpleFlickDirection(5, 5, threshold);
      expect(result.direction).toBe(0);
      expect(result.isFlick).toBe(false);
    });

    it('detects upward flick', () => {
      const result = calculateSimpleFlickDirection(0, -20, threshold);
      expect(result.direction).toBe(1); // up
      expect(result.isFlick).toBe(true);
    });

    it('detects downward flick', () => {
      const result = calculateSimpleFlickDirection(0, 20, threshold);
      expect(result.direction).toBe(2); // down
      expect(result.isFlick).toBe(true);
    });

    it('detects leftward flick', () => {
      const result = calculateSimpleFlickDirection(-20, 0, threshold);
      expect(result.direction).toBe(3); // left
      expect(result.isFlick).toBe(true);
    });

    it('detects rightward flick', () => {
      const result = calculateSimpleFlickDirection(20, 0, threshold);
      expect(result.direction).toBe(4); // right
      expect(result.isFlick).toBe(true);
    });

    it('prioritizes vertical over horizontal when vertical is larger', () => {
      const result = calculateSimpleFlickDirection(15, -20, threshold);
      expect(result.direction).toBe(1); // up
    });

    it('prioritizes horizontal over vertical when horizontal is larger', () => {
      const result = calculateSimpleFlickDirection(20, -15, threshold);
      expect(result.direction).toBe(4); // right
    });
  });

  describe('Topology Flick Direction Calculation', () => {
    const threshold = 10;

    it('returns no direction when below threshold', () => {
      const cellInfo = {
        center: { x: 50, y: 50 },
        vertices: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 100 },
        ],
      };
      const result = calculateTopologyFlickDirection(5, 5, threshold, cellInfo);
      expect(result.direction).toBe(0);
      expect(result.angle).toBe(null);
    });

    it('calculates angle for valid flick on square cell', () => {
      const cellInfo = {
        center: { x: 50, y: 50 },
        vertices: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 100 },
        ],
      };
      // Flick to the right
      const result = calculateTopologyFlickDirection(30, 0, threshold, cellInfo);
      expect(result.angle).toBeCloseTo(0, 0); // 0 degrees = right
    });

    it('falls back to simple direction when not enough vertices', () => {
      const cellInfo = {
        center: { x: 50, y: 50 },
        vertices: [{ x: 0, y: 0 }, { x: 100, y: 0 }], // Only 2 vertices
      };
      const result = calculateTopologyFlickDirection(0, -30, threshold, cellInfo);
      expect(result.direction).toBe(1); // up
      expect(result.angle).toBe(null);
    });
  });
});
