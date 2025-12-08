/**
 * Mark symbols (cross, plus, minus, dot, check)
 */

import React from 'react';
import type { SymbolProps } from './types';

export const CrossSymbol: React.FC<SymbolProps> = ({ x, y, size, color, rotation }) => {
  const h = size * 0.2;
  return (
    <g transform={rotation ? `rotate(${rotation} ${x} ${y})` : undefined}>
      <line x1={x - h} y1={y - h} x2={x + h} y2={y + h} stroke={color} strokeWidth={2} />
      <line x1={x + h} y1={y - h} x2={x - h} y2={y + h} stroke={color} strokeWidth={2} />
    </g>
  );
};

export const PlusSymbol: React.FC<SymbolProps> = ({ x, y, size, color }) => {
  const h = size * 0.3;
  return (
    <g>
      <line x1={x - h} y1={y} x2={x + h} y2={y} stroke={color} strokeWidth={2} />
      <line x1={x} y1={y - h} x2={x} y2={y + h} stroke={color} strokeWidth={2} />
    </g>
  );
};

export const MinusSymbol: React.FC<SymbolProps> = ({ x, y, size, color }) => {
  const h = size * 0.3;
  return <line x1={x - h} y1={y} x2={x + h} y2={y} stroke={color} strokeWidth={2} />;
};

export const DotSymbol: React.FC<SymbolProps> = ({ x, y, size, color }) => (
  <circle cx={x} cy={y} r={size * 0.1} fill={color} />
);

export const CheckSymbol: React.FC<SymbolProps> = ({ x, y, size, color }) => {
  const h = size * 0.3;
  return (
    <polyline
      points={`${x - h},${y} ${x - h * 0.3},${y + h * 0.6} ${x + h},${y - h * 0.5}`}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
};
