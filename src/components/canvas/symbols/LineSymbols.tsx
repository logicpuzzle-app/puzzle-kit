/**
 * Line symbols (horizontal, vertical, diagonal lines and arrows)
 */

import React from 'react';
import type { SymbolProps } from './types';

export const LineSymbol: React.FC<SymbolProps> = ({ x, y, size, color, rotation }) => {
  // Use 0.5 to span full cell width (from edge to edge)
  const h = size * 0.5;
  return (
    <line
      x1={x - h}
      y1={y}
      x2={x + h}
      y2={y}
      stroke={color}
      strokeWidth={3}
      transform={rotation ? `rotate(${rotation} ${x} ${y})` : undefined}
    />
  );
};

// Diagonal line symbol - spans corner to corner
export const DiagonalLineSymbol: React.FC<SymbolProps> = ({ x, y, size, color, rotation }) => {
  // For diagonal to reach corners: h = size * 0.5 * sqrt(2) ≈ size * 0.707
  const h = size * 0.5;
  return (
    <line
      x1={x - h}
      y1={y - h}
      x2={x + h}
      y2={y + h}
      stroke={color}
      strokeWidth={3}
      transform={rotation ? `rotate(${rotation} ${x} ${y})` : undefined}
    />
  );
};

export const ArrowSymbol: React.FC<SymbolProps> = ({ x, y, size, color, rotation }) => {
  const h = size * 0.35;
  return (
    <g transform={`rotate(${rotation} ${x} ${y})`}>
      <line
        x1={x}
        y1={y + h}
        x2={x}
        y2={y - h}
        stroke={color}
        strokeWidth={2}
      />
      <polyline
        points={`${x - h * 0.5},${y - h * 0.3} ${x},${y - h} ${x + h * 0.5},${y - h * 0.3}`}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </g>
  );
};
