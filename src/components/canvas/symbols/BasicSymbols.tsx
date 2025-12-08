/**
 * Basic geometric symbols (circles, squares, triangles, etc.)
 */

import React from 'react';
import type { SymbolProps } from './types';

export const CircleSymbol: React.FC<SymbolProps> = ({ x, y, size, color, fillColor }) => (
  <circle
    cx={x}
    cy={y}
    r={size * 0.4}
    fill={fillColor || 'none'}
    stroke={color}
    strokeWidth={2}
  />
);

export const FilledCircleSymbol: React.FC<SymbolProps> = ({ x, y, size, color }) => (
  <circle cx={x} cy={y} r={size * 0.35} fill={color} />
);

export const DoubleCircleSymbol: React.FC<SymbolProps> = ({ x, y, size, color }) => (
  <g>
    <circle cx={x} cy={y} r={size * 0.4} fill="none" stroke={color} strokeWidth={2} />
    <circle cx={x} cy={y} r={size * 0.25} fill="none" stroke={color} strokeWidth={2} />
  </g>
);

export const SquareSymbol: React.FC<SymbolProps> = ({ x, y, size, color, fillColor, rotation }) => (
  <rect
    x={x - size * 0.35}
    y={y - size * 0.35}
    width={size * 0.7}
    height={size * 0.7}
    fill={fillColor || 'none'}
    stroke={color}
    strokeWidth={2}
    transform={rotation ? `rotate(${rotation} ${x} ${y})` : undefined}
  />
);

export const RoundedSquareSymbol: React.FC<SymbolProps> = ({ x, y, size, color, fillColor, rotation }) => {
  const s = size * 0.65;
  const r = size * 0.2;
  return (
    <rect
      x={x - s / 2}
      y={y - s / 2}
      width={s}
      height={s}
      rx={r}
      ry={r}
      fill={fillColor || 'none'}
      stroke={color}
      strokeWidth={2}
      transform={rotation ? `rotate(${rotation} ${x} ${y})` : undefined}
    />
  );
};

export const DoubleSquareSymbol: React.FC<SymbolProps> = ({ x, y, size, color }) => (
  <g>
    <rect x={x - size * 0.35} y={y - size * 0.35} width={size * 0.7} height={size * 0.7} fill="none" stroke={color} strokeWidth={2} />
    <rect x={x - size * 0.2} y={y - size * 0.2} width={size * 0.4} height={size * 0.4} fill="none" stroke={color} strokeWidth={2} />
  </g>
);

export const TriangleSymbol: React.FC<SymbolProps> = ({ x, y, size, color, fillColor, rotation }) => {
  const h = size * 0.35;
  const points = `${x},${y - h} ${x - h},${y + h * 0.6} ${x + h},${y + h * 0.6}`;
  return (
    <polygon
      points={points}
      fill={fillColor || 'none'}
      stroke={color}
      strokeWidth={2}
      transform={rotation ? `rotate(${rotation} ${x} ${y})` : undefined}
    />
  );
};

export const DiamondSymbol: React.FC<SymbolProps> = ({ x, y, size, color, fillColor, rotation }) => {
  const h = size * 0.4;
  const points = `${x},${y - h} ${x + h},${y} ${x},${y + h} ${x - h},${y}`;
  return (
    <polygon
      points={points}
      fill={fillColor || 'none'}
      stroke={color}
      strokeWidth={2}
      transform={rotation ? `rotate(${rotation} ${x} ${y})` : undefined}
    />
  );
};

export const StarSymbol: React.FC<SymbolProps> = ({ x, y, size, color, fillColor, rotation }) => {
  const outer = size * 0.4;
  const inner = size * 0.2;
  const points: string[] = [];
  for (let i = 0; i < 5; i++) {
    const outerAngle = (i * 72 - 90) * (Math.PI / 180);
    const innerAngle = ((i * 72 + 36) - 90) * (Math.PI / 180);
    points.push(`${x + outer * Math.cos(outerAngle)},${y + outer * Math.sin(outerAngle)}`);
    points.push(`${x + inner * Math.cos(innerAngle)},${y + inner * Math.sin(innerAngle)}`);
  }
  return (
    <polygon
      points={points.join(' ')}
      fill={fillColor || 'none'}
      stroke={color}
      strokeWidth={1.5}
      transform={rotation ? `rotate(${rotation} ${x} ${y})` : undefined}
    />
  );
};

export const HexagonSymbol: React.FC<SymbolProps> = ({ x, y, size, color, fillColor }) => {
  const r = size * 0.35;
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 - 30) * (Math.PI / 180);
    points.push(`${x + r * Math.cos(angle)},${y + r * Math.sin(angle)}`);
  }
  return (
    <polygon points={points.join(' ')} fill={fillColor || 'none'} stroke={color} strokeWidth={2} />
  );
};

export const PentagonSymbol: React.FC<SymbolProps> = ({ x, y, size, color, fillColor }) => {
  const r = size * 0.35;
  const points: string[] = [];
  for (let i = 0; i < 5; i++) {
    const angle = (i * 72 - 90) * (Math.PI / 180);
    points.push(`${x + r * Math.cos(angle)},${y + r * Math.sin(angle)}`);
  }
  return (
    <polygon points={points.join(' ')} fill={fillColor || 'none'} stroke={color} strokeWidth={2} />
  );
};

export const CubeSymbol: React.FC<SymbolProps> = ({ x, y, size, color, fillColor, rotation }) => {
  const half = size * 0.28;
  const depth = size * 0.18;

  const topPoints = [
    `${x - half},${y - half + depth}`,
    `${x},${y - half - depth}`,
    `${x + half},${y - half + depth}`,
    `${x},${y + depth}`,
  ].join(' ');

  const frontPoints = [
    `${x - half},${y - half + depth}`,
    `${x + half},${y - half + depth}`,
    `${x + half},${y + half + depth}`,
    `${x - half},${y + half + depth}`,
  ].join(' ');

  const sidePoints = [
    `${x + half},${y - half + depth}`,
    `${x + half + depth},${y - depth}`,
    `${x + half + depth},${y + half}`,
    `${x + half},${y + half + depth}`,
  ].join(' ');

  const faceFill = fillColor || 'none';

  return (
    <g transform={rotation ? `rotate(${rotation} ${x} ${y})` : undefined}>
      <polygon points={topPoints} fill={faceFill} stroke={color} strokeWidth={2} />
      <polygon points={sidePoints} fill={faceFill} stroke={color} strokeWidth={2} />
      <polygon points={frontPoints} fill={faceFill} stroke={color} strokeWidth={2} />
    </g>
  );
};
