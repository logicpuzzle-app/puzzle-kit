import { expect, it } from 'vitest';
import rotate from '../../e2e/fixtures/legacy-sculpt-rotate.json';
import sequence from '../../e2e/fixtures/legacy-sculpt-sequence.json';
import cut from '../../e2e/fixtures/legacy-sculpt-cut.json';
import type { PuzzleExport } from '../types';
import { createPuzzleStore } from '../store/puzzleStore';
import { serializeTopology, deserializeTopology } from '../utils/serialization';

for (const [mode, rawFixture] of [['rotate', rotate], ['cut', cut]] as const) {
  const fixture = rawFixture as unknown as PuzzleExport;
  const snapshotGraph = fixture.topologySettings!.topology!;
  it.each([true, false])(`restores the old ${mode} file with snapshot=%s without moving its references`, snapshot => {
    const store = createPuzzleStore().useStore;
    const input = structuredClone(fixture);
    if (!snapshot) delete (input.topologySettings as { topology?: unknown }).topology;
    expect(store.getState().importPuzzle(JSON.stringify(input))).toBe(true);
    const state = store.getState(), graph = state.topology!;
    expect(new Set(graph.cells.keys())).toEqual(new Set(snapshotGraph.cells.map(([id]) => id)));
    expect(new Set(graph.vertices.keys())).toEqual(new Set(snapshotGraph.vertices.map(([id]) => id)));
    expect(new Set(graph.edges.keys())).toEqual(new Set(snapshotGraph.edges.map(([id]) => id)));
    expect(graph.editOperations?.some(op => op.kind === 'sculpt')).toBe(true);
    expect(state.puzzle.problem.numbers.clue.cellId).toBe(fixture.state.problem.numbers.clue.cellId);
    expect(graph.cells.has(state.puzzle.problem.numbers.clue.cellId)).toBe(true);
    expect(graph.vertices.has(state.puzzle.problem.vertexSurfaces!.note.vertexId)).toBe(true);
    const line = state.puzzle.problem.lines.mark;
    const edge = graph.edges.get(line.edgeId!)!;
    expect(new Set([edge.startVertex, edge.endVertex])).toEqual(new Set([line.from, line.to]));
    const saved = state.exportPuzzle();
    const loaded = createPuzzleStore().useStore;
    expect(loaded.getState().importPuzzle(saved)).toBe(true);
    expect(serializeTopology(loaded.getState().topology!)).toEqual(JSON.parse(saved).topologySettings.topology);
    expect(deserializeTopology(serializeTopology(graph)).cells.size).toBe(graph.cells.size);
    loaded.getState().setGrid({ sculptOperations: undefined });
    expect(loaded.getState().grid.sculptOperations).toBeUndefined();
    expect(loaded.getState().topology!.editOperations?.some(op => op.kind === 'sculpt')).not.toBe(true);
    expect(loaded.getState().puzzle.problem.vertexSurfaces).toEqual(state.puzzle.problem.vertexSurfaces);
    loaded.getState().undo();
    expect(loaded.getState().puzzle.problem).toEqual(state.puzzle.problem);
    expect(serializeTopology(loaded.getState().topology!)).toEqual(JSON.parse(saved).topologySettings.topology);
  });
}

it('rejects an unrecognized legacy sculpt snapshot without replacing the current puzzle', () => {
  const store = createPuzzleStore().useStore;
  store.getState().addNumber({cellId:'cell-0-0',value:'9',layer:'problem',position:'center',size:'medium',color:'#000000'});
  const before = store.getState();
  const invalid = structuredClone(rotate);
  (invalid.topologySettings.topology.vertices[0][1] as { position: { x: number } }).position.x += 10;
  expect(store.getState().importPuzzle(JSON.stringify(invalid))).toBe(false);
  expect(store.getState().puzzle).toBe(before.puzzle);
  expect(store.getState().topology).toBe(before.topology);
  const rounded = structuredClone(rotate) as unknown as PuzzleExport;
  const savedVertex = rounded.topologySettings!.topology!.vertices[0][1];
  savedVertex.position.y += 1e-10;
  expect(store.getState().importPuzzle(JSON.stringify(rounded))).toBe(true);
  expect(store.getState().topology!.vertices.get(savedVertex.id)!.position).toEqual(savedVertex.position);
  const migrated = store.getState();
  const conflicting = JSON.parse(migrated.exportPuzzle());
  conflicting.grid.sculptOperations = [];
  expect(store.getState().importPuzzle(JSON.stringify(conflicting))).toBe(false);
  expect(store.getState().puzzle).toBe(migrated.puzzle);
  expect(store.getState().topology).toBe(migrated.topology);
});

it('keeps distinct historical edge identities across repeated old rotations, Cut, layout and later new edits', () => {
  const store = createPuzzleStore().useStore;
  expect(store.getState().importPuzzle(JSON.stringify(sequence))).toBe(true);
  const initial = store.getState().topology!;
  expect(initial.editOperations).toHaveLength(3);
  expect(new Set(initial.edges.keys())).toEqual(new Set(sequence.topologySettings.topology.edges.map(([id]) => id)));
  store.getState().setGrid({ cellSize: 60, outerPadding: 30 });
  store.getState().setTopologyPreset('wave');
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  expect(new Set(store.getState().topology!.edges.keys())).toEqual(new Set(initial.edges.keys()));
  store.getState().setGrid({ sculptOperations: undefined });
  expect(store.getState().grid.sculptOperations).toBeUndefined();
  const restored = store.getState().topology!;
  const pivot = sequence.grid.sculptOperations[0].vertexId;
  store.getState().sculptCutCluster(pivot);
  expect(store.getState().topology!.vertices.has(pivot)).toBe(false);
  const newEdges = [...store.getState().topology!.edges.keys()].filter(id => !restored.edges.has(id));
  expect(newEdges.every(id => !initial.edges.has(id))).toBe(true);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
});
