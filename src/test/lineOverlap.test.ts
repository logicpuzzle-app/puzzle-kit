import { describe, expect, it } from 'vitest';
import { createPuzzleStore } from '../store/puzzleStore';
import type { LineElement } from '../types';

const line = (from: string, to: string, extra: Partial<LineElement> = {}) => ({ from, to, lineTarget: 'cell' as const, color: '#000000', style: 'solid' as const, thickness: 'normal' as const, layer: 'problem' as const, ...extra });
function setup() {
  const store = createPuzzleStore().useStore;
  store.getState().newPuzzle({ rows: 6, cols: 6, gridType: 'square' });store.getState().setActiveLayer('problem');
  return store;
}
describe('overlapping snapped segments', () => {
  it.each([false, true])('merges long/short overlap regardless of insertion order (%s)', reverse => {
    const s = setup();const long = line('cell-1-1','cell-1-3'), short = line('cell-1-1','cell-1-2', { edgeId: 'edge-22' });
    s.getState().addLine(reverse ? short : long);s.getState().addLine(reverse ? long : short);
    const lines = Object.values(s.getState().puzzle.problem.lines);
    expect(lines).toHaveLength(1);expect(lines[0]).toMatchObject({ from: long.from, to: long.to });
  });
  it('merges half/full overlap without changing topology IDs for a contained addition', () => {
    const s = setup();const full = s.getState().addLine(line('cell-1-1','cell-1-2', { edgeId: 'edge-22' }));
    s.getState().addLine(line('cell-1-1','edge-22'));
    expect(Object.keys(s.getState().puzzle.problem.lines)).toEqual([full]);
  });
  it('unions partial overlaps and atomically undoes/redoes the replacement', () => {
    const s = setup();s.getState().addLine(line('cell-1-1','cell-1-3'));
    const before = s.getState().puzzle.problem.lines;
    s.getState().addLine(line('cell-1-4','cell-1-2'));
    const after = s.getState().puzzle.problem.lines;
    expect(Object.values(after)).toHaveLength(1);expect(Object.values(after)[0]).toMatchObject({ from: 'cell-1-1', to: 'cell-1-4' });
    s.getState().undo();expect(s.getState().puzzle.problem.lines).toEqual(before);
    s.getState().redo();expect(s.getState().puzzle.problem.lines).toEqual(after);
  });
  it.each([
    line('cell-1-3','cell-1-4'), line('cell-0-2','cell-2-2'),
    line('cell-1-1','cell-1-2', { color: '#ff0000' }),
    line('cell-1-1','cell-1-2', { thickness: 'thick' }),
    line('cell-1-1','cell-1-2', { directed: 'endpoint' }),
    line('cell-1-1','cell-1-2', { isFree: true, fromX: 0, fromY: 0, toX: 10, toY: 0 }),
  ])('preserves non-overlapping or semantically distinct line %j', next => {
    const s = setup();s.getState().addLine(line('cell-1-1','cell-1-3'));s.getState().addLine(next);
    expect(Object.values(s.getState().puzzle.problem.lines)).toHaveLength(2);
  });
  it('does not consume line-group members', () => {
    const s = setup();const id=s.getState().addLine(line('cell-1-1','cell-1-3'));
    s.setState(state => ({ puzzle: { ...state.puzzle, problem: { ...state.puzzle.problem, lineGroups: { g: { id:'g', lineIds:[id], groupType:'arrow', layer:'problem' } } } } }));
    s.getState().addLine(line('cell-1-1','cell-1-2'));
    expect(Object.keys(s.getState().puzzle.problem.lines)).toHaveLength(2);
  });
});
