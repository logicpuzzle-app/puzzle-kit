import { expect, it } from 'vitest';
import complete from '../../e2e/fixtures/legacy-complete-archive-board.json';
import incomplete from '../../e2e/fixtures/legacy-incomplete-archive-board.json';
import { createPuzzleStore } from '../store/puzzleStore';
import marginSplit from '../../e2e/fixtures/legacy-margin-split-board.json';
import excludedSplit from '../../e2e/fixtures/legacy-excluded-edits-board.json';
import { applyTopologyPreset } from '../utils/gridTopology';
import { applyCellExclusions } from '../utils/topology/exclusions';
import type { GridConfig } from '../types';
import { deserializeTopology, serializeTopology } from '../utils/serialization';

it.each([{ name: 'complete', fixture: complete }, { name: 'incomplete', fixture: incomplete }])('restores $name legacy exclusion archives without changing live IDs or either layer', ({ fixture }) => {
  const store = createPuzzleStore().useStore;
  expect(store.getState().importPuzzle(JSON.stringify(fixture))).toBe(true);
  const loaded = store.getState(), topology = loaded.topology!;
  expect(topology.mergeBase ?? topology.editBase).toBeDefined();
  for (const key of ['cells', 'vertices', 'edges'] as const) expect(serializeTopology(topology)[key]).toEqual(fixture.topologySettings.topology[key]);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  const before = store.getState();
  store.getState().unmergeCells(['merged-0']);
  const partial = store.getState(), retained = topology.cells.get('merged-1')!;
  expect(partial.topology!.cells.has('merged-0')).toBe(false);
  expect(partial.topology!.cells.get(retained.id)).toMatchObject({ id: retained.id, center: retained.center,
    boundaryVertices: retained.boundaryVertices, boundaryEdges: retained.boundaryEdges, originalCells: retained.originalCells });
  expect(Object.values(partial.puzzle.problem.numbers).map(n => n.value).sort()).toEqual(['17', '9']);
  for (const layer of ['problem', 'answer'] as const) expect(partial.puzzle[layer].vertexSurfaces).toEqual(loaded.puzzle[layer].vertexSurfaces);
  store.getState().undo(); expect(store.getState().topology).toBe(before.topology); expect(store.getState().puzzle).toEqual(before.puzzle);
  store.getState().redo(); expect(store.getState().topology).toBe(partial.topology);
  store.getState().unmergeCells(['merged-1']);
  expect(store.getState().topology!.cells.size).toBe(21 - fixture.grid.voidCells.length);
  for (const id of fixture.grid.voidCells) expect(store.getState().topology!.cells.has(id)).toBe(false);
  expect(Object.values(store.getState().puzzle.problem.numbers).map(n => n.value)).toEqual(['17']);
  store.getState().setGrid({ voidCells: [] });
  expect(store.getState().topology!.cells.size).toBe(21);
  for (const id of fixture.grid.voidCells) expect(store.getState().topology!.cells.has(id)).toBe(true);
  for (const layer of ['problem', 'answer'] as const) expect(store.getState().puzzle[layer].vertexSurfaces).toEqual(loaded.puzzle[layer].vertexSurfaces);
  for (const [id, vertex] of topology.vertices) if (store.getState().topology!.vertices.has(id)) expect(store.getState().topology!.vertices.get(id)!.position).toEqual(vertex.position);
  const final = store.getState();
  expect(store.getState().importPuzzle(final.exportPuzzle())).toBe(true);
  expect(store.getState().puzzle).toEqual(final.puzzle);
  expect(serializeTopology(store.getState().topology!)).toEqual(serializeTopology(final.topology!));
});

