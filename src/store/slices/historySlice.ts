/**
 * History Slice - Undo/Redo functionality
 */

import type { HistorySlice, SliceCreator, PuzzleStore } from './types';
import type { PuzzleAction } from '../actions';
import { createEmptyElements } from './types';

/**
 * Apply a PuzzleAction to state - used for undo/redo
 * Returns partial state update for Zustand set()
 */
export const applyActionToState = (
  state: PuzzleStore,
  action: PuzzleAction
): Partial<PuzzleStore> => {
  const normalizeLegacyLine = (element: any, fallbackTarget: 'edge' | 'wall') => {
    const lineTarget = element.lineTarget ?? fallbackTarget;
    const normalizedId = element.edgeId
      ? `${lineTarget}-${element.edgeId}`
      : element.id;
    return {
      lineTarget,
      id: normalizedId,
      element: normalizedId !== element.id ? { ...element, id: normalizedId, lineTarget } : { ...element, lineTarget },
    };
  };

  switch (action.type) {
    case 'ADD_SURFACE': {
      const layer = action.element.layer;
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            surfaces: {
              ...state.puzzle[layer].surfaces,
              [action.element.id]: action.element,
            },
          },
        },
      };
    }
    case 'REMOVE_SURFACE': {
      const layer = action.element.layer;
      const newSurfaces = { ...state.puzzle[layer].surfaces };
      delete newSurfaces[action.id];
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            surfaces: newSurfaces,
          },
        },
      };
    }
    case 'ADD_LINE': {
      const layer = action.element.layer;
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            lines: {
              ...state.puzzle[layer].lines,
              [action.element.id]: action.element,
            },
          },
        },
      };
    }
    case 'REMOVE_LINE': {
      const layer = action.element.layer;
      const newLines = { ...state.puzzle[layer].lines };
      delete newLines[action.id];
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            lines: newLines,
          },
        },
      };
    }
    case 'ADD_EDGE': {
      const layer = action.element.layer;
      const normalized = normalizeLegacyLine(action.element, 'edge');
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            lines: {
              ...state.puzzle[layer].lines,
              [normalized.id]: normalized.element,
            },
          },
        },
      };
    }
    case 'REMOVE_EDGE': {
      const layer = action.element.layer;
      const normalized = normalizeLegacyLine(action.element, 'edge');
      const newLines = { ...state.puzzle[layer].lines };
      delete newLines[normalized.id];
      if (action.id !== normalized.id) {
        delete newLines[action.id];
      }
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            lines: newLines,
          },
        },
      };
    }
    case 'ADD_WALL': {
      const layer = action.element.layer;
      const normalized = normalizeLegacyLine(action.element, 'wall');
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            lines: {
              ...state.puzzle[layer].lines,
              [normalized.id]: normalized.element,
            },
          },
        },
      };
    }
    case 'REMOVE_WALL': {
      const layer = action.element.layer;
      const normalized = normalizeLegacyLine(action.element, 'wall');
      const newLines = { ...state.puzzle[layer].lines };
      delete newLines[normalized.id];
      if (action.id !== normalized.id) {
        delete newLines[action.id];
      }
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            lines: newLines,
          },
        },
      };
    }
    case 'ADD_NUMBER': {
      const layer = action.element.layer;
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            numbers: {
              ...state.puzzle[layer].numbers,
              [action.element.id]: action.element,
            },
          },
        },
      };
    }
    case 'REMOVE_NUMBER': {
      const layer = action.element.layer;
      const newNumbers = { ...state.puzzle[layer].numbers };
      delete newNumbers[action.id];
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            numbers: newNumbers,
          },
        },
      };
    }
    case 'UPDATE_NUMBER': {
      const layer = action.layer;
      const existing = state.puzzle[layer].numbers[action.id];
      if (!existing) return {};
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            numbers: {
              ...state.puzzle[layer].numbers,
              [action.id]: { ...existing, value: action.newValue },
            },
          },
        },
      };
    }
    case 'ADD_SYMBOL': {
      const layer = action.element.layer;
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            symbols: {
              ...state.puzzle[layer].symbols,
              [action.element.id]: action.element,
            },
          },
        },
      };
    }
    case 'REMOVE_SYMBOL': {
      const layer = action.element.layer;
      const newSymbols = { ...state.puzzle[layer].symbols };
      delete newSymbols[action.id];
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            symbols: newSymbols,
          },
        },
      };
    }
    case 'ADD_CAGE': {
      const layer = action.element.layer;
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            cages: {
              ...state.puzzle[layer].cages,
              [action.element.id]: action.element,
            },
          },
        },
      };
    }
    case 'REMOVE_CAGE': {
      const layer = action.element.layer;
      const newCages = { ...state.puzzle[layer].cages };
      delete newCages[action.id];
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            cages: newCages,
          },
        },
      };
    }
    case 'ADD_SPECIAL': {
      const layer = action.element.layer;
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            specials: {
              ...state.puzzle[layer].specials,
              [action.element.id]: action.element,
            },
          },
        },
      };
    }
    case 'REMOVE_SPECIAL': {
      const layer = action.element.layer;
      const newSpecials = { ...state.puzzle[layer].specials };
      delete newSpecials[action.id];
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            specials: newSpecials,
          },
        },
      };
    }
    case 'SET_ACTIVE_LAYER':
      return { activeLayer: action.layer };
    case 'CLEAR_LAYER':
      return {
        puzzle: {
          ...state.puzzle,
          [action.layer]: createEmptyElements(),
        },
      };
    case 'EDIT_GRID_GEOMETRY':
      // Restore exact snapshots, including removal of optional geometry fields.
      return { grid: action.after.grid, topology: action.after.topology };
    case 'SET_GRID':
      return {
        grid: { ...state.grid, ...action.grid },
      };
    case 'BATCH': {
      // Apply all actions in sequence
      let result: Partial<PuzzleStore> = {};
      for (const subAction of action.actions) {
        const subResult = applyActionToState(
          { ...state, ...result } as PuzzleStore,
          subAction
        );
        result = { ...result, ...subResult };
      }
      return result;
    }
    default:
      return {};
  }
};

export const createHistorySlice: SliceCreator<HistorySlice> = (set, get) => ({
  undo: () => {
    const actions = get().historyManager.getUndoActions();
    if (actions.length === 0) return;

    actions.forEach((action) => {
      set((state) => applyActionToState(state, action));
    });
    get().historyManager.moveToUndo();
  },

  redo: () => {
    const actions = get().historyManager.getRedoActions();
    if (actions.length === 0) return;

    actions.forEach((action) => {
      set((state) => applyActionToState(state, action));
    });
    get().historyManager.moveToRedo();
  },

  canUndo: () => get().historyManager.canUndo(),

  canRedo: () => get().historyManager.canRedo(),

  startHistoryGroup: () => get().historyManager.startGroup(),

  endHistoryGroup: () => get().historyManager.endGroup(),
});
