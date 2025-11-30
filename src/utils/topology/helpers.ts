/**
 * Topology Helpers
 *
 * Common helper functions for topology calculations.
 */

import type { Point } from '../../types';

/** Square root of 3 */
export const SQRT3 = Math.sqrt(3);

/** Height factor for equilateral triangle (sqrt(3)/2) */
export const TRI_HEIGHT_FACTOR = SQRT3 / 2;

/**
 * Calculate the centroid (center of mass) of a polygon.
 *
 * @param vertices Array of vertex positions
 * @returns Center point
 */
export function calculateCentroid(vertices: Point[]): Point {
  if (vertices.length === 0) return { x: 0, y: 0 };
  const sum = vertices.reduce(
    (acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y }),
    { x: 0, y: 0 }
  );
  return { x: sum.x / vertices.length, y: sum.y / vertices.length };
}

/**
 * Generate vertices of a regular polygon.
 *
 * @param centerX Center X coordinate
 * @param centerY Center Y coordinate
 * @param radius Distance from center to vertices
 * @param sides Number of sides
 * @param startAngle Starting angle in radians (default: 0, pointing right)
 * @returns Array of vertex positions
 */
export function regularPolygonVertices(
  centerX: number,
  centerY: number,
  radius: number,
  sides: number,
  startAngle: number = 0
): Point[] {
  const vertices: Point[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = startAngle + (2 * Math.PI * i) / sides;
    vertices.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    });
  }
  return vertices;
}

/**
 * Check if a triangle at position (row, col) points upward in a triangular grid.
 *
 * @param row Row index
 * @param col Column index
 * @returns true if triangle points upward
 */
export function isUpwardTriangle(row: number, col: number): boolean {
  return (row + col) % 2 === 0;
}

/**
 * Rotate a point around an origin.
 *
 * @param point Point to rotate
 * @param angle Rotation angle in radians
 * @param origin Origin point (default: {0, 0})
 * @returns Rotated point
 */
export function rotatePoint(
  point: Point,
  angle: number,
  origin: Point = { x: 0, y: 0 }
): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  };
}

/**
 * Scale a point relative to an origin.
 *
 * @param point Point to scale
 * @param scale Scale factor
 * @param origin Origin point (default: {0, 0})
 * @returns Scaled point
 */
export function scalePoint(
  point: Point,
  scale: number,
  origin: Point = { x: 0, y: 0 }
): Point {
  return {
    x: origin.x + (point.x - origin.x) * scale,
    y: origin.y + (point.y - origin.y) * scale,
  };
}

/**
 * Translate an array of points by a given offset.
 *
 * @param points Array of points
 * @param dx X offset
 * @param dy Y offset
 * @returns Translated points
 */
export function translatePoints(points: Point[], dx: number, dy: number): Point[] {
  return points.map(p => ({ x: p.x + dx, y: p.y + dy }));
}

/**
 * Check if a point is inside a polygon using ray casting algorithm.
 *
 * @param point Point to check
 * @param vertices Polygon vertices
 * @returns true if point is inside
 */
export function isPointInPolygon(point: Point, vertices: Point[]): boolean {
  if (vertices.length < 3) return false;

  let inside = false;
  const n = vertices.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = vertices[i].x;
    const yi = vertices[i].y;
    const xj = vertices[j].x;
    const yj = vertices[j].y;

    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Calculate distance between two points.
 *
 * @param p1 First point
 * @param p2 Second point
 * @returns Distance
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate midpoint between two points.
 *
 * @param p1 First point
 * @param p2 Second point
 * @returns Midpoint
 */
export function midpoint(p1: Point, p2: Point): Point {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

/**
 * Generate vertices for an equilateral triangle.
 *
 * @param centerX Center X
 * @param centerY Center Y
 * @param size Side length
 * @param pointUp true if pointing up, false if pointing down
 * @returns Array of 3 vertices
 */
export function equilateralTriangleVertices(
  centerX: number,
  centerY: number,
  size: number,
  pointUp: boolean = true
): Point[] {
  const height = size * TRI_HEIGHT_FACTOR;
  const halfSize = size / 2;

  if (pointUp) {
    return [
      { x: centerX, y: centerY - height * 2 / 3 },           // top
      { x: centerX - halfSize, y: centerY + height / 3 },    // bottom-left
      { x: centerX + halfSize, y: centerY + height / 3 },    // bottom-right
    ];
  } else {
    return [
      { x: centerX - halfSize, y: centerY - height / 3 },    // top-left
      { x: centerX + halfSize, y: centerY - height / 3 },    // top-right
      { x: centerX, y: centerY + height * 2 / 3 },           // bottom
    ];
  }
}

/**
 * Generate vertices for a regular hexagon (pointy-top orientation).
 *
 * @param centerX Center X
 * @param centerY Center Y
 * @param size Distance from center to vertex
 * @returns Array of 6 vertices
 */
export function hexagonVertices(
  centerX: number,
  centerY: number,
  size: number
): Point[] {
  // Pointy-top: start from top vertex
  return regularPolygonVertices(centerX, centerY, size, 6, -Math.PI / 2);
}

/**
 * Generate vertices for a square.
 *
 * @param centerX Center X
 * @param centerY Center Y
 * @param size Side length
 * @param rotation Rotation angle in radians (default: 0)
 * @returns Array of 4 vertices
 */
export function squareVertices(
  centerX: number,
  centerY: number,
  size: number,
  rotation: number = 0
): Point[] {
  const halfSize = size / 2;
  const corners: Point[] = [
    { x: centerX - halfSize, y: centerY - halfSize },  // top-left
    { x: centerX + halfSize, y: centerY - halfSize },  // top-right
    { x: centerX + halfSize, y: centerY + halfSize },  // bottom-right
    { x: centerX - halfSize, y: centerY + halfSize },  // bottom-left
  ];

  if (rotation !== 0) {
    const origin = { x: centerX, y: centerY };
    return corners.map(p => rotatePoint(p, rotation, origin));
  }

  return corners;
}

/**
 * Generate vertices for a regular octagon.
 *
 * @param centerX Center X
 * @param centerY Center Y
 * @param size Distance from center to vertex
 * @returns Array of 8 vertices
 */
export function octagonVertices(
  centerX: number,
  centerY: number,
  size: number
): Point[] {
  // Start with flat top
  return regularPolygonVertices(centerX, centerY, size, 8, -Math.PI / 8);
}

/**
 * Generate vertices for a regular dodecagon (12-sided polygon).
 *
 * @param centerX Center X
 * @param centerY Center Y
 * @param size Distance from center to vertex
 * @returns Array of 12 vertices
 */
export function dodecagonVertices(
  centerX: number,
  centerY: number,
  size: number
): Point[] {
  return regularPolygonVertices(centerX, centerY, size, 12, -Math.PI / 12);
}
