/**
 * Constraints - Puzzle constraint system
 *
 * Provides constraint schemas extracted from pzpr-puzzlink for:
 * - Problem input constraints (what can be placed in edit mode)
 * - Answer input constraints (what can be placed in play mode)
 * - Validation constraints (rules for checking answers)
 */

// Types
export type {
  ConstraintScope,
  GridType,
  ConstraintTarget,
  ToolId,
  ConstraintRule,
  ConstraintSchema,
  ConstraintCatalog,
  ValidationResult,
  ConstraintPreset,
  InputMode,
  InputModes,
  GridStyleType,
  FrameStyleType,
  LineTargetType,
} from './types';

// Input mode mapping
export {
  inputModeToTool,
  getToolForInputMode,
  isInfoMode,
  isSpecialMode,
  getDefaultInputMode,
  type ToolMapping,
  type InputTarget,
} from './inputModeMapping';

// Catalog
export {
  constraintCatalog,
  getConstraintsByScope,
  getDefaultValidationRules,
} from './ConstraintCatalog';

// Individual schemas (for direct import if needed)
export * from './schemas';
export * from './testCases';

// Test cases
export { testCaseRegistry } from './testCases';
export type { PuzzleTestData, FailCheckCase, TestCaseRegistry } from './testCases';
