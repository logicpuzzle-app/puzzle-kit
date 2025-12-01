/**
 * Sculpt Operations - Apply sculpt transformations to topology
 *
 * Sculpt operations modify the vertex positions and cell boundaries
 * within an isometric grid. These operations are stored in GridConfig.sculptOperations
 * and can be replayed when regenerating topology.
 */

import type { GridConfig, Point, SculptOperation } from '../../types';
import type { GridTopology } from './types';

/**
 * Apply a single sculpt rotation operation.
 * This rotates a 3-cell cluster around a pivot vertex.
 *
 * @param topology The current topology
 * @param vertexId The pivot vertex ID
 * @returns Modified topology, or original if operation cannot be applied
 */
function applySculptRotate(topology: GridTopology, vertexId: string): GridTopology {
  const pivot = topology.vertices.get(vertexId);
  if (!pivot || pivot.adjacentCells.length !== 3) {
    // Cannot apply: pivot not found or not a 3-cell vertex
    return topology;
  }

  const clusterCellIds = new Set(pivot.adjacentCells);

  // Create new Maps for mutation
  const newVertices = new Map(topology.vertices);
  const newCells = new Map(topology.cells);

  // Build edge key helper
  const edgeKey = (a: string, b: string) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const pairToEdge = new Map<string, { id: string }>();
  topology.edges.forEach((edge) => {
    const key = edgeKey(edge.startVertex, edge.endVertex);
    pairToEdge.set(key, { id: edge.id });
  });

  // Find outer ring: 6 vertices around pivot (excluding pivot itself)
  const outerVertexIds = new Set<string>();
  clusterCellIds.forEach((cellId) => {
    const cell = topology.cells.get(cellId);
    cell?.boundaryVertices.forEach((vId) => {
      if (vId !== pivot.id) outerVertexIds.add(vId);
    });
  });

  if (outerVertexIds.size !== 6) {
    // Cannot apply: expected 6 outer vertices for isometric 3-cell cluster
    return topology;
  }

  // Order outer vertices by angle around pivot, create remap (+3 = 180° rotation)
  const orderedOuter = Array.from(outerVertexIds)
    .map((vid) => {
      const v = newVertices.get(vid)!;
      return {
        vid,
        angle: Math.atan2(v.position.y - pivot.position.y, v.position.x - pivot.position.x),
      };
    })
    .sort((a, b) => a.angle - b.angle);

  const remap = new Map<string, string>();
  orderedOuter.forEach((item, idx) => {
    const target = orderedOuter[(idx + 3) % 6];
    remap.set(item.vid, target.vid);
  });
  const remapVertex = (vid: string) => remap.get(vid) ?? vid;

  // Find top and bottom of hexagon for vertical flip
  let hexTopY = Infinity;
  let hexBottomY = -Infinity;
  outerVertexIds.forEach((vid) => {
    const v = newVertices.get(vid);
    if (!v) return;
    if (v.position.y < hexTopY) hexTopY = v.position.y;
    if (v.position.y > hexBottomY) hexBottomY = v.position.y;
  });

  // Calculate flipped pivot position
  const hexCenterY = (hexTopY + hexBottomY) / 2;
  const flippedPivotY = 2 * hexCenterY - pivot.position.y;

  // Update pivot vertex position
  newVertices.set(pivot.id, {
    ...pivot,
    position: { x: pivot.position.x, y: flippedPivotY },
  });

  // Rebuild cells: remap boundaryVertices, calculate center as centroid
  clusterCellIds.forEach((cellId) => {
    const cell = topology.cells.get(cellId);
    if (!cell) return;

    const boundaryVertices = cell.boundaryVertices.map(remapVertex);
    const positions = boundaryVertices
      .map((vid) => newVertices.get(vid)?.position)
      .filter((p): p is Point => !!p);

    const center: Point =
      positions.length > 0
        ? {
            x: positions.reduce((sum, p) => sum + p.x, 0) / positions.length,
            y: positions.reduce((sum, p) => sum + p.y, 0) / positions.length,
          }
        : cell.center;

    newCells.set(cellId, { ...cell, boundaryVertices, center });
  });

  // Rebuild edges from cells
  const edgeAccumulator = new Map<
    string,
    { startVertex: string; endVertex: string; cells: string[] }
  >();
  newCells.forEach((cell, cellId) => {
    const verts = cell.boundaryVertices;
    for (let i = 0; i < verts.length; i++) {
      const start = verts[i];
      const end = verts[(i + 1) % verts.length];
      const key = edgeKey(start, end);
      const acc = edgeAccumulator.get(key) ?? {
        startVertex: start,
        endVertex: end,
        cells: [] as string[],
      };
      if (!acc.cells.includes(cellId)) acc.cells.push(cellId);
      edgeAccumulator.set(key, acc);
    }
  });

  const newEdges = new Map<string, typeof topology.edges extends Map<string, infer V> ? V : never>();
  edgeAccumulator.forEach((acc, key) => {
    const v1 = newVertices.get(acc.startVertex);
    const v2 = newVertices.get(acc.endVertex);
    if (!v1 || !v2) return;
    const baseId = pairToEdge.get(key)?.id ?? key;
    newEdges.set(baseId, {
      id: baseId,
      startVertex: acc.startVertex,
      endVertex: acc.endVertex,
      midpoint: {
        x: (v1.position.x + v2.position.x) / 2,
        y: (v1.position.y + v2.position.y) / 2,
      },
      adjacentCells: acc.cells,
      isBoundary: acc.cells.length === 1,
    });
  });

  // Rebuild vertex adjacentCells from cells
  const vertexToCells = new Map<string, Set<string>>();
  newCells.forEach((cell, cellId) => {
    cell.boundaryVertices.forEach((vid: string) => {
      if (!vertexToCells.has(vid)) vertexToCells.set(vid, new Set());
      vertexToCells.get(vid)!.add(cellId);
    });
  });
  vertexToCells.forEach((cellIds, vid) => {
    const v = newVertices.get(vid);
    if (v) {
      newVertices.set(vid, { ...v, adjacentCells: Array.from(cellIds) });
    }
  });

  // Recalculate bounds
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  newVertices.forEach((v) => {
    minX = Math.min(minX, v.position.x);
    minY = Math.min(minY, v.position.y);
    maxX = Math.max(maxX, v.position.x);
    maxY = Math.max(maxY, v.position.y);
  });
  const bounds = {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };

  return {
    ...topology,
    vertices: newVertices,
    edges: newEdges,
    cells: newCells,
    bounds,
  };
}

/**
 * Apply all sculpt operations from GridConfig to topology.
 * Operations are applied in order.
 *
 * @param topology The base topology
 * @param config Grid configuration containing sculptOperations
 * @returns Modified topology with all sculpt operations applied
 */
export function applySculptOperations(topology: GridTopology, config: GridConfig): GridTopology {
  const operations = config.sculptOperations ?? [];
  if (operations.length === 0) return topology;

  // Only apply sculpt operations to isometric grids
  if (config.gridType !== 'iso') return topology;

  let result = topology;
  for (const op of operations) {
    if (op.type === 'rotate') {
      result = applySculptRotate(result, op.vertexId);
    }
  }

  return result;
}
