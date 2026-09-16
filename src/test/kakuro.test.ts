import { expect, it } from 'vitest';
import { createPuzzleStore } from '../store/puzzleStore';
import { constraintCatalog } from '../constraints/ConstraintCatalog';
import { runDataDrivenValidation } from '../constraints/validators';

function setup() {
  const store = createPuzzleStore().useStore;
  store.getState().newPuzzle({ rows: 3, cols: 3, gridType: 'square' });
  store.getState().setActiveLayer('problem');
  return store;
}
const number = (cellId: string, value: string, layer: 'problem' | 'answer') =>
  ({ cellId, value, layer, position: 'center' as const, size: 'large' as const, color: '#000000' });

it('converts a numbered cell to independent clues and restores its digits in one undo', () => {
  const store = setup();
  store.getState().addNumber(number('cell-1-1', '8', 'problem'));
  store.getState().addNumber(number('cell-1-1', '2', 'answer'));
  const before = store.getState().puzzle;
  store.getState().setKakuroClue('cell-1-1', { horizontal: 12, vertical: 34 });
  const split = store.getState().puzzle;
  expect(Object.values(split.problem.clueCells!)).toMatchObject([{ horizontal: 12, vertical: 34 }]);
  expect(Object.values(split.problem.numbers)).toHaveLength(0);
  expect(Object.values(split.answer.numbers)).toHaveLength(0);
  store.getState().undo(); expect(store.getState().puzzle).toEqual(before);
  store.getState().redo(); expect(store.getState().puzzle).toEqual(split);
  store.getState().setKakuroClue('cell-1-1', { horizontal: null, vertical: 34 });
  store.getState().setKakuroClue('cell-1-1', null);
  store.getState().undo();
  expect(Object.values(store.getState().puzzle.problem.clueCells!)).toMatchObject([{ horizontal: null, vertical: 34 }]);
  const saved = JSON.parse(store.getState().exportPuzzle());
  saved.state.problem.clueCells.invalid = null;
  expect(store.getState().importPuzzle(JSON.stringify(saved))).toBe(true);
  expect(Object.values(store.getState().puzzle.problem.clueCells!)).toMatchObject([{ horizontal: null, vertical: 34 }]);
});

it('checks a real Kakuro diagram through its registered schema, including blank and zero hints', () => {
  const store = setup();
  const clue = (cellId: string, horizontal: number | null, vertical: number | null) =>
    store.getState().setKakuroClue(cellId, { horizontal, vertical });
  // 2x2 answer diagram: 1 2 / 3 4. Top sums 4,6 and left sums 3,7.
  clue('cell-0-0', null, null); clue('cell-0-1', null, 4); clue('cell-0-2', 0, 6);
  clue('cell-1-0', 3, null); clue('cell-2-0', 7, 0);
  const ids = ['cell-1-1', 'cell-1-2', 'cell-2-1', 'cell-2-2'].map((id, i) =>
    store.getState().addNumber(number(id, String(i + 1), 'answer')));
  const validate = () => {
    const s = store.getState();
    return runDataDrivenValidation(s.puzzle, s.grid, constraintCatalog.getSchema('kakuro')!, {}, s.topology);
  };
  expect(validate()).toMatchObject({ complete: true, errors: [] });
  clue('cell-1-0', 0, null);
  clue('cell-0-1', null, null);
  expect(validate()).toMatchObject({ complete: true, errors: [] });
  clue('cell-1-0', 3, null);
  clue('cell-0-1', null, 5);
  expect(validate().errors).toEqual(expect.arrayContaining([expect.objectContaining({ failcode: 'nmSumRowNe' })]));
  clue('cell-0-1', null, 4);
  store.getState().setActiveLayer('answer');
  store.getState().updateNumber(ids[1], '1');
  expect(validate().errors).toEqual(expect.arrayContaining([expect.objectContaining({ failcode: 'nmDupRow' })]));
  store.getState().updateNumber(ids[1], '2');
  store.getState().removeNumber(ids[3]);
  expect(validate()).toMatchObject({ complete: false });
  store.getState().addNumber(number('cell-2-2', '0', 'answer'));
  expect(validate().complete).toBe(false);
});
