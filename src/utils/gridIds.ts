/**
 * Grid ID Utilities
 *
 * Provides ID generation, parsing, and conversion utilities for bridging
 * Grid mode (pzpr/puzz.link format) and Topology mode.
 *
 * Grid mode IDs:
 *   - cell-{row}-{col}
 *   - vertex-{row}-{col}
 *   - edge-h-{row}-{col} (horizontal edge above row at col)
 *   - edge-v-{row}-{col} (vertical edge to left of row at col)
 *
 * Topology mode IDs:
 *   - cell-{row}-{col} (same as grid mode)
 *   - vertex-{n} (auto-generated counter)
 *   - edge-{n} (auto-generated counter)
 */

import type { GridConfig, Point } from '../types';
import type { GridTopology, TopologyVertex, TopologyEdge } from './topology/types';
import { getCellIndexById, getEdgeIndexById, getVertexIndexById } from './gridUtils';

// =============================================================================
// ID Generation (Grid Mode)
// =============================================================================

/**
 * Generate cell ID in grid format
 */
export function makeCellId(row: number, col: number): string {
  return `cell-${row}-${col}`;
}

/**
 * Generate vertex ID in grid format
 */
export function makeVertexId(row: number, col: number): string {
  return `vertex-${row}-${col}`;
}

/**
 * Generate horizontal edge ID in grid format
 * Horizontal edge at (row, col) is the edge between cells (row-1, col) and (row, col)
 */
export function makeEdgeHId(row: number, col: number): string {
  return `edge-h-${row}-${col}`;
}

/**
 * Generate vertical edge ID in grid format
 * Vertical edge at (row, col) is the edge between cells (row, col-1) and (row, col)
 */
export function makeEdgeVId(row: number, col: number): string {
  return `edge-v-${row}-${col}`;
}

// =============================================================================
// ID Parsing (Grid Mode)
// =============================================================================

export interface CellCoord {
  row: number;
  col: number;
}

export interface EdgeCoord {
  type: 'h' | 'v';
  row: number;
  col: number;
}

/**
 * Parse cell ID to row/col coordinates
 * @returns null if invalid format
 */
export function parseGridCellId(id: string): CellCoord | null {
  const match = id.match(/^cell-(-?\d+)-(-?\d+)$/);
  if (match) {
    return { row: parseInt(match[1]), col: parseInt(match[2]) };
  }
  return null;
}

/**
 * Parse vertex ID to row/col coordinates
 * @returns null if invalid format
 */
export function parseGridVertexId(id: string): CellCoord | null {
  const match = id.match(/^vertex-(-?\d+)-(-?\d+)$/);
  if (match) {
    return { row: parseInt(match[1]), col: parseInt(match[2]) };
  }
  return null;
}

/**
 * Parse edge ID to type and row/col coordinates
 * @returns null if invalid format
 */
export function parseEdgeId(id: string): EdgeCoord | null {
  const matchH = id.match(/^edge-h-(-?\d+)-(-?\d+)$/);
  if (matchH) {
    return { type: 'h', row: parseInt(matchH[1]), col: parseInt(matchH[2]) };
  }
  const matchV = id.match(/^edge-v-(-?\d+)-(-?\d+)$/);
  if (matchV) {
    return { type: 'v', row: parseInt(matchV[1]), col: parseInt(matchV[2]) };
  }
  return null;
}

/**
 * Check if an ID is in grid mode format (has row-col)
 */
export function isGridModeId(id: string): boolean {
  return /^(cell|vertex)-\d+-\d+$/.test(id) || /^edge-[hv]-\d+-\d+$/.test(id);
}

/**
 * Check if an ID is in topology mode format (auto-generated counter)
 */
export function isTopologyModeId(id: string): boolean {
  return /^(vertex|edge)-\d+$/.test(id) && !id.includes('-', id.indexOf('-') + 1);
}

// =============================================================================
// Position Calculation (Grid Mode)
// =============================================================================

/**
 * Calculate cell center position from grid coordinates
 */
