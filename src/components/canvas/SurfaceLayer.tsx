import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import { parseCellId, getCellCenter } from '../../utils/gridUtils';
import type { SurfaceElement, DataLayerType } from '../../types';
import type { TopologyVertex } from '../../utils/gridTopology';

interface SurfaceLayerProps {
  layer: DataLayerType;
}

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
      // In topology mode, render as polygon using vertex positions
      if (useTopology && topology) {
        const cell = topology.cells.get(surface.cellId);
        if (!cell) return null;

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

      // Standard mode: render as rectangle
      const parsed = parseCellId(surface.cellId, grid.gridType);
      if (!parsed) return null;

      const center = getCellCenter(parsed.row, parsed.col, grid);

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
