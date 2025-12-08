/**
 * Penpa-compatible Element Type Definitions
 *
 * Defines data structures for all Penpa drawing elements:
 * - Edge (lineE): diagonal and free lines between vertices
 * - Wall: thick lines on cell boundaries
 * - Cage: killer cage regions with labels
 * - Special: thermo, arrows, polygons
 * - Extended symbols and numbers
 */

// ========================================
// Line Styles (Penpa-compatible)
// ========================================

/**
 * Penpa line style codes
 */
export enum PenpaLineStyle {
  /** Normal solid line */
  NORMAL = 1,
  /** Dotted line */
  DOTTED = 2,
  /** Dashed line */
  DASHED = 3,
  /** Bold line */
  BOLD = 4,
  /** Very bold line */
  VERY_BOLD = 5,
  /** X mark (cross) */
  X_MARK = 6,
  /** Double line */
  DOUBLE = 7,
  /** Delete/erase */
  DELETE = 8,
}

/**
 * Line style to CSS stroke properties
 */
export function getLineStyleProps(style: PenpaLineStyle): {
  strokeWidth: number;
  strokeDasharray?: string;
  stroke?: string;
} {
  switch (style) {
    case PenpaLineStyle.DOTTED:
      return { strokeWidth: 2, strokeDasharray: '2,2' };
    case PenpaLineStyle.DASHED:
      return { strokeWidth: 2, strokeDasharray: '6,3' };
    case PenpaLineStyle.BOLD:
      return { strokeWidth: 4 };
    case PenpaLineStyle.VERY_BOLD:
      return { strokeWidth: 6 };
    case PenpaLineStyle.X_MARK:
      return { strokeWidth: 2 }; // Special rendering required
    case PenpaLineStyle.DOUBLE:
      return { strokeWidth: 2 }; // Special rendering required
    case PenpaLineStyle.DELETE:
      return { strokeWidth: 2, stroke: 'transparent' };
    case PenpaLineStyle.NORMAL:
    default:
      return { strokeWidth: 2 };
  }
}

// ========================================
// Edge Element (lineE)
// ========================================

/**
 * Edge element data (Penpa lineE)
 *
 * Edges connect vertices (not cell centers like lines).
 * Used for diagonal lines, free-form lines, etc.
 */
export interface PenpaEdge {
  /** Start vertex index */
  from: number;
  /** End vertex index */
  to: number;
  /** Line style */
  style: PenpaLineStyle;
  /** Color (CSS color string or Penpa color index) */
  color?: string | number;
  /** Layer: 'problem' or 'answer' */
  layer: 'problem' | 'answer';
}

/**
 * Convert Penpa lineE key to edge data
 * Key format: "from,to"
 */
export function parseEdgeKey(key: string): { from: number; to: number } | null {
  const parts = key.split(',');
  if (parts.length !== 2) return null;

  const from = parseInt(parts[0], 10);
  const to = parseInt(parts[1], 10);

  if (isNaN(from) || isNaN(to)) return null;

  return { from, to };
}

/**
 * Create edge key from vertex indices
 */
export function createEdgeKey(from: number, to: number): string {
  // Always use smaller index first for consistency
  const [a, b] = from < to ? [from, to] : [to, from];
  return `${a},${b}`;
}

// ========================================
// Wall Element
// ========================================

/**
 * Wall element data (thick cell boundary lines)
 *
 * Walls are drawn on cell edges (between adjacent cells).
 */
export interface PenpaWall {
  /** First cell index */
  cell1: number;
  /** Second cell index (adjacent cell) */
  cell2: number;
  /** Wall style */
  style: PenpaLineStyle;
  /** Color */
  color?: string | number;
  /** Layer */
  layer: 'problem' | 'answer';
}

/**
 * Convert Penpa wall key to wall data
 * Key format: "cell1,cell2"
 */
export function parseWallKey(key: string): { cell1: number; cell2: number } | null {
  const parts = key.split(',');
  if (parts.length !== 2) return null;

  const cell1 = parseInt(parts[0], 10);
  const cell2 = parseInt(parts[1], 10);

  if (isNaN(cell1) || isNaN(cell2)) return null;

  return { cell1, cell2 };
}

/**
 * Create wall key from cell indices
 */
export function createWallKey(cell1: number, cell2: number): string {
  const [a, b] = cell1 < cell2 ? [cell1, cell2] : [cell2, cell1];
  return `${a},${b}`;
}

