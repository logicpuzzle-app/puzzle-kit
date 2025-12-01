/**
 * Migration System
 *
 * Handles versioned migrations for puzzle export format changes.
 *
 * Usage:
 *   import { migrationRegistry } from './migrations';
 *
 *   // Migrate data to current version
 *   const result = migrationRegistry.migrate(puzzleData);
 *   if (result.success) {
 *     // Use result.data
 *   } else {
 *     // Handle error: result.error
 *   }
 */

export * from './types';
export { migrationRegistry, parseVersion, compareVersions, isVersionLessThan } from './registry';

// Import to register migrations
import './migrations';
