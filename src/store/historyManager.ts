/**
 * History Manager for PuzzleKit
 *
 * Based on crossword app's architecture:
 * - Snapshot-based history with action log
 * - Support for grouped undo/redo
 * - Maximum history size limit
 * - Event-driven notifications
 */

import type { PuzzleAction } from './actions';
import { reverseAction, getActionDescription } from './actions';

// ========================================
// Types
// ========================================

export interface HistoryEntry {
  id: string;
  action: PuzzleAction;
  timestamp: number;
  groupId?: string;
  description: string;
}

export interface HistoryState {
  entries: HistoryEntry[];
  currentIndex: number;
  groupId: string | null;
  maxSize: number;
}

export type HistoryListener = (state: HistoryState) => void;

// ========================================
// History Manager Class
// ========================================

export class HistoryManager {
  private entries: HistoryEntry[] = [];
  private currentIndex: number = -1;
  private groupId: string | null = null;
  private maxSize: number = 1000;
  private listeners = new Set<HistoryListener>();
  private idCounter: number = 0;

  /**
   * Subscribe to history changes
   */
  subscribe(listener: HistoryListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get current history state
   */
  getState(): HistoryState {
    return {
      entries: [...this.entries],
      currentIndex: this.currentIndex,
      groupId: this.groupId,
      maxSize: this.maxSize,
    };
  }

  /**
   * Start a new history group
   * All actions added while in a group will be undone/redone together
   */
  startGroup(): string {
    this.groupId = `group-${Date.now()}-${this.idCounter++}`;
    return this.groupId;
  }

  /**
   * End the current history group
   */
  endGroup(): void {
    this.groupId = null;
  }

  /**
   * Check if currently in a group
   */
  isInGroup(): boolean {
    return this.groupId !== null;
  }

  /**
   * Add an action to history
   */
  addAction(action: PuzzleAction): void {
    // Remove any redo entries when adding new action
    if (this.currentIndex < this.entries.length - 1) {
      this.entries = this.entries.slice(0, this.currentIndex + 1);
    }

    const entry: HistoryEntry = {
      id: `entry-${Date.now()}-${this.idCounter++}`,
      action,
      timestamp: Date.now(),
      groupId: this.groupId || undefined,
      description: getActionDescription(action),
    };

    this.entries.push(entry);
    this.currentIndex = this.entries.length - 1;

    // Trim history if exceeds max size
    if (this.entries.length > this.maxSize) {
      const excess = this.entries.length - this.maxSize;
      this.entries = this.entries.slice(excess);
      this.currentIndex -= excess;
    }

    this.notifyListeners();
  }

  /**
   * Get actions to undo
   * Returns all actions in the current group or single action
   */
  getUndoActions(): PuzzleAction[] {
    if (this.currentIndex < 0) return [];

    const currentEntry = this.entries[this.currentIndex];
    const groupId = currentEntry.groupId;

    if (groupId) {
      // Collect all consecutive entries with the same groupId going backwards
      const actionsToUndo: PuzzleAction[] = [];
      for (let i = this.currentIndex; i >= 0; i--) {
        const entry = this.entries[i];
        if (entry.groupId === groupId) {
          actionsToUndo.push(reverseAction(entry.action));
        } else {
          break;
        }
      }
      return actionsToUndo;
    } else {
      return [reverseAction(currentEntry.action)];
    }
  }

  /**
   * Get actions to redo
   * Returns all actions in the next group or single action
   */
  getRedoActions(): PuzzleAction[] {
    if (this.currentIndex >= this.entries.length - 1) return [];

    const nextEntry = this.entries[this.currentIndex + 1];
    const groupId = nextEntry.groupId;

    if (groupId) {
      // Collect all consecutive entries with the same groupId going forwards
      const actionsToRedo: PuzzleAction[] = [];
      for (let i = this.currentIndex + 1; i < this.entries.length; i++) {
        const entry = this.entries[i];
        if (entry.groupId === groupId) {
          actionsToRedo.push(entry.action);
        } else {
          break;
        }
      }
      return actionsToRedo;
    } else {
      return [nextEntry.action];
    }
  }

  /**
   * Move history index after undo
   */
  moveToUndo(): void {
    if (this.currentIndex < 0) return;

    const currentEntry = this.entries[this.currentIndex];
    const groupId = currentEntry.groupId;

    if (groupId) {
      // Find first entry in the group
      let firstIndexInGroup = this.currentIndex;
      for (let i = this.currentIndex; i >= 0; i--) {
        if (this.entries[i].groupId === groupId) {
          firstIndexInGroup = i;
        } else {
          break;
        }
      }
      this.currentIndex = firstIndexInGroup - 1;
    } else {
      this.currentIndex--;
    }

    this.notifyListeners();
  }

  /**
   * Move history index after redo
   */
  moveToRedo(): void {
    if (this.currentIndex >= this.entries.length - 1) return;

    const nextEntry = this.entries[this.currentIndex + 1];
    const groupId = nextEntry.groupId;

    if (groupId) {
      // Find last entry in the group
      let lastIndexInGroup = this.currentIndex + 1;
      for (let i = this.currentIndex + 1; i < this.entries.length; i++) {
        if (this.entries[i].groupId === groupId) {
          lastIndexInGroup = i;
        } else {
          break;
        }
      }
      this.currentIndex = lastIndexInGroup;
    } else {
      this.currentIndex++;
    }

    this.notifyListeners();
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.currentIndex < this.entries.length - 1;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.entries = [];
    this.currentIndex = -1;
    this.groupId = null;
    this.notifyListeners();
  }

  /**
   * Get undo description for UI
   */
  getUndoDescription(): string | null {
    if (this.currentIndex < 0) return null;

    const currentEntry = this.entries[this.currentIndex];
    const groupId = currentEntry.groupId;

    if (groupId) {
      // Count actions in group
      let count = 0;
      for (let i = this.currentIndex; i >= 0 && this.entries[i].groupId === groupId; i--) {
        count++;
      }
      return `Undo ${count} operations`;
    }

    return `Undo: ${currentEntry.description}`;
  }

  /**
   * Get redo description for UI
   */
  getRedoDescription(): string | null {
    if (this.currentIndex >= this.entries.length - 1) return null;

    const nextEntry = this.entries[this.currentIndex + 1];
    const groupId = nextEntry.groupId;

    if (groupId) {
      // Count actions in group
      let count = 0;
      for (let i = this.currentIndex + 1; i < this.entries.length && this.entries[i].groupId === groupId; i++) {
        count++;
      }
      return `Redo ${count} operations`;
    }

    return `Redo: ${nextEntry.description}`;
  }

  /**
   * Set max history size
   */
  setMaxSize(size: number): void {
    this.maxSize = Math.max(1, size);

    // Trim if needed
    if (this.entries.length > this.maxSize) {
      const excess = this.entries.length - this.maxSize;
      this.entries = this.entries.slice(excess);
      this.currentIndex = Math.max(-1, this.currentIndex - excess);
    }

    this.notifyListeners();
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }
}

// Singleton instance
export const historyManager = new HistoryManager();