// ========================================
// Cage Element
// ========================================

/**
 * Cage element data (killer cage, etc.)
 */
export interface PenpaCage {
  /** Cell indices in the cage */
  cells: number[];
  /** Optional label (sum, etc.) */
  label?: string;
  /** Cage style */
  style: 'dashed' | 'solid' | 'dotted';
  /** Color */
  color?: string | number;
  /** Layer */
  layer: 'problem' | 'answer';
}

/**
 * Killer cage format (Penpa killercages array)
 */
export interface PenpaKillerCage {
  /** Cell indices */
  cells: number[];
  /** Sum value */
  value?: number;
}

// ========================================
// Special Elements
// ========================================

/**
 * Special element types
 */
export type PenpaSpecialType =
  | 'thermo'           // Thermometer
  | 'nobulbthermo'     // Thermometer without bulb
  | 'arrows'           // Arrow constraint
  | 'direction'        // Direction indicator
  | 'squareframe'      // Square frame
  | 'polygon'          // Polygon region
  | 'freeline'         // Free-form line
  | 'freelineE';       // Free-form edge line

/**
 * Thermometer element
 */
export interface PenpaThermo {
  /** Cell indices from bulb to tip */
  cells: number[];
  /** Bulb color */
  bulbColor?: string | number;
  /** Line color */
  lineColor?: string | number;
  /** Has bulb? */
  hasBulb: boolean;
  /** Layer */
  layer: 'problem' | 'answer';
}

/**
 * Arrow element (arrow constraint)
 */
export interface PenpaArrow {
  /** Cell indices: first is circle, rest are arrow path */
  cells: number[];
  /** Circle color */
  circleColor?: string | number;
  /** Arrow color */
  arrowColor?: string | number;
  /** Layer */
  layer: 'problem' | 'answer';
}

/**
 * Directional number clue (Yajilin-style)
 * Stores a direction (0=None,1=Up,2=Down,3=Left,4=Right) and clue value on a cell.
 * For arbitrary angles, use the `angle` field (in degrees, 0=right, 90=down, etc.)
 *
 * NOTE: cellId is the primary identifier. Use parseCellIdToRowCol() to convert to row/col when needed.
 */
export interface PenpaDirectionalClue {
  id?: string;
  /** Cell ID (e.g., "cell-0-0"). Primary identifier for the clue cell. */
  cellId: string;
  /** Cell index (row * cols + col). Optional, for penpa compatibility. */
  cell?: number;
  direction: 0 | 1 | 2 | 3 | 4; // 0 = no direction (number only), legacy discrete directions
  value: number;
  color?: string;
  layer: 'problem' | 'answer';
  /** Arbitrary angle in degrees (0=right, 90=down, 180=left, 270=up). Overrides direction if set and non-null. */
  angle?: number | null;
}

/**
 * Helper function to parse row/col from cellId
 * Returns null if cellId format is invalid
 */
export function parseCellIdToRowCol(cellId: string): { row: number; col: number } | null {
  const match = cellId.match(/^cell-(\d+)-(\d+)$/);
  if (!match) return null;
  return { row: parseInt(match[1], 10), col: parseInt(match[2], 10) };
}

/**
 * Direction indicator element
 */
export interface PenpaDirection {
  /** Cell index */
  cell: number;
  /** Direction angle (degrees) */
  angle: number;
  /** Color */
  color?: string | number;
  /** Layer */
  layer: 'problem' | 'answer';
}

/**
 * Polygon element
 */
export interface PenpaPolygon {
  /** Vertex indices defining the polygon */
  vertices: number[];
  /** Fill color */
  fillColor?: string | number;
  /** Stroke color */
  strokeColor?: string | number;
  /** Layer */
  layer: 'problem' | 'answer';
}

/**
 * Square frame element
 */
export interface PenpaSquareFrame {
  /** Cell indices defining the frame */
  cells: number[];
  /** Frame color */
  color?: string | number;
  /** Layer */
  layer: 'problem' | 'answer';
}

// ========================================
// Extended Symbol Types
// ========================================

/**
 * Penpa symbol categories
 */
export enum PenpaSymbolCategory {
  /** Basic shapes */
  SHAPE = 'shape',
  /** Battleship symbols */
  BATTLESHIP = 'battleship',
  /** Mathematical symbols */
  MATH = 'math',
  /** Arrows */
  ARROW = 'arrow',
  /** Special symbols */
  SPECIAL = 'special',
}

