import { expect, it } from 'vitest';
import fixture from '../../e2e/fixtures/opaque-square-board.json';
import custom from '../../e2e/fixtures/opaque-board-ids.json';
import { createPuzzleStore } from '../store/puzzleStore';
import { resizeSquareExtent } from '../utils/topology/squareExtent';

it('extends and trims an opaque board without moving line references, deleting a shared edge, or losing undo/file state', () => {
  const store = createPuzzleStore().useStore;
  expect(store.getState().importPuzzle(JSON.stringify(fixture))).toBe(true);
  const original = store.getState().topology!, content = store.getState().puzzle;
  store.getState().setPreviewGrid({ gridType: 'square', rows: 2, cols: 3, cellSize: 40 });
  expect(store.getState().previewTopology!.vertices.get('south-middle')?.position).toEqual({ x: 60, y: 100 });
  expect(store.getState().topology).toBe(original);
  store.getState().setGrid({ cols: 3 });
  const extended = store.getState().topology!;
  for (const [id, vertex] of original.vertices) expect(extended.vertices.get(id)?.position).toEqual(vertex.position);
  expect(store.getState().puzzle).toEqual(content);
  store.getState().undo();
  expect(store.getState().topology).toBe(original);
  store.getState().redo();
  expect(store.getState().topology).toBe(extended);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  store.getState().resizeGrid({ cols: 1 });
  const shared = content.answer.lines.shared;
  expect(store.getState().topology!.edges.get(shared.edgeId!)?.adjacentCells).toEqual(['room/c']);
  expect(store.getState().puzzle.answer.lines.shared).toEqual(shared);
  expect(store.getState().puzzle.problem.numbers.clue.cellId).toBe('room/c');
  store.getState().undo();
  expect(store.getState().topology!.cells.size).toBe(6);
  store.getState().redo();
  const deletedVertexIds = [...extended.vertices.keys()].filter(id => !store.getState().topology!.vertices.has(id));
  // Reload before expansion: allocator state must not resurrect deleted IDs.
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  store.getState().resizeGrid({ cols: 3 });
  for (const id of deletedVertexIds) expect(store.getState().topology!.vertices.has(id)).toBe(false);
  expect(store.getState().topology!.vertices.get('south-middle')?.position).toEqual({ x: 60, y: 100 });
});

it('keeps hidden IDs through margin movement and restores removed content/trials atomically on undo', () => {
  const store = createPuzzleStore().useStore;
  store.getState().importPuzzle(JSON.stringify(fixture));
  store.getState().toggleCellDisabled('room/a');
  store.getState().resizeGrid({ marginTop: 1, marginLeft: 1 });
  expect(store.getState().topology!.vertices.get('south-middle')?.position).toEqual({ x: 100, y: 140 });
  expect(store.getState().topology!.cells.has('room/a')).toBe(false);
  expect(store.getState().topology!.exclusionBase!.cells.get('room/a')?.index).toEqual([1, 1]);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  store.getState().toggleCellDisabled('room/a');
  expect(store.getState().topology!.cells.get('room/a')?.index).toEqual([1, 1]);
  store.getState().enterTrial();
  const before = store.getState();
  store.getState().setGrid({ rows: 1 });
  expect(store.getState().puzzle.problem.numbers.clue).toBeUndefined();
  expect(store.getState().puzzle.answer.lines.shared).toBeUndefined();
  expect(store.getState().trialStack[0].lines.shared).toBeUndefined();
  store.getState().undo();
  expect(store.getState().puzzle).toBe(before.puzzle);
  expect(store.getState().trialStack).toBe(before.trialStack);
  store.getState().rejectTrial();
  expect(store.getState().puzzle.answer.lines.shared).toEqual(before.puzzle.answer.lines.shared);

  // A rectangular extent in the settings is not evidence of square geometry.
  store.getState().importPuzzle(JSON.stringify(custom));
  const state = store.getState();
  expect(resizeSquareExtent(state.topology!, state.grid, { ...state.grid, cols: 3 })).toBeNull();
});
