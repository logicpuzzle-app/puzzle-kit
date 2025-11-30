/**
 * State Persistence for PuzzleKit
 *
 * Handles saving and loading puzzle state to/from localStorage
 * - Auto-save on state changes (debounced)
 * - Manual save/load
 * - Multiple puzzle slots
 */

import type { GridConfig, PuzzleState, ToolSettings } from '../types';
import type { SerializedTopology } from '../utils/serialization';

// ========================================
// Types
// ========================================

export interface PersistedState {
  version: string;
  grid: GridConfig;
  puzzle: PuzzleState;
  toolSettings?: Partial<ToolSettings>;
  topology?: SerializedTopology;
  useTopology?: boolean;
  topologyPreset?: string;
  topologyIntensity?: number;
  metadata?: {
    title?: string;
    author?: string;
    savedAt: string;
    lastModified: string;
  };
}

export interface PuzzleSlot {
  id: string;
  name: string;
  savedAt: string;
  preview?: string; // Thumbnail or description
}

// ========================================
// Constants
// ========================================

const STORAGE_PREFIX = 'puzzlekit_';
const CURRENT_VERSION = '1.0.0';
const AUTO_SAVE_KEY = `${STORAGE_PREFIX}autosave`;
const SLOTS_KEY = `${STORAGE_PREFIX}slots`;
const MAX_SLOTS = 10;

// ========================================
// Persistence Manager
// ========================================

export class PersistenceManager {
  private autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;
  private autoSaveDelay: number = 2000; // 2 seconds debounce
  private listeners = new Set<(slots: PuzzleSlot[]) => void>();

