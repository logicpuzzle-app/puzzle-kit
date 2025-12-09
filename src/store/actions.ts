/**
 * Action Types and Definitions for PuzzleKit
 *
 * Based on crossword app's Action pattern:
 * - All state mutations go through actions
 * - Actions are atomic and reversible
 * - Actions can be batched for group undo/redo
 */

import type {
  LayerType,
  DataLayerType,
  SurfaceElement,
  LineElement,
  EdgeElement,
  WallElement,
  NumberElement,
  SymbolElement,
  CageElement,
  SpecialElement,
  GridConfig,
  PuzzleState,
} from '../types';

// ========================================
// Element Type Mapping
// ========================================

// Map element names to their types
type ElementTypeMap = {
  SURFACE: SurfaceElement;
  LINE: LineElement;
  EDGE: EdgeElement;
  WALL: WallElement;
  NUMBER: NumberElement;
  SYMBOL: SymbolElement;
  CAGE: CageElement;
  SPECIAL: SpecialElement;
};

type ElementName = keyof ElementTypeMap;

// ========================================
// Generic Element Actions
// ========================================

// Generic Add action for any element type
interface AddElementAction<N extends ElementName> {
  type: `ADD_${N}`;
  element: ElementTypeMap[N];
}

// Generic Remove action for any element type
interface RemoveElementAction<N extends ElementName> {
  type: `REMOVE_${N}`;
  id: string;
  element: ElementTypeMap[N];
}

// Specific element actions (for type inference)
export type AddSurfaceAction = AddElementAction<'SURFACE'>;
export type RemoveSurfaceAction = RemoveElementAction<'SURFACE'>;
export type AddLineAction = AddElementAction<'LINE'>;
export type RemoveLineAction = RemoveElementAction<'LINE'>;
export type AddEdgeAction = AddElementAction<'EDGE'>;
export type RemoveEdgeAction = RemoveElementAction<'EDGE'>;
export type AddWallAction = AddElementAction<'WALL'>;
export type RemoveWallAction = RemoveElementAction<'WALL'>;
export type AddNumberAction = AddElementAction<'NUMBER'>;
export type RemoveNumberAction = RemoveElementAction<'NUMBER'>;
export type AddSymbolAction = AddElementAction<'SYMBOL'>;
export type RemoveSymbolAction = RemoveElementAction<'SYMBOL'>;
export type AddCageAction = AddElementAction<'CAGE'>;
export type RemoveCageAction = RemoveElementAction<'CAGE'>;
export type AddSpecialAction = AddElementAction<'SPECIAL'>;
export type RemoveSpecialAction = RemoveElementAction<'SPECIAL'>;

// Special action for number updates
export interface UpdateNumberAction {
  type: 'UPDATE_NUMBER';
  id: string;
  previousValue: string;
  newValue: string;
  layer: DataLayerType;
}

// Special action for line updates (color, style, thickness)
export interface UpdateLineAction {
  type: 'UPDATE_LINE';
  id: string;
  previousElement: LineElement;
  newElement: LineElement;
  layer: DataLayerType;
}

// ========================================
// Layer Actions
// ========================================

export interface SetActiveLayerAction {
  type: 'SET_ACTIVE_LAYER';
  layer: LayerType;
  previousLayer: LayerType;
}

export interface ClearLayerAction {
  type: 'CLEAR_LAYER';
  layer: 'problem' | 'answer';
  previousState: PuzzleState['problem'] | PuzzleState['answer'];
}

// ========================================
// Grid Actions
// ========================================

export interface SetGridAction {
  type: 'SET_GRID';
  grid: Partial<GridConfig>;
  previousGrid: GridConfig;
}

// ========================================
// Batch Action
// ========================================

export interface BatchAction {
  type: 'BATCH';
  actions: PuzzleAction[];
  description?: string;
}

// ========================================
// Union of All Actions
// ========================================

export type PuzzleAction =
  // Element operations
  | AddSurfaceAction
  | RemoveSurfaceAction
  | AddLineAction
  | RemoveLineAction
  | UpdateLineAction
  | AddEdgeAction
  | RemoveEdgeAction
  | AddWallAction
  | RemoveWallAction
  | AddNumberAction
  | RemoveNumberAction
  | UpdateNumberAction
  | AddSymbolAction
  | RemoveSymbolAction
  | AddCageAction
  | RemoveCageAction
  | AddSpecialAction
  | RemoveSpecialAction
  // Layer operations
  | SetActiveLayerAction
  | ClearLayerAction
  // Grid operations
  | SetGridAction
  // Batch operations
  | BatchAction;

// ========================================
// Generic Action Creators
// ========================================

// Factory for creating add action creators
function createAddActionCreator<N extends ElementName>(name: N) {
  return (element: ElementTypeMap[N]): AddElementAction<N> => ({
    type: `ADD_${name}` as const,
    element,
  });
}

// Factory for creating remove action creators
function createRemoveActionCreator<N extends ElementName>(name: N) {
  return (id: string, element: ElementTypeMap[N]): RemoveElementAction<N> => ({
    type: `REMOVE_${name}` as const,
    id,
    element,
  });
}

