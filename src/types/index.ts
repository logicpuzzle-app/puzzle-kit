// Core type definitions for PuzzleKit

// Re-export Penpa Point types (renamed to avoid conflicts)
export {
  PointType as PenpaPointType,
  PointUse,
  type Point as PenpaPoint,
  type GridPoints,
  createPoint,
  createGridPoints,
  generateSquareGridPoints,
  getCellIndex,
  getVertexIndex,
  getEdgeHIndex,
  getEdgeVIndex,
  getCellPosition,
  isPointInBounds,
  findCellAtPosition,
  findNearestPoint,
  getAdjacentCells,
} from './point';

// Re-export Hex grid types
export {
  generateHexGridPoints,
  pixelToHex,
  hexToPixel,
  getHexVertices,
  getHexNeighbors,
  hexDistance,
} from './hexPoint';

// Re-export Triangle grid types
export {
  generateTriGridPoints,
  pixelToTri,
  triToPixel,
  getTriVertices,
  getTriNeighbors,
  triDistance,
  isUpwardTriangle,
} from './triPoint';

// Re-export Pyramid grid types
export {
  generatePyramidGridPoints,
  pixelToPyramid,
  pyramidToPixel,
  getPyramidVertices,
  getPyramidNeighbors,
  isPyramidUpward,
  getPyramidRowCellCount,
  getPyramidTotalCells,
  getPyramidCellIndex,
  getPyramidCellPosition,
} from './pyramidPoint';

// Re-export Penpa element types
export {
  PenpaLineStyle,
  getLineStyleProps,
  parseEdgeKey,
  createEdgeKey,
  parseWallKey,
  createWallKey,
  getPenpaColor,
  parseLineE,
  parseWalls,
  parseThermos,
  parseArrows,
  PENPA_COLORS,
  PENPA_SYMBOLS,
  PenpaNumberSize,
  PenpaNumberPosition,
  type PenpaEdge,
  type PenpaWall,
  type PenpaCage,
  type PenpaThermo,
  type PenpaArrow,
  type PenpaDirectionalClue,
  type PenpaDirection,
  type PenpaPolygon,
  type PenpaSquareFrame,
  type PenpaNumber,
  type PenpaSmallNumber,
  type PenpaSymbolType,
} from './penpaElements';

// Re-export Penpa mode types
export {
  DEFAULT_MODE_STATE,
  getSubmodes,
  supportsDiagonal,
  operatesOnVertices,
  operatesOnCells,
  operatesOnEdges,
  getModeShortcut,
  type PenpaEditMode,
  type PenpaLayerMode,
  type PenpaModeState,
  type PenpaSurfaceSubmode,
  type PenpaLineSubmode,
  type PenpaLineESubmode,
  type PenpaWallSubmode,
  type PenpaNumberSubmode,
  type PenpaSymbolSubmode,
  type PenpaSpecialSubmode,
  type PenpaCageSubmode,
  type PenpaCombiSubmode,
  type PenpaBoardSubmode,
} from './penpaModes';

// Re-export Puzzle Genre types
export {
  PUZZLE_GENRES,
  PUZZLE_TAGS,
  GENRE_INFO,
  getGenresByTag,
  getGenresWithTags,
  getGenreInfo,
  type PuzzleGenre,
  type PuzzleTag,
  type GenreInfo,
} from './puzzleGenres';

export type LayerType = 'grid' | 'problem' | 'answer' | 'constraint';

/** Data layer type - layers that actually store puzzle elements */
export type DataLayerType = 'problem' | 'answer';

/** Convert LayerType to DataLayerType (virtual layers fall back to problem) */
export function toDataLayer(layer: LayerType): DataLayerType {
  return layer === 'problem' || layer === 'answer' ? layer : 'problem';
}

/** Check if the layer is a virtual layer (grid or constraint) */
export function isVirtualLayer(layer: LayerType): boolean {
  return layer === 'grid' || layer === 'constraint';
}

export type ToolCategory =
  | 'surface'
  | 'line'
  | 'edge'
  | 'wall'
  | 'number'
  | 'text'
  | 'symbol'
  | 'special'
  | 'cage'
  | 'select';

