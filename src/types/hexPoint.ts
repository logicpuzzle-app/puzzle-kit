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