  /**
   * Subscribe to slot list changes
   */
  subscribe(listener: (slots: PuzzleSlot[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Check if localStorage is available
   */
  isAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Save state to a slot
   */
  saveToSlot(
    slotId: string,
    state: PersistedState,
    name?: string
  ): boolean {
    if (!this.isAvailable()) return false;

    try {
      const key = `${STORAGE_PREFIX}slot_${slotId}`;
      const data: PersistedState = {
        ...state,
        version: CURRENT_VERSION,
        metadata: {
          ...state.metadata,
          savedAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
        },
      };

      localStorage.setItem(key, JSON.stringify(data));

      // Update slots list
      const slots = this.getSlots();
      const existingIndex = slots.findIndex(s => s.id === slotId);
      const slot: PuzzleSlot = {
        id: slotId,
        name: name || `Puzzle ${slotId}`,
        savedAt: new Date().toISOString(),
        preview: this.generatePreview(state),
      };

      if (existingIndex >= 0) {
        slots[existingIndex] = slot;
      } else {
        slots.push(slot);
      }

      // Limit slots
      if (slots.length > MAX_SLOTS) {
        // Remove oldest
        slots.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
        const removed = slots.splice(MAX_SLOTS);
        removed.forEach(s => localStorage.removeItem(`${STORAGE_PREFIX}slot_${s.id}`));
      }

      localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
      this.notifyListeners();

      return true;
    } catch (error) {
      console.error('[PersistenceManager] Failed to save:', error);
      return false;
    }
  }

  /**
   * Load state from a slot
   */
  loadFromSlot(slotId: string): PersistedState | null {
    if (!this.isAvailable()) return null;

    try {
      const key = `${STORAGE_PREFIX}slot_${slotId}`;
      const data = localStorage.getItem(key);
      if (!data) return null;

      const parsed = JSON.parse(data) as PersistedState;
      return this.migrateIfNeeded(parsed);
    } catch (error) {
      console.error('[PersistenceManager] Failed to load:', error);
      return null;
    }
  }

  /**
   * Delete a slot
   */
  deleteSlot(slotId: string): boolean {
    if (!this.isAvailable()) return false;

    try {
      const key = `${STORAGE_PREFIX}slot_${slotId}`;
      localStorage.removeItem(key);

      const slots = this.getSlots().filter(s => s.id !== slotId);
      localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
      this.notifyListeners();

      return true;
    } catch (error) {
      console.error('[PersistenceManager] Failed to delete:', error);
      return false;
    }
  }

  /**
   * Get all saved slots
   */
  getSlots(): PuzzleSlot[] {
    if (!this.isAvailable()) return [];

    try {
      const data = localStorage.getItem(SLOTS_KEY);
      if (!data) return [];
      return JSON.parse(data) as PuzzleSlot[];
    } catch {
      return [];
    }
  }

  /**
   * Auto-save state (debounced)
   */
  autoSave(state: PersistedState): void {
    if (!this.isAvailable()) return;

    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.autoSaveTimeout = setTimeout(() => {
      try {
        const data: PersistedState = {
          ...state,
          version: CURRENT_VERSION,
          metadata: {
            ...state.metadata,
            lastModified: new Date().toISOString(),
            savedAt: state.metadata?.savedAt || new Date().toISOString(),
          },
        };
        localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(data));
      } catch (error) {
        console.error('[PersistenceManager] Auto-save failed:', error);
      }
    }, this.autoSaveDelay);
  }

  /**
   * Load auto-saved state
   */
  loadAutoSave(): PersistedState | null {
    if (!this.isAvailable()) return null;

    try {
      const data = localStorage.getItem(AUTO_SAVE_KEY);
      if (!data) return null;

      const parsed = JSON.parse(data) as PersistedState;
      return this.migrateIfNeeded(parsed);
    } catch (error) {
      console.error('[PersistenceManager] Failed to load auto-save:', error);
      return null;
    }
  }

  /**
   * Clear auto-save
   */
  clearAutoSave(): void {
    if (!this.isAvailable()) return;

    try {
      localStorage.removeItem(AUTO_SAVE_KEY);
    } catch (error) {
      console.error('[PersistenceManager] Failed to clear auto-save:', error);
    }
  }

  /**
   * Set auto-save delay
   */
  setAutoSaveDelay(ms: number): void {
    this.autoSaveDelay = Math.max(500, ms);
  }

  /**
   * Export state as JSON string
   */
  exportAsJson(state: PersistedState): string {
    const data: PersistedState = {
      ...state,
      version: CURRENT_VERSION,
      metadata: {
        ...state.metadata,
        savedAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import state from JSON string
   */
  importFromJson(json: string): PersistedState | null {
    try {
      const parsed = JSON.parse(json) as PersistedState;
      return this.migrateIfNeeded(parsed);
    } catch (error) {
      console.error('[PersistenceManager] Failed to import:', error);
      return null;
    }
  }

  /**
   * Generate preview text for a puzzle
   */
  private generatePreview(state: PersistedState): string {
    const { grid, puzzle } = state;
    const elementCounts = [
      Object.keys(puzzle.problem.surfaces).length,
      Object.keys(puzzle.problem.lines).length,
      Object.keys(puzzle.problem.numbers).length,
      Object.keys(puzzle.problem.symbols).length,
    ].filter(c => c > 0);

    return `${grid.rows}x${grid.cols} - ${elementCounts.length > 0 ? `${elementCounts.reduce((a, b) => a + b, 0)} elements` : 'Empty'}`;
  }

  /**
   * Migrate old state format if needed
   */
  private migrateIfNeeded(state: PersistedState): PersistedState {
    // Future migrations can be added here
    // For now, just ensure version is set
    return {
      ...state,
      version: state.version || CURRENT_VERSION,
    };
  }

  /**
   * Notify listeners of slot changes
   */
  private notifyListeners(): void {
    const slots = this.getSlots();
    this.listeners.forEach(listener => listener(slots));
  }

  /**
   * Clear all saved data
   */
  clearAll(): void {
    if (!this.isAvailable()) return;

    try {
      // Get all keys with our prefix
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_PREFIX)) {
          keys.push(key);
        }
      }

      // Remove all
      keys.forEach(key => localStorage.removeItem(key));
      this.notifyListeners();
    } catch (error) {
      console.error('[PersistenceManager] Failed to clear all:', error);
    }
  }
}

// Singleton instance
export const persistenceManager = new PersistenceManager();

// ========================================
// Helper hook for React
// ========================================

import { useState, useEffect, useCallback } from 'react';

export function usePersistence() {
  const [slots, setSlots] = useState<PuzzleSlot[]>([]);
  const [hasAutoSave, setHasAutoSave] = useState(false);

  useEffect(() => {
    // Initial load
    setSlots(persistenceManager.getSlots());
    setHasAutoSave(persistenceManager.loadAutoSave() !== null);

    // Subscribe to changes
    const unsubscribe = persistenceManager.subscribe(setSlots);
    return unsubscribe;
  }, []);

  const saveToSlot = useCallback((slotId: string, state: PersistedState, name?: string) => {
    return persistenceManager.saveToSlot(slotId, state, name);
  }, []);

  const loadFromSlot = useCallback((slotId: string) => {
    return persistenceManager.loadFromSlot(slotId);
  }, []);

  const deleteSlot = useCallback((slotId: string) => {
    return persistenceManager.deleteSlot(slotId);
  }, []);

  const loadAutoSave = useCallback(() => {
    return persistenceManager.loadAutoSave();
  }, []);

  const clearAutoSave = useCallback(() => {
    persistenceManager.clearAutoSave();
    setHasAutoSave(false);
  }, []);

  return {
    slots,
    hasAutoSave,
    saveToSlot,
    loadFromSlot,
    deleteSlot,
    loadAutoSave,
    clearAutoSave,
    exportAsJson: persistenceManager.exportAsJson.bind(persistenceManager),
    importFromJson: persistenceManager.importFromJson.bind(persistenceManager),
  };
}