export function getCellCenterFromGrid(row: number, col: number, grid: GridConfig): Point {
  const { cellSize, outerPadding, marginTop = 0, marginLeft = 0 } = grid;
  const actualCol = col + marginLeft;
  const actualRow = row + marginTop;
  return {
    x: outerPadding + actualCol * cellSize + cellSize / 2,
    y: outerPadding + actualRow * cellSize + cellSize / 2,
  };
}

/**
 * Calculate vertex position from grid coordinates
 */
export function getVertexPositionFromGrid(row: number, col: number, grid: GridConfig): Point {
  const { cellSize, outerPadding } = grid;
  return {
    x: outerPadding + col * cellSize,
    y: outerPadding + row * cellSize,
  };
}

/**
 * Calculate edge midpoint position from grid coordinates
 */
export function getEdgePositionFromGrid(
  type: 'h' | 'v',
  row: number,
  col: number,
  grid: GridConfig
): Point {
  const { cellSize, outerPadding } = grid;

  if (type === 'h') {
    // Horizontal edge - spans horizontally, centered vertically at row
    return {
      x: outerPadding + col * cellSize + cellSize / 2,
      y: outerPadding + row * cellSize,
    };
  } else {
    // Vertical edge - spans vertically, centered horizontally at col
    return {
      x: outerPadding + col * cellSize,
      y: outerPadding + row * cellSize + cellSize / 2,
    };
  }
}

// =============================================================================
// Topology Lookup Maps
// =============================================================================

/**
 * Build a lookup map from grid-mode vertex ID to topology vertex
 * Used for converting pzpr data to topology-compatible data
 */
export function buildVertexGridToTopologyMap(
  topology: GridTopology,
  grid: GridConfig
): Map<string, TopologyVertex> {
  const map = new Map<string, TopologyVertex>();
  const tolerance = 0.5; // Position matching tolerance

  // For each topology vertex, find its grid-mode equivalent
  for (const vertex of topology.vertices.values()) {
    // Calculate expected grid row/col from position
    const { cellSize, outerPadding } = grid;
    const col = Math.round((vertex.position.x - outerPadding) / cellSize);
    const row = Math.round((vertex.position.y - outerPadding) / cellSize);

    // Verify position matches
    const expectedX = outerPadding + col * cellSize;
    const expectedY = outerPadding + row * cellSize;

    if (
      Math.abs(vertex.position.x - expectedX) < tolerance &&
      Math.abs(vertex.position.y - expectedY) < tolerance
    ) {
      const gridId = makeVertexId(row, col);
      map.set(gridId, vertex);
    }
  }

  return map;
}

/**
 * Build a lookup map from grid-mode edge ID to topology edge
 */
export function buildEdgeGridToTopologyMap(
  topology: GridTopology,
  grid: GridConfig
): Map<string, TopologyEdge> {
  const map = new Map<string, TopologyEdge>();
  const tolerance = 0.5;

  const { cellSize, outerPadding } = grid;

  for (const edge of topology.edges.values()) {
    // Determine if this is a horizontal or vertical edge
    const startVertex = topology.vertices.get(edge.startVertex);
    const endVertex = topology.vertices.get(edge.endVertex);
    if (!startVertex || !endVertex) continue;

    const dx = Math.abs(endVertex.position.x - startVertex.position.x);
    const dy = Math.abs(endVertex.position.y - startVertex.position.y);

    // Horizontal edge: dx > dy
    // Vertical edge: dy > dx
    const isHorizontal = dx > dy;

    if (isHorizontal) {
      // Horizontal edge - y position determines row, x position is center of edge
      const row = Math.round((edge.midpoint.y - outerPadding) / cellSize);
      const col = Math.round((edge.midpoint.x - outerPadding - cellSize / 2) / cellSize);

      const expectedY = outerPadding + row * cellSize;
      const expectedX = outerPadding + col * cellSize + cellSize / 2;

      if (
        Math.abs(edge.midpoint.y - expectedY) < tolerance &&
        Math.abs(edge.midpoint.x - expectedX) < tolerance
      ) {
        const gridId = makeEdgeHId(row, col);
        map.set(gridId, edge);
      }
    } else {
      // Vertical edge
      const row = Math.round((edge.midpoint.y - outerPadding - cellSize / 2) / cellSize);
      const col = Math.round((edge.midpoint.x - outerPadding) / cellSize);

      const expectedX = outerPadding + col * cellSize;
      const expectedY = outerPadding + row * cellSize + cellSize / 2;

      if (
        Math.abs(edge.midpoint.x - expectedX) < tolerance &&
        Math.abs(edge.midpoint.y - expectedY) < tolerance
      ) {
        const gridId = makeEdgeVId(row, col);
        map.set(gridId, edge);
      }
    }
  }

  return map;
}