export type ToolType =
  // Surface tools
  | 'surface-fill'
  | 'surface-dot'
  | 'surface-cycle' // Cycle through states: none -> shade -> unshade -> none
  // Line tools (cell center to center)
  | 'line-normal'
  | 'line-diagonal'
  | 'line-free'
  | 'line-middle'
  // Edge tools (vertex to vertex)
  | 'edge-normal'
  | 'edge-diagonal'
  | 'edge-free'
  // Wall tools
  | 'wall-normal'
  // Number tools
  | 'number-normal'
  | 'number-large'
  | 'number-medium'
  | 'number-small'
  | 'number-corner'
  | 'number-side'
  | 'number-candidates'
  | 'number-directional' // Yajilin-style directional number
  // Text tools
  | 'text-alphabet'
  | 'text-hiragana'
  | 'text-katakana'
  | 'text-free'
  // Symbol tools
  | 'symbol-circle'
  | 'symbol-square'
  | 'symbol-triangle'
  | 'symbol-diamond'
  | 'symbol-star'
  | 'symbol-arrow'
  | 'symbol-arrow_B'
  | 'symbol-arrow_N'
  | 'symbol-arrow_S'
  | 'symbol-arrow_Short'
  | 'symbol-arrow_GP'
  | 'symbol-arrow_double'
  | 'symbol-arrow_cross'
  | 'symbol-arrow_eight'
  | 'symbol-arrow_fourtip'
  | 'symbol-arrow_fouredge'
  | 'symbol-cross'
  | 'symbol-line'
  | 'symbol-cat'
  | 'symbol-dog'
  | 'symbol-rabbit'
  | 'symbol-bear'
  | 'symbol-mouse'
  | 'symbol-pig'
  | 'symbol-bird'
  | 'symbol-fish'
  | 'symbol-snake'
  | 'symbol-frog'
  // Special tools
  | 'special-thermo'
  | 'special-arrow'
  | 'special-cage'
  | 'special-boxline'
  // Multicolor surface
  | 'multicolor-surface'
  // Solution area
  | 'solution-area'
  // Selection
  | 'select';

export type LineStyle =
  | 'solid'
  | 'dashed'
  | 'dotted'
  | 'double';

export type LineThickness = 'thinnest' | 'thin' | 'normal' | 'thick' | 'thickest';

/** Simple 2D coordinate point */
export interface Point {
  x: number;
  y: number;
}

export interface GridPosition {
  row: number;
  col: number;
}

// Grid point types (distinct from Point in point.ts)
export type GridPointType =
  | 'cell'        // Cell center (type 0)
  | 'vertex'      // Grid vertex (type 1)
  | 'edge-h'      // Horizontal edge center (type 2)
  | 'edge-v';     // Vertical edge center (type 3)

export interface GridPoint {
  id: string;
  row: number;
  col: number;
  type: GridPointType;
  x: number;  // SVG coordinate
  y: number;  // SVG coordinate
}

// Surface display modes
export type SurfaceDisplayMode = 'fill' | 'dot';

// Drawing elements
export interface SurfaceElement {
  id: string;
  cellId: string;
  color: string;
  layer: DataLayerType;
  /** Logical uniqueness key per cell (same key cannot be placed twice on one cell) */
  objectKey?: string;
  /** Display mode: 'fill' for full cell fill, 'dot' for small dot (pzprjs qsub style) */
  displayMode?: SurfaceDisplayMode;
}

/**
 * Line target type - determines how lines are drawn
 * - 'edge': Lines connect vertices (Slitherlink style)
 * - 'cell': Lines connect cell centers via shared edge (Mashu style)
 * - 'wall': Lines drawn on edge (room boundaries, thick borders)
 */
export type LineTargetType = 'edge' | 'cell' | 'wall';

/**
 * Unified line element - represents all grid-snapped lines.
 *
 * Grid-snapped lines use edgeId as primary identifier:
 * - lineTarget='edge': Draw between edge's start/end vertices (Slitherlink)
 * - lineTarget='cell': Draw between edge's adjacent cell centers (Mashu)
 * - lineTarget='wall': Draw on edge itself (room boundaries)
 *
 * Freehand lines use raw SVG coordinates instead of edgeId.
 */
export interface LineElement {
  id: string;

  // Edge-based representation (for grid-snapped lines)
  edgeId?: string;             // Edge ID that this line passes through
  lineTarget?: LineTargetType; // How to draw the line

  // Legacy coordinate-based representation (for backward compatibility)
  // These are derived from edgeId when possible, or used directly for freehand
  from?: string;  // point ID (vertex or cell) - deprecated for grid-snapped
  to?: string;    // point ID (vertex or cell) - deprecated for grid-snapped

  style: LineStyle;
  thickness: LineThickness;
  color: string;
  layer: DataLayerType;

