import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStoreContext';
import { getCellCenter, getCellIndexById } from '../../utils/gridUtils';
import type { SurfaceElement, DataLayerType } from '../../types';
import type { TopologyVertex } from '../../utils/gridTopology';

interface SurfaceLayerProps {
  layer: DataLayerType;
}

// Dot display color (pzprjs style: gray)
const DOT_COLOR = 'gray';
// Dot size ratio relative to cell size (pzprjs: cw * 0.06)
const DOT_SIZE_RATIO = 0.06;

export const SurfaceLayer: React.FC<SurfaceLayerProps> = ({ layer }) => {
  const { grid, puzzle, showProblemLayer, showAnswerLayer, useTopology, topology } = usePuzzleStore();

  const surfacesData = puzzle[layer].surfaces;
  const { cellSize } = grid;

  const isVisible =
    (layer === 'problem' && showProblemLayer) ||
    (layer === 'answer' && showAnswerLayer);

  const surfaces = useMemo(() => {
    if (!isVisible) return null;

    return Object.values(surfacesData).map((surface: SurfaceElement) => {
      // Check if this surface should be displayed as a dot
      const isDot = surface.displayMode === 'dot';
      const dotRadius = cellSize * DOT_SIZE_RATIO;

      // In topology mode, render as polygon or dot using vertex positions
      if (useTopology && topology) {
        const cell = topology.cells.get(surface.cellId);
        if (!cell) return null;

        // For dot, render a small circle at cell center
        if (isDot) {
          // Calculate centroid of the cell
          const vertices = cell.boundaryVertices
            .map(vId => topology.vertices.get(vId))
            .filter((v): v is TopologyVertex => v !== undefined);

          if (vertices.length === 0) return null;

          const centroid = vertices.reduce(
            (acc, v) => ({ x: acc.x + v.position.x, y: acc.y + v.position.y }),
            { x: 0, y: 0 }
          );
          centroid.x /= vertices.length;
          centroid.y /= vertices.length;

          return (
            <circle
              key={surface.id}
              cx={centroid.x}
              cy={centroid.y}
              r={dotRadius}
              fill={DOT_COLOR}
            />
          );
        }

        // For shade, render as polygon
        const points = cell.boundaryVertices
          .map(vId => topology.vertices.get(vId))
          .filter((v): v is TopologyVertex => v !== undefined)
          .map(v => `${v.position.x},${v.position.y}`)
          .join(' ');

        if (!points) return null;

        return (
          <polygon
            key={surface.id}
            points={points}
            fill={surface.color}
          />
        );
      }

      // Standard mode
      const index = getCellIndexById(surface.cellId, grid);
      if (!index) return null;

      const center = getCellCenter(index.row, index.col, grid);

      // For dot, render a small circle at cell center
      if (isDot) {
        return (
          <circle
            key={surface.id}
            cx={center.x}
            cy={center.y}
            r={dotRadius}
            fill={DOT_COLOR}
          />
        );
      }

      // For shade, render as rectangle
      return (
        <rect
          key={surface.id}
          x={center.x - cellSize / 2}
          y={center.y - cellSize / 2}
          width={cellSize}
          height={cellSize}
          fill={surface.color}
        />
      );
    });
  }, [surfacesData, isVisible, grid, cellSize, useTopology, topology]);

  if (!isVisible) return null;

  return <g className={`surface-layer-${layer}`}>{surfaces}</g>;
};
