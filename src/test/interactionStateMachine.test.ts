import { describe, it, expect } from 'vitest';
import {
  transition,
  INITIAL_STATE,
  getMouseButton,
  getModifiers,
  shouldStartPan,
  isGridLayer,
  getToolCategory,
  toolSupportsDrag,
  toolNeedsCompletion,
  type InteractionState,
  type InteractionEvent,
  type InteractionContext,
  type Modifiers,
} from '../hooks/interactionStateMachine';

// ============================================================================
// Test Helpers
// ============================================================================

const defaultModifiers: Modifiers = { alt: false, shift: false, ctrl: false, meta: false };

const createContext = (overrides: Partial<InteractionContext> = {}): InteractionContext => ({
  panMode: false,
  activeLayer: 'answer',
  gridEditMode: 'exclude',
  currentTool: 'surface',
  ...overrides,
});

const mouseDown = (
  point = { x: 100, y: 100 },
  button: 'left' | 'middle' | 'right' = 'left',
  modifiers: Partial<Modifiers> = {}
): InteractionEvent => ({
  type: 'MOUSE_DOWN',
  point,
  clientPoint: point,
  button,
  modifiers: { ...defaultModifiers, ...modifiers },
});

const mouseMove = (point = { x: 150, y: 150 }): InteractionEvent => ({
  type: 'MOUSE_MOVE',
  point,
  clientPoint: point,
});

const mouseUp = (point = { x: 150, y: 150 }): InteractionEvent => ({
  type: 'MOUSE_UP',
  point,
});

const cancel: InteractionEvent = { type: 'CANCEL' };

// ============================================================================
// Tests: Helper Functions
// ============================================================================

describe('Helper Functions', () => {
  describe('getMouseButton', () => {
    it('returns left for button 0', () => {
      expect(getMouseButton(0)).toBe('left');
    });

    it('returns middle for button 1', () => {
      expect(getMouseButton(1)).toBe('middle');
    });

    it('returns right for button 2', () => {
      expect(getMouseButton(2)).toBe('right');
    });
  });

  describe('getModifiers', () => {
    it('extracts modifiers from event', () => {
      const event = { altKey: true, shiftKey: false, ctrlKey: true, metaKey: false };
      const result = getModifiers(event);
      expect(result).toEqual({ alt: true, shift: false, ctrl: true, meta: false });
    });
  });

  describe('shouldStartPan', () => {
    it('returns true for middle button', () => {
      expect(shouldStartPan('middle', defaultModifiers, false)).toBe(true);
    });

    it('returns true for left button with alt', () => {
      expect(shouldStartPan('left', { ...defaultModifiers, alt: true }, false)).toBe(true);
    });

    it('returns true for left button with panMode', () => {
      expect(shouldStartPan('left', defaultModifiers, true)).toBe(true);
    });

    it('returns false for left button without modifiers', () => {
      expect(shouldStartPan('left', defaultModifiers, false)).toBe(false);
    });

    it('returns false for right button', () => {
      expect(shouldStartPan('right', defaultModifiers, false)).toBe(false);
    });
  });

  describe('isGridLayer', () => {
    it('returns true for grid layer', () => {
      expect(isGridLayer('grid')).toBe(true);
    });

    it('returns false for other layers', () => {
      expect(isGridLayer('problem')).toBe(false);
      expect(isGridLayer('answer')).toBe(false);
      expect(isGridLayer('constraint')).toBe(false);
    });
  });

  describe('getToolCategory', () => {
    it('categorizes surface tools', () => {
      expect(getToolCategory('surface')).toBe('surface');
      expect(getToolCategory('surface-fill')).toBe('surface');
    });

    it('categorizes surface-cycle tool', () => {
      expect(getToolCategory('surface-cycle')).toBe('surface-cycle');
    });

    it('categorizes line tools', () => {
      expect(getToolCategory('line')).toBe('line');
      expect(getToolCategory('line-edge')).toBe('line');
    });

    it('categorizes edge tools', () => {
      expect(getToolCategory('edge')).toBe('edge');
    });

    it('categorizes wall tools', () => {
      expect(getToolCategory('wall')).toBe('wall');
    });

    it('categorizes symbol tools', () => {
      expect(getToolCategory('symbol')).toBe('symbol');
      expect(getToolCategory('symbol-circle')).toBe('symbol');
    });

    it('categorizes special tools', () => {
      expect(getToolCategory('special-thermo')).toBe('special-thermo');
      expect(getToolCategory('special-arrow')).toBe('special-arrow');
      expect(getToolCategory('special-cage')).toBe('special-cage');
      expect(getToolCategory('special-boxline')).toBe('special-boxline');
    });

    it('returns unknown for unrecognized tools', () => {
      expect(getToolCategory('unknown-tool')).toBe('unknown');
    });
  });

  describe('toolSupportsDrag', () => {
    it('returns true for drag-supporting tools', () => {
      expect(toolSupportsDrag('surface')).toBe(true);
      expect(toolSupportsDrag('line')).toBe(true);
      expect(toolSupportsDrag('special-thermo')).toBe(true);
    });

    it('returns false for click-only tools', () => {
      expect(toolSupportsDrag('symbol')).toBe(false);
      expect(toolSupportsDrag('number')).toBe(false);
      expect(toolSupportsDrag('text')).toBe(false);
    });
  });

  describe('toolNeedsCompletion', () => {
    it('returns true for tools needing completion', () => {
      expect(toolNeedsCompletion('special-thermo')).toBe(true);
      expect(toolNeedsCompletion('special-cage')).toBe(true);
      expect(toolNeedsCompletion('line')).toBe(true);
    });

    it('returns false for tools not needing completion', () => {
      expect(toolNeedsCompletion('surface')).toBe(false);
      expect(toolNeedsCompletion('symbol')).toBe(false);
    });
  });
});

