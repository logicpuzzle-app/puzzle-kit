import { expect, it } from 'vitest';
import fixture from '../../e2e/fixtures/vertex-surfaces.json';
import { createPuzzleStore } from '../store/puzzleStore';

it('merges opaque cells without changing surviving boundary identities and restores graph plus annotations with Undo', () => {
  const store = createPuzzleStore().useStore;
  expect(store.getState().importPuzzle(JSON.stringify(fixture))).toBe(true);
  store.getState().addNumber({ cellId: 'room/c', value: '17', layer: 'problem', color: '#000000', size: 'medium', position: 'center' });
  store.getState().addNumber({ cellId: 'room/a', value: '5', layer: 'answer', color: '#000000', size: 'medium', position: 'center' });
  const before = store.getState();
  store.getState().mergeCells(['room/a', 'room/b']);
  const merged = store.getState(), graph = merged.topology!;
  expect(graph.cells.size).toBe(3);
  expect(graph.cells.get('room/c')).toMatchObject({ id: 'room/c', boundaryVertices: before.topology!.cells.get('room/c')!.boundaryVertices });
  for (const [id, vertex] of graph.vertices) expect(vertex.position).toEqual(before.topology!.vertices.get(id)!.position);
  for (const [id, edge] of graph.edges) expect(edge).toMatchObject({ startVertex: before.topology!.edges.get(id)!.startVertex, endVertex: before.topology!.edges.get(id)!.endVertex });
  expect(graph.vertices.has('north-middle')).toBe(true); // collinear boundary point is still the same entity
  expect(merged.puzzle.problem.vertexSurfaces).toEqual(before.puzzle.problem.vertexSurfaces);
  expect(merged.puzzle.problem.numbers).toEqual(before.puzzle.problem.numbers);
  expect(merged.puzzle.answer.numbers).toEqual({});
  store.getState().undo();
  expect(store.getState().puzzle).toBe(before.puzzle);
  store.getState().redo();
  expect(store.getState().puzzle).toBe(merged.puzzle);
  const groupId = graph.mergeGroups![0].id;
  expect(graph.cells.get(groupId)!.originalCells).toEqual(['room/a', 'room/b']);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  store.getState().unmergeCells([groupId]);
  expect(new Set(store.getState().topology!.cells.keys())).toEqual(new Set(before.topology!.cells.keys()));
  expect(store.getState().topology!.vertices).toEqual(before.topology!.vertices);
  // Unmerge restores the same archived entities; it does not recreate annotations
  // that were explicitly removed when their cells/internal boundaries disappeared.
  store.getState().undo();
  expect(store.getState().topology!.cells.has(groupId)).toBe(true);
  store.getState().redo();
  expect(store.getState().topology!.cells.has(groupId)).toBe(false);

  expect(store.getState().importPuzzle(JSON.stringify(fixture))).toBe(true);
  store.getState().enterTrial();
  const trialBefore = store.getState();
  store.getState().mergeCells(['room/a', 'room/b', 'room/c', 'room/d']);
  expect(store.getState().topology!.vertices.has('crossing|center')).toBe(false);
  expect(Object.keys(store.getState().puzzle.problem.vertexSurfaces ?? {})).toHaveLength(0);
  store.getState().undo();
  expect(store.getState().topology).toBe(trialBefore.topology);
  expect(store.getState().puzzle).toBe(trialBefore.puzzle);
  expect(store.getState().trialStack).toBe(trialBefore.trialStack);
});

it('retains independent merged identities through another merge, exclusion, deformation, scaling and native files', () => {
  const store = createPuzzleStore().useStore;
  store.getState().importPuzzle(JSON.stringify(fixture));
  store.getState().mergeCells(['room/a', 'room/b']);
  const first = store.getState().topology!.mergeGroups![0].id;
  store.getState().mergeCells(['room/c', 'room/d']);
  const second = store.getState().topology!.mergeGroups!.find(g => g.id !== first)!.id;
  store.getState().unmergeCells([first]);
  expect(store.getState().topology!.cells.has(second)).toBe(true);
  store.getState().setTopologyPreset('wave'); store.getState().setTopologyIntensity(0.5); store.getState().applyTopologyPreset();
  store.getState().toggleCellDisabled(second);
  store.getState().setGrid({ cellSize: 80, outerPadding: 30 });
  const saved = store.getState().exportPuzzle(), broken = JSON.parse(saved);
  broken.topologySettings.topology.mergeBase.vertices[0][1].position.x += 1;
  const current = store.getState();
  const mismatchedGrid = JSON.parse(saved); mismatchedGrid.grid.mergedCells = [];
  expect(store.getState().importPuzzle(JSON.stringify(mismatchedGrid))).toBe(false);
  expect(store.getState().importPuzzle(JSON.stringify(broken))).toBe(false);
  expect(store.getState().topology).toBe(current.topology);
  expect(store.getState().importPuzzle(saved)).toBe(true);
  store.getState().toggleCellDisabled(second);
  const border = store.getState().topology!.vertices.get('SW!')!.position;
  store.getState().setGrid({ mergedCells: undefined });
  expect(store.getState().topology!.vertices.get('SW!')!.position).toEqual(border);
  store.getState().setTopologyPreset('square'); store.getState().applyTopologyPreset();
  expect(store.getState().topology!.vertices.get('SW!')!.position).toEqual({ x: 30, y: 190 });
  expect(new Set(store.getState().topology!.cells.keys())).toEqual(new Set(['room/a', 'room/b', 'room/c', 'room/d']));
  // Joining only at a corner cannot form one simple cell. Preserve the document.
  const before = store.getState();
  store.getState().mergeCells(['room/a', 'room/d']);
  expect(store.getState().topology).toBe(before.topology);
});

it('merges an existing opaque merged cell by explicit provenance and never reuses its retired ID', () => {
  const store = createPuzzleStore().useStore;
  store.getState().importPuzzle(JSON.stringify(fixture));
  store.getState().mergeCells(['room/a', 'room/b']);
  const first = store.getState().topology!.mergeGroups![0].id;
  store.getState().mergeCells([first, 'room/c']);
  const second = store.getState().topology!.mergeGroups![0];
  expect(new Set(second.cellIds)).toEqual(new Set(['room/a', 'room/b', 'room/c']));
  expect(second.id).not.toBe(first);
  expect(store.getState().topology!.cells.has('room/d')).toBe(true);
  store.getState().unmergeCells([second.id]);
  expect(new Set(store.getState().topology!.cells.keys())).toEqual(new Set(['room/a', 'room/b', 'room/c', 'room/d']));
  store.getState().mergeCells(['room/a', 'room/b']);
  expect(store.getState().topology!.mergeGroups![0].id).not.toBe(first);
});
