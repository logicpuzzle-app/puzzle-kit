/**
 * Solver Mode Slice
 *
 * Manages solver mode state:
 * - Whether solver mode is active
 * - Solver result data (solution answer)
 * - Time taken to solve
 * - Error messages
 * - Solver backend type (solver-kit vs cspuz)
 */

import type { SliceCreator, PuzzleStore } from './types';
import type { PuzzleElements } from '../../types';
import type { SolveResult, SolverStatus } from '../../solver/types';

/** Solver backend type */
export type SolverBackend = 'solver-kit' | 'cspuz';

export interface SolverSlice {
  /** Current solver backend */
  solverBackend: SolverBackend;
  /** Whether solver mode is active */
  isSolverMode: boolean;
  /** Whether solver is currently running */
  isSolving: boolean;
  /** Solver result - the solution displayed in solver layer */
  solverResult: PuzzleElements | null;
  /** Partial result when solver times out or puzzle is unsolvable (途中経過) */
  partialResult: PuzzleElements | null;
  /** Whether the result is partial (for different rendering style) */
  isPartialResult: boolean;
  /** Solver status code (solved, multiple, timeout, unsolvable, error) */
  solverStatus: SolverStatus | null;
  /** Time taken to solve (ms) */
  solverTime: number | null;
  /** Error message from solver */
  solverError: string | null;

  /** Set solver backend */
  setSolverBackend: (backend: SolverBackend) => void;
  /** Enter solver mode with a result */
  enterSolverMode: (result: SolveResult) => void;
  /** Exit solver mode */
  exitSolverMode: () => void;
  /** Set solving state */
  setSolving: (solving: boolean) => void;
  /** Set solver error */
  setSolverError: (error: string | null) => void;
  /** Cancel solver execution */
  cancelSolver: () => void;
}

export const createSolverSlice: SliceCreator<SolverSlice> = (set) => ({
  solverBackend: 'cspuz' as SolverBackend, // Default to cspuz (faster)
  isSolverMode: false,
  isSolving: false,
  solverResult: null,
  partialResult: null,
  isPartialResult: false,
  solverStatus: null,
  solverTime: null,
  solverError: null,

  setSolverBackend: (backend: SolverBackend) =>
    set({ solverBackend: backend }),

  enterSolverMode: (result: SolveResult) =>
    set((state) => {
      if (result.success && result.answer) {
        // Complete solution
        return {
          isSolverMode: true,
          isSolving: false,
          solverResult: result.answer,
          partialResult: null,
          isPartialResult: false,
          solverStatus: result.status ?? 'solved',
          solverTime: result.time ?? null,
          solverError: null,
        };
      } else if (result.partialAnswer) {
        // Partial solution (timeout, multiple, or unsolvable with progress)
        return {
          isSolverMode: true,
          isSolving: false,
          solverResult: result.partialAnswer,
          partialResult: result.partialAnswer,
          isPartialResult: true,
          solverStatus: result.status ?? 'error',
          solverTime: result.time ?? null,
          solverError: result.error ?? null,
        };
      } else {
        // No solution at all
        return {
          isSolverMode: false,
          isSolving: false,
          solverResult: null,
          partialResult: null,
          isPartialResult: false,
          solverStatus: result.status ?? 'error',
          solverTime: result.time ?? null,
          solverError: result.error ?? null,
        };
      }
    }),

  exitSolverMode: () =>
    set({
      isSolverMode: false,
      solverResult: null,
      partialResult: null,
      isPartialResult: false,
      solverStatus: null,
      solverTime: null,
      solverError: null,
    }),

  setSolving: (solving: boolean) =>
    set({ isSolving: solving }),

  setSolverError: (error: string | null) =>
    set({ solverError: error }),

  cancelSolver: () =>
    set({
      isSolving: false,
      solverStatus: null,
      solverError: null,
    }),
});
