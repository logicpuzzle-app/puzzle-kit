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
  ToolType,
  ToolCategory,
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
// Action Types
// ========================================

export type PuzzleAction =
  // Element operations
  | AddSurfaceAction
  | RemoveSurfaceAction
  | AddLineAction
  | RemoveLineAction
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
// Element Actions
// ========================================

export interface AddSurfaceAction {
  type: 'ADD_SURFACE';
  element: SurfaceElement;
}

export interface RemoveSurfaceAction {
  type: 'REMOVE_SURFACE';
  id: string;
  element: SurfaceElement; // Store for undo
}

export interface AddLineAction {
  type: 'ADD_LINE';
  element: LineElement;
}

export interface RemoveLineAction {
  type: 'REMOVE_LINE';
  id: string;
  element: LineElement;
}

export interface AddEdgeAction {
  type: 'ADD_EDGE';
  element: EdgeElement;
}

export interface RemoveEdgeAction {
  type: 'REMOVE_EDGE';
  id: string;
  element: EdgeElement;
}

export interface AddWallAction {
  type: 'ADD_WALL';
  element: WallElement;
}

export interface RemoveWallAction {
  type: 'REMOVE_WALL';
  id: string;
  element: WallElement;
}

export interface AddNumberAction {
  type: 'ADD_NUMBER';
  element: NumberElement;
}

export interface RemoveNumberAction {
  type: 'REMOVE_NUMBER';
  id: string;
  element: NumberElement;
}

export interface UpdateNumberAction {
  type: 'UPDATE_NUMBER';
  id: string;
  previousValue: string;
  newValue: string;
  layer: LayerType;
}

export interface AddSymbolAction {
  type: 'ADD_SYMBOL';
  element: SymbolElement;
}

export interface RemoveSymbolAction {
  type: 'REMOVE_SYMBOL';
  id: string;
  element: SymbolElement;
}

export interface AddCageAction {
  type: 'ADD_CAGE';
  element: CageElement;
}

export interface RemoveCageAction {
  type: 'REMOVE_CAGE';
  id: string;
  element: CageElement;
}

export interface AddSpecialAction {
  type: 'ADD_SPECIAL';
  element: SpecialElement;
}

