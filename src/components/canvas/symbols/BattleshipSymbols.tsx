import type { SymbolProps } from './types';
import type { BattleshipSymbolType } from '../../../utils/battleshipSymbols';

// Geometry follows Penpa's standard fleet (class_square.js, 34e3fe9).
// Attribution and MIT license: docs/licenses/penpa-edit.txt.
export function BattleshipSymbol({ type, x, y, size, color, fillColor, rotation }: SymbolProps & { type: BattleshipSymbolType }) {
  const r = size * 0.36;
  const direction = { ship_top: 0, ship_right: 90, ship_bottom: 180, ship_left: 270 };
  let shape;
  if (type === 'ship_single') {
    shape = <circle r={size * 0.4} />;
  } else if (type === 'ship_middle_h' || type === 'ship_middle_v') {
    shape = <rect x={-r} y={-r} width={2 * r} height={2 * r} />;
  } else if (type === 'ship_dot') {
    shape = <circle r={size * 0.05} fill={color} stroke="none" />;
  } else if (type === 'water') {
    // SVG waves keep water visible in image exports without depending on a font.
    shape = <g fill="none" strokeLinecap="round">
      {[-0.2, 0, 0.2].map(offset => (
        <path key={offset} d={`M ${-r} ${size * offset}
          q ${r / 2} ${-size * 0.16} ${r} 0
          t ${r} 0`} />
      ))}
    </g>;
  } else {
    shape = <path transform={`rotate(${direction[type]})`}
      d={`M ${-r} ${r} V 0 A ${r} ${r} 0 0 1 ${r} 0 V ${r} Z`} />;
  }
  return <g data-battleship={type} transform={`translate(${x} ${y}) rotate(${rotation})`}
    fill={fillColor ?? color} stroke={color} strokeWidth={2} strokeLinejoin="round">
    {shape}
  </g>;
}
