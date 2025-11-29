/**
 * Penpa-compatible Mode Definitions
 *
 * Defines all edit modes, submodes, and their configurations
 * matching Penpa-edit's mode system.
 */

// ========================================
// Edit Modes
// ========================================

/**
 * Main edit mode types
 */
export type PenpaEditMode =
  | 'surface'        // Cell surface coloring
  | 'line'           // Lines between cell centers
  | 'lineE'          // Lines between vertices (edge lines)
  | 'wall'           // Thick wall lines on cell boundaries
  | 'number'         // Numbers in cells
  | 'symbol'         // Symbols in cells
  | 'special'        // Special elements (thermo, arrow, etc.)
  | 'cage'           // Killer cages and regions
  | 'combi'          // Combination constraints
  | 'sudoku'         // Sudoku candidate mode
  | 'board'          // Board definition mode
  | 'move';          // Move recording mode

/**
 * Question/Answer layer selection
 */
export type PenpaLayerMode = 'question' | 'answer' | 'both';

// ========================================
// Surface Mode
// ========================================

/**
 * Surface submode types
 */
export type PenpaSurfaceSubmode =
  | 'surface'        // Full cell color
  | 'dot'            // Dot in cell center
  | 'multicolor';    // Multi-color per cell

/**
 * Surface mode configuration
 */
export interface PenpaSurfaceConfig {
  submode: PenpaSurfaceSubmode;
  color: number;
  secondaryColor: number;
}

// ========================================
// Line Mode
// ========================================

/**
 * Line submode types (for cell-to-cell lines)
 */
export type PenpaLineSubmode =
  | 'line'           // Normal lines
  | 'lineox'         // Lines with X marks
  | 'linedir'        // Directional lines
  | 'freeline'       // Free-form lines
  | 'midline';       // Lines from cell center to edge midpoint

/**
 * Line style options
 */
export interface PenpaLineConfig {
  submode: PenpaLineSubmode;
  style: number;     // 1-8 (see PenpaLineStyle)
  color: number;
}

// ========================================
// Edge Line Mode (lineE)
// ========================================

/**
 * Edge line submode types
 */
export type PenpaLineESubmode =
  | 'lineE'          // Normal edge lines
  | 'lineEox'        // Edge lines with X
  | 'freelineE'      // Free-form edge lines
  | 'lineEdir';      // Directional edge lines

/**
 * Edge line configuration
 */
export interface PenpaLineEConfig {
  submode: PenpaLineESubmode;
  style: number;
  color: number;
}

// ========================================
// Wall Mode
// ========================================

/**
 * Wall submode types
 */
export type PenpaWallSubmode =
  | 'wall'           // Normal wall
  | 'cross';         // Cross mark on edge

/**
 * Wall configuration
 */
export interface PenpaWallConfig {
  submode: PenpaWallSubmode;
  style: number;
  color: number;
}

// ========================================
// Number Mode
// ========================================

/**
 * Number submode types
 */
export type PenpaNumberSubmode =
  | 'number'         // Normal number
  | 'numberS'        // Small number (corner/side)
  | 'sudoku'         // Sudoku candidate number
  | 'arrow';         // Arrow with number

/**
 * Number size options
 */
export type PenpaNumberSizeOption = 1 | 2 | 3 | 4; // Large to Extra Small

/**
 * Number configuration
 */
export interface PenpaNumberConfig {
  submode: PenpaNumberSubmode;
  size: PenpaNumberSizeOption;
  color: number;
  position: number;  // 0-8 for corner/side positions
}

// ========================================
// Symbol Mode
// ========================================

/**
 * Symbol submode categories
 */
export type PenpaSymbolSubmode =
  | 'circle'
  | 'square'
  | 'diamond'
  | 'triangle'
  | 'star'
  | 'cross'
  | 'ox'
  | 'arrow'
  | 'dice'
  | 'special';       // Other special symbols

/**
 * Symbol style variations
 */
export type PenpaSymbolStyle =
  | 'normal'         // Outline only
  | 'fill'           // Filled
  | 'thick'          // Thick outline
  | 'double';        // Double outline

/**
 * Symbol size
 */
export type PenpaSymbolSize = 'L' | 'M' | 'S' | 'SS';

/**
 * Symbol configuration
 */
export interface PenpaSymbolConfig {
  submode: PenpaSymbolSubmode;
  style: PenpaSymbolStyle;
  size: PenpaSymbolSize;
  color: number;
  rotation: number;  // 0, 90, 180, 270
}

// ========================================
// Special Mode
// ========================================

/**
 * Special submode types
 */
export type PenpaSpecialSubmode =
  | 'thermo'         // Thermometer
  | 'nobulbthermo'   // Thermometer without bulb
  | 'arrows'         // Arrow constraint
  | 'direction'      // Direction indicator
  | 'squareframe'    // Square frame
  | 'polygon'        // Polygon region
  | 'inequality';    // Inequality marks

/**
 * Special element configuration
 */
export interface PenpaSpecialConfig {
  submode: PenpaSpecialSubmode;
  color: number;
}

// ========================================
// Cage Mode
// ========================================

/**
 * Cage submode types
 */
export type PenpaCageSubmode =
  | 'cage'           // Normal cage with dashed border
  | 'killercages'    // Killer sudoku cages
  | 'deletelineE';   // Cage line deletion

/**
 * Cage configuration
 */
export interface PenpaCageConfig {
  submode: PenpaCageSubmode;
  color: number;
  style: 'dashed' | 'solid' | 'dotted';
}

// ========================================
// Combination Mode
// ========================================

/**
 * Combi submode types (puzzle-specific modes)
 */
