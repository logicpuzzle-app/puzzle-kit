/**
 * Sculpt operations for isometric grids
 * Handles rotate and cut operations on triangle clusters
 */
import type { Point } from '../../../types';
import type { PuzzleStore } from '../types';

/**
 * Sculpt rotate: flip a 3-cell cluster vertically around pivot
 */
export const sculptRotateCluster = (
  state: PuzzleStore,
  vertexId: string
): Partial<PuzzleStore> | typeof state => {
  if (!state.topology || state.grid.gridType !== 'iso') return state;
  const topology = state.topology;
  const pivot = topology.vertices.get(vertexId);
  if (!pivot || pivot.adjacentCells.length !== 3) return state;

  const clusterCellIds = new Set(pivot.adjacentCells);
  const affectedVertexIds = new Set<string>();
  const localCellIds = new Set<string>(clusterCellIds);

  // Include neighboring cells to limit debug output
  clusterCellIds.forEach((cellId) => {
    const cell = topology.cells.get(cellId);
    cell?.adjacentCells.forEach((adjId) => localCellIds.add(adjId));
  });

  const collectCellInfo = (cellsMap: Map<string, any>, ids: Set<string>) =>
    Array.from(ids)
      .map((id) => {
        const cell = cellsMap.get(id);
        if (!cell) return null;
        return {
          id: cell.id,
          boundaryVertices: cell.boundaryVertices.slice(),
          center: cell.center,
          adjacentCells: cell.adjacentCells,
        };
      })
      .filter((c): c is NonNullable<typeof c> => !!c);

  const collectVertexInfo = (verticesMap: Map<string, any>, ids: Set<string>) =>
    Array.from(ids)
      .map((id) => {
        const v = verticesMap.get(id);
        if (!v) return null;
        return { id: v.id, pos: v.position, adjCells: v.adjacentCells };
      })
      .filter((v): v is NonNullable<typeof v> => !!v);

  const collectEdgeInfo = (edgesMap: Map<string, any>, ids: Set<string>) =>
    Array.from(edgesMap.values())
      .filter((edge) => edge.adjacentCells.some((cId: string) => ids.has(cId)))
      .map((edge) => ({
        id: edge.id,
        start: edge.startVertex,
        end: edge.endVertex,
        adj: edge.adjacentCells,
      }));

  pivot.adjacentCells.forEach((cellId) => {
    const cell = topology.cells.get(cellId);
    if (!cell) return;
    cell.boundaryVertices.forEach((vId) => affectedVertexIds.add(vId));
  });

  const localVertexIdsBefore = new Set<string>();
  localCellIds.forEach((cellId) => {
    const cell = topology.cells.get(cellId);
    cell?.boundaryVertices.forEach((vId) => localVertexIdsBefore.add(vId));
  });

  console.log('[sculptRotateCluster][before] pivot', pivot.id, 'cluster', Array.from(clusterCellIds), 'localCells', Array.from(localCellIds));
  console.log('[sculptRotateCluster][before] cells', collectCellInfo(state.topology.cells, localCellIds));
  console.log('[sculptRotateCluster][before] vertices', collectVertexInfo(state.topology.vertices, localVertexIdsBefore));
  console.log('[sculptRotateCluster][before] edges', collectEdgeInfo(state.topology.edges, localCellIds));

  const newVertices = new Map(state.topology.vertices);

  const edgeKey = (a: string, b: string) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const pairToEdge = new Map<string, any>();
  state.topology.edges.forEach((edge) => {
    const key = edgeKey(edge.startVertex, edge.endVertex);
    pairToEdge.set(key, edge);
  });

  // Outer ring: 6 vertices around pivot
  const outerVertexIds = new Set<string>();
  clusterCellIds.forEach((cellId) => {
    const cell = topology.cells.get(cellId);
    cell?.boundaryVertices.forEach((vId) => {
      if (vId !== pivot.id) outerVertexIds.add(vId);
    });
  });

  if (outerVertexIds.size !== 6) {
    console.log('[sculptRotateCluster] abort: expected 6 outer vertices, got', outerVertexIds.size);
    return state;
  }

  // Order outer vertices by angle, create remap (+3 = 180° rotation)
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

  console.log('[sculptRotateCluster] remap', Object.fromEntries(remap));

  // Find top and bottom of hexagon
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
  const pivotDeltaY = flippedPivotY - pivot.position.y;

  console.log('[sculptRotateCluster] pivot flip', {
    pivotBefore: pivot.position,
    hexTopY,
    hexBottomY,
    hexCenterY,
    flippedPivotY,
    pivotDeltaY,
  });

  // Update pivot vertex position
  newVertices.set(pivot.id, {
    ...pivot,
    position: { x: pivot.position.x, y: flippedPivotY },
  });

  // Rebuild cells: remap boundaryVertices, calculate center as centroid
  const newCells = new Map(state.topology.cells);

  clusterCellIds.forEach((cellId) => {
    const cell = state.topology!.cells.get(cellId);
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

    console.log('[sculptRotateCluster]', cellId, {
      before: cell.center,
      after: center,
    });

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

  const newEdges = new Map<string, any>();
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

  // Detect new hexagons
  const oldHexagonVertices = new Set<string>();
  state.topology.vertices.forEach((v, vid) => {
    if (v.adjacentCells.length === 3) oldHexagonVertices.add(vid);
  });

  const newHexagonVertices: string[] = [];
  newVertices.forEach((v, vid) => {
    if (v.adjacentCells.length === 3 && !oldHexagonVertices.has(vid)) {
      newHexagonVertices.push(vid);
    }
  });

  if (newHexagonVertices.length > 0) {
    console.log(
      '[sculptRotateCluster] new hexagons detected:',
      newHexagonVertices.map((vid) => {
        const v = newVertices.get(vid);
        return { id: vid, position: v?.position, cells: v?.adjacentCells };
      })
    );
  }

  const localVertexIdsAfter = new Set<string>();
  localCellIds.forEach((cellId) => {
    const cell = newCells.get(cellId);
    cell?.boundaryVertices.forEach((vId) => localVertexIdsAfter.add(vId));
  });

  console.log('[sculptRotateCluster][after] pivot', pivot.id, 'cluster', Array.from(clusterCellIds), 'localCells', Array.from(localCellIds));
  console.log('[sculptRotateCluster][after] cells', collectCellInfo(newCells, localCellIds));
  console.log('[sculptRotateCluster][after] vertices', collectVertexInfo(newVertices, localVertexIdsAfter));
  console.log('[sculptRotateCluster][after] edges', collectEdgeInfo(newEdges, localCellIds));

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
  const prevBounds = state.topology.bounds;
  const bounds = {
    minX,
    minY,
    maxX,
    maxY,
    // Preserve original canvas extent to avoid export cropping; only update extents.
    width: prevBounds.width,
    height: prevBounds.height,
  };

  // Save operation to grid config for regeneration on load
  const currentSculptOps = state.grid.sculptOperations || [];
  const newSculptOps = [...currentSculptOps, { type: 'rotate' as const, vertexId }];

  return {
    grid: { ...state.grid, sculptOperations: newSculptOps },
    topology: {
      ...state.topology,
      vertices: newVertices,
      edges: newEdges,
      cells: newCells,
      bounds,
    },
  };
};

/**
 * Sculpt cut: Remove vertex and connect 3 adjacent vertices with a triangle
 * This removes the 3 cells around the vertex and creates a new triangular cell
 */
export const sculptCutCluster = (
  state: PuzzleStore,
  vertexId: string
): Partial<PuzzleStore> | typeof state => {
  if (!state.topology || state.grid.gridType !== 'iso') return state;
  const topology = state.topology;
  const pivot = topology.vertices.get(vertexId);
  if (!pivot || pivot.adjacentCells.length !== 3) return state;

  const clusterCellIds = new Set(pivot.adjacentCells);

  // Validate: all adjacent cells must be quadrilaterals (not triangles from previous cuts)
  const cells = pivot.adjacentCells
    .map((id) => topology.cells.get(id))
    .filter((c): c is NonNullable<typeof c> => !!c);

  // Check for cells created by previous cut operations
  const hasCutCell = cells.some(
    (c) => c.id.startsWith('cell-triangle-') || c.id.startsWith('cell-trapezoid-')
  );
  if (hasCutCell) {
    console.log('[sculptCutCluster] abort: vertex is adjacent to a cut cell');
    return state;
  }

  // Verify all cells are quadrilaterals
  const allQuads = cells.every((c) => c.boundaryVertices.length === 4);
  if (!allQuads) {
    console.log('[sculptCutCluster] abort: not all adjacent cells are quadrilaterals');
    return state;
  }

  // Find outer ring: 6 vertices around pivot (excluding pivot itself)
  const outerVertexIds = new Set<string>();
  clusterCellIds.forEach((cellId) => {
    const cell = topology.cells.get(cellId);
    cell?.boundaryVertices.forEach((vId) => {
      if (vId !== pivot.id) outerVertexIds.add(vId);
    });
  });

  if (outerVertexIds.size !== 6) {
    console.log('[sculptCutCluster] abort: expected 6 outer vertices, got', outerVertexIds.size);
    return state;
  }

  // Order outer vertices by angle around pivot
  const orderedOuter = Array.from(outerVertexIds)
    .map((vid) => {
      const v = topology.vertices.get(vid)!;
      return {
        vid,
        angle: Math.atan2(v.position.y - pivot.position.y, v.position.x - pivot.position.x),
      };
    })
    .sort((a, b) => a.angle - b.angle);

  // Find the 3 vertices that are shared between adjacent cells (the "corner" vertices)
  // These are at indices 0, 2, 4 (every other vertex in the hexagon)
  // We need to identify which set (0,2,4 or 1,3,5) are the corner vertices
  // Corner vertices are those that belong to exactly 2 of the 3 cluster cells
  const vertexCellCount = new Map<string, number>();
  clusterCellIds.forEach((cellId) => {
    const cell = topology.cells.get(cellId);
    cell?.boundaryVertices.forEach((vId) => {
      if (vId !== pivot.id) {
        vertexCellCount.set(vId, (vertexCellCount.get(vId) || 0) + 1);
      }
    });
  });

  // Corner vertices belong to 2 cells, edge midpoint vertices belong to 1 cell
  const cornerVertexIds = orderedOuter
    .filter(({ vid }) => vertexCellCount.get(vid) === 2)
    .map(({ vid }) => vid);

  if (cornerVertexIds.length !== 3) {
    console.log('[sculptCutCluster] abort: expected 3 corner vertices, got', cornerVertexIds.length);
    return state;
  }

  // Get edge-only vertices (belong to only 1 of the 3 cluster cells)
  const edgeOnlyVertexIds = orderedOuter
    .filter(({ vid }) => vertexCellCount.get(vid) === 1)
    .map(({ vid }) => vid);

  console.log('[sculptCutCluster] cutting vertex', vertexId, 'corners:', cornerVertexIds, 'edgeOnly:', edgeOnlyVertexIds);

  // Create new Maps for mutation
  const newVertices = new Map(topology.vertices);
  const newCells = new Map(topology.cells);
  const newEdges = new Map(topology.edges);

  // Remove the pivot vertex
  newVertices.delete(pivot.id);

  // Create a new triangular cell connecting the 3 corner vertices
  const triangleId = `cell-triangle-${vertexId}`;
  const cornerPositions = cornerVertexIds.map((vid) => newVertices.get(vid)!.position);
  const triangleCenter: Point = {
    x: cornerPositions.reduce((sum, p) => sum + p.x, 0) / 3,
    y: cornerPositions.reduce((sum, p) => sum + p.y, 0) / 3,
  };

  newCells.set(triangleId, {
    id: triangleId,
    boundaryVertices: cornerVertexIds,
    boundaryEdges: [],
    center: triangleCenter,
    adjacentCells: [], // Will be updated below
  });

  // Transform each original quadrilateral cell into a triangle (trapezoid remainder)
  // by removing the pivot vertex and keeping the other 3 vertices
  // Original quad: [pivot, corner1, opposite, corner2] -> Triangle: [corner1, opposite, corner2]
  const cornerSet = new Set(cornerVertexIds);
  clusterCellIds.forEach((cellId) => {
    const cell = topology.cells.get(cellId);
    if (!cell) return;

    // Build new boundary: remove pivot vertex, keep the other 3 vertices
    const newBoundary = cell.boundaryVertices.filter((vid) => vid !== pivot.id);

    if (newBoundary.length !== 3) {
      console.log('[sculptCutCluster] unexpected: remaining boundary has', newBoundary.length, 'vertices');
      return;
    }

    // Calculate new center (centroid of triangle)
    const positions = newBoundary
      .map((vid) => newVertices.get(vid)?.position)
      .filter((p): p is Point => !!p);
    const newCenter: Point = {
      x: positions.reduce((sum, p) => sum + p.x, 0) / positions.length,
      y: positions.reduce((sum, p) => sum + p.y, 0) / positions.length,
    };

    // Update the cell with new triangle boundary
    const trapezoidId = `cell-trapezoid-${cellId.replace('cell-', '')}`;
    newCells.delete(cellId);
    newCells.set(trapezoidId, {
      id: trapezoidId,
      boundaryVertices: newBoundary,
      boundaryEdges: [],
      center: newCenter,
      adjacentCells: [], // Will be updated below
    });
  });

  // Rebuild edges from cells
  const edgeKey = (a: string, b: string) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const edgeAccumulator = new Map<string, { startVertex: string; endVertex: string; cells: string[] }>();

  newCells.forEach((cell, cellId) => {
    const verts = cell.boundaryVertices;
    for (let i = 0; i < verts.length; i++) {
      const start = verts[i];
      const end = verts[(i + 1) % verts.length];
      const key = edgeKey(start, end);
      const acc = edgeAccumulator.get(key) ?? { startVertex: start, endVertex: end, cells: [] };
      if (!acc.cells.includes(cellId)) acc.cells.push(cellId);
      edgeAccumulator.set(key, acc);
    }
  });

  newEdges.clear();
  edgeAccumulator.forEach((acc, key) => {
    const v1 = newVertices.get(acc.startVertex);
    const v2 = newVertices.get(acc.endVertex);
    if (!v1 || !v2) return;
    newEdges.set(key, {
      id: key,
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

  // Update adjacentCells for all cells
  newCells.forEach((cell, cellId) => {
    const adjCells = new Set<string>();
    const verts = cell.boundaryVertices;
    for (let i = 0; i < verts.length; i++) {
      const start = verts[i];
      const end = verts[(i + 1) % verts.length];
      const key = edgeKey(start, end);
      const edge = newEdges.get(key);
      if (edge) {
        edge.adjacentCells.forEach((cId) => {
          if (cId !== cellId) adjCells.add(cId);
        });
      }
    }
    newCells.set(cellId, { ...cell, adjacentCells: Array.from(adjCells) });
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
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  newVertices.forEach((v) => {
    minX = Math.min(minX, v.position.x);
    minY = Math.min(minY, v.position.y);
    maxX = Math.max(maxX, v.position.x);
    maxY = Math.max(maxY, v.position.y);
  });
  const prevBounds = topology.bounds;
  const bounds = {
    minX,
    minY,
    maxX,
    maxY,
    width: prevBounds.width,
    height: prevBounds.height,
  };

  // Save operation to grid config for regeneration on load
  const currentSculptOps = state.grid.sculptOperations || [];
  const newSculptOps = [...currentSculptOps, { type: 'cut' as const, vertexId }];

  return {
    grid: { ...state.grid, sculptOperations: newSculptOps },
    topology: {
      ...topology,
      vertices: newVertices,
      edges: newEdges,
      cells: newCells,
      bounds,
    },
  };
};