// ============================================================================
// Tests: State Transitions
// ============================================================================

describe('State Transitions', () => {
  describe('Idle State', () => {
    it('stays idle on mouse move', () => {
      const result = transition(INITIAL_STATE, mouseMove(), createContext());
      expect(result.state.type).toBe('idle');
      expect(result.actions).toHaveLength(0);
    });

    it('transitions to panning on middle mouse button', () => {
      const result = transition(INITIAL_STATE, mouseDown({ x: 100, y: 100 }, 'middle'), createContext());
      expect(result.state.type).toBe('panning');
      expect(result.actions).toContainEqual({ type: 'START_PAN', clientPoint: { x: 100, y: 100 } });
    });

    it('transitions to panning on alt+left click', () => {
      const result = transition(INITIAL_STATE, mouseDown({ x: 100, y: 100 }, 'left', { alt: true }), createContext());
      expect(result.state.type).toBe('panning');
    });

    it('transitions to panning when panMode is enabled', () => {
      const result = transition(INITIAL_STATE, mouseDown(), createContext({ panMode: true }));
      expect(result.state.type).toBe('panning');
    });

    it('transitions to gridEditing on grid layer', () => {
      const ctx = createContext({ activeLayer: 'grid', gridEditMode: 'merge' });
      const result = transition(INITIAL_STATE, mouseDown(), ctx);
      expect(result.state.type).toBe('gridEditing');
      if (result.state.type === 'gridEditing') {
        expect(result.state.mode).toBe('merge');
      }
    });

    it('stays idle on grid preset mode', () => {
      const ctx = createContext({ activeLayer: 'grid', gridEditMode: 'preset' });
      const result = transition(INITIAL_STATE, mouseDown(), ctx);
      expect(result.state.type).toBe('idle');
    });

    it('transitions to drawing on normal left click', () => {
      const result = transition(INITIAL_STATE, mouseDown(), createContext());
      expect(result.state.type).toBe('drawing');
      expect(result.actions).toContainEqual({ type: 'START_HISTORY_GROUP' });
      expect(result.actions).toContainEqual({ type: 'SET_DRAWING', isDrawing: true });
    });

    it('captures right click in drawing state', () => {
      const result = transition(INITIAL_STATE, mouseDown({ x: 100, y: 100 }, 'right'), createContext());
      expect(result.state.type).toBe('drawing');
      if (result.state.type === 'drawing') {
        expect(result.state.isRightClick).toBe(true);
      }
    });

    it('captures shift key in drawing state', () => {
      const result = transition(INITIAL_STATE, mouseDown({ x: 100, y: 100 }, 'left', { shift: true }), createContext());
      expect(result.state.type).toBe('drawing');
      if (result.state.type === 'drawing') {
        expect(result.state.isShiftKey).toBe(true);
      }
    });
  });

  describe('Panning State', () => {
    const panningState: InteractionState = { type: 'panning', lastPoint: { x: 100, y: 100 } };

    it('updates pan on mouse move', () => {
      const result = transition(panningState, mouseMove({ x: 150, y: 120 }), createContext());
      expect(result.state.type).toBe('panning');
      expect(result.actions).toContainEqual({
        type: 'UPDATE_PAN',
        dx: 50,
        dy: 20,
        clientPoint: { x: 150, y: 120 },
      });
    });

    it('returns to idle on mouse up', () => {
      const result = transition(panningState, mouseUp(), createContext());
      expect(result.state.type).toBe('idle');
      expect(result.actions).toContainEqual({ type: 'END_PAN' });
    });

    it('returns to idle on cancel', () => {
      const result = transition(panningState, cancel, createContext());
      expect(result.state.type).toBe('idle');
      expect(result.actions).toContainEqual({ type: 'END_PAN' });
    });
  });

  describe('Drawing State', () => {
    const drawingState: InteractionState = {
      type: 'drawing',
      startPoint: { x: 100, y: 100 },
      startCellId: null,
      isRightClick: false,
      isShiftKey: false,
    };

    it('emits TOOL_MOVE on mouse move', () => {
      const ctx = createContext({ currentTool: 'line' });
      const result = transition(drawingState, mouseMove({ x: 150, y: 150 }), ctx);
      expect(result.state.type).toBe('drawing');
      expect(result.actions).toContainEqual({
        type: 'TOOL_MOVE',
        tool: 'line',
        point: { x: 150, y: 150 },
        isRightClick: false,
        isShiftKey: false,
      });
    });

    it('returns to idle on mouse up with cleanup actions', () => {
      const ctx = createContext({ currentTool: 'surface' });
      const result = transition(drawingState, mouseUp(), ctx);
      expect(result.state.type).toBe('idle');
      expect(result.actions).toContainEqual({ type: 'END_HISTORY_GROUP' });
      expect(result.actions).toContainEqual({ type: 'RESET_FILL_MODES' });
      expect(result.actions).toContainEqual({ type: 'SET_DRAWING', isDrawing: false });
      expect(result.actions).toContainEqual({ type: 'CLEAR_DRAW_STATE' });
    });

    it('preserves isRightClick through move', () => {
      const rightClickDrawing: InteractionState = { ...drawingState, isRightClick: true };
      const ctx = createContext({ currentTool: 'surface' });
      const result = transition(rightClickDrawing, mouseMove(), ctx);
      expect(result.actions).toContainEqual(expect.objectContaining({ isRightClick: true }));
    });

    it('returns to idle on cancel', () => {
      const result = transition(drawingState, cancel, createContext());
      expect(result.state.type).toBe('idle');
      expect(result.actions).toContainEqual({ type: 'END_HISTORY_GROUP' });
    });
  });

  describe('Grid Editing State', () => {
    const gridState: InteractionState = {
      type: 'gridEditing',
      mode: 'merge',
      startPoint: { x: 100, y: 100 },
      isRightClick: false,
    };

    it('emits GRID_MOVE on mouse move', () => {
      const result = transition(gridState, mouseMove({ x: 150, y: 150 }), createContext());
      expect(result.state.type).toBe('gridEditing');
      expect(result.actions).toContainEqual({
        type: 'GRID_MOVE',
        mode: 'merge',
        point: { x: 150, y: 150 },
        isRightClick: false,
        isShiftKey: false,
      });
    });

    it('returns to idle on mouse up', () => {
      const result = transition(gridState, mouseUp(), createContext());
      expect(result.state.type).toBe('idle');
      expect(result.actions).toContainEqual({
        type: 'GRID_UP',
        mode: 'merge',
        point: { x: 150, y: 150 },
        isRightClick: false,
      });
      expect(result.actions).toContainEqual({ type: 'END_HISTORY_GROUP' });
    });
  });
});

