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
import type { GridPoints, Point } from '../../types/point';

interface EdgeLayerProps {
  gridPoints?: GridPoints;
  layer?: 'problem' | 'answer';
}

/**
 * Render a single edge line
 */
const EdgeLine: React.FC<{
  from: Point;
  to: Point;
  style: PenpaLineStyle;
  color?: string | number;
}> = ({ from, to, style, color }) => {
  const styleProps = getLineStyleProps(style);
  const strokeColor = getPenpaColor(color ?? 3); // Default to black

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
      strokeWidth={styleProps.strokeWidth}
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
      // Parse edge key (format: "from,to")
      const parts = edge.from.split(',').map(Number);
      if (parts.length !== 2 || parts.some(isNaN)) {
        return null;
      }

      const [fromIdx, toIdx] = parts;
      const fromPoint = gridPoints.points[fromIdx];
      const toPoint = gridPoints.points[toIdx];

      if (!fromPoint || !toPoint) {
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
        default:
          // Check thickness for bold styles
          if (edge.thickness === 'thick') {
            penpaStyle = PenpaLineStyle.BOLD;
          }
      }

      return {
        id,
        from: fromPoint,
        to: toPoint,
        style: penpaStyle,
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
            color={edge.color}
          />
        ) : null
      )}
    </g>
  );
};

export default EdgeLayer;
