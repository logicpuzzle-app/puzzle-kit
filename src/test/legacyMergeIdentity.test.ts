import { expect, it } from 'vitest';
import fixture from '../../e2e/fixtures/legacy-merged-board.json';
import { createPuzzleStore } from '../store/puzzleStore';
import { deserializeTopology, serializeTopology } from '../utils/serialization';
import { applyTopologyPreset } from '../utils/gridTopology';

it('attaches verified legacy sources without changing live identities and unmerges one group without renumbering the other', () => {
  const store = createPuzzleStore().useStore;
  expect(store.getState().importPuzzle(JSON.stringify(fixture))).toBe(true);
  const migrated = store.getState();
  expect(migrated.topology!.mergeBase).toBeDefined();
  expect(migrated.topology!.cells).toEqual(new Map(fixture.topologySettings.topology.cells));
  expect(migrated.topology!.vertices).toEqual(new Map(fixture.topologySettings.topology.vertices));
  expect(migrated.topology!.edges).toEqual(new Map(fixture.topologySettings.topology.edges));
  const [first, second] = migrated.topology!.mergeGroups!;
  expect(first.boundary!.edges).toEqual(migrated.topology!.cells.get(first.id)!.boundaryEdges);
  const saved = store.getState().exportPuzzle();
  expect(store.getState().importPuzzle(saved)).toBe(true);
  const before = store.getState();
  store.getState().unmergeCells([first.id]);
  expect(store.getState().topology!.cells.size).toBe(3);
  expect(store.getState().topology!.cells.has(second.id)).toBe(true);
  expect(store.getState().puzzle).toEqual(before.puzzle);
  for (const [id, vertex] of before.topology!.vertices) expect(store.getState().topology!.vertices.get(id)?.position).toEqual(vertex.position);
  const line = Object.values(before.puzzle.problem.lines)[0];
  expect(store.getState().topology!.edges.get(line.edgeId!)!.midpoint).toEqual(before.topology!.edges.get(line.edgeId!)!.midpoint);
  store.getState().undo();
  expect(store.getState().topology).toBe(before.topology);
  store.getState().redo();
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  store.getState().unmergeCells([second.id]);
  expect(store.getState().topology!.cells.size).toBe(4);
  // The old coalesced edge is explicitly split into source edges. Its annotation
  // is removed, not attached to a different edge with a recycled numeric ID.
  expect(store.getState().topology!.edges.has(line.edgeId!)).toBe(false);
  expect(store.getState().puzzle.problem.lines).toEqual({});
  expect(store.getState().puzzle.problem.numbers).toEqual({});
  expect(store.getState().puzzle.answer.vertexSurfaces).toEqual(before.puzzle.answer.vertexSurfaces);
  store.getState().undo();
  expect(store.getState().puzzle.problem.lines).toEqual(before.puzzle.problem.lines);
  expect(store.getState().puzzle.problem.numbers).toEqual(before.puzzle.problem.numbers);
  const withoutSnapshot = { ...fixture, version: '1.1.0', topologySettings: { ...fixture.topologySettings, topology: undefined } };
  expect(store.getState().importPuzzle(JSON.stringify(withoutSnapshot))).toBe(true);
  expect(store.getState().topology!.mergeGroups?.map(g => g.id)).toEqual([first.id, second.id]);
});

it('keeps legacy long-edge identities through saved deformation, layout and hidden cells and rejects inconsistent boundary metadata', () => {
  const store = createPuzzleStore().useStore;
  const wave = structuredClone(fixture);
  wave.topologySettings.topologyPreset = 'wave';
  const graph = applyTopologyPreset(deserializeTopology(fixture.topologySettings.topology), { preset: 'wave', intensity: 0.5 });
  const encoded = { ...wave, topologySettings: { ...wave.topologySettings, topology: serializeTopology(graph) } };
  expect(store.getState().importPuzzle(JSON.stringify(encoded))).toBe(true);
  const [first, second] = store.getState().topology!.mergeGroups!;
  store.getState().toggleCellDisabled(second.id);
  store.getState().setGrid({ cellSize: 90 });
  const saved = store.getState().exportPuzzle();
  const bad = JSON.parse(saved);
  bad.topologySettings.topology.mergeGroups[0].boundary.edges.reverse();
  const before = store.getState();
  expect(store.getState().importPuzzle(JSON.stringify(bad))).toBe(false);
  expect(store.getState().topology).toBe(before.topology);
  expect(store.getState().importPuzzle(saved)).toBe(true);
  store.getState().toggleCellDisabled(second.id);
  const positions = new Map([...store.getState().topology!.vertices].map(([id, vertex]) => [id, vertex.position]));
  store.getState().unmergeCells([first.id]);
  for (const [id, position] of positions) expect(store.getState().topology!.vertices.get(id)?.position).toEqual(position);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
});

it('does not invent a merge source for a native graph that differs from the known legacy generator', () => {
  const store = createPuzzleStore().useStore;
  const custom = structuredClone(fixture);
  const vertex = custom.topologySettings.topology.vertices[0][1] as { position: { x: number } };
  vertex.position.x += 1;
  expect(store.getState().importPuzzle(JSON.stringify(custom))).toBe(true);
  const before = store.getState();
  expect(before.topology!.mergeBase).toBeUndefined();
  store.getState().unmergeCells([...before.topology!.cells.keys()]);
  expect(store.getState().topology).toBe(before.topology);
  expect(store.getState().puzzle).toBe(before.puzzle);
});