// Element action creators using the factories
export const createAddSurfaceAction = createAddActionCreator('SURFACE');
export const createRemoveSurfaceAction = createRemoveActionCreator('SURFACE');
export const createAddLineAction = createAddActionCreator('LINE');
export const createRemoveLineAction = createRemoveActionCreator('LINE');
export const createAddEdgeAction = createAddActionCreator('EDGE');
export const createRemoveEdgeAction = createRemoveActionCreator('EDGE');
export const createAddWallAction = createAddActionCreator('WALL');
export const createRemoveWallAction = createRemoveActionCreator('WALL');
export const createAddNumberAction = createAddActionCreator('NUMBER');
export const createRemoveNumberAction = createRemoveActionCreator('NUMBER');
export const createAddSymbolAction = createAddActionCreator('SYMBOL');
export const createRemoveSymbolAction = createRemoveActionCreator('SYMBOL');
export const createAddCageAction = createAddActionCreator('CAGE');
export const createRemoveCageAction = createRemoveActionCreator('CAGE');
export const createAddSpecialAction = createAddActionCreator('SPECIAL');
export const createRemoveSpecialAction = createRemoveActionCreator('SPECIAL');

// Special action creators
export const createUpdateNumberAction = (
  id: string,
  previousValue: string,
  newValue: string,
  layer: DataLayerType
): UpdateNumberAction => ({
  type: 'UPDATE_NUMBER',
  id,
  previousValue,
  newValue,
  layer,
});

export const createUpdateLineAction = (
  id: string,
  previousElement: LineElement,
  newElement: LineElement,
  layer: DataLayerType
): UpdateLineAction => ({
  type: 'UPDATE_LINE',
  id,
  previousElement,
  newElement,
  layer,
});

export const createBatchAction = (actions: PuzzleAction[], description?: string): BatchAction => ({
  type: 'BATCH',
  actions,
  description,
});

// ========================================
// Action Reversal (for undo)
// ========================================

// Helper to reverse element actions
function reverseElementAction<N extends ElementName>(
  actionType: string,
  action: PuzzleAction
): PuzzleAction | null {
  if (actionType.startsWith('ADD_')) {
    const name = actionType.slice(4) as N;
    const addAction = action as AddElementAction<N>;
    return {
      type: `REMOVE_${name}`,
      id: addAction.element.id,
      element: addAction.element,
    } as PuzzleAction;
  }
  if (actionType.startsWith('REMOVE_')) {
    const name = actionType.slice(7) as N;
    const removeAction = action as RemoveElementAction<N>;
    return {
      type: `ADD_${name}`,
      element: removeAction.element,
    } as PuzzleAction;
  }
  return null;
}

export function reverseAction(action: PuzzleAction): PuzzleAction {
  // Try to handle as element action
  const elementReversed = reverseElementAction(action.type, action);
  if (elementReversed) {
    return elementReversed;
  }

  // Handle special cases
  switch (action.type) {
    case 'UPDATE_NUMBER':
      return {
        type: 'UPDATE_NUMBER',
        id: action.id,
        previousValue: action.newValue,
        newValue: action.previousValue,
        layer: action.layer,
      };
    case 'UPDATE_LINE':
      return {
        type: 'UPDATE_LINE',
        id: action.id,
        previousElement: action.newElement,
        newElement: action.previousElement,
        layer: action.layer,
      };
    case 'SET_ACTIVE_LAYER':
      return {
        type: 'SET_ACTIVE_LAYER',
        layer: action.previousLayer,
        previousLayer: action.layer,
      };
    case 'CLEAR_LAYER':
      // Clear layer cannot be easily reversed without snapshot
      return action;
    case 'SET_GRID':
      return {
        type: 'SET_GRID',
        grid: action.previousGrid,
        previousGrid: { ...action.previousGrid, ...action.grid },
      };
    case 'BATCH':
      return {
        type: 'BATCH',
        actions: action.actions.map(reverseAction).reverse(),
        description: action.description ? `Undo: ${action.description}` : undefined,
      };
    default:
      return action;
  }
}

// ========================================
// Action Description (for UI display)
// ========================================

// Description mapping for element actions
const ELEMENT_ACTION_DESCRIPTIONS: Record<string, string> = {
  ADD_SURFACE: 'Add surface',
  REMOVE_SURFACE: 'Remove surface',
  ADD_LINE: 'Add line',
  REMOVE_LINE: 'Remove line',
  UPDATE_LINE: 'Update line',
  ADD_EDGE: 'Add edge',
  REMOVE_EDGE: 'Remove edge',
  ADD_WALL: 'Add wall',
  REMOVE_WALL: 'Remove wall',
  ADD_NUMBER: 'Add number',
  REMOVE_NUMBER: 'Remove number',
  ADD_SYMBOL: 'Add symbol',
  REMOVE_SYMBOL: 'Remove symbol',
  ADD_CAGE: 'Add cage',
  REMOVE_CAGE: 'Remove cage',
  ADD_SPECIAL: 'Add special',
  REMOVE_SPECIAL: 'Remove special',
};

export function getActionDescription(action: PuzzleAction): string {
  // Check element action descriptions
  const elementDescription = ELEMENT_ACTION_DESCRIPTIONS[action.type];
  if (elementDescription) {
    return elementDescription;
  }

  // Handle special cases
  switch (action.type) {
    case 'UPDATE_NUMBER':
      return 'Update number';
    case 'SET_ACTIVE_LAYER':
      return `Switch to ${action.layer} layer`;
    case 'CLEAR_LAYER':
      return `Clear ${action.layer} layer`;
    case 'SET_GRID':
      return 'Update grid settings';
    case 'BATCH':
      return action.description || `${action.actions.length} operations`;
    default:
      return 'Unknown action';
  }
}
