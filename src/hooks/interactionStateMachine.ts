/**
 * Interaction State Machine
 *
 * A finite state machine for canvas interactions.
 * Replaces implicit state transitions with explicit state/event handling.
 */

import type { Point } from '../types';

// ============================================================================
// State Types
// ============================================================================

/**
 * All possible interaction states
 */
export type InteractionState =
  | { type: 'idle' }
  | { type: 'panning'; lastPoint: Point }
  | { type: 'drawing'; startPoint: Point; startCellId: string | null; isRightClick: boolean; isShiftKey: boolean }
  | { type: 'gridEditing'; mode: GridEditMode; startPoint: Point; isRightClick: boolean }
  | { type: 'selecting'; startPoint: Point; isShiftKey: boolean };

export type GridEditMode = 'exclude' | 'merge' | 'split' | 'sculpt' | 'preset';

/**
 * Initial state
 */
export const INITIAL_STATE: InteractionState = { type: 'idle' };

// ============================================================================
// Event Types
// ============================================================================

/**
 * Mouse button identifiers
 */
export type MouseButton = 'left' | 'middle' | 'right';

/**
 * Key modifiers
 */
export interface Modifiers {
  alt: boolean;
  shift: boolean;
  ctrl: boolean;
  meta: boolean;
}

/**
 * All possible interaction events
 */
export type InteractionEvent =
  | { type: 'MOUSE_DOWN'; point: Point; clientPoint: Point; button: MouseButton; modifiers: Modifiers }
  | { type: 'MOUSE_MOVE'; point: Point; clientPoint: Point }
  | { type: 'MOUSE_UP'; point: Point }
  | { type: 'CANCEL' };

// ============================================================================
// Context (External Dependencies)
// ============================================================================

/**
 * Context provided to the state machine for decision making
 */
export interface InteractionContext {
  /** Whether pan mode is enabled */
  panMode: boolean;
  /** Current active layer */
  activeLayer: 'problem' | 'answer' | 'grid' | 'constraint';
  /** Current grid edit mode (when in grid layer) */
  gridEditMode: GridEditMode;
  /** Current tool */
  currentTool: string;
}

// ============================================================================
// Action Types (Side Effects)
// ============================================================================

/**
 * Actions that the state machine requests
 */
export type InteractionAction =
  | { type: 'START_PAN'; clientPoint: Point }
  | { type: 'UPDATE_PAN'; dx: number; dy: number; clientPoint: Point }
  | { type: 'END_PAN' }
  | { type: 'START_HISTORY_GROUP' }
  | { type: 'END_HISTORY_GROUP' }
  | { type: 'SET_DRAWING'; isDrawing: boolean }
  | { type: 'RESET_FILL_MODES' }
  | { type: 'TOOL_DOWN'; tool: string; point: Point; isRightClick: boolean; isShiftKey: boolean }
  | { type: 'TOOL_MOVE'; tool: string; point: Point; isRightClick: boolean; isShiftKey: boolean }
  | { type: 'TOOL_UP'; tool: string; point: Point; isRightClick: boolean; isShiftKey: boolean }
  | { type: 'GRID_DOWN'; mode: GridEditMode; point: Point; isRightClick: boolean; isShiftKey: boolean }
  | { type: 'GRID_MOVE'; mode: GridEditMode; point: Point; isRightClick: boolean; isShiftKey: boolean }
  | { type: 'GRID_UP'; mode: GridEditMode; point: Point; isRightClick: boolean }
  | { type: 'CLEAR_DRAW_STATE' };

/**
 * Result of a state transition
 */
export interface TransitionResult {
  state: InteractionState;
  actions: InteractionAction[];
}

// ============================================================================
// State Machine Logic
// ============================================================================

/**
 * Get mouse button from event
 */
export function getMouseButton(button: number): MouseButton {
  if (button === 1) return 'middle';
  if (button === 2) return 'right';
  return 'left';
}

/**
 * Get modifiers from event
 */
export function getModifiers(e: { altKey: boolean; shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }): Modifiers {
  return {
    alt: e.altKey,
    shift: e.shiftKey,
    ctrl: e.ctrlKey,
    meta: e.metaKey,
  };
}

/**
 * Check if event should trigger panning
 */
export function shouldStartPan(button: MouseButton, modifiers: Modifiers, panMode: boolean): boolean {
  // Middle mouse button
  if (button === 'middle') return true;
  // Left button + Alt key
  if (button === 'left' && modifiers.alt) return true;
  // Left button + pan mode enabled
  if (button === 'left' && panMode) return true;
  return false;
}

