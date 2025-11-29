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
