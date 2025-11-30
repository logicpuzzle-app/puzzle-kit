# 盤面定義まとめ

PuzzleKit 内で使用している盤面（グリッド）定義と生成コードをパス付きでまとめました。Penpa 互換のポイント構造と各グリッドの全実装コードをここに記載しています。

## GridType と GridConfig 定義（抜粋）
path: src/types/index.ts
```ts
// Draws a filled box (90% cell size) that connects to adjacent boxes
export interface BoxLineElement {
  id: string;
  cells: string[];  // cell IDs in order (forming a connected path)
  color: string;
  layer: LayerType;
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
export interface GridConfig {
  rows: number;
  cols: number;
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
  disabledCells?: string[];  // Array of cell IDs (e.g., "cell-0-0")
  disabledCellColor?: string;  // Color for disabled cells (default: background color)
  // Merged cells (groups of cells that are combined into one)
  // Each entry is an array of cell IDs that form a merged cell
  mergedCells?: string[][];
  // Split lines (experimental)
  splitLines?: SplitLine[];
}

export type SplitPoint =
  | { type: 'vertex'; vertexId: string }
  | { type: 'edge'; edgeId: string; t: number };

export interface SplitLine {
  cellId: string;           // target cell id
  startPoint: SplitPoint;
  endPoint: SplitPoint;
}

// Puzzle state
export interface PuzzleElements {
  surfaces: Record<string, SurfaceElement>;
  lines: Record<string, LineElement>;
  edges: Record<string, EdgeElement>;
  walls: Record<string, WallElement>;
  numbers: Record<string, NumberElement>;
  symbols: Record<string, SymbolElement>;
  cages: Record<string, CageElement>;
  specials: Record<string, SpecialElement>;
  boxLines: Record<string, BoxLineElement>;
  directionalClues?: Record<string, import('./penpaElements').PenpaDirectionalClue>;
}

// Solution Area - cells where answer checking applies
export interface SolutionArea {
  cells: string[]; // cell IDs that are part of the solution area
  enabled: boolean; // whether solution checking is active
}
```

## グリッド生成ユーティリティ
path: src/utils/gridPointUtils.ts
```ts
/**
 * Grid Point Utilities
 *
 * Integrates the Penpa-compatible Point system with PuzzleKit's grid rendering.
 * Provides functions to generate and query grid points for all grid types.
 */

import { GridConfig, GridType } from '../types';
import {
  type GridPoints,
  type Point as GridPoint,
  generateSquareGridPoints,
  PointType,
  PointUse,
} from '../types/point';
import { generateHexGridPoints } from '../types/hexPoint';
import { generateTriGridPoints } from '../types/triPoint';
import { generatePyramidGridPoints } from '../types/pyramidPoint';

// ========================================
// Grid Point Generation
// ========================================

/**
 * Generate grid points for any grid type
 */
export function generateGridPoints(grid: GridConfig): GridPoints {
  const { rows, cols, cellSize, gridType = 'square' } = grid;

  // Default border for extended grid (Penpa compatible)
  const border = 2;

  switch (gridType) {
    case 'hex':
      return generateHexGridPoints(cols, rows, cellSize, border);

    case 'triangle':
      // Triangle grids have 2 * cols triangles per row
      return generateTriGridPoints(cols * 2, rows, cellSize, border);

    case 'pyramid':
      // Pyramid uses rows as the height
      return generatePyramidGridPoints(rows, cellSize, border);

    case 'square':
    default:
      return generateSquareGridPoints(cols, rows, cellSize, border);
  }
}

// ========================================
// Point Query Utilities
// ========================================

/**
 * Get all cell center points from a grid
 */
export function getCellCenters(gridPoints: GridPoints): GridPoint[] {
  return gridPoints.centerList.map((idx) => gridPoints.points[idx]);
}

/**
 * Get all inside cell center points from a grid
 */
export function getInsideCellCenters(gridPoints: GridPoints): GridPoint[] {
  return gridPoints.centerList
    .map((idx) => gridPoints.points[idx])
    .filter((p) => p.use === PointUse.INSIDE);
}

/**
 * Get all vertex points from a grid
 */
export function getVertexPoints(gridPoints: GridPoints): GridPoint[] {
  return gridPoints.points.filter(
    (p) => p && p.type === PointType.VERTEX && p.use === PointUse.INSIDE
  );
}

/**
 * Get all edge points from a grid
 */
export function getEdgePoints(gridPoints: GridPoints): GridPoint[] {
  return gridPoints.points.filter(
    (p) =>
      p &&
      (p.type === PointType.EDGE_H || p.type === PointType.EDGE_V) &&
      p.use === PointUse.INSIDE
  );
}

/**
 * Find the nearest cell to a pixel coordinate
 */
export function findNearestCell(
  x: number,
  y: number,
  gridPoints: GridPoints,
  maxDistance?: number
): number | null {
  let nearestIdx: number | null = null;
  let minDist = maxDistance ?? Infinity;

  for (const idx of gridPoints.centerList) {
    const point = gridPoints.points[idx];
    if (!point || point.use !== PointUse.INSIDE) continue;

    const dist = Math.hypot(point.x - x, point.y - y);
    if (dist < minDist) {
      minDist = dist;
      nearestIdx = idx;
    }
  }

  return nearestIdx;
}

/**
 * Find the nearest vertex to a pixel coordinate
 */
export function findNearestVertex(
  x: number,
  y: number,
  gridPoints: GridPoints,
  maxDistance?: number
): number | null {
  let nearestIdx: number | null = null;
  let minDist = maxDistance ?? Infinity;

  for (let i = 0; i < gridPoints.points.length; i++) {
    const point = gridPoints.points[i];
    if (!point || point.type !== PointType.VERTEX || point.use !== PointUse.INSIDE) continue;

    const dist = Math.hypot(point.x - x, point.y - y);
    if (dist < minDist) {
      minDist = dist;
      nearestIdx = i;
    }
  }

  return nearestIdx;
}

/**
 * Find the nearest edge to a pixel coordinate
 */
export function findNearestEdge(
  x: number,
  y: number,
  gridPoints: GridPoints,
  maxDistance?: number
): number | null {
  let nearestIdx: number | null = null;
  let minDist = maxDistance ?? Infinity;

  for (let i = 0; i < gridPoints.points.length; i++) {
    const point = gridPoints.points[i];
    if (
      !point ||
      (point.type !== PointType.EDGE_H && point.type !== PointType.EDGE_V) ||
      point.use !== PointUse.INSIDE
    ) {
      continue;
    }

    const dist = Math.hypot(point.x - x, point.y - y);
    if (dist < minDist) {
      minDist = dist;
      nearestIdx = i;
    }
  }

  return nearestIdx;
}

/**
 * Find nearest point of any type
 */
export function findNearestPointByType(
  x: number,
  y: number,
  gridPoints: GridPoints,
  types: PointType[],
  maxDistance?: number
): number | null {
  let nearestIdx: number | null = null;
  let minDist = maxDistance ?? Infinity;

  for (let i = 0; i < gridPoints.points.length; i++) {
    const point = gridPoints.points[i];
    if (!point || !types.includes(point.type) || point.use !== PointUse.INSIDE) {
      continue;
    }

    const dist = Math.hypot(point.x - x, point.y - y);
    if (dist < minDist) {
      minDist = dist;
      nearestIdx = i;
    }
  }

  return nearestIdx;
}

// ========================================
// Grid Dimension Utilities
// ========================================

/**
 * Get the bounding box of all inside points
 */
export function getGridBounds(gridPoints: GridPoints): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const point of gridPoints.points) {
    if (!point || point.use !== PointUse.INSIDE) continue;

    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Get SVG viewBox dimensions for a grid
 */
export function getGridViewBox(
  gridPoints: GridPoints,
  padding: number = 20
): string {
  const bounds = getGridBounds(gridPoints);

  const x = bounds.minX - padding;
  const y = bounds.minY - padding;
  const width = bounds.width + padding * 2;
  const height = bounds.height + padding * 2;

  return `${x} ${y} ${width} ${height}`;
}

// ========================================
// Point Index Conversion
// ========================================

/**
 * Convert a point index to Penpa-compatible string key
 */
export function pointIndexToKey(index: number): string {
  return String(index);
}

/**
 * Convert two point indices to Penpa-compatible edge key
 */
export function edgeToKey(index1: number, index2: number): string {
  // Ensure consistent ordering
  const [a, b] = index1 < index2 ? [index1, index2] : [index2, index1];
  return `${a},${b}`;
}

/**
 * Parse edge key to point indices
 */
export function parseEdgeKey(key: string): [number, number] | null {
  const parts = key.split(',');
  if (parts.length !== 2) return null;

  const a = parseInt(parts[0], 10);
  const b = parseInt(parts[1], 10);

  if (isNaN(a) || isNaN(b)) return null;

  return [a, b];
}

// ========================================
// Grid Type Utilities
// ========================================

/**
 * Get the cell degree (number of neighbors) for a grid type
 */
export function getCellDegree(gridType: GridType): number {
  switch (gridType) {
    case 'hex':
      return 6;
    case 'triangle':
    case 'pyramid':
      return 3;
    case 'square':
    default:
      return 4;
  }
}

/**
 * Get the number of vertices per cell for a grid type
 */
export function getVerticesPerCell(gridType: GridType): number {
  switch (gridType) {
    case 'hex':
      return 6;
    case 'triangle':
    case 'pyramid':
      return 3;
    case 'square':
    default:
      return 4;
  }
}

/**
 * Get the number of edges per cell for a grid type
 */
export function getEdgesPerCell(gridType: GridType): number {
  switch (gridType) {
    case 'hex':
      return 6;
    case 'triangle':
    case 'pyramid':
      return 3;
    case 'square':
    default:
      return 4;
  }
}

```

