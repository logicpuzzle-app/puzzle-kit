import { expect, it } from 'vitest';
import fixture from '../../e2e/fixtures/slitherlink-opaque-board.json';
import type { PuzzleExport } from '../types';
import { createPuzzleStore } from '../store/puzzleStore';
import { constraintCatalog } from '../constraints/ConstraintCatalog';
import { runDataDrivenValidation } from '../constraints/validators';

const schema = constraintCatalog.getSchema('slither')!;
const file = () => structuredClone(fixture) as unknown as PuzzleExport;
function load(valid = false) {
  const input = file();
  if (valid) Object.values(input.state.problem.numbers)[0].value = '2';
  const store = createPuzzleStore().useStore;
  expect(store.getState().importPuzzle(JSON.stringify(input))).toBe(true);
  return store;
}
const line = (from: string, to: string) => ({ from, to, fromType: 'vertex' as const, toType: 'vertex' as const,
  lineTarget: 'edge' as const, layer: 'answer' as const, color: '#000000', thickness: 'normal' as const, style: 'solid' as const });

it('rejects the real zero-clue false positive and preserves corrected opaque references through editing and files', () => {
  const store = load();
  const clue = Object.values(store.getState().puzzle.problem.numbers)[0];
  expect(store.getState().checkAnswer()).toMatchObject({ complete: false, undecided: false,
    errors: [expect.objectContaining({ failcode: 'nmLineNe', elements: [clue.cellId] })] });
  store.getState().setActiveLayer('problem');
  store.getState().updateNumber(clue.id, '2');
  expect(store.getState().checkAnswer()).toMatchObject({ complete: true, errors: [] });
  store.getState().undo(); expect(store.getState().checkAnswer()!.complete).toBe(false);
  store.getState().redo(); expect(store.getState().checkAnswer()!.complete).toBe(true);
  store.getState().setTopologyPreset('wave'); store.getState().applyTopologyPreset();
  const puzzle = structuredClone(store.getState().puzzle);
  const saved = JSON.parse(store.getState().exportPuzzle()) as PuzzleExport;
  for (const [, cell] of saved.topologySettings!.topology!.cells) { cell.index = null; cell.boundaryEdges.reverse(); }
  for (const [, vertex] of saved.topologySettings!.topology!.vertices) vertex.index = null;
  expect(store.getState().importPuzzle(JSON.stringify(saved))).toBe(true);
  expect(store.getState().puzzle).toEqual(puzzle);
  expect(store.getState().checkAnswer()).toMatchObject({ complete: true, errors: [] });
});

it('counts real vertex degrees and disconnected loops, respecting independently enabled checks', () => {
  const store = createPuzzleStore().useStore;
  store.getState().newPuzzle({ rows: 3, cols: 3, gridType: 'square' });
  store.getState().setCurrentSchemaId('slither');
  const graph = store.getState().topology!;
  const center = [...graph.vertices.values()].find(v => v.index?.[0] === 1 && v.index?.[1] === 1)!;
  const spokes = [...graph.edges.values()].filter(e => e.startVertex === center.id || e.endVertex === center.id);
  const overrides = Object.fromEntries(schema.validation.map(r => [r.id, r.id === 'slither.no-branch' || r.id === 'slither.no-cross']));
  for (const edge of spokes.slice(0, 3)) store.getState().addLine({ ...line(edge.startVertex, edge.endVertex), edgeId: edge.id });
  let s = store.getState();
  expect(runDataDrivenValidation(s.puzzle, s.grid, schema, overrides, graph).errors.map(e => e.failcode)).toEqual(['lnBranch']);
  store.getState().addLine({ ...line(spokes[3].startVertex, spokes[3].endVertex), edgeId: spokes[3].id });
  s = store.getState();
  expect(runDataDrivenValidation(s.puzzle, s.grid, schema, overrides, graph).errors.map(e => e.failcode)).toEqual(['lnCross']);
  const puzzle = structuredClone(s.puzzle); puzzle.answer.lines = {};
  for (const cell of [...graph.cells.values()].filter(c => c.index?.[0] === c.index?.[1] && [0, 2].includes(c.index![0]!))) {
    for (const id of cell.boundaryEdges) { const e = graph.edges.get(id)!; puzzle.answer.lines[id] = { id, ...line(e.startVertex, e.endVertex), edgeId: id }; }
  }
  expect(runDataDrivenValidation(puzzle, s.grid, schema, {}, graph).errors.map(e => e.failcode)).toEqual(['lnPlLoop']);
  delete puzzle.answer.lines[Object.keys(puzzle.answer.lines)[0]];
  expect(runDataDrivenValidation(puzzle, s.grid, schema, {}, graph).errors.map(e => e.failcode)).toContain('lnDeadEnd');
  puzzle.answer.lines = {};
  expect(runDataDrivenValidation(puzzle, s.grid, schema, {}, graph).errors.map(e => e.failcode)).toEqual(['brNoLine']);
});

it('never treats missing, contradictory or ambiguous references as a correct answer', () => {
  for (const fault of ['topology', 'clue', 'edge', 'endpoint', 'kind', 'untyped', 'boundary', 'clue-text']) {
    const s = load(true).getState(), puzzle = structuredClone(s.puzzle), graph = structuredClone(s.topology!);
    const clue = Object.values(puzzle.problem.numbers)[0], first = Object.values(puzzle.answer.lines)[0];
    if (fault === 'clue') clue.cellId = 'cell-1-1';
    if (fault === 'clue-text') clue.value = '2garbage';
    if (fault === 'edge') first.edgeId = 'edge-h-0-0';
    if (fault === 'endpoint') first.to = first.from;
    if (fault === 'kind') first.fromType = 'cell';
    if (fault === 'untyped') {
      delete first.lineTarget; delete first.edgeId; delete first.fromType; delete first.toType;
      first.from = 'a|b'; first.to = 'A';
    }
    if (fault === 'boundary') graph.cells.get(clue.cellId)!.boundaryEdges.pop();
    const result = runDataDrivenValidation(puzzle, s.grid, schema, {}, fault === 'topology' ? null : graph, 'topology');
    expect(result, fault).toMatchObject({ complete: false, undecided: true });
    expect(result.errors.some(e => e.failcode === 'unavailable'), fault).toBe(true);
  }
});

