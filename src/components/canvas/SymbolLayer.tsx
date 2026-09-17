import { resolveSymbolSize } from '../../utils/symbolSize';
import { createTextColorResolver } from '../../utils/textContrast';
/**
 * Symbol rendering layer for puzzle canvas
 */

import React, { useMemo } from 'react';
import { useCanvasRenderState } from '../../hooks/useCanvasRenderState';
import { resolveBoardPoint } from '../../utils/lineReferences';
import type { SymbolElement, LayerType } from '../../types';
import { renderSymbol } from './symbols';

interface SymbolLayerProps {
  layer: LayerType;
}

export const SymbolLayer: React.FC<SymbolLayerProps> = ({ layer }) => {
  const { grid, puzzle, showProblemLayer, showAnswerLayer, trialStage, trialStack, useTopology, topology } = useCanvasRenderState();
  const { cellSize } = grid;

  const textColor = useMemo(() => createTextColorResolver(puzzle, showProblemLayer, showAnswerLayer, { backgroundColor: grid.backgroundColor, trialStage, trialStack }), [puzzle, showProblemLayer, showAnswerLayer, grid.backgroundColor, trialStage, trialStack]);

  const isVisible =
    (layer === 'problem' && showProblemLayer) ||
    (layer === 'answer' && showAnswerLayer);

  const symbols = useMemo(() => {
    if (!isVisible) return null;

    const layerData = puzzle[layer];
    const elements: React.ReactElement[] = [];

    Object.values(layerData.symbols).forEach((symbol: SymbolElement) => {
      const target = resolveBoardPoint(symbol.cellId, symbol.pointType, { grid, useTopology, topology });
      const center = target?.position;

      if (!center) return;

      const sizeMultiplier =
        resolveSymbolSize(symbol.size);

      elements.push(
        <g key={symbol.id}>
          {renderSymbol(symbol.symbolType, {
            x: center.x,
            y: center.y,
            size: cellSize * sizeMultiplier,
            color: symbol.symbolType.startsWith('text-') ? textColor(symbol.cellId, symbol.color) : symbol.color,
            fillColor: symbol.fillColor,
            rotation: symbol.rotation,
            directions: symbol.directions,
            directionAngles: symbol.directionAngles,
          })}
        </g>
      );
    });

    return elements;
  }, [puzzle, layer, grid, cellSize, isVisible, useTopology, topology, textColor]);

  if (!isVisible) return null;

  return <g className={`symbol-layer-${layer}`}>{symbols}</g>;
};
