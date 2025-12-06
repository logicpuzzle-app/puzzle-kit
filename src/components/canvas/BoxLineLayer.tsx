import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import { parseCellId, getCellCenter } from '../../utils/gridUtils';
import type { BoxLineElement, DataLayerType } from '../../types';
import type { TopologyVertex } from '../../utils/gridTopology';

interface BoxLineLayerProps {
  layer: DataLayerType;
}

type Point = { x: number; y: number };

/**
 * Scale a polygon's vertices around a center point
 */
function scalePolygon(polygon: Point[], center: Point, scale: number): Point[] {
  return polygon.map(p => ({
    x: center.x + (p.x - center.x) * scale,
    y: center.y + (p.y - center.y) * scale,
  }));
}

/**
 * Find the shared edge vertices between two polygons (scaled)
 * Returns the 4 points forming the connection polygon:
 * [curr_v1, curr_v2, next_v2, next_v1] (counterclockwise)
 */
function findConnectionPolygon(
  currPolygon: Point[],
  nextPolygon: Point[],
  currCenter: Point,
  nextCenter: Point,
  scale: number
): Point[] | null {
  const currScaled = scalePolygon(currPolygon, currCenter, scale);
  const nextScaled = scalePolygon(nextPolygon, nextCenter, scale);

  // Find the two vertices of currPolygon closest to nextCenter
  const currWithDist = currScaled.map((p, i) => ({
    point: p,
    origPoint: currPolygon[i],
    dist: Math.hypot(p.x - nextCenter.x, p.y - nextCenter.y),
  }));
  currWithDist.sort((a, b) => a.dist - b.dist);
  const currClosest = currWithDist.slice(0, 2);

  // Find the two vertices of nextPolygon closest to currCenter
  const nextWithDist = nextScaled.map((p, i) => ({
    point: p,
    origPoint: nextPolygon[i],
    dist: Math.hypot(p.x - currCenter.x, p.y - currCenter.y),
  }));
  nextWithDist.sort((a, b) => a.dist - b.dist);
  const nextClosest = nextWithDist.slice(0, 2);

  // Order points to form a proper quadrilateral
  // Sort curr points by angle from center to next center
  const angle = Math.atan2(nextCenter.y - currCenter.y, nextCenter.x - currCenter.x);
  const perpAngle = angle + Math.PI / 2;

  const sortByPerp = (a: Point, b: Point) => {
    const aDot = (a.x - currCenter.x) * Math.cos(perpAngle) + (a.y - currCenter.y) * Math.sin(perpAngle);
    const bDot = (b.x - currCenter.x) * Math.cos(perpAngle) + (b.y - currCenter.y) * Math.sin(perpAngle);
    return aDot - bDot;
  };

  const currSorted = [...currClosest].sort((a, b) => sortByPerp(a.point, b.point));
  const nextSorted = [...nextClosest].sort((a, b) => sortByPerp(a.point, b.point));

  // Form polygon: curr1, curr2, next2, next1
  return [
    currSorted[0].point,
    currSorted[1].point,
    nextSorted[1].point,
    nextSorted[0].point,
  ];
}

/**
 * Get default square polygon for a cell
 */
function getSquarePolygon(center: Point, cellSize: number): Point[] {
  const half = cellSize / 2;
  return [
    { x: center.x - half, y: center.y - half },
    { x: center.x + half, y: center.y - half },
    { x: center.x + half, y: center.y + half },
    { x: center.x - half, y: center.y + half },
  ];
}

/**
 * BoxLineLayer renders BoxLine elements - hybrid of filled cell and connecting line
 * Used for Snake, Object Placement, Patrol puzzles
 * Each cell is filled at 90% size, with connections as polygons connecting shared edge vertices
 */
export const BoxLineLayer: React.FC<BoxLineLayerProps> = ({ layer }) => {
  const { grid, puzzle, showProblemLayer, showAnswerLayer, useTopology, topology } = usePuzzleStore();

  const boxLinesData = puzzle[layer].boxLines || {};
  const { cellSize } = grid;

  const isVisible =
    (layer === 'problem' && showProblemLayer) ||
    (layer === 'answer' && showAnswerLayer);

  const SCALE = 0.9;

  const boxLines = useMemo(() => {
    if (!isVisible) return null;

    return Object.values(boxLinesData).map((boxLine: BoxLineElement) => {
      const elements: React.ReactNode[] = [];
      const cells = boxLine.cells;

      // Parse all cell positions with their polygons
      const positions = cells.map((cellId) => {
        if (useTopology && topology) {
          const topoCell = topology.cells.get(cellId);
          if (topoCell) {
            const parsed = parseCellId(cellId, grid.gridType);
            return {
              cellId,
              row: parsed?.row ?? 0,
              col: parsed?.col ?? 0,
              center: { x: topoCell.center.x, y: topoCell.center.y },
              polygon: topoCell.boundaryVertices
                .map(vId => topology.vertices.get(vId))
                .filter((v): v is TopologyVertex => v !== undefined)
                .map(v => v.position),
            };
          }
        }

        const parsed = parseCellId(cellId, grid.gridType);
        if (!parsed) return null;
        const center = getCellCenter(parsed.row, parsed.col, grid);
        return {
          cellId,
          row: parsed.row,
          col: parsed.col,
          center,
          polygon: getSquarePolygon(center, cellSize),
        };
      }).filter(Boolean) as { cellId: string; row: number; col: number; center: Point; polygon: Point[] }[];

      // Draw connections between adjacent cells first (so boxes overlay them)
      for (let i = 0; i < positions.length - 1; i++) {
        const curr = positions[i];
        const next = positions[i + 1];

        // Check if cells are orthogonally adjacent
        const rowDiff = Math.abs(next.row - curr.row);
        const colDiff = Math.abs(next.col - curr.col);

        if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
          // Find the connection polygon using shared edge vertices
          const connPolygon = findConnectionPolygon(
            curr.polygon,
            next.polygon,
            curr.center,
            next.center,
            SCALE
          );

          if (connPolygon) {
            elements.push(
              <polygon
                key={`${boxLine.id}-conn-${i}`}
                points={connPolygon.map(p => `${p.x},${p.y}`).join(' ')}
                fill={boxLine.color}
              />
            );
          }
        }
      }

      // Draw scaled polygons for each cell
      positions.forEach((pos, idx) => {
        const scaledPoints = scalePolygon(pos.polygon, pos.center, SCALE);
        elements.push(
          <polygon
            key={`${boxLine.id}-box-${idx}`}
            points={scaledPoints.map(p => `${p.x},${p.y}`).join(' ')}
            fill={boxLine.color}
          />
        );
      });

      return (
        <g key={boxLine.id}>
          {elements}
        </g>
      );
    });
  }, [boxLinesData, isVisible, grid, cellSize, useTopology, topology]);

  if (!isVisible) return null;

  return <g className={`boxline-layer-${layer}`}>{boxLines}</g>;
};