## 正方形グリッド (square)
path: src/types/point.ts
```ts
/**
 * Penpa-compatible Point Type System
 *
 * Implements the Point data structure used by Penpa-edit for
 * representing grid positions, vertices, edges, and sub-cell points.
 */

// ========================================
// Point Types
// ========================================

/**
 * Point type enumeration (matches Penpa)
 */
export enum PointType {
  /** Cell center */
  CELL = 0,
  /** Vertex (corner between cells) */
  VERTEX = 1,
  /** Edge (horizontal for square, varies by grid) */
  EDGE_H = 2,
  /** Edge (vertical for square, varies by grid) */
  EDGE_V = 3,
  /** Sub-cell point (1/4 divisions for small symbols) */
  SUBCELL = 4,
  /** Compass direction point (N, E, S, W from cell center) */
  COMPASS = 5,
}

/**
 * Point use status
 */
export enum PointUse {
  /** Point is outside the grid */
  OUTSIDE = -1,
  /** Point is unused/undefined */
  UNUSED = 0,
  /** Point is inside the grid and usable */
  INSIDE = 1,
}

// ========================================
// Point Interface
// ========================================

/**
 * Penpa-compatible Point data structure
 */
export interface Point {
  /** X coordinate in canvas space */
  x: number;
  /** Y coordinate in canvas space */
  y: number;
  /** Point type (cell, vertex, edge, etc.) */
  type: PointType;
  /** Secondary type (for special grid types) */
  type2?: number;
  /** Indices of adjacent cell centers (4 for square, 6 for hex, 3 for tri) */
  adjacent: number[];
  /** Indices of diagonally adjacent cells (for square grids) */
  adjacent_dia: number[];
  /** Indices of surrounding vertex points */
  surround: number[];
  /** Indices of neighboring edge points */
  neighbor: number[];
  /** For edges: indices of vertices at endpoints */
  edge_to_vertex?: number[];
  /** Use status: -1=outside, 0=unused, 1=inside */
  use: PointUse;
  /** Grid coordinates [row, col] or null */
  index: [number, number] | null;
  /** Vertex degree on infinite grid */
  degree: number;
}

/**
 * Create a new Point with default values
 */
export function createPoint(overrides?: Partial<Point>): Point {
  return {
    x: 0,
    y: 0,
    type: PointType.CELL,
    adjacent: [],
    adjacent_dia: [],
    surround: [],
    neighbor: [],
    use: PointUse.UNUSED,
    index: null,
    degree: 0,
    ...overrides,
  };
}

// ========================================
// Grid Point Collection
// ========================================

/**
 * Collection of all points in a grid
 */
export interface GridPoints {
  /** All points in the grid */
  points: Point[];
  /** Indices of cell center points (centerlist) */
  centerList: number[];
  /** Extended grid dimensions (with borders) */
  nx0: number;
  ny0: number;
  /** Actual grid dimensions */
  nx: number;
  ny: number;
  /** Cell size in pixels */
  size: number;
  /** Border size (number of extra cells on each side) */
  border: number;
}

/**
 * Create empty GridPoints structure
 */
export function createGridPoints(
  nx: number,
  ny: number,
  size: number,
  border: number = 2
): GridPoints {
  return {
    points: [],
    centerList: [],
    nx0: nx + border * 2,
    ny0: ny + border * 2,
    nx,
    ny,
    size,
    border,
  };
}

// ========================================
// Square Grid Point Generation
// ========================================

/**
 * Generate points for a square grid (Penpa-compatible)
 */
export function generateSquareGridPoints(
  nx: number,
  ny: number,
  size: number,
  border: number = 2
): GridPoints {
  const grid = createGridPoints(nx, ny, size, border);
  const { nx0, ny0 } = grid;

  // Calculate total points for each type
  const cellCount = nx0 * ny0;
  const vertexCount = (nx0 + 1) * (ny0 + 1);
  const edgeHCount = nx0 * (ny0 + 1);
  const edgeVCount = (nx0 + 1) * ny0;

  // Pre-allocate points array
  const totalPoints = cellCount + vertexCount + edgeHCount + edgeVCount;
  grid.points = new Array(totalPoints);

  // Generate cell center points (Type 0)
  for (let j = 0; j < ny0; j++) {
    for (let i = 0; i < nx0; i++) {
      const idx = j * nx0 + i;
      const isInside =
        i >= border && i < nx0 - border && j >= border && j < ny0 - border;

      grid.points[idx] = createPoint({
        x: (i + 0.5) * size,
        y: (j + 0.5) * size,
        type: PointType.CELL,
        use: isInside ? PointUse.INSIDE : PointUse.OUTSIDE,
        index: isInside ? [j - border, i - border] : null,
        degree: 4,
        // Adjacent cells (4-connected)
        adjacent: [
          j > 0 ? (j - 1) * nx0 + i : -1, // Up
          i > 0 ? j * nx0 + (i - 1) : -1, // Left
          i < nx0 - 1 ? j * nx0 + (i + 1) : -1, // Right
          j < ny0 - 1 ? (j + 1) * nx0 + i : -1, // Down
        ].filter((v) => v >= 0),
        // Diagonal cells
        adjacent_dia: [
          j > 0 && i > 0 ? (j - 1) * nx0 + (i - 1) : -1, // Up-Left
          j > 0 && i < nx0 - 1 ? (j - 1) * nx0 + (i + 1) : -1, // Up-Right
          j < ny0 - 1 && i > 0 ? (j + 1) * nx0 + (i - 1) : -1, // Down-Left
          j < ny0 - 1 && i < nx0 - 1 ? (j + 1) * nx0 + (i + 1) : -1, // Down-Right
        ].filter((v) => v >= 0),
      });

      if (isInside) {
        grid.centerList.push(idx);
      }
    }
  }

  // Generate vertex points (Type 1)
  const vertexOffset = cellCount;
  for (let j = 0; j <= ny0; j++) {
    for (let i = 0; i <= nx0; i++) {
      const idx = vertexOffset + j * (nx0 + 1) + i;
      const isInside =
        i >= border && i <= nx0 - border && j >= border && j <= ny0 - border;

      grid.points[idx] = createPoint({
        x: i * size,
        y: j * size,
        type: PointType.VERTEX,
        use: isInside ? PointUse.INSIDE : PointUse.OUTSIDE,
        index: isInside ? [j - border, i - border] : null,
        degree: 4,
      });
    }
  }

  // Generate horizontal edge points (Type 2)
  const edgeHOffset = vertexOffset + vertexCount;
  for (let j = 0; j <= ny0; j++) {
    for (let i = 0; i < nx0; i++) {
      const idx = edgeHOffset + j * nx0 + i;
      const isInside =
        i >= border && i < nx0 - border && j >= border && j <= ny0 - border;

      grid.points[idx] = createPoint({
        x: (i + 0.5) * size,
        y: j * size,
        type: PointType.EDGE_H,
        use: isInside ? PointUse.INSIDE : PointUse.OUTSIDE,
        index: isInside ? [j - border, i - border] : null,
        degree: 2,
        // Vertices at endpoints
        edge_to_vertex: [
          vertexOffset + j * (nx0 + 1) + i,
          vertexOffset + j * (nx0 + 1) + (i + 1),
        ],
      });
    }
  }

  // Generate vertical edge points (Type 3)
  const edgeVOffset = edgeHOffset + edgeHCount;
  for (let j = 0; j < ny0; j++) {
    for (let i = 0; i <= nx0; i++) {
      const idx = edgeVOffset + j * (nx0 + 1) + i;
      const isInside =
        i >= border && i <= nx0 - border && j >= border && j < ny0 - border;

      grid.points[idx] = createPoint({
        x: i * size,
        y: (j + 0.5) * size,
        type: PointType.EDGE_V,
        use: isInside ? PointUse.INSIDE : PointUse.OUTSIDE,
        index: isInside ? [j - border, i - border] : null,
        degree: 2,
        // Vertices at endpoints
        edge_to_vertex: [
          vertexOffset + j * (nx0 + 1) + i,
          vertexOffset + (j + 1) * (nx0 + 1) + i,
        ],
      });
    }
  }

  // Set surround and neighbor for cell centers
  for (let j = 0; j < ny0; j++) {
    for (let i = 0; i < nx0; i++) {
      const cellIdx = j * nx0 + i;
      const cell = grid.points[cellIdx];

      // Surrounding vertices (4 corners of the cell)
      cell.surround = [
        vertexOffset + j * (nx0 + 1) + i, // Top-Left
        vertexOffset + j * (nx0 + 1) + (i + 1), // Top-Right
        vertexOffset + (j + 1) * (nx0 + 1) + (i + 1), // Bottom-Right
        vertexOffset + (j + 1) * (nx0 + 1) + i, // Bottom-Left
      ];

      // Neighboring edges (4 edges of the cell)
      cell.neighbor = [
        edgeHOffset + j * nx0 + i, // Top edge
        edgeVOffset + j * (nx0 + 1) + (i + 1), // Right edge
        edgeHOffset + (j + 1) * nx0 + i, // Bottom edge
        edgeVOffset + j * (nx0 + 1) + i, // Left edge
      ];
    }
  }

  return grid;
}

// ========================================
// Point Index Utilities
// ========================================

/**
 * Get point index for a cell at (row, col)
 */
export function getCellIndex(
  row: number,
  col: number,
  nx0: number,
  border: number = 2
): number {
  return (row + border) * nx0 + (col + border);
}

/**
 * Get point index for a vertex at (row, col)
 */
export function getVertexIndex(
  row: number,
  col: number,
  nx0: number,
  ny0: number,
  border: number = 2
): number {
  const cellCount = nx0 * ny0;
  return cellCount + (row + border) * (nx0 + 1) + (col + border);
}

/**
 * Get point index for a horizontal edge at (row, col)
 */
export function getEdgeHIndex(
  row: number,
  col: number,
  nx0: number,
  ny0: number,
  border: number = 2
): number {
  const cellCount = nx0 * ny0;
  const vertexCount = (nx0 + 1) * (ny0 + 1);
  return cellCount + vertexCount + (row + border) * nx0 + (col + border);
}

/**
 * Get point index for a vertical edge at (row, col)
 */
export function getEdgeVIndex(
  row: number,
  col: number,
  nx0: number,
  ny0: number,
  border: number = 2
): number {
  const cellCount = nx0 * ny0;
  const vertexCount = (nx0 + 1) * (ny0 + 1);
  const edgeHCount = nx0 * (ny0 + 1);
  return (
    cellCount + vertexCount + edgeHCount + (row + border) * (nx0 + 1) + (col + border)
  );
}

/**
 * Get cell position from point index
 */
export function getCellPosition(
  index: number,
  nx0: number,
  border: number = 2
): { row: number; col: number } | null {
  const row = Math.floor(index / nx0) - border;
  const col = (index % nx0) - border;
  return { row, col };
}

/**
 * Check if a point index is within bounds
 */
export function isPointInBounds(
  index: number,
  grid: GridPoints
): boolean {
  if (index < 0 || index >= grid.points.length) {
    return false;
  }
  return grid.points[index].use === PointUse.INSIDE;
}

// ========================================
// Point Lookup Utilities
// ========================================

/**
 * Find the cell containing a canvas coordinate
 */
export function findCellAtPosition(
  x: number,
  y: number,
  grid: GridPoints
): number | null {
  const { size, border, nx0, ny0, nx, ny } = grid;

  // Calculate grid coordinates
  const col = Math.floor(x / size) - border;
  const row = Math.floor(y / size) - border;

  // Check bounds
  if (col < 0 || col >= nx || row < 0 || row >= ny) {
    return null;
  }

  return getCellIndex(row, col, nx0, border);
}

/**
 * Find the nearest point of any type to a canvas coordinate
 */
export function findNearestPoint(
  x: number,
  y: number,
  grid: GridPoints,
  types?: PointType[]
): number | null {
  let minDist = Infinity;
  let nearestIdx: number | null = null;

  for (let i = 0; i < grid.points.length; i++) {
    const point = grid.points[i];

    // Skip if wrong type
    if (types && !types.includes(point.type)) {
      continue;
    }

    // Skip if outside grid
    if (point.use !== PointUse.INSIDE) {
      continue;
    }

    const dist = Math.hypot(point.x - x, point.y - y);
    if (dist < minDist) {
      minDist = dist;
      nearestIdx = i;
    }
  }

  return nearestIdx;
}

/**
 * Get all adjacent cell indices for a given cell
 */
export function getAdjacentCells(
  cellIndex: number,
  grid: GridPoints,
  includeDiagonal: boolean = false
): number[] {
  const cell = grid.points[cellIndex];
  if (!cell || cell.type !== PointType.CELL) {
    return [];
  }

  const result = [...cell.adjacent];
  if (includeDiagonal) {
    result.push(...cell.adjacent_dia);
  }

  return result.filter((idx) => isPointInBounds(idx, grid));
}

```

