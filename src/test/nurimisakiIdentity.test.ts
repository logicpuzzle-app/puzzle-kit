import { expect, it } from 'vitest';
import fixture from '../../e2e/fixtures/nurimisaki-opaque-board.json';
import { createPuzzleStore } from '../store/puzzleStore';
import { runDataDrivenValidation } from '../constraints/validators';
import { constraintCatalog } from '../constraints/ConstraintCatalog';
import { deserializeTopology } from '../utils/serialization';
import type { GridConfig, PuzzleState } from '../types';
const schema = constraintCatalog.getSchema('nurimisaki')!;
const load = () => {
  const store = createPuzzleStore().useStore;
  expect(store.getState().importPuzzle(JSON.stringify(fixture))).toBe(true);
  return store;
};
const validate = (puzzle: PuzzleState, grid = fixture.grid as GridConfig, topology = deserializeTopology(structuredClone(fixture.topologySettings.topology))) =>
  runDataDrivenValidation(puzzle, grid, schema, {}, topology);

it('keeps a valid opaque-ID solution correct, rejects a changed clue, and preserves references through undo and native reload', () => {
  const store = load();
  const reordered = structuredClone(fixture);
  for (const [, cell] of reordered.topologySettings.topology.cells) {
    const c = cell as { boundaryEdges: string[]; boundaryVertices: string[] };
    c.boundaryEdges.reverse();
    c.boundaryVertices.push(c.boundaryVertices.shift()!);
  }
  expect(store.getState().importPuzzle(JSON.stringify(reordered))).toBe(true);
  expect(store.getState().checkAnswer()).toMatchObject({ complete: true, errors: [] });
  const before = store.getState();
  const clue = Object.values(before.puzzle.problem.numbers).find(n => n.cellId === 'A')!;
  store.getState().addNumber({ ...clue, value: '99' });
  expect(store.getState().checkAnswer()).toMatchObject({ complete: false, undecided: false,
    errors: [expect.objectContaining({ failcode: 'nmSumViewNe', elements: expect.arrayContaining(['A', 'a', 'cell-99-99']) })] });
  store.getState().undo(); expect(store.getState().checkAnswer()!.complete).toBe(true);
  store.getState().redo(); expect(store.getState().checkAnswer()!.complete).toBe(false);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  expect(store.getState().checkAnswer()!.errors[0].failcode).toBe('nmSumViewNe');
  expect(store.getState().topology!.cells).toEqual(before.topology!.cells);
});

it('checks shading, both 2x2 rules, connectivity and promontories using the same resolved cells', () => {
  const s = load().getState(), initial = s.puzzle;
  const at = (row: number, col: number) => [...s.topology!.cells.values()].find(c => c.index?.[0] === row && c.index?.[1] === col)!.id;
  const checks = [
    { rows: ['...', '...', '...'], failure: ['brNoShade', 'cu2x2'] },
    { rows: ['...', '###', '...'], failure: ['cuDivide'] },
    { rows: ['##.', '##.', '...'], failure: ['cs2x2', 'circleNotPromontory'] },
  ];
  for (const { rows, failure } of checks) {
    const puzzle = structuredClone(initial); puzzle.answer.surfaces = {};
    rows.forEach((row, r) => [...row].forEach((mark, c) => {
      if (mark === '#') { const id = at(r, c); puzzle.answer.surfaces[id] = { id, cellId: id, layer: 'answer', color: '#000000' }; }
    }));
    const result = validate(puzzle);
    expect(result.complete).toBe(false);
    expect(result.errors.map(e => e.failcode)).toEqual(expect.arrayContaining(failure));
    for (const error of result.errors) for (const id of error.elements ?? []) expect(s.topology!.cells.has(id)).toBe(true);
  }
  const missingClue = structuredClone(initial);
  const id = Object.values(missingClue.problem.numbers).find(n => n.cellId === 'A')!.id;
  delete missingClue.problem.numbers[id];
  expect(validate(missingClue).errors).toContainEqual(expect.objectContaining({ failcode: 'nonCirclePromontory', elements: ['A'] }));
  const dot = structuredClone(initial);
  for (const surface of Object.values(dot.answer.surfaces)) surface.displayMode = 'dot';
  expect(validate(dot).errors).toContainEqual(expect.objectContaining({ failcode: 'brNoShade' }));
});