/**
 * Check if in grid mode
 */
export function isGridLayer(activeLayer: string): boolean {
  return activeLayer === 'grid';
}

/**
 * State machine transition function
 */
export function transition(
  state: InteractionState,
  event: InteractionEvent,
  context: InteractionContext
): TransitionResult {
  switch (state.type) {
    case 'idle':
      return handleIdleState(event, context);
    case 'panning':
      return handlePanningState(state, event);
    case 'drawing':
      return handleDrawingState(state, event, context);
    case 'gridEditing':
      return handleGridEditingState(state, event);
    case 'selecting':
      return handleSelectingState(state, event);
    default:
      return { state, actions: [] };
  }
}

// ============================================================================
// State Handlers
// ============================================================================

function handleIdleState(
  event: InteractionEvent,
  context: InteractionContext
): TransitionResult {
  if (event.type !== 'MOUSE_DOWN') {
    return { state: INITIAL_STATE, actions: [] };
  }

  const { point, clientPoint, button, modifiers } = event;
  const isRightClick = button === 'right';
  const isShiftKey = modifiers.shift;

  // Check for pan
  if (shouldStartPan(button, modifiers, context.panMode)) {
    return {
      state: { type: 'panning', lastPoint: clientPoint },
      actions: [{ type: 'START_PAN', clientPoint }],
    };
  }

  // Check for grid mode
  if (isGridLayer(context.activeLayer)) {
    const mode = context.gridEditMode;
    if (mode === 'preset') {
      // Preset mode: no interaction, just view
      return { state: INITIAL_STATE, actions: [] };
    }
    return {
      state: { type: 'gridEditing', mode, startPoint: point, isRightClick },
      actions: [
        { type: 'RESET_FILL_MODES' },
        { type: 'START_HISTORY_GROUP' },
        { type: 'SET_DRAWING', isDrawing: true },
        { type: 'GRID_DOWN', mode, point, isRightClick, isShiftKey },
      ],
    };
  }

  // Default: start drawing with current tool
  return {
    state: { type: 'drawing', startPoint: point, startCellId: null, isRightClick, isShiftKey },
    actions: [
      { type: 'RESET_FILL_MODES' },
      { type: 'START_HISTORY_GROUP' },
      { type: 'SET_DRAWING', isDrawing: true },
      { type: 'TOOL_DOWN', tool: context.currentTool, point, isRightClick, isShiftKey },
    ],
  };
}

function handlePanningState(
  state: Extract<InteractionState, { type: 'panning' }>,
  event: InteractionEvent
): TransitionResult {
  switch (event.type) {
    case 'MOUSE_MOVE': {
      const dx = event.clientPoint.x - state.lastPoint.x;
      const dy = event.clientPoint.y - state.lastPoint.y;
      return {
        state: { type: 'panning', lastPoint: event.clientPoint },
        actions: [{ type: 'UPDATE_PAN', dx, dy, clientPoint: event.clientPoint }],
      };
    }
    case 'MOUSE_UP':
    case 'CANCEL':
      return {
        state: INITIAL_STATE,
        actions: [{ type: 'END_PAN' }],
      };
    default:
      return { state, actions: [] };
  }
}

function handleDrawingState(
  state: Extract<InteractionState, { type: 'drawing' }>,
  event: InteractionEvent,
  context: InteractionContext
): TransitionResult {
  const { isRightClick, isShiftKey } = state;
  const tool = context.currentTool;

  switch (event.type) {
    case 'MOUSE_MOVE':
      return {
        state,
        actions: [{ type: 'TOOL_MOVE', tool, point: event.point, isRightClick, isShiftKey }],
      };
    case 'MOUSE_UP':
      return {
        state: INITIAL_STATE,
        actions: [
          { type: 'TOOL_UP', tool, point: event.point, isRightClick, isShiftKey },
          { type: 'END_HISTORY_GROUP' },
          { type: 'RESET_FILL_MODES' },
          { type: 'SET_DRAWING', isDrawing: false },
          { type: 'CLEAR_DRAW_STATE' },
        ],
      };
    case 'CANCEL':
      return {
        state: INITIAL_STATE,
        actions: [
          { type: 'END_HISTORY_GROUP' },
          { type: 'RESET_FILL_MODES' },
          { type: 'SET_DRAWING', isDrawing: false },
          { type: 'CLEAR_DRAW_STATE' },
        ],
      };
    default:
      return { state, actions: [] };
  }
}