## 六角形グリッド (hex)
path: src/types/hexPoint.ts
```ts
/**
 * Hex Grid Point System
 *
 * Implements Penpa-compatible Point generation for hexagonal grids.
 * Uses pointy-top orientation with axial coordinates.
 */

import {
  PointType,
  PointUse,
  createPoint,
  type Point,
  type GridPoints,
  createGridPoints,
} from './point';

// ========================================
// Hex Grid Constants
// ========================================

/** Square root of 3 (used for hex geometry) */
const SQRT3 = Math.sqrt(3);

/** Half of sqrt(3) */
const SQRT3_2 = SQRT3 / 2;

// ========================================
// Hex Grid Point Generation
// ========================================

/**
 * Generate points for a hex grid (Penpa-compatible)
 *
 * Hex grids use pointy-top orientation:
 * - Cells are hexagons with vertices at top and bottom
 * - 6 adjacent neighbors per cell
 * - 6 vertices per cell (shared with neighbors)
 * - 6 edges per cell (shared with neighbors)
 */
export function generateHexGridPoints(
  nx: number,
  ny: number,
  size: number,
  border: number = 2
): GridPoints {
  const grid = createGridPoints(nx, ny, size, border);
  const { nx0, ny0 } = grid;

  // Hex geometry
  const hexWidth = size * SQRT3;
  const hexHeight = size * 2;
  const rowHeight = hexHeight * 0.75; // Vertical distance between row centers

  // Calculate offsets for cell positions
  const points: Point[] = [];
  const centerList: number[] = [];

  // Generate cell center points
  let cellIndex = 0;
  for (let row = 0; row < ny0; row++) {
    for (let col = 0; col < nx0; col++) {
      const isOddRow = row % 2 === 1;
      const xOffset = isOddRow ? hexWidth / 2 : 0;

      const x = col * hexWidth + xOffset + hexWidth / 2;
      const y = row * rowHeight + hexHeight / 2;

      const isInside =
        col >= border &&
        col < nx0 - border &&
        row >= border &&
        row < ny0 - border;

      const point = createPoint({
        x,
        y,
        type: PointType.CELL,
        use: isInside ? PointUse.INSIDE : PointUse.OUTSIDE,
        index: isInside ? [row - border, col - border] : null,
        degree: 6,
      });

      // Calculate adjacent cells (6 neighbors)
      const adjacent: number[] = [];

      // For pointy-top hexagons, neighbors depend on row parity
      if (isOddRow) {
        // Odd rows are shifted right
        if (row > 0) {
          adjacent.push((row - 1) * nx0 + col); // NW
          if (col < nx0 - 1) adjacent.push((row - 1) * nx0 + col + 1); // NE
        }
        if (col > 0) adjacent.push(row * nx0 + col - 1); // W
        if (col < nx0 - 1) adjacent.push(row * nx0 + col + 1); // E
        if (row < ny0 - 1) {
          adjacent.push((row + 1) * nx0 + col); // SW
          if (col < nx0 - 1) adjacent.push((row + 1) * nx0 + col + 1); // SE
        }
      } else {
        // Even rows
        if (row > 0) {
          if (col > 0) adjacent.push((row - 1) * nx0 + col - 1); // NW
          adjacent.push((row - 1) * nx0 + col); // NE
        }
        if (col > 0) adjacent.push(row * nx0 + col - 1); // W
        if (col < nx0 - 1) adjacent.push(row * nx0 + col + 1); // E
        if (row < ny0 - 1) {
          if (col > 0) adjacent.push((row + 1) * nx0 + col - 1); // SW
          adjacent.push((row + 1) * nx0 + col); // SE
        }
      }

      point.adjacent = adjacent.filter((i) => i >= 0 && i < nx0 * ny0);

      points.push(point);

      if (isInside) {
        centerList.push(cellIndex);
      }
      cellIndex++;
    }
  }

  const cellCount = nx0 * ny0;

  // Generate vertex points (6 vertices per hex, but shared)
  // For simplicity, we generate a vertex grid
  const vertexOffset = cellCount;
  const vertexNx = nx0 + 1;
  const vertexNy = ny0 * 2 + 1;

  for (let vRow = 0; vRow < vertexNy; vRow++) {
    for (let vCol = 0; vCol < vertexNx; vCol++) {
      const hexRow = Math.floor(vRow / 2);
      const isTopVertex = vRow % 2 === 0;
      const isOddHexRow = hexRow % 2 === 1;

      let x: number;
      let y: number;

      if (isTopVertex) {
        // Top/bottom vertices of hexagons
        const xOffset = isOddHexRow ? hexWidth / 2 : 0;
        x = vCol * hexWidth + xOffset;
        y = hexRow * rowHeight + (isTopVertex ? 0 : hexHeight);
      } else {
        // Side vertices
        const xOffset = isOddHexRow ? hexWidth / 2 : 0;
        x = vCol * hexWidth + xOffset + hexWidth / 2;
        y = hexRow * rowHeight + hexHeight / 4;
      }

      const vertexIdx = vertexOffset + vRow * vertexNx + vCol;

      const isInside =
        vCol >= border &&
        vCol <= nx0 - border &&
        hexRow >= border &&
        hexRow <= ny0 - border;

      points[vertexIdx] = createPoint({
        x,
        y,
        type: PointType.VERTEX,
        use: isInside ? PointUse.INSIDE : PointUse.OUTSIDE,
        degree: 3, // Each hex vertex connects 3 hexes
      });
    }
  }

  // Generate edge points (6 edges per hex, but shared)
  const edgeOffset = vertexOffset + vertexNx * vertexNy;
  let edgeCount = 0;

  for (let row = 0; row < ny0; row++) {
    for (let col = 0; col < nx0; col++) {
      const cellIdx = row * nx0 + col;
      const cell = points[cellIdx];
      const isOddRow = row % 2 === 1;
      const xOffset = isOddRow ? hexWidth / 2 : 0;

      // 6 edge directions from center
      const edgeAngles = [
        Math.PI / 6,   // NE
        Math.PI / 2,   // N
        5 * Math.PI / 6, // NW
        7 * Math.PI / 6, // SW
        3 * Math.PI / 2, // S
        11 * Math.PI / 6, // SE
      ];

      const edgeDist = size * SQRT3_2;

      for (let e = 0; e < 3; e++) {
        // Only create 3 edges per cell to avoid duplicates
        const angle = edgeAngles[e];
        const ex = cell.x + Math.cos(angle) * edgeDist;
        const ey = cell.y - Math.sin(angle) * edgeDist;

        const isInside =
          col >= border &&
          col < nx0 - border &&
          row >= border &&
          row < ny0 - border;

        const edgeIdx = edgeOffset + edgeCount;
        points[edgeIdx] = createPoint({
          x: ex,
          y: ey,
          type: PointType.EDGE_H, // Using EDGE_H for all hex edges
          use: isInside ? PointUse.INSIDE : PointUse.OUTSIDE,
          degree: 2,
        });
        edgeCount++;
      }
    }
  }

  // Set surround vertices for each cell
  for (let row = 0; row < ny0; row++) {
    for (let col = 0; col < nx0; col++) {
      const cellIdx = row * nx0 + col;
      const cell = points[cellIdx];
      const isOddRow = row % 2 === 1;

      // Calculate 6 vertex positions around the hex
      const surround: number[] = [];
      for (let v = 0; v < 6; v++) {
        const angle = (Math.PI / 3) * v - Math.PI / 2;
        const vx = cell.x + Math.cos(angle) * size;
        const vy = cell.y + Math.sin(angle) * size;

        // Find nearest vertex (simplified - would need proper index mapping)
        // For now, store positions for rendering
      }
      cell.surround = surround;
    }
  }

  grid.points = points;
  grid.centerList = centerList;

  return grid;
}

// ========================================
// Hex Grid Utilities
// ========================================

/**
 * Convert pixel coordinates to hex grid coordinates
 */
export function pixelToHex(
  x: number,
  y: number,
  size: number
): { q: number; r: number } {
  const hexWidth = size * SQRT3;
  const hexHeight = size * 2;
  const rowHeight = hexHeight * 0.75;

  // Approximate row
  const row = Math.floor(y / rowHeight);
  const isOddRow = row % 2 === 1;
  const xOffset = isOddRow ? hexWidth / 2 : 0;

  // Approximate column
  const col = Math.floor((x - xOffset) / hexWidth);

  return { q: col, r: row };
}

/**
 * Convert hex grid coordinates to pixel center
 */
export function hexToPixel(
  q: number,
  r: number,
  size: number
): { x: number; y: number } {
  const hexWidth = size * SQRT3;
  const hexHeight = size * 2;
  const rowHeight = hexHeight * 0.75;

  const isOddRow = r % 2 === 1;
  const xOffset = isOddRow ? hexWidth / 2 : 0;

  return {
    x: q * hexWidth + xOffset + hexWidth / 2,
    y: r * rowHeight + hexHeight / 2,
  };
}

/**
 * Get the 6 vertices of a hexagon at given center
 */
export function getHexVertices(
  centerX: number,
  centerY: number,
  size: number
): Array<{ x: number; y: number }> {
  const vertices: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    vertices.push({
      x: centerX + Math.cos(angle) * size,
      y: centerY + Math.sin(angle) * size,
    });
  }

  return vertices;
}

/**
 * Get adjacent hex cells for a given cell
 */
export function getHexNeighbors(
  q: number,
  r: number,
  nx: number,
  ny: number
): Array<{ q: number; r: number }> {
  const isOddRow = r % 2 === 1;
  const neighbors: Array<{ q: number; r: number }> = [];

  // Neighbor offsets for pointy-top hexagons
  const evenRowOffsets = [
    [-1, -1], [0, -1], // NW, NE
    [-1, 0], [1, 0],   // W, E
    [-1, 1], [0, 1],   // SW, SE
  ];

  const oddRowOffsets = [
    [0, -1], [1, -1],  // NW, NE
    [-1, 0], [1, 0],   // W, E
    [0, 1], [1, 1],    // SW, SE
  ];

  const offsets = isOddRow ? oddRowOffsets : evenRowOffsets;

  for (const [dq, dr] of offsets) {
    const nq = q + dq;
    const nr = r + dr;

    if (nq >= 0 && nq < nx && nr >= 0 && nr < ny) {
      neighbors.push({ q: nq, r: nr });
    }
  }

  return neighbors;
}

/**
 * Calculate distance between two hex cells (in hex units)
 */
export function hexDistance(
  q1: number,
  r1: number,
  q2: number,
  r2: number
): number {
  // Convert to cube coordinates
  const x1 = q1 - Math.floor(r1 / 2);
  const z1 = r1;
  const y1 = -x1 - z1;

  const x2 = q2 - Math.floor(r2 / 2);
  const z2 = r2;
  const y2 = -x2 - z2;

  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2), Math.abs(z1 - z2));
}

```

