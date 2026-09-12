import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { createPuzzleStore } from '../store/puzzleStore';
import { PuzzleStoreProvider } from '../store/puzzleStoreContext';
import { NumberInputPanel } from '../components/panels/properties/NumberInputPanel';
import type { NumberElement } from '../types';
import '../i18n';

afterEach(cleanup);

function setup(position: 'center' | 'corner' | 'side' = 'center', mode: 'normal' | 'directional' | 'paint' = 'normal') {
  const store = createPuzzleStore().useStore;
  store.getState().newPuzzle({ rows: 9, cols: 9 });
  store.getState().setActiveLayer('problem');
  store.getState().setTool(mode === 'directional' ? 'number-directional' : 'number-normal', 'number');
  store.getState().setNumberSelection({ row: 1, col: 1 });
  store.setState({ currentSchemaId: mode === 'directional' ? 'yajilin' : mode === 'paint' ? 'paint' : null,
    showConstraintLayer: mode !== 'normal', currentInputMode: mode === 'directional' ? 'direc' : 'number' });
  store.getState().setToolSettings({ numberPosition: position, cornerIndex: 1, sideIndex: 2,
    numberInputMode: 'number', color: '#ff0000', numberSize: 'large' });
  const original: Omit<NumberElement, 'id'> = { cellId: 'cell-1-1', value: mode === 'directional' ? '5' : '15',
    size: 'small', color: '#123456', layer: 'problem', position, cornerIndex: 1, sideIndex: 2, objectKey: 'keep',
    ...(mode === 'directional' ? { direction: 4 as const, angle: 37 } : {}) };
  const id = store.getState().addNumber(original);
  store.getState().addNumber({ ...original, position: 'corner', cornerIndex: 3, value: '9', objectKey: 'other' });
  store.getState().historyManager.clear();
  const view = render(<PuzzleStoreProvider store={store}><NumberInputPanel /></PuzzleStoreProvider>);
  return { store, id, view, before: store.getState().puzzle.problem.numbers };
}

describe('number pad history', () => {
  it.each(['center', 'corner', 'side'] as const)('updates a %s entry in one undo without changing other entries or metadata', position => {
    const { store, id, view, before } = setup(position);
    fireEvent.click(view.getByRole('button', { name: '6', exact: true }));
    const after = store.getState().puzzle.problem.numbers;
    expect(after).toEqual({ ...before, [id]: { ...before[id], value: '6' } });
    act(() => { store.getState().setActiveLayer('answer'); store.getState().undo(); });
    expect(store.getState().puzzle.problem.numbers).toEqual(before);
    expect(store.getState().canUndo()).toBe(false);
    act(() => store.getState().redo());
    expect(store.getState().puzzle.problem.numbers).toEqual(after);
  });

  it('keeps a directional clue ID, angle, color and metadata, including after JSON import', () => {
    const { store, id, view, before } = setup('center', 'directional');
    fireEvent.click(view.getByRole('button', { name: '6', exact: true }));
    const after = store.getState().puzzle.problem.numbers;
    expect(after).toEqual({ ...before, [id]: { ...before[id], value: '6' } });
    act(() => store.getState().undo());
    expect(store.getState().puzzle.problem.numbers).toEqual(before);
    expect(store.getState().canUndo()).toBe(false);
    act(() => store.getState().redo());
    act(() => { expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true); });
    expect(store.getState().puzzle.problem.numbers[id]).toEqual(after[id]);
    act(() => store.getState().setNumberSelection({ row: 1, col: 1 }));
    fireEvent.click(view.getByRole('button', { name: '7', exact: true }));
    expect(store.getState().puzzle.problem.numbers[id].value).toBe('7');
    act(() => store.getState().undo());
    expect(store.getState().puzzle.problem.numbers[id]).toEqual(after[id]);
  });

  it('does not add history for the same directional digit or discard an existing redo', () => {
    const { store, view, before } = setup('center', 'directional');
    fireEvent.click(view.getByRole('button', { name: '5', exact: true }));
    expect(store.getState().puzzle.problem.numbers).toBe(before);
    expect(store.getState().canUndo()).toBe(false);
    fireEvent.click(view.getByRole('button', { name: '6', exact: true }));
    act(() => store.getState().undo());
    fireEvent.click(view.getByRole('button', { name: '5', exact: true }));
    expect(store.getState().canRedo()).toBe(true);
  });

  it('undoes backspace and clear individually while keeping the original ID', () => {
    const { store, id, view, before } = setup();
    fireEvent.click(view.getByTitle('Backspace'));
    expect(store.getState().puzzle.problem.numbers[id].value).toBe('1');
    act(() => store.getState().undo());
    expect(store.getState().puzzle.problem.numbers).toEqual(before);
    expect(store.getState().canUndo()).toBe(false);
    act(() => store.getState().redo());
    fireEvent.click(view.getByTitle('Clear'));
    expect(store.getState().puzzle.problem.numbers[id]).toBeUndefined();
    act(() => store.getState().undo());
    expect(store.getState().puzzle.problem.numbers[id].value).toBe('1');
  });

  it('retains Paint brush color/size behavior in the same undo operation', () => {
    const { store, id, view, before } = setup('center', 'paint');
    fireEvent.click(view.getByRole('button', { name: '6', exact: true }));
    expect(store.getState().puzzle.problem.numbers[id]).toEqual({ ...before[id], value: '6', color: '#ff0000', size: 'large' });
    act(() => store.getState().undo());
    expect(store.getState().puzzle.problem.numbers).toEqual(before);
    expect(store.getState().canUndo()).toBe(false);
    act(() => store.getState().redo());
    expect(store.getState().puzzle.problem.numbers[id]).toMatchObject({ value: '6', color: '#ff0000', size: 'large' });
  });

  it('does not close a surrounding history group', () => {
    const { store, view, before } = setup();
    act(() => store.getState().startHistoryGroup('Outer edit'));
    fireEvent.click(view.getByRole('button', { name: '6', exact: true }));
    fireEvent.click(view.getByRole('button', { name: '7', exact: true }));
    expect(store.getState().historyManager.isInGroup()).toBe(true);
    act(() => { store.getState().endHistoryGroup(); store.getState().undo(); });
    expect(store.getState().puzzle.problem.numbers).toEqual(before);
    expect(store.getState().canUndo()).toBe(false);
  });

  it.each(['answer', 'grid', 'constraint', 'player-problem'] as const)('protects the problem entry from %s updates', layer => {
    const { store, id, before } = setup();
    act(() => {
      if (layer === 'player-problem') store.setState({ isPlayerMode: true, activeLayer: 'problem' });
      else store.getState().setActiveLayer(layer);
      store.getState().updateNumber(id, '7');
    });
    expect(store.getState().puzzle.problem.numbers).toBe(before);
    expect(store.getState().canUndo()).toBe(false);
  });
});
