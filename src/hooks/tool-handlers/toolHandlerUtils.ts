/**
 * Shared utilities for tool handlers
 * Centralizes common logic for auto mode detection, target finding, and number handling
 */

import type { Point } from '../../types';
import type { GridConfig } from '../../types';
import type { GridTopology, TopologyCell, TopologyVertex, TopologyEdge } from '../../utils/gridTopology';
import type { ConstraintSchema } from '../../constraints/types';
import { constraintCatalog } from '../../constraints';
import { getAutoModeConfig } from '../../constraints/inputModeMapping';
import {
  findNearestCell,
  findNearestVertex,
  findNearestEdge,
  getCellId,
  getVertexId,
  getEdgeHId,
  getEdgeVId,
  getCellCenter,
  getVertexPosition,
  getEdgePosition,
} from '../../utils/gridUtils';
import {
  findNearestCellInTopology,
  findNearestVertexInTopology,
  findNearestEdgeInTopology,
} from '../../utils/gridTopology';

// ============================================================================
// Auto Mode Detection
// ============================================================================

export type AutoModeType = 'none' | 'cell' | 'line' | 'line-cell' | 'number' | 'border-number' | 'direc';

export interface AutoModeInfo {
  type: AutoModeType;
  isDirecMode: boolean;
  isNumberMode: boolean;
  isBorderNumberMode: boolean;
  isConstraintNumberMode: boolean;
}

/** Input modes that should be treated as constraint number modes */
const CONSTRAINT_NUMBER_MODES = ['number', 'number-', 'direc', 'border-number'] as const;

/**
 * Check if an input mode is a constraint number mode
 */
function isConstraintInputMode(mode: string): boolean {
  return (CONSTRAINT_NUMBER_MODES as readonly string[]).includes(mode);
}

/**
 * Resolve auto mode configuration from schema and input mode
 * Unifies the three separate useMemo blocks that were checking auto mode types
 *
 * IMPORTANT: When in auto mode but schema is not yet resolved, we default to
 * constraint behavior (isConstraintNumberMode = true) to avoid writing legacy
 * numbers that would need migration later. This matches the previous behavior
 * where auto mode always treated numbers as constraint-mode.
 */
export function resolveAutoMode(
  currentInputMode: string,
  currentSchemaId: string | null
): AutoModeInfo {
  // Direct input modes (not auto)
  if (currentInputMode !== 'auto') {
    const isDirec = currentInputMode === 'direc';
    const isNumber = currentInputMode === 'number' || currentInputMode === 'number-';
    const isBorderNumber = currentInputMode === 'border-number';
    const isConstraint = isConstraintInputMode(currentInputMode);

    let type: AutoModeType = 'none';
    if (isDirec) type = 'direc';
    else if (isNumber) type = 'number';
    else if (isBorderNumber) type = 'border-number';

    return {
      type,
      isDirecMode: isDirec,
      isNumberMode: isNumber,
      isBorderNumberMode: isBorderNumber,
      isConstraintNumberMode: isConstraint,
    };
  }

  // Auto mode - try to get schema config
  if (currentSchemaId) {
    const schema = constraintCatalog.getSchema(currentSchemaId);
    if (schema) {
      // For auto mode, check edit mode config (problem layer uses edit mode)
      const autoConfig = getAutoModeConfig(schema, true);
      const type = autoConfig.type as AutoModeType;

      // In auto mode, always use constraint-style number handling.
      // The type determines the primary editing mode (line vs number),
      // but if numbers are entered they should use directionalClues format,
      // not legacy 0-99 numbers.
      return {
        type,
        isDirecMode: type === 'direc',
        isNumberMode: type === 'number',
        isBorderNumberMode: type === 'border-number',
        isConstraintNumberMode: true, // Always constraint-style in auto mode
      };
    }
  }

  // Auto mode without resolved schema - default to constraint behavior
  // to avoid writing legacy numbers before schema is available.
  // This matches the previous behavior where auto mode always used
  // constraint-style number handling (min 1..totalCells, directionalClues).
  return {
    type: 'number', // Default to number type for auto mode
    isDirecMode: false,
    isNumberMode: true,
    isBorderNumberMode: false,
    isConstraintNumberMode: true, // IMPORTANT: treat as constraint mode
  };
}

