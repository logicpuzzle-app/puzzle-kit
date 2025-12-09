/**
 * Topology Query Functions
 *
 * Functions for querying and navigating the topology.
 */

import type { Point } from '../../types';
import type {
  GridTopology,
  TopologyCell,
  TopologyVertex,
  TopologyEdge,
  Index,
} from './types';
import { isPointInPolygon } from './helpers';

/**
 * Get all cells adjacent to a given cell.
 *
 * @param topology The topology
 * @param cellId Cell ID
 * @returns Array of adjacent cells
 */
export function getAdjacentCells(topology: GridTopology, cellId: string): TopologyCell[] {
  const cell = topology.cells.get(cellId);
  if (!cell) return [];

  return cell.adjacentCells
    .map(id => topology.cells.get(id))
    .filter((c): c is TopologyCell => c !== undefined);
}

/**
 * Get all vertices of a cell.
 *
 * @param topology The topology
 * @param cellId Cell ID
 * @returns Array of vertices
 */
export function getCellVertices(topology: GridTopology, cellId: string): TopologyVertex[] {
  const cell = topology.cells.get(cellId);
  if (!cell) return [];

  return cell.boundaryVertices
    .map(id => topology.vertices.get(id))
    .filter((v): v is TopologyVertex => v !== undefined);
}

/**
 * Get all edges of a cell.
 *
 * @param topology The topology
 * @param cellId Cell ID
 * @returns Array of edges
 */
export function getCellEdges(topology: GridTopology, cellId: string): TopologyEdge[] {
  const cell = topology.cells.get(cellId);
  if (!cell) return [];

  return cell.boundaryEdges
    .map(id => topology.edges.get(id))
    .filter((e): e is TopologyEdge => e !== undefined);
}

/**
 * Get the edge between two adjacent cells (if exists).
 *
 * @param topology The topology
 * @param cellId1 First cell ID
 * @param cellId2 Second cell ID
 * @returns Shared edge or null
 */
export function getSharedEdge(
  topology: GridTopology,
  cellId1: string,
  cellId2: string
): TopologyEdge | null {
  const cell1 = topology.cells.get(cellId1);
  const cell2 = topology.cells.get(cellId2);
  if (!cell1 || !cell2) return null;

  const edges1 = new Set(cell1.boundaryEdges);
  for (const edgeId of cell2.boundaryEdges) {
    if (edges1.has(edgeId)) {
      return topology.edges.get(edgeId) || null;
    }
  }

  return null;
}

/**
 * Get all boundary edges (edges with only one adjacent cell).
 *
 * @param topology The topology
 * @returns Array of boundary edges
 */
export function getBoundaryEdges(topology: GridTopology): TopologyEdge[] {
  return Array.from(topology.edges.values()).filter(e => e.isBoundary);
}

/**
 * Get all boundary vertices.
 *
 * @param topology The topology
 * @returns Array of boundary vertices
 */
export function getBoundaryVertices(topology: GridTopology): TopologyVertex[] {
  const boundaryEdges = getBoundaryEdges(topology);
  const vertexIds = new Set<string>();

  for (const edge of boundaryEdges) {
    vertexIds.add(edge.startVertex);
    vertexIds.add(edge.endVertex);
  }

  return Array.from(vertexIds)
    .map(id => topology.vertices.get(id))
    .filter((v): v is TopologyVertex => v !== undefined);
}

/**
 * Find the cell containing a point, or the nearest cell if point is outside all cells.
 *
 * @param topology The topology
 * @param point Point to find
 * @param maxDistance Maximum distance to consider (optional)
 * @returns Cell or null
 */
export function findNearestCellInTopology(
  topology: GridTopology,
  point: Point,
  maxDistance?: number
): TopologyCell | null {
  // First, check if point is inside any cell polygon
  for (const cell of topology.cells.values()) {
    // Get vertex positions for this cell
    const vertices: Point[] = [];
    for (const vId of cell.boundaryVertices) {
      const vertex = topology.vertices.get(vId);
      if (vertex) {
        vertices.push(vertex.position);
      }
    }

    if (isPointInPolygon(point, vertices)) {
      return cell;
    }
  }

  // If not inside any cell, find the nearest by center distance
  let nearest: TopologyCell | null = null;
  let minDist = maxDistance ?? Infinity;

  for (const cell of topology.cells.values()) {
    const dx = point.x - cell.center.x;
    const dy = point.y - cell.center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < minDist) {
      minDist = dist;
      nearest = cell;
    }
  }

  return nearest;
}

