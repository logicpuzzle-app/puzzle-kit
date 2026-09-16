import { expect, it } from 'vitest';
import { createPuzzleStore } from '../store/puzzleStore';
import { serializeTopology, deserializeTopology } from '../utils/serialization';
import type { GridTopology } from '../utils/topology/types';

function setup(prefix = 'cell/@') {
  const store = createPuzzleStore().useStore;
  store.getState().setGrid({ gridType: 'iso', rows: 2, cols: 2, level: 2 });
  const graph = store.getState().topology!;
  const cells = new Map([...graph.cells.keys()].map((id, i) => [id, `${prefix}${i}`]));
  const vertices = new Map([...graph.vertices.keys()].map((id, i) => [id, `vertex/@${i}`]));
  const edges = new Map([...graph.edges.keys()].map((id, i) => [id, `edge/@${i}`]));
  // These distinct endpoint pairs collide under `${a}-${b}` concatenation.
  const a = [...graph.edges.values()][0];
  const b = [...graph.edges.values()].find(e => ![e.startVertex, e.endVertex].some(id => [a.startVertex, a.endVertex].includes(id)))!;
  vertices.set(a.startVertex, 'a'); vertices.set(a.endVertex, 'b-c');
  vertices.set(b.startVertex, 'a-b'); vertices.set(b.endVertex, 'c');
  const originalPivot = [...graph.vertices.values()].find(v => v.adjacentCells.length === 3 && new Set(v.adjacentCells.flatMap(id => graph.cells.get(id)!.boundaryVertices)).size === 7)!;
  cells.set([...graph.cells.keys()].find(id => !originalPivot.adjacentCells.includes(id))!, vertices.get(originalPivot.id)!);
  const remap = (ids: string[], map: Map<string, string>) => ids.map(id => map.get(id)!);
  const topology: GridTopology = { ...graph,
    cells: new Map([...graph.cells].map(([id, c]) => [cells.get(id)!, { ...c, id: cells.get(id)!, boundaryVertices: remap(c.boundaryVertices, vertices), boundaryEdges: remap(c.boundaryEdges, edges), adjacentCells: remap(c.adjacentCells, cells) }])),
    vertices: new Map([...graph.vertices].map(([id, v]) => [vertices.get(id)!, { ...v, id: vertices.get(id)!, adjacentCells: remap(v.adjacentCells, cells), adjacentEdges: remap(v.adjacentEdges, edges), adjacentVertices: remap(v.adjacentVertices, vertices) }])),
    edges: new Map([...graph.edges].map(([id, e]) => [edges.get(id)!, { ...e, id: edges.get(id)!, startVertex: vertices.get(e.startVertex)!, endVertex: vertices.get(e.endVertex)!, adjacentCells: remap(e.adjacentCells, cells) }])),
  };
  store.setState({ topology });
  const pivot = [...topology.vertices.values()].find(v => v.adjacentCells.length === 3 && new Set(v.adjacentCells.flatMap(id => topology.cells.get(id)!.boundaryVertices)).size === 7)!;
  expect(pivot).toBeDefined();
  return { store, topology, pivot };
}

function coherent(graph: GridTopology) {
  expect(serializeTopology(deserializeTopology(serializeTopology(graph)))).toEqual(serializeTopology(graph));
  for (const cell of graph.cells.values()) {
    expect(cell.boundaryEdges).toHaveLength(cell.boundaryVertices.length);
    cell.boundaryEdges.forEach((id, i) => {
      const edge = graph.edges.get(id)!;
      expect(new Set([edge.startVertex, edge.endVertex])).toEqual(new Set([cell.boundaryVertices[i], cell.boundaryVertices[(i + 1) % cell.boundaryVertices.length]]));
      expect(edge.adjacentCells).toContain(cell.id);
    });
  }
  for (const vertex of graph.vertices.values()) {
    const incident = [...graph.edges.values()].filter(e => e.startVertex === vertex.id || e.endVertex === vertex.id);
    expect(new Set(vertex.adjacentEdges)).toEqual(new Set(incident.map(e => e.id)));
    expect(new Set(vertex.adjacentVertices)).toEqual(new Set(incident.map(e => e.startVertex === vertex.id ? e.endVertex : e.startVertex)));
  }
}