  // Arrow style: determines where arrow is drawn
  // - 'endpoint': arrow at the end of line (standard arrow)
  // - 'midpoint': arrow marker at the middle of line (directional indicator)
  // - 'both': arrows at both ends (bidirectional)
  // Default is undirected (undefined)
  directed?: 'endpoint' | 'midpoint' | 'both';

  // Arrow direction: which way the arrow points relative to from->to
  // - 'forward': arrow points from->to (default)
  // - 'backward': arrow points to->from
  arrowDirection?: 'forward' | 'backward';

  // For freehand lines (not snapped to grid)
  isFree?: boolean;
  fromX?: number;  // SVG x coordinate
  fromY?: number;  // SVG y coordinate
  toX?: number;    // SVG x coordinate
  toY?: number;    // SVG y coordinate
  strokeId?: string;  // Groups freehand segments into a single stroke
}

/**
 * @deprecated Use LineElement with lineTarget='edge' instead
 */
export type EdgeElement = LineElement;

/**
 * @deprecated Use LineElement with lineTarget='wall' instead
 */
export type WallElement = LineElement;

export interface NumberElement {
  id: string;
  cellId: string;
  value: string;
  size: 'large' | 'medium' | 'small';
  position: 'center' | 'corner' | 'side' | 'candidates';
  cornerIndex?: number;  // 0-3 for corners (TL, TR, BL, BR)
  sideIndex?: number;    // 0-3 for sides (T, R, B, L)
  candidates?: number[]; // For candidates mode (1-9 for Sudoku)
  /** Optional direction for directional numbers (0=None,1=Up,2=Down,3=Left,4=Right). */
  direction?: 0 | 1 | 2 | 3 | 4;
  /** Optional arbitrary angle in degrees for directional numbers. */
  angle?: number | null;
  color: string;
  layer: DataLayerType;
  /** Logical uniqueness key per cell (same key cannot be placed twice on one cell) */
  objectKey?: string;
}

export interface SymbolElement {
  id: string;
  cellId: string;
  symbolType: string;
  size: 'largest' | 'large' | 'medium' | 'small';
  rotation: number;  // degrees
  color: string;
  fillColor?: string;
  layer: DataLayerType;
  directions?: boolean[];  // For multi-direction arrows (8 values for 8-way, etc.)
  directionAngles?: number[];  // Custom angles for each direction (degrees, 0=up)
  /** Logical uniqueness key per cell (same key cannot be placed twice on one cell) */
  objectKey?: string;
}

export interface CageElement {
  id: string;
  cells: string[];  // cell IDs
  style: 'solid' | 'dashed';
  color: string;
  label?: string;
  layer: DataLayerType;
}

export interface SpecialElement {
  id: string;
  type: 'thermo' | 'arrow' | 'polygon';
  points: string[];  // point IDs in order
  color: string;
  layer: DataLayerType;
  data?: Record<string, unknown>;
}

// BoxLine: Hybrid of filled cell and line (for Snake, Object Placement, Patrol puzzles)
// Draws a filled box (90% cell size) that connects to adjacent boxes
export interface BoxLineElement {
  id: string;
  cells: string[];  // cell IDs in order (forming a connected path)
  color: string;
  layer: DataLayerType;
}

/**
 * Line Group - groups lines for merged rendering
 *
 * Line groups allow multiple lines to be rendered as a single merged chain.
 * This is useful for arrow lines where you want arrows at the endpoints of
 * a chain of connected lines rather than on each individual line.
 *
 * The groupType determines what kind of merging is applied:
 * - 'arrow': Lines are merged for arrow rendering (arrows at chain endpoints)
 */
export interface LineGroup {
  id: string;
  /** IDs of lines that belong to this group */
  lineIds: string[];
  /** Type of grouping (determines rendering behavior) */
  groupType: 'arrow';
  /** Layer this group belongs to */
  layer: DataLayerType;
}

