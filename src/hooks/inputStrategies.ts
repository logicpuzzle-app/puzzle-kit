/**
 * Input Strategy Types and Utilities
 *
 * Defines strategy pattern for handling different input modes/tools
 * in InputHandlerLayer.
 */

import type { Point } from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Context passed to all input strategies
 */
export interface InputContext {
  /** Current point in SVG coordinates */
  point: Point;
  /** Whether right mouse button was used */
  isRightButton: boolean;
  /** Whether shift key is held */
  shiftKey: boolean;
  /** Active layer (problem/answer/grid/constraint) */
  activeLayer: 'problem' | 'answer' | 'grid' | 'constraint';
  /** Current tool from toolSettings */
  currentTool: string;
  /** Current input mode (for constraint mode) */
  currentInputMode: string | null;
  /** Current schema ID (for constraint mode) */
  currentSchemaId: string | null;
}

/**
 * Result from cell finder
 */
export interface CellInfo {
  cellId: string;
  row?: number;
  col?: number;
  center?: Point;
}

/**
 * Flick input state for directional number input
 */
export interface FlickState {
  startCell: { row: number; col: number } | null;
  startCellId: string | null;
  startCellCenter: Point | null;
  startCellIndex: number | null;
  startPoint: Point | null;
  inputted: boolean;
  rightButton: boolean;
  lineDrawn: boolean;
  pekeInputMode: 'add' | 'remove' | null;
}

export const INITIAL_FLICK_STATE: Readonly<FlickState> = {
  startCell: null,
  startCellId: null,
  startCellCenter: null,
  startCellIndex: null,
  startPoint: null,
  inputted: false,
  rightButton: false,
  lineDrawn: false,
  pekeInputMode: null,
};

/**
 * Mouse event handler strategy
 */
export interface MouseStrategy {
  /** Handle mouse down - returns true if event was handled */
  onMouseDown?: (ctx: InputContext, cellInfo: CellInfo | null) => boolean;
  /** Handle mouse move - returns true if event was handled */
  onMouseMove?: (ctx: InputContext, cellInfo: CellInfo | null) => boolean;
  /** Handle mouse up - returns true if event was handled */
  onMouseUp?: (ctx: InputContext, cellInfo: CellInfo | null) => boolean;
}

// ============================================================================
// Tool Detection Helpers
// ============================================================================

/**
 * Check if tool is a number tool
 */
export function isNumberTool(tool: string): boolean {
  return tool.startsWith('number');
}

/**
 * Check if tool is the directional number tool
 */
export function isDirectionalNumberTool(tool: string): boolean {
  return tool === 'number-directional';
}

/**
 * Check if tool is a text tool
 */
export function isTextTool(tool: string): boolean {
  return tool.startsWith('text');
}

/**
 * Check if tool is the select tool
 */
export function isSelectTool(tool: string): boolean {
  return tool === 'select';
}

/**
 * Check if tool is a line tool
 */
export function isLineTool(tool: string): boolean {
  return tool.startsWith('line') || tool === 'edge' || tool === 'wall';
}

/**
 * Check if tool is a surface tool
 */
export function isSurfaceTool(tool: string): boolean {
  return tool === 'surface' || tool === 'surface-cycle';
}

/**
 * Check if tool is a symbol tool
 */
export function isSymbolTool(tool: string): boolean {
  return tool.startsWith('symbol');
}

/**
 * Check if tool is a special tool (thermo/arrow/cage/boxline)
 */
export function isSpecialTool(tool: string): boolean {
  return tool === 'thermo' || tool === 'arrow' || tool === 'cage' || tool === 'boxline';
}

// ============================================================================
// Mode Detection Helpers
// ============================================================================

/**
 * Check if in grid edit mode
 */
export function isGridMode(activeLayer: string): boolean {
  return activeLayer === 'grid';
}

/**
 * Check if in constraint mode (view only)
 */
export function isConstraintMode(activeLayer: string): boolean {
  return activeLayer === 'constraint';
}

/**
 * Check if constraint input is enabled
 */
export function isConstraintInputEnabled(
  showConstraintLayer: boolean,
  currentSchemaId: string | null
): boolean {
  return showConstraintLayer && currentSchemaId !== null;
}

// ============================================================================
// Flick Direction Calculation
// ============================================================================

/**
 * Simple 4-direction flick detection (without topology)
 */
