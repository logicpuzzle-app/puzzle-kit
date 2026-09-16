import { expect, it } from 'vitest';
import { createPuzzleStore } from '../store/puzzleStore';
import { isometricExtentFixture } from '../../e2e/fixtures/isometric-extent';
import { resizeTopology } from '../utils/topology/resize';
import { serializeTopology, deserializeTopology } from '../utils/serialization';
import { isometricGridToTopology } from '../utils/topology/special/isometric';

it('keeps isometric roof references on column growth and restores a trimmed roof with history and files', () => {
  const store = createPuzzleStore().useStore;
  expect(store.getState().importPuzzle(JSON.stringify(isometricExtentFixture()))).toBe(true);
  const before = store.getState(), graph = before.topology!;
  const cell = graph.cells.get('cell-0-0')!, vertex = graph.vertices.get('corner/roof|β')!;
  store.getState().setPreviewGrid({ gridType: 'iso', rows: 3, cols: 4, level: 2 });
  expect(store.getState().previewTopology!.cells.get(cell.id)?.center).toEqual(cell.center);
  store.getState().setGrid({ cols: 4 });
  expect(store.getState().topology!.cells.get(cell.id)?.center).toEqual(cell.center);
  expect(store.getState().topology!.vertices.get(vertex.id)?.position).toEqual(vertex.position);
  expect(store.getState().puzzle).toEqual(before.puzzle);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  store.getState().enterTrial();
  const grown = store.getState();
  store.getState().setGrid({ rows: 1 });
  expect(store.getState().puzzle.problem.numbers).toEqual({});
  store.getState().undo();
  expect(store.getState().topology).toBe(grown.topology);
  expect(store.getState().puzzle).toBe(grown.puzzle);
  expect(store.getState().trialStack).toBe(grown.trialStack);
  store.getState().redo();
  store.getState().setGrid({ rows: 3 });
  expect(store.getState().topology!.cells.has(cell.id)).toBe(false);
  expect(store.getState().puzzle.problem.numbers).toEqual({});
});

it('keeps face-local cells, saved corner order and hidden identities across height edits and deformation', () => {
  const store = createPuzzleStore().useStore;
  expect(store.getState().importPuzzle(JSON.stringify(isometricExtentFixture()))).toBe(true);
  const initial = store.getState().topology!;
  const roof = initial.cells.get('cell-0-0')!;
  // A valid rotated boundary is not required to start at the generator's first corner.
  const rotated = { ...roof, boundaryVertices: [...roof.boundaryVertices.slice(1), roof.boundaryVertices[0]],
    boundaryEdges: [...roof.boundaryEdges.slice(1), roof.boundaryEdges[0]] };
  store.setState({ topology: { ...initial, cells: new Map(initial.cells).set(roof.id, rotated) } });
  store.getState().toggleCellDisabled(roof.id);
  store.getState().setTopologyPreset('wave'); store.getState().applyTopologyPreset();
  store.getState().resizeGrid({ level: 3 });
  expect(store.getState().grid.level).toBe(3);
  expect(store.getState().topology!.cells.has(roof.id)).toBe(false);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  store.getState().setTopologyPreset('square'); store.getState().applyTopologyPreset();
  store.getState().toggleCellDisabled(roof.id);
  const graph = store.getState().topology!;
  expect(graph.cells.get(roof.id)?.boundaryVertices).toEqual(rotated.boundaryVertices);
  expect(graph.cells.get(roof.id)?.boundaryEdges).toEqual(rotated.boundaryEdges);
  // Faces have duplicate local indexes; all old cells, not just the first match, survive.
  for (const cell of initial.cells.values()) expect(graph.cells.get(cell.id)?.index).toEqual(cell.index);
  expect(serializeTopology(deserializeTopology(serializeTopology(graph)))).toEqual(serializeTopology(graph));
});

it('retires a splitting face seam without moving its note and restores it on Undo', () => {
  const store = createPuzzleStore().useStore;
  expect(store.getState().importPuzzle(JSON.stringify(isometricExtentFixture()))).toBe(true);
  const before = store.getState();
  // On this exterior board, the rightmost roof corner joins the moving right face.
  const seam = [...before.topology!.vertices.values()].sort((a, b) => b.position.x - a.position.x || a.position.y - b.position.y)[0];
  store.getState().addVertexSurface({ vertexId: seam.id, layer: 'answer', color: '#00ff00' });
  const content = store.getState().puzzle;
  store.getState().setGrid({ cols: 4 });
  expect(store.getState().topology!.vertices.has(seam.id)).toBe(false);
  expect(Object.values(store.getState().puzzle.answer.vertexSurfaces!).some(n => n.vertexId === seam.id)).toBe(false);
  expect(store.getState().puzzle.answer.vertexSurfaces!.note).toEqual(content.answer.vertexSurfaces!.note);
  const newIds = new Set([...store.getState().topology!.vertices.keys()].filter(id => !before.topology!.vertices.has(id)));
  store.getState().undo();
  expect(store.getState().topology).toBe(before.topology);
  expect(store.getState().puzzle).toBe(content);
  store.getState().setGrid({ cols: 4 });
  expect([...store.getState().topology!.vertices.keys()].some(id => newIds.has(id))).toBe(false);
});

it('resizes an interior partial-face board but rejects unrecognized embeddings without partial state changes', () => {
  const store = createPuzzleStore().useStore;
  const grid = { ...isometricExtentFixture().grid, isometricFaces: ['bottom', 'left'] as ('bottom' | 'left')[], isometricView: 'interior' as const };
  const source = isometricGridToTopology(grid);
  const result = resizeTopology(source, grid, { ...grid, rows: 4, level: 3 });
  expect([...result.cellIdMapping.keys()]).toEqual([...source.cells.keys()]);
  const loaded = deserializeTopology(serializeTopology(result.topology));
  expect(loaded.cells.size).toBe(21);
  expect(store.getState().importPuzzle(JSON.stringify(isometricExtentFixture()))).toBe(true);
  const graph = store.getState().topology!, roof = graph.cells.get('cell-0-0')!;
  // A valid graph with a custom clue position is not the declared regular embedding.
  store.setState({ topology: { ...graph, cells: new Map(graph.cells).set(roof.id, { ...roof, center: { x: roof.center.x + 3, y: roof.center.y } }) } });
  const before = store.getState();
  store.getState().setPreviewGrid({ gridType: 'iso', rows: 3, cols: 4, level: 2 });
  expect(store.getState().previewTopology).toBeNull();
  store.getState().setGrid({ cols: 4 });
  store.getState().resizeGrid({ level: 3 });
  expect(store.getState().grid).toBe(before.grid);
  expect(store.getState().topology).toBe(before.topology);
  expect(store.getState().puzzle).toBe(before.puzzle);
  expect(store.getState().historyManager).toBe(before.historyManager);
  expect(() => resizeTopology(before.topology!, before.grid, { ...before.grid, cols: 4 })).toThrow(/isometric/);
  const malformed = serializeTopology(before.topology!);
  Object.assign(malformed.cells[0][1], { isometricFace: 'unknown' });
  expect(() => deserializeTopology(malformed)).toThrow(/face/);
});