export interface RemoveSpecialAction {
  type: 'REMOVE_SPECIAL';
  id: string;
  element: SpecialElement;
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
  layer: LayerType;
  previousState: PuzzleState[LayerType];
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
// Batch Action (for grouping multiple actions)
// ========================================

export interface BatchAction {
  type: 'BATCH';
  actions: PuzzleAction[];
  description?: string;
}

// ========================================
// Action Creators
// ========================================

export const createAddSurfaceAction = (element: SurfaceElement): AddSurfaceAction => ({
  type: 'ADD_SURFACE',
  element,
});

export const createRemoveSurfaceAction = (id: string, element: SurfaceElement): RemoveSurfaceAction => ({
  type: 'REMOVE_SURFACE',
  id,
  element,
});

export const createAddLineAction = (element: LineElement): AddLineAction => ({
  type: 'ADD_LINE',
  element,
});

export const createRemoveLineAction = (id: string, element: LineElement): RemoveLineAction => ({
  type: 'REMOVE_LINE',
  id,
  element,
});

export const createAddEdgeAction = (element: EdgeElement): AddEdgeAction => ({
  type: 'ADD_EDGE',
  element,
});

export const createRemoveEdgeAction = (id: string, element: EdgeElement): RemoveEdgeAction => ({
  type: 'REMOVE_EDGE',
  id,
  element,
});

export const createAddWallAction = (element: WallElement): AddWallAction => ({
  type: 'ADD_WALL',
  element,
});

export const createRemoveWallAction = (id: string, element: WallElement): RemoveWallAction => ({
  type: 'REMOVE_WALL',
  id,
  element,
});

export const createAddNumberAction = (element: NumberElement): AddNumberAction => ({
  type: 'ADD_NUMBER',
  element,
});

export const createRemoveNumberAction = (id: string, element: NumberElement): RemoveNumberAction => ({
  type: 'REMOVE_NUMBER',
  id,
  element,
});

export const createUpdateNumberAction = (
  id: string,
  previousValue: string,
  newValue: string,
  layer: LayerType
): UpdateNumberAction => ({
  type: 'UPDATE_NUMBER',
  id,
  previousValue,
  newValue,
  layer,
});

export const createAddSymbolAction = (element: SymbolElement): AddSymbolAction => ({
  type: 'ADD_SYMBOL',
  element,
});

export const createRemoveSymbolAction = (id: string, element: SymbolElement): RemoveSymbolAction => ({
  type: 'REMOVE_SYMBOL',
  id,
  element,
});

export const createAddCageAction = (element: CageElement): AddCageAction => ({
  type: 'ADD_CAGE',
  element,
});

export const createRemoveCageAction = (id: string, element: CageElement): RemoveCageAction => ({
  type: 'REMOVE_CAGE',
  id,
  element,
});

export const createAddSpecialAction = (element: SpecialElement): AddSpecialAction => ({
  type: 'ADD_SPECIAL',
  element,
});

export const createRemoveSpecialAction = (id: string, element: SpecialElement): RemoveSpecialAction => ({
  type: 'REMOVE_SPECIAL',
  id,
  element,
});

export const createBatchAction = (actions: PuzzleAction[], description?: string): BatchAction => ({
  type: 'BATCH',
  actions,
  description,
});

// ========================================
// Action Reversal (for undo)
// ========================================

export function reverseAction(action: PuzzleAction): PuzzleAction {
  switch (action.type) {
    case 'ADD_SURFACE':
      return { type: 'REMOVE_SURFACE', id: action.element.id, element: action.element };
    case 'REMOVE_SURFACE':
      return { type: 'ADD_SURFACE', element: action.element };
    case 'ADD_LINE':
      return { type: 'REMOVE_LINE', id: action.element.id, element: action.element };
    case 'REMOVE_LINE':
      return { type: 'ADD_LINE', element: action.element };
    case 'ADD_EDGE':
      return { type: 'REMOVE_EDGE', id: action.element.id, element: action.element };
    case 'REMOVE_EDGE':
      return { type: 'ADD_EDGE', element: action.element };
    case 'ADD_WALL':
      return { type: 'REMOVE_WALL', id: action.element.id, element: action.element };
    case 'REMOVE_WALL':
      return { type: 'ADD_WALL', element: action.element };
    case 'ADD_NUMBER':
      return { type: 'REMOVE_NUMBER', id: action.element.id, element: action.element };
    case 'REMOVE_NUMBER':
      return { type: 'ADD_NUMBER', element: action.element };
    case 'UPDATE_NUMBER':
      return {
        type: 'UPDATE_NUMBER',
        id: action.id,
        previousValue: action.newValue,
        newValue: action.previousValue,
        layer: action.layer,
      };
    case 'ADD_SYMBOL':
      return { type: 'REMOVE_SYMBOL', id: action.element.id, element: action.element };
    case 'REMOVE_SYMBOL':
      return { type: 'ADD_SYMBOL', element: action.element };
    case 'ADD_CAGE':
      return { type: 'REMOVE_CAGE', id: action.element.id, element: action.element };
    case 'REMOVE_CAGE':
      return { type: 'ADD_CAGE', element: action.element };
    case 'ADD_SPECIAL':
      return { type: 'REMOVE_SPECIAL', id: action.element.id, element: action.element };
    case 'REMOVE_SPECIAL':
      return { type: 'ADD_SPECIAL', element: action.element };
    case 'SET_ACTIVE_LAYER':
      return {
        type: 'SET_ACTIVE_LAYER',
        layer: action.previousLayer,
        previousLayer: action.layer,
      };
    case 'CLEAR_LAYER':
      // Clear layer cannot be easily reversed without snapshot
      // This will be handled specially in history
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
  }
}

// ========================================
// Action Description (for UI display)
// ========================================

export function getActionDescription(action: PuzzleAction): string {
  switch (action.type) {
    case 'ADD_SURFACE':
      return 'Add surface';
    case 'REMOVE_SURFACE':
      return 'Remove surface';
    case 'ADD_LINE':
      return 'Add line';
    case 'REMOVE_LINE':
      return 'Remove line';
    case 'ADD_EDGE':
      return 'Add edge';
    case 'REMOVE_EDGE':
      return 'Remove edge';
    case 'ADD_WALL':
      return 'Add wall';
    case 'REMOVE_WALL':
      return 'Remove wall';
    case 'ADD_NUMBER':
      return 'Add number';
    case 'REMOVE_NUMBER':
      return 'Remove number';
    case 'UPDATE_NUMBER':
      return 'Update number';
    case 'ADD_SYMBOL':
      return 'Add symbol';
    case 'REMOVE_SYMBOL':
      return 'Remove symbol';
    case 'ADD_CAGE':
      return 'Add cage';
    case 'REMOVE_CAGE':
      return 'Remove cage';
    case 'ADD_SPECIAL':
      return 'Add special';
    case 'REMOVE_SPECIAL':
      return 'Remove special';
    case 'SET_ACTIVE_LAYER':
      return `Switch to ${action.layer} layer`;
    case 'CLEAR_LAYER':
      return `Clear ${action.layer} layer`;
    case 'SET_GRID':
      return 'Update grid settings';
    case 'BATCH':
      return action.description || `${action.actions.length} operations`;
  }
}