/**
 * Find the nearest vertex to a point.
 *
 * @param topology The topology
 * @param point Point to find
 * @param maxDistance Maximum distance to consider (optional)
 * @returns Vertex or null
 */
export function findNearestVertexInTopology(
  topology: GridTopology,
  point: Point,
  maxDistance?: number
): TopologyVertex | null {
  let nearest: TopologyVertex | null = null;
  let minDist = maxDistance ?? Infinity;

  for (const vertex of topology.vertices.values()) {
    const dx = point.x - vertex.position.x;
    const dy = point.y - vertex.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < minDist) {
      minDist = dist;
      nearest = vertex;
    }
  }

  return nearest;
}

/**
 * Find the nearest edge to a point.
 *
 * @param topology The topology
 * @param point Point to find
 * @param maxDistance Maximum distance to consider (optional)
 * @returns Edge or null
 */
export function findNearestEdgeInTopology(
  topology: GridTopology,
  point: Point,
  maxDistance?: number
): TopologyEdge | null {
  let nearest: TopologyEdge | null = null;
  let minDist = maxDistance ?? Infinity;

  for (const edge of topology.edges.values()) {
    const dx = point.x - edge.midpoint.x;
    const dy = point.y - edge.midpoint.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < minDist) {
      minDist = dist;
      nearest = edge;
    }
  }

  return nearest;
}

/**
 * Check if two cells share an edge (orthogonal adjacency).
 *
 * @param topology The topology
 * @param cellId1 First cell ID
 * @param cellId2 Second cell ID
 * @returns true if adjacent
 */
export function areCellsAdjacent(
  topology: GridTopology,
  cellId1: string,
  cellId2: string
): boolean {
  const cell = topology.cells.get(cellId1);
  return cell?.adjacentCells.includes(cellId2) ?? false;
}

/**
 * Get all edge-adjacent (orthogonal) cells for a given cell.
 */
export function getOrthogonallyAdjacentCells(
  topology: GridTopology,
  cellId: string
): TopologyCell[] {
  return getAdjacentCells(topology, cellId);
}

/**
 * Get all vertex-adjacent (diagonal) cells for a given cell.
 * Cells that share a vertex but do NOT share an edge are included.
 */
export function getDiagonallyAdjacentCells(
  topology: GridTopology,
  cellId: string
): TopologyCell[] {
  const cell = topology.cells.get(cellId);
  if (!cell) return [];

  const result = new Set<string>();
  for (const vId of cell.boundaryVertices) {
    const vertex = topology.vertices.get(vId);
    if (!vertex) continue;
    for (const neighborCellId of vertex.adjacentCells) {
      if (neighborCellId === cellId) continue;
      // Skip edge-adjacent; only keep pure vertex-sharing neighbors
      if (cell.adjacentCells.includes(neighborCellId)) continue;
      result.add(neighborCellId);
    }
  }

  return Array.from(result)
    .map(id => topology.cells.get(id))
    .filter((c): c is TopologyCell => c !== undefined);
}

/**
 * Check if two cells are vertex-adjacent (diagonal) but not edge-adjacent.
 */
export function areCellsDiagonallyAdjacent(
  topology: GridTopology,
  cellId1: string,
  cellId2: string
): boolean {
  if (areCellsAdjacent(topology, cellId1, cellId2)) return false;
  const cell = topology.cells.get(cellId1);
  if (!cell) return false;
  for (const vId of cell.boundaryVertices) {
    const vertex = topology.vertices.get(vId);
    if (!vertex) continue;
    if (vertex.adjacentCells.includes(cellId2)) {
      return true;
    }
  }
  return false;
}

/**
 * Get all cells in a connected region starting from a cell (flood fill using adjacency).
 *
 * @param topology The topology
 * @param startCellId Starting cell ID
 * @param predicate Optional predicate to filter cells
 * @returns Set of cell IDs in the region
 */
export function getConnectedRegion(
  topology: GridTopology,
  startCellId: string,
  predicate?: (cell: TopologyCell) => boolean
): Set<string> {
  const visited = new Set<string>();
  const queue = [startCellId];

  while (queue.length > 0) {
    const cellId = queue.shift()!;
    if (visited.has(cellId)) continue;

    const cell = topology.cells.get(cellId);
    if (!cell) continue;

    if (predicate && !predicate(cell)) continue;

    visited.add(cellId);

    for (const adjacentId of cell.adjacentCells) {
      if (!visited.has(adjacentId)) {
        queue.push(adjacentId);
      }
    }
  }

  return visited;
}

/**
 * Convert topology cell IDs to standard cell IDs.
 *
 * @param cellId Cell ID
 * @returns Standard cell ID
 */
