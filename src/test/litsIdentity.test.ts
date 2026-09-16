import { expect, it } from 'vitest';
import fixture from '../../e2e/fixtures/lits-opaque-board.json';
import type { PuzzleExport } from '../types';
import { createPuzzleStore } from '../store/puzzleStore';
import { loadPuzzleData } from '../components/toolbar/menu/importHandlers';
import { constraintCatalog } from '../constraints/ConstraintCatalog';
import { getHighlightProvider } from '../constraints/highlights';
import { runDataDrivenValidation } from '../constraints/validators';
import { getLitsRooms } from '../constraints/helpers/lits';
import { deserializeTopology } from '../utils/serialization';

const schema = constraintCatalog.getSchema('lits')!;
const data = () => structuredClone(fixture) as unknown as PuzzleExport;
function load(file = data()) {
  const store = createPuzzleStore().useStore;
  loadPuzzleData(store, file);
  return store;
}
type Store = ReturnType<typeof load>;
const cellAt = (store: Store, row: number, col: number) => [...store.getState().topology!.cells.values()].find(c => c.index?.[0] === row && c.index?.[1] === col)!.id;
const vertexAt = (store: Store, row: number, col: number) => [...store.getState().topology!.vertices.values()].find(v => v.index?.[0] === row && v.index?.[1] === col)!.id;
const border = (from: string, to: string) => ({ from, to, lineTarget: 'edge' as const, layer: 'problem' as const, style: 'solid' as const, thickness: 'normal' as const, color: '#000000' });
function highlights(store: Store) {
  const s = store.getState();
  return getHighlightProvider('lits.tetromino-region')!({ ...s, schema, referenceMode: s.useTopology ? 'topology' : 'grid', activeLayer: 'answer' }, schema.highlight[0])!.fills!;
}

it('checks and highlights the same opaque cells through public load, edit history and native reload', () => {
  const file = data();
  for (const [, cell] of file.topologySettings!.topology!.cells) {
    cell.boundaryEdges.reverse(); cell.boundaryVertices.push(cell.boundaryVertices.shift()!);
  }
  // A single-edge border needs incidence, not vertex coordinate metadata.
  for (const [, vertex] of file.topologySettings!.topology!.vertices) vertex.index = null;
  const store = load(file), original = store.getState().puzzle;
  expect(store.getState().checkAnswer()).toMatchObject({ complete: true, errors: [] });
  expect(new Set(highlights(store).map(f => f.cellId))).toEqual(new Set(store.getState().topology!.cells.keys()));
  expect(store.getState().puzzle).toEqual(original);
  store.getState().addSurface({ cellId: cellAt(store, 0, 1), layer: 'answer', color: '#000000' });
  expect(store.getState().checkAnswer()!.complete).toBe(false); expect(highlights(store)).toEqual([]);
  store.getState().undo(); expect(store.getState().checkAnswer()!.complete).toBe(true);
  store.getState().redo(); expect(store.getState().checkAnswer()!.complete).toBe(false);
  store.getState().undo();
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  expect(store.getState().puzzle).toEqual(original);
  expect(store.getState().checkAnswer()!.complete).toBe(true);
});

it('materializes map-only public imports onto actual edges and merges rooms reversibly', () => {
  const file = data();
  file.state.problem.roomMap = Object.fromEntries(file.topologySettings!.topology!.cells.map(([id, c]) => [id, c.index![1] === 2 ? 71 : 29]));
  const store = load(file);
  store.getState().setActiveLayer('problem');
  const imported = store.getState().puzzle.problem.roomMap;
  const lines = Object.values(store.getState().puzzle.problem.lines);
  expect(lines).toHaveLength(3);
  for (const line of lines) {
    const edge = store.getState().topology!.edges.get(line.edgeId!)!;
    expect(edge).toBeDefined();
    expect(new Set([line.from, line.to])).toEqual(new Set([edge.startVertex, edge.endVertex]));
    expect(new Set(edge.adjacentCells.map(id => imported![id]))).toEqual(new Set([29, 71]));
  }
  expect(store.getState().checkAnswer()!.complete).toBe(false); // Empty right room.
  store.getState().removeLine(lines[1].id);
  expect(store.getState().checkAnswer()!.complete).toBe(true);
  store.getState().undo(); expect(store.getState().puzzle.problem.roomMap).toEqual(imported);
  store.getState().redo(); expect(store.getState().checkAnswer()!.complete).toBe(true);
  const beforeReload = store.getState().puzzle;
  const saved = JSON.parse(store.getState().exportPuzzle()) as PuzzleExport;
  loadPuzzleData(store, saved);
  expect(store.getState().puzzle).toEqual(beforeReload);
  expect(store.getState().checkAnswer()!.complete).toBe(true);
  expect(Object.keys(store.getState().puzzle.problem.lines)).toHaveLength(2);
});