it('rotates an opaque-ID cluster with distinct endpoint pairs and coherent saved incidences', () => {
  const { store, topology, pivot } = setup();
  store.getState().sculptRotateCluster(pivot.id);
  const after = store.getState().topology!;
  expect(after).not.toBe(topology);
  coherent(after);
  for (const old of topology.edges.values()) {
    const surviving = [...after.edges.values()].find(e => new Set([e.startVertex, e.endVertex]).size === 2 && [e.startVertex, e.endVertex].every(id => [old.startVertex, old.endVertex].includes(id)));
    if (surviving) expect(surviving.id).toBe(old.id);
  }
  const loaded = createPuzzleStore().useStore;
  expect(loaded.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  expect(JSON.parse(JSON.stringify(serializeTopology(loaded.getState().topology!)))).toEqual(JSON.parse(JSON.stringify(serializeTopology(after))));
  store.getState().undo(); expect(store.getState().topology).toEqual(topology);
  store.getState().redo(); expect(store.getState().topology).toEqual(after);
});

it('cuts quadrilaterals regardless of ID spelling and removes only deleted typed references through history', () => {
  const { store, topology, pivot } = setup('cell-triangle-not-a-shape/@');
  const survivor = [...topology.vertices.values()].find(v => v.id !== pivot.id)!;
  const p = store.getState().puzzle;
  const number = { id: 'same-id-cell', cellId: pivot.id, layer: 'problem' as const, value: '7', size: 'medium' as const, color: '#000000', position: 'center' as const };
  expect(topology.cells.has(pivot.id)).toBe(true);
  store.setState({ puzzle: { ...p, answer: { ...p.answer, vertexSurfaces: { trial: { id: 'trial', vertexId: pivot.id, layer: 'answer', color: '#0000ff' } } }, problem: { ...p.problem, numbers: { [number.id]: number }, vertexSurfaces: {
    removed: { id: 'removed', vertexId: pivot.id, layer: 'problem', color: '#ff0000' },
    retained: { id: 'retained', vertexId: survivor.id, layer: 'problem', color: '#00ff00' },
  } } } });
  store.getState().enterTrial();
  const beforePuzzle = store.getState().puzzle;
  const beforeTrials = store.getState().trialStack;
  store.getState().sculptCutCluster(pivot.id);
  const after = store.getState().topology!;
  expect(after.vertices.has(pivot.id)).toBe(false);
  coherent(after);
  expect(store.getState().puzzle.problem.vertexSurfaces).toEqual({ retained: beforePuzzle.problem.vertexSurfaces!.retained });
  expect(store.getState().puzzle.problem.numbers).toEqual(beforePuzzle.problem.numbers);
  expect(store.getState().puzzle.answer.vertexSurfaces).toEqual({});
  expect(store.getState().trialStack[0].vertexSurfaces).toEqual({});
  store.getState().undo(); expect(store.getState().topology).toEqual(topology); expect(store.getState().puzzle).toEqual(beforePuzzle); expect(store.getState().trialStack).toEqual(beforeTrials);
  store.getState().redo(); expect(store.getState().topology).toEqual(after);
  const allocated = new Set([...after.cells.keys()].filter(id => !topology.cells.has(id)));
  store.getState().undo(); store.getState().sculptCutCluster(pivot.id);
  expect([...store.getState().topology!.cells.keys()].filter(id => allocated.has(id))).toEqual([]);
});

it('keeps sculpt identities through later splits, layout changes, deformation and native reload', () => {
  const { store, pivot } = setup();
  store.getState().sculptRotateCluster(pivot.id);
  const rotated = store.getState().topology!;
  const cell = [...rotated.cells.values()].find(c => !pivot.adjacentCells.includes(c.id))!;
  store.getState().addSplitLine(cell.id, cell.boundaryVertices[0], cell.boundaryVertices[2]);
  expect(store.getState().topology!.cells.has(cell.id)).toBe(false);
  const ids = new Set(store.getState().topology!.vertices.keys());
  store.getState().setGrid({ cellSize: 65, outerPadding: 27 });
  store.getState().setTopologyPreset('wave');
  coherent(store.getState().topology!);
  const loaded = createPuzzleStore().useStore;
  expect(loaded.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  expect(new Set(loaded.getState().topology!.vertices.keys())).toEqual(ids);
  loaded.getState().clearSplitLines();
  expect(loaded.getState().topology!.cells.has(cell.id)).toBe(true);
  expect(loaded.getState().topology!.editOperations?.map(op => op.kind)).toEqual(['sculpt']);
  loaded.getState().setTopologyPreset('square');
  coherent(loaded.getState().topology!);
  expect(loaded.getState().topology!.vertices.get(pivot.id)!.position.y).toBeCloseTo((rotated.vertices.get(pivot.id)!.position.y - 20) * 65 / 40 + 27);
  const sculpted = loaded.getState().topology!;
  loaded.getState().setGrid({ sculptOperations: undefined });
  expect(loaded.getState().grid.sculptOperations).toBeUndefined();
  expect(loaded.getState().topology!.vertices.get(pivot.id)!.position.y).toBeCloseTo((pivot.position.y - 20) * 65 / 40 + 27);
  coherent(loaded.getState().topology!);
  loaded.getState().undo(); expect(loaded.getState().topology).toEqual(sculpted);
});

it('rejects a sculpt snapshot that reuses an edge identity or changes its recorded pivot result', () => {
  const { store, pivot } = setup();
  store.getState().sculptRotateCluster(pivot.id);
  const snapshot = serializeTopology(store.getState().topology!);
  const edit = snapshot.editOperations!.find(op => op.kind === 'sculpt')!;
  if (edit.kind !== 'sculpt') throw new Error('Missing sculpt operation');
  const invalidId = structuredClone(snapshot);
  const forged = invalidId.editOperations!.find(op => op.kind === 'sculpt')!;
  if (forged.kind !== 'sculpt') throw new Error('Missing sculpt operation');
  forged.edges[0].id = snapshot.editBase!.edges[0][0];
  expect(() => deserializeTopology(invalidId)).toThrow();
  const invalidPosition = structuredClone(snapshot);
  invalidPosition.vertices.find(([id]) => id === pivot.id)![1].position.x += 10;
  expect(() => deserializeTopology(invalidPosition)).toThrow();
  coherent(store.getState().topology!);
});
