import { describe, it, expect, vi } from 'vitest';
import { createPuzzleStore } from '../store/puzzleStore';
import { createModalStore } from '../store/modalStore';

const number = {
  cellId: 'cell-0-0', size: 'medium' as const, position: 'center' as const,
  color: '#000000', layer: 'problem' as const,
};

describe('store isolation', () => {
  it('undoes and redoes each puzzle without changing the other puzzle or its history', () => {
    const a = createPuzzleStore().useStore;
    const b = createPuzzleStore().useStore;
    a.getState().addNumber({ ...number, value: '1' });
    b.getState().addNumber({ ...number, value: '2' });
    const aNumbers = a.getState().puzzle.problem.numbers;
    const bNumbers = b.getState().puzzle.problem.numbers;
    expect(Object.values(aNumbers).map(n => n.value)).toEqual(['1']);
    expect(Object.values(bNumbers).map(n => n.value)).toEqual(['2']);

    a.getState().undo();
    expect(a.getState().puzzle.problem.numbers).toEqual({});
    expect(b.getState().puzzle.problem.numbers).toEqual(bNumbers);
    expect(b.getState().canRedo()).toBe(false);
    a.getState().redo();
    b.getState().undo();
    expect(a.getState().puzzle.problem.numbers).toEqual(aNumbers);
    expect(b.getState().puzzle.problem.numbers).toEqual({});
    b.getState().redo();
    expect(b.getState().puzzle.problem.numbers).toEqual(bNumbers);
  });

  it('does not let one store cancel the other store’s pending autosave', async () => {
    vi.useFakeTimers();
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
    // Exercise real persistence with its supported uncompressed fallback.
    vi.stubGlobal('CompressionStream', undefined);
    try {
      const a = createPuzzleStore();
      const b = createPuzzleStore();
      a.useStore.getState().addNumber({ ...number, value: '1' });
      b.useStore.getState().addNumber({ ...number, value: '2' });
      a.persistenceManager.setAutoSaveDelay(500);
      b.persistenceManager.setAutoSaveDelay(1000);
      for (const store of [a, b]) {
        const { grid, puzzle } = store.useStore.getState();
        store.persistenceManager.autoSave({ version: '1.0.0', grid, puzzle });
      }
      await vi.advanceTimersByTimeAsync(500);
      const first = await a.persistenceManager.loadAutoSave();
      expect(Object.values(first!.puzzle.problem.numbers).map(n => n.value)).toEqual(['1']);
      await vi.advanceTimersByTimeAsync(500);
      const second = await b.persistenceManager.loadAutoSave();
      expect(Object.values(second!.puzzle.problem.numbers).map(n => n.value)).toEqual(['2']);
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it('keeps modal state isolated per modal store', () => {
    const modalA = createModalStore();
    const modalB = createModalStore();
    modalA.getState().showAlert({ title: 'Alert', message: 'Store A only', variant: 'info' });
    expect(modalA.getState().alertModal.isOpen).toBe(true);
    expect(modalB.getState().alertModal.isOpen).toBe(false);
  });
});