// ============================================================================
// Target Finding (Cell/Vertex/Edge)
// ============================================================================

export type TargetType = 'cell' | 'vertex' | 'edge';

export interface TargetResult {
  id: string;
  type: TargetType;
  distance: number;
  position: Point;
}

/**
 * Find the nearest target (cell, vertex, or edge) from a point
 * Supports both standard grid and topology mode
 */
export function findNearestTarget(
  point: Point,
  targetTypes: TargetType[],
  grid: GridConfig,
  useTopology: boolean,
  topology: GridTopology | null,
  maxDistance?: number
): TargetResult | null {
  let best: TargetResult | null = null;

  for (const targetType of targetTypes) {
    const result = findTarget(point, targetType, grid, useTopology, topology, maxDistance);
    if (result && (!best || result.distance < best.distance)) {
      best = result;
    }
  }

  return best;
}

function findTarget(
  point: Point,
  targetType: TargetType,
  grid: GridConfig,
  useTopology: boolean,
  topology: GridTopology | null,
  maxDistance?: number
): TargetResult | null {
  switch (targetType) {
    case 'cell':
      return findCellTarget(point, grid, useTopology, topology);
    case 'vertex':
      return findVertexTarget(point, grid, useTopology, topology, maxDistance);
    case 'edge':
      return findEdgeTarget(point, grid, useTopology, topology, maxDistance);
    default:
      return null;
  }
}

function findCellTarget(
  point: Point,
  grid: GridConfig,
  useTopology: boolean,
  topology: GridTopology | null
): TargetResult | null {
  if (useTopology && topology) {
    const topoCell = findNearestCellInTopology(topology, point);
    if (topoCell) {
      const dist = distance(point, topoCell.center);
      return {
        id: topoCell.id,
        type: 'cell',
        distance: dist,
        position: topoCell.center,
      };
    }
    return null;
  }

  const cell = findNearestCell(point, grid);
  if (cell) {
    const center = getCellCenter(cell.row, cell.col, grid);
    const dist = distance(point, center);
    return {
      id: getCellId(cell.row, cell.col),
      type: 'cell',
      distance: dist,
      position: center,
    };
  }
  return null;
}

function findVertexTarget(
  point: Point,
  grid: GridConfig,
  useTopology: boolean,
  topology: GridTopology | null,
  maxDistance?: number
): TargetResult | null {
  const threshold = maxDistance ?? grid.cellSize * 0.6;

  if (useTopology && topology) {
    const topoVertex = findNearestVertexInTopology(topology, point);
    if (topoVertex) {
      const dist = distance(point, topoVertex.position);
      return {
        id: topoVertex.id,
        type: 'vertex',
        distance: dist,
        position: topoVertex.position,
      };
    }
    return null;
  }

  const vertex = findNearestVertex(point, grid, threshold);
  if (vertex) {
    const pos = getVertexPosition(vertex.row, vertex.col, grid);
    const dist = distance(point, pos);
    return {
      id: getVertexId(vertex.row, vertex.col),
      type: 'vertex',
      distance: dist,
      position: pos,
    };
  }
  return null;
}

function findEdgeTarget(
  point: Point,
  grid: GridConfig,
  useTopology: boolean,
  topology: GridTopology | null,
  maxDistance?: number
): TargetResult | null {
  const threshold = maxDistance ?? grid.cellSize * 0.6;

  if (useTopology && topology) {
    const topoEdge = findNearestEdgeInTopology(topology, point);
    if (topoEdge) {
      const dist = distance(point, topoEdge.midpoint);
      return {
        id: topoEdge.id,
        type: 'edge',
        distance: dist,
        position: topoEdge.midpoint,
      };
    }
    return null;
  }

  const edge = findNearestEdge(point, grid, threshold);
  if (edge) {
    const pos = getEdgePosition(edge.type, edge.row, edge.col, grid);
    const dist = distance(point, pos);
    const id = edge.type === 'h' ? getEdgeHId(edge.row, edge.col) : getEdgeVId(edge.row, edge.col);
    return {
      id,
      type: 'edge',
      distance: dist,
      position: pos,
    };
  }
  return null;
}

function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

/**
 * Find cell ID from point, considering topology mode
 */
