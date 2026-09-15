import type { SymbolProps } from './types';
import type { CornerSymbolType } from '../../../utils/cornerSymbols';

/** At 100%, the radius is one cell and the circle center is the named corner.
 * Size and user rotation act around the cell center, like other symbols.
 */
export function CornerSymbol({ type, x, y, size, color, fillColor, rotation }: SymbolProps & { type: CornerSymbolType }) {
  const half = size / 2;
  const corner = type.replace(/^(quarter|arc)-/, '');
  const angle = { 'top-left': 0, 'top-right': 90, 'bottom-right': 180, 'bottom-left': 270 }[corner] ?? 0;
  const sector = type.startsWith('quarter-');
  const curve = `M ${half} ${-half} A ${size} ${size} 0 0 1 ${-half} ${half}`;
  return <g data-corner-symbol={type} transform={`translate(${x} ${y}) rotate(${rotation + angle})`}>
    <path d={sector ? `${curve} L ${-half} ${-half} Z` : curve}
      fill={sector ? (fillColor ?? color) : 'none'} stroke={color} strokeWidth={2}
      strokeLinejoin="round" strokeLinecap="butt" />
  </g>;
}
