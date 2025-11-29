/**
 * Penpa-compatible Command Stack
 *
 * Implements command history format compatible with Penpa-edit's
 * command_undo, command_redo, and command_replay stacks.
 */

import type { PenpaStackData } from '../utils/penpaSerializer';

// ========================================
// Types
// ========================================

/**
 * Penpa-compatible command structure
 */
export interface PenpaCommand {
  /** Target property path (e.g., 'pu_q.surface', 'pu_a.line') */
  target: string;
  /** Key in the target object */
  key: string;
  /** Previous value (for undo) */
  prev: unknown;
  /** New value */
  value: unknown;
  /** Timestamp */
  time?: number;
}

/**
 * Batch command (groups multiple commands)
 */
export interface PenpaBatchCommand {
  type: 'batch';
  commands: PenpaCommand[];
  time?: number;
}

export type PenpaCommandEntry = PenpaCommand | PenpaBatchCommand;

/**
 * Check if command is a batch
 */
export function isBatchCommand(cmd: PenpaCommandEntry): cmd is PenpaBatchCommand {
  return 'type' in cmd && cmd.type === 'batch';
}

// ========================================
// Command Stack Class
// ========================================

/**
 * Penpa-compatible command stack
 * Maintains undo/redo history in Penpa format
 */
export class PenpaCommandStack {
  private undoStack: PenpaCommandEntry[] = [];
  private redoStack: PenpaCommandEntry[] = [];
  private replayStack: PenpaCommandEntry[] = [];
  private maxSize: number = 5000;
  private batchMode: boolean = false;
  private currentBatch: PenpaCommand[] = [];

  /**
   * Create a new command stack
   */
  constructor(maxSize: number = 5000) {
    this.maxSize = maxSize;
  }

  /**
   * Push a command to the undo stack
   */
  push(command: PenpaCommand): void {
    if (this.batchMode) {
      this.currentBatch.push(command);
    } else {
      this.addToUndo(command);
    }

    // Clear redo stack when new command is pushed
    this.redoStack = [];
  }

  /**
   * Start a batch operation
   * All commands until endBatch() will be grouped
   */
  startBatch(): void {
    this.batchMode = true;
    this.currentBatch = [];
  }

  /**
   * End batch operation and commit as single entry
   */
  endBatch(): void {
    if (!this.batchMode) return;

    this.batchMode = false;
    if (this.currentBatch.length > 0) {
      if (this.currentBatch.length === 1) {
        this.addToUndo(this.currentBatch[0]);
      } else {
        this.addToUndo({
          type: 'batch',
          commands: this.currentBatch,
          time: Date.now(),
        });
      }
    }
    this.currentBatch = [];
    this.redoStack = [];
  }

  /**
   * Cancel batch operation without committing
   */
  cancelBatch(): PenpaCommand[] {
    this.batchMode = false;
    const cancelled = this.currentBatch;
    this.currentBatch = [];
    return cancelled;
  }

  /**
   * Check if currently in batch mode
   */
  isInBatch(): boolean {
    return this.batchMode;
  }

  /**
   * Get the top command from undo stack (without removing)
   */
  peekUndo(): PenpaCommandEntry | undefined {
    return this.undoStack[this.undoStack.length - 1];
  }

  /**
   * Get the top command from redo stack (without removing)
   */
  peekRedo(): PenpaCommandEntry | undefined {
    return this.redoStack[this.redoStack.length - 1];
  }

  /**
   * Pop from undo stack and push to redo
   */
  undo(): PenpaCommandEntry | undefined {
    const command = this.undoStack.pop();
    if (command) {
      this.redoStack.push(command);
    }
    return command;
  }

  /**
   * Pop from redo stack and push to undo
   */
  redo(): PenpaCommandEntry | undefined {
    const command = this.redoStack.pop();
    if (command) {
      this.undoStack.push(command);
    }
    return command;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Clear all stacks
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.currentBatch = [];
    this.batchMode = false;
  }

  /**
   * Clear only redo stack
   */
  clearRedo(): void {
    this.redoStack = [];
  }

  /**
   * Add command to replay stack
   */
  addToReplay(command: PenpaCommandEntry): void {
    this.replayStack.push(command);
    this.trimStack(this.replayStack);
  }

  /**
   * Get replay stack
   */
  getReplayStack(): PenpaCommandEntry[] {
    return [...this.replayStack];
  }

  /**
   * Clear replay stack
   */
  clearReplay(): void {
    this.replayStack = [];
  }

  /**
   * Get undo stack size
   */
  getUndoSize(): number {
    return this.undoStack.length;
  }

  /**
   * Get redo stack size
   */
  getRedoSize(): number {
    return this.redoStack.length;
  }

  // ========================================
  // Penpa Format Export/Import
  // ========================================

  /**
   * Export to Penpa stack format
   */
  toStackData(): {
    command_undo: PenpaStackData;
    command_redo: PenpaStackData;
    command_replay: PenpaStackData;
  } {
    return {
      command_undo: { __a: [...this.undoStack] },
      command_redo: { __a: [...this.redoStack] },
      command_replay: { __a: [...this.replayStack] },
    };
  }