function handleGridEditingState(
  state: Extract<InteractionState, { type: 'gridEditing' }>,
  event: InteractionEvent
): TransitionResult {
  const { mode, isRightClick } = state;

  switch (event.type) {
    case 'MOUSE_MOVE':
      return {
        state,
        actions: [{ type: 'GRID_MOVE', mode, point: event.point, isRightClick, isShiftKey: false }],
      };
    case 'MOUSE_UP':
      return {
        state: INITIAL_STATE,
        actions: [
          { type: 'GRID_UP', mode, point: event.point, isRightClick },
          { type: 'END_HISTORY_GROUP' },
          { type: 'SET_DRAWING', isDrawing: false },
        ],
      };
    case 'CANCEL':
      return {
        state: INITIAL_STATE,
        actions: [
          { type: 'END_HISTORY_GROUP' },
          { type: 'SET_DRAWING', isDrawing: false },
        ],
      };
    default:
      return { state, actions: [] };
  }
}

function handleSelectingState(
  state: Extract<InteractionState, { type: 'selecting' }>,
  event: InteractionEvent
): TransitionResult {
  // Selection is handled by useSelectionTool, this is a placeholder
  switch (event.type) {
    case 'MOUSE_UP':
    case 'CANCEL':
      return {
        state: INITIAL_STATE,
        actions: [{ type: 'SET_DRAWING', isDrawing: false }],
      };
    default:
      return { state, actions: [] };
  }
}

// ============================================================================
// Tool Category Helpers
// ============================================================================

/**
 * Tool categories for routing
 */
export type ToolCategory =
  | 'surface'
  | 'surface-cycle'
  | 'line'
  | 'edge'
  | 'wall'
  | 'symbol'
  | 'special-thermo'
  | 'special-arrow'
  | 'special-cage'
  | 'special-boxline'
  | 'multicolor-surface'
  | 'solution-area'
  | 'number'
  | 'text'
  | 'select'
  | 'unknown';

/**
 * Get tool category from tool name
 */
export function getToolCategory(tool: string): ToolCategory {
  if (tool === 'surface-cycle') return 'surface-cycle';
  if (tool.startsWith('surface')) return 'surface';
  if (tool.startsWith('line')) return 'line';
  if (tool.startsWith('edge')) return 'edge';
  if (tool.startsWith('wall')) return 'wall';
  if (tool.startsWith('symbol')) return 'symbol';
  if (tool === 'special-thermo') return 'special-thermo';
  if (tool === 'special-arrow') return 'special-arrow';
  if (tool === 'special-cage') return 'special-cage';
  if (tool === 'special-boxline') return 'special-boxline';
  if (tool === 'multicolor-surface') return 'multicolor-surface';
  if (tool === 'solution-area') return 'solution-area';
  if (tool.startsWith('number')) return 'number';
  if (tool.startsWith('text')) return 'text';
  if (tool === 'select') return 'select';
  return 'unknown';
}

/**
 * Tool category behavior configuration (map-based instead of switch)
 */
const TOOL_CATEGORY_CONFIG: Record<ToolCategory, { supportsDrag: boolean; needsCompletion: boolean }> = {
  'surface': { supportsDrag: true, needsCompletion: false },
  'surface-cycle': { supportsDrag: true, needsCompletion: false },
  'line': { supportsDrag: true, needsCompletion: true },
  'edge': { supportsDrag: true, needsCompletion: false },
  'wall': { supportsDrag: true, needsCompletion: false },
  'symbol': { supportsDrag: false, needsCompletion: false },
  'special-thermo': { supportsDrag: true, needsCompletion: true },
  'special-arrow': { supportsDrag: true, needsCompletion: true },
  'special-cage': { supportsDrag: true, needsCompletion: true },
  'special-boxline': { supportsDrag: true, needsCompletion: true },
  'multicolor-surface': { supportsDrag: true, needsCompletion: false },
  'solution-area': { supportsDrag: true, needsCompletion: false },
  'number': { supportsDrag: false, needsCompletion: false },
  'text': { supportsDrag: false, needsCompletion: false },
  'select': { supportsDrag: true, needsCompletion: false },
  'unknown': { supportsDrag: false, needsCompletion: false },
};

/**
 * Check if tool supports drag operation
 */
export function toolSupportsDrag(category: ToolCategory): boolean {
  return TOOL_CATEGORY_CONFIG[category]?.supportsDrag ?? false;
}

/**
 * Check if tool needs completion on mouse up
 */
export function toolNeedsCompletion(category: ToolCategory): boolean {
  return TOOL_CATEGORY_CONFIG[category]?.needsCompletion ?? false;
}
