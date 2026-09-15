/**
 * Penpa Modes Tests
 *
 * Tests for Penpa-compatible mode definitions
 */

import { describe, it, expect } from 'vitest';
import {
  getSubmodes,
  supportsDiagonal,
  operatesOnVertices,
  operatesOnCells,
  operatesOnEdges,
  getModeShortcut,
  type PenpaEditMode,
} from '../types/penpaModes';

describe('Penpa Modes', () => {

  describe('getSubmodes', () => {
    it('returns surface submodes', () => {
      const submodes = getSubmodes('surface');
      expect(submodes).toContain('surface');
      expect(submodes).toContain('dot');
      expect(submodes).toContain('multicolor');
    });

    it('returns empty array for unknown mode', () => {
      const submodes = getSubmodes('unknown' as PenpaEditMode);
      expect(submodes).toEqual([]);
    });
  });

  describe('supportsDiagonal', () => {
    it('returns true for lineE', () => {
      expect(supportsDiagonal('lineE')).toBe(true);
    });

    it('returns true for line', () => {
      expect(supportsDiagonal('line')).toBe(true);
    });

    it('returns false for surface', () => {
      expect(supportsDiagonal('surface')).toBe(false);
    });

    it('returns false for number', () => {
      expect(supportsDiagonal('number')).toBe(false);
    });
  });

  describe('operatesOnVertices', () => {
    it('returns true for lineE', () => {
      expect(operatesOnVertices('lineE')).toBe(true);
    });

    it('returns false for line', () => {
      expect(operatesOnVertices('line')).toBe(false);
    });

    it('returns false for surface', () => {
      expect(operatesOnVertices('surface')).toBe(false);
    });
  });

  describe('operatesOnCells', () => {
    it('returns true for surface', () => {
      expect(operatesOnCells('surface')).toBe(true);
    });

    it('returns true for number', () => {
      expect(operatesOnCells('number')).toBe(true);
    });

    it('returns true for symbol', () => {
      expect(operatesOnCells('symbol')).toBe(true);
    });

    it('returns true for cage', () => {
      expect(operatesOnCells('cage')).toBe(true);
    });

    it('returns false for line', () => {
      expect(operatesOnCells('line')).toBe(false);
    });

    it('returns false for wall', () => {
      expect(operatesOnCells('wall')).toBe(false);
    });
  });

  describe('operatesOnEdges', () => {
    it('returns true for wall', () => {
      expect(operatesOnEdges('wall')).toBe(true);
    });

    it('returns false for surface', () => {
      expect(operatesOnEdges('surface')).toBe(false);
    });

    it('returns false for lineE', () => {
      expect(operatesOnEdges('lineE')).toBe(false);
    });
  });

  describe('getModeShortcut', () => {
    it('returns S for surface', () => {
      expect(getModeShortcut('surface')).toBe('S');
    });

    it('returns null for unknown mode', () => {
      expect(getModeShortcut('unknown' as PenpaEditMode)).toBe(null);
    });
  });
});
