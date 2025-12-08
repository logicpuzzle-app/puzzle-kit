/**
 * TrialStackLayer - Renders saved trial states with graduated opacity
 *
 * When in trial mode, this component renders all saved states from the trial stack
 * with the following opacity scheme:
 * - Base layer (index 0): 100%
 * - Intermediate layers: 75%
 * - Current layer (puzzle.answer): 50% (handled separately in PuzzleCanvas)
 */

import React from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import { parseCellId, getCellCenter, getVertexPosition } from '../../utils/gridUtils';
import type { PuzzleElements, SurfaceElement, EdgeElement, LineElement, SymbolElement, NumberElement } from '../../types';
import type { TopologyVertex } from '../../utils/gridTopology';

interface TrialStackLayerProps {
  /** The saved elements to render */
  elements: PuzzleElements;
  /** Opacity for this layer */
  opacity: number;
  /** Layer index for key generation */
  layerIndex: number;
}

/**
 * Renders a single trial layer with all its elements
 */
const TrialLayer: React.FC<TrialStackLayerProps> = ({ elements, opacity, layerIndex }) => {
  const { grid, showAnswerLayer, useTopology, topology } = usePuzzleStore();
  const { cellSize } = grid;

  if (!showAnswerLayer) return null;

  return (
    <g className={`trial-layer-${layerIndex}`} opacity={opacity}>
      {/* Surfaces */}
      {Object.values(elements.surfaces).map((surface: SurfaceElement) => {
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
              key={`trial-${layerIndex}-surface-${surface.id}`}
              points={points}
              fill={surface.color}
            />
          );
        }

        const parsed = parseCellId(surface.cellId, grid.gridType);
        if (!parsed) return null;

        const center = getCellCenter(parsed.row, parsed.col, grid);

        return (
          <rect
            key={`trial-${layerIndex}-surface-${surface.id}`}
            x={center.x - cellSize / 2}
            y={center.y - cellSize / 2}
            width={cellSize}
            height={cellSize}
            fill={surface.color}
          />
        );
      })}

      {/* Edges */}
      {Object.values(elements.edges).map((edge: EdgeElement) => {
        // Parse vertex IDs: "vertex-row-col"
        const fromParts = edge.from.split('-');
        const toParts = edge.to.split('-');
        if (fromParts.length < 3 || toParts.length < 3) return null;

        const fromVertex = getVertexPosition(
          parseInt(fromParts[1]),
          parseInt(fromParts[2]),
          grid
        );
        const toVertex = getVertexPosition(
          parseInt(toParts[1]),
          parseInt(toParts[2]),
          grid
        );

        return (
          <line
            key={`trial-${layerIndex}-edge-${edge.id}`}
            x1={fromVertex.x}
            y1={fromVertex.y}
            x2={toVertex.x}
            y2={toVertex.y}
            stroke={edge.color}
            strokeWidth={edge.thickness === 'thick' ? 4 : 2}
            strokeLinecap="round"
          />
        );
      })}

      {/* Lines */}
      {Object.values(elements.lines).map((line: LineElement) => {
        const fromPos = getCellCenter(
          parseInt(line.from.split('-')[1]),
          parseInt(line.from.split('-')[2]),
          grid
        );
        const toPos = getCellCenter(
          parseInt(line.to.split('-')[1]),
          parseInt(line.to.split('-')[2]),
          grid
        );

        return (
          <line
            key={`trial-${layerIndex}-line-${line.id}`}
            x1={fromPos.x}
            y1={fromPos.y}
            x2={toPos.x}
            y2={toPos.y}
            stroke={line.color}
            strokeWidth={line.thickness === 'thick' ? 4 : 2}
            strokeLinecap="round"
          />
        );
      })}

      {/* Symbols */}
      {Object.values(elements.symbols).map((symbol: SymbolElement) => {
        const parsed = parseCellId(symbol.cellId, grid.gridType);
        if (!parsed) return null;

        const center = getCellCenter(parsed.row, parsed.col, grid);
        const size = cellSize * 0.3;

        // Simple circle/cross rendering for trial layers
        if (symbol.symbolType === 'circle' || symbol.symbolType === 'circle-large') {
          return (
            <circle
              key={`trial-${layerIndex}-symbol-${symbol.id}`}
              cx={center.x}
              cy={center.y}
              r={size}
              fill="none"
              stroke={symbol.color}
              strokeWidth={2}
            />
          );
        }

        if (symbol.symbolType === 'cross' || symbol.symbolType === 'x') {
          return (
            <g key={`trial-${layerIndex}-symbol-${symbol.id}`}>
              <line
                x1={center.x - size}
                y1={center.y - size}
                x2={center.x + size}
                y2={center.y + size}
                stroke={symbol.color}
                strokeWidth={2}
              />
              <line
                x1={center.x + size}
                y1={center.y - size}
                x2={center.x - size}
                y2={center.y + size}
                stroke={symbol.color}
                strokeWidth={2}
              />
            </g>
          );
        }

        return null;
      })}

      {/* Numbers */}
      {Object.values(elements.numbers).map((num: NumberElement) => {
        const parsed = parseCellId(num.cellId, grid.gridType);
        if (!parsed) return null;

        const center = getCellCenter(parsed.row, parsed.col, grid);

        return (
          <text
            key={`trial-${layerIndex}-number-${num.id}`}
            x={center.x}
            y={center.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={cellSize * 0.6}
            fill={num.color}
          >
            {num.value}
          </text>
        );
      })}
    </g>
  );
};

/**
 * Renders all trial stack layers with graduated opacity
 */
export const TrialStackLayer: React.FC = () => {
  const { trialStack, trialStage } = usePuzzleStore();

  // Only render if in trial mode
  if (trialStage === 0 || trialStack.length === 0) {
    return null;
  }

  // Calculate opacity for each layer
  // trialStack[0] is the base state (opacity 100%)
  // trialStack[1..n-1] are intermediate states (opacity 75%)
  // Current puzzle.answer is the latest (opacity 50%, rendered separately)
  const totalLayers = trialStack.length + 1; // +1 for current answer

  return (
    <>
      {trialStack.map((elements, index) => {
        let opacity: number;
        if (index === 0) {
          opacity = 1; // Base layer: 100%
        } else {
          opacity = 0.75; // Intermediate layers: 75%
        }

        return (
          <TrialLayer
            key={`trial-stack-${index}`}
            elements={elements}
            opacity={opacity}
            layerIndex={index}
          />
        );
      })}
    </>
  );
};
