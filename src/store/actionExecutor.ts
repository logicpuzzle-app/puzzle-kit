/**
 * Action Executor for PuzzleKit
 *
 * Based on crossword app's ActionExecutor pattern:
 * - Single point of mutation for puzzle state
 * - All state changes go through execute()
 * - Integrates with HistoryManager for undo/redo
 */

import type { PuzzleAction } from './actions';
import type { PuzzleElements, LayerType, GridConfig } from '../types';
import { historyManager } from './historyManager';

// ========================================
// Types
// ========================================

export interface PuzzleStateSlice {
  puzzle: {
    problem: PuzzleElements;
    answer: PuzzleElements;
  };
  activeLayer: LayerType;
  grid: GridConfig;
}

/**
 * StateMutator receives a callback that, when called with an updater function,
 * applies that updater to the store state.
 *
 * Usage in ActionExecutor:
 *   mutator((set) => {
 *     this.applyAction(action, set);
 *   });
 *
 * Where `set` is: (fn: (state: PuzzleStateSlice) => Partial<PuzzleStateSlice>) => void
 */
export type StateMutator = (
  applyFn: (
    set: (fn: (state: PuzzleStateSlice) => Partial<PuzzleStateSlice>) => void
  ) => void
) => void;

// ========================================
// Action Executor Class
// ========================================

export class ActionExecutor {
  private mutator: StateMutator | null = null;
  private recordHistory: boolean = true;

  /**
   * Set the state mutator (connected to Zustand store)
   */
  setMutator(mutator: StateMutator): void {
    this.mutator = mutator;
  }

  /**
   * Enable/disable history recording
   */
  setRecordHistory(record: boolean): void {
    this.recordHistory = record;
  }

  /**
   * Execute a single action
   */
  execute(action: PuzzleAction, addToHistory: boolean = true): void {
    if (!this.mutator) {
      console.warn('[ActionExecutor] No mutator set. Action not executed:', action.type);
      return;
    }

    // Execute the action
    this.mutator((set) => {
      this.applyAction(action, set);
    });

    // Add to history if enabled
    if (addToHistory && this.recordHistory) {
      historyManager.addAction(action);
    }
  }

  /**
   * Execute multiple actions as a batch
   */
  executeAll(actions: PuzzleAction[], addToHistory: boolean = true): void {
    if (!this.mutator || actions.length === 0) return;

    // Execute all actions in a single state update
    this.mutator((set) => {
      actions.forEach(action => this.applyAction(action, set));
    });

    // Add to history
    if (addToHistory && this.recordHistory) {
      actions.forEach(action => historyManager.addAction(action));
    }
  }

  /**
   * Execute action without recording to history
   * Used for undo/redo operations
   */
  executeWithoutHistory(action: PuzzleAction): void {
    this.execute(action, false);
  }

  /**
   * Execute multiple actions without recording to history
   */
  executeAllWithoutHistory(actions: PuzzleAction[]): void {
    this.executeAll(actions, false);
  }

