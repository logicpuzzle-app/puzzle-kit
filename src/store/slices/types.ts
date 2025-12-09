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
  symbolRotation: 0,  // Default to up (0° = up)
  numberPosition: 'center',
  cornerIndex: 0,
  sideIndex: 0,
  selectedCandidates: [],
  arrowDirection: -1, // -1 = no direction (default), 0=up, 1=left, 2=right, 3=down
  arrowAngle: null as number | null, // Arbitrary angle in degrees (null = use arrowDirection)
  multicolorSlots: [1, 0, 0, 0],
  multicolorPattern: 'cross',
  multicolorCustomColors: [],
  multicolorSwatches: [],
  lineGridPoints: ['cell'],
  lineDirections: ['orthogonal'],
  lineHalfMode: false,
  symbolGridPoints: ['cell'],
  symbolSubMode: 'icon',  // Default to icon mode (symbol palette)
  surfaceButtonMode: '2-button',  // Default to 2-button (left=shade, right=unshade)
  inputConstraint: 'none',  // Default to no input constraint
  multiDirections: [true, true, true, true, true, true, true, true],  // All directions enabled by default
  multiDirectionAngles: [0, 45, 90, 135, 180, 225, 270, 315],  // Default 8-way angles (0=up, clockwise)
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
  setCellDisabled: (cellId: string, disabled: boolean, skipTopologyRegeneration?: boolean) => void;

  // Sculpt mode
  sculptMode: 'rotate' | 'cut';
  setSculptMode: (mode: 'rotate' | 'cut') => void;
  sculptRotateCluster: (vertexId: string) => void;
  sculptCutCluster: (vertexId: string) => void;

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
  updateLine: (id: string, updates: Partial<Pick<LineElement, 'color' | 'style' | 'thickness'>>) => void;
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

  // Room map (for Heyawake, etc.)
  setRoomMap: (roomMap: import('../../types').RoomMap) => void;
  clearRoomMap: () => void;

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

  // Cursor cell (last tapped cell for direction/multicolor panels)
  cursorCell: string | null;
  setCursorCell: (cellId: string | null) => void;

  // Number tool selection
  numberSelection: { row: number; col: number } | null;
  setNumberSelection: (cell: { row: number; col: number } | null) => void;

  // Highlighted lines (for preview in line list)
  highlightedLineIds: string[];
  setHighlightedLineIds: (ids: string[]) => void;
}

export interface ToolSlice {
  toolSettings: ToolSettings;
  setToolSettings: (settings: Partial<ToolSettings>) => void;
  setTool: (tool: ToolType, category: ToolCategory) => void;

  // Grid mode subtabs (only used when activeLayer === 'grid')
  gridSubTab: 'shape' | 'display';
  setGridSubTab: (tab: 'shape' | 'display') => void;
  gridEditMode: 'preset' | 'merge' | 'split' | 'exclude' | 'sculpt';
  setGridEditMode: (mode: 'preset' | 'merge' | 'split' | 'exclude' | 'sculpt') => void;

  // Saved tool settings for normal mode (separate from constraint mode)
  savedNormalToolSettings: {
    problem: { tool: ToolType; category: ToolCategory };
    answer: { tool: ToolType; category: ToolCategory };
  };
  setSavedNormalToolSettings: (layer: 'problem' | 'answer', tool: ToolType, category: ToolCategory) => void;

  // UI panels
  isPropertiesPanelOpen: boolean;
  setPropertiesPanelOpen: (open: boolean) => void;
  togglePropertiesPanel: () => void;
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

// Constraint layer sub-categories: common (共通), edit (編集設定), play (プレイ設定), check (チェック設定)
export type ConstraintSubCategory = 'common' | 'edit' | 'play' | 'check';

// pzprjs-style input modes
export type InputModeType =
  | 'auto'
  | 'number'
  | 'number-'
  | 'clear'
  | 'line'
  | 'peke'
  | 'shade'
  | 'unshade'
  | 'border'
  | 'subline'
  | 'bgcolor'
  | 'bgcolor1'
  | 'bgcolor2'
  | 'subcircle'
  | 'subcross'
  | 'circle-unshade'
  | 'circle-shade'
  | 'arrow'
  | 'direc'
  | 'bar'
  | 'empty'
  | 'ice'
  | 'crossdot'
  | 'objblank'
  | 'info-line'
  | 'info-blk'
  | 'info-ublk'
  | 'info-room';

// Validation result type (from validators)
export interface ValidationResultState {
  complete: boolean;
  undecided: boolean;
  errors: {
    ruleId: string;
    failcode: string;
    messageKey: string;
    elements?: string[];
  }[];
}

export interface ConstraintSlice {
  // Current puzzle schema ID (null = no preset selected)
  currentSchemaId: string | null;
  setCurrentSchemaId: (schemaId: string | null) => void;

  // Constraint sub-category selection
  constraintSubCategory: ConstraintSubCategory;
  setConstraintSubCategory: (category: ConstraintSubCategory) => void;

  // Current input mode (pzprjs-style)
  currentInputMode: InputModeType;
  savedInputModes: { edit: InputModeType; play: InputModeType };
  setInputMode: (mode: InputModeType) => void;

  // Validation rule overrides (rule ID → enabled/disabled)
  validationOverrides: Record<string, boolean>;
  setValidationOverride: (ruleId: string, enabled: boolean) => void;
  resetValidationOverrides: () => void;

  // Is a validation rule enabled?
  isRuleEnabled: (ruleId: string, defaultOn?: boolean) => boolean;

  // Validation state
  lastValidationResult: ValidationResultState | null;
  isValidationModalOpen: boolean;
  checkAnswer: () => ValidationResultState | null;
  openValidationModal: () => void;
  closeValidationModal: () => void;
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

/**
 * Trial mode (仮置き) state management
 * Based on pzprjs trial mode implementation
 */
export interface TrialSlice {
  /** Current trial stage (0 = normal, >0 = in trial mode) */
  trialStage: number;
  /** Stack of saved states for each trial level */
  trialStack: PuzzleElements[];
  /** Trial mode color scheme by depth */
  trialColors: string[];

  /** Enter trial mode - save current answer state */
  enterTrial: () => void;
  /** Accept trial - keep current changes and exit one level */
  acceptTrial: () => void;
  /** Reject trial - discard changes and restore saved state */
  rejectTrial: () => void;
  /** Reject current trial only (for nested trials) */
  rejectCurrentTrial: () => void;
  /** Check if in trial mode */
  isInTrial: () => boolean;
  /** Get current trial color for UI hints */
  getCurrentTrialColor: () => string | null;
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
    schemaId?: string;
  }) => void;
  exportPuzzle: () => string;
  importPuzzle: (json: string) => boolean;
}

// Re-export SolverSlice from solverSlice
export type { SolverSlice } from './solverSlice';

// Re-export cursor types from cursorSlice
export type { CursorSlice, CssCursorClass, CursorOverlay, CursorConfig } from './cursorSlice';

// Import CursorSlice for combined type
import type { CursorSlice } from './cursorSlice';
import type { SolverSlice } from './solverSlice';

// Combined store type
export type PuzzleStore = GridSlice &
  ElementsSlice &
  CanvasSlice &
  ToolSlice &
  LayerSlice &
  ConstraintSlice &
  SolutionSlice &
  HistorySlice &
  TrialSlice &
  PuzzleIOSlice &
  CursorSlice &
  SolverSlice;

// Slice creator type
export type SliceCreator<T> = StateCreator<PuzzleStore, [], [], T>;