// ============================================================================
// Tests: Action Sequences
// ============================================================================

describe('Action Sequences', () => {
  it('generates correct action sequence for complete draw cycle', () => {
    const ctx = createContext({ currentTool: 'surface' });

    // Mouse down
    const down = transition(INITIAL_STATE, mouseDown({ x: 100, y: 100 }), ctx);
    expect(down.actions.map(a => a.type)).toEqual([
      'RESET_FILL_MODES',
      'START_HISTORY_GROUP',
      'SET_DRAWING',
      'TOOL_DOWN',
    ]);

    // Mouse move
    const move = transition(down.state, mouseMove({ x: 150, y: 150 }), ctx);
    expect(move.actions.map(a => a.type)).toEqual(['TOOL_MOVE']);

    // Mouse up
    const up = transition(move.state, mouseUp({ x: 150, y: 150 }), ctx);
    expect(up.actions.map(a => a.type)).toEqual([
      'TOOL_UP',
      'END_HISTORY_GROUP',
      'RESET_FILL_MODES',
      'SET_DRAWING',
      'CLEAR_DRAW_STATE',
    ]);
  });

  it('generates correct action sequence for pan cycle', () => {
    const ctx = createContext();

    // Middle mouse down
    const down = transition(INITIAL_STATE, mouseDown({ x: 100, y: 100 }, 'middle'), ctx);
    expect(down.actions.map(a => a.type)).toEqual(['START_PAN']);

    // Move
    const move = transition(down.state, mouseMove({ x: 200, y: 150 }), ctx);
    expect(move.actions.map(a => a.type)).toEqual(['UPDATE_PAN']);

    // Up
    const up = transition(move.state, mouseUp(), ctx);
    expect(up.actions.map(a => a.type)).toEqual(['END_PAN']);
  });
});
