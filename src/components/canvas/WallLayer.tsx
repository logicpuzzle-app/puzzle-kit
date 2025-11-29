/**
 * Wall Layer Component
 *
 * Renders Penpa-compatible wall lines (thick cell boundary lines).
 * Walls are drawn on the edges between adjacent cells.
 */

import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import {
  PenpaLineStyle,
  getLineStyleProps,
  getPenpaColor,
} from '../../types/penpaElements';
import type { GridPoints, Point } from '../../types/point';
import { PointType } from '../../types/point';

interface WallLayerProps {
  gridPoints?: GridPoints;
  layer?: 'problem' | 'answer';
}

/**
 * Calculate the edge position between two cells
 */
function getWallPosition(
  cell1: Point,
  cell2: Point
): { x1: number; y1: number; x2: number; y2: number } {
  // Wall is perpendicular to the line between cell centers
  const midX = (cell1.x + cell2.x) / 2;
  const midY = (cell1.y + cell2.y) / 2;

  // Determine if horizontal or vertical wall
  const dx = Math.abs(cell2.x - cell1.x);
  const dy = Math.abs(cell2.y - cell1.y);

  // Calculate wall length (should span the cell edge)
  const halfLength = Math.min(dx, dy) / 2 || Math.max(dx, dy) / 4;

  if (dx > dy) {
    // Horizontal neighbor -> vertical wall
    return {
      x1: midX,
      y1: midY - halfLength,
      x2: midX,
      y2: midY + halfLength,
    };
  } else {
    // Vertical neighbor -> horizontal wall
    return {
      x1: midX - halfLength,
      y1: midY,
      x2: midX + halfLength,
      y2: midY,
    };
  }
}

/**
 * Render a single wall line
 */
const WallLine: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  style: PenpaLineStyle;
  color?: string | number;
}> = ({ x1, y1, x2, y2, style, color }) => {
  const styleProps = getLineStyleProps(style);
  const strokeColor = getPenpaColor(color ?? 3);

  // Walls are typically bold
  const strokeWidth = style === PenpaLineStyle.NORMAL
    ? 4
    : styleProps.strokeWidth;

  if (style === PenpaLineStyle.DELETE) {
    return null;
  }

  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeDasharray={styleProps.strokeDasharray}
      strokeLinecap="square"
    />
  );
};

/**
 * Wall Layer - renders all wall lines
 */
export const WallLayer: React.FC<WallLayerProps> = ({
  gridPoints,
  layer = 'problem',
}) => {
  const { puzzle } = usePuzzleStore();

  const walls = useMemo(() => {
    if (!gridPoints) return [];

    const puzzleLayer = layer === 'problem' ? puzzle.problem : puzzle.answer;
    const wallElements = puzzleLayer.walls || {};

    return Object.entries(wallElements).map(([id, wall]) => {
      // Wall position is stored as edge ID
      // Parse to get the two adjacent cells
      const positionParts = wall.position.split(',').map(Number);

      if (positionParts.length === 2) {
        // Format: "cell1,cell2"
        const [cell1Idx, cell2Idx] = positionParts;
        const cell1 = gridPoints.points[cell1Idx];
        const cell2 = gridPoints.points[cell2Idx];

        if (!cell1 || !cell2) {
          return null;
        }

        const pos = getWallPosition(cell1, cell2);

        // Convert style
        let penpaStyle = PenpaLineStyle.NORMAL;
        switch (wall.style) {
          case 'dotted':
            penpaStyle = PenpaLineStyle.DOTTED;
            break;
          case 'dashed':
            penpaStyle = PenpaLineStyle.DASHED;
            break;
          case 'double':
            penpaStyle = PenpaLineStyle.DOUBLE;
            break;
        }

        return {
          id,
          ...pos,
          style: penpaStyle,
          color: wall.color,
        };
      } else if (positionParts.length === 1) {
        // Single edge index - need to look up edge position
        const edgeIdx = positionParts[0];
        const edge = gridPoints.points[edgeIdx];

        if (!edge || (edge.type !== PointType.EDGE_H && edge.type !== PointType.EDGE_V)) {
          return null;
        }

        // Get edge endpoints from edge_to_vertex
        if (edge.edge_to_vertex && edge.edge_to_vertex.length === 2) {
          const v1 = gridPoints.points[edge.edge_to_vertex[0]];
          const v2 = gridPoints.points[edge.edge_to_vertex[1]];

          if (v1 && v2) {
            let penpaStyle = PenpaLineStyle.NORMAL;
            switch (wall.style) {
              case 'dotted':
                penpaStyle = PenpaLineStyle.DOTTED;
                break;
              case 'dashed':
                penpaStyle = PenpaLineStyle.DASHED;
                break;
            }

            return {
              id,
              x1: v1.x,
              y1: v1.y,
              x2: v2.x,
              y2: v2.y,
              style: penpaStyle,
              color: wall.color,
            };
          }
        }
      }

      return null;
    }).filter(Boolean);
  }, [gridPoints, puzzle, layer]);

  return (
    <g className="wall-layer">
      {walls.map((wall) =>
        wall ? (
          <WallLine
            key={wall.id}
            x1={wall.x1}
            y1={wall.y1}
            x2={wall.x2}
            y2={wall.y2}
            style={wall.style}
            color={wall.color}
          />
        ) : null
      )}
    </g>
  );
};

export default WallLayer;