/**
 * Extended symbol type definitions
 */
export const PENPA_SYMBOLS = {
  // Basic shapes
  circle_L: { category: 'shape', name: 'Large Circle' },
  circle_M: { category: 'shape', name: 'Medium Circle' },
  circle_S: { category: 'shape', name: 'Small Circle' },
  circle_SS: { category: 'shape', name: 'Extra Small Circle' },
  square_L: { category: 'shape', name: 'Large Square' },
  square_M: { category: 'shape', name: 'Medium Square' },
  square_S: { category: 'shape', name: 'Small Square' },
  diamond_L: { category: 'shape', name: 'Large Diamond' },
  diamond_M: { category: 'shape', name: 'Medium Diamond' },
  diamond_S: { category: 'shape', name: 'Small Diamond' },
  triangle_L: { category: 'shape', name: 'Large Triangle' },
  triangle_M: { category: 'shape', name: 'Medium Triangle' },
  triangle_S: { category: 'shape', name: 'Small Triangle' },

  // Fill variants
  circle_L_fill: { category: 'shape', name: 'Filled Large Circle' },
  circle_M_fill: { category: 'shape', name: 'Filled Medium Circle' },
  square_L_fill: { category: 'shape', name: 'Filled Large Square' },
  diamond_L_fill: { category: 'shape', name: 'Filled Large Diamond' },

  // Cross and X
  cross: { category: 'shape', name: 'Cross (+)' },
  ox: { category: 'shape', name: 'X Mark' },

  // Battleship symbols
  ship_top: { category: 'battleship', name: 'Ship Top' },
  ship_bottom: { category: 'battleship', name: 'Ship Bottom' },
  ship_left: { category: 'battleship', name: 'Ship Left' },
  ship_right: { category: 'battleship', name: 'Ship Right' },
  ship_middle_h: { category: 'battleship', name: 'Ship Middle Horizontal' },
  ship_middle_v: { category: 'battleship', name: 'Ship Middle Vertical' },
  ship_single: { category: 'battleship', name: 'Ship Single' },
  water: { category: 'battleship', name: 'Water' },

  // Arrows
  arrow_N: { category: 'arrow', name: 'Arrow North' },
  arrow_NE: { category: 'arrow', name: 'Arrow Northeast' },
  arrow_E: { category: 'arrow', name: 'Arrow East' },
  arrow_SE: { category: 'arrow', name: 'Arrow Southeast' },
  arrow_S: { category: 'arrow', name: 'Arrow South' },
  arrow_SW: { category: 'arrow', name: 'Arrow Southwest' },
  arrow_W: { category: 'arrow', name: 'Arrow West' },
  arrow_NW: { category: 'arrow', name: 'Arrow Northwest' },

  // Dice
  dice_1: { category: 'special', name: 'Dice 1' },
  dice_2: { category: 'special', name: 'Dice 2' },
  dice_3: { category: 'special', name: 'Dice 3' },
  dice_4: { category: 'special', name: 'Dice 4' },
  dice_5: { category: 'special', name: 'Dice 5' },
  dice_6: { category: 'special', name: 'Dice 6' },

  // Math symbols
  inequality_NE: { category: 'math', name: 'Inequality NE' },
  inequality_SE: { category: 'math', name: 'Inequality SE' },
  inequality_SW: { category: 'math', name: 'Inequality SW' },
  inequality_NW: { category: 'math', name: 'Inequality NW' },

  // Special
  star: { category: 'special', name: 'Star' },
  heart: { category: 'special', name: 'Heart' },
  mine: { category: 'special', name: 'Mine' },
  tent: { category: 'special', name: 'Tent' },
  tree: { category: 'special', name: 'Tree' },
  sun: { category: 'special', name: 'Sun' },
  moon: { category: 'special', name: 'Moon' },
} as const;

export type PenpaSymbolType = keyof typeof PENPA_SYMBOLS;

// ========================================
// Extended Number Types
// ========================================

/**
 * Number size variants
 */
export enum PenpaNumberSize {
  LARGE = 1,
  MEDIUM = 2,
  SMALL = 3,
  EXTRA_SMALL = 4,
}

/**
 * Number position types
 */
