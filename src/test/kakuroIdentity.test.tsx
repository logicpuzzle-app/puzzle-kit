import { afterEach, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import fixture from '../../e2e/fixtures/kakuro-opaque-board.json';
import { createPuzzleStore } from '../store/puzzleStore';
import { PuzzleStoreProvider } from '../store/puzzleStoreContext';
import { KakuroCluePanel } from '../components/panels/properties/KakuroCluePanel';
import { KakuroClueLayer } from '../components/canvas/KakuroClueLayer';
import { runDataDrivenValidation } from '../constraints/validators';
import { constraintCatalog } from '../constraints/ConstraintCatalog';
import '../i18n';

afterEach(cleanup);
function load() {
  const store = createPuzzleStore().useStore;
  expect(store.getState().importPuzzle(JSON.stringify(fixture))).toBe(true);
  return store;
}

it('edits the selected opaque cell and draws independent clues using logical corners, with undo and native reload', () => {
  const store = load();
  store.getState().setActiveLayer('problem');
  store.getState().setNumberSelection({ cellId: 'a' });
  const view = render(<PuzzleStoreProvider store={store}><KakuroCluePanel /><svg><KakuroClueLayer /></svg></PuzzleStoreProvider>);
  const input = view.getByRole('spinbutton', { name: 'Down sum (lower left)' });
  expect(input).toHaveValue(4);
  fireEvent.change(input, { target: { value: '5' } });
  fireEvent.click(view.getByRole('button', { name: 'Apply clue' }));
  const label = view.container.querySelector('[data-kakuro-cell="a"] [data-clue-direction="vertical"]')!;
  expect(label.textContent).toBe('5');
  expect(Number(label.getAttribute('x'))).toBeCloseTo(60 + 40 / 3);
  expect(Number(label.getAttribute('y'))).toBeCloseTo(20 + 80 / 3);
  expect(store.getState().checkAnswer()!.errors).toContainEqual(expect.objectContaining({ failcode: 'nmSumRowNe', elements: ['opaque/β', ' 空白 '] }));
  act(() => store.getState().undo());
  expect(store.getState().checkAnswer()).toMatchObject({ complete: true, errors: [] });
  act(() => store.getState().redo());
  const changed = store.getState().puzzle;
  act(() => { expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true); });
  expect(store.getState().puzzle).toEqual(changed);
  expect(store.getState().checkAnswer()!.complete).toBe(false);
});

it('keeps clues on surviving cells through margins and deformation, removes deleted references and restores them with undo', () => {
  const store = load();
  const original = store.getState().puzzle.problem.clueCells;
  const topology = store.getState().topology;
  store.getState().setBoardRotation(90);
  expect(store.getState().topology).toBe(topology);
  store.getState().setGrid({ marginTop: 1, marginLeft: 1 });
  store.getState().setTopologyPreset('wave'); store.getState().applyTopologyPreset();
  expect(store.getState().puzzle.problem.clueCells).toEqual(original);
  expect(store.getState().checkAnswer()).toMatchObject({ complete: true, errors: [] });
  // A hole terminates a run: the 2 beyond it must not pick up the left-hand 3.
  store.getState().toggleCellDisabled('opaque/β');
  expect(store.getState().checkAnswer()!.complete).toBe(true);
  store.getState().toggleCellDisabled('opaque/β');
  store.getState().toggleCellDisabled('a');
  expect(store.getState().puzzle.problem.clueCells).toEqual(original);
  expect(store.getState().checkAnswer()!.complete).toBe(true);
  store.getState().toggleCellDisabled('a');
  store.getState().setTopologyPreset('square'); store.getState().applyTopologyPreset();
  store.getState().setGrid({ cols: 2, marginRight: 0 });
  expect(Object.values(store.getState().puzzle.problem.clueCells!).some(c => c.cellId === 'cell-99-99')).toBe(false);
  store.getState().undo();
  expect(store.getState().puzzle.problem.clueCells).toEqual(original);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  expect(store.getState().grid.boardRotation).toBe(90);
  expect(store.getState().checkAnswer()!.complete).toBe(true);
});

it('does not confirm an answer when clue or digit references are missing or ambiguous', () => {
  const store = load(), s = store.getState();
  const schema = constraintCatalog.getSchema('kakuro')!;
  for (const kind of ['missing-clue', 'missing-digit', 'duplicate-clue', 'duplicate-digit', 'missing-topology']) {
    const puzzle = structuredClone(s.puzzle);
    const clue = Object.values(puzzle.problem.clueCells!)[0];
    const digit = Object.values(puzzle.answer.numbers)[0];
    if (kind === 'missing-clue') clue.cellId = 'cell-0-0';
    if (kind === 'missing-digit') digit.cellId = 'cell-1-1';
    if (kind === 'duplicate-clue') puzzle.problem.clueCells!.another = { ...clue, id: 'another', vertical: 45 };
    if (kind === 'duplicate-digit') puzzle.answer.numbers.another = { ...digit, id: 'another', value: '9' };
    const result = runDataDrivenValidation(puzzle, s.grid, schema, {}, kind === 'missing-topology' ? null : s.topology, 'topology');
    expect(result, kind).toMatchObject({ complete: false, undecided: true });
    expect(result.errors.every(e => e.failcode === 'unavailable'), kind).toBe(true);
  }
});

it('allocates a clue without overwriting an imported record and rejects absent, disabled or outboard targets', () => {
  const store = load();
  store.getState().setActiveLayer('problem');
  const imported = JSON.parse(store.getState().exportPuzzle());
  const old = imported.state.problem.clueCells['cell-0-0'];
  delete imported.state.problem.clueCells['cell-0-0'];
  imported.state.problem.clueCells['kakuro-opaque/β'] = { ...old, id: 'kakuro-opaque/β' };
  expect(store.getState().importPuzzle(JSON.stringify(imported))).toBe(true);
  store.getState().setKakuroClue('opaque/β', { horizontal: 12, vertical: 34 });
  expect(store.getState().puzzle.problem.clueCells!['kakuro-opaque/β']).toEqual({ ...old, id: 'kakuro-opaque/β' });
  expect(Object.values(store.getState().puzzle.problem.clueCells!).find(c => c.cellId === 'opaque/β')).toMatchObject({ horizontal: 12, vertical: 34 });
  store.getState().setGrid({ marginTop: 1 });
  const outboard = [...store.getState().topology!.cells.values()].find(c => c.outboard)!.id;
  store.getState().toggleCellDisabled('a');
  const before = store.getState().puzzle;
  for (const id of ['cell-0-0', outboard, 'a']) store.getState().setKakuroClue(id, { horizontal: 1, vertical: 2 });
  expect(store.getState().puzzle).toBe(before);
});

it('uses Grid compatibility references explicitly with margins even when a different topology is retained', () => {
  const store = load();
  store.getState().setGrid({ marginTop: 1, marginLeft: 1 });
  expect(store.getState().setUseTopology(false)).not.toBe(false);
  expect(store.getState().checkAnswer()).toMatchObject({ complete: true, errors: [] });
  store.getState().setActiveLayer('problem');
  store.getState().setKakuroClue('cell-0-1', { horizontal: null, vertical: 5 });
  expect(store.getState().checkAnswer()!.errors).toContainEqual(expect.objectContaining({ failcode: 'nmSumRowNe' }));
  store.getState().undo();
  expect(store.getState().checkAnswer()!.complete).toBe(true);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  expect(store.getState().checkAnswer()!.complete).toBe(true);
});
