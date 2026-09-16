import { expect, it } from 'vitest';
import combined from '../../e2e/fixtures/legacy-walk-board.json';
import repeated from '../../e2e/fixtures/legacy-walk-10.json';
import pinched from '../../e2e/fixtures/legacy-walk-494.json';
import { createPuzzleStore } from '../store/puzzleStore';
import { gridConfigToTopology } from '../utils/gridTopology';
import { serializeTopology } from '../utils/serialization';
import type { GridConfig } from '../types';

const examples = [{ name: 'repeated shared vertex', fixture: repeated }, { name: 'pinched connected perimeter', fixture: pinched }];
it.each(examples.flatMap(example => [false, true].map(hidden => ({ ...example, hidden }))))('restores $name with an explicit legacy walk, hidden=$hidden', ({ fixture, hidden }) => {
  const store = createPuzzleStore().useStore;
  const grid: GridConfig = { ...fixture.grid, ...(hidden && { voidCells: ['cell-1-1'] }) };
  const graph = hidden ? serializeTopology(gridConfigToTopology(grid)) : fixture.topologySettings.topology;
  const doc = { ...fixture, grid, topologySettings: { ...fixture.topologySettings, topology: graph } };
  expect(store.getState().importPuzzle(JSON.stringify(doc))).toBe(true);
  const initial = store.getState();
  expect(initial.topology!.mergeBase ?? initial.topology!.editBase).toBeDefined();
  for (const key of ['cells', 'vertices', 'edges'] as const) expect(serializeTopology(initial.topology!)[key]).toEqual(graph[key]);
  const merged = initial.topology!.cells.get('merged-0')!;
  store.getState().setGrid({ cols: 4 });
  expect(store.getState().grid.cols).toBe(4);
  expect(store.getState().topology!.cells.get(merged.id)).toMatchObject({ center: merged.center,
    boundaryVertices: merged.boundaryVertices, boundaryEdges: merged.boundaryEdges, originalCells: merged.originalCells });
  const saved = store.getState().exportPuzzle();
  expect(store.getState().importPuzzle(saved)).toBe(true);
  for (const mode of ['reused-edge', 'broken-incidence', 'missing-walk']) {
    const invalid = JSON.parse(saved);
    for (const topology of [invalid.topologySettings.topology, invalid.topologySettings.topology.exclusionBase].filter(Boolean)) {
      const boundary = (topology.mergeGroups ?? topology.editOperations)[0].boundary;
      if (mode === 'reused-edge') boundary.sourceWalk.edges[0] = boundary.sourceWalk.edges[1];
      else if (mode === 'broken-incidence') boundary.sourceWalk.vertices.reverse();
      else delete boundary.sourceWalk;
    }
    const beforeBad = store.getState();
    expect(store.getState().importPuzzle(JSON.stringify(invalid))).toBe(false);
    expect(store.getState().topology).toBe(beforeBad.topology);
    expect(store.getState().puzzle).toBe(beforeBad.puzzle);
  }
  const before = store.getState();
  store.getState().unmergeCells([merged.id]);
  expect(store.getState().topology!.cells.has(merged.id)).toBe(false);
  for (const id of fixture.grid.mergedCells[0]) expect(store.getState().topology!.cells.has(id)).toBe(true);
  expect(Object.values(store.getState().puzzle.problem.numbers).map(n => n.value)).toEqual(['17']);
  expect(store.getState().puzzle.problem.vertexSurfaces).toEqual(initial.puzzle.problem.vertexSurfaces);
  const restored = store.getState();
  store.getState().undo(); expect(store.getState().topology).toBe(before.topology);
  expect(store.getState().puzzle).toEqual(before.puzzle);
  store.getState().redo(); expect(store.getState().topology).toBe(restored.topology);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  const normal = store.getState();
  store.getState().mergeCells(fixture.grid.mergedCells[0]);
  expect(store.getState().topology).toBe(normal.topology);
  expect(store.getState().puzzle).toBe(normal.puzzle);
});

it.each([false, true])('remaps legacy walks through a later split and native reload, excluded=%s', hidden => {
  const store = createPuzzleStore().useStore;
  const beforeGrid: GridConfig = { ...combined.grid, ...(hidden && { voidCells: ['cell-0-3'] }) };
  const before = gridConfigToTopology(beforeGrid), parent = before.cells.get('cell-2-3')!;
  const grid: GridConfig = { ...beforeGrid, splitLines: [{ cellId: parent.id,
    startPoint: { type: 'vertex', vertexId: parent.boundaryVertices[0] },
    endPoint: { type: 'vertex', vertexId: parent.boundaryVertices[2] } }] };
  const graph = serializeTopology(gridConfigToTopology(grid));
  expect(store.getState().importPuzzle(JSON.stringify({ ...combined, grid,
    topologySettings: { ...combined.topologySettings, topology: graph } }))).toBe(true);
  const loaded = store.getState();
  expect(loaded.topology!.editBase).toBeDefined();
  for (const key of ['cells', 'vertices', 'edges'] as const) expect(serializeTopology(loaded.topology!)[key]).toEqual(graph[key]);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  store.getState().clearSplitLines();
  for (const id of ['merged-0', 'merged-1']) expect(store.getState().topology!.cells.get(id)).toMatchObject({
    boundaryVertices: loaded.topology!.cells.get(id)!.boundaryVertices,
    boundaryEdges: loaded.topology!.cells.get(id)!.boundaryEdges,
  });
  expect(store.getState().puzzle).toEqual(loaded.puzzle);
  const unsplit = store.getState();
  store.getState().setGrid({ cols: 8 });
  expect(store.getState().grid.cols).toBe(8);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  store.getState().unmergeCells(['merged-0', 'merged-1']);
  for (const id of combined.grid.mergedCells.flat()) expect(store.getState().topology!.cells.has(id)).toBe(true);
  expect(Object.values(store.getState().puzzle.problem.numbers).map(n => n.value)).toEqual(['17']);
  expect(store.getState().puzzle.problem.vertexSurfaces).toEqual(unsplit.puzzle.problem.vertexSurfaces);
});
