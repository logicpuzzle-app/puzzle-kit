/**
 * useSculptMode - Hook for isometric grid sculpt mode
 *
 * Handles:
 * - Finding nearest hexagon center from mouse position
 * - Calculating hexagon polygon for cursor display
 * - Two modes:
 *   - 'rotate': Flipping hexagons (toggling 3 cells)
 *   - 'cut': Triangle cut (removes vertex and connects 3 corners)
 */

import { useCallback, useMemo, useState } from 'react';
import { usePuzzleStore } from '../store/puzzleStoreContext';
import type { Point, GridConfig } from '../types';
import type { GridTopology, TopologyCell, TopologyVertex } from '../utils/gridTopology';
import { resolveVertex } from '../utils/pointResolver';

interface UseSculptModeOptions {
  grid: GridConfig;
  topology: GridTopology | null;
}

interface SculptHover {
  vertexId: string;
  cellIds: string[];
}

export function useSculptMode({ grid, topology }: UseSculptModeOptions) {
  const { sculptMode, sculptRotateCluster, sculptCutCluster } = usePuzzleStore();
  const [sculptHover, setSculptHover] = useState<SculptHover | null>(null);

  const candidates = useMemo(() => {
    if (!topology || grid.gridType !== 'iso') {
      return [];
    }
    const result: { vertex: TopologyVertex; cellIds: string[] }[] = [];
    topology.vertices.forEach((v) => {
      if (v.adjacentCells.length === 3) {
        const cells = v.adjacentCells
          .map((id) => topology.cells.get(id))
          .filter((c): c is TopologyCell => !!c);
        if (cells.length === 3) {
          // Exclude vertices that are adjacent to cells created by cut operation
          // These include: 'cell-triangle-' (center triangle) and 'cell-trapezoid-' (remaining triangles)
          const hasCutCell = cells.some(
            (c) => c.id.startsWith('cell-triangle-') || c.id.startsWith('cell-trapezoid-')
          );
          if (hasCutCell) {
            return; // Skip this vertex - it's adjacent to a cut cell
          }

          // Also verify all adjacent cells are quadrilaterals (4 vertices)
          // This ensures we're targeting original isometric grid vertices
          const allQuads = cells.every((c) => c.boundaryVertices.length === 4);
          if (!allQuads) {
            return; // Skip - not all cells are quadrilaterals
          }

          result.push({ vertex: v, cellIds: cells.map((c) => c.id) });
        }
      }
    });
    return result;
  }, [topology, grid.gridType]);

  const findNearestVertex = useCallback(
    (point: Point): SculptHover | null => {
      if (grid.gridType !== 'iso' || !topology) return null;
      const maxDistance = grid.cellSize * 0.6;
      const resolved = resolveVertex(
        point,
        { grid, useTopology: true, topology },
        { maxDistance }
      );
      if (!resolved) return null;

      const candidateMap = new Map<string, string[]>();
      candidates.forEach(({ vertex, cellIds }) => {
        candidateMap.set(vertex.id, cellIds);
      });
      const resolvedCandidate = candidateMap.get(resolved.id);
      if (resolvedCandidate) {
        return { vertexId: resolved.id, cellIds: resolvedCandidate };
      }

      let nearest: SculptHover | null = null;
      let nearestDist = maxDistance;
      candidates.forEach(({ vertex, cellIds }) => {
        const dist = Math.hypot(point.x - vertex.position.x, point.y - vertex.position.y);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = { vertexId: vertex.id, cellIds };
        }
      });

      return nearest;
    },
    [grid, topology, candidates]
  );

  const handleSculptMode = useCallback(
    (point: Point, _isRightClick: boolean) => {
      const hit = findNearestVertex(point);
      if (hit) {
        // Call appropriate function based on sculptMode
        if (sculptMode === 'cut') {
          sculptCutCluster(hit.vertexId);
        } else {
          sculptRotateCluster(hit.vertexId);
        }
      }
    },
    [findNearestVertex, sculptMode, sculptRotateCluster, sculptCutCluster]
  );

  const updateSculptHover = useCallback(
    (point: Point) => {
      const hit = findNearestVertex(point);
      setSculptHover(hit);
    },
    [findNearestVertex]
  );

  const getSculptHoverPolygons = useCallback(
    (hover: SculptHover | null): { id: string; points: string }[] | null => {
      if (!hover || !topology) return null;
      const polys: { id: string; points: string }[] = [];
      hover.cellIds.forEach((id) => {
        const cell = topology.cells.get(id);
        if (!cell) return;
        const pts = cell.boundaryVertices
          .map((vId) => topology.vertices.get(vId))
          .filter((v): v is TopologyVertex => !!v)
          .map((v) => `${v.position.x},${v.position.y}`)
          .join(' ');
        if (pts) polys.push({ id, points: pts });
      });
      return polys;
    },
    [topology]
  );

  return {
    sculptHover,
    sculptMode,
    handleSculptMode,
    updateSculptHover,
    getSculptHoverPolygons,
  };
}
