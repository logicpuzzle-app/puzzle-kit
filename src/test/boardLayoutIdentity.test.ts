import { expect, it } from 'vitest';
import fixture from '../../e2e/fixtures/opaque-board-ids.json';
import { createPuzzleStore } from '../store/puzzleStore';

it('scales an opaque custom board and its hidden cells without replacing references, including history and native reload', () => {
  const store = createPuzzleStore().useStore;
  store.getState().importPuzzle(JSON.stringify(fixture));
  const original = store.getState().topology!;
  const content = store.getState().puzzle;
  store.getState().toggleCellDisabled('co');
  const excluded = store.getState().topology!;
  store.getState().setPreviewGrid({ gridType: 'square', rows: 1, cols: 2, cellSize: 120 });
  expect(store.getState().previewTopology!.vertices.get('joint/bottom')?.position).toEqual({ x: 140, y: 180 });
  expect(store.getState().topology).toBe(excluded);
  store.getState().setPreviewGrid(null);
  store.getState().setGrid({ rows: 1, cols: 2, cellSize: 120, outerPadding: 30 });
  const scaled = store.getState().topology!;
  // The original trapezoid is impossible to reconstruct from rows/columns.
  expect(scaled.vertices.get('joint/top')?.position).toEqual({ x: 150, y: 30 });
  expect(scaled.vertices.get('joint/bottom')?.position).toEqual({ x: 150, y: 190 });
  expect(scaled.edges.get('shared')).toMatchObject({ startVertex: 'joint/top', endVertex: 'joint/bottom', midpoint: { x: 150, y: 110 } });
  expect(scaled.cells.has('co')).toBe(false);
  expect(store.getState().puzzle).toBe(content);
  store.getState().undo();
  expect(store.getState().topology).toBe(excluded);
  store.getState().redo();
  expect(store.getState().topology).toBe(scaled);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  store.getState().toggleCellDisabled('co');
  expect(store.getState().topology!.vertices.get('bottom|L')?.position).toEqual({ x: 70, y: 190 });
  expect(store.getState().topology!.cells.get('co')?.boundaryVertices).toEqual(original.cells.get('co')!.boundaryVertices);
  // The alternate resize API must take the same geometry-preserving path.
  store.getState().resizeGrid({ cellSize: 60, outerPadding: 20, frameColor: '#00ff00' });
  expect(store.getState().topology!.vertices).toEqual(original.vertices);
  expect(store.getState().puzzle).toEqual(content);
});

it('applies an explicitly changed preset instead of scaling the old shape, and saves the rendered settings', () => {
  const store = createPuzzleStore().useStore;
  store.getState().newPuzzle({ rows: 2, cols: 2, cellSize: 40, outerPadding: 20 });
  const original = store.getState().topology;
  store.getState().setTopologyPreset('cylinder');
  // Selecting a preset alone is pending in the existing UI. Saving the current
  // graph must not claim that it has already been deformed by that pending value.
  expect(JSON.parse(store.getState().exportPuzzle()).topologySettings.topologyPreset).toBe('square');
  store.getState().setPreviewGrid({ gridType: 'square', rows: 2, cols: 2, cellSize: 60 });
  expect(store.getState().previewTopology!.appliedPreset?.preset).toBe('cylinder');
  expect(store.getState().topology).toBe(original);
  store.getState().setGrid({ rows: 2, cols: 2, cellSize: 60 });
  expect(store.getState().topology!.bounds.minX).toBeLessThan(20);
  expect(JSON.parse(store.getState().exportPuzzle()).topologySettings.topologyPreset).toBe('cylinder');
});