  /**
   * Apply action to state (internal)
   */
  private applyAction(
    action: PuzzleAction,
    set: (fn: (state: PuzzleStateSlice) => Partial<PuzzleStateSlice>) => void
  ): void {
    switch (action.type) {
      case 'ADD_SURFACE':
        set((state) => ({
          puzzle: {
            ...state.puzzle,
            [action.element.layer]: {
              ...state.puzzle[action.element.layer],
              surfaces: {
                ...state.puzzle[action.element.layer].surfaces,
                [action.element.id]: action.element,
              },
            },
          },
        }));
        break;

      case 'REMOVE_SURFACE':
        set((state) => {
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
        });
        break;

      case 'ADD_LINE':
        set((state) => ({
          puzzle: {
            ...state.puzzle,
            [action.element.layer]: {
              ...state.puzzle[action.element.layer],
              lines: {
                ...state.puzzle[action.element.layer].lines,
                [action.element.id]: action.element,
              },
            },
          },
        }));
        break;

      case 'REMOVE_LINE':
        set((state) => {
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
        });
        break;

      case 'ADD_EDGE':
        set((state) => ({
          puzzle: {
            ...state.puzzle,
            [action.element.layer]: {
              ...state.puzzle[action.element.layer],
              edges: {
                ...state.puzzle[action.element.layer].edges,
                [action.element.id]: action.element,
              },
            },
          },
        }));
        break;

      case 'REMOVE_EDGE':
        set((state) => {
          const layer = action.element.layer;
          const newEdges = { ...state.puzzle[layer].edges };
          delete newEdges[action.id];
          return {
            puzzle: {
              ...state.puzzle,
              [layer]: {
                ...state.puzzle[layer],
                edges: newEdges,
              },
            },
          };
        });
        break;

      case 'ADD_WALL':
        set((state) => ({
          puzzle: {
            ...state.puzzle,
            [action.element.layer]: {
              ...state.puzzle[action.element.layer],
              walls: {
                ...state.puzzle[action.element.layer].walls,
                [action.element.id]: action.element,
              },
            },
          },
        }));
        break;

      case 'REMOVE_WALL':
        set((state) => {
          const layer = action.element.layer;
          const newWalls = { ...state.puzzle[layer].walls };
          delete newWalls[action.id];
          return {
            puzzle: {
              ...state.puzzle,
              [layer]: {
                ...state.puzzle[layer],
                walls: newWalls,
              },
            },
          };
        });
        break;

      case 'ADD_NUMBER':
        set((state) => ({
          puzzle: {
            ...state.puzzle,
            [action.element.layer]: {
              ...state.puzzle[action.element.layer],
              numbers: {
                ...state.puzzle[action.element.layer].numbers,
                [action.element.id]: action.element,
              },
            },
          },
        }));
        break;

      case 'REMOVE_NUMBER':
        set((state) => {
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
        });
        break;

      case 'UPDATE_NUMBER':
        set((state) => {
          const number = state.puzzle[action.layer].numbers[action.id];
          if (!number) return {};
          return {
            puzzle: {
              ...state.puzzle,
              [action.layer]: {
                ...state.puzzle[action.layer],
                numbers: {
                  ...state.puzzle[action.layer].numbers,
                  [action.id]: { ...number, value: action.newValue },
                },
              },
            },
          };
        });
        break;

      case 'ADD_SYMBOL':
        set((state) => ({
          puzzle: {
            ...state.puzzle,
            [action.element.layer]: {
              ...state.puzzle[action.element.layer],
              symbols: {
                ...state.puzzle[action.element.layer].symbols,
                [action.element.id]: action.element,
              },
            },
          },
        }));
        break;

      case 'REMOVE_SYMBOL':
        set((state) => {
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
        });
        break;

      case 'ADD_CAGE':
        set((state) => ({
          puzzle: {
            ...state.puzzle,
            [action.element.layer]: {
              ...state.puzzle[action.element.layer],
              cages: {
                ...state.puzzle[action.element.layer].cages,
                [action.element.id]: action.element,
              },
            },
          },
        }));
        break;

      case 'REMOVE_CAGE':
        set((state) => {
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
        });
        break;

      case 'ADD_SPECIAL':
        set((state) => ({
          puzzle: {
            ...state.puzzle,
            [action.element.layer]: {
              ...state.puzzle[action.element.layer],
              specials: {
                ...state.puzzle[action.element.layer].specials,
                [action.element.id]: action.element,
              },
            },
          },
        }));
        break;

      case 'REMOVE_SPECIAL':
        set((state) => {
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
        });
        break;

      case 'SET_ACTIVE_LAYER':
        set(() => ({
          activeLayer: action.layer,
        }));
        break;

      case 'CLEAR_LAYER':
        set((state) => ({
          puzzle: {
            ...state.puzzle,
            [action.layer]: {
              surfaces: {},
              lines: {},
              edges: {},
              walls: {},
              numbers: {},
              symbols: {},
              cages: {},
              specials: {},
            },
          },
        }));
        break;

      case 'SET_GRID':
        set((state) => ({
          grid: { ...state.grid, ...action.grid },
        }));
        break;

      case 'BATCH':
        action.actions.forEach(subAction => this.applyAction(subAction, set));
        break;
    }
  }
}

// Singleton instance
export const actionExecutor = new ActionExecutor();
