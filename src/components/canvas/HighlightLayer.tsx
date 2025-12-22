import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStoreContext';
import { useHighlightOutput } from '../../hooks/useHighlightOutput';
import { type HighlightFill, type HighlightLayerHint } from '../../constraints/highlights';
import { getCellCenter, getCellIndexById } from '../../utils/gridUtils';
import type { TopologyVertex } from '../../utils/gridTopology';

interface HighlightLayerProps {
  layer?: HighlightLayerHint;
}

export const HighlightLayer: React.FC<HighlightLayerProps> = ({ layer = 'under-lines' }) => {
  const { grid, useTopology, topology } = usePuzzleStore();
  const highlightOutput = useHighlightOutput();

  const fills = highlightOutput?.fills ?? [];

  const layerFills = useMemo(
    () => fills.filter((fill) => (fill.layer ?? 'under-lines') === layer),
    [fills, layer]
  );

  const fillElements = useMemo(() => {
    if (layerFills.length === 0) return null;

    return layerFills.map((fill: HighlightFill) => {
      if (useTopology && topology) {
        const cell = topology.cells.get(fill.cellId);
        if (!cell) return null;

        const points = cell.boundaryVertices
          .map((vId) => topology.vertices.get(vId))
          .filter((v): v is TopologyVertex => v !== undefined)
          .map((v) => `${v.position.x},${v.position.y}`)
          .join(' ');

        if (!points) return null;

        return (
          <polygon
            key={`highlight-${fill.cellId}`}
            points={points}
            fill={fill.color}
            opacity={fill.opacity ?? 1}
          />
        );
      }

      const index = getCellIndexById(fill.cellId, grid);
      if (!index) return null;

      const center = getCellCenter(index.row, index.col, grid);
      return (
        <rect
          key={`highlight-${fill.cellId}`}
          x={center.x - grid.cellSize / 2}
          y={center.y - grid.cellSize / 2}
          width={grid.cellSize}
          height={grid.cellSize}
          fill={fill.color}
          opacity={fill.opacity ?? 1}
        />
      );
    });
  }, [grid, layerFills, topology, useTopology]);

  if (layerFills.length === 0) return null;

  return (
    <g className="highlight-layer" pointerEvents="none">
      {fillElements}
    </g>
  );
};
