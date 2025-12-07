/**
 * Puzzle Validators - Answer checking logic
 *
 * Data-driven validator system using schema-based checklist execution.
 */

// Core validation types and functions
export {
  type ValidationResult,
  type ValidationError,
  type ValidationContext,
  type CheckResult,
  type DataDrivenCheckFn,
  runDataDrivenValidation,
  registerCheckFunction,
  getCheckFunction,
  getRegisteredCheckFunctions,
} from './core';

// Import validators to register check functions
import './mashu';
import './slitherlink';
import './nurikabe';
import './yajilin';
import './heyawake';
