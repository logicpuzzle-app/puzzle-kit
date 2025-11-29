import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import { parseCellId, getCellCenter, getCellCorners } from '../../utils/gridUtils';
import type { NumberElement, LayerType } from '../../types';

interface NumberLayerProps {
  layer: LayerType;
}

const getFontSize = (size: 'large' | 'medium' | 'small', cellSize: number): number => {
  switch (size) {
    case 'large':
      return cellSize * 0.7;
    case 'medium':
      return cellSize * 0.5;
    case 'small':
      return cellSize * 0.3;
    default:
      return cellSize * 0.5;
  }
};

type DominantBaseline = 'auto' | 'middle' | 'hanging' | 'ideographic';

export const NumberLayer: React.FC<NumberLayerProps> = ({ layer }) => {
  const { grid, puzzle, showProblemLayer, showAnswerLayer } = usePuzzleStore();
  const { cellSize } = grid;

  const isVisible =
    (layer === 'problem' && showProblemLayer) ||
    (layer === 'answer' && showAnswerLayer);

  const numbers = useMemo(() => {
    if (!isVisible) return null;

    const layerData = puzzle[layer];
    const elements: React.ReactElement[] = [];

    Object.values(layerData.numbers).forEach((num: NumberElement) => {
      const parsed = parseCellId(num.cellId, grid.gridType);
      if (!parsed) return;

      const center = getCellCenter(parsed.row, parsed.col, grid);
      const corners = getCellCorners(parsed.row, parsed.col, grid);
      const fontSize = getFontSize(num.size, cellSize);

      let x = center.x;
      let y = center.y;
      let textAnchor: 'start' | 'middle' | 'end' = 'middle';
      let dominantBaseline: DominantBaseline = 'middle';

      if (num.position === 'candidates' && num.candidates && num.candidates.length > 0) {
        // Legacy: Render candidates from candidates array in a 3x3 grid
        const candidateFontSize = cellSize * 0.22;
        const gridSize = cellSize * 0.85;
        const cellOffset = gridSize / 3;
        const startX = center.x - gridSize / 2 + cellOffset / 2;
        const startY = center.y - gridSize / 2 + cellOffset / 2;

        num.candidates.forEach((candidate) => {
          if (candidate >= 1 && candidate <= 9) {
            const col = (candidate - 1) % 3;
            const row = Math.floor((candidate - 1) / 3);
            const candX = startX + col * cellOffset;
            const candY = startY + row * cellOffset;

            elements.push(
              <text
                key={`${num.id}-${candidate}`}
                x={candX}
                y={candY}
                fill={num.color}
                fontSize={candidateFontSize}
                fontFamily="Helvetica, Verdana, Arial, sans-serif"
                fontWeight="normal"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {candidate}
              </text>
            );
          }
        });
      } else if (num.position === 'candidates' && num.value) {
        // New: Single candidate value stored as separate NumberElement
        const candidateNum = parseInt(num.value, 10);
        if (candidateNum >= 1 && candidateNum <= 9) {
          const candidateFontSize = cellSize * 0.22;
          const gridSize = cellSize * 0.85;
          const cellOffset = gridSize / 3;
          const startX = center.x - gridSize / 2 + cellOffset / 2;
          const startY = center.y - gridSize / 2 + cellOffset / 2;

          const col = (candidateNum - 1) % 3;
          const row = Math.floor((candidateNum - 1) / 3);
          const candX = startX + col * cellOffset;
          const candY = startY + row * cellOffset;

          elements.push(
            <text
              key={num.id}
              x={candX}
              y={candY}
              fill={num.color}
              fontSize={candidateFontSize}
              fontFamily="Helvetica, Verdana, Arial, sans-serif"
              fontWeight="normal"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {candidateNum}
            </text>
          );
        }
      } else if (num.position === 'corner' && num.cornerIndex !== undefined) {
        const cornerOffset = cellSize * 0.2;
        switch (num.cornerIndex) {
          case 0: // top-left
            x = corners[0].x + cornerOffset;
            y = corners[0].y + cornerOffset;
            textAnchor = 'start';
            dominantBaseline = 'hanging';
            break;
          case 1: // top-right
            x = corners[1].x - cornerOffset;
            y = corners[1].y + cornerOffset;
            textAnchor = 'end';
            dominantBaseline = 'hanging';
            break;
          case 2: // bottom-left
            x = corners[3].x + cornerOffset;
            y = corners[3].y - cornerOffset;
            textAnchor = 'start';
            dominantBaseline = 'ideographic';
            break;
          case 3: // bottom-right
            x = corners[2].x - cornerOffset;
            y = corners[2].y - cornerOffset;
            textAnchor = 'end';
            dominantBaseline = 'ideographic';
            break;
        }
        elements.push(
          <text
            key={num.id}
            x={x}
            y={y}
            fill={num.color}
            fontSize={fontSize}
            fontFamily="Helvetica, Verdana, Arial, sans-serif"
            fontWeight={layer === 'problem' ? 'bold' : 'normal'}
            textAnchor={textAnchor}
            dominantBaseline={dominantBaseline}
          >
            {num.value}
          </text>
        );
      } else if (num.position === 'side' && num.sideIndex !== undefined) {
        switch (num.sideIndex) {
          case 0: // top
            y = corners[0].y + cellSize * 0.15;
            dominantBaseline = 'hanging';
            break;
          case 1: // right
            x = corners[1].x - cellSize * 0.15;
            textAnchor = 'end';
            break;
          case 2: // bottom
            y = corners[2].y - cellSize * 0.15;
            dominantBaseline = 'ideographic';
            break;
          case 3: // left
            x = corners[0].x + cellSize * 0.15;
            textAnchor = 'start';
            break;
        }
        elements.push(
          <text
            key={num.id}
            x={x}
            y={y}
            fill={num.color}
            fontSize={fontSize}
            fontFamily="Helvetica, Verdana, Arial, sans-serif"
            fontWeight={layer === 'problem' ? 'bold' : 'normal'}
            textAnchor={textAnchor}
            dominantBaseline={dominantBaseline}
          >
            {num.value}
          </text>
        );
      } else {
        // Center position - add small vertical offset to visually center the number
        const yOffset = fontSize * 0.05;
        elements.push(
          <text
            key={num.id}
            x={x}
            y={y + yOffset}
            fill={num.color}
            fontSize={fontSize}
            fontFamily="Helvetica, Verdana, Arial, sans-serif"
            fontWeight={layer === 'problem' ? 'bold' : 'normal'}
            textAnchor={textAnchor}
            dominantBaseline={dominantBaseline}
          >
            {num.value}
          </text>
        );
      }
    });

    return elements;
  }, [puzzle, layer, grid, cellSize, isVisible]);

  if (!isVisible) return null;

  return (
    <g
      className={`number-layer-${layer}`}
      style={{ userSelect: 'none', pointerEvents: 'none' }}
    >
      {numbers}
    </g>
  );
};
