import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import { parseCellId, getCellCenter } from '../../utils/gridUtils';
import type { SurfaceElement, LayerType } from '../../types';

interface SurfaceLayerProps {
  layer: LayerType;
}

export const SurfaceLayer: React.FC<SurfaceLayerProps> = ({ layer }) => {
  const { grid, puzzle, showProblemLayer, showAnswerLayer } = usePuzzleStore();

  const surfacesData = puzzle[layer].surfaces;
  const { cellSize } = grid;

  const isVisible =
    (layer === 'problem' && showProblemLayer) ||
    (layer === 'answer' && showAnswerLayer);

  const surfaces = useMemo(() => {
    if (!isVisible) return null;

    return Object.values(surfacesData).map((surface: SurfaceElement) => {
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
  }, [surfacesData, isVisible, grid, cellSize]);

  if (!isVisible) return null;

  return <g className={`surface-layer-${layer}`}>{surfaces}</g>;
};