export function topologyCellIdToStandard(cellId: string): string {
  // Already in standard format
  return cellId;
}

/**
 * Get cell center position from topology.
 *
 * @param topology The topology
 * @param cellId Cell ID
 * @returns Center point or null
 */
export function getCellCenterFromTopology(
  topology: GridTopology,
  cellId: string
): Point | null {
  const cell = topology.cells.get(cellId);
  return cell?.center ?? null;
}

/**
 * Get vertex position from topology.
 *
 * @param topology The topology
 * @param vertexId Vertex ID
 * @returns Position or null
 */
export function getVertexPositionFromTopology(
  topology: GridTopology,
  vertexId: string
): Point | null {
  const vertex = topology.vertices.get(vertexId);
  return vertex?.position ?? null;
}

/**
 * Get edge midpoint from topology.
 *
 * @param topology The topology
 * @param edgeId Edge ID
 * @returns Midpoint or null
 */
export function getEdgeMidpointFromTopology(
  topology: GridTopology,
  edgeId: string
): Point | null {
  const edge = topology.edges.get(edgeId);
  return edge?.midpoint ?? null;
}

/**
 * Get all cells that share a specific vertex.
 *
 * @param topology The topology
 * @param vertexId Vertex ID
 * @returns Array of cells
 */
export function getCellsAtVertex(
  topology: GridTopology,
  vertexId: string
): TopologyCell[] {
  const vertex = topology.vertices.get(vertexId);
  if (!vertex) return [];

  return vertex.adjacentCells
    .map(id => topology.cells.get(id))
    .filter((c): c is TopologyCell => c !== undefined);
}

/**
 * Get all edges connected to a vertex.
 *
 * @param topology The topology
 * @param vertexId Vertex ID
 * @returns Array of edges
 */
export function getEdgesAtVertex(
  topology: GridTopology,
  vertexId: string
): TopologyEdge[] {
  const vertex = topology.vertices.get(vertexId);
  if (!vertex) return [];

  return vertex.adjacentEdges
    .map(id => topology.edges.get(id))
    .filter((e): e is TopologyEdge => e !== undefined);
}

/**
 * Get the cell polygon as an array of points.
 *
 * @param topology The topology
 * @param cellId Cell ID
 * @returns Array of vertex positions
 */
export function getCellPolygon(
  topology: GridTopology,
  cellId: string
): Point[] {
  const cell = topology.cells.get(cellId);
  if (!cell) return [];

  return cell.boundaryVertices
    .map(vId => topology.vertices.get(vId)?.position)
    .filter((p): p is Point => p !== undefined);
}

// ========================================
// Index Query Functions
// ========================================

/**
 * Get the index [row, col] of a cell.
 * Returns the cell's index if set, otherwise null.
 * Use this instead of parsing cellId for stable coordinate access.
 *
 * @param topology The topology
 * @param cellId Cell ID
 * @returns Index [row, col] or null if not available
 */
export function getCellIndex(
  topology: GridTopology,
  cellId: string
): Index {
  const cell = topology.cells.get(cellId);
  if (!cell) return null;
  return cell.index ?? null;
}

/**
 * Get the index [row, col] of a vertex.
 * Returns the vertex's index if set, otherwise null.
 * Use this instead of parsing vertexId for stable coordinate access.
 *
 * @param topology The topology
 * @param vertexId Vertex ID
 * @returns Index [row, col] or null if not available
 */
export function getVertexIndex(
  topology: GridTopology,
  vertexId: string
): Index {
  const vertex = topology.vertices.get(vertexId);
  if (!vertex) return null;
  return vertex.index ?? null;
}

/**
 * Get the index [row, col] of an edge.
 * Returns the edge's index if set, otherwise null.
 * Use this instead of parsing edgeId for stable coordinate access.
 *
 * @param topology The topology
 * @param edgeId Edge ID
 * @returns Index [row, col] or null if not available
 */
export function getEdgeIndex(
  topology: GridTopology,
  edgeId: string
): Index {
  const edge = topology.edges.get(edgeId);
  if (!edge) return null;
  return edge.index ?? null;
}

/**
 * Check if an index is valid (non-null with both row and col set).
 *
 * @param index Index to check
 * @returns true if index is valid
 */
export function isValidIndex(index: Index): index is [number, number] {
  return index !== null && index[0] !== null && index[1] !== null;
}

/**
 * Find a cell by its index [row, col].
 * Returns the first cell with matching index, or null if not found.
 *
 * @param topology The topology
 * @param row Row
 * @param col Column
 * @returns Cell or null
 */
