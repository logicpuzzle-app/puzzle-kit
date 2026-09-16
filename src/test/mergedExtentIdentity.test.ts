import { expect, it } from 'vitest';
import fixture from '../../e2e/fixtures/concave-merge-board.json';
import hexFixture from '../../e2e/fixtures/opaque-hex-board.json';
import legacyFixture from '../../e2e/fixtures/legacy-merged-board.json';
import { createPuzzleStore } from '../store/puzzleStore';
import { resizeTopology } from '../utils/topology/resize';

const addClue = (store: ReturnType<typeof createPuzzleStore>['useStore'], cellId: string) =>
  store.getState().addNumber({ cellId, value: '17', layer: 'problem', color: '#000000', size: 'medium', position: 'center' });

it('retains merged square/hex identities through growth, margins, deformation, exclusions and native files', () => {
  for (const data of [fixture, hexFixture]) {
    const store = createPuzzleStore().useStore;
    expect(store.getState().importPuzzle(JSON.stringify(data))).toBe(true);
    store.getState().setTopologyPreset('square'); store.getState().applyTopologyPreset();
    const source = store.getState().topology!;
    const members = [...source.cells.values()].filter(c => c.index?.[0] === 0).map(c => c.id);
    store.getState().mergeCells(members);
    const id = store.getState().topology!.mergeGroups![0].id;
    addClue(store, id);
    const before = store.getState(), graph = before.topology!;
    const direct = resizeTopology(graph, before.grid, { ...before.grid, cols: before.grid.cols + 1 });
    expect(direct.topology.cells.has(id)).toBe(true);
    store.getState().resizeGrid({ cols: before.grid.cols + 1 });
    for (const [vertexId, v] of graph.vertices) expect(store.getState().topology!.vertices.get(vertexId)?.position).toEqual(v.position);
    expect(store.getState().topology!.cells.get(id)).toMatchObject({ center: graph.cells.get(id)!.center, boundaryVertices: graph.cells.get(id)!.boundaryVertices });
    expect(store.getState().puzzle).toEqual(before.puzzle);
    store.getState().toggleCellDisabled(id);
    store.getState().setTopologyPreset('wave'); store.getState().applyTopologyPreset();
    store.getState().setGrid({ marginTop: 1, marginLeft: 1, cellSize: 80 });
    expect(store.getState().topology!.cells.has(id)).toBe(false);
    expect(store.getState().topology!.exclusionBase!.cells.has(id)).toBe(true);
    expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
    store.getState().toggleCellDisabled(id);
    store.getState().setTopologyPreset('square'); store.getState().applyTopologyPreset();
    store.getState().resizeGrid({ marginTop: 0, marginLeft: 0, cellSize: before.grid.cellSize });
    for (const [vertexId, v] of graph.vertices) {
      const position = store.getState().topology!.vertices.get(vertexId)!.position;
      expect(position.x).toBeCloseTo(v.position.x); expect(position.y).toBeCloseTo(v.position.y);
    }
    expect(store.getState().topology!.mergeGroups![0]).toEqual(graph.mergeGroups![0]);
    expect(store.getState().puzzle).toEqual(before.puzzle);
  }
});

it('splits a clipped concave group without copying its clue, then preserves a surviving fragment down to one source cell', () => {
  const store = createPuzzleStore().useStore;
  store.getState().importPuzzle(JSON.stringify(fixture));
  store.getState().setTopologyPreset('square'); store.getState().applyTopologyPreset();
  store.getState().mergeCells([...store.getState().topology!.cells.values()].filter(c => c.index?.[1] !== 1 || c.index?.[0] === 2).map(c => c.id));
  const id = store.getState().topology!.mergeGroups![0].id;
  addClue(store, id);
  store.getState().enterTrial();
  store.getState().toggleCellDisabled(id);
  const before = store.getState();
  store.getState().setGrid({ rows: 2 });
  const clipped = store.getState(), groups = clipped.topology!.mergeGroups!;
  expect(groups).toHaveLength(2);
  expect(groups.every(g => g.id !== id && g.cellIds.length === 2)).toBe(true);
  expect(clipped.grid.voidCells).toEqual(groups.map(g => g.id));
  expect(clipped.topology!.cells.size).toBe(2); // only the unmerged middle column is visible
  expect(Object.values(clipped.puzzle.problem.numbers).map(n => n.value)).toEqual(['9']);
  expect(clipped.puzzle.problem.vertexSurfaces).toEqual({});
  store.getState().undo();
  expect(store.getState().topology).toBe(before.topology);
  expect(store.getState().puzzle).toBe(before.puzzle);
  expect(store.getState().trialStack).toBe(before.trialStack);
  store.getState().redo();
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  const fragments = store.getState().topology!.mergeGroups!;
  for (const group of fragments) store.getState().toggleCellDisabled(group.id);
  const left = fragments.find(g => store.getState().topology!.mergeBase!.cells.get(g.cellIds[0])!.index?.[1] === 0)!;
  addClue(store, left.id);
  store.getState().setGrid({ rows: 1, cols: 1 });
  expect(store.getState().topology!.mergeGroups).toEqual([{ id: left.id, cellIds: [left.cellIds[0]] }]);
  expect(store.getState().topology!.cells.has(left.id)).toBe(true);
  expect(Object.values(store.getState().puzzle.problem.numbers).map(n => n.value)).toEqual(['17']);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  store.getState().unmergeCells([left.id]);
  expect(store.getState().topology!.cells.has(left.cellIds[0])).toBe(true);
  store.getState().undo();
  expect(store.getState().topology!.cells.has(left.id)).toBe(true);
  expect(Object.values(store.getState().puzzle.problem.numbers).map(n => n.value)).toEqual(['17']);
});

it('retains legacy long boundaries on growth and retires only a boundary changed by clipping', () => {
  const store = createPuzzleStore().useStore;
  store.getState().importPuzzle(JSON.stringify(legacyFixture));
  const before = store.getState(), graph = before.topology!;
  store.getState().setGrid({ cols: 5 });
  for (const [id, edge] of graph.edges) expect(store.getState().topology!.edges.get(id)).toMatchObject({ startVertex: edge.startVertex, endVertex: edge.endVertex, midpoint: edge.midpoint });
  for (const [id, cell] of graph.cells) expect(store.getState().topology!.cells.get(id)).toMatchObject({ center: cell.center, boundaryVertices: cell.boundaryVertices, boundaryEdges: cell.boundaryEdges });
  expect(store.getState().puzzle).toEqual(before.puzzle);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  const originalGroups = store.getState().topology!.mergeGroups!;
  store.getState().setGrid({ cols: 3 });
  expect(store.getState().topology!.mergeGroups![0]).toEqual(originalGroups[0]);
  expect(store.getState().topology!.cells.has(originalGroups[1].id)).toBe(true);
  expect(Object.values(store.getState().puzzle.problem.numbers).map(n => n.value)).toEqual(['17']);
  expect(store.getState().puzzle.problem.lines).toEqual({});
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
});
