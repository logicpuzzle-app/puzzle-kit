/**
 * Storage Module
 *
 * Provides a pluggable storage system for puzzle sharing.
 * Uses adapters to support different storage backends.
 */

export * from './types';
export { FirebaseStorageAdapter, getFirebaseStorageAdapter } from './adapters/firebase';

import type { StorageAdapter, StorageConfig } from './types';
import { getFirebaseStorageAdapter } from './adapters/firebase';

/**
 * Available storage adapter types
 */
export type StorageAdapterType = 'firebase' | 'custom';

/**
 * Storage adapter registry
 */
class StorageRegistry {
  private adapters = new Map<string, StorageAdapter>();
  private defaultAdapter: StorageAdapter | null = null;

  /**
   * Register a storage adapter
   */
  register(name: string, adapter: StorageAdapter): void {
    this.adapters.set(name, adapter);
    if (!this.defaultAdapter) {
      this.defaultAdapter = adapter;
    }
  }

  /**
   * Get a storage adapter by name
   */
  get(name: string): StorageAdapter | null {
    return this.adapters.get(name) || null;
  }

  /**
   * Get the default storage adapter
   */
  getDefault(): StorageAdapter | null {
    return this.defaultAdapter;
  }

  /**
   * Set the default storage adapter
   */
  setDefault(name: string): boolean {
    const adapter = this.adapters.get(name);
    if (adapter) {
      this.defaultAdapter = adapter;
      return true;
    }
    return false;
  }

  /**
   * Get all registered adapter names
   */
  getNames(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Check if any adapter is available
   */
  hasAvailable(): boolean {
    for (const adapter of this.adapters.values()) {
      if (adapter.isAvailable()) {
        return true;
      }
    }
    return false;
  }
}

// Global registry instance
const registry = new StorageRegistry();

/**
 * Initialize storage with default adapters
 */
export function initializeStorage(config?: StorageConfig): void {
  // Register Firebase adapter
  const firebaseAdapter = getFirebaseStorageAdapter(config);
  registry.register('firebase', firebaseAdapter);
}

/**
 * Get the storage registry
 */
export function getStorageRegistry(): StorageRegistry {
  return registry;
}

/**
 * Get the default storage adapter
 */
export function getStorageAdapter(): StorageAdapter | null {
  return registry.getDefault();
}

/**
 * Get a specific storage adapter by name
 */
export function getStorageAdapterByName(name: string): StorageAdapter | null {
  return registry.get(name);
}

/**
 * Register a custom storage adapter
 */
export function registerStorageAdapter(name: string, adapter: StorageAdapter): void {
  registry.register(name, adapter);
}

/**
 * Check if storage is available
 */
export function isStorageAvailable(): boolean {
  const adapter = registry.getDefault();
  return adapter !== null && adapter.isAvailable();
}
