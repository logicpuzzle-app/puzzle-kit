import { expect, it } from 'vitest';
import disconnected from '../../e2e/fixtures/legacy-multiple-boundaries-board.json';
import cornerContact from '../../e2e/fixtures/legacy-corner-contact-board.json';
import { createPuzzleStore } from '../store/puzzleStore';
import { gridConfigToTopology } from '../utils/gridTopology';
import { serializeTopology } from '../utils/serialization';
import type { GridConfig } from '../types';

const examples = [{ name: 'disconnected', fixture: disconnected }, { name: 'corner contacts', fixture: cornerContact }];
it.each(examples.flatMap(example => [false, true].map(hidden => ({ ...example, hidden }))))('preserves archived $name/holed output and restores source IDs, hidden=$hidden', ({ fixture, hidden }) => {
  const store = createPuzzleStore().useStore;
  const grid: GridConfig = { ...fixture.grid, ...(hidden && { voidCells: ['cell-2-3'] }) };
  const graph = hidden ? gridConfigToTopology(grid) : undefined;
  const doc = { ...fixture, grid, topologySettings: { ...fixture.topologySettings,
    topology: graph ? serializeTopology(graph) : fixture.topologySettings.topology } };
  expect(store.getState().importPuzzle(JSON.stringify(doc))).toBe(true);
  const initial = store.getState();
  expect(initial.topology!.mergeBase ?? initial.topology!.editBase).toBeDefined();
  for (const key of ['cells', 'vertices', 'edges'] as const) expect(serializeTopology(initial.topology!)[key]).toEqual(doc.topologySettings.topology[key]);
  const notes = initial.puzzle.problem.vertexSurfaces;
  const retained = ['merged-0', 'merged-1'].map(id => initial.topology!.cells.get(id)!);
  store.getState().setGrid({ cols: 8 });
  expect(store.getState().grid.cols).toBe(8);
  for (const cell of retained) expect(store.getState().topology!.cells.get(cell.id)).toMatchObject({
    center: cell.center, boundaryVertices: cell.boundaryVertices, boundaryEdges: cell.boundaryEdges, originalCells: cell.originalCells,
  });
  expect(store.getState().puzzle).toEqual(initial.puzzle);
  const saved = store.getState().exportPuzzle();
  expect(store.getState().importPuzzle(saved)).toBe(true);
  const before = store.getState();
  store.getState().unmergeCells(['merged-0']);
  expect(store.getState().topology!.cells.has('merged-0')).toBe(false);
  expect(store.getState().topology!.cells.get('merged-1')).toEqual(before.topology!.cells.get('merged-1'));
  store.getState().unmergeCells(['merged-1']);
  for (const id of fixture.grid.mergedCells.flat()) expect(store.getState().topology!.cells.has(id)).toBe(true);
  expect(Object.values(store.getState().puzzle.problem.numbers).map(n => n.value)).toEqual(['17']);
  expect(store.getState().puzzle.problem.vertexSurfaces).toEqual(notes);
  const restored = store.getState();
  store.getState().undo(); expect(store.getState().topology!.cells.has('merged-1')).toBe(true);
  expect(Object.values(store.getState().puzzle.problem.numbers).map(n => n.value).sort()).toEqual(['17', '9']);
  store.getState().redo(); expect(store.getState().topology).toBe(restored.topology);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  // Neither disconnected nor holed NEW merges may use the legacy boundary exception.
  for (const members of fixture.grid.mergedCells) {
    const beforeNew = store.getState();
    store.getState().mergeCells(members);
    expect(store.getState().topology).toBe(beforeNew.topology);
    expect(store.getState().puzzle).toBe(beforeNew.puzzle);
  }
  // Changing source membership uses the current connected perimeter, not a stale archived triangle.
  expect(store.getState().importPuzzle(saved)).toBe(true);
  store.getState().setGrid({ cols: 6 });
  expect(store.getState().grid.cols).toBe(6);
  const cropped = store.getState().topology!.cells.get('merged-1')!;
  expect(cropped.originalCells).toEqual(['cell-0-4', 'cell-0-5', 'cell-1-4', 'cell-2-4', 'cell-2-5']);
  expect(cropped.boundaryVertices).not.toEqual(retained[1].boundaryVertices);
  expect(store.getState().topology!.cells.get('merged-0')!.boundaryVertices).toEqual(retained[0].boundaryVertices);
  expect(store.getState().puzzle.problem.numbers).toEqual(initial.puzzle.problem.numbers);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
});
