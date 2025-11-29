/**
 * Puzzle Store - Zustand-based state management
 *
 * Fully integrated with ActionExecutor and HistoryManager patterns
 * based on crossword app architecture.
 */

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  LayerType,
  ToolType,
  ToolCategory,
  GridConfig,
  GridType,
  PuzzleState,
  PuzzleElements,
  CanvasState,
  ToolSettings,
  SurfaceElement,
  LineElement,
  EdgeElement,
  WallElement,
  NumberElement,
  SymbolElement,
  CageElement,
  SpecialElement,
} from '../types';

import { actionExecutor, type PuzzleStateSlice } from './actionExecutor';
import { historyManager } from './historyManager';
import {
  createAddSurfaceAction,
  createRemoveSurfaceAction,
  createAddLineAction,
  createRemoveLineAction,
  createAddEdgeAction,
  createRemoveEdgeAction,
  createAddWallAction,
  createRemoveWallAction,
  createAddNumberAction,
  createRemoveNumberAction,
  createUpdateNumberAction,
  createAddSymbolAction,
  createRemoveSymbolAction,
  createAddCageAction,
  createRemoveCageAction,
  createAddSpecialAction,
  createRemoveSpecialAction,
  type PuzzleAction,
} from './actions';

// ========================================
// Helper functions
// ========================================

const createEmptyElements = (): PuzzleElements => ({
  surfaces: {},
  lines: {},
  edges: {},
  walls: {},
  numbers: {},
  symbols: {},
  cages: {},
  specials: {},
  directionalClues: {},
});

const createEmptyState = (): PuzzleState => ({
  problem: createEmptyElements(),
  answer: createEmptyElements(),
});

/**
 * Apply a PuzzleAction to state - used for undo/redo
 * Returns partial state update for Zustand set()
 */
const applyActionToState = (state: PuzzleStore, action: PuzzleAction): Partial<PuzzleStore> => {
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
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            edges: {
              ...state.puzzle[layer].edges,
              [action.element.id]: action.element,
            },
          },
        },
      };
    }
    case 'REMOVE_EDGE': {
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
    }
    case 'ADD_WALL': {
      const layer = action.element.layer;
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            walls: {
              ...state.puzzle[layer].walls,
              [action.element.id]: action.element,
            },
          },
        },
      };
    }
    case 'REMOVE_WALL': {
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
    case 'SET_GRID':
      return {
        grid: { ...state.grid, ...action.grid },
      };
    case 'BATCH':
      // Apply all actions in sequence
      let result: Partial<PuzzleStore> = {};
      for (const subAction of action.actions) {
        const subResult = applyActionToState({ ...state, ...result } as PuzzleStore, subAction);
        result = { ...result, ...subResult };
      }
      return result;
    default:
      return {};
  }
};

// ========================================
// Store Interface
// ========================================

interface PuzzleStore {
  // Grid configuration
  grid: GridConfig;
  setGrid: (grid: Partial<GridConfig>) => void;

  // Puzzle state
  puzzle: PuzzleState;
  activeLayer: LayerType;
  setActiveLayer: (layer: LayerType) => void;

  // Tool settings
  toolSettings: ToolSettings;
  setToolSettings: (settings: Partial<ToolSettings>) => void;
  setTool: (tool: ToolType, category: ToolCategory) => void;

  // Canvas state
  canvas: CanvasState;
  setCanvasState: (state: Partial<CanvasState>) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;

  // Layer visibility
  showProblemLayer: boolean;
  showAnswerLayer: boolean;
  toggleProblemLayer: () => void;
  toggleAnswerLayer: () => void;

  // Element operations (via ActionExecutor)
  addSurface: (element: Omit<SurfaceElement, 'id'>) => string;
  removeSurface: (id: string) => void;
  addLine: (element: Omit<LineElement, 'id'>) => string;
  removeLine: (id: string) => void;
  addEdge: (element: Omit<EdgeElement, 'id'>) => string;
  removeEdge: (id: string) => void;
  addWall: (element: Omit<WallElement, 'id'>) => string;
  removeWall: (id: string) => void;
  addNumber: (element: Omit<NumberElement, 'id'>) => string;
  removeNumber: (id: string) => void;
  updateNumber: (id: string, value: string) => void;
  addSymbol: (element: Omit<SymbolElement, 'id'>) => string;
  removeSymbol: (id: string) => void;
  addCage: (element: Omit<CageElement, 'id'>) => string;
  removeCage: (id: string) => void;
  addSpecial: (element: Omit<SpecialElement, 'id'>) => string;
  removeSpecial: (id: string) => void;
  addDirectionalClue: (element: Omit<import('../types').PenpaDirectionalClue, 'id'>) => string;
  removeDirectionalClue: (id: string) => void;

