/**
 * Trial Slice - Trial mode (仮置き) state management
 *
 * Based on pzprjs trial mode implementation.
 * Allows speculative input that can be accepted or rejected.
 */

import type { TrialSlice, SliceCreator } from './types';
import { createEmptyElements } from './types';
import type { PuzzleElements } from '../../types';

/**
 * Default trial mode colors (pzprjs-style)
 * Different colors for different trial depth levels
 */
const DEFAULT_TRIAL_COLORS = [
  '#FF8888', // Level 1 - Light red
  '#88FF88', // Level 2 - Light green
  '#8888FF', // Level 3 - Light blue
  '#FFFF88', // Level 4 - Light yellow
  '#FF88FF', // Level 5 - Light magenta
  '#88FFFF', // Level 6 - Light cyan
];

/**
 * Deep clone puzzle elements
 */
function cloneElements(elements: PuzzleElements): PuzzleElements {
  return {
    surfaces: { ...elements.surfaces },
    lines: { ...elements.lines },
    edges: { ...elements.edges },
    walls: { ...elements.walls },
    numbers: { ...elements.numbers },
    symbols: { ...elements.symbols },
    cages: { ...elements.cages },
    specials: { ...elements.specials },
    boxLines: { ...elements.boxLines },
  };
}

export const createTrialSlice: SliceCreator<TrialSlice> = (set, get) => ({
  trialStage: 0,
  trialStack: [],
  trialColors: DEFAULT_TRIAL_COLORS,

  enterTrial: () => {
    const { puzzle, trialStack, trialStage } = get();

    // Save current answer state to stack
    const savedState = cloneElements(puzzle.answer);

    set({
      trialStage: trialStage + 1,
      trialStack: [...trialStack, savedState],
    });
  },

  acceptTrial: () => {
    const { trialStage, trialStack } = get();

    if (trialStage === 0) {
      // Not in trial mode, nothing to accept
      return;
    }

    // Remove the top saved state (keep current changes)
    const newStack = trialStack.slice(0, -1);

    set({
      trialStage: trialStage - 1,
      trialStack: newStack,
    });
  },

  rejectTrial: () => {
    const { trialStage, trialStack, puzzle } = get();

    if (trialStage === 0) {
      // Not in trial mode, nothing to reject
      return;
    }

    // Restore the earliest saved state (reject all trial levels)
    const restoredState = trialStack[0];

    set({
      trialStage: 0,
      trialStack: [],
      puzzle: {
        ...puzzle,
        answer: restoredState,
      },
    });
  },

  rejectCurrentTrial: () => {
    const { trialStage, trialStack, puzzle } = get();

    if (trialStage === 0) {
      // Not in trial mode, nothing to reject
      return;
    }

    // Restore only the most recent saved state
    const restoredState = trialStack[trialStack.length - 1];
    const newStack = trialStack.slice(0, -1);

    set({
      trialStage: trialStage - 1,
      trialStack: newStack,
      puzzle: {
        ...puzzle,
        answer: restoredState,
      },
    });
  },

  isInTrial: () => {
    return get().trialStage > 0;
  },

  getCurrentTrialColor: () => {
    const { trialStage, trialColors } = get();
    if (trialStage === 0) {
      return null;
    }
    // Use modulo to cycle through colors for deep nesting
    return trialColors[(trialStage - 1) % trialColors.length];
  },
});
