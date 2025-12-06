/**
 * Core Validation Types and Functions
 *
 * Plugin-based validator system for puzzle checking.
 * Validators can be registered for each puzzle type (pid).
 */

import type { PuzzleState, GridConfig, LineElement, SymbolElement } from '../../types';
import type { ConstraintSchema } from '../types';

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
  /** Helper: Get number at cell */
  getNumber: (row: number, col: number) => string | null;
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
 * Validator function type - a single check function
 */
export type ValidatorCheckFn = (ctx: ValidationContext) => void;

/**
 * Validator plugin - collection of check functions for a puzzle type
 */
export interface ValidatorPlugin {
  /** Puzzle ID this validator handles */
  pid: string;
  /** Check functions in order (same as pzprjs checklist) */
  checks: {
    /** Check function name/ID */
    name: string;
    /** Associated rule ID */
    ruleId: string;
    /** The check function */
    fn: ValidatorCheckFn;
  }[];
}

// ========================================
// Registry
// ========================================

const validatorPlugins: Map<string, ValidatorPlugin> = new Map();

/**
 * Register a validator plugin
 */
export function registerValidator(plugin: ValidatorPlugin): void {
  validatorPlugins.set(plugin.pid, plugin);
}

/**
 * Get a validator plugin by puzzle ID
 */
export function getValidator(pid: string): ValidatorPlugin | undefined {
  return validatorPlugins.get(pid);
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
    // Parse cell IDs from line endpoints (cell-row-col format)
    const fromMatch = line.from.match(/cell-(\d+)-(\d+)/);
    const toMatch = line.to.match(/cell-(\d+)-(\d+)/);

    if (!fromMatch || !toMatch) continue;

    const fromRow = parseInt(fromMatch[1]);
    const fromCol = parseInt(fromMatch[2]);
    const toRow = parseInt(toMatch[1]);
    const toCol = parseInt(toMatch[2]);

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

  for (const line of Object.values(puzzle.answer.edges)) {
    const key = `${line.from}-${line.to}`;
    edgeLines.set(key, line as unknown as LineElement);
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
 * Create number helper
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
// Main Validation Function
// ========================================

/**
 * Validate a puzzle against its schema
 */
export function validatePuzzle(
  puzzle: PuzzleState,
  grid: GridConfig,
  schema: ConstraintSchema,
  validationOverrides: Record<string, boolean> = {}
): ValidationResult {
  const plugin = validatorPlugins.get(schema.pid);

  if (!plugin) {
    // No validator available - return undecided
    return {
      complete: false,
      undecided: true,
      errors: [{
        ruleId: 'no-validator',
        failcode: 'noValidator',
        messageKey: 'validation.noValidator',
      }],
    };
  }

  // Build set of enabled rules
  const enabledRules = new Set<string>();
  for (const rule of schema.validation) {
    const isEnabled = validationOverrides[rule.id] ?? rule.defaultOn ?? true;
    if (isEnabled) {
      enabledRules.add(rule.id);
    }
  }

  // Create validation context
  const errors: ValidationError[] = [];
  const ctx: ValidationContext = {
    puzzle,
    grid,
    schema,
    enabledRules,
    errors,
    getCellLines: createCellLineHelper(puzzle, grid),
    getEdgeLines: createEdgeLinesHelper(puzzle),
    getSymbol: createSymbolHelper(puzzle),
    getNumber: createNumberHelper(puzzle),
    isCellShaded: createShadedHelper(puzzle),
    isRuleEnabled: (ruleId: string) => enabledRules.has(ruleId),
    addError: (ruleId: string, failcode: string, messageKey: string, elements?: string[]) => {
      errors.push({ ruleId, failcode, messageKey, elements });
    },
  };

  // Run all checks
  for (const check of plugin.checks) {
    if (ctx.isRuleEnabled(check.ruleId)) {
      check.fn(ctx);
    }
  }

  // Determine overall status
  // Check if there are any answer elements
  const hasAnswerElements =
    Object.keys(puzzle.answer.lines).length > 0 ||
    Object.keys(puzzle.answer.edges).length > 0 ||
    Object.keys(puzzle.answer.surfaces).length > 0;

  const complete = errors.length === 0 && hasAnswerElements;
  const undecided = !hasAnswerElements;

  return { complete, undecided, errors };
}
