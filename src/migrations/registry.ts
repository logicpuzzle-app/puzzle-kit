/**
 * Migration Registry
 *
 * Manages and executes migrations between puzzle format versions.
 */

import type { Migration, MigrationResult, RawPuzzleData, SemanticVersion } from './types';
import { PUZZLE_EXPORT_VERSION } from '../constants/version';

/**
 * Parse semantic version string
 */
export function parseVersion(version: string): SemanticVersion {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

/**
 * Compare two versions
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareVersions(a: string, b: string): number {
  const va = parseVersion(a);
  const vb = parseVersion(b);

  if (va.major !== vb.major) return va.major < vb.major ? -1 : 1;
  if (va.minor !== vb.minor) return va.minor < vb.minor ? -1 : 1;
  if (va.patch !== vb.patch) return va.patch < vb.patch ? -1 : 1;
  return 0;
}

/**
 * Check if version a is less than version b
 */
export function isVersionLessThan(a: string, b: string): boolean {
  return compareVersions(a, b) < 0;
}

/**
 * Migration registry singleton
 */
class MigrationRegistry {
  private migrations: Migration[] = [];

  /**
   * Register a migration
   */
  register(migration: Migration): void {
    // Validate version format
    parseVersion(migration.from);
    parseVersion(migration.to);

    // Ensure 'to' is greater than 'from'
    if (!isVersionLessThan(migration.from, migration.to)) {
      throw new Error(
        `Invalid migration: 'to' version (${migration.to}) must be greater than 'from' version (${migration.from})`
      );
    }

    // Check for duplicate
    const existing = this.migrations.find(
      (m) => m.from === migration.from && m.to === migration.to
    );
    if (existing) {
      throw new Error(`Migration from ${migration.from} to ${migration.to} already exists`);
    }

    this.migrations.push(migration);

    // Keep migrations sorted by 'from' version
    this.migrations.sort((a, b) => compareVersions(a.from, b.from));
  }

  /**
   * Get all registered migrations
   */
  getAll(): readonly Migration[] {
    return this.migrations;
  }

  /**
   * Find migration path from source to target version
   * Returns array of migrations to apply in order
   */
  findMigrationPath(fromVersion: string, toVersion: string): Migration[] {
    if (compareVersions(fromVersion, toVersion) >= 0) {
      // Already at or above target version
      return [];
    }

    const path: Migration[] = [];
    let currentVersion = fromVersion;

    while (isVersionLessThan(currentVersion, toVersion)) {
      // Find next migration from current version
      const nextMigration = this.migrations.find(
        (m) =>
          m.from === currentVersion ||
          (isVersionLessThan(m.from, currentVersion) &&
            isVersionLessThan(currentVersion, m.to) &&
            compareVersions(m.to, toVersion) <= 0)
      );

      if (!nextMigration) {
        // No direct migration, try to find any migration that covers current version
        const coveringMigration = this.migrations.find(
          (m) =>
            isVersionLessThan(m.from, currentVersion) &&
            isVersionLessThan(currentVersion, m.to)
        );

        if (coveringMigration) {
          path.push(coveringMigration);
          currentVersion = coveringMigration.to;
        } else {
          // No migration available - might be compatible without migration
          break;
        }
      } else {
        path.push(nextMigration);
        currentVersion = nextMigration.to;
      }
    }

    return path;
  }

  /**
   * Migrate data from its version to current version
   */
  migrate(data: RawPuzzleData): MigrationResult {
    const dataVersion = (data.version as string) || '1.0.0';
    const targetVersion = PUZZLE_EXPORT_VERSION;

    // Check if already at current version
    if (compareVersions(dataVersion, targetVersion) >= 0) {
      return {
        success: true,
        data,
        fromVersion: dataVersion,
        toVersion: dataVersion,
        migrationsApplied: [],
      };
    }

    // Check if major version is higher than current (future version)
    const dataMajor = parseVersion(dataVersion).major;
    const targetMajor = parseVersion(targetVersion).major;
    if (dataMajor > targetMajor) {
      return {
        success: false,
        data,
        fromVersion: dataVersion,
        toVersion: targetVersion,
        migrationsApplied: [],
        error: `Cannot migrate from future version ${dataVersion} to ${targetVersion}`,
      };
    }

    // Find migration path
    const path = this.findMigrationPath(dataVersion, targetVersion);

    if (path.length === 0 && isVersionLessThan(dataVersion, targetVersion)) {
      // No migrations needed but version is older - minor/patch versions are compatible
      const dataVer = parseVersion(dataVersion);
      const targetVer = parseVersion(targetVersion);

      if (dataVer.major === targetVer.major) {
        // Same major version - compatible without migration
        return {
          success: true,
          data: { ...data, version: targetVersion },
          fromVersion: dataVersion,
          toVersion: targetVersion,
          migrationsApplied: [],
        };
      }
    }

    // Apply migrations
    let migratedData = { ...data };
    const applied: string[] = [];

    try {
      for (const migration of path) {
        migratedData = migration.migrate(migratedData);
        migratedData.version = migration.to;
        applied.push(`${migration.from} → ${migration.to}: ${migration.description}`);
      }

      // Update to current version if path didn't reach it
      if (isVersionLessThan(migratedData.version as string, targetVersion)) {
        migratedData.version = targetVersion;
      }

      return {
        success: true,
        data: migratedData,
        fromVersion: dataVersion,
        toVersion: migratedData.version as string,
        migrationsApplied: applied,
      };
    } catch (error) {
      return {
        success: false,
        data,
        fromVersion: dataVersion,
        toVersion: targetVersion,
        migrationsApplied: applied,
        error: error instanceof Error ? error.message : 'Unknown migration error',
      };
    }
  }

  /**
   * Check if data needs migration
   */
  needsMigration(data: RawPuzzleData): boolean {
    const dataVersion = (data.version as string) || '1.0.0';
    const targetVersion = PUZZLE_EXPORT_VERSION;

    // Only need migration for major version changes
    const dataMajor = parseVersion(dataVersion).major;
    const targetMajor = parseVersion(targetVersion).major;

    return dataMajor < targetMajor;
  }

  /**
   * Clear all migrations (for testing)
   */
  clear(): void {
    this.migrations = [];
  }
}

// Singleton instance
export const migrationRegistry = new MigrationRegistry();