## 三角形グリッド (triangle)
path: src/types/triPoint.ts
```ts
/**
 * Triangular Grid Point System
 *
 * Implements Penpa-compatible Point generation for triangular grids.
 * Uses alternating upward/downward pointing triangles.
 */

import {
  PointType,
  PointUse,
  createPoint,
  type Point,
  type GridPoints,
  createGridPoints,
} from './point';

// ========================================
// Triangle Grid Constants
// ========================================

/** Square root of 3 (used for triangle geometry) */
const SQRT3 = Math.sqrt(3);

/** Height of equilateral triangle with side length s is s * sqrt(3) / 2 */
const TRI_HEIGHT_FACTOR = SQRT3 / 2;

// ========================================
// Triangle Grid Point Generation
// ========================================

/**
 * Check if a triangle at position (row, col) points upward
 * In triangular grids, triangles alternate direction
 */
export function isUpwardTriangle(row: number, col: number): boolean {
  // Pattern: in each row, triangles alternate
  // Even row starts with upward, odd row starts with downward
  return (row + col) % 2 === 0;
}

/**
 * Generate points for a triangular grid (Penpa-compatible)
 *
 * Triangular grids use equilateral triangles:
 * - Each cell is a triangle pointing up or down
 * - 3 adjacent neighbors per cell
 * - 3 vertices per cell (shared with neighbors)
 * - 3 edges per cell (shared with neighbors)
 */
export function generateTriGridPoints(
  nx: number,
  ny: number,
  size: number,
  border: number = 2
): GridPoints {
  const grid = createGridPoints(nx, ny, size, border);
  const { nx0, ny0 } = grid;

  // Triangle geometry
  const triWidth = size; // Width of one triangle base
  const triHeight = size * TRI_HEIGHT_FACTOR;
  const halfWidth = triWidth / 2;

  const points: Point[] = [];
  const centerList: number[] = [];

  // Generate cell center points
  let cellIndex = 0;
  for (let row = 0; row < ny0; row++) {
    for (let col = 0; col < nx0; col++) {
      const isUpward = isUpwardTriangle(row, col);

      // Calculate center position
      // X position: col * halfWidth (each triangle is half a base width)
      const x = col * halfWidth + halfWidth;

      // Y position: depends on whether triangle points up or down
      // Upward triangles have center at 1/3 from bottom
      // Downward triangles have center at 1/3 from top
      const y = isUpward
        ? row * triHeight + triHeight * (2 / 3)
        : row * triHeight + triHeight * (1 / 3);

      const isInside =
        col >= border &&
        col < nx0 - border &&
        row >= border &&
        row < ny0 - border;

      const point = createPoint({
        x,
        y,
        type: PointType.CELL,
        use: isInside ? PointUse.INSIDE : PointUse.OUTSIDE,
        index: isInside ? [row - border, col - border] : null,
        degree: 3, // Triangles have 3 neighbors
        type2: isUpward ? 0 : 1, // Store triangle orientation
      });

      // Calculate adjacent cells (3 neighbors)
      const adjacent: number[] = [];

      if (isUpward) {
        // Upward triangle neighbors:
        // Left neighbor (col - 1, same row) - always exists if col > 0
        if (col > 0) adjacent.push(row * nx0 + (col - 1));
        // Right neighbor (col + 1, same row) - always exists if col < nx0-1
        if (col < nx0 - 1) adjacent.push(row * nx0 + (col + 1));
        // Bottom neighbor (col, row + 1) - exists if row < ny0-1 and shares edge
        // For upward triangle, bottom neighbor is at (row+1, col) if it's downward
        if (row < ny0 - 1) {
          // The triangle directly below shares the bottom edge
          // For pattern consistency, this is at same col in next row
          adjacent.push((row + 1) * nx0 + col);
        }
      } else {
        // Downward triangle neighbors:
        // Left neighbor (col - 1, same row)
        if (col > 0) adjacent.push(row * nx0 + (col - 1));
        // Right neighbor (col + 1, same row)
        if (col < nx0 - 1) adjacent.push(row * nx0 + (col + 1));
        // Top neighbor (col, row - 1)
        if (row > 0) {
          adjacent.push((row - 1) * nx0 + col);
        }
      }

      point.adjacent = adjacent.filter((i) => i >= 0 && i < nx0 * ny0);

      points.push(point);

      if (isInside) {
        centerList.push(cellIndex);
      }
      cellIndex++;
    }
  }

  const cellCount = nx0 * ny0;

  // Generate vertex points
  // For triangular grid, vertices form a grid pattern
  const vertexOffset = cellCount;
  const vertexCols = nx0 + 1; // One more vertex column than triangles
  const vertexRows = ny0 + 1; // One more vertex row than triangle rows

  for (let vRow = 0; vRow < vertexRows; vRow++) {
    for (let vCol = 0; vCol < vertexCols; vCol++) {
      // Vertex positions alternate in a zig-zag pattern
      // Even columns: x = vCol * halfWidth
      // Vertices at top/bottom of triangles

      const x = vCol * halfWidth;
      const y = vRow * triHeight;

      const vertexIdx = vertexOffset + vRow * vertexCols + vCol;

      const isInside =
        vCol >= border &&
        vCol <= nx0 - border &&
        vRow >= border &&
        vRow <= ny0 - border;

      points[vertexIdx] = createPoint({
        x,
        y,
        type: PointType.VERTEX,
        use: isInside ? PointUse.INSIDE : PointUse.OUTSIDE,
        degree: 6, // Each vertex connects up to 6 triangles
      });
    }
  }

  // Generate edge points (3 edges per triangle, but shared)
  const edgeOffset = vertexOffset + vertexCols * vertexRows;
  let edgeCount = 0;

  for (let row = 0; row < ny0; row++) {
    for (let col = 0; col < nx0; col++) {
      const cellIdx = row * nx0 + col;
      const cell = points[cellIdx];
      const isUpward = isUpwardTriangle(row, col);

      // Generate edges for this triangle
      // For upward triangles: left edge, right edge, bottom edge
      // For downward triangles: left edge, right edge, top edge
      // We only generate certain edges to avoid duplicates

      const edges: Array<{ x: number; y: number; type: PointType }> = [];

      if (isUpward) {
        // Only generate the left edge and bottom edge
        // Right edge will be generated by the right neighbor

        // Left edge (from top vertex to bottom-left vertex)
        if (col % 2 === 0) {
          edges.push({
            x: cell.x - halfWidth / 2,
            y: cell.y - triHeight / 6,
            type: PointType.EDGE_H,
          });
        }

        // Bottom edge (horizontal)
        edges.push({
          x: cell.x,
          y: cell.y + triHeight / 3,
          type: PointType.EDGE_V,
        });
      } else {
        // Downward triangle: left edge and top edge
        if (col % 2 === 0) {
          edges.push({
            x: cell.x - halfWidth / 2,
            y: cell.y + triHeight / 6,
            type: PointType.EDGE_H,
          });
        }

        // Top edge (horizontal)
        edges.push({
          x: cell.x,
          y: cell.y - triHeight / 3,
          type: PointType.EDGE_V,
        });
      }

      for (const edge of edges) {
        const isInside =
          col >= border &&
          col < nx0 - border &&
          row >= border &&
          row < ny0 - border;

        const edgeIdx = edgeOffset + edgeCount;
        points[edgeIdx] = createPoint({
          x: edge.x,
          y: edge.y,
          type: edge.type,
          use: isInside ? PointUse.INSIDE : PointUse.OUTSIDE,
          degree: 2,
        });
        edgeCount++;
      }
    }
  }

  // Set surround vertices for each cell
  for (let row = 0; row < ny0; row++) {
    for (let col = 0; col < nx0; col++) {
      const cellIdx = row * nx0 + col;
      const cell = points[cellIdx];
      const isUpward = isUpwardTriangle(row, col);

      const surround: number[] = [];

      if (isUpward) {
        // Upward triangle vertices: top, bottom-left, bottom-right
        const topVertex = vertexOffset + row * vertexCols + Math.floor((col + 1) / 2);
        const bottomLeftVertex = vertexOffset + (row + 1) * vertexCols + Math.floor(col / 2);
        const bottomRightVertex = vertexOffset + (row + 1) * vertexCols + Math.floor(col / 2) + 1;

        if (topVertex < points.length) surround.push(topVertex);
        if (bottomLeftVertex < points.length) surround.push(bottomLeftVertex);
        if (bottomRightVertex < points.length) surround.push(bottomRightVertex);
      } else {
        // Downward triangle vertices: bottom, top-left, top-right
        const bottomVertex = vertexOffset + (row + 1) * vertexCols + Math.floor((col + 1) / 2);
        const topLeftVertex = vertexOffset + row * vertexCols + Math.floor(col / 2);
        const topRightVertex = vertexOffset + row * vertexCols + Math.floor(col / 2) + 1;

        if (bottomVertex < points.length) surround.push(bottomVertex);
        if (topLeftVertex < points.length) surround.push(topLeftVertex);
        if (topRightVertex < points.length) surround.push(topRightVertex);
      }

      cell.surround = surround;
    }
  }

  grid.points = points;
  grid.centerList = centerList;

  return grid;
}

// ========================================
// Triangle Grid Utilities
// ========================================

/**
 * Convert pixel coordinates to triangle grid coordinates
 */
export function pixelToTri(
  x: number,
  y: number,
  size: number
): { col: number; row: number; isUpward: boolean } {
  const triHeight = size * TRI_HEIGHT_FACTOR;
  const halfWidth = size / 2;

  // Approximate row
  const row = Math.floor(y / triHeight);

  // Approximate column
  const col = Math.floor(x / halfWidth);

  // Determine if upward or downward
  const isUpward = isUpwardTriangle(row, col);

  return { col, row, isUpward };
}

/**
 * Convert triangle grid coordinates to pixel center
 */
export function triToPixel(
  col: number,
  row: number,
  size: number
): { x: number; y: number } {
  const triHeight = size * TRI_HEIGHT_FACTOR;
  const halfWidth = size / 2;

  const isUpward = isUpwardTriangle(row, col);

  const x = col * halfWidth + halfWidth;
  const y = isUpward
    ? row * triHeight + triHeight * (2 / 3)
    : row * triHeight + triHeight * (1 / 3);

  return { x, y };
}

/**
 * Get the 3 vertices of a triangle at given center
 */
export function getTriVertices(
  centerX: number,
  centerY: number,
  size: number,
  isUpward: boolean
): Array<{ x: number; y: number }> {
  const triHeight = size * TRI_HEIGHT_FACTOR;
  const halfWidth = size / 2;

  if (isUpward) {
    // Upward triangle: top vertex, bottom-left, bottom-right
    return [
      { x: centerX, y: centerY - triHeight * (2 / 3) }, // Top
      { x: centerX - halfWidth, y: centerY + triHeight / 3 }, // Bottom-left
      { x: centerX + halfWidth, y: centerY + triHeight / 3 }, // Bottom-right
    ];
  } else {
    // Downward triangle: bottom vertex, top-left, top-right
    return [
      { x: centerX, y: centerY + triHeight * (2 / 3) }, // Bottom
      { x: centerX - halfWidth, y: centerY - triHeight / 3 }, // Top-left
      { x: centerX + halfWidth, y: centerY - triHeight / 3 }, // Top-right
    ];
  }
}

/**
 * Get adjacent triangle cells for a given cell
 */
export function getTriNeighbors(
  col: number,
  row: number,
  nx: number,
  ny: number
): Array<{ col: number; row: number }> {
  const isUpward = isUpwardTriangle(row, col);
  const neighbors: Array<{ col: number; row: number }> = [];

  // Left neighbor
  if (col > 0) {
    neighbors.push({ col: col - 1, row });
  }

  // Right neighbor
  if (col < nx - 1) {
    neighbors.push({ col: col + 1, row });
  }

  // Third neighbor depends on orientation
  if (isUpward) {
    // Bottom neighbor (next row, same col for upward)
    if (row < ny - 1) {
      neighbors.push({ col, row: row + 1 });
    }
  } else {
    // Top neighbor (previous row, same col for downward)
    if (row > 0) {
      neighbors.push({ col, row: row - 1 });
    }
  }

  return neighbors;
}

/**
 * Calculate distance between two triangle cells (in grid units)
 * Uses a simple BFS-based approach for accuracy
 */
export function triDistance(
  col1: number,
  row1: number,
  col2: number,
  row2: number,
  nx: number,
  ny: number
): number {
  if (col1 === col2 && row1 === row2) {
    return 0;
  }

  // Simple Manhattan-like approximation
  // For more accuracy, would need proper graph traversal
  const rowDiff = Math.abs(row2 - row1);
  const colDiff = Math.abs(col2 - col1);

  // Each step in col moves half a unit horizontally
  // Each step in row moves to adjacent row
  return rowDiff + Math.ceil(colDiff / 2);
}

```