it('counts each occupied edge once and excludes explicit decorations and other scoped kinds', () => {
  const s = load(true).getState(), puzzle = structuredClone(s.puzzle);
  const first = Object.values(puzzle.answer.lines)[0];
  puzzle.answer.lines.duplicate = { ...first, id: 'duplicate', from: first.to, to: first.from };
  puzzle.answer.lines.centers = { ...line('a|b', 'A'), id: 'centers', fromType: 'cell', toType: 'cell', lineTarget: 'cell' };
  puzzle.answer.lines.free = { ...first, id: 'free', isFree: true, edgeId: 'unknown' };
  puzzle.answer.lines.arrow = { ...first, id: 'arrow', directed: 'endpoint', edgeId: 'unknown' };
  puzzle.problem.lines.problem = { ...first, id: 'problem', layer: 'problem', edgeId: 'unknown' };
  expect(runDataDrivenValidation(puzzle, s.grid, schema, {}, s.topology)).toMatchObject({ complete: true, errors: [] });
});

it('resolves long borders by explicit logical metadata, never ambiguous vertex indexes', () => {
  const s = load(true).getState(), graph = structuredClone(s.topology!), puzzle = structuredClone(s.puzzle);
  const at = (row: number, col: number) => [...graph.vertices.values()].find(v => v.index?.[0] === row && v.index?.[1] === col)!.id;
  const corners = [at(0, 0), at(0, 2), at(2, 2), at(2, 0)];
  puzzle.answer.lines = Object.fromEntries(corners.map((from, i) => [String(i), { id: String(i), ...line(from, corners[(i + 1) % 4]) }]));
  expect(runDataDrivenValidation(puzzle, s.grid, schema, {}, graph)).toMatchObject({ complete: true, errors: [] });
  graph.vertices.get(at(1, 1))!.index = [0, 1];
  expect(runDataDrivenValidation(puzzle, s.grid, schema, {}, graph)).toMatchObject({ complete: false, undecided: true });
});

it('uses explicit Grid compatibility with margins and a separately retained topology', () => {
  const store = createPuzzleStore().useStore;
  store.getState().newPuzzle({ rows: 1, cols: 2, gridType: 'square' });
  store.getState().setGrid({ marginTop: 1, marginLeft: 1 });
  store.getState().setUseTopology(false); store.getState().setCurrentSchemaId('slither');
  for (const cellId of ['cell-0-0', 'cell-0-1']) store.getState().addNumber({ cellId, value: '3', layer: 'problem', position: 'center', size: 'medium', color: '#000000' });
  for (const [from, to] of [['vertex-1-1','vertex-1-3'], ['vertex-1-3','vertex-2-3'], ['vertex-2-3','vertex-2-1'], ['vertex-2-1','vertex-1-1']]) store.getState().addLine(line(from, to));
  expect(store.getState().checkAnswer()).toMatchObject({ complete: true, errors: [] });
  const saved = store.getState().exportPuzzle();
  expect(store.getState().importPuzzle(saved)).toBe(true);
  expect(store.getState().checkAnswer()!.complete).toBe(true);
  const clue = Object.values(store.getState().puzzle.problem.numbers)[0];
  store.getState().setActiveLayer('problem');
  store.getState().updateNumber(clue.id, '0');
  expect(store.getState().checkAnswer()!.errors.map(e => e.failcode)).toEqual(['nmLineNe']);
});

it('uses polygon boundaries without row indexes and rejects higher-valence branches', () => {
  const store = createPuzzleStore().useStore;
  store.getState().newPuzzle({ rows: 1, cols: 2, gridType: 'square' });
  store.getState().setCurrentSchemaId('slither');
  store.getState().mergeCells([...store.getState().topology!.cells.keys()]);
  let graph = store.getState().topology!;
  const cell = [...graph.cells.values()][0];
  expect(cell.index).toBeNull();
  store.getState().addNumber({ cellId: cell.id, value: '6', layer: 'problem', position: 'center', size: 'medium', color: '#000000' });
  for (const id of cell.boundaryEdges) { const e = graph.edges.get(id)!; store.getState().addLine({ ...line(e.startVertex, e.endVertex), edgeId: id }); }
  expect(store.getState().checkAnswer()).toMatchObject({ complete: true, errors: [] });
  store.getState().newPuzzle({ rows: 3, cols: 3, gridType: 'triangle' });
  graph = store.getState().topology!;
  const vertex = [...graph.vertices.values()].find(v => v.adjacentEdges.length >= 5)!;
  expect(vertex).toBeDefined();
  for (const id of vertex.adjacentEdges.slice(0, 5)) { const e = graph.edges.get(id)!; store.getState().addLine({ ...line(e.startVertex, e.endVertex), edgeId: id }); }
  const s = store.getState();
  const overrides = Object.fromEntries(schema.validation.map(r => [r.id, r.id === 'slither.no-branch' || r.id === 'slither.no-cross']));
  expect(runDataDrivenValidation(s.puzzle, s.grid, schema, overrides, graph).errors.map(e => e.failcode)).toEqual(['lnBranch']);
});
