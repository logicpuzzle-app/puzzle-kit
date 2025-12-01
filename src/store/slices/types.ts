/**
 * Shared types for store slices
 */

import type { StateCreator } from 'zustand';
import type {
  LayerType,
  ToolType,
  ToolCategory,
  GridConfig,
  PuzzleState,
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
  PuzzleElements,
} from '../../types';
import type { GridTopology, TopologyPreset } from '../../utils/gridTopology';

// Re-export PuzzleStateSlice from actionExecutor for backward compatibility
export type { PuzzleStateSlice } from '../actionExecutor';

// ========================================
// Helper functions (shared across slices)
// ========================================

export const createEmptyElements = (): PuzzleElements => ({
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

export const createEmptyState = (): PuzzleState => ({
  problem: createEmptyElements(),
  answer: createEmptyElements(),
});

export const DEFAULT_TOOL_SETTINGS: ToolSettings = {
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
  arrowDirection: 2,
  multicolorSlots: [1, 0, 0, 0],
  multicolorPattern: 'cross',
  multicolorCustomColors: [],
  multicolorSwatches: [],
  lineGridPoints: ['cell'],
  lineDirections: ['orthogonal'],
  lineHalfMode: false,
  symbolGridPoints: ['cell'],
};

// ========================================
// Slice Interfaces
// ========================================

export interface GridSlice {
  grid: GridConfig;
  setGrid: (grid: Partial<GridConfig>) => void;

  // Topology mode
  useTopology: boolean;
  setUseTopology: (useTopology: boolean) => void;
  topology: GridTopology | null;
  updateTopology: () => void;

  // Topology preset
  topologyPreset: TopologyPreset;
  topologyIntensity: number;
  setTopologyPreset: (preset: TopologyPreset) => void;
  setTopologyIntensity: (intensity: number) => void;
  applyTopologyPreset: () => void;

  // Preview topology
  previewTopology: GridTopology | null;
  previewGrid: GridConfig | null;
  setPreviewGrid: (config: {
    gridType: import('../../types').GridType;
    rows: number;
    cols: number;
    cellSize?: number;
    level?: number;
    isometricFaces?: import('../../types').IsometricFace[];
    isometricView?: import('../../types').IsometricView;
  } | null) => void;

  // Show adjacency lines
  showAdjacency: boolean;
  setShowAdjacency: (show: boolean) => void;

  // Grid cell enabled/disabled
  toggleCellDisabled: (cellId: string) => void;
  setCellDisabled: (cellId: string, disabled: boolean) => void;

  // Sculpt mode
  sculptRotateCluster: (vertexId: string) => void;

  // Merge/Split cells
  mergeCells: (cellIds: string[]) => void;
  unmergeCells: (cellIds: string[]) => void;
  addSplitLine: (cellId: string, startVertexId: string, endVertexId: string) => void;
  removeSplitLine: (cellId: string) => void;
  clearSplitLines: () => void;

  // Grid resize
  resizeGrid: (newConfig: Partial<GridConfig>) => void;
}

export interface ElementsSlice {
  puzzle: PuzzleState;

  // Element operations
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
  addDirectionalClue: (element: Omit<import('../../types').PenpaDirectionalClue, 'id'>) => string;
  removeDirectionalClue: (id: string) => void;

  // Clear operations
  clearLayer: (layer: LayerType) => void;
  clearAll: () => void;
}

export interface CanvasSlice {
  canvas: CanvasState;
  setCanvasState: (state: Partial<CanvasState>) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setPanMode: (enabled: boolean) => void;

  // Selection
  selectedElements: string[];
  setSelection: (ids: string[]) => void;
  clearSelection: () => void;

  // Hover cursor
  hoverCell: string | null;
  setHoverCell: (cellId: string | null) => void;

  // Number tool selection
  numberSelection: { row: number; col: number } | null;
  setNumberSelection: (cell: { row: number; col: number } | null) => void;
}

export interface ToolSlice {
  toolSettings: ToolSettings;
  setToolSettings: (settings: Partial<ToolSettings>) => void;
  setTool: (tool: ToolType, category: ToolCategory) => void;

  // Grid mode
  isGridMode: boolean;
  setGridMode: (isGridMode: boolean) => void;
  gridSubTab: 'shape' | 'display';
  setGridSubTab: (tab: 'shape' | 'display') => void;
  gridEditMode: 'preset' | 'merge' | 'split' | 'exclude' | 'sculpt';
  setGridEditMode: (mode: 'preset' | 'merge' | 'split' | 'exclude' | 'sculpt') => void;
}

export interface LayerSlice {
  activeLayer: LayerType;
  setActiveLayer: (layer: LayerType) => void;

  // Layer visibility
  showProblemLayer: boolean;
  showAnswerLayer: boolean;
  showConstraintLayer: boolean;
  toggleProblemLayer: () => void;
  toggleAnswerLayer: () => void;
  toggleConstraintLayer: () => void;
}

export interface SolutionSlice {
  // Solution Area operations
  setSolutionArea: (cells: string[]) => void;
  toggleSolutionAreaCell: (cellId: string) => void;
  clearSolutionArea: () => void;
  enableSolutionArea: (enabled: boolean) => void;

  // Multicolor Surface operations
  setMulticolorSurface: (cellId: string, colors: number[], pattern?: 'cross' | 'x', customColors?: string[]) => void;
  removeMulticolorSurface: (cellId: string) => void;
  clearMulticolorSurfaces: () => void;
}

export interface HistorySlice {
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  startHistoryGroup: () => string;
  endHistoryGroup: () => void;
}

export interface PuzzleIOSlice {
  newPuzzle: (options?: {
    rows?: number;
    cols?: number;
    gridType?: import('../../types').GridType;
    cellSize?: number;
    level?: number;
    isometricFaces?: import('../../types').IsometricFace[];
    isometricView?: import('../../types').IsometricView;
  }) => void;
  exportPuzzle: () => string;
  importPuzzle: (json: string) => boolean;
}

// Combined store type
export type PuzzleStore = GridSlice &
  ElementsSlice &
  CanvasSlice &
  ToolSlice &
  LayerSlice &
  SolutionSlice &
  HistorySlice &
  PuzzleIOSlice;

// Slice creator type
export type SliceCreator<T> = StateCreator<PuzzleStore, [], [], T>;
