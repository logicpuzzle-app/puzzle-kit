import { describe, it, expect } from 'vitest';
import {
  isNumberTool,
  isDirectionalNumberTool,
  isTextTool,
  isSelectTool,
  isLineTool,
  isSurfaceTool,
  isSymbolTool,
  isSpecialTool,
  isGridMode,
  isConstraintMode,
  isConstraintInputEnabled,
  calculateSimpleFlickDirection,
  calculateTopologyFlickDirection,
  isLineDrag,
  getActiveInputMode,
  getAutoModeSubtype,
  INITIAL_FLICK_STATE,
} from '../hooks/inputStrategies';

describe('inputStrategies', () => {
  describe('Tool Detection Helpers', () => {
    it('isNumberTool detects number tools', () => {
      expect(isNumberTool('number')).toBe(true);
      expect(isNumberTool('number-directional')).toBe(true);
      expect(isNumberTool('number-corner')).toBe(true);
      expect(isNumberTool('surface')).toBe(false);
      expect(isNumberTool('line')).toBe(false);
    });

    it('isDirectionalNumberTool detects only directional tool', () => {
      expect(isDirectionalNumberTool('number-directional')).toBe(true);
      expect(isDirectionalNumberTool('number')).toBe(false);
      expect(isDirectionalNumberTool('number-corner')).toBe(false);
    });

    it('isTextTool detects text tools', () => {
      expect(isTextTool('text')).toBe(true);
      expect(isTextTool('text-multiline')).toBe(true);
      expect(isTextTool('number')).toBe(false);
    });

    it('isSelectTool detects select tool', () => {
      expect(isSelectTool('select')).toBe(true);
      expect(isSelectTool('surface')).toBe(false);
    });

    it('isLineTool detects line tools', () => {
      expect(isLineTool('line')).toBe(true);
      expect(isLineTool('line-edge')).toBe(true);
      expect(isLineTool('edge')).toBe(true);
      expect(isLineTool('wall')).toBe(true);
      expect(isLineTool('surface')).toBe(false);
    });

    it('isSurfaceTool detects surface tools', () => {
      expect(isSurfaceTool('surface')).toBe(true);
      expect(isSurfaceTool('surface-cycle')).toBe(true);
      expect(isSurfaceTool('line')).toBe(false);
    });

    it('isSymbolTool detects symbol tools', () => {
      expect(isSymbolTool('symbol')).toBe(true);
      expect(isSymbolTool('symbol-circle')).toBe(true);
      expect(isSymbolTool('surface')).toBe(false);
    });

    it('isSpecialTool detects special tools', () => {
      expect(isSpecialTool('thermo')).toBe(true);
      expect(isSpecialTool('arrow')).toBe(true);
      expect(isSpecialTool('cage')).toBe(true);
      expect(isSpecialTool('boxline')).toBe(true);
      expect(isSpecialTool('line')).toBe(false);
    });
  });

  describe('Mode Detection Helpers', () => {
    it('isGridMode detects grid layer', () => {
      expect(isGridMode('grid')).toBe(true);
      expect(isGridMode('problem')).toBe(false);
      expect(isGridMode('answer')).toBe(false);
    });

    it('isConstraintMode detects constraint layer', () => {
      expect(isConstraintMode('constraint')).toBe(true);
      expect(isConstraintMode('problem')).toBe(false);
    });

    it('isConstraintInputEnabled checks both conditions', () => {
      expect(isConstraintInputEnabled(true, 'yajilin')).toBe(true);
      expect(isConstraintInputEnabled(true, null)).toBe(false);
      expect(isConstraintInputEnabled(false, 'yajilin')).toBe(false);
      expect(isConstraintInputEnabled(false, null)).toBe(false);
    });
  });

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

  describe('Line Drag Detection', () => {
    it('returns false when below threshold', () => {
      const start = { x: 100, y: 100 };
      const current = { x: 110, y: 110 };
      expect(isLineDrag(start, current, 50)).toBe(false);
    });

    it('returns true when above threshold', () => {
      const start = { x: 100, y: 100 };
      const current = { x: 150, y: 100 };
      expect(isLineDrag(start, current, 50)).toBe(true);
    });
  });

  describe('Input Mode Routing', () => {
    it('returns null when constraint not enabled', () => {
      expect(getActiveInputMode(false, 'number', null)).toBe(null);
    });

    it('returns number mode', () => {
      expect(getActiveInputMode(true, 'number', null)).toBe('number');
      expect(getActiveInputMode(true, 'number-', null)).toBe('number-');
    });

    it('returns direc mode', () => {
      expect(getActiveInputMode(true, 'direc', null)).toBe('direc');
    });

    it('returns auto mode when auto with type', () => {
      expect(getActiveInputMode(true, 'auto', 'line')).toBe('auto');
    });

    it('returns null for auto without type', () => {
      expect(getActiveInputMode(true, 'auto', null)).toBe(null);
    });
  });

  describe('Auto Mode Subtype', () => {
    it('returns correct subtypes', () => {
      expect(getAutoModeSubtype({ type: 'number' })).toBe('number');
      expect(getAutoModeSubtype({ type: 'direc' })).toBe('direc');
      expect(getAutoModeSubtype({ type: 'line' })).toBe('line');
      expect(getAutoModeSubtype({ type: 'line-cell' })).toBe('line-cell');
      expect(getAutoModeSubtype({ type: 'border-number' })).toBe('border-number');
      expect(getAutoModeSubtype({ type: 'surface' })).toBe('surface');
    });

    it('returns null for unknown types', () => {
      expect(getAutoModeSubtype({ type: 'unknown' })).toBe(null);
      expect(getAutoModeSubtype(null)).toBe(null);
    });
  });

  describe('INITIAL_FLICK_STATE', () => {
    it('has correct initial values', () => {
      expect(INITIAL_FLICK_STATE.startCell).toBe(null);
      expect(INITIAL_FLICK_STATE.startCellId).toBe(null);
      expect(INITIAL_FLICK_STATE.inputted).toBe(false);
      expect(INITIAL_FLICK_STATE.rightButton).toBe(false);
      expect(INITIAL_FLICK_STATE.lineDrawn).toBe(false);
      expect(INITIAL_FLICK_STATE.pekeInputMode).toBe(null);
    });
  });
});
