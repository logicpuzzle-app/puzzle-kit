/**
 * Migration System Types
 *
 * Provides versioned migrations for puzzle export format changes.
 */

/**
 * Raw puzzle data before migration (unknown structure)
 */
export type RawPuzzleData = Record<string, unknown>;

/**
 * Migration function that transforms data from one version to the next
 */
export type MigrationFn = (data: RawPuzzleData) => RawPuzzleData;

/**
 * Migration definition
 */
export interface Migration {
  /** Source version (migrate FROM this version) */
  from: string;
  /** Target version (migrate TO this version) */
  to: string;
  /** Description of what this migration does */
  description: string;
  /** Migration function */
  migrate: MigrationFn;
}

/**
 * Result of migration process
 */
export interface MigrationResult {
  /** Whether migration was successful */
  success: boolean;
  /** Final data after all migrations */
  data: RawPuzzleData;
  /** Original version */
  fromVersion: string;
  /** Final version */
  toVersion: string;
  /** List of migrations applied */
  migrationsApplied: string[];
  /** Error message if failed */
  error?: string;
}

/**
 * Semantic version components
 */
export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
}