  /**
   * Import from Penpa stack format
   */
  fromStackData(data: {
    command_undo?: PenpaStackData;
    command_redo?: PenpaStackData;
    command_replay?: PenpaStackData;
  }): void {
    this.undoStack = (data.command_undo?.__a as PenpaCommandEntry[]) || [];
    this.redoStack = (data.command_redo?.__a as PenpaCommandEntry[]) || [];
    this.replayStack = (data.command_replay?.__a as PenpaCommandEntry[]) || [];
  }

  // ========================================
  // Internal Methods
  // ========================================

  private addToUndo(command: PenpaCommandEntry): void {
    this.undoStack.push(command);
    this.trimStack(this.undoStack);
  }

  private trimStack(stack: PenpaCommandEntry[]): void {
    while (stack.length > this.maxSize) {
      stack.shift();
    }
  }
}

// ========================================
// Command Execution Helpers
// ========================================

/**
 * Create a command for setting a value
 */
export function createSetCommand(
  target: string,
  key: string,
  prev: unknown,
  value: unknown
): PenpaCommand {
  return {
    target,
    key,
    prev,
    value,
    time: Date.now(),
  };
}

/**
 * Create the reverse command (for undo)
 */
export function reverseCommand(command: PenpaCommand): PenpaCommand {
  return {
    target: command.target,
    key: command.key,
    prev: command.value,
    value: command.prev,
    time: Date.now(),
  };
}

/**
 * Reverse a batch command
 */
export function reverseBatchCommand(batch: PenpaBatchCommand): PenpaBatchCommand {
  return {
    type: 'batch',
    commands: batch.commands.map(reverseCommand).reverse(),
    time: Date.now(),
  };
}

/**
 * Reverse any command entry
 */
export function reverseCommandEntry(entry: PenpaCommandEntry): PenpaCommandEntry {
  if (isBatchCommand(entry)) {
    return reverseBatchCommand(entry);
  }
  return reverseCommand(entry);
}

/**
 * Get all individual commands from an entry (flattens batches)
 */
export function flattenCommandEntry(entry: PenpaCommandEntry): PenpaCommand[] {
  if (isBatchCommand(entry)) {
    return entry.commands;
  }
  return [entry];
}

// ========================================
// Singleton Instance
// ========================================

export const penpaCommandStack = new PenpaCommandStack();

// ========================================
// Integration with HistoryManager
// ========================================

import { historyManager } from './historyManager';
import type { PuzzleAction } from './actions';

/**
 * Convert PuzzleAction to PenpaCommand
 */
export function actionToPenpaCommand(action: PuzzleAction): PenpaCommand | null {
  switch (action.type) {
    case 'ADD_SURFACE':
      return createSetCommand(
        `pu_${action.element.layer === 'problem' ? 'q' : 'a'}.surface`,
        action.element.id,
        undefined,
        action.element
      );
    case 'REMOVE_SURFACE':
      return createSetCommand(
        `pu_${action.element.layer === 'problem' ? 'q' : 'a'}.surface`,
        action.id,
        action.element,
        undefined
      );
    case 'ADD_LINE':
      return createSetCommand(
        `pu_${action.element.layer === 'problem' ? 'q' : 'a'}.line`,
        action.element.id,
        undefined,
        action.element
      );
    case 'REMOVE_LINE':
      return createSetCommand(
        `pu_${action.element.layer === 'problem' ? 'q' : 'a'}.line`,
        action.id,
        action.element,
        undefined
      );
    case 'ADD_NUMBER':
      return createSetCommand(
        `pu_${action.element.layer === 'problem' ? 'q' : 'a'}.number`,
        action.element.id,
        undefined,
        action.element
      );
    case 'REMOVE_NUMBER':
      return createSetCommand(
        `pu_${action.element.layer === 'problem' ? 'q' : 'a'}.number`,
        action.id,
        action.element,
        undefined
      );
    case 'UPDATE_NUMBER':
      return createSetCommand(
        `pu_${action.layer === 'problem' ? 'q' : 'a'}.number.${action.id}`,
        'value',
        action.previousValue,
        action.newValue
      );
    case 'ADD_SYMBOL':
      return createSetCommand(
        `pu_${action.element.layer === 'problem' ? 'q' : 'a'}.symbol`,
        action.element.id,
        undefined,
        action.element
      );
    case 'REMOVE_SYMBOL':
      return createSetCommand(
        `pu_${action.element.layer === 'problem' ? 'q' : 'a'}.symbol`,
        action.id,
        action.element,
        undefined
      );
    default:
      return null;
  }
}

/**
 * Sync HistoryManager entries to PenpaCommandStack
 */
export function syncHistoryToCommandStack(): void {
  const historyState = historyManager.getState();
  penpaCommandStack.clear();

  for (let i = 0; i <= historyState.currentIndex; i++) {
    const entry = historyState.entries[i];
    const penpaCmd = actionToPenpaCommand(entry.action);
    if (penpaCmd) {
      penpaCommandStack.push(penpaCmd);
    }
  }
}
