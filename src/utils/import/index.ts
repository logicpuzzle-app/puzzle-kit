/**
 * Puzzle import utilities
 *
 * Re-exports all import-related functions for easy access.
 * Individual modules can be imported directly for tree-shaking.
 */

// Types
export type { PuzzlinkData } from './types';

// URL detection
export { isPenpaUrl, isPuzzlinkUrl, isPuzsqUrl, extractPuzsqId } from './urlDetection';

// For now, re-export from legacy penpaCompat.ts
// TODO: Eventually move all parser logic here
export {
  parsePenpaUrl,
  parsePuzzlinkUrl,
  fetchPuzsqPuzzle,
  generatePuzzlinkUrl,
  exportToPenpaFormat,
} from '../penpaCompat';
