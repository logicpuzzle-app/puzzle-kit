/**
 * Store Integration Tests
 *
 * Tests for the ActionExecutor and HistoryManager integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { historyManager } from '../store/historyManager';
import { actionExecutor } from '../store/actionExecutor';
import {
  createAddSurfaceAction,
  createRemoveSurfaceAction,
  createAddNumberAction,
  createUpdateNumberAction,
  reverseAction,
  getActionDescription,
} from '../store/actions';
import type { SurfaceElement, NumberElement } from '../types';

describe('actions', () => {
  describe('reverseAction', () => {
    it('reverses ADD_SURFACE to REMOVE_SURFACE', () => {
      const element: SurfaceElement = {
        id: 'test-1',
        layer: 'problem',
        cellId: 'cell-0-0',
        color: '#ff0000',
      };
      const action = createAddSurfaceAction(element);
      const reversed = reverseAction(action);

      expect(reversed.type).toBe('REMOVE_SURFACE');
      if (reversed.type === 'REMOVE_SURFACE') {
        expect(reversed.id).toBe('test-1');
        expect(reversed.element).toEqual(element);
      }
    });

    it('reverses REMOVE_SURFACE to ADD_SURFACE', () => {
      const element: SurfaceElement = {
        id: 'test-1',
        layer: 'problem',
        cellId: 'cell-0-0',
        color: '#ff0000',
      };
      const action = createRemoveSurfaceAction('test-1', element);
      const reversed = reverseAction(action);

      expect(reversed.type).toBe('ADD_SURFACE');
      if (reversed.type === 'ADD_SURFACE') {
        expect(reversed.element).toEqual(element);
      }
    });

    it('reverses UPDATE_NUMBER correctly', () => {
      const action = createUpdateNumberAction('num-1', '5', '7', 'problem');
      const reversed = reverseAction(action);

      expect(reversed.type).toBe('UPDATE_NUMBER');
      if (reversed.type === 'UPDATE_NUMBER') {
        expect(reversed.previousValue).toBe('7');
        expect(reversed.newValue).toBe('5');
      }
    });
  });

  describe('getActionDescription', () => {
    it('returns correct description for ADD_SURFACE', () => {
      const element: SurfaceElement = {
        id: 'test-1',
        layer: 'problem',
        row: 0,
        col: 0,
        color: '#ff0000',
      };
      const action = createAddSurfaceAction(element);
      expect(getActionDescription(action)).toBe('Add surface');
    });

    it('returns correct description for ADD_NUMBER', () => {
      const element: NumberElement = {
        id: 'num-1',
        layer: 'problem',
        row: 0,
        col: 0,
        value: '5',
        size: 'medium',
        position: 'center',
      };
      const action = createAddNumberAction(element);
      expect(getActionDescription(action)).toBe('Add number');
    });
  });
});

describe('historyManager', () => {
  beforeEach(() => {
    historyManager.clear();
  });

  describe('basic operations', () => {
    it('starts with empty state', () => {
      const state = historyManager.getState();
      expect(state.entries).toHaveLength(0);
      expect(state.currentIndex).toBe(-1);
      expect(historyManager.canUndo()).toBe(false);
      expect(historyManager.canRedo()).toBe(false);
    });

    it('adds action to history', () => {
      const element: SurfaceElement = {
        id: 'test-1',
        layer: 'problem',
        row: 0,
        col: 0,
        color: '#ff0000',
      };
      const action = createAddSurfaceAction(element);
      historyManager.addAction(action);

      const state = historyManager.getState();
      expect(state.entries).toHaveLength(1);
      expect(state.currentIndex).toBe(0);
      expect(historyManager.canUndo()).toBe(true);
      expect(historyManager.canRedo()).toBe(false);
    });

    it('returns correct undo actions', () => {
      const element: SurfaceElement = {
        id: 'test-1',
        layer: 'problem',
        row: 0,
        col: 0,
        color: '#ff0000',
      };
      const action = createAddSurfaceAction(element);
      historyManager.addAction(action);

      const undoActions = historyManager.getUndoActions();
      expect(undoActions).toHaveLength(1);
      expect(undoActions[0].type).toBe('REMOVE_SURFACE');
    });

    it('moves index after undo', () => {
      const element: SurfaceElement = {
        id: 'test-1',
        layer: 'problem',
        row: 0,
        col: 0,
        color: '#ff0000',
      };
      historyManager.addAction(createAddSurfaceAction(element));
      historyManager.moveToUndo();

      expect(historyManager.getState().currentIndex).toBe(-1);
      expect(historyManager.canUndo()).toBe(false);
      expect(historyManager.canRedo()).toBe(true);
    });

    it('returns correct redo actions', () => {
      const element: SurfaceElement = {
        id: 'test-1',
        layer: 'problem',
        row: 0,
        col: 0,
        color: '#ff0000',
      };
      historyManager.addAction(createAddSurfaceAction(element));
      historyManager.moveToUndo();

      const redoActions = historyManager.getRedoActions();
      expect(redoActions).toHaveLength(1);
      expect(redoActions[0].type).toBe('ADD_SURFACE');
    });

    it('moves index after redo', () => {
      const element: SurfaceElement = {
        id: 'test-1',
        layer: 'problem',
        row: 0,
        col: 0,
        color: '#ff0000',
      };
      historyManager.addAction(createAddSurfaceAction(element));
      historyManager.moveToUndo();
      historyManager.moveToRedo();

      expect(historyManager.getState().currentIndex).toBe(0);
      expect(historyManager.canUndo()).toBe(true);
      expect(historyManager.canRedo()).toBe(false);
    });
  });

  describe('grouped actions', () => {
    it('groups multiple actions together', () => {
      const groupId = historyManager.startGroup();
      expect(historyManager.isInGroup()).toBe(true);

      const element1: SurfaceElement = {
        id: 'test-1',
        layer: 'problem',
        row: 0,
        col: 0,
        color: '#ff0000',
      };
      const element2: SurfaceElement = {
        id: 'test-2',
        layer: 'problem',
        row: 0,
        col: 1,
        color: '#00ff00',
      };

      historyManager.addAction(createAddSurfaceAction(element1));
      historyManager.addAction(createAddSurfaceAction(element2));
      historyManager.endGroup();

      expect(historyManager.isInGroup()).toBe(false);

      const state = historyManager.getState();
      expect(state.entries).toHaveLength(2);
      expect(state.entries[0].groupId).toBe(groupId);
      expect(state.entries[1].groupId).toBe(groupId);
    });

    it('undoes entire group at once', () => {
      historyManager.startGroup();

      const element1: SurfaceElement = {
        id: 'test-1',
        layer: 'problem',
        row: 0,
        col: 0,
        color: '#ff0000',
      };
      const element2: SurfaceElement = {
        id: 'test-2',
        layer: 'problem',
        row: 0,
        col: 1,
        color: '#00ff00',
      };

      historyManager.addAction(createAddSurfaceAction(element1));
      historyManager.addAction(createAddSurfaceAction(element2));
      historyManager.endGroup();

      // Add another action outside the group
      const element3: SurfaceElement = {
        id: 'test-3',
        layer: 'problem',
        row: 1,
        col: 0,
        color: '#0000ff',
      };
      historyManager.addAction(createAddSurfaceAction(element3));

      // Undo single action (not grouped)
      historyManager.moveToUndo();
      expect(historyManager.getState().currentIndex).toBe(1);

      // Undo grouped actions - should undo both at once
      const undoActions = historyManager.getUndoActions();
      expect(undoActions).toHaveLength(2);
      historyManager.moveToUndo();
      expect(historyManager.getState().currentIndex).toBe(-1);
    });
  });

  describe('history limit', () => {
    it('respects max size limit', () => {
      historyManager.setMaxSize(5);

      for (let i = 0; i < 10; i++) {
        const element: SurfaceElement = {
          id: `test-${i}`,
          layer: 'problem',
          row: 0,
          col: i,
          color: '#ff0000',
        };
        historyManager.addAction(createAddSurfaceAction(element));
      }

      const state = historyManager.getState();
      expect(state.entries.length).toBeLessThanOrEqual(5);
    });
  });

  describe('descriptions', () => {
    it('returns undo description', () => {
      const element: SurfaceElement = {
        id: 'test-1',
        layer: 'problem',
        row: 0,
        col: 0,
        color: '#ff0000',
      };
      historyManager.addAction(createAddSurfaceAction(element));

      const description = historyManager.getUndoDescription();
      expect(description).toBe('Undo: Add surface');
    });

    it('returns redo description', () => {
      const element: SurfaceElement = {
        id: 'test-1',
        layer: 'problem',
        row: 0,
        col: 0,
        color: '#ff0000',
      };
      historyManager.addAction(createAddSurfaceAction(element));
      historyManager.moveToUndo();

      const description = historyManager.getRedoDescription();
      expect(description).toBe('Redo: Add surface');
    });

    it('returns grouped undo description', () => {
      historyManager.startGroup();
      const element1: SurfaceElement = {
        id: 'test-1',
        layer: 'problem',
        row: 0,
        col: 0,
        color: '#ff0000',
      };
      const element2: SurfaceElement = {
        id: 'test-2',
        layer: 'problem',
        row: 0,
        col: 1,
        color: '#00ff00',
      };
      historyManager.addAction(createAddSurfaceAction(element1));
      historyManager.addAction(createAddSurfaceAction(element2));
      historyManager.endGroup();

      const description = historyManager.getUndoDescription();
      expect(description).toBe('Undo 2 operations');
    });
  });

  describe('subscription', () => {
    it('notifies listeners on changes', () => {
      let notified = false;
      const unsubscribe = historyManager.subscribe(() => {
        notified = true;
      });

      const element: SurfaceElement = {
        id: 'test-1',
        layer: 'problem',
        row: 0,
        col: 0,
        color: '#ff0000',
      };
      historyManager.addAction(createAddSurfaceAction(element));

      expect(notified).toBe(true);
      unsubscribe();
    });
  });
});

describe('actionExecutor', () => {
  it('warns when no mutator is set', () => {
    // Reset the mutator
    actionExecutor.setMutator(null as any);

    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const element: SurfaceElement = {
      id: 'test-1',
      layer: 'problem',
      row: 0,
      col: 0,
      color: '#ff0000',
    };
    actionExecutor.execute(createAddSurfaceAction(element));

    expect(consoleWarn).toHaveBeenCalled();
    consoleWarn.mockRestore();
  });
});