export enum PenpaNumberPosition {
  CENTER = 'center',
  CORNER_TL = 'corner_tl',
  CORNER_TR = 'corner_tr',
  CORNER_BL = 'corner_bl',
  CORNER_BR = 'corner_br',
  SIDE_TOP = 'side_top',
  SIDE_RIGHT = 'side_right',
  SIDE_BOTTOM = 'side_bottom',
  SIDE_LEFT = 'side_left',
  TAPA = 'tapa',  // 4-way split for Tapa puzzles
}

/**
 * Extended number element
 */
export interface PenpaNumber {
  /** Cell or point index */
  index: number;
  /** Display value */
  value: string;
  /** Size */
  size: PenpaNumberSize;
  /** Position within cell */
  position: PenpaNumberPosition;
  /** Color (Penpa color index) */
  color: number;
  /** For Tapa: values in each quadrant */
  tapaValues?: [string, string, string, string];
  /** For arrows: direction */
  arrowDirection?: number;
  /** Layer */
  layer: 'problem' | 'answer';
}

/**
 * Small number element (numberS)
 */
export interface PenpaSmallNumber {
  /** Cell index */
  index: number;
  /** Display value */
  value: string;
  /** Sub-position index (0-8 for 3x3 grid within cell) */
  subPosition: number;
  /** Color */
  color: number;
  /** Layer */
  layer: 'problem' | 'answer';
}

// ========================================
// Color Definitions (re-exported from constants)
// ========================================

import {
  PENPA_COLOR_INDEX,
  SurfaceColorPalette,
  LineColorPalette,
  SymbolColorPalette,
  getSurfaceColor,
  getLineColor,
  getSymbolColor,
} from '../constants/colors';

/**
 * Penpa color palette indices (legacy compatibility)
 * @deprecated Use SurfaceColorPalette, LineColorPalette, or SymbolColorPalette from constants/colors
 */
export const PENPA_COLORS = PENPA_COLOR_INDEX;

// Re-export new color palettes
export { SurfaceColorPalette, LineColorPalette, SymbolColorPalette };
export { getSurfaceColor, getLineColor, getSymbolColor };

/**
 * Get CSS color from Penpa color index
 */
export function getPenpaColor(colorIndex: number | string): string {
  if (typeof colorIndex === 'string') {
    return colorIndex;
  }
  return PENPA_COLORS[colorIndex] ?? '#000000';
}

// ========================================
// Conversion Utilities
// ========================================

/**
 * Convert Penpa pu_q/pu_a data to typed elements
 */
export interface PenpaElementData {
  edges: PenpaEdge[];
  walls: PenpaWall[];
  cages: PenpaCage[];
  thermos: PenpaThermo[];
  arrows: PenpaArrow[];
  directionalClues: PenpaDirectionalClue[];
  directions: PenpaDirection[];
  polygons: PenpaPolygon[];
  frames: PenpaSquareFrame[];
}

/**
 * Parse Penpa lineE data
 */
export function parseLineE(
  lineE: Record<string, number>,
  layer: 'problem' | 'answer'
): PenpaEdge[] {
  const edges: PenpaEdge[] = [];

  for (const [key, style] of Object.entries(lineE)) {
    const parsed = parseEdgeKey(key);
    if (parsed) {
      edges.push({
        from: parsed.from,
        to: parsed.to,
        style: style as PenpaLineStyle,
        layer,
      });
    }
  }

  return edges;
}

/**
 * Parse Penpa wall data
 */
export function parseWalls(
  walls: Record<string, number>,
  layer: 'problem' | 'answer'
): PenpaWall[] {
  const result: PenpaWall[] = [];

  for (const [key, style] of Object.entries(walls)) {
    const parsed = parseWallKey(key);
    if (parsed) {
      result.push({
        cell1: parsed.cell1,
        cell2: parsed.cell2,
        style: style as PenpaLineStyle,
        layer,
      });
    }
  }

  return result;
}

/**
 * Parse Penpa thermo data
 */
export function parseThermos(
  thermos: number[][],
  layer: 'problem' | 'answer',
  hasBulb: boolean = true
): PenpaThermo[] {
  return thermos.map((cells) => ({
    cells,
    hasBulb,
    layer,
  }));
}

/**
 * Parse Penpa arrows data
 */
export function parseArrows(
  arrows: number[][],
  layer: 'problem' | 'answer'
): PenpaArrow[] {
  return arrows.map((cells) => ({
    cells,
    layer,
  }));
}
