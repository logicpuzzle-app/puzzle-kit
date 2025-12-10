/**
 * Elements Slice - Re-exports for the refactored elements module
 *
 * This module re-exports the elements slice and related helpers.
 * The slice is still in elementsSlice.ts for now, but helpers are in the helpers/ directory.
 */

// Re-export state factories
export { createEmptyElements, createEmptyState } from './state';

// Re-export helpers
export * from './helpers';

// Re-export the slice creator from the main file
// Note: The main slice is still in elementsSlice.ts, this just provides a cleaner import path
export { createElementsSlice } from '../elementsSlice';