export function findCellByIndex(
  topology: GridTopology,
  row: number,
  col: number
): TopologyCell | null {
  for (const cell of topology.cells.values()) {
    const idx = cell.index;
    if (idx && idx[0] === row && idx[1] === col) {
      return cell;
    }
  }
  return null;
}

/**
 * Find a vertex by its index [row, col].
 * Returns the first vertex with matching index, or null if not found.
 *
 * @param topology The topology
 * @param row Row
 * @param col Column
 * @returns Vertex or null
 */
export function findVertexByIndex(
  topology: GridTopology,
  row: number,
  col: number
): TopologyVertex | null {
  for (const vertex of topology.vertices.values()) {
    const idx = vertex.index;
    if (idx && idx[0] === row && idx[1] === col) {
      return vertex;
    }
  }
  return null;
}

// ========================================
// Edge-Based Line Drawing Functions
// ========================================

/**
 * Line drawing info for edge-based representation.
 * Contains all coordinates needed to draw a line.
 */
export interface EdgeLineDrawInfo {
  /** Edge ID */
  edgeId: string;
  /** Start vertex position */
  startVertex: Point;
  /** End vertex position */
  endVertex: Point;
  /** Edge midpoint */
  midpoint: Point;
  /** Adjacent cell centers (1 for boundary edge, 2 for internal edge) */
  adjacentCellCenters: Point[];
}

/**
 * Get line drawing info from an edge ID.
 * Returns all positions needed to draw either vertex-to-vertex (edge) lines
 * or cell-to-cell (cell) lines.
 *
 * @param topology The topology
 * @param edgeId Edge ID
 * @returns EdgeLineDrawInfo or null if edge not found
 */
export function getEdgeLineDrawInfo(
  topology: GridTopology,
  edgeId: string
): EdgeLineDrawInfo | null {
  const edge = topology.edges.get(edgeId);
  if (!edge) return null;

  const startVertex = topology.vertices.get(edge.startVertex);
  const endVertex = topology.vertices.get(edge.endVertex);
  if (!startVertex || !endVertex) return null;

  const adjacentCellCenters: Point[] = [];
  for (const cellId of edge.adjacentCells) {
    const cell = topology.cells.get(cellId);
    if (cell) {
      adjacentCellCenters.push(cell.center);
    }
  }

  return {
    edgeId,
    startVertex: startVertex.position,
    endVertex: endVertex.position,
    midpoint: edge.midpoint,
    adjacentCellCenters,
  };
}

/**
 * Get the edge ID between two adjacent vertices.
 *
 * @param topology The topology
 * @param vertexId1 First vertex ID
 * @param vertexId2 Second vertex ID
 * @returns Edge ID or null if not adjacent
 */
export function getEdgeBetweenVertices(
  topology: GridTopology,
  vertexId1: string,
  vertexId2: string
): string | null {
  const vertex1 = topology.vertices.get(vertexId1);
  if (!vertex1) return null;

  for (const edgeId of vertex1.adjacentEdges) {
    const edge = topology.edges.get(edgeId);
    if (!edge) continue;
    if (
      (edge.startVertex === vertexId1 && edge.endVertex === vertexId2) ||
      (edge.startVertex === vertexId2 && edge.endVertex === vertexId1)
    ) {
      return edgeId;
    }
  }
  return null;
}

/**
 * Get the edge ID between two adjacent cells.
 * This is an alias for getSharedEdge that returns just the edge ID.
 *
 * @param topology The topology
 * @param cellId1 First cell ID
 * @param cellId2 Second cell ID
 * @returns Edge ID or null if not adjacent
 */
export function getEdgeBetweenCells(
  topology: GridTopology,
  cellId1: string,
  cellId2: string
): string | null {
  const edge = getSharedEdge(topology, cellId1, cellId2);
  return edge?.id ?? null;
}

/**
 * Convert from/to vertex IDs to an edge ID.
 * For backward compatibility with existing LineElement format.
 *
 * @param topology The topology
 * @param from From vertex ID
 * @param to To vertex ID
 * @returns Edge ID or null
 */
export function vertexPairToEdgeId(
  topology: GridTopology,
  from: string,
  to: string
): string | null {
  return getEdgeBetweenVertices(topology, from, to);
}

/**
 * Convert from/to cell IDs to an edge ID.
 * For backward compatibility with existing LineElement format.
 *
 * @param topology The topology
 * @param from From cell ID
 * @param to To cell ID
 * @returns Edge ID or null
 */
export function cellPairToEdgeId(
  topology: GridTopology,
  from: string,
  to: string
): string | null {
  return getEdgeBetweenCells(topology, from, to);
}
