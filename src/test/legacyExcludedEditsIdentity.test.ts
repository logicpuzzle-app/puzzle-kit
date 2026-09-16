import { afterEach, expect, it } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { cleanup, renderHook } from '@testing-library/react';
import { PuzzleStoreProvider } from '../store/puzzleStoreContext';
import { useStoragePersistence } from '../hooks/useStoragePersistence';
import { saveGridConfig, saveTopologyState } from '../utils/storage';
import inactive from '../../e2e/fixtures/legacy-inactive-groups-board.json';
import fixture from '../../e2e/fixtures/legacy-excluded-edits-board.json';
import { createPuzzleStore } from '../store/puzzleStore';
import { applyTopologyPreset, gridConfigToTopology } from '../utils/gridTopology';
import { deserializeTopology, serializeTopology } from '../utils/serialization';
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
  expect(before.grid.mergedCells).toEqual(custom.grid.mergedCells);
  expect(before.grid.splitLines).toEqual(custom.grid.splitLines);
  store.getState().clearSplitLines();
  expect(store.getState().topology).toBe(before.topology);
  expect(store.getState().puzzle).toBe(before.puzzle);
});

it('retains the actual members of a legacy merge, restores the excluded source separately, and only combines it on an explicit new merge', async () => {
  const { default: document } = await import('../../e2e/fixtures/legacy-excluded-members-board.json');
  const store = createPuzzleStore().useStore;
  expect(store.getState().importPuzzle(JSON.stringify(document))).toBe(true);
  const before = store.getState(), topology = before.topology!;
  expect(topology.editOperations).toHaveLength(3);
  for (const key of ['cells', 'vertices', 'edges'] as const) expect(serializeTopology(topology)[key]).toEqual(document.topologySettings.topology[key]);
  const group = topology.editOperations!.find(op => op.kind === 'merge' && op.id === 'merged-0')!;
  expect(group.cellIds).toEqual(['cell-0-1', 'cell-0-2']);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  const cut = topology.editOperations!.find(op => op.kind === 'split')!;
  store.getState().toggleCellDisabled('cell-0-0');
  expect(store.getState().topology!.cells.get('cell-0-0')!.center).toEqual({ x: 45, y: 45 });
  for (const [id, cell] of topology.cells) expect(store.getState().topology!.cells.get(id)).toMatchObject({
    center: cell.center, boundaryVertices: cell.boundaryVertices, boundaryEdges: cell.boundaryEdges, originalCells: cell.originalCells,
  });
  expect(store.getState().puzzle).toEqual(before.puzzle);
  store.getState().removeSplitLine(cut.cellIds[0]);
  expect(store.getState().topology!.cells.get('merged-0')!.originalCells).toEqual(group.cellIds);
  // The old triangular outline touches the restored cell only at a point.
  // Restore its actual source cells before explicitly combining the region.
  store.getState().unmergeCells(['merged-0']);
  store.getState().mergeCells(['cell-0-0', 'cell-0-1', 'cell-0-2']);
  const next = [...store.getState().topology!.cells.values()].find(cell => cell.originalCells?.includes('cell-0-0'))!;
  expect(next).toBeDefined();
  expect(next.id).not.toBe('merged-0');
  expect(next.id).not.toBe('cell-0-0');
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  store.getState().unmergeCells([next.id]);
  expect(store.getState().topology!.cells.has('cell-0-0')).toBe(true);
  expect(store.getState().topology!.cells.has('merged-0')).toBe(false);
  expect(store.getState().topology!.cells.has('cell-0-1')).toBe(true);
  expect(store.getState().topology!.cells.has('cell-0-2')).toBe(true);
  expect(store.getState().topology!.cells.has('merged-1')).toBe(true);
  expect(store.getState().puzzle.problem.vertexSurfaces).toEqual(before.puzzle.problem.vertexSurfaces);
  store.getState().undo();
  expect(store.getState().topology!.cells.has(next.id)).toBe(true);
});

it('does not recycle a legacy split diagonal ID for the restored internal edge at the same coordinates', () => {
  const store = createPuzzleStore().useStore;
  store.getState().newPuzzle({ rows: 1, cols: 3, cellSize: 60, outerPadding: 20 });
  const grid = { ...store.getState().grid, voidCells: ['cell-0-0'], mergedCells: [['cell-0-1', 'cell-0-2']] };
  const before = gridConfigToTopology(grid), parent = before.cells.get('merged-0')!;
  grid.splitLines = [{ cellId: parent.id, startPoint: { type: 'edge', edgeId: parent.boundaryEdges[0], t: 0.5 },
    endPoint: { type: 'edge', edgeId: parent.boundaryEdges[2], t: 0.5 } }];
  const raw = applyTopologyPreset(gridConfigToTopology(grid), { preset: 'square', intensity: 0.5 });
  const document = { ...JSON.parse(store.getState().exportPuzzle()), grid,
    topologySettings: { useTopology: true, topologyPreset: 'square', topologyIntensity: 0.5, topology: serializeTopology(raw) } };
  expect(store.getState().importPuzzle(JSON.stringify(document))).toBe(true);
  const topology = store.getState().topology!;
  expect(topology.editOperations).toHaveLength(2);
  const cut = topology.editOperations!.find(op => op.kind === 'split')!;
  if (cut.kind !== 'split') throw new Error('Missing cut');
  const diagonal = topology.edges.get(cut.edgeId)!;
  expect(topology.editBase!.edges.has(cut.edgeId)).toBe(false);
  store.getState().clearSplitLines();
  store.getState().unmergeCells([parent.id]);
  const restored = [...store.getState().topology!.edges.values()].find(edge =>
    edge.midpoint.x === diagonal.midpoint.x && edge.midpoint.y === diagonal.midpoint.y)!;
  expect(restored).toBeDefined();
  expect(restored.id).not.toBe(cut.edgeId);
  expect(store.getState().topology!.edges.has(cut.edgeId)).toBe(false);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
});

