/**
 * Test Cases - Registry of all puzzle test cases
 */

import type { PuzzleTestData, TestCaseRegistry } from './types';
import { slitherlinkTestData } from './slitherlink';
import { mashuTestData } from './mashu';
import { nurikabeTestData } from './nurikabe';
import { yajilinTestData } from './yajilin';
import { heyawakeTestData } from './heyawake';
import { akichiTestData } from './akichi';
import { numlinTestData } from './numlin';
import { simpleloopTestData } from './simpleloop';

// Re-export types
export * from './types';

/**
 * All registered test data
 */
const testDataMap: Record<string, PuzzleTestData> = {
  slither: slitherlinkTestData,
  mashu: mashuTestData,
  nurikabe: nurikabeTestData,
  yajilin: yajilinTestData,
  heyawake: heyawakeTestData,
  akichi: akichiTestData,
  numlin: numlinTestData,
  simpleloop: simpleloopTestData,
};

/**
 * Test case registry implementation
 */
class TestCaseRegistryImpl implements TestCaseRegistry {
  getTestData(pid: string): PuzzleTestData | undefined {
    return testDataMap[pid];
  }

  getPuzzleIds(): string[] {
    return Object.keys(testDataMap);
  }

  hasTestData(pid: string): boolean {
    return pid in testDataMap;
  }
}

/**
 * Singleton instance
 */
export const testCaseRegistry = new TestCaseRegistryImpl();