// Grid type for different cell shapes (Tilings)
// Regular tilings: square {4,4}, triangle {3,6}, hex {6,3}
// Semi-regular tilings: snub-square, trihexagonal, rhombitrihexagonal, etc.
// Dual semi-regular: cairo, rhombille, etc.
export type GridType =
  // Regular tilings
  | 'square'           // {4,4} - Square tiling
  | 'triangle'         // {3,6} - Triangular tiling
  | 'hex'              // {6,3} - Hexagonal tiling
  | 'pyramid'          // Pyramid (special)
  | 'iso'              // Isometric cube grid (Penpa iso)
  | 'penrose_P3'       // Penrose P3 rhombus tiling (Penpa)
  // Semi-regular tilings
  | 'snub-square'      // 3².4.3.4 - Snub square tiling
  | 'trihexagonal'     // 3.6.3.6 - Trihexagonal (kagome) tiling
  | 'rhombitrihexagonal' // 3.4.6.4 - Rhombitrihexagonal tiling
  | 'truncated-square' // 4.8² - Truncated square tiling
  | 'truncated-hexagonal' // 3.12² - Truncated hexagonal tiling
  | 'truncated-trihexagonal' // 4.6.12 - Truncated trihexagonal tiling
  | 'snub-trihexagonal' // 3⁴.6 - Snub trihexagonal tiling
  | 'elongated-triangular' // 3³.4² - Elongated triangular tiling
  // Dual semi-regular tilings
  | 'cairo'            // V3².4.3.4 - Cairo pentagonal tiling
  | 'rhombille'        // V3.6.3.6 - Rhombille tiling
  | 'deltoidal-trihexagonal' // V3.4.6.4 - Deltoidal trihexagonal
  | 'tetrakis-square'  // V4.8² - Tetrakis square tiling
  | 'triakis-triangular' // V3.12² - Triakis triangular tiling
  | 'kisrhombille'     // V4.6.12 - Kisrhombille tiling
  | 'floret-pentagonal' // V3⁴.6 - Floret pentagonal tiling
  | 'prismatic-pentagonal'; // V3³.4² - Prismatic pentagonal tiling

// Grid configuration
// Isometric grid face type
export type IsometricFace = 'top' | 'left' | 'right' | 'bottom';

// Isometric view type
export type IsometricView = 'exterior' | 'interior';

export interface GridConfig {
  rows: number;
  cols: number;
  level?: number; // for iso/cube grids (height/depth)
  isometricFaces?: IsometricFace[]; // which faces to show: ['top', 'left', 'right'] by default
  isometricView?: IsometricView; // 'exterior' (default) or 'interior' (shows bottom instead of top)
  // Penrose settings (used when gridType === 'penrose_P3')
  penroseSide?: number; // Penpa: nx (tile region size)
  penroseOrder?: number; // Penpa: ny (typically 5)
  penroseRotational?: number; // Penpa: rotation parameter (0-4)
  penroseVariation?: number; // Penpa: seed/variation (0.0-1.0)
  cellSize: number;
  outerPadding: number;
  showGrid: boolean;
  gridStyle: 'normal' | 'thick' | 'sudoku' | 'dots' | 'dashed';
  // Grid type (cell shape)
  gridType: GridType;
  // Extended margin options (extra cells outside main grid)
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  // Frame style
  frameStyle: 'normal' | 'thick' | 'double' | 'none';
  frameColor: string;
  // Grid line colors
  gridColor: string;
  // Background color
  backgroundColor: string;
  // Background image
  backgroundImage?: string;  // Base64 data URL or external URL
  backgroundOpacity?: number;  // 0-1
  backgroundFit?: 'contain' | 'cover' | 'fill' | 'none';  // How image fits in grid
  backgroundScale?: number;  // Scale factor (1 = 100%)
  backgroundTile?: boolean;  // Whether to tile the image
  backgroundOffsetX?: number;  // X offset in pixels
  backgroundOffsetY?: number;  // Y offset in pixels
  // Export padding (extra space around the entire grid)
  exportPaddingTop?: number;  // pixels
  exportPaddingBottom?: number;  // pixels
  exportPaddingLeft?: number;  // pixels
  exportPaddingRight?: number;  // pixels
  // Disabled cells (cells that are excluded from the puzzle grid)
  // Legacy: disabledCells is still used for backwards compatibility (treated as voidCells)
  disabledCells?: string[];  // Array of cell IDs (e.g., "cell-0-0") - DEPRECATED, use voidCells
  /** Void cells: completely removed from the grid, no topology, no hints */
  voidCells?: string[];
  /** Outboard cells: hint areas outside the main grid, can contain hints but excluded from adjacency */
  outboardCells?: string[];
  disabledCellColor?: string;  // Color for disabled cells (default: background color)
  /**
   * Exclude mode for NEW cells being clicked:
   * - 'void': New clicks will add to voidCells (default)
   * - 'outboard': New clicks will add to outboardCells
   */
  excludeMode?: 'void' | 'outboard';
  // Merged cells (groups of cells that are combined into one)
  // Each entry is an array of cell IDs that form a merged cell
  mergedCells?: string[][];
  // Split lines (experimental)
  splitLines?: SplitLine[];
  // Sculpt operations (rotations around vertices in isometric grids)
  // Stored as an array of operations to be replayed when regenerating topology
  sculptOperations?: SculptOperation[];
}

