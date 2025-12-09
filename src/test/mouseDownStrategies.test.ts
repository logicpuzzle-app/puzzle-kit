import { describe, it, expect } from 'vitest';
import {
  handleDirecMouseDown,
  handleNumberInputMouseDown,
  handleLineCellMouseDown,
  handleLineMouseDown,
  handleSelectMouseDown,
  handleNumberToolMouseDown,
  handleTextMouseDown,
  isDirecInputMode,
  isNumberInputMode,
  isLineCellMode,
  isLineMode,
  createFlickState,
  type MouseDownContext,
  type CellInfo,
  type AutoModeConfig,
} from '../hooks/tool-handlers/mouseDownStrategies';

// ============================================================================
// Test Helpers
// ============================================================================

const createContext = (overrides: Partial<MouseDownContext> = {}): MouseDownContext => ({
  point: { x: 100, y: 100 },
  isRightButton: false,
  grid: { cols: 9, cellSize: 40 },
  activeLayer: 'answer',
  currentTool: 'surface',
  currentInputMode: null,
  currentSchemaId: null,
  isConstraintEnabled: false,
  autoConfig: null,
  ...overrides,
});

const createCellInfo = (overrides: Partial<CellInfo> = {}): CellInfo => ({
  cellId: 'cell-2-3',
  row: 2,
  col: 3,
  center: { x: 140, y: 100 },
  ...overrides,
});

const createAutoConfig = (type: string): AutoModeConfig => ({
  type,
  rightButton: {
    action: 'default',
    settings: {
      color: '#007F00',
      secondaryColor: '#A0FFA0',
      symbolGridPoints: ['edge'],
    },
  },
});

// ============================================================================
// Tests: Mode Detection Helpers
// ============================================================================

describe('Mode Detection Helpers', () => {
  describe('isDirecInputMode', () => {
    it('returns true for direc input mode', () => {
      expect(isDirecInputMode('direc', null)).toBe(true);
    });

    it('returns true for auto mode with direc type', () => {
      const autoConfig = createAutoConfig('direc');
      expect(isDirecInputMode('auto', autoConfig)).toBe(true);
    });

    it('returns false for other input modes', () => {
      expect(isDirecInputMode('number', null)).toBe(false);
      expect(isDirecInputMode('auto', createAutoConfig('number'))).toBe(false);
      expect(isDirecInputMode(null, null)).toBe(false);
    });
  });

  describe('isNumberInputMode', () => {
    it('returns true for number input modes', () => {
      expect(isNumberInputMode('number', null)).toBe(true);
      expect(isNumberInputMode('number-', null)).toBe(true);
    });

    it('returns true for auto mode with number/border-number type', () => {
      expect(isNumberInputMode('auto', createAutoConfig('number'))).toBe(true);
      expect(isNumberInputMode('auto', createAutoConfig('border-number'))).toBe(true);
    });

    it('returns false for other modes', () => {
      expect(isNumberInputMode('direc', null)).toBe(false);
      expect(isNumberInputMode('auto', createAutoConfig('line'))).toBe(false);
    });
  });

  describe('isLineCellMode', () => {
    it('returns true for line-cell type', () => {
      expect(isLineCellMode(createAutoConfig('line-cell'))).toBe(true);
    });

    it('returns false for other types', () => {
      expect(isLineCellMode(createAutoConfig('line'))).toBe(false);
      expect(isLineCellMode(null)).toBe(false);
    });
  });

  describe('isLineMode', () => {
    it('returns true for line type', () => {
      expect(isLineMode(createAutoConfig('line'))).toBe(true);
    });

    it('returns false for other types', () => {
      expect(isLineMode(createAutoConfig('line-cell'))).toBe(false);
      expect(isLineMode(null)).toBe(false);
    });
  });
});

// ============================================================================
// Tests: Strategy Functions
// ============================================================================

