import { describe, it, expect } from 'vitest';
import { createPuzzleStore } from '../store/puzzleStore';
import { createModalStore } from '../store/modalStore';

describe('store isolation', () => {
  it('keeps history and state isolated per puzzle store', () => {
    const storeA = createPuzzleStore();
    const storeB = createPuzzleStore();

    storeA.useStore.getState().addNumber({
      cellId: 'cell-0-0',
      value: '1',
      size: 'medium',
      position: 'center',
      color: '#000000',
      layer: 'problem',
    });

    const historyA = storeA.useStore.getState().historyManager.getState().entries.length;
    const historyB = storeB.useStore.getState().historyManager.getState().entries.length;

    expect(historyA).toBe(1);
    expect(historyB).toBe(0);

    const numbersA = Object.keys(storeA.useStore.getState().puzzle.problem.numbers);
    const numbersB = Object.keys(storeB.useStore.getState().puzzle.problem.numbers);
    expect(numbersA).toHaveLength(1);
    expect(numbersB).toHaveLength(0);
  });

  it('creates distinct manager instances per puzzle store', () => {
    const storeA = createPuzzleStore();
    const storeB = createPuzzleStore();

    expect(storeA.historyManager).not.toBe(storeB.historyManager);
    expect(storeA.persistenceManager).not.toBe(storeB.persistenceManager);
    expect(storeA.actionExecutor).not.toBe(storeB.actionExecutor);

    expect(storeA.useStore.getState().historyManager).toBe(storeA.historyManager);
    expect(storeA.useStore.getState().persistenceManager).toBe(storeA.persistenceManager);
    expect(storeA.useStore.getState().actionExecutor).toBe(storeA.actionExecutor);
  });

  it('keeps modal state isolated per modal store', () => {
    const modalA = createModalStore();
    const modalB = createModalStore();

    modalA.getState().showAlert({
      title: 'Alert',
      message: 'Store A only',
      variant: 'info',
    });

    expect(modalA.getState().alertModal.isOpen).toBe(true);
    expect(modalB.getState().alertModal.isOpen).toBe(false);
  });
});
