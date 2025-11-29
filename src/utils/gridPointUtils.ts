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
