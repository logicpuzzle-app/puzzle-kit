import { createElement, type ReactNode } from 'react';
import { cleanup, renderHook } from '@testing-library/react';
import { PuzzleStoreProvider } from '../store/puzzleStoreContext';
import { useStoragePersistence } from '../hooks/useStoragePersistence';
import { saveGridConfig, saveTopologyState } from '../utils/storage';
import { afterEach, expect, it } from 'vitest';
import fixture from '../../e2e/fixtures/legacy-split-board.json';
import margin from '../../e2e/fixtures/legacy-margin-split-board.json';
import { createPuzzleStore } from '../store/puzzleStore';
import { loadPuzzleData } from '../components/toolbar/menu/importHandlers';
import { gridConfigToTopology, applyTopologyPreset } from '../utils/gridTopology';
import { deserializeTopology, serializeTopology } from '../utils/serialization';
import { prepareLegacySplits } from '../utils/topology/legacySplits';
import type { PuzzleExport } from '../types';

it.each([false, true])('restores an unmerged legacy margin split with hidden cells=%s without changing surviving roles or IDs', hidden => {
  const store = createPuzzleStore().useStore;
  const grid: PuzzleExport['grid'] = { ...margin.grid, ...(hidden && { voidCells: ['cell-1-3'] }) };
  const savedGraph = hidden ? serializeTopology(gridConfigToTopology(grid)) : margin.topologySettings.topology;
  const doc = { ...margin, grid, topologySettings: { ...margin.topologySettings, topology: savedGraph } };
  expect(store.getState().importPuzzle(JSON.stringify(doc))).toBe(true);
  const before = store.getState(), graph = before.topology!;
  expect(graph.editOperations).toHaveLength(1);
  for (const key of ['cells','vertices','edges'] as const) expect(serializeTopology(graph)[key]).toEqual(savedGraph[key]);
  expect(graph.editBase!.cells.get('cell-0-0')!.outboard).toBe(true);
  expect(graph.cells.get('cell-1-0')!.outboard).toBeUndefined();
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  const saved = store.getState().exportPuzzle();
  for (const invalid of [true, 'false']) {
    const bad = JSON.parse(saved), topology = bad.topologySettings.topology;
    for (const t of [topology, topology.exclusionBase].filter(Boolean)) t.editOperations[0].boundary.outboard = invalid;
    const current = store.getState();
    expect(store.getState().importPuzzle(JSON.stringify(bad))).toBe(false);
    expect(store.getState().topology).toBe(current.topology);
  }
  store.getState().clearSplitLines();
  const restored = store.getState();
  expect(restored.topology!.cells.get('cell-0-0')!.outboard).toBe(true);
  expect(restored.topology!.cells.get('cell-0-0')!.adjacentCells).toEqual([]);
  expect(restored.topology!.cells.get('cell-1-0')!.outboard).toBeUndefined();
  expect(restored.puzzle.problem.vertexSurfaces).toEqual(before.puzzle.problem.vertexSurfaces);
  expect(Object.values(restored.puzzle.problem.numbers).map(n=>n.value).sort()).toEqual(['17','9']);
  store.getState().undo(); expect(store.getState().puzzle).toEqual(before.puzzle);
  store.getState().redo();
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  const parent = store.getState().topology!.cells.get('cell-0-0')!;
  store.getState().addSplitLine(parent.id,parent.boundaryVertices[0],parent.boundaryVertices[2]);
  const cut = store.getState().topology!.editOperations![0];
  expect(cut.boundary).toBeUndefined();
  for (const id of cut.cellIds) expect(store.getState().topology!.cells.get(id)!.outboard).toBe(true);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
});