export type PenpaCombiSubmode =
  | 'battleship'     // Battleship puzzle
  | 'star'           // Star Battle
  | 'tents'          // Tents and Trees
  | 'magnets'        // Magnets puzzle
  | 'akari'          // Light Up
  | 'mines'          // Minesweeper
  | 'masyu'          // Masyu
  | 'yajilin'        // Yajilin
  | 'castle'         // Castle Wall
  | 'hashi'          // Hashiwokakero
  | 'slitherlink'    // Slitherlink
  | 'shakashaka'     // Shakashaka
  | 'nurikabe'       // Nurikabe
  | 'fillomino'      // Fillomino
  | 'skyscraper'     // Skyscrapers
  | 'kropki'         // Kropki
  | 'thermosudoku'   // Thermo Sudoku
  | 'arrowsudoku'    // Arrow Sudoku
  | 'sandwichsudoku' // Sandwich Sudoku
  | 'xv';            // XV Sudoku

/**
 * Combi mode configuration
 */
export interface PenpaCombiConfig {
  submode: PenpaCombiSubmode;
}

// ========================================
// Board Mode
// ========================================

/**
 * Board submode types
 */
export type PenpaBoardSubmode =
  | 'addline'        // Add grid lines
  | 'delline'        // Delete grid lines
  | 'frame'          // Add frame
  | 'white'          // White out cells
  | 'black';         // Black out cells

/**
 * Board configuration
 */
export interface PenpaBoardConfig {
  submode: PenpaBoardSubmode;
}

// ========================================
// Mode State
// ========================================

/**
 * Complete mode state
 */
export interface PenpaModeState {
  editMode: PenpaEditMode;
  layerMode: PenpaLayerMode;
  surface?: PenpaSurfaceConfig;
  line?: PenpaLineConfig;
  lineE?: PenpaLineEConfig;
  wall?: PenpaWallConfig;
  number?: PenpaNumberConfig;
  symbol?: PenpaSymbolConfig;
  special?: PenpaSpecialConfig;
  cage?: PenpaCageConfig;
  combi?: PenpaCombiConfig;
  board?: PenpaBoardConfig;
}

/**
 * Default mode state
 */
export const DEFAULT_MODE_STATE: PenpaModeState = {
  editMode: 'surface',
  layerMode: 'question',
  surface: {
    submode: 'surface',
    color: 1,
    secondaryColor: 2,
  },
  line: {
    submode: 'line',
    style: 1,
    color: 3,
  },
  lineE: {
    submode: 'lineE',
    style: 1,
    color: 3,
  },
  wall: {
    submode: 'wall',
    style: 1,
    color: 3,
  },
  number: {
    submode: 'number',
    size: 1,
    color: 3,
    position: 0,
  },
  symbol: {
    submode: 'circle',
    style: 'normal',
    size: 'L',
    color: 3,
    rotation: 0,
  },
  special: {
    submode: 'thermo',
    color: 2,
  },
  cage: {
    submode: 'cage',
    color: 3,
    style: 'dashed',
  },
};

// ========================================
// Mode Utilities
// ========================================

/**
 * Get available submodes for an edit mode
 */
export function getSubmodes(editMode: PenpaEditMode): string[] {
  switch (editMode) {
    case 'surface':
      return ['surface', 'dot', 'multicolor'];
    case 'line':
      return ['line', 'lineox', 'linedir', 'freeline', 'midline'];
    case 'lineE':
      return ['lineE', 'lineEox', 'freelineE', 'lineEdir'];
    case 'wall':
      return ['wall', 'cross'];
    case 'number':
      return ['number', 'numberS', 'sudoku', 'arrow'];
    case 'symbol':
      return ['circle', 'square', 'diamond', 'triangle', 'star', 'cross', 'ox', 'arrow', 'dice', 'special'];
    case 'special':
      return ['thermo', 'nobulbthermo', 'arrows', 'direction', 'squareframe', 'polygon', 'inequality'];
    case 'cage':
      return ['cage', 'killercages', 'deletelineE'];
    case 'combi':
      return [
        'battleship', 'star', 'tents', 'magnets', 'akari', 'mines',
        'masyu', 'yajilin', 'castle', 'hashi', 'slitherlink',
        'shakashaka', 'nurikabe', 'fillomino', 'skyscraper',
        'kropki', 'thermosudoku', 'arrowsudoku', 'sandwichsudoku', 'xv',
      ];
    case 'board':
      return ['addline', 'delline', 'frame', 'white', 'black'];
    default:
      return [];
  }
}

/**
 * Check if a mode supports diagonal operations
 */
export function supportsDiagonal(editMode: PenpaEditMode): boolean {
  return editMode === 'lineE' || editMode === 'line';
}

/**
 * Check if a mode operates on vertices
 */
export function operatesOnVertices(editMode: PenpaEditMode): boolean {
  return editMode === 'lineE';
}

/**
 * Check if a mode operates on cells
 */
export function operatesOnCells(editMode: PenpaEditMode): boolean {
  return ['surface', 'number', 'symbol', 'cage', 'combi'].includes(editMode);
}

/**
 * Check if a mode operates on edges
 */
export function operatesOnEdges(editMode: PenpaEditMode): boolean {
  return editMode === 'wall';
}

/**
 * Get keyboard shortcut for mode
 */
export function getModeShortcut(editMode: PenpaEditMode): string | null {
  const shortcuts: Record<PenpaEditMode, string> = {
    surface: 'S',
    line: 'L',
    lineE: 'E',
    wall: 'W',
    number: 'N',
    symbol: 'Y',
    special: 'P',
    cage: 'C',
    combi: 'B',
    sudoku: 'U',
    board: 'D',
    move: 'M',
  };
  return shortcuts[editMode] ?? null;
}