it('uses real vertex paths for full and partial dividers while ignoring decorative lines', () => {
  const store = load();
  store.getState().setActiveLayer('problem');
  store.getState().setRoomMap(Object.fromEntries([...store.getState().topology!.cells.keys()].map(id => [id, 37])));
  const originalMap = store.getState().puzzle.problem.roomMap;
  const line = border(vertexAt(store, 0, 2), vertexAt(store, 3, 2));
  store.getState().addLine({ ...line, layer: 'answer' });
  store.getState().addLine({ ...line, isFree: true });
  store.getState().addLine({ ...border(vertexAt(store, 0, 0), vertexAt(store, 3, 0)), directed: true });
  expect(store.getState().puzzle.problem.roomMap).toEqual(originalMap);
  const id = store.getState().addLine(line);
  expect([...getLitsRooms(store.getState())!.values()].map(c => c.length).sort()).toEqual([3, 6]);
  expect(store.getState().checkAnswer()!.complete).toBe(false);
  store.getState().undo(); expect(store.getState().checkAnswer()!.complete).toBe(true);
  store.getState().redo(); expect(store.getState().checkAnswer()!.complete).toBe(false);
  store.getState().removeLine(id);
  for (let row = 0; row < 3; row++) {
    store.getState().addLine(border(vertexAt(store, row, 2), vertexAt(store, row + 1, 2)));
    expect(store.getState().checkAnswer()!.complete).toBe(row < 2);
  }
});

it('returns actual IDs for 2x2, disconnected, wrong-shape and same-shape errors', () => {
  const store = createPuzzleStore().useStore;
  store.getState().newPuzzle({ rows: 6, cols: 6, gridType: 'square' });
  const file = JSON.parse(store.getState().exportPuzzle()) as PuzzleExport;
  // Fixture-only bijection includes delimiter collisions and misleading names.
  const special = ['a|b', 'c', 'a', 'b|c', 'A', 'cell-99-99', '__proto__'];
  const names = new Map(file.topologySettings!.topology!.cells.map(([id], i) => [id, special[i] ?? `opaque β ${i}`]));
  const rename = (v: unknown): unknown => typeof v === 'string' ? names.get(v) ?? v : Array.isArray(v) ? v.map(rename)
    : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, value]) => [names.get(k) ?? k, rename(value)])) : v;
  const opaque = rename(file) as PuzzleExport;
  opaque.constraintSettings = { currentSchemaId: 'lits', currentInputMode: 'auto', validationOverrides: {}, highlightOverrides: {} };
  loadPuzzleData(store, opaque);
  const cases = [
    { cells: [[1,1],[1,2],[2,1],[2,2]], fail: ['cs2x2', 'bkNotLits'], split: false },
    { cells: [[1,1],[1,2],[1,3],[4,4]], fail: ['csDivide', 'bkNotLits'], split: false },
    { cells: [[0,2],[1,2],[2,2],[3,2],[2,3],[3,3],[4,3],[5,3]], fail: ['cs2x2', 'bkSameTetro'], split: true },
    { cells: [[0,2],[1,2],[2,2],[3,2],[3,3],[3,4],[3,5],[2,5]], fail: [], split: true },
  ];
  for (const c of cases) {
    loadPuzzleData(store, opaque);
    store.getState().setRoomMap(Object.fromEntries([...store.getState().topology!.cells].map(([id, cell]) => [id, c.split && cell.index![1]! >= 3 ? 1 : 0])));
    for (const [row, col] of c.cells) store.getState().addSurface({ cellId: cellAt(store, row, col), color: '#000000', layer: 'answer' });
    const result = store.getState().checkAnswer()!;
    expect(result.errors.map(e => e.failcode)).toEqual(c.fail);
    for (const error of result.errors) for (const id of error.elements ?? []) expect(store.getState().topology!.cells.has(id)).toBe(true);
  }
});