it('migrates saved vertex/edge-interior cuts without reassigning live IDs, and restores only the selected source with undoable notes', () => {
  const store = createPuzzleStore().useStore;
  expect(store.getState().importPuzzle(JSON.stringify(fixture))).toBe(true);
  const initial = store.getState(), original = fixture.topologySettings.topology;
  expect(initial.topology!.editOperations).toHaveLength(2);
  const graph = serializeTopology(initial.topology!);
  expect(graph.cells).toEqual(original.cells); expect(graph.vertices).toEqual(original.vertices); expect(graph.edges).toEqual(original.edges);
  const cut = initial.topology!.editOperations![0];
  if (cut.kind !== 'split') throw new Error('Missing legacy cut');
  const child = initial.topology!.cells.get(cut.cellIds[0])!;
  expect(child.index).toEqual([0, 0]); // Old metadata is not interpreted as a unique identity.
  const oldNotes = initial.puzzle;
  store.getState().enterTrial();
  store.getState().removeSplitLine(cut.cellIds[0]);
  const restored = store.getState();
  expect(restored.topology!.cells.has(cut.cellId)).toBe(true);
  expect(restored.topology!.editOperations).toEqual([initial.topology!.editOperations![1]]);
  expect(Object.values(restored.puzzle.problem.numbers).map(n => n.value).sort()).toEqual(['17', '9']);
  expect(Object.values(restored.puzzle.problem.vertexSurfaces!).map(n => n.color)).toEqual(['#ff0000']);
  expect(restored.puzzle.problem.lines).toEqual(oldNotes.problem.lines);
  expect(restored.topology!.vertices.has(cut.startVertex)).toBe(false); // Retired edge-interior point isn't kept as a live orphan.
  store.getState().undo(); expect(store.getState().puzzle).toBe(oldNotes);
  expect(store.getState().topology!.vertices.has(cut.startVertex)).toBe(true);
  store.getState().redo();
  const source = store.getState().topology!.cells.get(cut.cellId)!;
  store.getState().addSplitLine(source.id, source.boundaryVertices[0], source.boundaryVertices[2]);
  expect(store.getState().topology!.editOperations).toHaveLength(2);
  const saved = store.getState().exportPuzzle();
  expect(store.getState().importPuzzle(saved)).toBe(true);
  const roundtrip = JSON.parse(store.getState().exportPuzzle());
  expect(roundtrip.topologySettings.topology).toEqual(JSON.parse(saved).topologySettings.topology);
  store.getState().clearSplitLines();
  expect(store.getState().topology!.cells.size).toBe(3);
  expect([...store.getState().topology!.vertices.values()].every(v => v.adjacentCells.length > 0)).toBe(true);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  const withoutSnapshot = { ...fixture, topologySettings: { ...fixture.topologySettings, topology: undefined } };
  expect(store.getState().importPuzzle(JSON.stringify(withoutSnapshot))).toBe(true);
  expect(store.getState().topology!.editOperations).toHaveLength(2);
  expect(store.getState().puzzle.problem.lines).toEqual(oldNotes.problem.lines);
});

it('retains legacy split boundaries through public import, Wave, extent, exclusion, layout and native reload', () => {
  const store = createPuzzleStore().useStore;
  loadPuzzleData(store, fixture as unknown as PuzzleExport);
  const before = store.getState(), cuts = before.topology!.editOperations!;
  expect(cuts).toHaveLength(2);
  const hidden = cuts[0].cellIds[0];
  store.getState().toggleCellDisabled(hidden);
  store.getState().setTopologyPreset('wave'); store.getState().applyTopologyPreset();
  const deformed = store.getState();
  store.getState().setGrid({ cols: 4 });
  expect(store.getState().grid.cols).toBe(4);
  expect(store.getState().topology!.editOperations).toEqual(cuts);
  store.getState().setGrid({ cellSize: 80, outerPadding: 30 });
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  store.getState().toggleCellDisabled(hidden);
  store.getState().setTopologyPreset('square'); store.getState().applyTopologyPreset();
  for (const [id, vertex] of before.topology!.vertices) expect(store.getState().topology!.vertices.get(id)!.position)
    .toEqual({ x: 30 + (vertex.position.x - 20) * 80 / 60, y: 30 + (vertex.position.y - 20) * 80 / 60 });
  expect(store.getState().puzzle).toEqual(before.puzzle);
  // Raw legacy Wave snapshots also retain their midpoint geometry on later cuts/restoration.
  const raw = applyTopologyPreset(gridConfigToTopology(fixture.grid as PuzzleExport['grid']), { preset: 'wave', intensity: 0.5 });
  const wave = prepareLegacySplits(raw, fixture.grid as PuzzleExport['grid']);
  expect(wave.editOperations).toHaveLength(2);
  for (const [id, edge] of raw.edges) expect(wave.edges.get(id)).toEqual(edge);
  expect(deformed.topology!.editOperations).toEqual(cuts);
  store.setState({ topology: wave, grid: wave.sourceConfig!, topologyPreset: 'wave', topologyIntensity: 0.5 });
  const remaining = wave.editOperations![1];
  if (remaining.kind !== 'split') throw new Error('Missing second cut');
  store.getState().removeSplitLine(fixture.grid.splitLines[0].cellId);
  expect(store.getState().topology!.edges.get(remaining.edgeId)!.midpoint).toEqual(raw.edges.get(remaining.edgeId)!.midpoint);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  store.getState().setGrid({ cols: 2 }); // Remove the last surviving cut entirely.
  expect(store.getState().grid.cols).toBe(2);
  expect(store.getState().topology!.editOperations).toBeUndefined();
  expect([...store.getState().topology!.vertices.values()].every(v => v.adjacentCells.length > 0)).toBe(true);
  expect([...store.getState().topology!.edges.values()].every(e => e.adjacentCells.length > 0)).toBe(true);
});

