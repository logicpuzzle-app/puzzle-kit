/**
 * Cage Layer Component
 *
 * Renders Penpa-compatible cage regions (killer cages, etc.).
 * Cages are groups of cells with dashed boundaries and optional labels.
 */

import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStoreContext';
import { getPenpaColor } from '../../types/penpaElements';
import type { GridPoints, Point } from '../../types/point';
import { PointType, PointUse } from '../../types/point';
import { getCellIndexById } from '../../utils/gridUtils';

interface CageLayerProps {
  gridPoints?: GridPoints;
  layer?: 'problem' | 'answer';
}

/**
 * Calculate the boundary path for a cage
 *
 * Uses a flood-fill like approach to find the outer boundary
 * of a set of cells.
 */
function calculateCageBoundary(
  cellIndices: number[],
  gridPoints: GridPoints
): string {
  if (cellIndices.length === 0) return '';

  const cellSet = new Set(cellIndices);
  const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

  // For each cell, check each edge
  for (const cellIdx of cellIndices) {
    const cell = gridPoints.points[cellIdx];
    if (!cell || cell.type !== PointType.CELL) continue;

    // Get surrounding vertices
    const surround = cell.surround || [];
    if (surround.length < 3) continue;

    // Check each edge of the cell
    for (let i = 0; i < surround.length; i++) {
      const v1Idx = surround[i];
      const v2Idx = surround[(i + 1) % surround.length];

      const v1 = gridPoints.points[v1Idx];
      const v2 = gridPoints.points[v2Idx];

      if (!v1 || !v2) continue;

      // Check if this edge is shared with another cage cell
      const adjacent = cell.adjacent || [];
      const neighbor = cell.neighbor || [];

      // Find the adjacent cell for this edge
      let hasNeighborInCage = false;

      // For square grids, neighbor[i] corresponds to edge i
      if (neighbor[i] !== undefined) {
        // Find cells adjacent to this edge
        for (const adjIdx of adjacent) {
          if (cellSet.has(adjIdx)) {
            // Check if this adjacent cell shares this edge
            const adjCell = gridPoints.points[adjIdx];
            if (adjCell && adjCell.neighbor) {
              // Check if they share this edge point
              if (adjCell.neighbor.includes(neighbor[i])) {
                hasNeighborInCage = true;
                break;
              }
            }
          }
        }
      }

      // If no neighbor in cage, this is a boundary edge
      if (!hasNeighborInCage) {
        segments.push({
          x1: v1.x,
          y1: v1.y,
          x2: v2.x,
          y2: v2.y,
        });
      }
    }
  }

  // Build SVG path from segments
  if (segments.length === 0) return '';

  // Sort and connect segments into a path
  const path: string[] = [];

  // Simple approach: just draw all segments
  for (const seg of segments) {
    path.push(`M ${seg.x1} ${seg.y1} L ${seg.x2} ${seg.y2}`);
  }

  return path.join(' ');
}

/**
 * Calculate cage boundary using cell geometry
 */
function calculateSimpleCageBoundary(
  cellIndices: number[],
  gridPoints: GridPoints,
  cellSize: number,
  inset: number = 4
): string {
  if (cellIndices.length === 0) return '';

  const cellSet = new Set(cellIndices);
  const pathParts: string[] = [];

  for (const cellIdx of cellIndices) {
    const cell = gridPoints.points[cellIdx];
    if (!cell || cell.type !== PointType.CELL) continue;

    const cx = cell.x;
    const cy = cell.y;
    const half = cellSize / 2 - inset;

    // Check each direction for neighbors
    const adjacent = cell.adjacent || [];

    // Top edge
    const hasTopNeighbor = adjacent.some((adj) => {
      const adjCell = gridPoints.points[adj];
      return adjCell && cellSet.has(adj) && adjCell.y < cy;
    });

    // Right edge
    const hasRightNeighbor = adjacent.some((adj) => {
      const adjCell = gridPoints.points[adj];
      return adjCell && cellSet.has(adj) && adjCell.x > cx;
    });

    // Bottom edge
    const hasBottomNeighbor = adjacent.some((adj) => {
      const adjCell = gridPoints.points[adj];
      return adjCell && cellSet.has(adj) && adjCell.y > cy;
    });

    // Left edge
    const hasLeftNeighbor = adjacent.some((adj) => {
      const adjCell = gridPoints.points[adj];
      return adjCell && cellSet.has(adj) && adjCell.x < cx;
    });

    // Draw edges that don't have cage neighbors
    if (!hasTopNeighbor) {
      pathParts.push(`M ${cx - half} ${cy - half} L ${cx + half} ${cy - half}`);
    }
    if (!hasRightNeighbor) {
      pathParts.push(`M ${cx + half} ${cy - half} L ${cx + half} ${cy + half}`);
    }
    if (!hasBottomNeighbor) {
      pathParts.push(`M ${cx + half} ${cy + half} L ${cx - half} ${cy + half}`);
    }
    if (!hasLeftNeighbor) {
      pathParts.push(`M ${cx - half} ${cy + half} L ${cx - half} ${cy - half}`);
    }
  }

  return pathParts.join(' ');
}

