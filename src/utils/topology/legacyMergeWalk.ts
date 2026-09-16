import type { GridTopology, TopologyVertex } from './types';

/** Exact traversal used by the legacy generator. Its order is a format detail,
 * confined to generation/import; native editing retains explicit references. */
export function legacyMergeBoundary(group: string[], topology: GridTopology) {
  const cellIdSet = new Set(group);
  // Boundary edges: incident to at least one merged cell AND at least one non-merged (or missing) cell
  const boundaryEdges = Array.from(topology.edges.values()).filter(edge => {
    const adj = edge.adjacentCells || [];
    const inCount = adj.filter(id => cellIdSet.has(id)).length;
    const outCount = adj.length - inCount;
    return inCount > 0 && (outCount > 0 || adj.length === 1);
  });
  if (boundaryEdges.length === 0) {
    console.warn('[mergeSplit] no boundary edges found for merge group', group);
    return null;
  }

  // Adjacency map (vertexId -> boundary edge ids)
  const adjMap = new Map<string, string[]>();
  const addAdj = (vId: string, eId: string) => {
    if (!adjMap.has(vId)) adjMap.set(vId, []);
    adjMap.get(vId)!.push(eId);
  };
  boundaryEdges.forEach(e => {
    addAdj(e.startVertex, e.id);
    addAdj(e.endVertex, e.id);
  });

  // Traverse each boundary loop; pick the one with largest area (outermost).
  const usedEdges = new Set<string>();
  const loops: string[][] = [];
  for (const edge of boundaryEdges) {
    if (usedEdges.has(edge.id)) continue;
    const loop: string[] = [];
    let currentEdge = edge;
    let currentVertex = currentEdge.startVertex;
    loop.push(currentVertex);

    while (true) {
      usedEdges.add(currentEdge.id);
      const nextVertex =
        currentEdge.startVertex === currentVertex ? currentEdge.endVertex : currentEdge.startVertex;
      currentVertex = nextVertex;
      loop.push(currentVertex);
      const candidates = (adjMap.get(currentVertex) || []).filter(eId => !usedEdges.has(eId));
      if (candidates.length === 0) break;
      currentEdge = topology.edges.get(candidates[0])!;
      if (loop.length > boundaryEdges.length + 2) break; // safety
    }

    // dedup consecutive
    const uniq: string[] = [];
    for (const vId of loop) {
      if (uniq.length === 0 || uniq[uniq.length - 1] !== vId) uniq.push(vId);
    }
    if (uniq.length >= 3) loops.push(uniq);
  }
  if (loops.length === 0) {
    console.warn('[mergeSplit] no boundary loop found for merge group', group);
    return null;
  }

  const areaOf = (verts: string[]) => {
    const pts = verts
      .map(id => topology.vertices.get(id))
      .filter((v): v is TopologyVertex => v !== undefined)
      .map(v => v.position);
    let sum = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      sum += a.x * b.y - a.y * b.x;
    }
    return Math.abs(sum) / 2;
  };

  const bestLoop = loops.reduce((best, loop) => (areaOf(loop) > areaOf(best) ? loop : best), loops[0]);

  return { boundaryEdges, bestLoop };
}

/** Translate the exact old perimeter walk into the retained source graph. */
export function legacyMergeSourceWalk(group: string[], topology: GridTopology,
  vertexId: (id: string) => string | undefined, edgeId: (id: string) => string | undefined) {
  const legacy = legacyMergeBoundary(group, topology);
  if (!legacy || legacy.bestLoop[0] !== legacy.bestLoop.at(-1)) return null;
  const vertices = legacy.bestLoop.slice(0, -1);
  const pair = (a: string, b: string) => JSON.stringify([a, b].sort());
  const edgeAt = new Map(legacy.boundaryEdges.map(edge => [pair(edge.startVertex, edge.endVertex), edge.id]));
  if (edgeAt.size !== legacy.boundaryEdges.length) return null;
  const edges = vertices.map((id, i) => edgeAt.get(pair(id, vertices[(i + 1) % vertices.length])));
  const mappedVertices = vertices.map(vertexId), mappedEdges = edges.map(id => id === undefined ? undefined : edgeId(id));
  if (mappedVertices.some(id => id === undefined) || mappedEdges.some(id => id === undefined)) return null;
  return { vertices: mappedVertices as string[], edges: mappedEdges as string[] };
}