export function findCellIdFromPoint(
  point: Point,
  grid: GridConfig,
  useTopology: boolean,
  topology: GridTopology | null
): string | null {
  if (useTopology && topology) {
    const topoCell = findNearestCellInTopology(topology, point);
    return topoCell ? topoCell.id : null;
  }
  const cell = findNearestCell(point, grid);
  return cell ? getCellId(cell.row, cell.col) : null;
}

// ============================================================================
// Number Range Calculation
// ============================================================================

export interface NumberRange {
  min: number;
  max: number;
}

/** Build a stable objectKey for numbers so only one per slot can exist on a cell */
export function buildNumberObjectKey(
  position: string,
  cornerIndex?: number,
  sideIndex?: number
): string {
  if (position === 'corner') {
    return `number:corner:${cornerIndex ?? 0}`;
  }
  if (position === 'side') {
    return `number:side:${sideIndex ?? 0}`;
  }
  return `number:${position}`;
}

/**
 * Get min/max values for number input based on grid size and input mode
 * Centralizes magic constants that were embedded in multiple places
 */
export function getNumberRange(
  grid: GridConfig,
  autoModeInfo: AutoModeInfo
): NumberRange {
  // For yajilin (direc mode or auto-direc): max is about half the max dimension
  if (autoModeInfo.isDirecMode) {
    const maxDimension = Math.max(grid.rows, grid.cols);
    return { min: 0, max: Math.floor(maxDimension / 2) };
  }

  // For constraint number modes (nurikabe, etc.): max is total cells (for island size)
  if (autoModeInfo.isConstraintNumberMode) {
    const totalCells = grid.rows * grid.cols;
    return { min: 1, max: totalCells };
  }

  // Non-constraint mode: sensible default range (0-99)
  return { min: 0, max: 99 };
}

// ============================================================================
// Click Increment/Decrement Logic
// ============================================================================

export type IncrementMode = 'normal' | 'reverse';

/**
 * Calculate next value for click increment/decrement
 * Implements pzpr-puzzlink style cycling: 空白 → min → ... → max → 空白
 */
export function calculateNextValue(
  currentValue: number | null,
  range: NumberRange,
  isRightClick: boolean,
  mode: IncrementMode = 'normal'
): number | null {
  const { min, max } = range;
  const isValidNum = currentValue !== null && currentValue >= min;

  // Determine direction: normal mode: left=+, right=-; reverse mode: left=-, right=+
  const shouldIncrement = mode === 'normal' ? !isRightClick : isRightClick;

  if (shouldIncrement) {
    // Increment: 空白 → min → min+1 → ... → max → 空白
    if (!isValidNum || currentValue === null) {
      return min;
    } else if (currentValue >= max) {
      return null; // Clear
    } else {
      return currentValue + 1;
    }
  } else {
    // Decrement: 空白 → max → max-1 → ... → min → 空白
    if (!isValidNum || currentValue === null) {
      return max;
    } else if (currentValue <= min) {
      return null; // Clear
    } else {
      return currentValue - 1;
    }
  }
}

// ============================================================================
// Cell Adjacency
// ============================================================================

/**
 * Check if two cells are adjacent (orthogonally)
 * Works with both topology and standard grid
 */
export function areCellsAdjacent(
  cellId1: string,
  cellId2: string,
  useTopology: boolean,
  topology: GridTopology | null
): boolean {
  // For topology mode, use the topology's adjacency information
  if (useTopology && topology) {
    const cell1 = topology.cells.get(cellId1);
    if (cell1) {
      return cell1.adjacentCells.includes(cellId2);
    }
    return false;
  }

  // For standard grid, parse IDs and check orthogonal adjacency
  const coords1 = parseCellId(cellId1);
  const coords2 = parseCellId(cellId2);

  if (coords1 && coords2) {
    const rowDiff = Math.abs(coords2.row - coords1.row);
    const colDiff = Math.abs(coords2.col - coords1.col);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  }

  return false;
}

/**
 * Parse cell ID to get row/col coordinates
 */
export function parseCellId(cellId: string): { row: number; col: number } | null {
  const match = cellId.match(/^cell-(\d+)-(\d+)$/);
  if (match) {
    return {
      row: parseInt(match[1], 10),
      col: parseInt(match[2], 10),
    };
  }
  return null;
}

// ============================================================================
// Symbol Metadata
// ============================================================================