describe('Strategy Functions', () => {
  describe('handleDirecMouseDown', () => {
    it('returns handled=false when no cell info', () => {
      const ctx = createContext();
      const result = handleDirecMouseDown(ctx, null);
      expect(result.handled).toBe(false);
    });

    it('returns handled=false when cell info incomplete', () => {
      const ctx = createContext();
      const cellInfo = { cellId: 'cell-2-3' }; // No row/col
      const result = handleDirecMouseDown(ctx, cellInfo);
      expect(result.handled).toBe(false);
    });

    it('sets up flick state and selection for valid cell', () => {
      const ctx = createContext({ point: { x: 150, y: 110 } });
      const cellInfo = createCellInfo();
      const result = handleDirecMouseDown(ctx, cellInfo);

      expect(result.handled).toBe(true);
      expect(result.flickState).toBeDefined();
      expect(result.flickState?.startCell).toEqual({ row: 2, col: 3 });
      expect(result.flickState?.startCellId).toBe('cell-2-3');
      expect(result.flickState?.startPoint).toEqual({ x: 150, y: 110 });
      expect(result.flickState?.inputted).toBe(false);
      expect(result.action).toEqual({ type: 'setNumberSelection', row: 2, col: 3 });
    });

    it('tracks right button in flick state', () => {
      const ctx = createContext({ isRightButton: true });
      const cellInfo = createCellInfo();
      const result = handleDirecMouseDown(ctx, cellInfo);

      expect(result.flickState?.rightButton).toBe(true);
    });
  });

  describe('handleNumberInputMouseDown', () => {
    it('returns handled=false when no cell info', () => {
      const ctx = createContext();
      const result = handleNumberInputMouseDown(ctx, null);
      expect(result.handled).toBe(false);
    });

    it('returns handleNumberTool action for valid cell', () => {
      const ctx = createContext({ point: { x: 200, y: 150 } });
      const cellInfo = createCellInfo();
      const result = handleNumberInputMouseDown(ctx, cellInfo);

      expect(result.handled).toBe(true);
      expect(result.action).toEqual({
        type: 'handleNumberTool',
        point: { x: 200, y: 150 },
        isRightButton: false,
      });
    });

    it('passes right button flag', () => {
      const ctx = createContext({ isRightButton: true });
      const cellInfo = createCellInfo();
      const result = handleNumberInputMouseDown(ctx, cellInfo);

      expect(result.action).toEqual({
        type: 'handleNumberTool',
        point: { x: 100, y: 100 },
        isRightButton: true,
      });
    });
  });

  describe('handleLineCellMouseDown', () => {
    it('sets up flick state for left button', () => {
      const ctx = createContext({ autoConfig: createAutoConfig('line-cell') });
      const cellInfo = createCellInfo();
      const result = handleLineCellMouseDown(ctx, cellInfo);

      expect(result.handled).toBe(false); // Let base handler draw line
      expect(result.flickState).toBeDefined();
      expect(result.flickState?.lineDrawn).toBe(false);
    });

    it('starts dot painting for right button', () => {
      const ctx = createContext({
        isRightButton: true,
        autoConfig: createAutoConfig('line-cell'),
        activeLayer: 'answer',
      });
      const cellInfo = createCellInfo();
      const result = handleLineCellMouseDown(ctx, cellInfo);

      expect(result.handled).toBe(true);
      expect(result.flickState?.inputted).toBe(true);
      expect(result.action?.type).toBe('addSurface');
      if (result.action?.type === 'addSurface') {
        expect(result.action.cellId).toBe('cell-2-3');
        expect(result.action.displayMode).toBe('dot');
        expect(result.action.color).toBe('#A0FFA0');
      }
    });
  });

  describe('handleLineMouseDown', () => {
    it('sets up flick state for left button', () => {
      const ctx = createContext({ autoConfig: createAutoConfig('line') });
      const result = handleLineMouseDown(ctx, false);

      expect(result.handled).toBe(false);
      expect(result.flickState).toBeDefined();
      expect(result.flickState?.rightButton).toBe(false);
    });

    it('starts peke input in add mode when no existing peke', () => {
      const ctx = createContext({
        isRightButton: true,
        autoConfig: createAutoConfig('line'),
      });
      const result = handleLineMouseDown(ctx, false);

      expect(result.flickState?.inputted).toBe(true);
      expect(result.flickState?.pekeInputMode).toBe('add');
      expect(result.action?.type).toBe('handleSymbolTool');
      if (result.action?.type === 'handleSymbolTool') {
        expect(result.action.options.inputMode).toBe('add');
        expect(result.action.options.symbolTypeOverride).toBe('cross');
      }
    });

    it('starts peke input in remove mode when peke exists', () => {
      const ctx = createContext({
        isRightButton: true,
        autoConfig: createAutoConfig('line'),
      });
      const result = handleLineMouseDown(ctx, true);

      expect(result.flickState?.pekeInputMode).toBe('remove');
      if (result.action?.type === 'handleSymbolTool') {
        expect(result.action.options.inputMode).toBe('remove');
      }
    });
  });

  describe('handleSelectMouseDown', () => {
    it('returns handleSelectTool action', () => {
      const ctx = createContext({ point: { x: 250, y: 180 } });
      const result = handleSelectMouseDown(ctx, false);

      expect(result.handled).toBe(true);
      expect(result.action).toEqual({
        type: 'handleSelectTool',
        point: { x: 250, y: 180 },
        shiftKey: false,
      });
    });

    it('passes shift key', () => {
      const ctx = createContext();
      const result = handleSelectMouseDown(ctx, true);

      expect(result.action).toEqual({
        type: 'handleSelectTool',
        point: { x: 100, y: 100 },
        shiftKey: true,
      });
    });
  });

  describe('handleNumberToolMouseDown', () => {
    it('returns handled=false when no cell info', () => {
      const ctx = createContext({ currentTool: 'number' });
      const result = handleNumberToolMouseDown(ctx, null, null);
      expect(result.handled).toBe(false);
    });

    it('returns handleNumberTool action for standard number tool', () => {
      const ctx = createContext({ currentTool: 'number' });
      const cellInfo = createCellInfo();
      const result = handleNumberToolMouseDown(ctx, cellInfo, null);

      expect(result.handled).toBe(true);
      expect(result.action?.type).toBe('handleNumberTool');
    });

    it('sets up flick state for directional number tool', () => {
      const ctx = createContext({ currentTool: 'number-directional' });
      const cellInfo = createCellInfo();
      const result = handleNumberToolMouseDown(ctx, cellInfo, null);

      expect(result.handled).toBe(true);
      expect(result.flickState).toBeDefined();
      expect(result.flickState?.startCellId).toBe('cell-2-3');
      expect(result.action).toEqual({ type: 'setNumberSelection', row: 2, col: 3 });
    });

    it('removes directional clue on right click for directional tool', () => {
      const ctx = createContext({
        currentTool: 'number-directional',
        isRightButton: true,
      });
      const cellInfo = createCellInfo();
      const result = handleNumberToolMouseDown(ctx, cellInfo, 'clue-123');

      expect(result.handled).toBe(true);
      expect(result.action).toEqual({ type: 'removeDirectionalClue', id: 'clue-123' });
    });
  });

  describe('handleTextMouseDown', () => {
    it('returns handleTextTool action', () => {
      const ctx = createContext({ point: { x: 300, y: 200 } });
      const result = handleTextMouseDown(ctx);

      expect(result.handled).toBe(true);
      expect(result.action).toEqual({
        type: 'handleTextTool',
        point: { x: 300, y: 200 },
        isRightButton: false,
      });
    });
  });
});

// ============================================================================
// Tests: createFlickState
// ============================================================================

describe('createFlickState', () => {
  it('creates initial state when no cell info', () => {
    const result = createFlickState(null, { x: 100, y: 100 }, 9, false);
    expect(result.startCell).toBe(null);
    expect(result.startCellId).toBe(null);
  });

  it('creates full state for valid cell info', () => {
    const cellInfo = createCellInfo();
    const result = createFlickState(cellInfo, { x: 150, y: 110 }, 9, true);

    expect(result.startCell).toEqual({ row: 2, col: 3 });
    expect(result.startCellId).toBe('cell-2-3');
    expect(result.startCellIndex).toBe(2 * 9 + 3); // 21
    expect(result.startCellCenter).toEqual({ x: 140, y: 100 });
    expect(result.startPoint).toEqual({ x: 150, y: 110 });
    expect(result.rightButton).toBe(true);
    expect(result.inputted).toBe(false);
    expect(result.lineDrawn).toBe(false);
    expect(result.pekeInputMode).toBe(null);
  });
});
