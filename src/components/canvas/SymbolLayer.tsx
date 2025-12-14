/**
 * Symbol rendering layer for puzzle canvas
 */

import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import { getCellCenter, getCellIndexById, getEdgeIndexById, getEdgePosition, getVertexIndexById, getVertexPosition } from '../../utils/gridUtils';
import type { SymbolElement, LayerType } from '../../types';
import { renderSymbol } from './symbols';

interface SymbolLayerProps {
  layer: LayerType;
}

export const SymbolLayer: React.FC<SymbolLayerProps> = ({ layer }) => {
  const { grid, puzzle, showProblemLayer, showAnswerLayer, useTopology, topology } = usePuzzleStore();
  const { cellSize } = grid;

  const isVisible =
    (layer === 'problem' && showProblemLayer) ||
    (layer === 'answer' && showAnswerLayer);

  const symbols = useMemo(() => {
    if (!isVisible) return null;

    const layerData = puzzle[layer];
    const elements: React.ReactElement[] = [];

    Object.values(layerData.symbols).forEach((symbol: SymbolElement) => {
      let center: { x: number; y: number } | null = null;

      // In topology mode, use topology positions
      if (useTopology && topology) {
        // Try cell
        const cell = topology.cells.get(symbol.cellId);
        if (cell) {
          center = cell.center;
        } else {
          // Try vertex
          const vertex = topology.vertices.get(symbol.cellId);
          if (vertex) {
            center = vertex.position;
          } else {
            // Try edge
            const edge = topology.edges.get(symbol.cellId);
            if (edge) {
              center = edge.midpoint;
            }
          }
        }
      } else {
        // Standard mode - parse different types of cellId
        if (symbol.cellId.startsWith('vertex-')) {
          const index = getVertexIndexById(symbol.cellId, grid);
          if (index) center = getVertexPosition(index.row, index.col, grid);
        } else if (symbol.cellId.startsWith('edge-h-')) {
          const index = getEdgeIndexById(symbol.cellId, grid);
          if (index && index.type === 'h') center = getEdgePosition('h', index.row, index.col, grid);
        } else if (symbol.cellId.startsWith('edge-v-')) {
          const index = getEdgeIndexById(symbol.cellId, grid);
          if (index && index.type === 'v') center = getEdgePosition('v', index.row, index.col, grid);
        } else {
          // Regular cell-row-col format
          const index = getCellIndexById(symbol.cellId, grid);
          if (index) center = getCellCenter(index.row, index.col, grid);
        }
      }

      if (!center) return;

      const sizeMultiplier =
        symbol.size === 'largest' ? 1.3 : symbol.size === 'large' ? 1 : symbol.size === 'medium' ? 0.7 : 0.5;

      elements.push(
        <g key={symbol.id}>
          {renderSymbol(symbol.symbolType, {
            x: center.x,
            y: center.y,
            size: cellSize * sizeMultiplier,
            color: symbol.color,
            fillColor: symbol.fillColor,
            rotation: symbol.rotation,
            directions: symbol.directions,
            directionAngles: symbol.directionAngles,
          })}
        </g>
      );
    });

    return elements;
  }, [puzzle, layer, grid, cellSize, isVisible, useTopology, topology]);

  if (!isVisible) return null;

  return <g className={`symbol-layer-${layer}`}>{symbols}</g>;
};
