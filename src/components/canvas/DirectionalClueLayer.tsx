import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import { getCellCenter, getCellId } from '../../utils/gridUtils';
import type { LayerType, PuzzleElements } from '../../types';

// Direction constants (matches pzprjs/Penpa)
// NDIR = 0 (not used - direction type is 1|2|3|4)
const UP = 1;
const DN = 2;
const LT = 3;
const RT = 4;

// Unicode arrow style
const dirToArrow = (dir: number) => {
  switch (dir) {
    case UP: return '↑';
    case DN: return '↓';
    case LT: return '←';
    case RT: return '→';
    default: return '';
  }
};

// Polygon arrow path generator (compact style - fits within cell)
const getArrowPath = (
  dir: number,
  cellSize: number,
  _digitCount: number = 1
): string => {
  // Arrow dimensions - larger but still fits within cell
  const al = cellSize * 0.30;  // Arrow length
  const aw = cellSize * 0.03;  // Arrow width (shaft)
  const tl = cellSize * 0.02;  // Arrowhead length (smaller)
  const tw = cellSize * 0.10;  // Arrowhead width

  // Position arrow next to number, within cell bounds
  // For UP/DN: arrow on the right side of number
  // For LT/RT: arrow above the number
  const offsetX = cellSize * 0.30; // Horizontal offset for UP/DN arrows
  const offsetY = -cellSize * 0.30; // Vertical offset for LT/RT arrows

  switch (dir) {
    case UP:
      // Arrow pointing up, positioned to the right of number
      return `M ${offsetX} ${-al}
              L ${offsetX - tw} ${tl}
              L ${offsetX - aw} ${tl}
              L ${offsetX - aw} ${al}
              L ${offsetX + aw} ${al}
              L ${offsetX + aw} ${tl}
              L ${offsetX + tw} ${tl} Z`;
    case DN:
      // Arrow pointing down, positioned to the right of number
      return `M ${offsetX} ${al}
              L ${offsetX - tw} ${-tl}
              L ${offsetX - aw} ${-tl}
              L ${offsetX - aw} ${-al}
              L ${offsetX + aw} ${-al}
              L ${offsetX + aw} ${-tl}
              L ${offsetX + tw} ${-tl} Z`;
    case LT:
      // Arrow pointing left, positioned above number
      return `M ${-al} ${offsetY}
              L ${tl} ${offsetY - tw}
              L ${tl} ${offsetY - aw}
              L ${al} ${offsetY - aw}
              L ${al} ${offsetY + aw}
              L ${tl} ${offsetY + aw}
              L ${tl} ${offsetY + tw} Z`;
    case RT:
      // Arrow pointing right, positioned above number
      return `M ${al} ${offsetY}
              L ${-tl} ${offsetY - tw}
              L ${-tl} ${offsetY - aw}
              L ${-al} ${offsetY - aw}
              L ${-al} ${offsetY + aw}
              L ${-tl} ${offsetY + aw}
              L ${-tl} ${offsetY + tw} Z`;
    default:
      return '';
  }
};

// Get number offset based on direction (compact style - fits within cell)
const getNumberOffset = (dir: number, cellSize: number): { x: number; y: number } => {
  switch (dir) {
    case UP:
    case DN:
      // Number slightly left, arrow on right
      return { x: -cellSize * 0.12, y: 0 };
    case LT:
    case RT:
      // Number slightly below, arrow above
      return { x: 0, y: cellSize * 0.12 };
    default:
      return { x: 0, y: 0 };
  }
};

export type ArrowStyle = 'unicode' | 'polygon';

type DirectionalClueLayerProps = {
  layer: LayerType;
  arrowStyle?: ArrowStyle;
};

export const DirectionalClueLayer: React.FC<DirectionalClueLayerProps> = ({
  layer,
  arrowStyle = 'polygon'
}) => {
  const { grid, puzzle, showProblemLayer, showAnswerLayer, useTopology, topology } = usePuzzleStore();
  const isVisible = (layer === 'problem' && showProblemLayer) || (layer === 'answer' && showAnswerLayer);

  const elements = useMemo(() => {
    if (!isVisible) return null;
    const layerData: PuzzleElements = puzzle[layer];
    if (!layerData.directionalClues) return null;

    const nodes: React.ReactElement[] = [];
    Object.values(layerData.directionalClues).forEach((clue) => {
      const row = Math.floor(clue.cell / grid.cols);
      const col = clue.cell % grid.cols;
      if (row < 0 || col < 0 || row >= grid.rows || col >= grid.cols) return;

      // Get cell center position - use topology if available
      let center: { x: number; y: number };
      if (useTopology && topology) {
        const cellId = getCellId(row, col);
        const topoCell = topology.cells.get(cellId);
        if (topoCell) {
          center = { x: topoCell.center.x, y: topoCell.center.y };
        } else {
          center = getCellCenter(row, col, grid);
        }
      } else {
        center = getCellCenter(row, col, grid);
      }
      // Handle special values: -2 = "?" (hatena/unknown)
      const displayValue = clue.value === -2 ? '?' : String(clue.value);
      const digitCount = displayValue.length;
      const hasDirection = clue.direction >= UP && clue.direction <= RT;
      const fontSize = grid.cellSize * 0.5;

      if (!hasDirection) {
        // No direction - display as normal centered number
        nodes.push(
          <g key={`dirclue-${row}-${col}`} transform={`translate(${center.x},${center.y})`}>
            <text
              x={0}
              y={0}
              fill="#000"
              fontSize={fontSize}
              fontFamily="Helvetica, Verdana, Arial, sans-serif"
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {displayValue}
            </text>
          </g>
        );
      } else if (arrowStyle === 'polygon') {
        // pzprjs-style polygon arrow
        const offset = getNumberOffset(clue.direction, grid.cellSize);
        const arrowPath = getArrowPath(clue.direction, grid.cellSize, digitCount);

        nodes.push(
          <g key={`dirclue-${row}-${col}`} transform={`translate(${center.x},${center.y})`}>
            {/* Arrow polygon */}
            <path
              d={arrowPath}
              fill="#000"
            />
            {/* Number */}
            <text
              x={offset.x}
              y={offset.y}
              fill="#000"
              fontSize={fontSize * 0.85}
              fontFamily="Helvetica, Verdana, Arial, sans-serif"
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {displayValue}
            </text>
          </g>
        );
      } else {
        // Unicode arrow style (simple)
        nodes.push(
          <g key={`dirclue-${row}-${col}`} transform={`translate(${center.x},${center.y})`}>
            {/* Number above */}
            <text
              x={0}
              y={-fontSize * 0.25}
              fill="#000"
              fontSize={fontSize}
              fontFamily="Helvetica, Verdana, Arial, sans-serif"
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {displayValue}
            </text>
            {/* Unicode arrow below */}
            <text
              x={0}
              y={fontSize * 0.5}
              fill="#000"
              fontSize={fontSize * 0.65}
              fontFamily="Helvetica, Verdana, Arial, sans-serif"
              fontWeight="normal"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {dirToArrow(clue.direction)}
            </text>
          </g>
        );
      }
    });
    return nodes;
  }, [isVisible, puzzle, layer, grid, arrowStyle, useTopology, topology]);

  if (!elements) return null;
  return <g className={`directional-clue-layer ${layer}`}>{elements}</g>;
};
