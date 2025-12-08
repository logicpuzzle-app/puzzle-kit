/**
 * Special symbols (mine, bulb, etc.)
 */

import React from 'react';
import type { SymbolProps } from './types';

// Mine/Bomb symbol (circle with radiating lines)
export const MineSymbol: React.FC<SymbolProps> = ({ x, y, size, color, rotation }) => {
  const r = size * 0.25;
  const spikeR = size * 0.38;
  const spikes = 8;
  return (
    <g transform={rotation ? `rotate(${rotation} ${x} ${y})` : undefined}>
      {/* Central filled circle */}
      <circle cx={x} cy={y} r={r} fill={color} />
      {/* Radiating spikes */}
      {Array.from({ length: spikes }).map((_, i) => {
        const angle = (i * 360 / spikes) * (Math.PI / 180);
        const x1 = x + r * 0.8 * Math.cos(angle);
        const y1 = y + r * 0.8 * Math.sin(angle);
        const x2 = x + spikeR * Math.cos(angle);
        const y2 = y + spikeR * Math.sin(angle);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
          />
        );
      })}
      {/* Highlight */}
      <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.2} fill="white" opacity={0.6} />
    </g>
  );
};

// Light bulb symbol
export const BulbSymbol: React.FC<SymbolProps> = ({ x, y, size, color, rotation }) => {
  const bulbR = size * 0.22;
  const baseW = size * 0.18;
  const baseH = size * 0.18;
  return (
    <g transform={rotation ? `rotate(${rotation} ${x} ${y})` : undefined}>
      {/* Bulb glass part */}
      <circle cx={x} cy={y - size * 0.08} r={bulbR} fill="none" stroke={color} strokeWidth={2} />
      {/* Base/screw part */}
      <rect
        x={x - baseW / 2}
        y={y + bulbR * 1.0}
        width={baseW}
        height={baseH}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        rx={1}
      />
      {/* Filament */}
      <path
        d={`M ${x - bulbR * 0.3} ${y + size * 0.06}
            Q ${x} ${y - size * 0.04} ${x + bulbR * 0.3} ${y + size * 0.06}`}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Light rays \|/ pattern - detached from bulb */}
      <line x1={x - bulbR * 1.8} y1={y - size * 0.32} x2={x - bulbR * 1.4} y2={y - size * 0.22} stroke={color} strokeWidth={1.5} />
      <line x1={x} y1={y - size * 0.45} x2={x} y2={y - size * 0.35} stroke={color} strokeWidth={1.5} />
      <line x1={x + bulbR * 1.8} y1={y - size * 0.32} x2={x + bulbR * 1.4} y2={y - size * 0.22} stroke={color} strokeWidth={1.5} />
    </g>
  );
};
