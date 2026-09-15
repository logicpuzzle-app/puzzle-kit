import { describe, it, expect } from 'vitest';
import {
  transition,
  INITIAL_STATE,
  getMouseButton,
  getModifiers,
  getToolCategory,
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

  it('keeps the surface-cycle override ahead of generic surface classification', () => {
    expect(getToolCategory('surface-cycle')).toBe('surface-cycle');
    expect(getToolCategory('surface-fill')).toBe('surface');
    expect(getToolCategory('unknown-tool')).toBe('unknown');
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

    it('finishes the tool and closes its history group on mouse up', () => {
      const ctx = createContext({ currentTool: 'surface' });
      const result = transition(drawingState, mouseUp(), ctx);
      expect(result.state.type).toBe('idle');
      expect(result.actions).toContainEqual({ type: 'END_HISTORY_GROUP' });
      expect(result.actions).toContainEqual({
        type: 'TOOL_UP', tool: 'surface', point: { x: 150, y: 150 },
        isRightClick: false, isShiftKey: false,
      });
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
      expect(result.actions).not.toContainEqual(expect.objectContaining({ type: 'TOOL_UP' }));
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