// =============================================================================
// Grid Mode ID Resolution (for rendering)
// =============================================================================

/**
 * Resolve a grid-mode ID to a position, using topology if available
 * Falls back to grid calculation if topology lookup fails
 */
export function resolveGridIdToPosition(
  id: string,
  grid: GridConfig,
  topology?: GridTopology | null
): Point | null {
  // Try topology lookup first
  if (topology) {
    // Cell lookup
    const cell = topology.cells.get(id);
    if (cell) return cell.center;

    // Direct vertex lookup (works for both grid-mode and topology-mode IDs)
    const vertex = topology.vertices.get(id);
    if (vertex) return vertex.position;

    // Direct edge lookup
    const edge = topology.edges.get(id);
    if (edge) return edge.midpoint;
  }

  // Resolve and calculate from the current grid configuration (no string parsing)
  if (id.startsWith('cell-')) {
    const cellCoord = getCellIndexById(id, grid);
    if (cellCoord) return getCellCenterFromGrid(cellCoord.row, cellCoord.col, grid);
  }

  if (id.startsWith('vertex-')) {
    const vertexCoord = getVertexIndexById(id, grid);
    if (vertexCoord) return getVertexPositionFromGrid(vertexCoord.row, vertexCoord.col, grid);
  }

  if (id.startsWith('edge-')) {
    const edgeCoord = getEdgeIndexById(id, grid);
    if (edgeCoord) return getEdgePositionFromGrid(edgeCoord.type, edgeCoord.row, edgeCoord.col, grid);
  }

  return null;
}

/**
 * Convert a grid-mode vertex ID to topology vertex, or calculate position
 * Returns position and optionally the topology vertex if found
 */
export function resolveVertexId(
  id: string,
  grid: GridConfig,
  topology?: GridTopology | null,
  vertexMap?: Map<string, TopologyVertex>
): { position: Point; topoVertex?: TopologyVertex } | null {
  // Try vertex map lookup first (most efficient for grid-mode IDs)
  if (vertexMap) {
    const topoVertex = vertexMap.get(id);
    if (topoVertex) {
      return { position: topoVertex.position, topoVertex };
    }
  }

  // Try direct topology lookup
  if (topology) {
    const topoVertex = topology.vertices.get(id);
    if (topoVertex) {
      return { position: topoVertex.position, topoVertex };
    }
  }

  // Fall back to grid calculation
  const coord = getVertexIndexById(id, grid);
  if (coord) return { position: getVertexPositionFromGrid(coord.row, coord.col, grid) };

  return null;
}

/**
 * Get two vertices' positions for an edge, handling both grid-mode and topology-mode IDs
 */
export function resolveEdgeVertices(
  fromId: string,
  toId: string,
  grid: GridConfig,
  topology?: GridTopology | null,
  vertexMap?: Map<string, TopologyVertex>
): { from: Point; to: Point } | null {
  const fromResult = resolveVertexId(fromId, grid, topology, vertexMap);
  const toResult = resolveVertexId(toId, grid, topology, vertexMap);

  if (fromResult && toResult) {
    return { from: fromResult.position, to: toResult.position };
  }

  return null;
}
