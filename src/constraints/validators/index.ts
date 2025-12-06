/**
 * Puzzle Validators - Answer checking logic
 *
 * Plugin-based validator system. Each puzzle type registers its own validator.
 */

// Core validation types and functions
export {
  type ValidationResult,
  type ValidationError,
  type ValidationContext,
  type ValidatorPlugin,
  type ValidatorCheckFn,
  validatePuzzle,
  registerValidator,
  getValidator,
} from './core';

// Import validators to register them
import './mashu';
import './slitherlink';
import './nurikabe';
import './yajilin';
