/**
 * useGridEditMode - Hook for grid editing modes (merge, split)
 *
 * Handles:
 * - Merge mode: combining multiple cells into one
 * - Split mode: splitting cells by connecting vertices
 */

import { useCallback, useState } from 'react';
import { usePuzzleStore } from '../store/puzzleStore';
import type { Point } from '../types';
import type { GridTopology } from '../utils/gridTopology';

interface UseGridEditModeOptions {
  topology: GridTopology | null;
}

export function useGridEditMode({ topology }: UseGridEditModeOptions) {
  const { mergeCells, unmergeCells, addSplitLine } = usePuzzleStore();

  // Merge mode state
  const [mergingCells, setMergingCells] = useState<string[]>([]);

  // Split mode state
  const [splitStartVertex, setSplitStartVertex] = useState<string | null>(null);
  const [splitHoverVertex, setSplitHoverVertex] = useState<string | null>(null);

  /**
   * Find cell at a given point using point-in-polygon test
   */
  const findCellAtPoint = useCallback(
    (point: Point): string | null => {
      if (!topology) return null;

      for (const [cellId, cell] of topology.cells) {
        const vertices = cell.boundaryVertices
          .map(vId => topology.vertices.get(vId))
          .filter((v): v is NonNullable<typeof v> => v !== undefined)
          .map(v => v.position);

        if (vertices.length < 3) continue;

        // Point-in-polygon test
        let inside = false;
        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
          const xi = vertices[i].x, yi = vertices[i].y;
          const xj = vertices[j].x, yj = vertices[j].y;
          const intersect = ((yi > point.y) !== (yj > point.y))
            && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        if (inside) return cellId;
      }
      return null;
    },
    [topology]
  );

  /**
   * Find nearest vertex to a given point
   */
  const findNearestVertexAtPoint = useCallback(
    (point: Point, maxDistance: number = 15): string | null => {
      if (!topology) return null;

      let nearestId: string | null = null;
      let nearestDist = maxDistance;

      for (const [vertexId, vertex] of topology.vertices) {
        const dist = Math.hypot(point.x - vertex.position.x, point.y - vertex.position.y);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestId = vertexId;
        }
      }
      return nearestId;
    },
    [topology]
  );

  /**
   * Handle merge mode - add cell to merging list
   */
  const handleMergeMode = useCallback(
    (point: Point, isStart: boolean, isEnd: boolean, isRightClick: boolean) => {
      const cellId = findCellAtPoint(point);
      if (!cellId) return;

      if (isRightClick) {
        unmergeCells([cellId]);
        return;
      }

      if (isStart) {
        setMergingCells([cellId]);
      } else if (isEnd) {
        if (mergingCells.length >= 2) {
          mergeCells(mergingCells);
        }
        setMergingCells([]);
      } else {
        if (!mergingCells.includes(cellId)) {
          setMergingCells((prev) => [...prev, cellId]);
        }
      }
    },
    [findCellAtPoint, mergingCells, mergeCells, unmergeCells]
  );

  /**
   * Handle split mode - connect vertices to split cells
   */
  const handleSplitMode = useCallback(
    (point: Point, isStart: boolean, isEnd: boolean, isRightClick: boolean) => {
      if (isRightClick) {
        setSplitStartVertex(null);
        setSplitHoverVertex(null);
        return;
      }

      const vertexId = findNearestVertexAtPoint(point);

      if (isStart) {
        if (vertexId) {
          setSplitStartVertex(vertexId);
        }
      } else if (isEnd) {
        if (splitStartVertex && vertexId && vertexId !== splitStartVertex && topology) {
          const startVertex = topology.vertices.get(splitStartVertex);
          const endVertex = topology.vertices.get(vertexId);

          if (startVertex && endVertex) {
            const startCells = new Set(startVertex.adjacentCells);
            const commonCells = endVertex.adjacentCells.filter(cellId => startCells.has(cellId));

            if (commonCells.length > 0) {
              const cellId = commonCells[0];
              addSplitLine(cellId, splitStartVertex, vertexId);
            }
          }
        }
        setSplitStartVertex(null);
        setSplitHoverVertex(null);
      } else {
        setSplitHoverVertex(vertexId);
      }
    },
    [findNearestVertexAtPoint, splitStartVertex, topology, addSplitLine]
  );

  /**
   * Update split hover vertex for cursor display
   */
  const updateSplitHoverVertex = useCallback(
    (point: Point) => {
      const vertexId = findNearestVertexAtPoint(point);
      setSplitHoverVertex(vertexId);
    },
    [findNearestVertexAtPoint]
  );

  return {
    // Merge mode
    mergingCells,
    handleMergeMode,
    // Split mode
    splitStartVertex,
    splitHoverVertex,
    handleSplitMode,
    updateSplitHoverVertex,
    // Utilities
    findCellAtPoint,
    findNearestVertexAtPoint,
  };
}