it('reports unavailable for unresolved references, ambiguous or missing metadata, and non-lattice boards instead of accepting or blaming a clue', () => {
  const store = load();
  for (const mode of ['missing-clue', 'missing-shade', 'duplicate-index', 'missing-index', 'wrong-grid', 'broken-adjacency', 'missing-topology']) {
    const puzzle = structuredClone(store.getState().puzzle), topology = deserializeTopology(structuredClone(fixture.topologySettings.topology));
    const grid = { ...store.getState().grid };
    if (mode === 'missing-clue') Object.values(puzzle.problem.numbers)[0].cellId = 'missing-cell';
    if (mode === 'missing-shade') Object.values(puzzle.answer.surfaces)[0].cellId = 'missing-cell';
    if (mode === 'duplicate-index') topology.cells.get('a')!.index = topology.cells.get('A')!.index;
    if (mode === 'missing-index') delete topology.cells.get('A')!.index;
    if (mode === 'wrong-grid') grid.gridType = 'hex';
    if (mode === 'broken-adjacency') topology.cells.get('A')!.adjacentCells = [];
    const result = runDataDrivenValidation(puzzle, grid, schema, {}, mode === 'missing-topology' ? null : topology, 'topology');
    expect(result, mode).toMatchObject({ complete: false, undecided: true });
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.every(e => e.failcode === 'unavailable' && e.messageKey === 'validation.unavailable'), mode).toBe(true);
  }
});

it('keeps view directions stable across deformation, margin insertion and an excluded shaded cell', () => {
  const store = load();
  store.getState().setTopologyPreset('wave'); store.getState().applyTopologyPreset();
  store.getState().setGrid({ marginTop: 1, marginLeft: 1 });
  expect(store.getState().checkAnswer()).toMatchObject({ complete: true, errors: [] });
  const clue = Object.values(store.getState().puzzle.problem.numbers).find(n => n.cellId === 'A')!;
  expect(store.getState().topology!.cells.get(clue.cellId)!.index).toEqual([1, 1]);
  store.getState().setGrid({ voidCells: ['corner|south'] });
  expect(store.getState().checkAnswer()).toMatchObject({ complete: true, errors: [] });
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  expect(store.getState().checkAnswer()!.complete).toBe(true);
  store.getState().setTopologyPreset('square'); store.getState().applyTopologyPreset();
  expect(store.getState().checkAnswer()!.complete).toBe(true);
});

it('resolves Grid-mode clues in their explicit compatibility scope even when a margin topology is retained', () => {
  const store = createPuzzleStore().useStore;
  store.getState().newPuzzle({ rows: 3, cols: 3, gridType: 'square' });
  store.getState().setGrid({ marginTop: 1, marginLeft: 1 });
  store.getState().setUseTopology(false); store.getState().setCurrentSchemaId('nurimisaki');
  for (const cellId of ['cell-0-0', 'cell-2-0']) store.getState().addNumber({ cellId, value: '3', color: '#000000', layer: 'problem', size: 'medium', position: 'center' });
  for (const cellId of ['cell-1-0', 'cell-1-1']) store.getState().addSurface({ cellId, color: '#000000', layer: 'answer' });
  expect([...store.getState().topology!.cells.values()].filter(c => c.outboard)).toHaveLength(7);
  expect(store.getState().checkAnswer()).toMatchObject({ complete: true, errors: [] });
  const current = store.getState();
  expect(runDataDrivenValidation(current.puzzle, current.grid, schema).complete).toBe(true);
  const bad = structuredClone(current.puzzle);
  Object.values(bad.problem.numbers)[0].cellId = 'unknown';
  expect(runDataDrivenValidation(bad, current.grid, schema)).toMatchObject({ complete: false, undecided: true });
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  expect(store.getState().checkAnswer()!.complete).toBe(true);
});

it('retains the legacy shared shading checker for custom checklists without a Nurimisaki override', () => {
  const store = createPuzzleStore().useStore;
  store.getState().newPuzzle({ rows: 2, cols: 2, gridType: 'square' });
  store.getState().addSurface({ cellId: 'cell-0-0', color: '#000000', layer: 'answer' });
  const s = store.getState();
  const onlyShade = { ...schema, pid: '__custom__', validation: [{ ...schema.validation[0],
    pzpr: { pid: '__custom__', checklist: ['checkShadeCellExist'], failcodes: ['brNoShade'] } }] };
  expect(onlyShade.validation).toHaveLength(1);
  expect(runDataDrivenValidation(s.puzzle, s.grid, onlyShade).complete).toBe(true);
  const result = runDataDrivenValidation(s.puzzle, { ...s.grid, voidCells: ['cell-0-0'] }, onlyShade);
  expect(result.complete).toBe(false);
  expect(result.errors[0].failcode).toBe('brNoShade');
});
