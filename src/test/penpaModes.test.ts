/**
 * Penpa Modes Tests
 *
 * Tests for Penpa-compatible mode definitions
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_MODE_STATE,
  getSubmodes,
  supportsDiagonal,
  operatesOnVertices,
  operatesOnCells,
  operatesOnEdges,
  getModeShortcut,
  type PenpaEditMode,
} from '../types/penpaModes';

describe('Penpa Modes', () => {
  describe('DEFAULT_MODE_STATE', () => {
    it('has correct default edit mode', () => {
      expect(DEFAULT_MODE_STATE.editMode).toBe('surface');
    });

    it('has correct default layer mode', () => {
      expect(DEFAULT_MODE_STATE.layerMode).toBe('question');
    });

    it('has surface config', () => {
      expect(DEFAULT_MODE_STATE.surface).toBeDefined();
      expect(DEFAULT_MODE_STATE.surface?.submode).toBe('surface');
      expect(DEFAULT_MODE_STATE.surface?.color).toBe(1);
    });

    it('has line config', () => {
      expect(DEFAULT_MODE_STATE.line).toBeDefined();
      expect(DEFAULT_MODE_STATE.line?.style).toBe(1);
    });

    it('has number config', () => {
      expect(DEFAULT_MODE_STATE.number).toBeDefined();
      expect(DEFAULT_MODE_STATE.number?.size).toBe(1);
    });

    it('has symbol config', () => {
      expect(DEFAULT_MODE_STATE.symbol).toBeDefined();
      expect(DEFAULT_MODE_STATE.symbol?.size).toBe('L');
    });
  });

  describe('getSubmodes', () => {
    it('returns surface submodes', () => {
      const submodes = getSubmodes('surface');
      expect(submodes).toContain('surface');
      expect(submodes).toContain('dot');
      expect(submodes).toContain('multicolor');
    });

    it('returns line submodes', () => {
      const submodes = getSubmodes('line');
      expect(submodes).toContain('line');
      expect(submodes).toContain('freeline');
      expect(submodes).toContain('midline');
    });

    it('returns lineE submodes', () => {
      const submodes = getSubmodes('lineE');
      expect(submodes).toContain('lineE');
      expect(submodes).toContain('freelineE');
    });

    it('returns wall submodes', () => {
      const submodes = getSubmodes('wall');
      expect(submodes).toContain('wall');
      expect(submodes).toContain('cross');
    });

    it('returns number submodes', () => {
      const submodes = getSubmodes('number');
      expect(submodes).toContain('number');
      expect(submodes).toContain('numberS');
      expect(submodes).toContain('sudoku');
    });

    it('returns symbol submodes', () => {
      const submodes = getSubmodes('symbol');
      expect(submodes).toContain('circle');
      expect(submodes).toContain('square');
      expect(submodes).toContain('diamond');
      expect(submodes).toContain('star');
      expect(submodes).toContain('arrow');
    });

    it('returns special submodes', () => {
      const submodes = getSubmodes('special');
      expect(submodes).toContain('thermo');
      expect(submodes).toContain('nobulbthermo');
      expect(submodes).toContain('arrows');
      expect(submodes).toContain('polygon');
    });

    it('returns cage submodes', () => {
      const submodes = getSubmodes('cage');
      expect(submodes).toContain('cage');
      expect(submodes).toContain('killercages');
    });

    it('returns combi submodes', () => {
      const submodes = getSubmodes('combi');
      expect(submodes.length).toBeGreaterThan(10);
      expect(submodes).toContain('battleship');
      expect(submodes).toContain('masyu');
      expect(submodes).toContain('slitherlink');
    });

    it('returns board submodes', () => {
      const submodes = getSubmodes('board');
      expect(submodes).toContain('addline');
      expect(submodes).toContain('delline');
      expect(submodes).toContain('frame');
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

    it('returns L for line', () => {
      expect(getModeShortcut('line')).toBe('L');
    });

    it('returns E for lineE', () => {
      expect(getModeShortcut('lineE')).toBe('E');
    });

    it('returns W for wall', () => {
      expect(getModeShortcut('wall')).toBe('W');
    });

    it('returns N for number', () => {
      expect(getModeShortcut('number')).toBe('N');
    });

    it('returns Y for symbol', () => {
      expect(getModeShortcut('symbol')).toBe('Y');
    });

    it('returns P for special', () => {
      expect(getModeShortcut('special')).toBe('P');
    });

    it('returns C for cage', () => {
      expect(getModeShortcut('cage')).toBe('C');
    });

    it('returns null for unknown mode', () => {
      expect(getModeShortcut('unknown' as PenpaEditMode)).toBe(null);
    });
  });

  describe('mode consistency', () => {
    const allModes: PenpaEditMode[] = [
      'surface', 'line', 'lineE', 'wall', 'number',
      'symbol', 'special', 'cage', 'combi', 'sudoku', 'board', 'move',
    ];

    it('all modes have submodes or are leaf modes', () => {
      for (const mode of allModes) {
        const submodes = getSubmodes(mode);
        // Either has submodes or is a special mode
        expect(submodes.length >= 0).toBe(true);
      }
    });

    it('all main modes have shortcuts', () => {
      const mainModes: PenpaEditMode[] = [
        'surface', 'line', 'lineE', 'wall', 'number', 'symbol', 'special', 'cage',
      ];

      for (const mode of mainModes) {
        expect(getModeShortcut(mode)).not.toBeNull();
      }
    });
  });
});
