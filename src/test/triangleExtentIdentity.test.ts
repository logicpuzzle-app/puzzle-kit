import { expect, it } from 'vitest';
import { triangleExtentFixture } from '../../e2e/fixtures/triangle-extent';
import { createPuzzleStore } from '../store/puzzleStore';
import { resizeTopology } from '../utils/topology/resize';
import { findNearestTriangleCell, getTriangleCenter, getTriangleVertices } from '../utils/hexGridUtils';

it('keeps triangular entity references on growth and restores trimmed annotations with history', () => {
  const store = createPuzzleStore().useStore;
  expect(store.getState().importPuzzle(JSON.stringify(triangleExtentFixture()))).toBe(true);
  const original = store.getState(), graph = original.topology!;
  const direct = resizeTopology(graph, original.grid, { ...original.grid, cols: 5 });
  expect(direct.topology.vertices.get('corner/bottom|β')?.position).toEqual(graph.vertices.get('corner/bottom|β')!.position);
  store.getState().setPreviewGrid({ gridType: 'triangle', rows: 3, cols: 5 });
  expect(store.getState().previewTopology!.cells.get('cell-0-0')?.boundaryVertices).toEqual(graph.cells.get('cell-0-0')!.boundaryVertices);
  store.getState().resizeGrid({ cols: 5 });
  for (const [id, vertex] of graph.vertices) expect(store.getState().topology!.vertices.get(id)?.position).toEqual(vertex.position);
  for (const [id, edge] of graph.edges) expect(store.getState().topology!.edges.get(id)).toMatchObject({ startVertex: edge.startVertex, endVertex: edge.endVertex });
  expect(store.getState().puzzle).toEqual(original.puzzle);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  store.getState().enterTrial();
  const beforeTrim = store.getState();
  store.getState().setGrid({ rows: 2 });
  expect(store.getState().puzzle.answer.vertexSurfaces).toEqual({});
  expect(store.getState().puzzle.problem.numbers).toEqual({});
  store.getState().undo();
  expect(store.getState().topology).toBe(beforeTrim.topology);
  expect(store.getState().puzzle).toBe(beforeTrim.puzzle);
  expect(store.getState().trialStack).toBe(beforeTrim.trialStack);
  store.getState().redo();
  store.getState().setGrid({ rows: 3 });
  expect(store.getState().topology!.vertices.has('corner/bottom|β')).toBe(false);
  expect(store.getState().puzzle.answer.vertexSurfaces).toEqual({});
});

it('keeps triangular orientation and opaque references through odd margins, exclusions, deformation and reload', () => {
  const store = createPuzzleStore().useStore;
  store.getState().importPuzzle(JSON.stringify(triangleExtentFixture()));
  const graph = store.getState().topology!;
  store.getState().toggleCellDisabled('cell-0-0');
  store.getState().setTopologyPreset('wave'); store.getState().applyTopologyPreset();
  store.getState().setGrid({ marginTop: 1 });
  const full = store.getState().topology!.exclusionBase!;
  expect(store.getState().grid.trianglePhase).toBe(1);
  expect(full.cells.get('cell-0-0')?.boundaryVertices).toEqual(graph.cells.get('cell-0-0')!.boundaryVertices);
  for (const [id, v] of graph.vertices) {
    expect(full.vertices.get(id)?.basePosition?.x).toBeCloseTo(v.position.x);
    expect(full.vertices.get(id)?.basePosition?.y).toBeCloseTo(v.position.y + 30 * Math.sqrt(3));
  }
  const saved = store.getState().exportPuzzle();
  const broken = JSON.parse(saved);
  broken.grid.trianglePhase = 0;
  const beforeBadImport = store.getState();
  expect(store.getState().importPuzzle(JSON.stringify(broken))).toBe(false);
  expect(store.getState().topology).toBe(beforeBadImport.topology);
  const brokenHidden = JSON.parse(saved);
  brokenHidden.topologySettings.topology.exclusionBase.sourceConfig.trianglePhase = 0;
  expect(store.getState().importPuzzle(JSON.stringify(brokenHidden))).toBe(false);
  expect(store.getState().importPuzzle(saved)).toBe(true);
  store.getState().toggleCellDisabled('cell-0-0');
  store.getState().setTopologyPreset('square'); store.getState().applyTopologyPreset();
  store.getState().resizeGrid({ marginLeft: 1 });
  expect(store.getState().grid.trianglePhase).toBe(0);
  for (const [id, v] of graph.vertices) {
    expect(store.getState().topology!.vertices.get(id)?.position.x).toBeCloseTo(v.position.x + 30);
    expect(store.getState().topology!.vertices.get(id)?.position.y).toBeCloseTo(v.position.y + 30 * Math.sqrt(3));
  }
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  store.getState().resizeGrid({ marginTop: 0, marginLeft: 0 });
  for (const [id, v] of graph.vertices) {
    expect(store.getState().topology!.vertices.get(id)?.position.x).toBeCloseTo(v.position.x);
    expect(store.getState().topology!.vertices.get(id)?.position.y).toBeCloseTo(v.position.y);
  }
});

it('keeps triangle merges and splits through phased resize, and uses that layout in Grid coordinate queries', () => {
  const store = createPuzzleStore().useStore;
  store.getState().importPuzzle(JSON.stringify(triangleExtentFixture()));
  const source = store.getState().topology!;
  const members = [...source.cells.values()].filter(c => c.index?.[0] === 0 && c.index![1]! < 2).map(c => c.id);
  store.getState().mergeCells(members);
  const merged = store.getState().topology!;
  const id = merged.mergeGroups![0].id;
  store.getState().setGrid({ marginLeft: 1 });
  expect(store.getState().topology!.cells.get(id)?.boundaryVertices).toEqual(merged.cells.get(id)!.boundaryVertices);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  const cell = store.getState().topology!.cells.get(id)!;
  store.getState().addSplitLine(id, cell.boundaryVertices[0], cell.boundaryVertices[2]);
  const operations = store.getState().topology!.editOperations;
  expect(operations?.map(op => op.kind)).toEqual(['merge', 'split']);
  store.getState().resizeGrid({ marginTop: 1, cols: 5 });
  expect(store.getState().topology!.editOperations).toEqual(operations);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  const state = store.getState();
  const corrupt = JSON.parse(state.exportPuzzle());
  corrupt.topologySettings.topology.editBase.sourceConfig.trianglePhase = 1;
  expect(store.getState().importPuzzle(JSON.stringify(corrupt))).toBe(false);
  expect(store.getState().topology).toBe(state.topology);
  const target = state.topology!.cells.get('cell-0-0')!;
  const center = getTriangleCenter(2, 0, state.grid);
  expect(center.x).toBeCloseTo(target.center.x); expect(center.y).toBeCloseTo(target.center.y);
  expect(findNearestTriangleCell(center, state.grid)).toEqual({ row: 2, col: 0 });
  const corners = getTriangleVertices(2, 0, state.grid);
  for (const id of target.boundaryVertices) {
    const p = state.topology!.vertices.get(id)!.position;
    expect(corners).toContainEqual({ x: expect.closeTo(p.x), y: expect.closeTo(p.y) });
  }
});
