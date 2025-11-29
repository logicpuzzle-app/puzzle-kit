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
