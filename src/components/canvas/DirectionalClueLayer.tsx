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

/**
 * Generalized arrow rendering for arbitrary angles.
 *
 * Arrow position follows pzprjs-style layout:
 * - 0° (→): TOP (270°)
 * - 90° (↓): RIGHT (0°/360°)
 * - 180° (←): TOP (270°)
 * - 270° (↑): RIGHT (0°/360°)
 *
 * For angles between:
 * - 0°-90°: moves from TOP (270°) to RIGHT (360°) - upper-right quadrant
 * - 90°-180°: moves from LEFT (180°) to TOP (270°) - upper-left quadrant (mirrored)
 * - 180°-270°: moves from TOP (270°) to RIGHT (360°) - upper-right quadrant
 * - 270°-360°: moves from LEFT (180°) to TOP (270°) - upper-left quadrant (mirrored)
 *
 * This creates left-right symmetry around the vertical axis.
 */

// Map arrow direction to position angle
const mapToPositionAngle = (arrowAngle: number): number => {
  // Normalize to 0-360
  const normalized = ((arrowAngle % 360) + 360) % 360;

  // Arrow position layout:
  // - 0° (→): TOP (270°)
  // - 90° (↓): RIGHT (360°)
  // - 180° (←): TOP (270°)
  // - 270° (↑): RIGHT (360°)
  //
  // Quadrants (using half-open intervals to handle boundaries correctly):
  // - [0, 90): upper-right arc, TOP (270°) → RIGHT (360°)
  // - [90, 180): upper-left arc (mirrored), RIGHT mirror=LEFT (180°) → TOP (270°)
  // - [180, 270): upper-right arc, TOP (270°) → RIGHT (360°)
  // - [270, 360): upper-left arc (mirrored), RIGHT mirror=LEFT (180°) → TOP (270°)
  //
  // Note: At 90°, the arrow is at RIGHT (360°). Immediately after 90°,
  // we switch to the mirrored quadrant starting at LEFT (180°).

  // Handle exact boundaries to ensure 90° and 270° map to RIGHT (360°)
  if (normalized === 90 || normalized === 270) {
    return 360; // RIGHT position
  }

  // Determine which quadrant we're in
  const quadrant = Math.floor(normalized / 90);
  const angleInQuadrant = normalized % 90;
  const progress = angleInQuadrant / 90;

  if (quadrant === 0 || quadrant === 2) {
    // [0, 90) or [180, 270): upper-right arc
    // 0° → 270° (top), approaching 90° → 360° (right)
    return 270 + 90 * progress;
  } else {
    // (90, 180) or (270, 360): upper-left arc (mirrored)
    // Just after 90° → 180° (left), approaching 180° → 270° (top)
    return 180 + 90 * progress;
  }
};

// Get arrow position for arbitrary angle
const getArrowPositionForAngle = (arrowAngle: number, cellSize: number): { x: number; y: number } => {
  const positionAngle = mapToPositionAngle(arrowAngle);
  const rad = (positionAngle * Math.PI) / 180;
  const radius = cellSize * 0.28;
  return {
    x: Math.cos(rad) * radius,
    y: Math.sin(rad) * radius,
  };
};

// Get number offset based on arrow position
// When arrow is at top (270°), shift number down
// When arrow is at right (0°/360°), shift number left
const getNumberOffsetForAngle = (arrowAngle: number, cellSize: number): { x: number; y: number } => {
  const positionAngle = mapToPositionAngle(arrowAngle);
  // Calculate offset in opposite direction of arrow position
  const rad = (positionAngle * Math.PI) / 180;
  const offset = cellSize * 0.10;
  return {
    x: -Math.cos(rad) * offset,
    y: -Math.sin(rad) * offset,
  };
};

// Arrow path generator for arbitrary angle
// Creates the same arrow shape as existing getArrowPath, pointing right (0°)
// Will be rotated by the arrow angle at render time
const getArrowPathForAngle = (cellSize: number): string => {
  // Same dimensions as existing arrows
  const al = cellSize * 0.30;  // Arrow length
  const aw = cellSize * 0.03;  // Arrow width (shaft)
  const tl = cellSize * 0.02;  // Arrowhead length
  const tw = cellSize * 0.10;  // Arrowhead width

  // Arrow pointing right (0°), centered at origin
  return `M ${al} 0
          L ${-tl} ${-tw}
          L ${-tl} ${-aw}
          L ${-al} ${-aw}
          L ${-al} ${aw}
          L ${-tl} ${aw}
          L ${-tl} ${tw} Z`;
};

// Convert preset direction to angle (0=right, 90=down, 180=left, 270=up)
const directionToAngle = (dir: number): number => {
  switch (dir) {
    case UP: return 270;
    case DN: return 90;
    case LT: return 180;
    case RT: return 0;
    default: return 0;
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
      const hasArbitraryAngle = clue.angle !== null && clue.angle !== undefined;
      const fontSize = grid.cellSize * 0.5;

      if (hasArbitraryAngle || hasDirection) {
        // Use generalized arrow rendering for both arbitrary angles and preset directions
        const angle = hasArbitraryAngle ? clue.angle! : directionToAngle(clue.direction);
        const arrowPath = getArrowPathForAngle(grid.cellSize);
        const arrowPos = getArrowPositionForAngle(angle, grid.cellSize);
        const numberOffset = getNumberOffsetForAngle(angle, grid.cellSize);

        nodes.push(
          <g key={`dirclue-${row}-${col}`} transform={`translate(${center.x},${center.y})`}>
            {/* Number offset based on arrow position */}
            <text
              x={numberOffset.x}
              y={numberOffset.y}
              fill="#000"
              fontSize={fontSize * 0.85}
              fontFamily="Helvetica, Verdana, Arial, sans-serif"
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {displayValue}
            </text>
            {/* Arrow positioned on upper-right arc, rotated to point in direction */}
            <path
              d={arrowPath}
              fill="#000"
              transform={`translate(${arrowPos.x},${arrowPos.y}) rotate(${angle})`}
            />
          </g>
        );
      } else {
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
      }
    });
    return nodes;
  }, [isVisible, puzzle, layer, grid, arrowStyle, useTopology, topology]);

  if (!elements) return null;
  return <g className={`directional-clue-layer ${layer}`}>{elements}</g>;
};
