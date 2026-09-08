/**
 * Core Validation Types and Functions
 *
 * Plugin-based validator system for puzzle checking.
 * Validators can be registered for each puzzle type (pid).
 */

import type { PuzzleState, GridConfig, LineElement, SymbolElement } from '../../types';
import type { ConstraintSchema, ConstraintRule } from '../types';
import type { GridTopology } from '../../utils/topology';
import { getCellIndexById, getEdgeIndexById } from '../../utils/gridUtils';
import { mergeDirectionalCluesIntoNumbers } from '../../utils/legacyDirectionalClues';

// ========================================
// Types
// ========================================

/**
 * Single validation error
 */
export interface ValidationError {
  /** Rule ID that was violated */
  ruleId: string;
  /** Failcode (pzprjs-style) */
  failcode: string;
  /** i18n key for error message */
  messageKey: string;
  /** Cell/element IDs involved in the error */
  elements?: string[];
}

/**
 * Result of puzzle validation
 */
export interface ValidationResult {
  /** Whether the puzzle is complete and correct */
  complete: boolean;
  /** Whether there are undecided/empty cells */
  undecided: boolean;
  /** List of validation errors */
  errors: ValidationError[];
}

/**
 * Validation context - provides access to puzzle data and helper functions
 */
export interface ValidationContext {
  /** Puzzle state (problem and answer layers) */
  puzzle: PuzzleState;
  /** Grid configuration */
  grid: GridConfig;
  /** Constraint schema */
  schema: ConstraintSchema;
  /** Grid topology (for topology-aware validation) */
  topology: GridTopology | null;
  /** Set of enabled rule IDs */
  enabledRules: Set<string>;
  /** List of errors (mutable - validators add to this) */
  errors: ValidationError[];
  /** Helper: Get lines connected to a cell */
  getCellLines: (row: number, col: number) => CellLineInfo;
  /** Helper: Get edge lines (vertex-to-vertex) */
  getEdgeLines: () => Map<string, LineElement>;
  /** Helper: Get symbol at cell */
  getSymbol: (row: number, col: number) => SymbolElement | null;
  /** Helper: Get number at cell (by row/col or by cellId) */
  getNumber: (row: number, col: number) => string | null;
  /** Helper: Get number by cell ID */
  getNumberByCellId: (cellId: string) => string | null;
  /** Helper: Check if cell has surface fill */
  isCellShaded: (row: number, col: number) => boolean;
  /** Helper: Check if a rule is enabled */
  isRuleEnabled: (ruleId: string) => boolean;
  /** Helper: Add an error */
  addError: (ruleId: string, failcode: string, messageKey: string, elements?: string[]) => void;
}

/**
 * Direction type for cell line connections
 */
export type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * Cell line info - describes lines connected to a cell
 */
export interface CellLineInfo {
  /** Number of lines connected */
  count: number;
  /** Set of directions */
  directions: Set<Direction>;
  /** Is straight (horizontal or vertical) */
  isStraight: boolean;
  /** Is curve (turn) */
  isCurve: boolean;
}

/**
 * Result of a single check function
 */
export interface CheckResult {
  /** Whether the check passed */
  ok: boolean;
  /** Optional tag for multi-failcode rules */
  tag?: string;
  /** Affected element IDs (cells, edges, etc.) */
  elements?: string[];
}

/**
 * Data-driven check function type
 * Returns a CheckResult instead of directly adding errors
 */
export type DataDrivenCheckFn = (ctx: ValidationContext) => CheckResult;

// ========================================
// Check Function Registry
// ========================================

/**
 * Registry of check functions by name
 * Maps pzpr-style check function names to implementations
 */
const checkFunctionRegistry: Map<string, DataDrivenCheckFn> = new Map();

/**
 * Register a check function
 */
export function registerCheckFunction(name: string, fn: DataDrivenCheckFn): void {
  checkFunctionRegistry.set(name, fn);
}

/**
 * Get a check function by name
 */
export function getCheckFunction(name: string): DataDrivenCheckFn | undefined {
  return checkFunctionRegistry.get(name);
}

/**
 * Get all registered check function names
 */
export function getRegisteredCheckFunctions(): string[] {
  return Array.from(checkFunctionRegistry.keys());
}

// ========================================
// Helper Functions
// ========================================

/**
 * Create cell line info helper
 */
