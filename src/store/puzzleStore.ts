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
  BoxLineElement,
} from '../types';
import {
  gridConfigToTopology,
  applyTopologyPreset,
  resizeTopology,
  type GridTopology,
  type TopologyPreset,
  type ResizeDirection,
} from '../utils/gridTopology';
import {
  normalizeSegmentEndpoints,
  generateLineId,
} from '../utils/lineNormalization';

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
  boxLines: {},
  directionalClues: {},
});

const createEmptyState = (): PuzzleState => ({
  problem: createEmptyElements(),
  answer: createEmptyElements(),
});

const DEFAULT_TOOL_SETTINGS: ToolSettings = {
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
};

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
  showConstraintLayer: boolean;
  toggleProblemLayer: () => void;
  toggleAnswerLayer: () => void;
  toggleConstraintLayer: () => void;

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
  addBoxLine: (element: Omit<BoxLineElement, 'id'>) => string;
  removeBoxLine: (id: string) => void;
  updateBoxLine: (id: string, cells: string[]) => void;
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
  newPuzzle: (options?: { rows?: number; cols?: number; gridType?: GridType; cellSize?: number }) => void;

  // Selection
  selectedElements: string[];
  setSelection: (ids: string[]) => void;
  clearSelection: () => void;

  // Hover cursor (cell under mouse) - cellId string for all grid types
  hoverCell: string | null;
  setHoverCell: (cellId: string | null) => void;

  // Number tool selection (cursor position for keyboard input)
  numberSelection: { row: number; col: number } | null;
  setNumberSelection: (cell: { row: number; col: number } | null) => void;

  // Grid mode (shows grid settings instead of tool options)
  isGridMode: boolean;
  setGridMode: (isGridMode: boolean) => void;
  gridSubTab: 'shape' | 'display';
  setGridSubTab: (tab: 'shape' | 'display') => void;
  gridEditMode: 'preset' | 'merge' | 'split' | 'exclude';
  setGridEditMode: (mode: 'preset' | 'merge' | 'split' | 'exclude') => void;

  // Topology mode (use GridTopology for deformed grids)
  useTopology: boolean;
  setUseTopology: (useTopology: boolean) => void;
  topology: import('../utils/gridTopology').GridTopology | null;
  updateTopology: () => void;

  // Topology preset
  topologyPreset: TopologyPreset;
  topologyIntensity: number;
  setTopologyPreset: (preset: TopologyPreset) => void;
  setTopologyIntensity: (intensity: number) => void;
  applyTopologyPreset: () => void;

  // Preview topology (for previewing grid changes before applying)
  previewTopology: import('../utils/gridTopology').GridTopology | null;
  previewGrid: GridConfig | null;
  setPreviewGrid: (config: { gridType: import('../types').GridType; rows: number; cols: number; cellSize?: number } | null) => void;

  // Show adjacency lines between cell centers
  showAdjacency: boolean;
  setShowAdjacency: (show: boolean) => void;

  // Grid cell enabled/disabled toggle
  toggleCellDisabled: (cellId: string) => void;
  setCellDisabled: (cellId: string, disabled: boolean) => void;

  // Merge cells
  mergeCells: (cellIds: string[]) => void;
  unmergeCells: (cellIds: string[]) => void;

  // Grid resize (works with topology mode)
  resizeGrid: (newConfig: Partial<GridConfig>) => void;

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
      set((state) => {
        const newGrid = { ...state.grid, ...gridUpdate };
        let newTopology = state.topology;
        if (state.useTopology) {
          const base = gridConfigToTopology(newGrid);
          newTopology = applyTopologyPreset(base, {
            preset: state.topologyPreset,
            intensity: state.topologyIntensity,
          });
        }
        return {
          grid: newGrid,
          topology: newTopology,
        };
      }),

    // Puzzle state
    puzzle: createEmptyState(),
    activeLayer: 'problem',

  setActiveLayer: (layer) => set({ activeLayer: layer }),

  // Tool settings
  toolSettings: { ...DEFAULT_TOOL_SETTINGS },

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
    showConstraintLayer: false, // Default: OFF
    toggleProblemLayer: () =>
      set((state) => ({ showProblemLayer: !state.showProblemLayer })),
    toggleAnswerLayer: () =>
      set((state) => ({ showAnswerLayer: !state.showAnswerLayer })),
    toggleConstraintLayer: () =>
      set((state) => ({ showConstraintLayer: !state.showConstraintLayer })),

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
      // For freehand lines, use UUID; for grid-snapped lines, use normalized ID
      let id: string;
      let normalizedElement: LineElement;

      if (element.isFree) {
        // Freehand lines: use UUID (multiple segments form a stroke via strokeId)
        id = uuidv4();
        normalizedElement = { ...element, id };
      } else {
        // Grid-snapped lines: normalize endpoints and generate deterministic ID
        const [normFrom, normTo] = normalizeSegmentEndpoints(element.from, element.to);
        id = generateLineId(normFrom, normTo);
        normalizedElement = { ...element, id, from: normFrom, to: normTo };

        // Check if line with this ID already exists in this layer
        const state = get();
        if (state.puzzle[element.layer].lines[id]) {
          // Line already exists - return existing ID without adding duplicate
          return id;
        }
      }

      set((state) => {
        const layer = normalizedElement.layer;
        return {
          puzzle: {
            ...state.puzzle,
            [layer]: {
              ...state.puzzle[layer],
              lines: {
                ...state.puzzle[layer].lines,
                [id]: normalizedElement,
              },
            },
          },
        };
      });
      historyManager.addAction(createAddLineAction(normalizedElement));
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

    addBoxLine: (element) => {
      const id = uuidv4();
      const fullElement: BoxLineElement = { ...element, id };
      set((state) => {
        const layer = fullElement.layer;
        return {
          puzzle: {
            ...state.puzzle,
            [layer]: {
              ...state.puzzle[layer],
              boxLines: {
                ...state.puzzle[layer].boxLines,
                [id]: fullElement,
              },
            },
          },
        };
      });
      // Note: BoxLine doesn't use history for now (similar to directionalClues)
      return id;
    },

    removeBoxLine: (id) => {
      const state = get();
      const layer = state.activeLayer;
      const boxLines = state.puzzle[layer].boxLines || {};
      if (boxLines[id]) {
        set((state) => {
          const newBoxLines = { ...state.puzzle[layer].boxLines };
          delete newBoxLines[id];
          return {
            puzzle: {
              ...state.puzzle,
              [layer]: {
                ...state.puzzle[layer],
                boxLines: newBoxLines,
              },
            },
          };
        });
      }
    },

    updateBoxLine: (id, cells) => {
      const state = get();
      const layer = state.activeLayer;
      const boxLines = state.puzzle[layer].boxLines || {};
      const element = boxLines[id];
      if (element) {
        set((state) => ({
          puzzle: {
            ...state.puzzle,
            [layer]: {
              ...state.puzzle[layer],
              boxLines: {
                ...state.puzzle[layer].boxLines,
                [id]: { ...element, cells },
              },
            },
          },
        }));
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
      const {
        rows = 10,
        cols = 10,
        gridType = 'square',
        cellSize = 40,
      } = options;

      const baseGrid: GridConfig = {
        rows,
        cols,
        cellSize,
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
      };

      const baseTopology = gridConfigToTopology(baseGrid);
      const state = get();
      const topology = state.useTopology
        ? applyTopologyPreset(baseTopology, {
            preset: state.topologyPreset,
            intensity: state.topologyIntensity,
          })
        : null;

      set({
        grid: baseGrid,
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
        hoverCell: null,
        numberSelection: null,
        toolSettings: { ...DEFAULT_TOOL_SETTINGS },
        activeLayer: 'problem',
        isGridMode: true,
        topology,
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
    isGridMode: true,
    setGridMode: (isGridMode) => set({ isGridMode }),
    gridSubTab: 'shape' as const,
    setGridSubTab: (tab) => set({ gridSubTab: tab }),
    gridEditMode: 'preset' as const,
    setGridEditMode: (mode) => set({ gridEditMode: mode }),

    // Topology mode (always enabled, Standard mode removed)
    useTopology: true,
    setUseTopology: (useTopology) => {
      set({ useTopology });
      // Update topology when enabling
      if (useTopology) {
        get().applyTopologyPreset();
      }
    },
    // Initialize topology based on default grid
    topology: (() => {
      const defaultGrid: GridConfig = {
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
      };
      const baseTopology = gridConfigToTopology(defaultGrid);
      return applyTopologyPreset(baseTopology, { preset: 'square', intensity: 0.5 });
    })(),
    updateTopology: () => {
      const state = get();
      if (state.useTopology) {
        get().applyTopologyPreset();
      }
    },

    // Topology preset
    topologyPreset: 'square' as TopologyPreset,
    topologyIntensity: 0.5,
    setTopologyPreset: (preset) => set({ topologyPreset: preset }),
    setTopologyIntensity: (intensity) => set({ topologyIntensity: intensity }),
    applyTopologyPreset: () => {
      const state = get();
      // Create topology based on grid type (square, triangle, hex, etc.)
      const baseTopology = gridConfigToTopology(state.grid);
      // Then apply the preset transformation (deformation effect)
      const transformedTopology = applyTopologyPreset(baseTopology, {
        preset: state.topologyPreset,
        intensity: state.topologyIntensity,
      });
      set({ topology: transformedTopology });
    },

    // Preview topology (for previewing grid changes before applying)
    previewTopology: null,
    previewGrid: null,
    setPreviewGrid: (config) => {
      if (config === null) {
        // Clear preview
        set({ previewTopology: null, previewGrid: null });
      } else {
        // Generate preview topology
        const state = get();
        const previewGridConfig: GridConfig = {
          ...state.grid,
          gridType: config.gridType,
          rows: config.rows,
          cols: config.cols,
          cellSize: config.cellSize ?? state.grid.cellSize,
        };
        const baseTopology = gridConfigToTopology(previewGridConfig);
        const previewTopo = applyTopologyPreset(baseTopology, {
          preset: state.topologyPreset,
          intensity: state.topologyIntensity,
        });
        set({ previewTopology: previewTopo, previewGrid: previewGridConfig });
      }
    },

    // Show adjacency lines
    showAdjacency: false,
    setShowAdjacency: (show) => set({ showAdjacency: show }),

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

    // Merge cells - combine multiple cells into one merged cell
    mergeCells: (cellIds) =>
      set((state) => {
        if (cellIds.length < 2) return state;

        const currentMerged = state.grid.mergedCells || [];

        // Check if any of these cells are already part of a merged group
        const existingGroupIndices: number[] = [];
        cellIds.forEach((cellId) => {
          currentMerged.forEach((group, idx) => {
            if (group.includes(cellId) && !existingGroupIndices.includes(idx)) {
              existingGroupIndices.push(idx);
            }
          });
        });

        // Combine all cells from existing groups with new cells
        let allCells = [...cellIds];
        existingGroupIndices.forEach((idx) => {
          allCells = [...allCells, ...currentMerged[idx]];
        });
        // Remove duplicates
        allCells = [...new Set(allCells)];

        // Remove old groups and add new combined group
        const newMerged = currentMerged.filter((_, idx) => !existingGroupIndices.includes(idx));
        newMerged.push(allCells);

        const grid = { ...state.grid, mergedCells: newMerged };
        let topology = state.topology;
        if (state.useTopology) {
          const base = gridConfigToTopology(grid);
          topology = applyTopologyPreset(base, {
            preset: state.topologyPreset,
            intensity: state.topologyIntensity,
          });
        }
        return { grid, topology };
      }),

    // Unmerge cells - remove cells from merged groups
    unmergeCells: (cellIds) =>
      set((state) => {
        const currentMerged = state.grid.mergedCells || [];
        if (currentMerged.length === 0) return state;

        // Find groups containing any of these cells and split them
        const newMerged = currentMerged
          .map((group) => group.filter((id) => !cellIds.includes(id)))
          .filter((group) => group.length >= 2); // Remove groups with less than 2 cells

        const grid = { ...state.grid, mergedCells: newMerged.length > 0 ? newMerged : undefined };
        let topology = state.topology;
        if (state.useTopology) {
          const base = gridConfigToTopology(grid);
          topology = applyTopologyPreset(base, {
            preset: state.topologyPreset,
            intensity: state.topologyIntensity,
          });
        }
        return { grid, topology };
      }),

    // Grid resize (works with topology mode)
    resizeGrid: (configChanges) => {
      const state = get();
      const oldConfig = state.grid;
      const newConfig: GridConfig = {
        ...oldConfig,
        ...configChanges,
      };

      // If using topology, use resizeTopology to get cell mapping
      if (state.useTopology && state.topology) {
        const resizeResult = resizeTopology(state.topology, oldConfig, newConfig);

        // Remove elements on removed cells
        const removedCellSet = new Set(resizeResult.removedCells);

        // Helper to check if cellId refers to a removed cell
        const isCellRemoved = (cellId: string): boolean => {
          // cellId is in format "r-c", convert to topology cell ID format "cell-r-c"
          const topologyCellId = `cell-${cellId}`;
          return removedCellSet.has(topologyCellId);
        };

        // Helper to filter out elements on removed cells
        const filterElements = <T extends Record<string, unknown>>(
          elements: T
        ): T => {
          const filtered = {} as T;
          for (const [key, value] of Object.entries(elements)) {
            if (!value || typeof value !== 'object') {
              (filtered as Record<string, unknown>)[key] = value;
              continue;
            }

            const elem = value as Record<string, unknown>;
            let shouldKeep = true;

            // Check cellId property (surfaces, numbers, symbols)
            if ('cellId' in elem && typeof elem.cellId === 'string') {
              if (isCellRemoved(elem.cellId)) {
                shouldKeep = false;
              }
            }

            // Check from/to properties (lines, edges)
            if ('from' in elem && typeof elem.from === 'string') {
              // from/to might be cell references or vertex references
              const fromParts = elem.from.split('-');
              if (fromParts.length >= 2) {
                const cellId = `${fromParts[0]}-${fromParts[1]}`;
                if (isCellRemoved(cellId)) {
                  shouldKeep = false;
                }
              }
            }

            // Check position property (walls)
            if ('position' in elem && typeof elem.position === 'string') {
              const pos = elem.position;
              // Wall position format varies, check if it contains removed cell reference
              const parts = pos.split('-');
              if (parts.length >= 2) {
                const cellId = `${parts[0]}-${parts[1]}`;
                if (isCellRemoved(cellId)) {
                  shouldKeep = false;
                }
              }
            }

            if (shouldKeep) {
              (filtered as Record<string, unknown>)[key] = value;
            }
          }
          return filtered;
        };

        // Filter elements in both layers
        const newPuzzle: PuzzleState = {
          problem: {
            surfaces: filterElements(state.puzzle.problem.surfaces || {}) as Record<string, SurfaceElement>,
            lines: filterElements(state.puzzle.problem.lines || {}) as Record<string, LineElement>,
            edges: filterElements(state.puzzle.problem.edges || {}) as Record<string, EdgeElement>,
            walls: filterElements(state.puzzle.problem.walls || {}) as Record<string, WallElement>,
            numbers: filterElements(state.puzzle.problem.numbers || {}) as Record<string, NumberElement>,
            symbols: filterElements(state.puzzle.problem.symbols || {}) as Record<string, SymbolElement>,
            cages: state.puzzle.problem.cages || {},
            specials: state.puzzle.problem.specials || {},
            boxLines: state.puzzle.problem.boxLines || {},
            directionalClues: filterElements(state.puzzle.problem.directionalClues || {}),
          },
          answer: {
            surfaces: filterElements(state.puzzle.answer.surfaces || {}) as Record<string, SurfaceElement>,
            lines: filterElements(state.puzzle.answer.lines || {}) as Record<string, LineElement>,
            edges: filterElements(state.puzzle.answer.edges || {}) as Record<string, EdgeElement>,
            walls: filterElements(state.puzzle.answer.walls || {}) as Record<string, WallElement>,
            numbers: filterElements(state.puzzle.answer.numbers || {}) as Record<string, NumberElement>,
            symbols: filterElements(state.puzzle.answer.symbols || {}) as Record<string, SymbolElement>,
            cages: state.puzzle.answer.cages || {},
            specials: state.puzzle.answer.specials || {},
            boxLines: state.puzzle.answer.boxLines || {},
            directionalClues: filterElements(state.puzzle.answer.directionalClues || {}),
          },
          // Filter multicolor surfaces at PuzzleState level
          multicolorSurfaces: filterElements(state.puzzle.multicolorSurfaces || {}),
        };

        // Update disabled cells - remove any that are now out of bounds
        const newDisabledCells = (oldConfig.disabledCells || []).filter(
          (cellId) => !removedCellSet.has(cellId)
        );

        // Apply preset to new topology
        const transformedTopology = applyTopologyPreset(resizeResult.topology, {
          preset: state.topologyPreset,
          intensity: state.topologyIntensity,
        });

        set({
          grid: { ...newConfig, disabledCells: newDisabledCells },
          puzzle: newPuzzle,
          topology: transformedTopology,
        });
      } else if (state.useTopology) {
        // Topology mode but no existing topology - create new one
        const newTopology = gridConfigToTopology(newConfig);
        const transformedTopology = applyTopologyPreset(newTopology, {
          preset: state.topologyPreset,
          intensity: state.topologyIntensity,
        });
        set({
          grid: newConfig,
          topology: transformedTopology,
        });
      } else {
        // Simple resize without topology - just update grid
        set({ grid: newConfig });
      }

      // Clear history after resize
      historyManager.clear();
    },

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
