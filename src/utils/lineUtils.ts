/**
 * Line utility functions - common helpers for line operations
 * Extracted from useLineToolHandler for reusability and testability
 */

import type { LineStyle, LineThickness, DataLayerType } from '../types';

/**
 * Action to take on a line element
 */
export type LineAction = 'add' | 'remove' | 'replace' | 'skip';

/**
 * Line style properties
 */
export interface LineStyleProps {
  style: LineStyle;
  thickness: LineThickness;
  color: string;
}

/**
 * Determine what action to take based on existing line and input state
 *
 * Logic table:
 * | Shift | Existing | Same Color | Action  |
 * |-------|----------|------------|---------|
 * | true  | yes      | -          | remove  |
 * | true  | no       | -          | skip    |
 * | false | yes      | yes        | remove  |
 * | false | yes      | no         | replace |
 * | false | no       | -          | add     |
 *
 * @param isShiftKey - Whether shift key is pressed
 * @param existingColor - Color of existing line, or null if no line exists
 * @param targetColor - Color we want to draw with
 * @returns The action to take
 */
export function determineLineAction(
  isShiftKey: boolean,
  existingColor: string | null,
  targetColor: string
): LineAction {
  const hasExisting = existingColor !== null;
  const sameColor = existingColor === targetColor;

  if (isShiftKey) {
    return hasExisting ? 'remove' : 'skip';
  }

  if (hasExisting) {
    return sameColor ? 'remove' : 'replace';
  }

  return 'add';
}

/**
 * Determine fill mode for drag operation based on first segment
 * This is called once at the start of a drag to set the mode for the entire drag
 *
 * @param isShiftKey - Whether shift key is pressed
 * @param existingColor - Color of existing line at first segment, or null
 * @param targetColor - Color we want to draw with
 * @returns 'draw' or 'erase' mode
 */
export function determineFillMode(
  isShiftKey: boolean,
  existingColor: string | null,
  targetColor: string
): 'draw' | 'erase' {
  if (isShiftKey) {
    return 'erase';
  }
  if (existingColor === targetColor) {
    return 'erase';
  }
  return 'draw';
}

/**
 * Determine action for a segment during drag based on fill mode
 *
 * @param fillMode - Current fill mode ('draw' or 'erase')
 * @param isShiftKey - Whether shift key is pressed
 * @param existingColor - Color of existing line, or null if no line exists
 * @param targetColor - Color we want to draw with
 * @returns The action to take
 */
export function determineSegmentAction(
  fillMode: 'draw' | 'erase',
  isShiftKey: boolean,
  existingColor: string | null,
  targetColor: string
): LineAction {
  const hasExisting = existingColor !== null;

  if (fillMode === 'erase') {
    // Erase mode: only remove lines
    if (!hasExisting) return 'skip';
    // Remove if shift (any color) or same color
    if (isShiftKey || existingColor === targetColor) {
      return 'remove';
    }
    return 'skip';
  }

  // Draw mode: add or replace lines
  if (!hasExisting) {
    return 'add';
  }
  if (existingColor !== targetColor) {
    return 'replace';
  }
  // Same color already exists in draw mode - skip
  return 'skip';
}

/**
 * Create line style props from tool settings
 *
 * @param style - Line style
 * @param thickness - Line thickness
 * @param color - Line color
 * @returns LineStyleProps object
 */
export function createLineStyle(
  style: LineStyle,
  thickness: LineThickness,
  color: string
): LineStyleProps {
  return { style, thickness, color };
}

/**
 * Get color to use based on click type
 *
 * @param primaryColor - Primary color from tool settings
 * @param secondaryColor - Secondary color from tool settings
 * @param isRightClick - Whether it's a right click
 * @returns The color to use
 */
export function getClickColor(
  primaryColor: string,
  secondaryColor: string,
  isRightClick: boolean
): string {
  return isRightClick ? secondaryColor : primaryColor;
}

/**
 * Check if two grid points are orthogonally adjacent (for vertex-based edges)
 *
 * @param startId - Start vertex ID (format: vertex-row-col)
 * @param endId - End vertex ID (format: vertex-row-col)
 * @returns true if adjacent orthogonally
 */
export function areVerticesOrthogonallyAdjacent(
  startId: string,
  endId: string
): boolean {
  const startMatch = startId.match(/vertex-(\d+)-(\d+)/);
  const endMatch = endId.match(/vertex-(\d+)-(\d+)/);

  if (!startMatch || !endMatch) {
    // Can't parse - might be topology mode, allow
    return true;
  }

  const startRow = parseInt(startMatch[1], 10);
  const startCol = parseInt(startMatch[2], 10);
  const endRow = parseInt(endMatch[1], 10);
  const endCol = parseInt(endMatch[2], 10);

  const rowDiff = Math.abs(endRow - startRow);
  const colDiff = Math.abs(endCol - startCol);

  // Only allow orthogonal adjacency: (1,0) or (0,1)
  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

/**
 * Calculate distance between two points
 *
 * @param p1 - First point
 * @param p2 - Second point
 * @returns Euclidean distance
 */
export function pointDistance(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Minimum distance threshold for freehand line segments
 */
export const FREEHAND_MIN_DISTANCE = 5;

/**
 * Calculate the shortest distance from a point to a line segment
 *
 * @param point - The point to measure from
 * @param lineStart - Start of line segment
 * @param lineEnd - End of line segment
 * @returns The shortest distance from point to line segment
 */
export function pointToLineSegmentDistance(
  point: { x: number; y: number },
  lineStart: { x: number; y: number },
  lineEnd: { x: number; y: number }
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSquared = dx * dx + dy * dy;

  // If the line segment is actually a point, return distance to that point
  if (lengthSquared === 0) {
    return pointDistance(point, lineStart);
  }

  // Calculate projection of point onto line (clamped to segment)
  const t = Math.max(0, Math.min(1,
    ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSquared
  ));

  // Find the closest point on the segment
  const closestPoint = {
    x: lineStart.x + t * dx,
    y: lineStart.y + t * dy,
  };

  return pointDistance(point, closestPoint);
}

/**
 * Execute a line action (add, remove, replace, skip)
 *
 * @param action - The action to take
 * @param addFn - Function to add an element
 * @param removeFn - Function to remove an element
 * @param existingId - ID of existing element (required for remove/replace)
 * @param newElement - New element data (required for add/replace)
 */
export function executeLineAction<T>(
  action: LineAction,
  addFn: (element: T) => void,
  removeFn: (id: string) => void,
  existingId: string | undefined,
  newElement: T | undefined
): void {
  switch (action) {
    case 'remove':
      if (existingId) removeFn(existingId);
      break;
    case 'replace':
      if (existingId) removeFn(existingId);
      if (newElement) addFn(newElement);
      break;
    case 'add':
      if (newElement) addFn(newElement);
      break;
    // 'skip' - do nothing
  }
}
