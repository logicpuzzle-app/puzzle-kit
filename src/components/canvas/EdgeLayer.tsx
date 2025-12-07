/**
 * Edge Layer Component
 *
 * Renders Penpa-compatible edge lines (lineE).
 * Edges connect vertices and can be diagonal or free-form.
 */

import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import {
  PenpaLineStyle,
  getLineStyleProps,
  getPenpaColor,
} from '../../types/penpaElements';
import type { GridPoints } from '../../types/point';
import type { LineThickness } from '../../types';

interface EdgeLayerProps {
  gridPoints?: GridPoints;
  layer?: 'problem' | 'answer';
}

/**
 * Get stroke width from thickness (same as LineLayer)
 */
const getStrokeWidth = (thickness?: LineThickness): number => {
  switch (thickness) {
    case 'thinnest':
      return 1;
    case 'thin':
      return 2;
    case 'normal':
      return 3;
    case 'thick':
      return 5;
    case 'thickest':
      return 8;
    default:
      return 3;
  }
};

/**
 * Render a single edge line
 */
const EdgeLine: React.FC<{
  from: { x: number; y: number };
  to: { x: number; y: number };
  style: PenpaLineStyle;
  thickness?: LineThickness;
  color?: string | number;
}> = ({ from, to, style, thickness, color }) => {
  const styleProps = getLineStyleProps(style);
  const strokeColor = getPenpaColor(color ?? 3); // Default to black
  const strokeWidth = thickness ? getStrokeWidth(thickness) : styleProps.strokeWidth;

  // Handle special styles
  if (style === PenpaLineStyle.X_MARK) {
    // Render X mark at midpoint
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const size = 6;

    return (
      <g>
        <line
          x1={midX - size}
          y1={midY - size}
          x2={midX + size}
          y2={midY + size}
          stroke={strokeColor}
          strokeWidth={2}
        />
        <line
          x1={midX + size}
          y1={midY - size}
          x2={midX - size}
          y2={midY + size}
          stroke={strokeColor}
          strokeWidth={2}
        />
      </g>
    );
  }

  if (style === PenpaLineStyle.DOUBLE) {
    // Render double line
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    const offset = 2; // Gap between lines

    // Perpendicular offset
    const px = (-dy / len) * offset;
    const py = (dx / len) * offset;

    return (
      <g>
        <line
          x1={from.x + px}
          y1={from.y + py}
          x2={to.x + px}
          y2={to.y + py}
          stroke={strokeColor}
          strokeWidth={styleProps.strokeWidth}
        />
        <line
          x1={from.x - px}
          y1={from.y - py}
          x2={to.x - px}
          y2={to.y - py}
          stroke={strokeColor}
          strokeWidth={styleProps.strokeWidth}
        />
      </g>
    );
  }

  if (style === PenpaLineStyle.DELETE) {
    // Don't render deleted lines
    return null;
  }

  return (
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeDasharray={styleProps.strokeDasharray}
      strokeLinecap="round"
    />
  );
};

/**
 * Edge Layer - renders all edge lines
 */
export const EdgeLayer: React.FC<EdgeLayerProps> = ({
  gridPoints,
  layer = 'problem',
}) => {
  const { puzzle } = usePuzzleStore();

  const edges = useMemo(() => {
    if (!gridPoints) return [];

    const puzzleLayer = layer === 'problem' ? puzzle.problem : puzzle.answer;
    const edgeElements = puzzleLayer.edges || {};

    return Object.entries(edgeElements).map(([id, edge]) => {
      let fromCoord: { x: number; y: number } | undefined;
      let toCoord: { x: number; y: number } | undefined;

      // Check if using Penpa-style numeric index format ("from,to")
      const penpaFromParts = edge.from.split(',').map(Number);
      if (penpaFromParts.length === 2 && !penpaFromParts.some(isNaN)) {
        const [fromIdx, toIdx] = penpaFromParts;
        const fromPoint = gridPoints.points[fromIdx];
        const toPoint = gridPoints.points[toIdx];
        if (fromPoint && toPoint) {
          fromCoord = { x: fromPoint.x, y: fromPoint.y };
          toCoord = { x: toPoint.x, y: toPoint.y };
        }
      }
      // Check if using vertex ID format ("vertex-r-c")
      else if (edge.from.startsWith('vertex-') && edge.to.startsWith('vertex-')) {
        const fromMatch = edge.from.match(/vertex-(\d+)-(\d+)/);
        const toMatch = edge.to.match(/vertex-(\d+)-(\d+)/);

        if (fromMatch && toMatch) {
          const fromRow = parseInt(fromMatch[1], 10);
          const fromCol = parseInt(fromMatch[2], 10);
          const toRow = parseInt(toMatch[1], 10);
          const toCol = parseInt(toMatch[2], 10);

          // Calculate vertex positions based on grid
          // Vertices are at cell corners, so vertex(r,c) is at top-left of cell(r,c)
          const { size, border } = gridPoints;
          fromCoord = {
            x: (border + fromCol) * size,
            y: (border + fromRow) * size,
          };
          toCoord = {
            x: (border + toCol) * size,
            y: (border + toRow) * size,
          };
        }
      }

      if (!fromCoord || !toCoord) {
        return null;
      }

      // Convert style string to PenpaLineStyle
      let penpaStyle = PenpaLineStyle.NORMAL;
      switch (edge.style) {
        case 'dotted':
          penpaStyle = PenpaLineStyle.DOTTED;
          break;
        case 'dashed':
          penpaStyle = PenpaLineStyle.DASHED;
          break;
        case 'double':
          penpaStyle = PenpaLineStyle.DOUBLE;
          break;
      }

      return {
        id,
        from: fromCoord,
        to: toCoord,
        style: penpaStyle,
        thickness: edge.thickness,
        color: edge.color,
      };
    }).filter(Boolean);
  }, [gridPoints, puzzle, layer]);

  return (
    <g className="edge-layer">
      {edges.map((edge) =>
        edge ? (
          <EdgeLine
            key={edge.id}
            from={edge.from}
            to={edge.to}
            style={edge.style}
            thickness={edge.thickness}
            color={edge.color}
          />
        ) : null
      )}
    </g>
  );
};

export default EdgeLayer;