it('keeps later merge IDs when an earlier configured group has no surviving source cells', () => {
  const store = createPuzzleStore().useStore;
  store.getState().newPuzzle({ rows: 1, cols: 5, cellSize: 60, outerPadding: 20 });
  const grid = { ...store.getState().grid, voidCells: ['cell-0-0'],
    mergedCells: [['cell-0-0'], ['cell-0-1', 'cell-0-2'], ['cell-0-3', 'cell-0-4']] };
  const raw = applyTopologyPreset(gridConfigToTopology(grid), { preset: 'square', intensity: 0.5 });
  store.setState({ grid, topology: raw, useTopology: true, topologyPreset: 'square', topologyIntensity: 0.5 });
  store.getState().addNumber({ cellId: 'merged-2', value: '9', layer: 'problem', color: '#000000', size: 'medium', position: 'center' });
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  const before = store.getState();
  expect(before.topology!.editOperations!.map(op => op.kind === 'merge' && op.id)).toEqual(['merged-1', 'merged-2']);
  store.getState().unmergeCells(['merged-1']);
  expect(store.getState().topology!.cells.has('merged-2')).toBe(true);
  expect(store.getState().topology!.cells.has('merged-0')).toBe(false);
  expect(store.getState().puzzle).toEqual(before.puzzle);
  store.getState().toggleCellDisabled('cell-0-0');
  expect(store.getState().topology!.cells.has('cell-0-0')).toBe(true);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
});


it('removes an unrealized legacy merge setting atomically with restoring its hidden source, allowing a new undoable merge', () => {
  const store = createPuzzleStore().useStore;
  expect(store.getState().importPuzzle(JSON.stringify(inactive))).toBe(true);
  const before = store.getState(), topology = before.topology!;
  expect(before.grid.mergedCells).toBeUndefined();
  expect(topology.editBase).toBeUndefined();
  expect(topology.editOperations).toBeUndefined();
  expect(topology.exclusionBase!.cells.size).toBe(3);
  for (const key of ['cells', 'vertices', 'edges'] as const) expect(serializeTopology(topology)[key]).toEqual(inactive.topologySettings.topology[key]);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  store.getState().setGrid({ voidCells: undefined });
  expect(store.getState().topology!.cells.size).toBe(3);
  expect(store.getState().topology!.cells.has('merged-0')).toBe(false);
  const restored = store.getState();
  store.getState().mergeCells(['cell-0-0', 'cell-0-1']);
  const group = store.getState().topology!.mergeGroups![0];
  expect(group.cellIds).toEqual(['cell-0-0', 'cell-0-1']);
  expect(group.id).not.toBe('merged-0');
  expect(store.getState().topology!.cells.size).toBe(2);
  expect(store.getState().puzzle).toEqual(before.puzzle);
  for (const [id, vertex] of topology.vertices) expect(store.getState().topology!.vertices.get(id)!.position).toEqual(vertex.position);
  store.getState().undo(); expect(store.getState().topology).toBe(restored.topology);
  store.getState().redo();
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  expect(store.getState().topology!.mergeGroups).toEqual([group]);
  expect(store.getState().puzzle).toEqual(before.puzzle);
});

afterEach(() => { cleanup(); localStorage.clear(); });
it('restores the normalized graph and settings together from persisted topology preferences', () => {
  saveGridConfig({ ...inactive.grid as GridConfig, rows: 9, mergedCells: undefined });
  saveTopologyState(deserializeTopology(inactive.topologySettings.topology), true, 'square', 0.5);
  const store = createPuzzleStore().useStore;
  renderHook(() => useStoragePersistence(), { wrapper: ({ children }: { children: ReactNode }) =>
    createElement(PuzzleStoreProvider, { store, children }) });
  expect(store.getState().grid.rows).toBe(1);
  expect(store.getState().grid.mergedCells).toBeUndefined();
  expect(store.getState().topology!.exclusionBase!.cells.size).toBe(3);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  store.getState().setGrid({ voidCells: undefined });
  store.getState().mergeCells(['cell-0-0', 'cell-0-1']);
  expect(store.getState().topology!.mergeGroups![0].cellIds).toEqual(['cell-0-0', 'cell-0-1']);
});