  // Solution Area operations
  setSolutionArea: (cells: string[]) => void;
  toggleSolutionAreaCell: (cellId: string) => void;
  clearSolutionArea: () => void;
  enableSolutionArea: (enabled: boolean) => void;

  // Multicolor Surface operations
  setMulticolorSurface: (cellId: string, colors: number[], pattern?: 'cross' | 'x', customColors?: string[]) => void;
  removeMulticolorSurface: (cellId: string) => void;
  clearMulticolorSurfaces: () => void;

  // History (via HistoryManager)
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  startHistoryGroup: () => string;
  endHistoryGroup: () => void;

  // Clear operations
  clearLayer: (layer: LayerType) => void;
  clearAll: () => void;
  newPuzzle: (options?: { rows?: number; cols?: number; gridType?: GridType }) => void;

  // Selection
  selectedElements: string[];
  setSelection: (ids: string[]) => void;
  clearSelection: () => void;

  // Hover cursor (cell under mouse)
  hoverCell: { row: number; col: number } | null;
  setHoverCell: (cell: { row: number; col: number } | null) => void;

  // Number tool selection (cursor position for keyboard input)
  numberSelection: { row: number; col: number } | null;
  setNumberSelection: (cell: { row: number; col: number } | null) => void;

  // Grid mode (shows grid settings instead of tool options)
  isGridMode: boolean;
  setGridMode: (isGridMode: boolean) => void;

  // Grid cell enabled/disabled toggle
  toggleCellDisabled: (cellId: string) => void;
  setCellDisabled: (cellId: string, disabled: boolean) => void;

  // Export/Import
  exportPuzzle: () => string;
  importPuzzle: (json: string) => boolean;
}

// ========================================
// Store Creation
// ========================================

