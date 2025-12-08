/**
 * GridTopologyBuilder
 *
 * Builder class for creating GridTopology instances.
 */

import type { GridConfig, Point } from '../../types';
import type {
  TopologyCell,
  TopologyVertex,
  TopologyEdge,
  GridTopology,
  CellDefinition,
} from './types';
import { calculateCentroid } from './helpers';

/**
 * GridTopologyBuilder - Builder class for creating GridTopology
 */
export class GridTopologyBuilder {
  private cells: Map<string, TopologyCell> = new Map();
  private vertices: Map<string, TopologyVertex> = new Map();
  private edges: Map<string, TopologyEdge> = new Map();
  private sourceConfig?: GridConfig;

  /**
   * Add a cell to the topology
   */
  addCell(cell: TopologyCell): this {
    this.cells.set(cell.id, cell);
    return this;
  }

  /**
   * Add a vertex to the topology
   */
  addVertex(vertex: TopologyVertex): this {
    this.vertices.set(vertex.id, vertex);
    return this;
  }

  /**
   * Add an edge to the topology
   */
  addEdge(edge: TopologyEdge): this {
    this.edges.set(edge.id, edge);
    return this;
  }

  /**
   * Set the source config
   */
  setSourceConfig(config: GridConfig): this {
    this.sourceConfig = config;
    return this;
  }

  /**
   * Get the internal vertices map (for updating adjacency)
   */
  getVertices(): Map<string, TopologyVertex> {
    return this.vertices;
  }

  /**
   * Build the topology
   */
  build(): GridTopology {
    // Calculate bounds
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const vertex of this.vertices.values()) {
      minX = Math.min(minX, vertex.position.x);
      minY = Math.min(minY, vertex.position.y);
      maxX = Math.max(maxX, vertex.position.x);
      maxY = Math.max(maxY, vertex.position.y);
    }

    // Calculate total width/height including padding on both sides
    // Content starts at outerPadding and ends at maxX/maxY
    // Total size = maxX + outerPadding (for right padding)
    const outerPadding = this.sourceConfig?.outerPadding ?? 0;
    const totalWidth = maxX + outerPadding;
    const totalHeight = maxY + outerPadding;

    return {
      cells: this.cells,
      vertices: this.vertices,
      edges: this.edges,
      bounds: {
        minX,
        minY,
        maxX,
        maxY,
        width: totalWidth,
        height: totalHeight,
      },
      sourceConfig: this.sourceConfig,
    };
  }
}

/**
 * Unified topology builder from cell definitions.
 * Handles vertex deduplication, edge creation, and adjacency calculation automatically.
 *
 * @param cellDefs Array of cell definitions with vertices
 * @param sourceConfig Optional source GridConfig
 * @returns Complete GridTopology
 */
