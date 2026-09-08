/**
 * Text and Unicode symbols
 */

import React from 'react';
import { layoutCellText } from '../../../utils/textSymbols';
import type { SymbolProps, TextSymbolProps } from './types';

// Generic Unicode symbol renderer
export const UnicodeSymbol: React.FC<SymbolProps & { char: string }> = ({ x, y, size, color, char, rotation }) => (
  <text
    x={x}
    y={y}
    fill={color}
    fontSize={size * 0.7}
    textAnchor="middle"
    dominantBaseline="central"
    fontFamily="'Segoe UI Symbol', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif"
    transform={rotation ? `rotate(${rotation} ${x} ${y})` : undefined}
  >
    {char}
  </text>
);

// Text symbol component for displaying text characters
export const TextSymbol: React.FC<TextSymbolProps> = ({ x, y, size, color, text, rotation }) => {
  const { lines, fontSize, lineHeight } = layoutCellText(text, size);

  return (
    <text
      x={x}
      y={y}
      fill={color}
      fontSize={fontSize}
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily="Helvetica, Verdana, Arial, sans-serif"
      fontWeight="500"
      transform={rotation ? `rotate(${rotation} ${x} ${y})` : undefined}
    >
      {lines.map((line, index) => (
        <tspan key={index} x={x} y={y + (index - (lines.length - 1) / 2) * lineHeight}>{line || '\u00a0'}</tspan>
      ))}
    </text>
  );
};

// Symbol to Unicode character mapping for symbols that are best rendered as text
export const UNICODE_SYMBOLS: Record<string, string> = {
  // Arrows
  'arrow-up': '↑',
  'arrow-down': '↓',
  'arrow-left': '←',
  'arrow-right': '→',
  'arrow-ne': '↗',
  'arrow-se': '↘',
  'arrow-sw': '↙',
  'arrow-nw': '↖',
  'arrow-double-h': '↔',
  'arrow-double-v': '↕',
  'arrow-thick-up': '⬆',
  'arrow-thick-down': '⬇',
  'arrow-thick-left': '⬅',
  'arrow-thick-right': '➡',
  // Inequality
  'lt': '<',
  'gt': '>',
  'le': '≤',
  'ge': '≥',
  'eq': '=',
  'ne': '≠',
  'caret-up': '∧',
  'caret-down': '∨',
  // Special
  'sun': '☀',
  'moon': '☾',
  'cloud': '☁',
  'heart': '♥',
  'heart-empty': '♡',
  'spade': '♠',
  'spade-empty': '♤',
  'club': '♣',
  'club-empty': '♧',
  'diamond-card': '♦',
  'diamond-card-empty': '♢',
  'music': '♪',
  'flag': '⚑',
  // mine and bulb are rendered as SVG components
  // Marks
  'question': '?',
  'exclamation': '!',
};
