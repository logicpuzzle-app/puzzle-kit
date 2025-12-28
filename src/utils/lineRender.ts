/**
 * Line Rendering Utilities
 *
 * Shared utilities for rendering lines, arrows, and highlights.
 * Used by LineLayer and FreeLineList components.
 */

import type { LineStyle, LineThickness, Point } from '../types';

/**
 * Get stroke width from line thickness setting
 */
export const getStrokeWidth = (thickness: LineThickness): number => {
  switch (thickness) {
    case 'thinnest':
      return 1;
    case 'thin':
      return 2;
    case 'normal':
      return 3;
    case 'thick':
      return 5;
    case 'thickest':
      return 8;
    default:
      return 3;
  }
};

/**
 * Get SVG stroke-dasharray from line style
 */
export const getStrokeDasharray = (style: LineStyle): string | undefined => {
  switch (style) {
    case 'dashed':
      return '8,4';
    case 'dotted':
      return '2,4';
    default:
      return undefined;
  }
};

/**
 * Arrow position calculation result
 */
export interface ArrowPoints {
  /** SVG polygon points string */
  points: string;
  /** Arrow center x coordinate */
  cx: number;
  /** Arrow center y coordinate */
  cy: number;
}

/**
 * Calculate arrow head points for a line
 * @param fromX - start x
 * @param fromY - start y
 * @param toX - end x
 * @param toY - end y
 * @param arrowSize - size of arrow head
 * @param position - 'endpoint' for end of line, 'midpoint' for middle
 * @param direction - arrow direction
 * @param tipAtEndpoint - if true, arrow tip is exactly at the endpoint (for 'both' mode)
 * @returns Arrow points for SVG polygon
 */
export const getArrowPoints = (
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  arrowSize: number,
  position: 'endpoint' | 'midpoint',
  direction: 'forward' | 'backward' = 'forward',
  tipAtEndpoint: boolean = false
): ArrowPoints => {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) return { points: '', cx: fromX, cy: fromY };

  // Normalize direction (flip if backward)
  const sign = direction === 'backward' ? -1 : 1;
  const nx = sign * dx / length;
  const ny = sign * dy / length;

  // Arrow anchor position (where we want to place the arrow)
  let anchorX: number, anchorY: number;
  if (position === 'endpoint') {
    // For backward, arrow is at start; for forward, at end
    if (direction === 'backward') {
      anchorX = fromX;
      anchorY = fromY;
    } else {
      anchorX = toX;
      anchorY = toY;
    }
  } else {
    // midpoint - this is where the arrow's center should be
    anchorX = (fromX + toX) / 2;
    anchorY = (fromY + toY) / 2;
  }

  // Arrow head vertices (triangle pointing in direction of line)
  // Triangle length is arrowSize (from base to tip)
  // For midpoint mode: centroid (center of mass) is at anchor point
  // For endpoint mode: anchor is at the center of the triangle (original behavior)
  // For tipAtEndpoint mode: tip is exactly at anchor point
  const triangleLength = arrowSize;
  let tipX: number, tipY: number, baseX: number, baseY: number;

  if (position === 'midpoint') {
    // Place centroid at anchor point
    // Triangle centroid is at 1/3 from base to tip
    // So tip is at anchor + 2/3 * length, base is at anchor - 1/3 * length
    tipX = anchorX + nx * triangleLength * (2 / 3);
    tipY = anchorY + ny * triangleLength * (2 / 3);
    baseX = anchorX - nx * triangleLength * (1 / 3);
    baseY = anchorY - ny * triangleLength * (1 / 3);
  } else if (tipAtEndpoint) {
    // tip is exactly at the endpoint (anchor), base extends inward
    tipX = anchorX;
    tipY = anchorY;
    baseX = anchorX - nx * triangleLength;
    baseY = anchorY - ny * triangleLength;
  } else {
    // endpoint mode: anchor is at center of triangle, tip extends beyond endpoint
    // This keeps the original visual appearance
    tipX = anchorX + nx * triangleLength * 0.5;
    tipY = anchorY + ny * triangleLength * 0.5;
    baseX = anchorX - nx * triangleLength * 0.5;
    baseY = anchorY - ny * triangleLength * 0.5;
  }

  // Perpendicular offset for base vertices (40% of triangle length for width)
  const perpX = -ny * triangleLength * 0.4;
  const perpY = nx * triangleLength * 0.4;

  const points = `${tipX},${tipY} ${baseX + perpX},${baseY + perpY} ${baseX - perpX},${baseY - perpY}`;
  return { points, cx: anchorX, cy: anchorY };
};

/**
 * Build SVG path data from an array of points
 */
export const buildPathFromPoints = (points: Point[]): string => {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
};

/**
 * Shorten a path at both ends (used for bidirectional arrows)
 * @param points - Array of points
 * @param shortenStart - Amount to shorten at start
 * @param shortenEnd - Amount to shorten at end
 * @returns New array of points with shortened ends
 */
export const shortenPathEnds = (
  points: Point[],
  shortenStart: number,
  shortenEnd: number
): Point[] => {
  if (points.length < 2) return points;

  const result = [...points];

  // Shorten start
  if (shortenStart > 0 && result.length >= 2) {
    const p0 = result[0];
    const p1 = result[1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > shortenStart) {
      const ratio = shortenStart / len;
      result[0] = { x: p0.x + dx * ratio, y: p0.y + dy * ratio };
    }
  }

  // Shorten end
  if (shortenEnd > 0 && result.length >= 2) {
    const lastIdx = result.length - 1;
    const pLast = result[lastIdx];
    const pPrev = result[lastIdx - 1];
    const dx = pPrev.x - pLast.x;
    const dy = pPrev.y - pLast.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > shortenEnd) {
      const ratio = shortenEnd / len;
      result[lastIdx] = { x: pLast.x + dx * ratio, y: pLast.y + dy * ratio };
    }
  }

  return result;
};

/**
 * Calculate line rendering parameters for double lines
 */
export interface DoubleLineParams {
  /** Base stroke width */
  strokeWidth: number;
  /** Gap between double lines */
  doubleGap: number;
  /** Total width of the double line */
  totalWidth: number;
  /** Arrow size based on line width */
  arrowSize: number;
}

/**
 * Get rendering parameters for a line based on style and thickness
 */
export const getLineRenderParams = (
  thickness: LineThickness,
  isDouble: boolean
): DoubleLineParams => {
  const baseStrokeWidth = getStrokeWidth(thickness);
  const strokeWidth = isDouble ? Math.max(1, baseStrokeWidth * 0.5) : baseStrokeWidth;
  const doubleGap = strokeWidth * 2.5;
  const totalWidth = isDouble ? strokeWidth + doubleGap : strokeWidth;
  const arrowSize = isDouble ? totalWidth * 3 : strokeWidth * 3;

  return {
    strokeWidth,
    doubleGap,
    totalWidth,
    arrowSize,
  };
};

export { LINE_TOOL_CATEGORIES, isLineToolCategory } from './toolCategory';