it('keeps unverified archives and mismatched visible projections intact rather than inventing source history', () => {
  for (const mode of ['custom-source', 'visible-role', 'wrong-structure']) {
    const doc = structuredClone(incomplete);
    if (mode === 'custom-source') {
      // A hidden cell can differ while every live coordinate still matches.
      const cell = doc.topologySettings.topology.exclusionBase.cells.find(([id]) => id === 'cell-2-3')![1] as { center: { x: number } };
      cell.center.x += 0.25;
    } else if (mode === 'visible-role') {
      const cell = doc.topologySettings.topology.cells.find(([id]) => id === 'cell-1-2')![1] as { outboard?: boolean };
      cell.outboard = true;
    } else doc.grid.mergedCells = [doc.grid.mergedCells[0]];
    const store = createPuzzleStore().useStore;
    expect(store.getState().importPuzzle(JSON.stringify(doc))).toBe(true);
    const before = store.getState();
    expect(before.topology!.mergeBase ?? before.topology!.editBase).toBeUndefined();
    store.getState().unmergeCells(['merged-0']);
    expect(store.getState().topology).toBe(before.topology);
    expect(store.getState().puzzle).toBe(before.puzzle);
    for (const key of ['cells', 'vertices', 'edges'] as const) expect(serializeTopology(before.topology!)[key]).toEqual(doc.topologySettings.topology[key]);
  }
});


it.each([{ name: 'margin parent', fixture: marginSplit }, { name: 'incomplete source with edge-interior cut', fixture: excludedSplit }])('restores archived $name, preserving the deformation frame, cuts and explicit edge endpoints', ({ fixture }) => {
  const raw = deserializeTopology(fixture.topologySettings.topology as Parameters<typeof deserializeTopology>[0]);
  const grid: GridConfig = { ...fixture.grid, voidCells: [...(('voidCells' in fixture.grid && fixture.grid.voidCells) || []), 'cell-1-1'] };
  const archive = applyTopologyPreset(raw, { preset: 'wave', intensity: 0.7 });
  const graph = applyCellExclusions(archive, grid);
  const store = createPuzzleStore().useStore;
  const doc = { ...fixture, grid, topologySettings: { useTopology: true, topologyPreset: 'wave', topologyIntensity: 0.7, topology: serializeTopology(graph) } };
  expect(store.getState().importPuzzle(JSON.stringify(doc))).toBe(true);
  const loaded = store.getState();
  expect(loaded.topology!.editBase).toBeDefined();
  for (const key of ['cells', 'vertices', 'edges'] as const) expect(serializeTopology(loaded.topology!)[key]).toEqual(serializeTopology(graph)[key]);
  const edge = graph.edges.get(graph.cells.get('cell-0-3')!.boundaryEdges[1])!;
  store.getState().addLine({ from: edge.startVertex, to: edge.endVertex, edgeId: edge.id, lineTarget: 'edge', layer: 'answer', color: '#0000ff', style: 'solid', thickness: 'thick' });
  const annotated = store.getState();
  expect(store.getState().importPuzzle(annotated.exportPuzzle())).toBe(true);
  expect(store.getState().puzzle).toEqual(annotated.puzzle);
  store.getState().clearSplitLines();
  expect(store.getState().topology!.cells.has(fixture.grid.splitLines[0].cellId)).toBe(true);
  if (fixture === marginSplit) expect(store.getState().topology!.cells.get('cell-0-0')!.outboard).toBe(true);
  else expect(store.getState().topology!.cells.has('merged-0')).toBe(true);
  expect(store.getState().puzzle.answer.lines).toEqual(annotated.puzzle.answer.lines);
  expect(store.getState().puzzle.problem.vertexSurfaces).toEqual(loaded.puzzle.problem.vertexSurfaces);
  store.getState().undo(); expect(store.getState().puzzle).toEqual(annotated.puzzle);
  store.getState().redo();
  store.getState().setGrid({ voidCells: [], disabledCells: [] });
  expect(store.getState().topology!.cells.has('cell-1-1')).toBe(true);
  store.getState().setTopologyPreset('square'); store.getState().applyTopologyPreset();
  for (const [id, vertex] of raw.vertices) if (store.getState().topology!.vertices.has(id)) expect(store.getState().topology!.vertices.get(id)!.position).toEqual(vertex.position);
  expect(store.getState().topology!.edges.get(edge.id)).toMatchObject({ startVertex: edge.startVertex, endVertex: edge.endVertex });
  expect(store.getState().puzzle.answer.lines).toEqual(annotated.puzzle.answer.lines);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
});