/**
 * Get the top-left cell position for cage label
 */
function getCageLabelPosition(
  cellIndices: number[],
  gridPoints: GridPoints,
  cellSize: number
): { x: number; y: number } | null {
  if (cellIndices.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;

  for (const cellIdx of cellIndices) {
    const cell = gridPoints.points[cellIdx];
    if (!cell) continue;

    if (cell.y < minY || (cell.y === minY && cell.x < minX)) {
      minX = cell.x;
      minY = cell.y;
    }
  }

  if (!isFinite(minX) || !isFinite(minY)) return null;

  // Position label in top-left corner of top-left cell
  return {
    x: minX - cellSize / 2 + 4,
    y: minY - cellSize / 2 + 12,
  };
}

/**
 * Render a single cage
 */
const CageElement: React.FC<{
  id: string;
  path: string;
  label?: string;
  labelPos?: { x: number; y: number } | null;
  style: 'dashed' | 'solid' | 'dotted';
  color: string;
}> = ({ id, path, label, labelPos, style, color }) => {
  let strokeDasharray = '4,4';
  if (style === 'solid') {
    strokeDasharray = '';
  } else if (style === 'dotted') {
    strokeDasharray = '2,2';
  }

  return (
    <g className={`cage cage-${id}`}>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray={strokeDasharray}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {label && labelPos && (
        <text
          x={labelPos.x}
          y={labelPos.y}
          fontSize={10}
          fontFamily="Helvetica, Verdana, Arial, sans-serif"
          fill={color}
        >
          {label}
        </text>
      )}
    </g>
  );
};

/**
 * Cage Layer - renders all cage regions
 */
export const CageLayer: React.FC<CageLayerProps> = ({
  gridPoints,
  layer = 'problem',
}) => {
  const { puzzle, grid } = usePuzzleStore();

  const cages = useMemo(() => {
    if (!gridPoints) return [];

    const puzzleLayer = layer === 'problem' ? puzzle.problem : puzzle.answer;
    const cageElements = puzzleLayer.cages || {};

    return Object.entries(cageElements).map(([id, cage]) => {
      // Parse cell IDs to indices
      const cellIndices: number[] = [];
      for (const cellId of cage.cells) {
        // Cell ID format: "cell-row-col" or numeric index
        if (typeof cellId === 'string') {
          const index = getCellIndexById(cellId, grid);
          if (index) {
            const row = index.row;
            const col = index.col;
            // Find cell index in grid points
            const idx = gridPoints.centerList.find((i) => {
              const cell = gridPoints.points[i];
              return cell?.index && cell.index[0] === row && cell.index[1] === col;
            });
            if (idx !== undefined) {
              cellIndices.push(idx);
            }
          } else {
            // Try parsing as number
            const idx = parseInt(cellId, 10);
            if (!isNaN(idx)) {
              cellIndices.push(idx);
            }
          }
        } else if (typeof cellId === 'number') {
          cellIndices.push(cellId);
        }
      }

      if (cellIndices.length === 0) return null;

      const path = calculateSimpleCageBoundary(
        cellIndices,
        gridPoints,
        grid.cellSize
      );

      const labelPos = getCageLabelPosition(
        cellIndices,
        gridPoints,
        grid.cellSize
      );

      return {
        id,
        path,
        label: cage.label,
        labelPos,
        style: (cage.style || 'dashed') as 'dashed' | 'solid' | 'dotted',
        color: getPenpaColor(cage.color ?? 3),
      };
    }).filter(Boolean);
  }, [gridPoints, puzzle, layer, grid.cellSize]);

  return (
    <g className="cage-layer">
      {cages.map((cage) =>
        cage ? (
          <CageElement
            key={cage.id}
            id={cage.id}
            path={cage.path}
            label={cage.label}
            labelPos={cage.labelPos}
            style={cage.style}
            color={cage.color}
          />
        ) : null
      )}
    </g>
  );
};

export default CageLayer;
