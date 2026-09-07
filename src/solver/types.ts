/**
 * Solver Adapter Types
 *
 * Provides a unified interface for integrating various solvers
 * with puzzle-kit's data model.
 */

import type { PuzzleState, GridConfig } from '../types';

/**
 * Solver result status codes
 */
export type SolverStatus = 'solved' | 'multiple' | 'timeout' | 'unsolvable' | 'error';

/**
 * Result of a solve operation
 */
export interface SolveResult {
  /** Whether the puzzle was solved successfully */
  success: boolean;
  /** Status code for the result (for UI display) */
  status?: SolverStatus;
  /** The solved state (answer layer updated) */
  answer?: PuzzleState['answer'];
  /** Partial answer when solver times out or is interrupted */
  partialAnswer?: PuzzleState['answer'];
  /** Error message if solve failed */
  error?: string;
  /** Time taken to solve in milliseconds */
  time?: number;
  /** Number of solutions found (for uniqueness check) */
  solutionCount?: number;
}

/**
 * Solver adapter interface
 * Each puzzle type implements this to bridge puzzle-kit data to solver-kit
 */
export interface SolverAdapter {
  /** Puzzle type ID (matches constraint schema pid) */
  readonly pid: string;

  /**
   * Solve the puzzle
   * @param grid Grid configuration
   * @param problem Problem layer elements
   * @returns Solve result with answer
   */
  solve(grid: GridConfig, problem: PuzzleState['problem']): Promise<SolveResult>;

  /**
   * Check if puzzle has a unique solution
   * @param grid Grid configuration
   * @param problem Problem layer elements
   * @returns Number of solutions (0 = unsolvable, 1 = unique, >1 = multiple)
   */
  checkUniqueness?(grid: GridConfig, problem: PuzzleState['problem']): Promise<number>;
}

/**
 * Registry of solver adapters
 */
export interface SolverRegistry {
  /** Register a solver adapter */
  register(adapter: SolverAdapter): void;
  /** Get solver adapter by puzzle ID */
  get(pid: string): SolverAdapter | undefined;
  /** Get all registered puzzle IDs */
  getIds(): string[];
  /** Check if solver exists for puzzle ID */
  has(pid: string): boolean;
}
