import { describe, expect, it } from 'vitest';
import { createPuzzleStore } from '../store/puzzleStore';

const surface = { layer: 'problem' as const, color: '#ff0000' };

describe('history through the puzzle store', () => {
  it('restores a cleared answer layer as one edit without changing the problem or earlier history', () => {
    const { useStore } = createPuzzleStore();
    const s = useStore.getState();
    s.addSurface({ ...surface, cellId: 'cell-0-0' });
    s.addSurface({ ...surface, layer: 'answer', cellId: 'cell-0-1' });
    const last = s.addSurface({ ...surface, layer: 'answer', cellId: 'cell-1-0' });
    const problem = useStore.getState().puzzle.problem;
    const answer = useStore.getState().puzzle.answer;
    s.clearLayer('answer');
    expect(useStore.getState().puzzle.answer.surfaces).toEqual({});
    s.undo();
    expect(useStore.getState().puzzle.answer).toEqual(answer);
    s.redo();
    expect(useStore.getState().puzzle.answer.surfaces).toEqual({});
    s.undo();
    s.undo();
    expect(useStore.getState().puzzle.answer.surfaces[last]).toBeUndefined();
    expect(Object.keys(useStore.getState().puzzle.answer.surfaces)).toHaveLength(1);
    expect(useStore.getState().puzzle.problem).toEqual(problem);
  });

  it('keeps a following edit outside the preceding gesture group', () => {
    const { useStore } = createPuzzleStore();
    const s = useStore.getState();
    s.startHistoryGroup();
    const first = s.addSurface({ ...surface, cellId: 'cell-0-0' });
    const second = s.addSurface({ ...surface, cellId: 'cell-0-1' });
    s.endHistoryGroup();
    s.addSurface({ ...surface, cellId: 'cell-1-0' });

    s.undo();
    expect(Object.keys(useStore.getState().puzzle.problem.surfaces).sort()).toEqual([first, second].sort());
    s.undo();
    expect(useStore.getState().puzzle.problem.surfaces).toEqual({});
    expect(s.canUndo()).toBe(false);
    s.redo();
    expect(Object.keys(useStore.getState().puzzle.problem.surfaces).sort()).toEqual([first, second].sort());
  });

  it('drops the oldest undo entries while keeping the latest edits undoable', () => {
    const { useStore, historyManager } = createPuzzleStore();
    historyManager.setMaxSize(2);
    const s = useStore.getState();
    const oldest = s.addSurface({ ...surface, cellId: 'cell-0-0' });
    s.addSurface({ ...surface, cellId: 'cell-0-1' });
    s.addSurface({ ...surface, cellId: 'cell-0-2' });

    s.undo();
    s.undo();
    expect(Object.keys(useStore.getState().puzzle.problem.surfaces)).toEqual([oldest]);
    expect(s.canUndo()).toBe(false);
    s.redo();
    s.redo();
    expect(Object.keys(useStore.getState().puzzle.problem.surfaces)).toHaveLength(3);
  });

  it('notifies public history subscribers and stops after unsubscribe', () => {
    const { useStore, historyManager } = createPuzzleStore();
    const entryCounts: number[] = [];
    const unsubscribe = historyManager.subscribe(state => entryCounts.push(state.entries.length));
    useStore.getState().addSurface({ ...surface, cellId: 'cell-0-0' });
    expect(entryCounts).toEqual([1]);
    unsubscribe();
    useStore.getState().addSurface({ ...surface, cellId: 'cell-0-1' });
    expect(entryCounts).toEqual([1]);
  });
});
