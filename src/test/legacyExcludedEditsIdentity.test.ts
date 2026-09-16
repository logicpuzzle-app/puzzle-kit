import { expect, it } from 'vitest';
import fixture from '../../e2e/fixtures/legacy-excluded-edits-board.json';
import { createPuzzleStore } from '../store/puzzleStore';
import { applyTopologyPreset, gridConfigToTopology } from '../utils/gridTopology';
import { serializeTopology } from '../utils/serialization';
import type { GridConfig } from '../types';

it('restores legacy cuts and merges with excluded source cells without moving surviving IDs or notes', () => {
  const store = createPuzzleStore().useStore;
  expect(store.getState().importPuzzle(JSON.stringify(fixture))).toBe(true);
  const before = store.getState(), topology = before.topology!;
  expect(topology.editOperations).toHaveLength(2);
  for (const key of ['cells', 'vertices', 'edges'] as const) expect(serializeTopology(topology)[key]).toEqual(fixture.topologySettings.topology[key]);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  const cut = topology.editOperations!.find(op => op.kind === 'split')!;
  if (cut.kind !== 'split') throw new Error('Missing split');
  store.getState().removeSplitLine(cut.cellIds[0]);
  expect(store.getState().topology!.cells.has(cut.cellId)).toBe(true);
  expect(Object.values(store.getState().puzzle.problem.numbers).map(n => n.value).sort()).toEqual(['17', '9']);
  expect(store.getState().puzzle.problem.vertexSurfaces).toEqual(before.puzzle.problem.vertexSurfaces);
  expect(store.getState().topology!.cells.has('cell-0-0')).toBe(false);
  expect(store.getState().topology!.cells.has('cell-1-0')).toBe(false);
  store.getState().undo();
  expect(store.getState().puzzle).toEqual(before.puzzle);
  store.getState().redo();
  store.getState().unmergeCells(['merged-0']);
  expect(store.getState().topology!.cells.has('cell-1-2')).toBe(true);
  expect(store.getState().topology!.cells.has('cell-1-3')).toBe(true);
  store.getState().toggleCellDisabled('cell-1-0');
  expect(store.getState().topology!.cells.has('cell-1-0')).toBe(true);
  for (const [id, vertex] of topology.vertices) {
    const live = store.getState().topology!.vertices.get(id);
    if (live) expect(live.position).toEqual(vertex.position);
  }
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
});

it('uses the saved deformation frame for hidden and archived nodes across reload, preset reset and source restoration', () => {
  const store = createPuzzleStore().useStore;
  const grid = fixture.grid as GridConfig;
  const raw = gridConfigToTopology(grid);
  const wave = applyTopologyPreset(raw, { preset: 'wave', intensity: 0.7 });
  expect(store.getState().importPuzzle(JSON.stringify({ ...fixture, topologySettings: {
    ...fixture.topologySettings, topologyPreset: 'wave', topologyIntensity: 0.7, topology: serializeTopology(wave),
  } }))).toBe(true);
  expect(store.getState().topology!.editOperations).toHaveLength(2);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  store.getState().applyTopologyPreset();
  for (const [id, vertex] of wave.vertices) expect(store.getState().topology!.vertices.get(id)!.position).toEqual(vertex.position);
  store.getState().toggleCellDisabled('cell-1-0');
  const restored = store.getState().topology!.cells.get('cell-1-0')!;
  expect(restored).toBeDefined();
  store.getState().setTopologyPreset('square'); store.getState().applyTopologyPreset();
  for (const [id, vertex] of raw.vertices) expect(store.getState().topology!.vertices.get(id)!.position).toEqual(vertex.position);
  expect(store.getState().topology!.cells.get(restored.id)!.center).toEqual({ x: 50, y: 110 });
  const full = store.getState().topology!.exclusionBase!;
  for (const vertex of full.vertices.values()) {
    expect(vertex.position.x).toBeGreaterThanOrEqual(full.bounds.minX);
    expect(vertex.position.x).toBeLessThanOrEqual(full.bounds.maxX);
  }
  store.getState().clearSplitLines();
  store.getState().unmergeCells(['merged-0']);
  store.getState().setGrid({ cellSize: 80, outerPadding: 30 });
  expect(store.getState().topology!.cells.get(restored.id)!.center).toEqual({ x: 70, y: 150 });
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
});

it('restores a legacy disabled merged cell and its source without reusing its notes on another merge', () => {
  const store = createPuzzleStore().useStore;
  const grid: GridConfig = { ...fixture.grid, splitLines: undefined, voidCells: undefined, disabledCells: ['merged-0'] };
  const topology = applyTopologyPreset(gridConfigToTopology(grid), { preset: 'square', intensity: 0.5 });
  const document = { ...fixture, state: createPuzzleStore().useStore.getState().puzzle, grid,
    topologySettings: { ...fixture.topologySettings, topology: serializeTopology(topology) } };
  expect(store.getState().importPuzzle(JSON.stringify(document))).toBe(true);
  expect(store.getState().topology!.editOperations).toHaveLength(1);
  expect(store.getState().topology!.cells.has('merged-0')).toBe(false);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  store.getState().toggleCellDisabled('merged-0');
  expect(store.getState().topology!.cells.has('merged-0')).toBe(true);
  store.getState().unmergeCells(['merged-0']);
  expect(store.getState().topology!.cells.size).toBe(8);
  expect(store.getState().puzzle).toEqual(document.state);
});

it('does not invent structural or hidden sources for a custom graph that differs from the legacy generator', () => {
  const store = createPuzzleStore().useStore;
  const custom = structuredClone(fixture);
  const vertex = custom.topologySettings.topology.vertices[0][1] as { position: { x: number } };
  vertex.position.x += 0.25;
  expect(store.getState().importPuzzle(JSON.stringify(custom))).toBe(true);
  const before = store.getState();
  expect(before.topology!.editBase).toBeUndefined();
  expect(before.topology!.exclusionBase).toBeUndefined();
  store.getState().clearSplitLines();
  expect(store.getState().topology).toBe(before.topology);
  expect(store.getState().puzzle).toBe(before.puzzle);
});
