/**
 * Shared utilities for tool handlers
 * Centralizes common logic for auto mode detection, target finding, and number handling
 */

import type { GridConfig, NumberPosition, Point } from '../../types';
import type { GridTopology } from '../../utils/gridTopology';
import type { ConstraintSchema } from '../../constraints/types';
import { constraintCatalog } from '../../constraints';
import { getAutoModeConfig } from '../../constraints/inputModeMapping';
import { getCellIndexById } from '../../utils/gridUtils';
import { resolveCell, resolveTarget, type ResolveOptions } from '../../utils/pointResolver';
import { findNumberEntry } from '../../utils/numberEntries';

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
      // but if numbers are entered they should use directional numbers
      // (NumberElement with direction/angle), not legacy 0-99 numbers.
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
  // constraint-style number handling (min 1..totalCells, directional numbers).
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
  options: ResolveOptions = {}
): TargetResult | null {
  return resolveTarget(
    point,
    { grid, useTopology, topology },
    targetTypes,
    options
  );
}

/**
 * Find cell ID from point, considering topology mode
 */
export function findCellIdFromPoint(
  point: Point,
  grid: GridConfig,
  useTopology: boolean,
  topology: GridTopology | null,
  options: ResolveOptions = {}
): string | null {
  const cell = resolveCell(point, { grid, useTopology, topology }, options);
  return cell ? cell.cellId : null;
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
  topology: GridTopology | null,
  grid?: GridConfig
): boolean {
  // For topology mode, use the topology's adjacency information
  if (useTopology && topology) {
    const cell1 = topology.cells.get(cellId1);
    if (cell1) {
      return cell1.adjacentCells.includes(cellId2);
    }
    return false;
  }

  // For standard grid, use a lookup derived from the current grid configuration.
  if (!grid) return false;
  const coords1 = getCellIndexById(cellId1, grid);
  const coords2 = getCellIndexById(cellId2, grid);
  if (!coords1 || !coords2) return false;

  const rowDiff = Math.abs(coords2.row - coords1.row);
  const colDiff = Math.abs(coords2.col - coords1.col);
  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
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
  position: NumberPosition;
  objectKey?: string;
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
  position: NumberPosition,
  cornerIndex?: number,
  sideIndex?: number,
  objectKey?: string
): { id: string; number: ExistingNumber } | null {
  const existing = findNumberEntry(numbers, cellId, position, {
    cornerIndex,
    sideIndex,
    objectKey,
  });
  if (!existing) return null;
  return { id: existing.id, number: existing.number };
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