// Sculpt operation - records a vertex operation for replay
// - 'rotate': Flip 3 cells around the vertex (existing behavior)
// - 'cut': Remove vertex and connect 3 adjacent vertices with a triangle
export interface SculptOperation {
  type: 'rotate' | 'cut';
  vertexId: string;  // The vertex around which the operation is performed
}

export type SplitPoint =
  | { type: 'vertex'; vertexId: string }
  | { type: 'edge'; edgeId: string; t: number };

export interface SplitLine {
  cellId: string;           // target cell id
  startPoint: SplitPoint;
  endPoint: SplitPoint;
}

// Room map for region-based puzzles (Heyawake, etc.)
// Maps cell-{row}-{col} to room ID
export type RoomMap = Record<string, number>;

// Puzzle state
export interface PuzzleElements {
  surfaces: Record<string, SurfaceElement>;
  lines: Record<string, LineElement>;
  /**
   * @deprecated Use lines with lineTarget='edge' instead.
   * Kept for backward compatibility - will be migrated to lines.
   */
  edges: Record<string, LineElement>;
  /**
   * @deprecated Use lines with lineTarget='wall' instead.
   * Kept for backward compatibility - will be migrated to lines.
   */
  walls: Record<string, LineElement>;
  numbers: Record<string, NumberElement>;
  symbols: Record<string, SymbolElement>;
  cages: Record<string, CageElement>;
  specials: Record<string, SpecialElement>;
  boxLines: Record<string, BoxLineElement>;
  /** Line groups for merged rendering (e.g., arrow chains) */
  lineGroups?: Record<string, LineGroup>;
  roomMap?: RoomMap; // Optional room map for region-based puzzles
  // Optional fields for specific puzzle types
  borders?: Record<string, unknown>;
  clueCells?: Record<string, any>;
  rowClues?: Record<string, any>;
  colClues?: Record<string, any>;
  tapaClues?: Record<string, any>;
}

// Solution Area - cells where answer checking applies
export interface SolutionArea {
  cells: string[]; // cell IDs that are part of the solution area
  enabled: boolean; // whether solution checking is active
}

// Multicolor surface element - multiple colors per cell
export interface MulticolorSurfaceElement {
  id: string;
  cellId: string;
  colors: number[]; // array of color indices (Penpa format: up to 4 colors per cell)
  pattern: 'cross' | 'x'; // Pattern layout: + (cross) or × (x)
  customColors?: string[]; // Custom colors array (idx 9+ map to this array)
  layer: DataLayerType;
}

export interface PuzzleState {
  problem: PuzzleElements;
  answer: PuzzleElements;
  // Solution area for answer checking
  solutionArea?: SolutionArea;
  // Multicolor surfaces (separate from regular surfaces)
  multicolorSurfaces?: Record<string, MulticolorSurfaceElement>;
}

// Number position type
export type NumberPosition = 'center' | 'corner' | 'side' | 'candidates';

// Line grid point types - where lines can connect
export type LineGridPoint = 'cell' | 'vertex' | 'edge';

// Line direction types
// orthogonal: horizontal/vertical with grid snap
// diagonal: 45-degree with grid snap
// straight: single straight line between any two grid points (no interpolation)
// freehand: free drawing without grid snap
export type LineDirection = 'orthogonal' | 'diagonal' | 'straight' | 'freehand';

// Multicolor swatch (saved pattern preset)
export interface MulticolorSwatch {
  id: string;
  slots: number[];       // 4 color slot indices
  pattern: 'cross' | 'x';
  customColors: string[]; // Custom colors used in this swatch
}