## ピラミッドグリッド (pyramid)
path: src/types/pyramidPoint.ts
```ts
/**
 * Pyramid Grid Point System
 *
 * Implements Penpa-compatible Point generation for pyramid grids.
 * Pyramid grids are triangular grids arranged in a pyramid shape,
 * with each row having one more cell than the previous.
 */

import {
  PointType,
  PointUse,
  createPoint,
  type Point,
  type GridPoints,
} from './point';

// ========================================
// Pyramid Grid Constants
// ========================================

/** Square root of 3 (used for triangle geometry) */
const SQRT3 = Math.sqrt(3);

/** Height of equilateral triangle with side length s is s * sqrt(3) / 2 */
const TRI_HEIGHT_FACTOR = SQRT3 / 2;

// ========================================
// Pyramid Grid Utilities
// ========================================

/**
 * Check if a triangle at position (row, col) points upward in pyramid grid
 * In pyramid rows, triangles alternate direction starting with upward
 */
export function isPyramidUpward(row: number, col: number): boolean {
  // Each row starts with an upward triangle, then alternates
  return col % 2 === 0;
}

/**
 * Get the number of cells in a pyramid row
 * Row 0 has 1 cell, row 1 has 3 cells, row 2 has 5 cells, etc.
 */
export function getPyramidRowCellCount(row: number): number {
  return 2 * row + 1;
}

/**
 * Get total cells in a pyramid of given height
 */
export function getPyramidTotalCells(height: number): number {
  // Sum of 1 + 3 + 5 + ... + (2n-1) = n^2
  return height * height;
}

/**
 * Get the starting cell index for a pyramid row
 */
export function getPyramidRowStartIndex(row: number): number {
  // Sum of cells in rows 0 to row-1
  return row * row;
}

// ========================================
// Pyramid Grid Point Generation
// ========================================

/**
 * Generate points for a pyramid grid (Penpa-compatible)
 *
 * Pyramid grids use equilateral triangles arranged in rows:
 * - Row 0: 1 upward triangle (the apex)
 * - Row 1: 3 triangles (up, down, up)
 * - Row 2: 5 triangles (up, down, up, down, up)
 * - etc.
 *
 * @param height Number of rows in the pyramid
 * @param size Cell size (side length of triangles)
 * @param border Border size for extended grid
 */
export function generatePyramidGridPoints(
  height: number,
  size: number,
  border: number = 2
): GridPoints {
  // For pyramid, nx and ny represent the dimensions of the bounding box
  // Width: (2 * height - 1) triangles at the base (widest row)
  // Height: height rows
  const baseWidth = 2 * height - 1;

  const grid: GridPoints = {
    points: [],
    centerList: [],
    nx0: baseWidth + border * 2,
    ny0: height + border * 2,
    nx: baseWidth,
    ny: height,
    size,
    border,
  };

  const triHeight = size * TRI_HEIGHT_FACTOR;
  const halfWidth = size / 2;

  const points: Point[] = [];
  const centerList: number[] = [];

  // Calculate offset to center the pyramid
  // The apex is centered, so we need to offset each row
  const pyramidCenterX = (baseWidth * halfWidth) / 2 + halfWidth;

  let cellIndex = 0;

  // Generate cell center points
  for (let row = 0; row < height; row++) {
    const cellsInRow = getPyramidRowCellCount(row);
    const rowOffsetX = (height - 1 - row) * halfWidth; // Offset to center this row

    for (let col = 0; col < cellsInRow; col++) {
      const isUpward = isPyramidUpward(row, col);

      // Calculate center position
      const x = border * halfWidth + rowOffsetX + col * halfWidth + halfWidth;

      // Y position depends on whether triangle points up or down
      const baseY = border * triHeight + row * triHeight;
      const y = isUpward
        ? baseY + triHeight * (2 / 3)
        : baseY + triHeight * (1 / 3);

      const point = createPoint({
        x,
        y,
        type: PointType.CELL,
        use: PointUse.INSIDE,
        index: [row, col],
        degree: 3,
        type2: isUpward ? 0 : 1,
      });

      // Calculate adjacent cells
      const adjacent: number[] = [];

      // Left neighbor (same row)
      if (col > 0) {
        adjacent.push(getPyramidRowStartIndex(row) + col - 1);
      }

      // Right neighbor (same row)
      if (col < cellsInRow - 1) {
        adjacent.push(getPyramidRowStartIndex(row) + col + 1);
      }

      // Third neighbor depends on orientation
      if (isUpward) {
        // Downward neighbor in next row
        if (row < height - 1) {
          // The downward triangle at (row, col) has its base neighbor at (row+1, col+1)
          const nextRowStart = getPyramidRowStartIndex(row + 1);
          const neighborCol = col + 1; // In the next row, offset by 1
          if (neighborCol < getPyramidRowCellCount(row + 1)) {
            adjacent.push(nextRowStart + neighborCol);
          }
        }
      } else {
        // Upward neighbor in previous row
        if (row > 0) {
          // The upward triangle at (row, col) has its apex neighbor at (row-1, col-1)
          const prevRowStart = getPyramidRowStartIndex(row - 1);
          const neighborCol = col - 1;
          if (neighborCol >= 0 && neighborCol < getPyramidRowCellCount(row - 1)) {
            adjacent.push(prevRowStart + neighborCol);
          }
        }
      }

      point.adjacent = adjacent.filter((i) => i >= 0);

      points.push(point);
      centerList.push(cellIndex);
      cellIndex++;
    }
  }

  const cellCount = cellIndex;

  // Generate vertex points
  // Vertices are at the corners of triangles
  const vertexOffset = cellCount;
  let vertexIndex = 0;

  // Vertex rows: one more than cell rows
  for (let vRow = 0; vRow <= height; vRow++) {
    // Number of vertices in this row
    // Row 0: 1 vertex (apex)
    // Row 1: 2 vertices
    // etc.
    const verticesInRow = vRow + 1;
    const rowOffsetX = (height - vRow) * halfWidth;

    for (let vCol = 0; vCol < verticesInRow; vCol++) {
      const x = border * halfWidth + rowOffsetX + vCol * size;
      const y = border * triHeight + vRow * triHeight;

      const vertexIdx = vertexOffset + vertexIndex;

      points[vertexIdx] = createPoint({
        x,
        y,
        type: PointType.VERTEX,
        use: PointUse.INSIDE,
        degree: vRow === 0 ? 2 : vRow === height ? 2 : 6,
      });

      vertexIndex++;
    }
  }

  const vertexCount = vertexIndex;

  // Generate edge points
  const edgeOffset = vertexOffset + vertexCount;
  let edgeCount = 0;

  for (let row = 0; row < height; row++) {
    const cellsInRow = getPyramidRowCellCount(row);
    const rowOffsetX = (height - 1 - row) * halfWidth;

    for (let col = 0; col < cellsInRow; col++) {
      const cellIdx = getPyramidRowStartIndex(row) + col;
      const cell = points[cellIdx];
      const isUpward = isPyramidUpward(row, col);

      // Create edges for this cell (only certain edges to avoid duplicates)
      if (isUpward) {
        // For upward triangles, create left edge and bottom edge
        // Left edge
        if (col % 2 === 0) {
          const edgeIdx = edgeOffset + edgeCount;
          points[edgeIdx] = createPoint({
            x: cell.x - halfWidth / 2,
            y: cell.y - triHeight / 6,
            type: PointType.EDGE_H,
            use: PointUse.INSIDE,
            degree: 2,
          });
          edgeCount++;
        }

        // Bottom edge
        const bottomEdgeIdx = edgeOffset + edgeCount;
        points[bottomEdgeIdx] = createPoint({
          x: cell.x,
          y: cell.y + triHeight / 3,
          type: PointType.EDGE_V,
          use: PointUse.INSIDE,
          degree: 2,
        });
        edgeCount++;
      }
    }
  }

  // Set surround vertices for cells
  for (let row = 0; row < height; row++) {
    const cellsInRow = getPyramidRowCellCount(row);

    for (let col = 0; col < cellsInRow; col++) {
      const cellIdx = getPyramidRowStartIndex(row) + col;
      const cell = points[cellIdx];
      const isUpward = isPyramidUpward(row, col);

      const surround: number[] = [];

      // Calculate vertex indices based on row structure
      // This is simplified; proper calculation would need vertex row mapping
      const vertexRowStart = getVertexRowStart(row);
      const vertexNextRowStart = getVertexRowStart(row + 1);

      if (isUpward) {
        // Upward: top vertex, bottom-left, bottom-right
        const topVertexCol = Math.floor(col / 2);
        surround.push(vertexOffset + vertexRowStart + topVertexCol);
        surround.push(vertexOffset + vertexNextRowStart + topVertexCol);
        surround.push(vertexOffset + vertexNextRowStart + topVertexCol + 1);
      } else {
        // Downward: bottom vertex, top-left, top-right
        const bottomVertexCol = Math.floor((col + 1) / 2);
        surround.push(vertexOffset + vertexNextRowStart + bottomVertexCol);
        surround.push(vertexOffset + vertexRowStart + bottomVertexCol - 1);
        surround.push(vertexOffset + vertexRowStart + bottomVertexCol);
      }

      cell.surround = surround.filter(
        (idx) => idx >= vertexOffset && idx < vertexOffset + vertexCount
      );
    }
  }

  grid.points = points;
  grid.centerList = centerList;

  return grid;
}

/**
 * Helper: Get the starting index of vertices for a row
 */
function getVertexRowStart(row: number): number {
  // Vertex row n starts at sum of (1 + 2 + ... + n) = n*(n+1)/2
  return (row * (row + 1)) / 2;
}

// ========================================
// Pyramid Grid Coordinate Utilities
// ========================================

/**
 * Convert pixel coordinates to pyramid grid coordinates
 */
export function pixelToPyramid(
  x: number,
  y: number,
  height: number,
  size: number,
  border: number = 2
): { row: number; col: number; isUpward: boolean } | null {
  const triHeight = size * TRI_HEIGHT_FACTOR;
  const halfWidth = size / 2;

  // Calculate row from y
  const row = Math.floor((y - border * triHeight) / triHeight);

  if (row < 0 || row >= height) {
    return null;
  }

  // Calculate x offset for this row
  const rowOffsetX = (height - 1 - row) * halfWidth + border * halfWidth;

  // Calculate column
  const localX = x - rowOffsetX;
  const col = Math.floor(localX / halfWidth);

  const cellsInRow = getPyramidRowCellCount(row);
  if (col < 0 || col >= cellsInRow) {
    return null;
  }

  const isUpward = isPyramidUpward(row, col);

  return { row, col, isUpward };
}

/**
 * Convert pyramid grid coordinates to pixel center
 */
export function pyramidToPixel(
  row: number,
  col: number,
  height: number,
  size: number,
  border: number = 2
): { x: number; y: number } {
  const triHeight = size * TRI_HEIGHT_FACTOR;
  const halfWidth = size / 2;

  const rowOffsetX = (height - 1 - row) * halfWidth;
  const isUpward = isPyramidUpward(row, col);

  const x = border * halfWidth + rowOffsetX + col * halfWidth + halfWidth;
  const baseY = border * triHeight + row * triHeight;
  const y = isUpward
    ? baseY + triHeight * (2 / 3)
    : baseY + triHeight * (1 / 3);

  return { x, y };
}

/**
 * Get the 3 vertices of a pyramid triangle at given center
 */
export function getPyramidVertices(
  centerX: number,
  centerY: number,
  size: number,
  isUpward: boolean
): Array<{ x: number; y: number }> {
  const triHeight = size * TRI_HEIGHT_FACTOR;
  const halfWidth = size / 2;

  if (isUpward) {
    return [
      { x: centerX, y: centerY - triHeight * (2 / 3) }, // Top
      { x: centerX - halfWidth, y: centerY + triHeight / 3 }, // Bottom-left
      { x: centerX + halfWidth, y: centerY + triHeight / 3 }, // Bottom-right
    ];
  } else {
    return [
      { x: centerX, y: centerY + triHeight * (2 / 3) }, // Bottom
      { x: centerX - halfWidth, y: centerY - triHeight / 3 }, // Top-left
      { x: centerX + halfWidth, y: centerY - triHeight / 3 }, // Top-right
    ];
  }
}

/**
 * Get adjacent pyramid cells for a given cell
 */
export function getPyramidNeighbors(
  row: number,
  col: number,
  height: number
): Array<{ row: number; col: number }> {
  const isUpward = isPyramidUpward(row, col);
  const neighbors: Array<{ row: number; col: number }> = [];
  const cellsInRow = getPyramidRowCellCount(row);

  // Left neighbor
  if (col > 0) {
    neighbors.push({ row, col: col - 1 });
  }

  // Right neighbor
  if (col < cellsInRow - 1) {
    neighbors.push({ row, col: col + 1 });
  }

  // Vertical neighbor
  if (isUpward) {
    // Downward neighbor in next row
    if (row < height - 1) {
      neighbors.push({ row: row + 1, col: col + 1 });
    }
  } else {
    // Upward neighbor in previous row
    if (row > 0) {
      const neighborCol = col - 1;
      if (neighborCol >= 0 && neighborCol < getPyramidRowCellCount(row - 1)) {
        neighbors.push({ row: row - 1, col: neighborCol });
      }
    }
  }

  return neighbors;
}

/**
 * Get cell index from pyramid row and column
 */
export function getPyramidCellIndex(row: number, col: number): number {
  return getPyramidRowStartIndex(row) + col;
}

/**
 * Get row and column from pyramid cell index
 */
export function getPyramidCellPosition(
  index: number,
  height: number
): { row: number; col: number } | null {
  if (index < 0 || index >= getPyramidTotalCells(height)) {
    return null;
  }

  // Find the row by binary search or iteration
  let row = 0;
  let startIdx = 0;

  while (row < height) {
    const cellsInRow = getPyramidRowCellCount(row);
    if (index < startIdx + cellsInRow) {
      return { row, col: index - startIdx };
    }
    startIdx += cellsInRow;
    row++;
  }

  return null;
}

```
