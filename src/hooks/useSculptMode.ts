/**
 * useSculptMode - Hook for isometric grid sculpt mode
 *
 * Handles:
 * - Finding nearest hexagon center from mouse position
 * - Calculating hexagon polygon for cursor display
 * - Flipping hexagons (toggling 3 cells)
 */

import { useCallback, useMemo, useState } from 'react';
import { usePuzzleStore } from '../store/puzzleStore';
import type { Point, GridConfig } from '../types';
import type { GridTopology, TopologyCell, TopologyVertex } from '../utils/gridTopology';

interface UseSculptModeOptions {
  grid: GridConfig;
  topology: GridTopology | null;
}

interface SculptHover {
  vertexId: string;
  cellIds: string[];
}

export function useSculptMode({ grid, topology }: UseSculptModeOptions) {
  const { sculptRotateCluster } = usePuzzleStore();
  const [sculptHover, setSculptHover] = useState<SculptHover | null>(null);

  const candidates = useMemo(() => {
    if (!topology || grid.gridType !== 'iso') {
      console.log('[useSculptMode] candidates: empty (no topology or not iso)', { hasTopology: !!topology, gridType: grid.gridType });
      return [];
    }
    const result: { vertex: TopologyVertex; cellIds: string[] }[] = [];
    let totalVertices = 0;
    let verticesWith3Cells = 0;
    topology.vertices.forEach((v) => {
      totalVertices++;
      if (v.adjacentCells.length === 3) {
        verticesWith3Cells++;
        const cells = v.adjacentCells
          .map((id) => topology.cells.get(id))
          .filter((c): c is TopologyCell => !!c);
        if (cells.length === 3) {
          result.push({ vertex: v, cellIds: cells.map((c) => c.id) });
        }
      }
    });
    console.log('[useSculptMode] candidates:', { totalVertices, verticesWith3Cells, candidateCount: result.length });
    return result;
  }, [topology, grid.gridType]);

  const findNearestVertex = useCallback(
    (point: Point): SculptHover | null => {
      if (grid.gridType !== 'iso' || !topology) return null;
      let nearest: SculptHover | null = null;
      let nearestDist = grid.cellSize * 0.6;

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
        sculptRotateCluster(hit.vertexId);
      }
    },
    [findNearestVertex, sculptRotateCluster]
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
    handleSculptMode,
    updateSculptHover,
    getSculptHoverPolygons,
  };
}
