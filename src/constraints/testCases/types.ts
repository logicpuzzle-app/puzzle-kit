/**
 * Test Case Types - Types for pzpr-puzzlink test case data
 */

/**
 * A single fail check test case
 * - failcode: null means the puzzle is complete/correct
 * - pzprv3: The pzprv3 format puzzle string
 */
export interface FailCheckCase {
  /** Fail code from pzpr (null = correct/complete) */
  failcode: string | null;
  /** pzprv3 format puzzle string */
  pzprv3: string;
  /** Optional description for this test case */
  description?: string;
}

/**
 * Test data for a puzzle type
 */
export interface PuzzleTestData {
  /** Puzzle ID (e.g., 'slither', 'mashu') */
  pid: string;
  /** URL parameter for puzz.link */
  url: string;
  /** Fail check test cases */
  failchecks: FailCheckCase[];
}

/**
 * Registry of all test cases
 */
export interface TestCaseRegistry {
  /** Get test data for a puzzle ID */
  getTestData(pid: string): PuzzleTestData | undefined;
  /** Get all puzzle IDs with test data */
  getPuzzleIds(): string[];
  /** Check if test data exists for a puzzle ID */
  hasTestData(pid: string): boolean;
}
