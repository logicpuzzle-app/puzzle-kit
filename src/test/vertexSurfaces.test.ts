import { expect, it } from 'vitest';
import fixture from '../../e2e/fixtures/vertex-surfaces.json';
import { createPuzzleStore } from '../store/puzzleStore';
import { getVertexSurfaceRegion } from '../utils/vertexSurfaces';

it('keeps opaque vertex notes separate from cell shading through history, files, trials and removal', () => {
  const store = createPuzzleStore().useStore;
  expect(store.getState().importPuzzle(JSON.stringify(fixture))).toBe(true);
  store.getState().setActiveLayer('answer');
  store.getState().addSurface({ cellId: 'room/a', layer: 'answer', color: '#000000' });
  const originalCells = store.getState().puzzle.answer.surfaces;
  const kept = store.getState().addVertexSurface({ vertexId: 'crossing|center', layer: 'answer', color: '#ff0000' });
  store.getState().undo();
  expect(store.getState().puzzle.answer.vertexSurfaces).toEqual({});
  expect(store.getState().puzzle.answer.surfaces).toEqual(originalCells);
  store.getState().redo();
  const restored = createPuzzleStore().useStore;
  expect(restored.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  expect(restored.getState().puzzle.answer.vertexSurfaces?.[kept]).toMatchObject({ vertexId: 'crossing|center', color: '#ff0000', layer: 'answer' });
  expect(restored.getState().puzzle.answer.surfaces).toEqual(originalCells);
  store.getState().enterTrial();
  store.getState().addVertexSurface({ vertexId: 'NW!', layer: 'answer', color: '#000000' });
  store.getState().rejectTrial();
  expect(Object.keys(store.getState().puzzle.answer.vertexSurfaces ?? {})).toEqual([kept]);
  store.getState().removeVertexSurface(kept);
  expect(Object.keys(store.getState().puzzle.answer.vertexSurfaces ?? {})).toEqual([]);
  store.getState().undo();
  expect(store.getState().puzzle.answer.vertexSurfaces?.[kept].vertexId).toBe('crossing|center');
  const problem = store.getState().puzzle.problem;
  store.getState().setPlayerMode(true);
  expect(store.getState().addVertexSurface({ vertexId: 'NW!', layer: 'problem', color: '#000000' })).toBe('');
  expect(store.getState().puzzle.problem).toBe(problem);
});

it('clips excluded cells and restores the same vertex reference after native reload', () => {
  const store = createPuzzleStore().useStore;
  store.getState().importPuzzle(JSON.stringify(fixture));
  const before = getVertexSurfaceRegion(store.getState().topology!, 'crossing|center')!;
  const notes = store.getState().puzzle.problem.vertexSurfaces;
  store.getState().toggleCellDisabled('room/a');
  const clipped = getVertexSurfaceRegion(store.getState().topology!, 'crossing|center')!;
  expect(clipped.position).toEqual(before.position);
  expect(clipped.path).not.toEqual(before.path);
  expect(store.getState().puzzle.problem.vertexSurfaces).toEqual(notes);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  store.getState().toggleCellDisabled('room/a');
  expect(getVertexSurfaceRegion(store.getState().topology!, 'crossing|center')).toEqual(before);
  // A coordinate-looking but nonexistent ID must not be interpreted as a point.
  expect(getVertexSurfaceRegion(store.getState().topology!, 'vertex-1-1')).toBeNull();
  expect(store.getState().addVertexSurface({ vertexId: 'vertex-1-1', color: '#000000', layer: 'problem' })).toBe('');
  expect(store.getState().puzzle.problem.vertexSurfaces).toEqual(notes);
});

it('keeps the bottom vertex note attached across column growth and restores it when undoing a trim', () => {
  const store = createPuzzleStore().useStore;
  store.getState().newPuzzle({ rows: 2, cols: 2, cellSize: 40, outerPadding: 20 });
  const vertex = [...store.getState().topology!.vertices.values()].find(v => v.position.x === 60 && v.position.y === 100)!;
  const id = store.getState().addVertexSurface({ vertexId: vertex.id, layer: 'answer', color: '#ff0000' });
  const note = store.getState().puzzle.answer.vertexSurfaces![id];
  store.getState().resizeGrid({ cols: 3 });
  // The former sequential rebuild reassigned this same ID to (140,20).
  expect(store.getState().topology!.vertices.get(vertex.id)?.position).toEqual(vertex.position);
  expect(store.getState().puzzle.answer.vertexSurfaces![id]).toEqual(note);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  store.getState().setGrid({ rows: 1 });
  expect(store.getState().puzzle.answer.vertexSurfaces![id]).toBeUndefined();
  store.getState().undo();
  expect(store.getState().puzzle.answer.vertexSurfaces![id]).toEqual(note);
  expect(getVertexSurfaceRegion(store.getState().topology!, vertex.id)?.position).toEqual(vertex.position);
});

it('retains a vertex graph for legacy-rendered documents across editing, save/load and mode changes', () => {
  const store = createPuzzleStore().useStore;
  store.getState().setUseTopology(false);
  store.getState().newPuzzle({ rows: 2, cols: 2, cellSize: 40 });
  // Model a pre-snapshot native file. Materialization happens at this boundary,
  // not in the renderer, input handler, or reference lookup.
  const legacy = JSON.parse(store.getState().exportPuzzle());
  legacy.version = '1.1.0';
  delete legacy.topologySettings.topology;
  expect(store.getState().importPuzzle(JSON.stringify(legacy))).toBe(true);
  const vertex = [...store.getState().topology!.vertices.values()].find(v => v.position.x === 60 && v.position.y === 100)!;
  const noteId = store.getState().addVertexSurface({ vertexId: vertex.id, layer: 'answer', color: '#ff0000' });
  store.getState().addSurface({ cellId: 'cell-0-0', layer: 'problem', color: '#00ff00' });
  const cells = store.getState().puzzle.problem.surfaces;
  store.getState().setGrid({ cols: 3, marginLeft: 1 });
  expect(store.getState().topology!.vertices.get(vertex.id)?.position).toEqual({ x: 100, y: 100 });
  expect(store.getState().puzzle.problem.surfaces).toEqual(cells);
  expect(store.getState().useTopology).toBe(false);
  const saved = store.getState().exportPuzzle();
  expect(JSON.parse(saved).topologySettings.topology).toBeDefined();
  expect(store.getState().importPuzzle(saved)).toBe(true);
  const retained = store.getState().topology!;
  store.getState().setUseTopology(true);
  expect(store.getState().topology).toBe(retained);
  store.getState().setUseTopology(false);
  store.getState().resizeGrid({ cellSize: 80 });
  expect(getVertexSurfaceRegion(store.getState().topology!, vertex.id)?.position).toEqual({ x: 180, y: 180 });
  expect(store.getState().puzzle.answer.vertexSurfaces![noteId].vertexId).toBe(vertex.id);
  store.getState().undo();
  expect(store.getState().topology!.vertices.get(vertex.id)?.position).toEqual({ x: 100, y: 100 });
});

it('clips legacy exclusions after opaque-ID expansion and restores hidden notes from the file', () => {
  const store = createPuzzleStore().useStore;
  store.getState().setUseTopology(false);
  store.getState().newPuzzle({ rows: 2, cols: 2, cellSize: 40, outerPadding: 20 });
  store.getState().setGrid({ cols: 3, marginLeft: 1 });
  const vertex = [...store.getState().topology!.vertices.values()].find(v => v.position.x === 180 && v.position.y === 100)!;
  const id = store.getState().addVertexSurface({ vertexId: vertex.id, layer: 'answer', color: '#ff0000' });
  const region = getVertexSurfaceRegion(store.getState().topology!, vertex.id);
  expect(region).not.toBeNull();
  // Grid-format references are relative to the playable board, while topology
  // indices include the new left margin; the new cell has an opaque UUID.
  store.getState().setCellDisabled('cell-1-2', true);
  expect(getVertexSurfaceRegion(store.getState().topology!, vertex.id)).toBeNull();
  expect(store.getState().puzzle.answer.vertexSurfaces![id].vertexId).toBe(vertex.id);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  store.getState().setCellDisabled('cell-1-2', false);
  expect(getVertexSurfaceRegion(store.getState().topology!, vertex.id)).toEqual(region);
  store.getState().undo();
  expect(getVertexSurfaceRegion(store.getState().topology!, vertex.id)).toBeNull();
  const legacy = JSON.parse(store.getState().exportPuzzle());
  legacy.version = '1.1.0';
  delete legacy.topologySettings.topology;
  legacy.state.answer.vertexSurfaces = {};
  expect(store.getState().importPuzzle(JSON.stringify(legacy))).toBe(true);
  expect([...store.getState().topology!.cells.values()].some(c => c.index?.[0] === 1 && c.index?.[1] === 3)).toBe(false);
  store.getState().setCellDisabled('cell-1-2', false);
  expect([...store.getState().topology!.cells.values()].find(c => c.index?.[0] === 1 && c.index?.[1] === 3)?.center).toEqual({ x: 160, y: 80 });

});