export const usePuzzleStore = create<PuzzleStore>((set, get) => {
  // Connect ActionExecutor to this store synchronously
  const mutator = (
    applyFn: (
      innerSet: (fn: (state: PuzzleStateSlice) => Partial<PuzzleStateSlice>) => void
    ) => void
  ) => {
    applyFn((fn) => {
      set((state) => {
        const slice: PuzzleStateSlice = {
          puzzle: state.puzzle,
          activeLayer: state.activeLayer,
          grid: state.grid,
        };
        const result = fn(slice);
        return result as Partial<PuzzleStore>;
      });
    });
  };
  // Initialize synchronously to ensure mutator is available immediately
  actionExecutor.setMutator(mutator);

  return {
    // Grid configuration
    grid: {
      rows: 10,
      cols: 10,
      cellSize: 40,
      outerPadding: 20,
      showGrid: true,
      gridStyle: 'normal',
      gridType: 'square',
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      frameStyle: 'normal',
      frameColor: '#000000',
      gridColor: '#000000',
      backgroundColor: '#ffffff',
    },

    setGrid: (gridUpdate) =>
      set((state) => ({
        grid: { ...state.grid, ...gridUpdate },
      })),

    // Puzzle state
    puzzle: createEmptyState(),
    activeLayer: 'problem',

    setActiveLayer: (layer) => set({ activeLayer: layer }),

    // Tool settings
    toolSettings: {
      currentTool: 'surface-fill',
      currentCategory: 'surface',
      color: '#000000',
      secondaryColor: '#CFCFCF',
      lineStyle: 'solid',
      lineThickness: 'normal',
      symbolSize: 'medium',
      numberSize: 'medium',
      symbolRotation: 0,
      numberPosition: 'center',
      cornerIndex: 0,
      sideIndex: 0,
      selectedCandidates: [],
      arrowDirection: 2, // Default: right (2)
      multicolorSlots: [1, 0, 0, 0], // Default: light grey + 3 transparent
      multicolorPattern: 'cross',    // Default: + pattern
      multicolorCustomColors: [],    // Custom colors array (user-added)
      multicolorSwatches: [],        // Saved pattern presets
      lineGridPoints: ['cell'],      // Default: cell centers
      lineDirections: ['orthogonal'], // Default: orthogonal only
      lineHalfMode: false,            // Default: don't allow cell-to-edge half lines
      symbolGridPoints: ['cell'],    // Default: cell centers only
    },

    setToolSettings: (settings) =>
      set((state) => ({
        toolSettings: { ...state.toolSettings, ...settings },
      })),

    setTool: (tool, category) =>
      set((state) => {
        const isNumberTool = tool.startsWith('number');
        const wasNumberTool = state.toolSettings.currentTool.startsWith('number');

        // When switching TO number tool and not already a number tool,
        // set default cursor to top-left cell (0, 0)
        const newNumberSelection = (isNumberTool && !wasNumberTool && !state.numberSelection)
          ? { row: 0, col: 0 }
          : state.numberSelection;

        return {
          toolSettings: {
            ...state.toolSettings,
            currentTool: tool,
            currentCategory: category,
          },
          numberSelection: newNumberSelection,
        };
      }),

    // Canvas state
    canvas: {
      zoom: 1,
      panX: 0,
      panY: 0,
      isDragging: false,
      isDrawing: false,
      selection: [],
    },

    setCanvasState: (canvasUpdate) =>
      set((state) => ({
        canvas: { ...state.canvas, ...canvasUpdate },
      })),

    setZoom: (zoom) =>
      set((state) => ({
        canvas: { ...state.canvas, zoom: Math.max(0.1, Math.min(5, zoom)) },
      })),

    setPan: (x, y) =>
      set((state) => ({
        canvas: { ...state.canvas, panX: x, panY: y },
      })),

    // Layer visibility
    showProblemLayer: true,
    showAnswerLayer: true,
    toggleProblemLayer: () =>
      set((state) => ({ showProblemLayer: !state.showProblemLayer })),
    toggleAnswerLayer: () =>
      set((state) => ({ showAnswerLayer: !state.showAnswerLayer })),

    // Element operations - Direct Zustand implementation for reliable re-rendering
    addSurface: (element) => {
      const id = uuidv4();
      const fullElement: SurfaceElement = { ...element, id };

      set((state) => {
        const layer = fullElement.layer;
        return {
          puzzle: {
            ...state.puzzle,
            [layer]: {
              ...state.puzzle[layer],
              surfaces: {
                ...state.puzzle[layer].surfaces,
                [id]: fullElement,
              },
            },
          },
        };
      });

      historyManager.addAction(createAddSurfaceAction(fullElement));
      return id;
    },

    removeSurface: (id) => {
      const state = get();
      const layer = state.activeLayer;
      const element = state.puzzle[layer].surfaces[id];
      if (element) {
        set((state) => {
          const newSurfaces = { ...state.puzzle[layer].surfaces };
          delete newSurfaces[id];
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

        historyManager.addAction(createRemoveSurfaceAction(id, element));
      }
    },

    addLine: (element) => {
      const id = uuidv4();
      const fullElement: LineElement = { ...element, id };
      set((state) => {
        const layer = fullElement.layer;
        return {
          puzzle: {
            ...state.puzzle,
            [layer]: {
              ...state.puzzle[layer],
              lines: {
                ...state.puzzle[layer].lines,
                [id]: fullElement,
              },
            },
          },
        };
      });
      historyManager.addAction(createAddLineAction(fullElement));
      return id;
    },

    removeLine: (id) => {
      const state = get();
      const layer = state.activeLayer;
      const element = state.puzzle[layer].lines[id];
      if (element) {
        set((state) => {
          const newLines = { ...state.puzzle[layer].lines };
          delete newLines[id];
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
        historyManager.addAction(createRemoveLineAction(id, element));
      }
    },

    addEdge: (element) => {
      const id = uuidv4();
      const fullElement: EdgeElement = { ...element, id };
      set((state) => {
        const layer = fullElement.layer;
        return {
          puzzle: {
            ...state.puzzle,
            [layer]: {
              ...state.puzzle[layer],
              edges: {
                ...state.puzzle[layer].edges,
                [id]: fullElement,
              },
            },
          },
        };
      });
      historyManager.addAction(createAddEdgeAction(fullElement));
      return id;
    },

    removeEdge: (id) => {
      const state = get();
      const layer = state.activeLayer;
      const element = state.puzzle[layer].edges[id];
      if (element) {
        set((state) => {
          const newEdges = { ...state.puzzle[layer].edges };
          delete newEdges[id];
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
        historyManager.addAction(createRemoveEdgeAction(id, element));
      }
    },

    addWall: (element) => {
      const id = uuidv4();
      const fullElement: WallElement = { ...element, id };
      set((state) => {
        const layer = fullElement.layer;
        return {
          puzzle: {
            ...state.puzzle,
            [layer]: {
              ...state.puzzle[layer],
              walls: {
                ...state.puzzle[layer].walls,
                [id]: fullElement,
              },
            },
          },
        };
      });
      historyManager.addAction(createAddWallAction(fullElement));
      return id;
    },

    removeWall: (id) => {
      const state = get();
      const layer = state.activeLayer;
      const element = state.puzzle[layer].walls[id];
      if (element) {
        set((state) => {
          const newWalls = { ...state.puzzle[layer].walls };
          delete newWalls[id];
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
        historyManager.addAction(createRemoveWallAction(id, element));
      }
    },

    addNumber: (element) => {
      const id = uuidv4();
      const fullElement: NumberElement = { ...element, id };
      set((state) => {
        const layer = fullElement.layer;
        return {
          puzzle: {
            ...state.puzzle,
            [layer]: {
              ...state.puzzle[layer],
              numbers: {
                ...state.puzzle[layer].numbers,
                [id]: fullElement,
              },
            },
          },
        };
      });
      historyManager.addAction(createAddNumberAction(fullElement));
      return id;
    },

    removeNumber: (id) => {
      const state = get();
      const layer = state.activeLayer;
      const element = state.puzzle[layer].numbers[id];
      if (element) {
        set((state) => {
          const newNumbers = { ...state.puzzle[layer].numbers };
          delete newNumbers[id];
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
        historyManager.addAction(createRemoveNumberAction(id, element));
      }
    },

    updateNumber: (id, value) => {
      const state = get();
      const layer = state.activeLayer;
      const element = state.puzzle[layer].numbers[id];
      if (element) {
        set((state) => ({
          puzzle: {
            ...state.puzzle,
            [layer]: {
              ...state.puzzle[layer],
              numbers: {
                ...state.puzzle[layer].numbers,
                [id]: { ...element, value },
              },
            },
          },
        }));
        historyManager.addAction(createUpdateNumberAction(id, element.value, value, layer));
      }
    },

    addSymbol: (element) => {
      const id = uuidv4();
      const fullElement: SymbolElement = { ...element, id };
      set((state) => {
        const layer = fullElement.layer;
        return {
          puzzle: {
            ...state.puzzle,
            [layer]: {
              ...state.puzzle[layer],
              symbols: {
                ...state.puzzle[layer].symbols,
                [id]: fullElement,
              },
            },
          },
        };
      });
      historyManager.addAction(createAddSymbolAction(fullElement));
      return id;
    },

    removeSymbol: (id) => {
      const state = get();
      const layer = state.activeLayer;
      const element = state.puzzle[layer].symbols[id];
      if (element) {
        set((state) => {
          const newSymbols = { ...state.puzzle[layer].symbols };
          delete newSymbols[id];
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
        historyManager.addAction(createRemoveSymbolAction(id, element));
      }
    },

    addCage: (element) => {
      const id = uuidv4();
      const fullElement: CageElement = { ...element, id };
      set((state) => {
        const layer = fullElement.layer;
        return {
          puzzle: {
            ...state.puzzle,
            [layer]: {
              ...state.puzzle[layer],
              cages: {
                ...state.puzzle[layer].cages,
                [id]: fullElement,
              },
            },
          },
        };
      });
      historyManager.addAction(createAddCageAction(fullElement));
      return id;
    },

    removeCage: (id) => {
      const state = get();
      const layer = state.activeLayer;
      const element = state.puzzle[layer].cages[id];
      if (element) {
        set((state) => {
          const newCages = { ...state.puzzle[layer].cages };
          delete newCages[id];
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
        historyManager.addAction(createRemoveCageAction(id, element));
      }
    },

    addSpecial: (element) => {
      const id = uuidv4();
      const fullElement: SpecialElement = { ...element, id };
      set((state) => {
        const layer = fullElement.layer;
        return {
          puzzle: {
            ...state.puzzle,
            [layer]: {
              ...state.puzzle[layer],
              specials: {
                ...state.puzzle[layer].specials,
                [id]: fullElement,
              },
            },
          },
        };
      });
      historyManager.addAction(createAddSpecialAction(fullElement));
      return id;
    },

    removeSpecial: (id) => {
      const state = get();
      const layer = state.activeLayer;
      const element = state.puzzle[layer].specials[id];
      if (element) {
        set((state) => {
          const newSpecials = { ...state.puzzle[layer].specials };
          delete newSpecials[id];
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
        historyManager.addAction(createRemoveSpecialAction(id, element));
      }
    },

    addDirectionalClue: (element) => {
      const id = uuidv4();
      const fullElement = { ...element, id };
      set((state) => {
        const layer = fullElement.layer;
        const clues = { ...(state.puzzle[layer].directionalClues || {}) };
        // enforce one clue per cell
        const existingEntry = Object.entries(clues).find(([, clue]) => clue.cell === fullElement.cell);
        if (existingEntry) {
          delete clues[existingEntry[0]];
        }
        clues[id] = fullElement;
        return {
          puzzle: {
            ...state.puzzle,
            [layer]: {
              ...state.puzzle[layer],
              directionalClues: clues,
            },
          },
        };
      });
      return id;
    },

    removeDirectionalClue: (id) => {
      set((state) => {
        const layer = state.activeLayer;
        const clues = { ...(state.puzzle[layer].directionalClues || {}) };
        delete clues[id];
        return {
          puzzle: {
            ...state.puzzle,
            [layer]: {
              ...state.puzzle[layer],
              directionalClues: clues,
            },
          },
        };
      });
    },

    // Solution Area operations
    setSolutionArea: (cells) => {
      set((state) => ({
        puzzle: {
          ...state.puzzle,
          solutionArea: {
            cells,
            enabled: true,
          },
        },
      }));
    },

    toggleSolutionAreaCell: (cellId) => {
      set((state) => {
        const currentCells = state.puzzle.solutionArea?.cells || [];
        const newCells = currentCells.includes(cellId)
          ? currentCells.filter((id) => id !== cellId)
          : [...currentCells, cellId];

        return {
          puzzle: {
            ...state.puzzle,
            solutionArea: {
              cells: newCells,
              enabled: state.puzzle.solutionArea?.enabled ?? true,
            },
          },
        };
      });
    },

    clearSolutionArea: () => {
      set((state) => ({
        puzzle: {
          ...state.puzzle,
          solutionArea: undefined,
        },
      }));
    },

    enableSolutionArea: (enabled) => {
      set((state) => ({
        puzzle: {
          ...state.puzzle,
          solutionArea: state.puzzle.solutionArea
            ? { ...state.puzzle.solutionArea, enabled }
            : { cells: [], enabled },
        },
      }));
    },

    // Multicolor Surface operations
    setMulticolorSurface: (cellId, colors, pattern = 'cross', customColors) => {
      set((state) => {
        const existing = state.puzzle.multicolorSurfaces || {};
        const existingEntry = Object.values(existing).find((e) => e.cellId === cellId);
        const id = existingEntry?.id || uuidv4();

        return {
          puzzle: {
            ...state.puzzle,
            multicolorSurfaces: {
              ...existing,
              [id]: {
                id,
                cellId,
                colors,
                pattern,
                customColors,
                layer: state.activeLayer,
              },
            },
          },
        };
      });
    },

    removeMulticolorSurface: (cellId) => {
      set((state) => {
        const existing = state.puzzle.multicolorSurfaces || {};
        const newSurfaces = { ...existing };

        for (const [id, surface] of Object.entries(newSurfaces)) {
          if (surface.cellId === cellId) {
            delete newSurfaces[id];
          }
        }

        return {
          puzzle: {
            ...state.puzzle,
            multicolorSurfaces: newSurfaces,
          },
        };
      });
    },

    clearMulticolorSurfaces: () => {
      set((state) => ({
        puzzle: {
          ...state.puzzle,
          multicolorSurfaces: undefined,
        },
      }));
    },

    // History via HistoryManager - Direct Zustand implementation
    undo: () => {
      const actions = historyManager.getUndoActions();
      if (actions.length === 0) return;

      actions.forEach((action) => {
        // Apply action directly without going through actionExecutor
        set((state) => applyActionToState(state, action));
      });
      historyManager.moveToUndo();
    },

    redo: () => {
      const actions = historyManager.getRedoActions();
      if (actions.length === 0) return;

      actions.forEach((action) => {
        // Apply action directly without going through actionExecutor
        set((state) => applyActionToState(state, action));
      });
      historyManager.moveToRedo();
    },

    canUndo: () => historyManager.canUndo(),

    canRedo: () => historyManager.canRedo(),

    startHistoryGroup: () => historyManager.startGroup(),

    endHistoryGroup: () => historyManager.endGroup(),

    // Clear operations
    clearLayer: (layer) => {
      set((state) => ({
        puzzle: {
          ...state.puzzle,
          [layer]: createEmptyElements(),
        },
      }));
      // Note: Clear is not added to history as it's typically a destructive action
      // that users wouldn't want to undo element-by-element
    },

    clearAll: () => {
      set({
        puzzle: createEmptyState(),
      });
      historyManager.clear();
    },

    newPuzzle: (options = {}) => {
      const { rows = 10, cols = 10, gridType = 'square' } = options;
      set({
        grid: {
          rows,
          cols,
          cellSize: 40,
          outerPadding: 20,
          showGrid: true,
          gridStyle: 'normal',
          gridType,
          marginTop: 0,
          marginBottom: 0,
          marginLeft: 0,
          marginRight: 0,
          frameStyle: 'normal',
          frameColor: '#000000',
          gridColor: '#000000',
          backgroundColor: '#ffffff',
        },
        puzzle: createEmptyState(),
        canvas: {
          zoom: 1,
          panX: 0,
          panY: 0,
          isDragging: false,
          isDrawing: false,
          selection: [],
        },
        selectedElements: [],
      });
      historyManager.clear();
    },

    // Selection
    selectedElements: [],
    setSelection: (ids) => set({ selectedElements: ids }),
    clearSelection: () => set({ selectedElements: [] }),

    // Hover cursor
    hoverCell: null,
    setHoverCell: (cell) => set({ hoverCell: cell }),

    // Number tool selection
    numberSelection: null,
    setNumberSelection: (cell) => set({ numberSelection: cell }),

    // Grid mode
    isGridMode: false,
    setGridMode: (isGridMode) => set({ isGridMode }),

    // Grid cell enabled/disabled toggle
    toggleCellDisabled: (cellId) =>
      set((state) => {
        const currentDisabled = state.grid.disabledCells || [];
        const isDisabled = currentDisabled.includes(cellId);
        const disabledCells = isDisabled
          ? currentDisabled.filter((id) => id !== cellId)
          : [...currentDisabled, cellId];
        return { grid: { ...state.grid, disabledCells } };
      }),

    setCellDisabled: (cellId, disabled) =>
      set((state) => {
        const currentDisabled = state.grid.disabledCells || [];
        const isDisabled = currentDisabled.includes(cellId);
        if (disabled && !isDisabled) {
          return { grid: { ...state.grid, disabledCells: [...currentDisabled, cellId] } };
        } else if (!disabled && isDisabled) {
          return { grid: { ...state.grid, disabledCells: currentDisabled.filter((id) => id !== cellId) } };
        }
        return state;
      }),

    // Export/Import
    exportPuzzle: () => {
      const state = get();
      const exportData = {
        version: '1.0.0',
        grid: state.grid,
        state: state.puzzle,
        metadata: {
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      };
      return JSON.stringify(exportData, null, 2);
    },

    importPuzzle: (json) => {
      try {
        const data = JSON.parse(json);
        if (data.version && data.grid && data.state) {
          set({
            grid: data.grid,
            puzzle: data.state,
          });
          historyManager.clear();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
  };
});
