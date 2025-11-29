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