export function calculateSimpleFlickDirection(
  dx: number,
  dy: number,
  threshold: number
): { direction: 0 | 1 | 2 | 3 | 4; isFlick: boolean } {
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < threshold) {
    return { direction: 0, isFlick: false };
  }

  let direction: 0 | 1 | 2 | 3 | 4 = 0;
  if (Math.abs(dy) > threshold && Math.abs(dy) > Math.abs(dx)) {
    direction = dy < 0 ? 1 : 2; // 1 = up, 2 = down
  } else if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy)) {
    direction = dx < 0 ? 3 : 4; // 3 = left, 4 = right
  }

  return { direction, isFlick: direction !== 0 };
}

/**
 * Topology-aware flick direction calculation
 * For deformed grids, calculates direction based on edge normals
 */
export interface TopologyCellInfo {
  center: Point;
  vertices: Point[];
}

export function calculateTopologyFlickDirection(
  dx: number,
  dy: number,
  threshold: number,
  cellInfo: TopologyCellInfo
): { direction: 0 | 1 | 2 | 3 | 4; angle: number | null } {
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance < threshold) {
    return { direction: 0, angle: null };
  }

  const { center, vertices } = cellInfo;
  if (vertices.length < 3) {
    // Fallback to simple direction
    const simple = calculateSimpleFlickDirection(dx, dy, threshold);
    return { direction: simple.direction, angle: null };
  }

  let bestAngle = 0;
  let bestDotProduct = -Infinity;

  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const v1 = vertices[i];
    const v2 = vertices[(i + 1) % n];

    // Edge vector
    const edgeX = v2.x - v1.x;
    const edgeY = v2.y - v1.y;
    const edgeLen = Math.sqrt(edgeX * edgeX + edgeY * edgeY);

    if (edgeLen > 0) {
      // Perpendicular to edge (rotate 90 degrees)
      let normalX = edgeY / edgeLen;
      let normalY = -edgeX / edgeLen;

      // Determine which direction is outward
      const midX = (v1.x + v2.x) / 2;
      const midY = (v1.y + v2.y) / 2;
      const toCenterX = center.x - midX;
      const toCenterY = center.y - midY;

      // If normal points toward center, flip it
      if (normalX * toCenterX + normalY * toCenterY > 0) {
        normalX = -normalX;
        normalY = -normalY;
      }

      // Normalize flick vector
      const unitFlickX = dx / distance;
      const unitFlickY = dy / distance;

      // Dot product
      const dot = normalX * unitFlickX + normalY * unitFlickY;

      if (dot > bestDotProduct) {
        bestDotProduct = dot;
        bestAngle = Math.atan2(normalY, normalX) * (180 / Math.PI);
        bestAngle = ((bestAngle % 360) + 360) % 360;
      }
    }
  }

  if (bestDotProduct > 0) {
    return { direction: 0, angle: bestAngle };
  }

  // Fallback to simple direction
  const simple = calculateSimpleFlickDirection(dx, dy, threshold);
  return { direction: simple.direction, angle: null };
}

/**
 * Check if drag distance exceeds line threshold
 */
export function isLineDrag(
  startPoint: Point,
  currentPoint: Point,
  cellSize: number
): boolean {
  const dx = currentPoint.x - startPoint.x;
  const dy = currentPoint.y - startPoint.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance > cellSize * 0.5;
}

// ============================================================================
// Strategy Router Helpers
// ============================================================================

export type InputModeType =
  | 'number'
  | 'number-'
  | 'direc'
  | 'auto'
  | 'surface'
  | 'line'
  | 'symbol'
  | null;

/**
 * Determine which input mode strategy to use
 */
export function getActiveInputMode(
  isConstraintEnabled: boolean,
  currentInputMode: string | null,
  autoModeType: string | null
): InputModeType {
  if (!isConstraintEnabled) return null;

  if (currentInputMode === 'number' || currentInputMode === 'number-') {
    return currentInputMode as 'number' | 'number-';
  }
  if (currentInputMode === 'direc') {
    return 'direc';
  }
  if (currentInputMode === 'auto' && autoModeType) {
    return 'auto';
  }

  return null;
}

/**
 * Auto mode subtypes for routing
 */
export type AutoModeSubtype =
  | 'number'
  | 'direc'
  | 'line'
  | 'line-cell'
  | 'border-number'
  | 'surface'
  | null;

/**
 * Get the subtype for auto mode
 */
export function getAutoModeSubtype(
  autoConfig: { type: string } | null
): AutoModeSubtype {
  if (!autoConfig) return null;
  const type = autoConfig.type;
  if (type === 'number' || type === 'direc' || type === 'line' ||
      type === 'line-cell' || type === 'border-number' || type === 'surface') {
    return type as AutoModeSubtype;
  }
  return null;
}