// Tool settings
export interface ToolSettings {
  currentTool: ToolType;
  currentCategory: ToolCategory;
  color: string;
  secondaryColor: string;
  /** Outline colour of the selected-cell cursor. */
  cursorCellColor: string;
  /** Outline width of the selected-cell cursor, in SVG units before zoom. */
  cursorCellThickness: number;
  lineStyle: LineStyle;
  lineThickness: LineThickness;
  symbolSize: 'largest' | 'large' | 'medium' | 'small';
  numberSize: 'large' | 'medium' | 'small';
  symbolRotation: number; // degrees
  // Number tool submode settings
  numberPosition: NumberPosition;
  cornerIndex: number; // 0-3 for corners (TL, TR, BL, BR)
  sideIndex: number;   // 0-3 for sides (T, R, B, L)
  selectedCandidates: number[]; // For candidates mode (1-9)
  arrowDirection: number; // 0=up, 1=left, 2=right, 3=down for directional numbers
  arrowAngle: number | null; // Arbitrary angle in degrees (null = use arrowDirection)
  // Multicolor surface mode settings
  multicolorSlots: number[]; // 4 color slots for multicolor mode (Penpa color indices)
  multicolorPattern: 'cross' | 'x'; // Pattern layout: + or ×
  multicolorCustomColors: string[]; // Custom colors array (idx 9, 10, 11, 12 map to index 0, 1, 2, 3)
  multicolorSwatches: MulticolorSwatch[]; // Saved pattern presets
  // Line tool settings
  lineGridPoints: LineGridPoint[];   // Which grid points to use (multiple select)
  lineDirections: LineDirection[];   // Which directions to allow (multiple select)
  lineHalfMode: boolean;             // Half mode: allows lines between cell centers and edge centers
  lineDirected?: 'endpoint' | 'midpoint' | 'both'; // Arrow style: undefined=undirected, 'endpoint'=arrow at end, 'midpoint'=arrow in middle, 'both'=arrows at both ends
  lineArrowDirection?: 'forward' | 'backward'; // Arrow direction: 'forward'=from->to, 'backward'=to->from
  lineMerge?: boolean;               // Merge connected lines with same style for rendering
  // Symbol tool settings
  symbolGridPoints: LineGridPoint[]; // Which grid points symbols can be placed on
  overrideSymbolType?: string; // Override the default symbol type (e.g., 'circle-filled' for constraint modes)
  symbolSubMode: 'direction' | 'icon' | 'multicolor'; // Symbol category sub-mode: direction (arrows), icon (symbols), or multicolor surface
  // Surface button mode (for shading puzzles like Heyawake)
  surfaceButtonMode: '2-button' | '1-button'; // 2-button: left=shade, right=unshade; 1-button: left cycles
  // Input constraint for shading (e.g., 'noAdjacent' prevents shading adjacent cells)
  inputConstraint?: 'none' | 'noAdjacent';
  // Multi-direction arrow settings (for arrow_cross, arrow_eight, etc.)
  multiDirections: boolean[]; // Direction toggles: [N, NE, E, SE, S, SW, W, NW] for 8-way, [N, E, S, W] for 4-way
  multiDirectionAngles: number[]; // Custom angles for each direction (degrees, 0=up, clockwise)
}

// Canvas state
export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
  isDragging: boolean;
  isDrawing: boolean;
  selection: string[];
  panMode: boolean;
}

// Color palette
export interface ColorPalette {
  surface: string[];
  line: string[];
  symbol: string[];
  number: string[];
}

export const DEFAULT_COLORS: ColorPalette = {
  surface: [
    '#808080', // Dark grey
    '#00ff00', // Green
    '#c0c0c0', // Light grey
    '#000000', // Black
    '#0000ff', // Blue
    '#ff0000', // Red
    '#ffff00', // Yellow
    '#ff8000', // Orange
    '#ff00ff', // Pink
    '#00ffff', // Cyan
    '#ffffff', // White
  ],
  line: [
    '#000000', // Black
    '#808080', // Grey
    '#ff0000', // Red
    '#00ff00', // Green
    '#0000ff', // Blue
  ],
  symbol: [
    '#000000', // Black
    '#ffffff', // White
    '#ff0000', // Red
    '#00ff00', // Green
    '#0000ff', // Blue
  ],
  number: [
    '#000000', // Black
    '#808080', // Grey
    '#ff0000', // Red
    '#0000ff', // Blue
  ],
};

// Export format
export interface PuzzleExport {
  version: string;
  grid: GridConfig;
  state: PuzzleState;
  metadata?: {
    title?: string;
    author?: string;
    genre?: string;
    difficulty?: string;
    created?: string;
    modified?: string;
  };
  // Topology settings
  // Note: topology geometry is NOT stored - it's regenerated from grid config
  // (grid.mergedCells, grid.splitLines are used to recreate merge/split state)
  topologySettings?: {
    useTopology: boolean;
    topologyPreset: string;
    topologyIntensity: number;
  };
}