export interface SymbolMetadata {
  /** Symbol type ID */
  type: string;
  /** Category for grouping */
  category: 'arrow' | 'shape' | 'mark' | 'special';
  /** Logical uniqueness key per cell (same key cannot be placed twice on one cell) */
  objectKey?: string;
  /** Whether this is a single-direction symbol (uses rotation) */
  singleDirection: boolean;
  /** Whether this is a multi-direction symbol (uses directions array) */
  multiDirection: boolean;
  /** Symbol types that conflict with this one (can't coexist at same position) */
  conflictsWith?: string[];
  /** Side effects when adding this symbol */
  onAdd?: {
    /** Remove lines at the same edge (for peke/cross) */
    removeLineAtEdge?: boolean;
  };
}

/** Single-direction arrow symbols that use rotation */
export const SINGLE_DIRECTION_ARROWS = [
  'arrow_N',
  'arrow_B',
  'arrow_S',
  'arrow_Short',
  'arrow_GP',
  'arrow_double',
  'triangle',
  'triangle-filled',
] as const;

/** Multi-direction arrow symbols that use directions array */
export const MULTI_DIRECTION_ARROWS = [
  'arrow_cross',
  'arrow_eight',
  'arrow_fourtip',
  'arrow_fouredge',
] as const;

/**
 * Get metadata for a symbol type
 */
export function getSymbolMetadata(symbolType: string): SymbolMetadata {
  // Check if single direction arrow
  if ((SINGLE_DIRECTION_ARROWS as readonly string[]).includes(symbolType)) {
    return {
      type: symbolType,
      category: 'arrow',
      objectKey: symbolType,
      singleDirection: true,
      multiDirection: false,
      conflictsWith: [...MULTI_DIRECTION_ARROWS],
    };
  }

  // Check if multi direction arrow
  if ((MULTI_DIRECTION_ARROWS as readonly string[]).includes(symbolType)) {
    return {
      type: symbolType,
      category: 'arrow',
      objectKey: symbolType,
      singleDirection: false,
      multiDirection: true,
      conflictsWith: [...SINGLE_DIRECTION_ARROWS],
    };
  }

  // Cross/peke symbol - removes lines at edge
  if (symbolType === 'cross') {
    return {
      type: symbolType,
      category: 'mark',
      objectKey: symbolType,
      singleDirection: false,
      multiDirection: false,
      onAdd: {
        removeLineAtEdge: true,
      },
    };
  }

  // Default metadata
  return {
    type: symbolType,
    category: 'shape',
    objectKey: symbolType,
    singleDirection: false,
    multiDirection: false,
  };
}

// ============================================================================
// Existing Element Finding
// ============================================================================

export interface ExistingNumber {
  id: string;
  cellId: string;
  value: string;
  position: string;
  cornerIndex?: number;
  sideIndex?: number;
  candidates?: number[];
}

export interface ExistingSymbol {
  id: string;
  cellId: string;
  symbolType: string;
  color: string;
  objectKey?: string;
}

/**
 * Find existing number at a cell with matching position settings
 */
export function findExistingNumber(
  numbers: Record<string, ExistingNumber>,
  cellId: string,
  position: string,
  cornerIndex?: number,
  sideIndex?: number,
  objectKey?: string
): { id: string; number: ExistingNumber } | null {
  for (const [id, num] of Object.entries(numbers)) {
    if (num.cellId !== cellId || num.position !== position) continue;
    if (objectKey && num.objectKey && num.objectKey !== objectKey) continue;

    if (position === 'corner' && num.cornerIndex !== cornerIndex) continue;
    if (position === 'side' && num.sideIndex !== sideIndex) continue;

    return { id, number: num };
  }
  return null;
}

/**
 * Find existing symbols that conflict with a given symbol type
 */
export function findConflictingSymbols(
  symbols: Record<string, ExistingSymbol>,
  targetId: string,
  symbolType: string,
  objectKey?: string
): ExistingSymbol[] {
  const metadata = getSymbolMetadata(symbolType);
  return Object.values(symbols).filter((s) => {
    if (s.cellId !== targetId) return false;
    if (objectKey && (!s.objectKey || s.objectKey === objectKey)) return true;
    if (!metadata.conflictsWith || metadata.conflictsWith.length === 0) return false;
    return metadata.conflictsWith.includes(s.symbolType);
  });
}
