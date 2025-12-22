/**
 * Elements State - State shape definitions and factory functions
 */

import type { PuzzleElements, PuzzleState } from '../../../types';

/**
 * Create empty puzzle elements for a single layer
 */
export const createEmptyElements = (): PuzzleElements => ({
  surfaces: {},
  lines: {},
  edges: {},
  walls: {},
  numbers: {},
  symbols: {},
  cages: {},
  specials: {},
  boxLines: {},
});

/**
 * Create empty puzzle state with problem and answer layers
 */
export const createEmptyState = (): PuzzleState => ({
  problem: createEmptyElements(),
  answer: createEmptyElements(),
});