it('reports unavailable for missing targets or ambiguous geometry instead of reconstructing IDs', () => {
  for (const mode of ['shade', 'map-missing', 'map-extra', 'index', 'adjacency', 'border-edge', 'border-vertex', 'topology']) {
    const file = data(), topology = deserializeTopology(file.topologySettings!.topology!);
    if (mode === 'shade') Object.values(file.state.answer.surfaces)[0].cellId = 'cell-0-0';
    if (mode === 'map-missing') file.state.problem.roomMap = { A: 0 };
    if (mode === 'map-extra') file.state.problem.roomMap = Object.fromEntries([...topology.cells.keys(), 'cell-0-0'].map(id => [id, 0]));
    if (mode === 'index') topology.cells.get('a')!.index = topology.cells.get('A')!.index;
    if (mode === 'adjacency') topology.cells.get('A')!.adjacentCells = [];
    if (mode.startsWith('border')) file.state.problem.lines.bad = { id: 'bad', ...border('vertex-0-0', 'vertex-0-1'), ...(mode === 'border-edge' ? { edgeId: 'edge-h-0-0' } : {}) };
    const result = runDataDrivenValidation(file.state, file.grid, schema, {}, mode === 'topology' ? null : topology, 'topology');
    expect(result, mode).toMatchObject({ complete: false, undecided: true });
    expect(result.errors.every(e => e.failcode === 'unavailable'), mode).toBe(true);
    const output = getHighlightProvider('lits.tetromino-region')!({ puzzle: file.state, grid: file.grid, topology: mode === 'topology' ? null : topology,
      referenceMode: 'topology', schema, activeLayer: 'answer', currentInputMode: 'auto' }, schema.highlight[0]);
    expect(output?.fills, mode).toEqual([]);
  }
});

it('preserves logical shapes and border editing after deformation, margin insertion and exclusions', () => {
  const store = load();
  store.getState().setTopologyPreset('wave'); store.getState().applyTopologyPreset();
  store.getState().setGrid({ marginTop: 1, marginLeft: 1 });
  const excluded = cellAt(store, 1, 3); // Unshaded original top-right corner.
  store.getState().setGrid({ voidCells: [excluded] });
  expect(store.getState().checkAnswer()).toMatchObject({ complete: true, errors: [] });
  const before = store.getState().puzzle.answer.surfaces;
  store.getState().addLine(border(vertexAt(store, 2, 3), vertexAt(store, 4, 3)));
  expect(store.getState().checkAnswer()!.complete).toBe(false);
  store.getState().undo(); expect(store.getState().checkAnswer()!.complete).toBe(true);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  expect(store.getState().puzzle.answer.surfaces).toEqual(before);
  expect(store.getState().checkAnswer()!.complete).toBe(true);
});

it('uses explicit Grid compatibility with margins even when a different topology is retained', () => {
  const store = createPuzzleStore().useStore;
  store.getState().newPuzzle({ rows: 3, cols: 3, gridType: 'square' });
  store.getState().setGrid({ marginTop: 1, marginLeft: 1 });
  store.getState().setUseTopology(false); store.getState().setCurrentSchemaId('lits');
  for (const cellId of ['cell-0-0', 'cell-1-0', 'cell-2-0', 'cell-2-1']) store.getState().addSurface({ cellId, color: '#000000', layer: 'answer' });
  expect(store.getState().checkAnswer()!.complete).toBe(true);
  store.getState().addLine(border('vertex-1-3', 'vertex-4-3'));
  expect(store.getState().checkAnswer()!.complete).toBe(false);
  store.getState().undo(); expect(store.getState().checkAnswer()!.complete).toBe(true);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  expect(store.getState().checkAnswer()!.complete).toBe(true);
});

it('does not collide delimiter-containing cell pairs when deriving rooms from borders', () => {
  const store = createPuzzleStore().useStore;
  store.getState().newPuzzle({ rows: 1, cols: 4, gridType: 'square' });
  const file = JSON.parse(store.getState().exportPuzzle()) as PuzzleExport;
  const names = new Map(file.topologySettings!.topology!.cells.map(([id], i) => [id, ['a|b', 'c', 'a', 'b|c'][i]]));
  const rename = (value: unknown): unknown => typeof value === 'string' ? names.get(value) ?? value : Array.isArray(value) ? value.map(rename)
    : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, v]) => [names.get(k) ?? k, rename(v)])) : value;
  const opaque = rename(file) as PuzzleExport;
  opaque.constraintSettings = { currentSchemaId: 'lits', currentInputMode: 'auto', validationOverrides: {}, highlightOverrides: {} };
  loadPuzzleData(store, opaque);
  store.getState().addLine(border(vertexAt(store, 0, 3), vertexAt(store, 1, 3)));
  expect([...getLitsRooms(store.getState())!.values()].map(cells => new Set(cells))).toEqual([new Set(['a|b', 'c', 'a']), new Set(['b|c'])]);
  // The same closed divider with a stale one-room map must not be accepted.
  const current = store.getState(), puzzle = structuredClone(current.puzzle);
  puzzle.problem.roomMap = Object.fromEntries([...current.topology!.cells.keys()].map(id => [id, 7]));
  expect(runDataDrivenValidation(puzzle, current.grid, schema, {}, current.topology, 'topology')).toMatchObject({ complete: false, undecided: true });
});
