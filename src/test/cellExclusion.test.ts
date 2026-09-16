import { expect, it } from 'vitest';
import { createPuzzleStore } from '../store/puzzleStore';
import type { PuzzleExport } from '../types';
import fixture from '../../e2e/fixtures/opaque-board-ids.json';

it('exclusion preserves a surviving vertex and line through history, save/load and restoration', () => {
  const store = createPuzzleStore().useStore;
  store.getState().newPuzzle({ rows: 2, cols: 2, cellSize: 40, outerPadding: 20 });
  const original = store.getState().topology!;
  const center = [...original.vertices.values()].find(v => v.position.x === 60 && v.position.y === 60)!;
  const edge = [...original.edges.values()].find(e => e.midpoint.x === 80 && e.midpoint.y === 60)!;
  store.getState().addLine({ from: edge.startVertex, to: edge.endVertex, edgeId: edge.id,
    lineTarget: 'edge', color: '#0000ff', style: 'solid', thickness: 'normal', layer: 'problem' });
  const lines = store.getState().puzzle.problem.lines;
  store.getState().setCellDisabled('cell-0-0', true, true);
  store.getState().updateTopology();
  expect(store.getState().topology!.vertices.get(center.id)?.position).toEqual({ x: 60, y: 60 });
  expect(store.getState().topology!.edges.get(edge.id)).toEqual(edge);
  store.getState().undo();
  expect(store.getState().topology).toBe(original);
  store.getState().redo();
  const saved = store.getState().exportPuzzle();
  store.getState().newPuzzle({ rows: 3, cols: 3 });
  expect(store.getState().importPuzzle(saved)).toBe(true);
  expect(store.getState().topology!.vertices.get(center.id)?.position).toEqual(center.position);
  store.getState().toggleCellDisabled('cell-0-0');
  expect(store.getState().topology!.vertices).toEqual(original.vertices);
  expect(store.getState().topology!.edges).toEqual(original.edges);
  expect(store.getState().puzzle.problem.lines).toEqual(lines);
});

it('opaque custom cells retain their graph when fully hidden, cleared or made outboard', () => {
  const store = createPuzzleStore().useStore;
  expect(store.getState().importPuzzle(JSON.stringify(fixture))).toBe(true);
  const original = store.getState().topology!;
  store.getState().startHistoryGroup();
  store.getState().setCellDisabled('co', true, true);
  store.getState().setCellDisabled('cell-with-no-coordinates', true, true);
  store.getState().endHistoryGroup();
  expect(store.getState().topology!.cells.size).toBe(0);
  expect(store.getState().topology!.bounds).toEqual(original.bounds);
  store.getState().undo();
  expect(store.getState().topology).toBe(original);
  store.getState().redo();
  const saved = JSON.parse(store.getState().exportPuzzle()) as PuzzleExport;
  expect(store.getState().importPuzzle(JSON.stringify(saved))).toBe(true);
  store.getState().setGrid({ voidCells: undefined, disabledCells: undefined, outboardCells: undefined });
  expect(store.getState().topology!.cells).toEqual(original.cells);
  expect(store.getState().topology!.vertices).toEqual(original.vertices);
  store.getState().setGrid({ excludeMode: 'outboard' });
  store.getState().toggleCellDisabled('co');
  expect(store.getState().topology!.cells.get('co')?.outboard).toBe(true);
  expect(store.getState().topology!.cells.get('cell-with-no-coordinates')?.adjacentCells).toEqual([]);
  store.getState().toggleCellDisabled('co');
  expect(store.getState().topology!.cells).toEqual(original.cells);

  // A saved visibility base must not redirect a surviving ID to another location.
  store.getState().toggleCellDisabled('co');
  const invalid = JSON.parse(store.getState().exportPuzzle()) as PuzzleExport;
  invalid.topologySettings!.topology!.exclusionBase!.vertices[0][1].position.x += 1;
  const before = store.getState().topology;
  expect(store.getState().importPuzzle(JSON.stringify(invalid))).toBe(false);
  expect(store.getState().topology).toBe(before);
});

it('restores one legacy disabled hex cell without reassigning existing IDs or clearing other exclusions', () => {
  const store = createPuzzleStore().useStore;
  store.getState().newPuzzle({ rows: 3, cols: 3, gridType: 'hex' });
  const legacy = JSON.parse(store.getState().exportPuzzle()) as PuzzleExport;
  legacy.version = '1.1.0';
  delete legacy.topologySettings!.topology;
  legacy.grid.disabledCells = ['cell-0-0', 'cell-1-1'];
  expect(store.getState().importPuzzle(JSON.stringify(legacy))).toBe(true);
  const excluded = store.getState().topology!;
  store.getState().setCellDisabled('cell-1-1', false);
  expect(store.getState().grid.disabledCells).toEqual(['cell-0-0']);
  expect(store.getState().grid.voidCells).toBeUndefined();
  expect(store.getState().topology!.cells.has('cell-1-1')).toBe(true);
  expect(store.getState().topology!.cells.has('cell-0-0')).toBe(false);
  const restoredBounds = store.getState().topology!.bounds;
  expect(restoredBounds.width).toBeGreaterThanOrEqual(restoredBounds.maxX + legacy.grid.outerPadding);
  expect(restoredBounds.height).toBeGreaterThanOrEqual(restoredBounds.maxY + legacy.grid.outerPadding);
  for (const [id, vertex] of excluded.vertices) {
    expect(store.getState().topology!.vertices.get(id)?.position).toEqual(vertex.position);
  }
  for (const [id, edge] of excluded.edges) {
    expect(store.getState().topology!.edges.get(id)).toMatchObject({ startVertex: edge.startVertex, endVertex: edge.endVertex });
  }
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
});
