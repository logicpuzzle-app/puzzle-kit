import { expect, it } from 'vitest';
import { createPuzzleStore } from '../store/puzzleStore';
import { legacyTriangleFixture } from '../../e2e/fixtures/legacy-triangle';
import { getCellCenter, getCellIndexMap } from '../utils/gridUtils';

it('restores the full legacy triangle footprint without replacing archived vertices, then resizes and reloads it', () => {
  const store = createPuzzleStore().useStore, fixture = legacyTriangleFixture();
  expect(store.getState().importPuzzle(JSON.stringify(fixture))).toBe(true);
  const loaded = store.getState(), graph = loaded.topology!;
  expect([...graph.cells.values()].filter(c => c.index?.[0] === 0)).toHaveLength(8);
  for (const [id, v] of fixture.topologySettings!.topology!.vertices) expect(graph.vertices.get(id)?.position).toEqual(v.position);
  expect(loaded.puzzle.problem.numbers.clue.cellId).toBe('tri-2-7');
  const right = [...graph.vertices.values()].find(v => Math.abs(v.position.x - 230) < 1e-7 && Math.abs(v.position.y - (20 + 60 * Math.sqrt(3))) < 1e-7)!;
  expect(right).toBeDefined();
  const id = loaded.addVertexSurface({ vertexId: right.id, layer: 'answer', color: '#00ff00' });
  const content = store.getState().puzzle;
  store.getState().resizeGrid({ cols: 5, marginTop: 1 });
  expect(store.getState().topology!.vertices.get(right.id)?.position.y).toBeCloseTo(right.position.y + 30 * Math.sqrt(3));
  expect(store.getState().puzzle).toEqual(content);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  const valid = store.getState();
  const malformed = legacyTriangleFixture();
  malformed.topologySettings!.topology!.vertices[0][1].position.x += 3;
  expect(store.getState().importPuzzle(JSON.stringify(malformed))).toBe(false);
  expect(store.getState().topology).toBe(valid.topology);
  const badUnit = JSON.parse(valid.exportPuzzle()); badUnit.grid.triangleColumnUnit = 'cell';
  expect(store.getState().importPuzzle(JSON.stringify(badUnit))).toBe(false);
  expect(store.getState().puzzle).toBe(valid.puzzle);
  store.getState().enterTrial();
  const beforeTrim = store.getState();
  // At three pair-columns this vertex still bounds the last triangle. Two removes it.
  store.getState().setGrid({ cols: 2 });
  expect(store.getState().puzzle.answer.vertexSurfaces?.[id]).toBeUndefined();
  expect(store.getState().puzzle.problem.numbers).toEqual({});
  store.getState().undo();
  expect(store.getState().topology).toBe(beforeTrim.topology);
  expect(store.getState().puzzle).toBe(beforeTrim.puzzle);
  expect(store.getState().trialStack).toBe(beforeTrim.trialStack);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
});

it('migrates legacy triangle cell references atomically between modes while vertex notes keep their identity', () => {
  const store = createPuzzleStore().useStore;
  store.getState().importPuzzle(JSON.stringify(legacyTriangleFixture()));
  const before = store.getState(), history = before.historyManager.getState();
  expect(before.setUseTopology(true)).toEqual({ ok: true });
  const migrated = store.getState(), clue = migrated.puzzle.problem.numbers.clue;
  const cell = migrated.topology!.cells.get(clue.cellId)!;
  expect(cell.index).toEqual([2, 7]);
  const position = getCellCenter(2, 7, before.grid);
  expect(cell.center).toEqual({ x: expect.closeTo(position.x), y: expect.closeTo(position.y) });
  expect(migrated.puzzle.answer.vertexSurfaces).toEqual(before.puzzle.answer.vertexSurfaces);
  expect([...migrated.topology!.vertices]).toEqual([...before.topology!.vertices]);
  expect(migrated.historyManager.getState().entries).toHaveLength(history.entries.length + 1);
  migrated.undo(); expect(store.getState().puzzle).toBe(before.puzzle);
  expect(store.getState().useTopology).toBe(false);
  migrated.redo();
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  expect(store.getState().setUseTopology(false)).toEqual({ ok: true });
  expect(store.getState().puzzle).toEqual(before.puzzle);
});

it('materializes old files without snapshots and creates new Grid boards over the entire visible triangle footprint', () => {
  const store = createPuzzleStore().useStore;
  expect(store.getState().importPuzzle(JSON.stringify(legacyTriangleFixture(false)))).toBe(true);
  expect(store.getState().topology!.cells.size).toBe(24);
  store.getState().newPuzzle({ gridType: 'triangle', rows: 2, cols: 3 });
  expect(store.getState().topology!.cells.size).toBe(12);
  expect(getCellIndexMap(store.getState().grid).size).toBe(12);
  const saved = store.getState().exportPuzzle();
  expect(store.getState().importPuzzle(saved)).toBe(true);
  const reloaded = JSON.parse(store.getState().exportPuzzle()), original = JSON.parse(saved);
  expect(reloaded.grid).toEqual(original.grid);
  expect(reloaded.state).toEqual(original.state);
  expect(reloaded.topologySettings).toEqual(original.topologySettings);
  expect(store.getState().setUseTopology(true)).toEqual({ ok: true });
  store.getState().newPuzzle({ gridType: 'triangle', rows: 2, cols: 3 });
  expect(store.getState().topology!.cells.size).toBe(6);
  // Same rows/cols, different declared unit: do not reuse the old Grid index cache.
  expect(store.getState().setUseTopology(false)).toEqual({ ok: true });
  expect(getCellIndexMap(store.getState().grid).size).toBe(6);
  expect(store.getState().topology!.cells.size).toBe(6);
});
