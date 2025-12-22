import { useCallback } from 'react';
import { getCellIndexById, getEdgeIndexById, getVertexIndexById } from '../utils/gridUtils';
import type { Point, LineGridPoint, LineDirection, GridConfig } from '../types';
import { usePuzzleStore } from '../store/puzzleStoreContext';
import { resolveGridPoint, type ResolveOptions } from '../utils/pointResolver';

/**
 * Hook providing grid point utilities for line/edge tools
 */
export function useGridPointUtils(grid: GridConfig) {
  const { useTopology, topology } = usePuzzleStore();
  /**
   * Find the nearest grid point based on allowed grid point types
   * Returns { id: string, position: Point } or null
   */
  const findNearestGridPoint = useCallback(
    (
      point: Point,
      allowedTypes: LineGridPoint[],
      halfMode: boolean = false,
      options: ResolveOptions = {}
    ): { id: string; position: Point } | null => {
      return resolveGridPoint(
        point,
        { grid, useTopology, topology },
        allowedTypes,
        halfMode,
        options
      );
    },
    [grid, useTopology, topology]
  );

  // Parse ID to get row/col coordinates
  // For topology mode, returns null (topology IDs don't have row/col)
  const parsePointId = useCallback((id: string): { row: number; col: number; type: string } | null => {
    if (id.startsWith('cell-')) {
      const index = getCellIndexById(id, grid);
      return index ? { row: index.row, col: index.col, type: 'cell' } : null;
    }
    if (id.startsWith('vertex-')) {
      const index = getVertexIndexById(id, grid);
      return index ? { row: index.row, col: index.col, type: 'vertex' } : null;
    }
    if (id.startsWith('edge-')) {
      const edge = getEdgeIndexById(id, grid);
      return edge ? { row: edge.row, col: edge.col, type: edge.type === 'h' ? 'edge-h' : 'edge-v' } : null;
    }
    // Topology IDs (e.g., cell-*-*-suffix, vertex-N, edge-N) don't have standard row/col.
    return null;
  }, [grid]);

  // Build ID from row/col and type
  const buildPointId = useCallback((row: number, col: number, type: string): string => {
    switch (type) {
      case 'cell': return `cell-${row}-${col}`;
      case 'vertex': return `vertex-${row}-${col}`;
      case 'edge-h': return `edge-h-${row}-${col}`;
      case 'edge-v': return `edge-v-${row}-${col}`;
      default: return `cell-${row}-${col}`;
    }
  }, []);

  /**
   * Check if a line between two points is allowed based on direction settings
   */
  const isLineDirectionAllowed = useCallback(
    (fromId: string, toId: string, allowedDirections: LineDirection[]): boolean => {
      const from = parsePointId(fromId);
      const to = parsePointId(toId);
      if (!from || !to) return true; // Can't determine, allow

      const dRow = Math.abs(to.row - from.row);
      const dCol = Math.abs(to.col - from.col);

      // Orthogonal: one of dRow or dCol is 0
      const isOrthogonal = dRow === 0 || dCol === 0;
      // Diagonal: dRow === dCol and both > 0
      const isDiagonal = dRow === dCol && dRow > 0;

      if (isOrthogonal && allowedDirections.includes('orthogonal')) return true;
      if (isDiagonal && allowedDirections.includes('diagonal')) return true;

      // If neither strictly orthogonal nor diagonal, check if at least one is allowed
      // For mixed cases (like 2,1 knight moves), allow if both directions are enabled
      if (!isOrthogonal && !isDiagonal) {
        return allowedDirections.includes('orthogonal') && allowedDirections.includes('diagonal');
      }

      return false;
    },
    [parsePointId]
  );

  /**
   * Get intermediate points between two points for line interpolation
   * Returns array of point IDs including start (excluded) and end (included)
   * Returns null if path is not possible with given directions
   *
   * @param halfMode - If true, allows lines between different grid point types:
   *   - Cell + Edge (Orthogonal): center to edge
   *   - Vertex + Edge (Orthogonal): vertex to edge
   *   - Cell + Vertex (Diagonal): center to vertex
   *   - Edge-h + Edge-v (Diagonal): horizontal edge to vertical edge
   */
  const getInterpolatedPath = useCallback(
    (fromId: string, toId: string, allowedDirections: LineDirection[], halfMode: boolean = false): string[] | null => {
      const from = parsePointId(fromId);
      const to = parsePointId(toId);

      // For topology mode with non-standard IDs, use adjacency-based direction checking
      // - Orthogonal (縦横): Edge adjacency (cells sharing an edge / vertices connected by edge)
      // - Diagonal (斜め): Vertex/Cell adjacency (cells sharing a vertex / vertices sharing a cell)
      if (!from || !to) {
        if (useTopology && topology) {
          // For cell-to-cell connections
          if (fromId.startsWith('cell-') && toId.startsWith('cell-')) {
            const fromCell = topology.cells.get(fromId);
            const toCell = topology.cells.get(toId);
            if (!fromCell || !toCell) return null;

            // Check edge adjacency (orthogonal)
            const isEdgeAdjacent = fromCell.adjacentCells.includes(toId);
            if (isEdgeAdjacent && allowedDirections.includes('orthogonal')) {
              return [toId];
            }

            // Check vertex adjacency (diagonal) - shares a vertex but not an edge (頂点隣接)
            if (allowedDirections.includes('diagonal')) {
              const sharedVertices = fromCell.boundaryVertices.filter(
                v => toCell.boundaryVertices.includes(v)
              );
              const isVertexAdjacent = sharedVertices.length > 0 && !isEdgeAdjacent;
              if (isVertexAdjacent) {
                return [toId];
              }
            }

            return null;
          }

          // For vertex-to-vertex connections
          if (fromId.startsWith('vertex-') && toId.startsWith('vertex-')) {
            const fromVertex = topology.vertices.get(fromId);
            const toVertex = topology.vertices.get(toId);
            if (!fromVertex || !toVertex) return null;

            // Check edge adjacency (orthogonal) - connected by an edge
            const isEdgeConnected = fromVertex.adjacentVertices.includes(toId);
            if (isEdgeConnected && allowedDirections.includes('orthogonal')) {
              return [toId];
            }

            // Check cell adjacency (diagonal) - share a cell but not an edge (セル隣接)
            if (allowedDirections.includes('diagonal')) {
              const sharedCells = fromVertex.adjacentCells.filter(
                c => toVertex.adjacentCells.includes(c)
              );
              const isVertexAdjacent = sharedCells.length > 0 && !isEdgeConnected;
              if (isVertexAdjacent) {
                return [toId];
              }
            }

            return null;
          }

          // For edge-to-edge connections (not yet supported in topology mode)
          // Not adjacent in topology mode - no connection allowed
        }
        return null;
      }

      const fromIsCell = from.type === 'cell';
      const toIsCell = to.type === 'cell';
      const fromIsVertex = from.type === 'vertex';
      const toIsVertex = to.type === 'vertex';
      const fromIsEdgeH = from.type === 'edge-h';
      const toIsEdgeH = to.type === 'edge-h';
      const fromIsEdgeV = from.type === 'edge-v';
      const toIsEdgeV = to.type === 'edge-v';
      const fromIsEdge = fromIsEdgeH || fromIsEdgeV;
      const toIsEdge = toIsEdgeH || toIsEdgeV;

      // Half mode handling for different point type combinations
      if (halfMode) {
        // 1. Cell + Edge (Orthogonal): center to edge
        if ((fromIsCell && toIsEdge) || (fromIsEdge && toIsCell)) {
          if (!allowedDirections.includes('orthogonal')) return null;

          const cellPt = fromIsCell ? from : to;
          const edgePt = fromIsCell ? to : from;

          let isAdjacent = false;
          if (edgePt.type === 'edge-h') {
            // edge-h at (r, c) is adjacent to cell (r-1, c) [below] and cell (r, c) [above]
            isAdjacent = (
              (edgePt.row === cellPt.row && edgePt.col === cellPt.col) ||     // top edge of cell
              (edgePt.row === cellPt.row + 1 && edgePt.col === cellPt.col)    // bottom edge of cell
            );
          } else if (edgePt.type === 'edge-v') {
            // edge-v at (r, c) is adjacent to cell (r, c-1) [right] and cell (r, c) [left]
            isAdjacent = (
              (edgePt.row === cellPt.row && edgePt.col === cellPt.col) ||     // left edge of cell
              (edgePt.row === cellPt.row && edgePt.col === cellPt.col + 1)    // right edge of cell
            );
          }

          if (isAdjacent) return [toId];
          return null;
        }

        // 2. Vertex + Edge (Orthogonal): vertex to edge
        if ((fromIsVertex && toIsEdge) || (fromIsEdge && toIsVertex)) {
          if (!allowedDirections.includes('orthogonal')) return null;

          const vertexPt = fromIsVertex ? from : to;
          const edgePt = fromIsVertex ? to : from;

          let isAdjacent = false;
          if (edgePt.type === 'edge-h') {
            // edge-h at (r, c) is adjacent to vertex (r, c) [left] and vertex (r, c+1) [right]
            isAdjacent = (
              (edgePt.row === vertexPt.row && edgePt.col === vertexPt.col) ||     // left vertex
              (edgePt.row === vertexPt.row && edgePt.col === vertexPt.col - 1)    // right vertex
            );
          } else if (edgePt.type === 'edge-v') {
            // edge-v at (r, c) is adjacent to vertex (r, c) [top] and vertex (r+1, c) [bottom]
            isAdjacent = (
              (edgePt.row === vertexPt.row && edgePt.col === vertexPt.col) ||     // top vertex
              (edgePt.row === vertexPt.row - 1 && edgePt.col === vertexPt.col)    // bottom vertex
            );
          }

          if (isAdjacent) return [toId];
          return null;
        }

        // 3. Cell + Vertex (Diagonal): center to vertex
        if ((fromIsCell && toIsVertex) || (fromIsVertex && toIsCell)) {
          if (!allowedDirections.includes('diagonal')) return null;

          const cellPt = fromIsCell ? from : to;
          const vertexPt = fromIsCell ? to : from;

          // vertex (r, c) is diagonally adjacent to cells:
          // (r-1, c-1) [top-left], (r-1, c) [top-right], (r, c-1) [bottom-left], (r, c) [bottom-right]
          const isAdjacent = (
            (vertexPt.row === cellPt.row && vertexPt.col === cellPt.col) ||         // bottom-right vertex
            (vertexPt.row === cellPt.row && vertexPt.col === cellPt.col + 1) ||     // bottom-left vertex
            (vertexPt.row === cellPt.row + 1 && vertexPt.col === cellPt.col) ||     // top-right vertex
            (vertexPt.row === cellPt.row + 1 && vertexPt.col === cellPt.col + 1)    // top-left vertex
          );

          if (isAdjacent) return [toId];
          return null;
        }

        // 4. Edge-h + Edge-v (Diagonal): horizontal edge to vertical edge
        if ((fromIsEdgeH && toIsEdgeV) || (fromIsEdgeV && toIsEdgeH)) {
          if (!allowedDirections.includes('diagonal')) return null;

          const edgeH = fromIsEdgeH ? from : to;
          const edgeV = fromIsEdgeH ? to : from;

          // edge-h at (r, c) is diagonally adjacent to edge-v at:
          // (r-1, c) [top-left], (r-1, c+1) [top-right], (r, c) [bottom-left], (r, c+1) [bottom-right]
          const isAdjacent = (
            (edgeV.row === edgeH.row - 1 && edgeV.col === edgeH.col) ||     // top-left
            (edgeV.row === edgeH.row - 1 && edgeV.col === edgeH.col + 1) || // top-right
            (edgeV.row === edgeH.row && edgeV.col === edgeH.col) ||         // bottom-left
            (edgeV.row === edgeH.row && edgeV.col === edgeH.col + 1)        // bottom-right
          );

          if (isAdjacent) return [toId];
          return null;
        }
      }

      // For same-type connections or non-half mode
      // Check if types are compatible (same type only)
      if (from.type !== to.type) {
        return null; // Different point types without half mode, can't interpolate
      }

      const dRow = to.row - from.row;
      const dCol = to.col - from.col;
      const absDRow = Math.abs(dRow);
      const absDCol = Math.abs(dCol);

      // Same type handling
      if (from.type === to.type) {
        // Already adjacent (distance 1), just return the end point
        if ((absDRow === 1 && absDCol === 0) || (absDRow === 0 && absDCol === 1)) {
          if (allowedDirections.includes('orthogonal')) return [toId];
          return null;
        }
        if (absDRow === 1 && absDCol === 1) {
          if (allowedDirections.includes('diagonal')) return [toId];
          return null;
        }

        // Orthogonal path (straight line)
        if (absDRow === 0 && absDCol > 0 && allowedDirections.includes('orthogonal')) {
          const path: string[] = [];
          const step = dCol > 0 ? 1 : -1;
          for (let c = from.col + step; ; c += step) {
            path.push(buildPointId(from.row, c, from.type));
            if (c === to.col) break;
          }
          return path;
        }
        if (absDCol === 0 && absDRow > 0 && allowedDirections.includes('orthogonal')) {
          const path: string[] = [];
          const step = dRow > 0 ? 1 : -1;
          for (let r = from.row + step; ; r += step) {
            path.push(buildPointId(r, from.col, from.type));
            if (r === to.row) break;
          }
          return path;
        }

        // Diagonal path (45 degree line) - same type
        if (absDRow === absDCol && absDRow > 0 && allowedDirections.includes('diagonal')) {
          const path: string[] = [];
          const stepR = dRow > 0 ? 1 : -1;
          const stepC = dCol > 0 ? 1 : -1;
          let r = from.row + stepR;
          let c = from.col + stepC;
          while (true) {
            path.push(buildPointId(r, c, from.type));
            if (r === to.row && c === to.col) break;
            r += stepR;
            c += stepC;
          }
          return path;
        }
      }

      // Not a valid path
      return null;
    },
    [parsePointId, buildPointId, useTopology, topology]
  );

  return {
    findNearestGridPoint,
    parsePointId,
    buildPointId,
    isLineDirectionAllowed,
    getInterpolatedPath,
  };
}