export function buildTopologyFromCells(
  cellDefs: CellDefinition[],
  sourceConfig?: GridConfig
): GridTopology {
  const builder = new GridTopologyBuilder();
  if (sourceConfig) builder.setSourceConfig(sourceConfig);

  // Vertex deduplication using position-based key
  const vertexMap = new Map<string, string>(); // posKey -> vertexId
  const vertexPositions = new Map<string, Point>(); // vertexId -> position
  let vertexCounter = 0;

  const getOrCreateVertex = (x: number, y: number): string => {
    // Round to 3 decimal places to handle floating point
    const key = `${Math.round(x * 1000)},${Math.round(y * 1000)}`;
    if (!vertexMap.has(key)) {
      const id = `vertex-${vertexCounter++}`;
      vertexMap.set(key, id);
      vertexPositions.set(id, { x, y });
    }
    return vertexMap.get(key)!;
  };

  // Edge deduplication
  const edgeMap = new Map<string, string>(); // "v1,v2" -> edgeId
  let edgeCounter = 0;

  const getOrCreateEdge = (v1: string, v2: string): string => {
    const key = v1 < v2 ? `${v1},${v2}` : `${v2},${v1}`;
    if (!edgeMap.has(key)) {
      edgeMap.set(key, `edge-${edgeCounter++}`);
    }
    return edgeMap.get(key)!;
  };

  // First pass: collect all vertices and create cell vertex mappings
  const cellVertexIds = new Map<string, string[]>();

  for (const cellDef of cellDefs) {
    const vIds = cellDef.vertices.map(v => getOrCreateVertex(v.x, v.y));
    cellVertexIds.set(cellDef.id, vIds);
  }

  // Create TopologyVertex objects
  // For regular grids with sourceConfig, calculate vertex row/col from position
  for (const [id, pos] of vertexPositions) {
    let index: [number, number] | null = null;

    if (sourceConfig && sourceConfig.cellSize > 0) {
      // Calculate vertex row/col from position
      // Vertex at top-left of cell (row, col) has position:
      //   x = outerPadding + col * cellSize
      //   y = outerPadding + row * cellSize
      const { cellSize, outerPadding } = sourceConfig;
      const col = Math.round((pos.x - outerPadding) / cellSize);
      const row = Math.round((pos.y - outerPadding) / cellSize);
      index = [row, col];
    }

    builder.addVertex({
      id,
      position: pos,
      adjacentCells: [],
      adjacentEdges: [],
      adjacentVertices: [],
      index,
      row: index?.[0],
      col: index?.[1],
    });
  }

  // Build edge-to-cells mapping for adjacency calculation
  const edgeToCells = new Map<string, string[]>();

  for (const cellDef of cellDefs) {
    const vIds = cellVertexIds.get(cellDef.id)!;
    for (let i = 0; i < vIds.length; i++) {
      const v1 = vIds[i];
      const v2 = vIds[(i + 1) % vIds.length];
      const edgeId = getOrCreateEdge(v1, v2);

      if (!edgeToCells.has(edgeId)) {
        edgeToCells.set(edgeId, []);
      }
      edgeToCells.get(edgeId)!.push(cellDef.id);
    }
  }

  // Build a set of outboard cell IDs for quick lookup
  const outboardCellIds = new Set<string>();
  for (const cellDef of cellDefs) {
    if (cellDef.outboard) {
      outboardCellIds.add(cellDef.id);
    }
  }

  // Create cells with proper adjacency
  for (const cellDef of cellDefs) {
    const vIds = cellVertexIds.get(cellDef.id)!;
    const vertices = vIds.map((id) => vertexPositions.get(id)!);
    const center = cellDef.center ?? calculateCentroid(vertices);
    const originalCells = cellDef.originalCells ?? [cellDef.id];

    // Find adjacent cells (cells sharing an edge)
    // Exclude outboard cells from adjacency lists
    const adjacentCells = new Set<string>();
    const boundaryEdges: string[] = [];

    for (let i = 0; i < vIds.length; i++) {
      const v1 = vIds[i];
      const v2 = vIds[(i + 1) % vIds.length];
      const edgeId = getOrCreateEdge(v1, v2);
      boundaryEdges.push(edgeId);

      const cellsOnEdge = edgeToCells.get(edgeId) || [];
      for (const otherId of cellsOnEdge) {
        if (otherId !== cellDef.id) {
          // Exclude outboard cells from adjacency
          // Normal cells don't see outboard cells as adjacent
          // Outboard cells don't see any cells as adjacent
          if (!outboardCellIds.has(otherId) && !cellDef.outboard) {
            adjacentCells.add(otherId);
          }
        }
      }
    }

    builder.addCell({
      id: cellDef.id,
      center,
      boundaryVertices: vIds,
      adjacentCells: Array.from(adjacentCells),
      boundaryEdges,
      // Include index from cellDef, or derive from row/col if available
      index: cellDef.index ?? (cellDef.row !== undefined && cellDef.col !== undefined ? [cellDef.row, cellDef.col] : null),
      row: cellDef.row,
      col: cellDef.col,
      originalCells,
      outboard: cellDef.outboard,
    });

    // Update vertex -> cell adjacency
    const builderVertices = builder.getVertices();
    for (const vId of vIds) {
      const v = builderVertices.get(vId);
      if (v && !v.adjacentCells.includes(cellDef.id)) {
        v.adjacentCells.push(cellDef.id);
      }
    }
  }

  // Create edges
  const builderVertices = builder.getVertices();
  for (const [key, edgeId] of edgeMap) {
    const [v1, v2] = key.split(',');
    const pos1 = vertexPositions.get(v1)!;
    const pos2 = vertexPositions.get(v2)!;
    const adjacentCells = edgeToCells.get(edgeId) || [];

    builder.addEdge({
      id: edgeId,
      midpoint: { x: (pos1.x + pos2.x) / 2, y: (pos1.y + pos2.y) / 2 },
      startVertex: v1,
      endVertex: v2,
      adjacentCells,
      isBoundary: adjacentCells.length === 1,
    });

    // Update vertex adjacency
    const vertex1 = builderVertices.get(v1);
    const vertex2 = builderVertices.get(v2);
    if (vertex1) {
      if (!vertex1.adjacentEdges.includes(edgeId)) vertex1.adjacentEdges.push(edgeId);
      if (!vertex1.adjacentVertices.includes(v2)) vertex1.adjacentVertices.push(v2);
    }
    if (vertex2) {
      if (!vertex2.adjacentEdges.includes(edgeId)) vertex2.adjacentEdges.push(edgeId);
      if (!vertex2.adjacentVertices.includes(v1)) vertex2.adjacentVertices.push(v1);
    }
  }

  return builder.build();
}
