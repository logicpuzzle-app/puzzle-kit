/**
 * Migration Definitions
 *
 * Register all migrations here.
 * Migrations are applied in order based on version numbers.
 */

import { migrationRegistry } from '../registry';
import type { Migration } from '../types';

/**
 * Example migration for future major version change
 *
 * When upgrading from 1.x.x to 2.0.0, add a migration like:
 *
 * const migration1to2: Migration = {
 *   from: '1.0.0',
 *   to: '2.0.0',
 *   description: 'Migrate to v2 format',
 *   migrate: (data) => {
 *     // Transform data structure
 *     return {
 *       ...data,
 *       // new fields or restructured data
 *     };
 *   },
 * };
 *
 * migrationRegistry.register(migration1to2);
 */

// Currently no migrations needed as we're on v1.x
// Minor version changes (1.0.0 → 1.1.0) are backward compatible

/**
 * Initialize migrations
 * Call this at app startup to register all migrations
 */
export function initializeMigrations(): void {
  // Register migrations here as they are added
  // Example:
  // migrationRegistry.register(migration1to2);
}

// Auto-initialize on import
initializeMigrations();