it('migrates cuts of old merged cells and rejects unverified source/refinement data without losing the current puzzle', () => {
  const store = createPuzzleStore().useStore;
  store.getState().newPuzzle({ rows: 1, cols: 4, cellSize: 60 });
  const grid = { ...store.getState().grid, mergedCells: [['cell-0-0','cell-0-1'], ['cell-0-2','cell-0-3']] };
  const source = gridConfigToTopology(grid), target = [...source.cells.values()].at(-1)!;
  grid.splitLines = [{ cellId: target.id, startPoint: { type: 'edge', edgeId: target.boundaryEdges[0], t: 0.4 }, endPoint: { type: 'vertex', vertexId: target.boundaryVertices[2] } }];
  const old = applyTopologyPreset(gridConfigToTopology(grid), { preset: 'square', intensity: 0.5 });
  const migrated = prepareLegacySplits(old, grid);
  expect(migrated.editOperations).toHaveLength(3);
  store.setState({ grid: migrated.sourceConfig!, topology: migrated });
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  store.getState().clearSplitLines();
  expect(store.getState().topology!.cells.get(target.id)!.boundaryVertices).toHaveLength(target.boundaryVertices.length);
  store.getState().unmergeCells([target.id]);
  expect(store.getState().topology!.cells.has('cell-0-2')).toBe(true);
  expect(store.getState().topology!.cells.has('cell-0-3')).toBe(true);

  const custom = { ...old, vertices: new Map(old.vertices) }, vertex = [...custom.vertices.values()][0];
  custom.vertices.set(vertex.id, { ...vertex, position: { ...vertex.position, x: vertex.position.x + 0.25 } });
  expect(prepareLegacySplits(custom, grid)).toBe(custom);
  expect(store.getState().importPuzzle(JSON.stringify(fixture))).toBe(true);
  const saved = store.getState().exportPuzzle(), good = store.getState();
  const corrupt = JSON.parse(saved);
  corrupt.topologySettings.topology.editOperations[0].boundary.vertices[0] = [...good.topology!.cells.values()].at(-1)!.boundaryVertices[0];
  expect(store.getState().importPuzzle(JSON.stringify(corrupt))).toBe(false);
  expect(store.getState().topology).toBe(good.topology);
  expect(store.getState().puzzle).toBe(good.puzzle);
});


afterEach(() => { cleanup(); localStorage.clear(); });
it('migrates the stored snapshot configuration and rejects a corrupt structural source without replacing the board', () => {
  const grid = fixture.grid as PuzzleExport['grid'];
  saveGridConfig({ ...grid, rows: 9 }); // Basic preferences are stale and omit splitLines.
  saveTopologyState(deserializeTopology(fixture.topologySettings.topology), true, 'square', 0.5);
  const store = createPuzzleStore().useStore;
  const view = renderHook(() => useStoragePersistence(), { wrapper: ({ children }: { children: ReactNode }) =>
    createElement(PuzzleStoreProvider, { store, children }) });
  expect(store.getState().topology!.editOperations).toHaveLength(2);
  expect(store.getState().grid.rows).toBe(1);
  expect(store.getState().grid.splitLines![0].startPoint.type).toBe('vertex');
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  const migrated = store.getState().topology!;
  view.unmount();
  saveTopologyState({ ...migrated, sourceConfig: { ...store.getState().grid, splitLines: undefined } }, true, 'square', 0.5);
  saveGridConfig({ ...store.getState().grid, splitLines: undefined });
  const fresh = createPuzzleStore().useStore, before = fresh.getState();
  renderHook(() => useStoragePersistence(), { wrapper: ({ children }: { children: ReactNode }) =>
    createElement(PuzzleStoreProvider, { store: fresh, children }) });
  expect(fresh.getState().topology).toBe(before.topology);
  expect(fresh.getState().grid).toBe(before.grid);
});

it('migrates two edge-interior endpoints on a hex cell and retains its saved geometry through restoration', () => {
  const store = createPuzzleStore().useStore;
  store.getState().newPuzzle({ gridType: 'hex', rows: 2, cols: 2, cellSize: 50 });
  const grid = { ...store.getState().grid }, source = gridConfigToTopology(grid), cell = [...source.cells.values()][0];
  grid.splitLines = [{ cellId: cell.id, startPoint: { type: 'edge', edgeId: cell.boundaryEdges[0], t: 0.5 }, endPoint: { type: 'edge', edgeId: cell.boundaryEdges[3], t: 0.5 } }];
  const original = applyTopologyPreset(gridConfigToTopology(grid), { preset: 'square', intensity: 0.5 });
  const migrated = prepareLegacySplits(original, grid);
  expect(migrated.editOperations).toHaveLength(1);
  expect(migrated.cells).toEqual(original.cells); expect(migrated.edges).toEqual(original.edges); expect(migrated.vertices).toEqual(original.vertices);
  store.setState({ grid: migrated.sourceConfig!, topology: migrated });
  const cut = migrated.editOperations![0];
  store.getState().addNumber({ cellId: cut.cellIds[0], value: '9', layer: 'problem', color: '#000000', size: 'medium', position: 'center' });
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  store.getState().clearSplitLines();
  expect(store.getState().topology!.cells.size).toBe(4);
  expect(store.getState().topology!.cells.has(cell.id)).toBe(true);
  expect(store.getState().puzzle.problem.numbers).toEqual({});
  store.getState().undo();
  expect(Object.values(store.getState().puzzle.problem.numbers).map(n => n.cellId)).toEqual([cut.cellIds[0]]);
});
