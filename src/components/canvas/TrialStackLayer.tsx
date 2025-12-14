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
import { getCellCenter, getCellIndexById, getEdgeIndexById, getEdgePosition, getVertexIndexById, getVertexPosition } from '../../utils/gridUtils';
import type { PuzzleElements, SurfaceElement, EdgeElement, LineElement, SymbolElement, NumberElement } from '../../types';
import type { TopologyVertex } from '../../utils/gridTopology';
import { getEdgeLineDrawInfo } from '../../utils/gridTopology';

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

        const index = getCellIndexById(surface.cellId, grid);
        if (!index) return null;

        const center = getCellCenter(index.row, index.col, grid);

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
        if (useTopology && topology) {
          if (edge.edgeId) {
            const drawInfo = getEdgeLineDrawInfo(topology, edge.edgeId);
            if (!drawInfo) return null;
            return (
              <line
                key={`trial-${layerIndex}-edge-${edge.id}`}
                x1={drawInfo.startVertex.x}
                y1={drawInfo.startVertex.y}
                x2={drawInfo.endVertex.x}
                y2={drawInfo.endVertex.y}
                stroke={edge.color}
                strokeWidth={edge.thickness === 'thick' ? 4 : 2}
                strokeLinecap="round"
              />
            );
          }

          if (!edge.from || !edge.to) return null;

          const fromVertex = topology.vertices.get(edge.from);
          const toVertex = topology.vertices.get(edge.to);
          if (!fromVertex || !toVertex) return null;

          return (
            <line
              key={`trial-${layerIndex}-edge-${edge.id}`}
              x1={fromVertex.position.x}
              y1={fromVertex.position.y}
              x2={toVertex.position.x}
              y2={toVertex.position.y}
              stroke={edge.color}
              strokeWidth={edge.thickness === 'thick' ? 4 : 2}
              strokeLinecap="round"
            />
          );
        }

        if (edge.edgeId) {
          const edgeIndex = getEdgeIndexById(edge.edgeId, grid);
          if (!edgeIndex) return null;
          const fromVertex = getVertexPosition(edgeIndex.row, edgeIndex.col, grid);
          const toVertex =
            edgeIndex.type === 'h'
              ? getVertexPosition(edgeIndex.row, edgeIndex.col + 1, grid)
              : getVertexPosition(edgeIndex.row + 1, edgeIndex.col, grid);

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
        }

        if (!edge.from || !edge.to) return null;

        const fromIndex = getVertexIndexById(edge.from, grid);
        const toIndex = getVertexIndexById(edge.to, grid);
        if (!fromIndex || !toIndex) return null;

        const fromVertex = getVertexPosition(fromIndex.row, fromIndex.col, grid);
        const toVertex = getVertexPosition(toIndex.row, toIndex.col, grid);

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
        if (line.edgeId) {
          // Best-effort rendering for edgeId-based lines.
          if (useTopology && topology) {
            const drawInfo = getEdgeLineDrawInfo(topology, line.edgeId);
            if (!drawInfo) return null;

            const lineTarget = line.lineTarget ?? 'cell';
            const fromPos =
              lineTarget === 'edge' || lineTarget === 'wall'
                ? drawInfo.startVertex
                : drawInfo.adjacentCellCenters[0] ?? null;
            const toPos =
              lineTarget === 'edge' || lineTarget === 'wall'
                ? drawInfo.endVertex
                : drawInfo.adjacentCellCenters[1] ?? null;

            if (!fromPos || !toPos) return null;
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
          }

          const edgeIndex = getEdgeIndexById(line.edgeId, grid);
          if (!edgeIndex) return null;

          // Default to cell-center rendering in grid mode.
          const fromCellId =
            edgeIndex.type === 'h'
              ? `cell-${edgeIndex.row - 1}-${edgeIndex.col}`
              : `cell-${edgeIndex.row}-${edgeIndex.col - 1}`;
          const toCellId =
            edgeIndex.type === 'h'
              ? `cell-${edgeIndex.row}-${edgeIndex.col}`
              : `cell-${edgeIndex.row}-${edgeIndex.col}`;

          const fromIndex = getCellIndexById(fromCellId, grid);
          const toIndex = getCellIndexById(toCellId, grid);
          if (!fromIndex || !toIndex) return null;
          const fromPos = getCellCenter(fromIndex.row, fromIndex.col, grid);
          const toPos = getCellCenter(toIndex.row, toIndex.col, grid);

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
        }

        if (!line.from || !line.to) return null;

        const fromPos = (() => {
          if (useTopology && topology) {
            return topology.cells.get(line.from)?.center ?? null;
          }
          const index = getCellIndexById(line.from, grid);
          return index ? getCellCenter(index.row, index.col, grid) : null;
        })();

        const toPos = (() => {
          if (useTopology && topology) {
            return topology.cells.get(line.to)?.center ?? null;
          }
          const index = getCellIndexById(line.to, grid);
          return index ? getCellCenter(index.row, index.col, grid) : null;
        })();

        if (!fromPos || !toPos) return null;

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
        const center = (() => {
          if (useTopology && topology) {
            const cell = topology.cells.get(symbol.cellId);
            if (cell) return cell.center;
            const vertex = topology.vertices.get(symbol.cellId);
            if (vertex) return vertex.position;
            const edge = topology.edges.get(symbol.cellId);
            if (edge) return edge.midpoint;
            return null;
          }

          if (symbol.cellId.startsWith('vertex-')) {
            const index = getVertexIndexById(symbol.cellId, grid);
            return index ? getVertexPosition(index.row, index.col, grid) : null;
          }
          if (symbol.cellId.startsWith('edge-')) {
            const edgeIndex = getEdgeIndexById(symbol.cellId, grid);
            return edgeIndex ? getEdgePosition(edgeIndex.type, edgeIndex.row, edgeIndex.col, grid) : null;
          }

          const index = getCellIndexById(symbol.cellId, grid);
          return index ? getCellCenter(index.row, index.col, grid) : null;
        })();

        if (!center) return null;
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
        const center = (() => {
          if (useTopology && topology) {
            return topology.cells.get(num.cellId)?.center ?? null;
          }
          const index = getCellIndexById(num.cellId, grid);
          return index ? getCellCenter(index.row, index.col, grid) : null;
        })();

        if (!center) return null;

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