function createCellLineHelper(puzzle: PuzzleState, grid: GridConfig): (row: number, col: number) => CellLineInfo {
  // Build a map of cell connections from lines
  const cellConnections = new Map<string, Set<Direction>>();

  for (const line of Object.values(puzzle.answer.lines)) {
    const lineTarget = line.lineTarget ?? 'cell';
    if (lineTarget !== 'cell') continue;

    let fromPos = line.from ? getCellIndexById(line.from, grid) : null;
    let toPos = line.to ? getCellIndexById(line.to, grid) : null;

    if ((!fromPos || !toPos) && line.edgeId) {
      const edgePos = getEdgeIndexById(line.edgeId, grid);
      if (edgePos) {
        const fromCellId =
          edgePos.type === 'h'
            ? `cell-${edgePos.row - 1}-${edgePos.col}`
            : `cell-${edgePos.row}-${edgePos.col - 1}`;
        const toCellId =
          edgePos.type === 'h'
            ? `cell-${edgePos.row}-${edgePos.col}`
            : `cell-${edgePos.row}-${edgePos.col}`;

        fromPos = getCellIndexById(fromCellId, grid);
        toPos = getCellIndexById(toCellId, grid);
      }
    }

    if (!fromPos || !toPos) continue;
    const fromRow = fromPos.row;
    const fromCol = fromPos.col;
    const toRow = toPos.row;
    const toCol = toPos.col;

    // Add direction for 'from' cell
    const fromKey = `${fromRow}-${fromCol}`;
    if (!cellConnections.has(fromKey)) {
      cellConnections.set(fromKey, new Set());
    }
    const fromDirs = cellConnections.get(fromKey)!;
    if (toRow === fromRow - 1) fromDirs.add('up');
    if (toRow === fromRow + 1) fromDirs.add('down');
    if (toCol === fromCol - 1) fromDirs.add('left');
    if (toCol === fromCol + 1) fromDirs.add('right');

    // Add direction for 'to' cell
    const toKey = `${toRow}-${toCol}`;
    if (!cellConnections.has(toKey)) {
      cellConnections.set(toKey, new Set());
    }
    const toDirs = cellConnections.get(toKey)!;
    if (fromRow === toRow - 1) toDirs.add('up');
    if (fromRow === toRow + 1) toDirs.add('down');
    if (fromCol === toCol - 1) toDirs.add('left');
    if (fromCol === toCol + 1) toDirs.add('right');
  }

  return (row: number, col: number): CellLineInfo => {
    const key = `${row}-${col}`;
    const directions = cellConnections.get(key) || new Set<Direction>();
    const count = directions.size;

    const hasHorizontal = directions.has('left') || directions.has('right');
    const hasVertical = directions.has('up') || directions.has('down');
    const isStraight = count === 2 && (
      (directions.has('up') && directions.has('down')) ||
      (directions.has('left') && directions.has('right'))
    );
    const isCurve = count === 2 && hasHorizontal && hasVertical;

    return { count, directions, isStraight, isCurve };
  };
}

/**
 * Create edge lines helper
 */
function createEdgeLinesHelper(puzzle: PuzzleState): () => Map<string, LineElement> {
  const edgeLines = new Map<string, LineElement>();

  for (const line of Object.values(puzzle.answer.lines)) {
    const isEdgeLine = line.lineTarget === 'edge' || (!line.lineTarget && line.from?.startsWith('vertex-'));
    if (!isEdgeLine) continue;
    const key = line.from && line.to ? `${line.from}-${line.to}` : line.edgeId ?? line.id;
    edgeLines.set(key, line as LineElement);
  }

  return () => edgeLines;
}

/**
 * Create symbol helper
 */
function createSymbolHelper(puzzle: PuzzleState): (row: number, col: number) => SymbolElement | null {
  const symbolMap = new Map<string, SymbolElement>();

  for (const symbol of Object.values(puzzle.problem.symbols)) {
    symbolMap.set(symbol.cellId, symbol);
  }

  return (row: number, col: number) => {
    return symbolMap.get(`cell-${row}-${col}`) || null;
  };
}

/**
 * Create number helper (by row/col)
 */
function createNumberHelper(puzzle: PuzzleState): (row: number, col: number) => string | null {
  const numberMap = new Map<string, string>();

  for (const num of Object.values(puzzle.problem.numbers)) {
    numberMap.set(num.cellId, num.value);
  }

  return (row: number, col: number) => {
    return numberMap.get(`cell-${row}-${col}`) || null;
  };
}

/**
 * Create number helper (by cellId)
 */
function createNumberByCellIdHelper(puzzle: PuzzleState): (cellId: string) => string | null {
  const numberMap = new Map<string, string>();

  for (const num of Object.values(puzzle.problem.numbers)) {
    numberMap.set(num.cellId, num.value);
  }

  return (cellId: string) => {
    return numberMap.get(cellId) || null;
  };
}

/**
 * Create shaded cell helper
 */
