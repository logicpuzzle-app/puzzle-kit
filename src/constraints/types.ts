/**
 * Constraint Types - Type definitions for puzzle constraints
 *
 * Based on pzpr-puzzlink constraint design document
 */

/**
 * Constraint scope - which layer/mode the constraint applies to
 */
export type ConstraintScope = 'problem' | 'answer' | 'validation';

/**
 * Grid type for the puzzle
 */
export type GridType = 'square' | 'hex' | 'tri' | 'pyramid' | 'special';

/**
 * Target element types that constraints can apply to
 */
export type ConstraintTarget = 'cell' | 'edge' | 'vertex' | 'region';

/**
 * Tool ID reference for palette configuration
 */
export type ToolId = string;

/**
 * Single constraint rule definition
 */
export interface ConstraintRule {
  /** Unique rule ID, e.g. "slitherlink.clue-range" */
  id: string;

  /** Which scope this rule applies to */
  scope: ConstraintScope;

  /** i18n key for the rule title */
  title: string;

  /** i18n key for the rule description */
  description: string;

  /** Target element types this rule affects */
  targets: ConstraintTarget[];

  /** Allowed states for the target (e.g. ['0','1','2','3','?'] for slither clues) */
  states?: string[];

  /** Tools to show in the palette when this rule is active */
  toolPalette?: ToolId[];

  /** Whether this validation rule is on by default */
  defaultOn?: boolean;

  /** pzpr-specific metadata */
  pzpr?: {
    /** pzpr puzzle ID */
    pid: string;
    /** Associated fail codes from pzpr */
    failcodes?: string[];
    /** Checklist function names from pzpr */
    checklist?: string[];
  };
}

/**
 * Input mode definition (based on pzprjs inputModes)
 * Defines which tools are available in edit/play modes
 */
export type InputMode =
  | 'auto'
  | 'number'
  | 'number-'  // number with left-right inversion
  | 'clear'
  | 'line'
  | 'peke'     // X mark on edges
  | 'shade'
  | 'unshade'
  | 'border'
  | 'subline'  // auxiliary line
  | 'bgcolor'
  | 'bgcolor1'
  | 'bgcolor2'
  | 'subcircle'
  | 'subcross'
  | 'circle-unshade'  // white circle
  | 'circle-shade'    // black circle
  | 'arrow'
  | 'direc'    // directional number
  | 'bar'      // tateyoko bar
  | 'empty'
  | 'ice'
  | 'crossdot'
  | 'objblank'
  | 'completion'
  | 'info-line'
  | 'info-blk'
  | 'info-ublk'
  | 'info-room';

/**
 * Input modes configuration for edit/play
 */
export interface InputModes {
  /** Tools available in edit (problem creation) mode */
  edit: InputMode[];
  /** Tools available in play (answer input) mode */
  play: InputMode[];
}

/**
 * Grid style for rendering
 */
export type GridStyleType = 'normal' | 'thick' | 'sudoku' | 'dots' | 'dashed';

/**
 * Frame style for grid border
 */
export type FrameStyleType = 'normal' | 'thick' | 'double' | 'none';

/**
 * Line target type - where lines are drawn
 * 'edge': Lines drawn on cell edges (e.g., Slitherlink)
 * 'cell': Lines drawn through cell centers (e.g., Mashu)
 */
export type LineTargetType = 'edge' | 'cell';

/**
 * Complete constraint schema for a puzzle type
 */
export interface ConstraintSchema {
  /** pzpr puzzle ID */
  pid: string;

  /** Display name of the puzzle */
  name: string;

  /** i18n key for the puzzle name */
  nameKey: string;

  /** Grid type */
  grid: GridType;

  /** Grid style for this puzzle (default: 'normal') */
  gridStyle?: GridStyleType;

  /** Frame style for this puzzle (default: 'normal') */
  frameStyle?: FrameStyleType;

  /** Line target type for this puzzle (default: 'edge') */
  lineTarget?: LineTargetType;

  /** Input modes for edit/play (pzprjs-style) */
  inputModes: InputModes;

  /** Problem input constraints */
  problem: ConstraintRule[];

  /** Answer input constraints */
  answer: ConstraintRule[];

  /** Validation constraints */
  validation: ConstraintRule[];

  /** Additional notes */
  notes?: string[];
}

/**
 * Catalog of all available constraint schemas
 */
export interface ConstraintCatalog {
  /** Map of pid to constraint schema */
  schemas: Record<string, ConstraintSchema>;

  /** Get schema by puzzle ID */
  getSchema(pid: string): ConstraintSchema | undefined;

  /** Get all available puzzle IDs */
  getPuzzleIds(): string[];
}

/**
 * Validation result from checking a puzzle
 */
export interface ValidationResult {
  /** Whether the puzzle is complete and correct */
  complete: boolean;

  /** Whether there are undecided cells */
  undecided: boolean;

  /** List of failed validation codes */
  failcodes: string[];

  /** Human-readable error messages */
  messages: string[];
}

/**
 * Preset definition - a pre-configured constraint schema
 */
export interface ConstraintPreset {
  /** Preset ID */
  id: string;

  /** i18n key for preset name */
  nameKey: string;

  /** Reference to base schema */
  schemaId: string;

  /** Version of the preset */
  version: string;

  /** Overrides for validation rules (enabled/disabled) */
  validationOverrides?: Record<string, boolean>;

  /** Custom notes */
  notes?: string[];
}
