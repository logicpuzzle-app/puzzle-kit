import { describe, expect, it } from 'vitest';
import { createPuzzleStore } from '../store/puzzleStore';
import type { DataLayerType } from '../types';

function setup(layer: DataLayerType = 'problem') {
  const { useStore } = createPuzzleStore();
  useStore.setState({ activeLayer: layer });
  return useStore;
}

const clue = { cellId: 'cell-0-0', cell: 0, direction: 2 as const, value: 5, color: '#123456', layer: 'problem' as const, angle: 30, objectKey: 'clue' };

describe('directional number history', () => {
  it.each(['problem', 'answer'] as const)('undoes and redoes insertion and deletion in %s even after switching layers', layer => {
    const store = setup(layer);
    const id = store.getState().addDirectionalClue({ ...clue, layer });
    const inserted = store.getState().puzzle[layer].numbers;
    expect(inserted[id]).toMatchObject({ value: '5', direction: 2, angle: 30, objectKey: 'clue' });
    expect(store.getState().canUndo()).toBe(true);
    store.setState({ activeLayer: layer === 'problem' ? 'answer' : 'problem' });
    store.getState().undo();
    expect(store.getState().puzzle[layer].numbers).toEqual({});
    store.getState().redo();
    expect(store.getState().puzzle[layer].numbers).toEqual(inserted);
    store.setState({ activeLayer: layer });
    store.getState().removeDirectionalClue(id);
    expect(store.getState().puzzle[layer].numbers).toEqual({});
    store.getState().undo();
    expect(store.getState().puzzle[layer].numbers).toEqual(inserted);
    store.getState().redo();
    expect(store.getState().puzzle[layer].numbers).toEqual({});
  });

  it('restores the complete previous clue in one undo when its value, angle and color change', () => {
    const store = setup();
    store.getState().addDirectionalClue(clue);
    const before = store.getState().puzzle.problem.numbers;
    store.getState().addDirectionalClue({ ...clue, value: 0, char: '?', direction: 4, angle: 60, color: '#ff0000' });
    const after = store.getState().puzzle.problem.numbers;
    expect(Object.values(after)).toHaveLength(1);
    expect(Object.values(after)[0]).toMatchObject({ value: '?', direction: 4, angle: 60, color: '#ff0000' });
    store.getState().undo();
    expect(store.getState().puzzle.problem.numbers).toEqual(before);
    store.getState().redo();
    expect(store.getState().puzzle.problem.numbers).toEqual(after);
  });

  it('restores mutually exclusive center numbers in either conversion without changing corner notes', () => {
    const store = setup();
    const normal = { cellId: clue.cellId, value: '8', size: 'large' as const, position: 'center' as const, color: '#000', layer: 'problem' as const };
    store.getState().addNumber(normal);
    store.getState().addNumber({ ...normal, position: 'corner', cornerIndex: 0, value: '2' });
    const before = store.getState().puzzle.problem.numbers;
    store.getState().addDirectionalClue(clue);
    const directional = store.getState().puzzle.problem.numbers;
    expect(Object.values(directional).map(n => n.value).sort()).toEqual(['2', '5']);
    store.getState().undo();
    expect(store.getState().puzzle.problem.numbers).toEqual(before);
    store.getState().redo();
    expect(store.getState().puzzle.problem.numbers).toEqual(directional);
    store.getState().addNumber(normal);
    expect(Object.values(store.getState().puzzle.problem.numbers).map(n => n.value).sort()).toEqual(['2', '8']);
    store.getState().undo();
    expect(store.getState().puzzle.problem.numbers).toEqual(directional);
  });

  it('keeps an outer gesture group intact and discards redo after a new edit', () => {
    const store = setup();
    store.getState().startHistoryGroup();
    store.getState().addDirectionalClue(clue);
    store.getState().addDirectionalClue({ ...clue, cellId: 'cell-0-1', cell: 1 });
    store.getState().endHistoryGroup();
    const before = store.getState().puzzle.problem.numbers;
    store.getState().undo();
    expect(store.getState().puzzle.problem.numbers).toEqual({});
    store.getState().redo();
    expect(store.getState().puzzle.problem.numbers).toEqual(before);
    store.getState().undo();
    store.getState().addDirectionalClue({ ...clue, char: '.' });
    expect(store.getState().canRedo()).toBe(false);
  });

  it('does not mutate protected problem clues or create history for missing deletions', () => {
    const store = setup();
    const id = store.getState().addDirectionalClue(clue);
    const before = store.getState().puzzle;
    store.getState().historyManager.clear();
    store.setState({ isPlayerMode: true });
    expect(store.getState().addDirectionalClue(clue)).toBe('');
    store.getState().removeDirectionalClue(id);
    store.getState().removeDirectionalClue('missing');
    expect(store.getState().puzzle).toEqual(before);
    expect(store.getState().canUndo()).toBe(false);
  });
});