function createShadedHelper(puzzle: PuzzleState): (row: number, col: number) => boolean {
  const shadedCells = new Set<string>();

  for (const surface of Object.values(puzzle.answer.surfaces)) {
    // Consider dark colors as "shaded"
    if (surface.color && (surface.color === '#000000' || surface.color === '#444444' || surface.color === '#808080')) {
      shadedCells.add(surface.cellId);
    }
  }

  return (row: number, col: number) => {
    return shadedCells.has(`cell-${row}-${col}`);
  };
}

// ========================================
// Data-Driven Validation
// ========================================

/**
 * Map a check result to a failcode using the rule's pzpr configuration
 */
function mapFailcode(rule: ConstraintRule, result: CheckResult): string {
  const failcodes = rule.pzpr?.failcodes;
  if (!failcodes || failcodes.length === 0) {
    return 'unknown';
  }

  // If result has a tag, use it to look up the failcode
  if (result.tag && failcodes.length > 1) {
    // Try to find a matching failcode by tag
    const index = parseInt(result.tag, 10);
    if (!isNaN(index) && index >= 0 && index < failcodes.length) {
      return failcodes[index];
    }
  }

  // Default to first failcode
  return failcodes[0];
}

/**
 * Run data-driven validation using schema's pzpr checklist
 * This is the new approach that uses registered check functions
 */
export function runDataDrivenValidation(
  puzzle: PuzzleState,
  grid: GridConfig,
  schema: ConstraintSchema,
  validationOverrides: Record<string, boolean> = {},
  topology: GridTopology | null = null
): ValidationResult {
  const errors: ValidationError[] = [];
  let unavailable = false;
  const normalizedPuzzle = mergeDirectionalCluesIntoNumbers(puzzle);

  // Build set of enabled rules
  const enabledRules = new Set<string>();
  for (const rule of schema.validation) {
    const isEnabled = validationOverrides[rule.id] ?? rule.defaultOn ?? true;
    if (isEnabled) {
      enabledRules.add(rule.id);
    }
  }

  // Create validation context
  const ctx: ValidationContext = {
    puzzle: normalizedPuzzle,
    grid,
    schema,
    topology,
    enabledRules,
    errors,
    getCellLines: createCellLineHelper(normalizedPuzzle, grid),
    getEdgeLines: createEdgeLinesHelper(normalizedPuzzle),
    getSymbol: createSymbolHelper(normalizedPuzzle),
    getNumber: createNumberHelper(normalizedPuzzle),
    getNumberByCellId: createNumberByCellIdHelper(normalizedPuzzle),
    isCellShaded: createShadedHelper(normalizedPuzzle),
    isRuleEnabled: (ruleId: string) => enabledRules.has(ruleId),
    addError: (ruleId: string, failcode: string, messageKey: string, elements?: string[]) => {
      errors.push({ ruleId, failcode, messageKey, elements });
    },
  };

  // Run checks in order defined by schema's validation rules
  for (const rule of schema.validation) {
    if (!enabledRules.has(rule.id)) continue;

    const checklist = rule.pzpr?.checklist ?? [];
    for (const checkName of checklist) {
      const checkFn = getCheckFunction(checkName);
      if (!checkFn) {
        unavailable = true;
        errors.push({ ruleId: rule.id, failcode: 'unavailable', messageKey: 'validation.unavailable' });
        console.warn(`[runDataDrivenValidation] Check function not found: ${checkName}`);
        continue;
      }

      const result = checkFn(ctx);
      if (!result.ok) {
        const failcode = mapFailcode(rule, result);
        errors.push({
          ruleId: rule.id,
          failcode,
          messageKey: `validation.${schema.pid}.${failcode}`,
          elements: result.elements,
        });
      }
    }
  }

  // Determine overall status
  const hasElements = (record?: Record<string, unknown>) =>
    Boolean(record && Object.keys(record).length > 0);
  const hasAnswerElements =
    hasElements(normalizedPuzzle.answer.lines) ||
    hasElements(normalizedPuzzle.answer.surfaces) ||
    hasElements(normalizedPuzzle.answer.numbers) ||
    hasElements(normalizedPuzzle.answer.symbols) ||
    hasElements(normalizedPuzzle.answer.cages) ||
    hasElements(normalizedPuzzle.answer.specials) ||
    hasElements(normalizedPuzzle.answer.boxLines) ||
    hasElements(normalizedPuzzle.answer.lineGroups) ||
    Boolean(
      normalizedPuzzle.multicolorSurfaces &&
        Object.values(normalizedPuzzle.multicolorSurfaces).some((surface) => surface.layer === 'answer')
    );

  const complete = errors.length === 0 && hasAnswerElements;
  const undecided = unavailable || !hasAnswerElements;

  return { complete, undecided, errors };
}
