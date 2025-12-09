/**
 * Arrow symbols based on penpa-edit arrow drawing
 * Uses the same parameter format: len1, len2, w1, w2, ri
 */

import React from 'react';
import type { SymbolProps } from './types';

interface ArrowParams {
  len1: number;  // Distance from center to arrow base (ratio of size)
  len2: number;  // Distance from center to arrow tip (ratio of size)
  w1: number;    // Width of arrow shaft (ratio of size)
  w2: number;    // Width of arrow head (ratio of size)
  ri: number;    // Indent of arrow head (negative = indent, 0 = flat, positive = protrude)
}

// Generate arrow path points based on penpa-edit algorithm
const generateArrowPath = (
  size: number,
  { len1, len2, w1, w2, ri }: ArrowParams
): string => {
  const s = size;
  // Arrow points from left (base) to right (tip)
  // Base at -len1, tip at +len2
  const points: [number, number][] = [];

  // Start at base left
  points.push([-len1 * s, 0]);
  // Shaft top
  points.push([-len1 * s, w1 * s]);
  // Arrow head indent top (ri is offset from tip)
  points.push([(len2 + ri) * s, w1 * s]);
  // Arrow head wing top
  points.push([(len2 + ri) * s, w2 * s]);
  // Tip
  points.push([len2 * s, 0]);
  // Arrow head wing bottom
  points.push([(len2 + ri) * s, -w2 * s]);
  // Arrow head indent bottom
  points.push([(len2 + ri) * s, -w1 * s]);
  // Shaft bottom
  points.push([-len1 * s, -w1 * s]);
  // Close path
  points.push([-len1 * s, 0]);

  return points.map(([x, y]) => `${x},${y}`).join(' ');
};

// Base arrow component
// Arrow path is generated pointing right, but we offset by -90° so:
// rotation=0 → up, rotation=90 → right, rotation=180 → down, rotation=270 → left
const ArrowBase: React.FC<SymbolProps & { params: ArrowParams; fillColor?: string }> = ({
  x, y, size, color, rotation = 0, params, fillColor
}) => {
  const path = generateArrowPath(size, params);
  const fill = fillColor || color;
  const stroke = fillColor === 'white' || fillColor === '#fff' || fillColor === '#ffffff' ? color : 'none';
  const strokeWidth = fillColor === 'white' || fillColor === '#fff' || fillColor === '#ffffff' ? 1.5 : 0;
  // Offset by -90° so rotation=0 points up
  const adjustedRotation = rotation - 90;

  return (
    <polygon
      points={path}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      transform={`translate(${x}, ${y}) rotate(${adjustedRotation})`}
    />
  );
};

// Arrow B (Bold/Fat) - thick arrow
// penpa params: len1=0.38, len2=0.4, w1=0.2, w2=0.4, ri=-0.4
export const ArrowBSymbol: React.FC<SymbolProps> = (props) => {
  const params: ArrowParams = { len1: 0.38, len2: 0.4, w1: 0.2, w2: 0.4, ri: -0.4 };
  return <ArrowBase {...props} params={params} />;
};

// Arrow N (Narrow) - thin arrow
// penpa params: len1=0.38, len2=0.4, w1=0.03, w2=0.13, ri=-0.25
export const ArrowNSymbol: React.FC<SymbolProps> = (props) => {
  const params: ArrowParams = { len1: 0.38, len2: 0.4, w1: 0.03, w2: 0.13, ri: -0.25 };
  return <ArrowBase {...props} params={params} />;
};

// Arrow S (Simple/Small)
// penpa params: len1=0.3, len2=0.32, w1=0.02, w2=0.12, ri=-0.2
export const ArrowSSymbol: React.FC<SymbolProps> = (props) => {
  const params: ArrowParams = { len1: 0.3, len2: 0.32, w1: 0.02, w2: 0.12, ri: -0.2 };
  return <ArrowBase {...props} params={params} />;
};

// Arrow Short
// penpa params: len1=0.3, len2=0.3, w1=0.15, w2=0.31, ri=-0.33
export const ArrowShortSymbol: React.FC<SymbolProps> = (props) => {
  const params: ArrowParams = { len1: 0.3, len2: 0.3, w1: 0.15, w2: 0.31, ri: -0.33 };
  return <ArrowBase {...props} params={params} />;
};

// Arrow Triangle
// penpa params: len1=0.25, len2=0.4, w1=0, w2=0.35, ri=0
export const ArrowTriSymbol: React.FC<SymbolProps> = (props) => {
  const params: ArrowParams = { len1: 0.25, len2: 0.4, w1: 0, w2: 0.35, ri: 0 };
  return <ArrowBase {...props} params={params} />;
};

// Arrow GP - special shape with curve
// Offset by -90° so rotation=0 points up
export const ArrowGPSymbol: React.FC<SymbolProps> = ({ x, y, size, color, rotation = 0 }) => {
  const s = size;
  // Simplified GP arrow shape (pointing right)
  const d = `M ${-0.35*s} 0
             L ${-0.33*s} ${0.12*s}
             L ${-0.12*s} ${0.12*s}
             L ${-0.12*s} ${0.23*s}
             L ${0.35*s} 0
             L ${-0.12*s} ${-0.23*s}
             L ${-0.12*s} ${-0.12*s}
             L ${-0.33*s} ${-0.12*s} Z`;
  const adjustedRotation = rotation - 90;

  return (
    <path
      d={d}
      fill={color}
      transform={`translate(${x}, ${y}) rotate(${adjustedRotation})`}
    />
  );
};

// Arrow GP with Circle
// Offset by -90° so rotation=0 points up
export const ArrowGPCSymbol: React.FC<SymbolProps> = ({ x, y, size, color, rotation = 0 }) => {
  const r = size * 0.2;
  const adjustedRotation = rotation - 90;
  const offsetX = Math.cos(adjustedRotation * Math.PI / 180) * size * 0.3;
  const offsetY = Math.sin(adjustedRotation * Math.PI / 180) * size * 0.3;

  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={2} />
      <ArrowGPSymbol x={x + offsetX} y={y + offsetY} size={size * 0.7} color={color} rotation={rotation} />
    </g>
  );
};

// Arrow Cross (4-way arrows) - supports custom angles via directionAngles
export const ArrowCrossSymbol: React.FC<SymbolProps & { directions?: boolean[]; directionAngles?: number[] }> = ({
  x, y, size, color, directions, directionAngles
}) => {
  const params: ArrowParams = { len1: 0.01, len2: 0.45, w1: 0.025, w2: 0.12, ri: -0.18 };

  // If directionAngles provided, use them for custom topology-based angles
  if (directionAngles && directionAngles.length > 0) {
    const dirs = directions ?? directionAngles.map(() => true);
    return (
      <g>
        {directionAngles.map((angle, i) =>
          dirs[i] && <ArrowBase key={i} x={x} y={y} size={size} color={color} rotation={angle} params={params} />
        )}
      </g>
    );
  }

  // Default 4-way with fixed angles
  const defaultDirs = directions ?? [true, true, true, true];
  const defaultAngles = [0, 90, 180, 270]; // 0=up, clockwise

  return (
    <g>
      {defaultAngles.map((angle, i) =>
        defaultDirs[i] && <ArrowBase key={i} x={x} y={y} size={size} color={color} rotation={angle} params={params} />
      )}
    </g>
  );
};

// Arrow Eight (8-way arrows) - supports custom angles via directionAngles
export const ArrowEightSymbol: React.FC<SymbolProps & { directions?: boolean[]; directionAngles?: number[] }> = ({
  x, y, size, color, directions, directionAngles
}) => {
  const params: ArrowParams = { len1: -0.2, len2: 0.45, w1: 0.025, w2: 0.1, ri: -0.15 };

  // If directionAngles provided, use them for custom topology-based angles
  if (directionAngles && directionAngles.length > 0) {
    const dirs = directions ?? directionAngles.map(() => true);
    return (
      <g>
        {directionAngles.map((angle, i) =>
          dirs[i] && <ArrowBase key={i} x={x} y={y} size={size} color={color} rotation={angle} params={params} />
        )}
      </g>
    );
  }

  // Default 8-way with fixed angles
  const defaultDirs = directions ?? [true, true, true, true, true, true, true, true];
  const paramsDiag: ArrowParams = { len1: -0.26, len2: 0.54, w1: 0.025, w2: 0.1, ri: -0.15 };
  const defaultAngles = [0, 45, 90, 135, 180, 225, 270, 315]; // 0=up, clockwise

  return (
    <g>
      {defaultAngles.map((angle, i) =>
        defaultDirs[i] && <ArrowBase key={i} x={x} y={y} size={size} color={color} rotation={angle} params={i % 2 === 1 ? paramsDiag : params} />
      )}
    </g>
  );
};

// Arrow Four Tip - tips pointing outward from edges - supports custom angles
export const ArrowFourTipSymbol: React.FC<SymbolProps & { directions?: boolean[]; directionAngles?: number[] }> = ({
  x, y, size, color, directions, directionAngles
}) => {
  const params: ArrowParams = { len1: 0.5, len2: -0.25, w1: 0, w2: 0.15, ri: 0 };

  // If directionAngles provided, use them for custom topology-based angles
  if (directionAngles && directionAngles.length > 0) {
    const dirs = directions ?? directionAngles.map(() => true);
    return (
      <g>
        {directionAngles.map((angle, i) =>
          dirs[i] && <ArrowBase key={i} x={x} y={y} size={size} color={color} rotation={angle} params={params} />
        )}
      </g>
    );
  }

  // Default 4-way with fixed angles
  const defaultDirs = directions ?? [true, true, true, true];
  const defaultAngles = [0, 90, 180, 270]; // 0=up, clockwise

  return (
    <g>
      {defaultAngles.map((angle, i) =>
        defaultDirs[i] && <ArrowBase key={i} x={x} y={y} size={size} color={color} rotation={angle} params={params} />
      )}
    </g>
  );
};

// Arrow Four Edge - arrows on each edge pointing outward - supports custom angles
export const ArrowFourEdgeSymbol: React.FC<SymbolProps & { directions?: boolean[]; directionAngles?: number[] }> = ({
  x, y, size, color, directions, directionAngles
}) => {
  const s = size * 0.4;
  const offset = size * 0.35;

  // Small triangle pointing in a direction
  const triangle = (angle: number) => {
    const rad = (angle - 90) * Math.PI / 180; // -90 because 0=up
    const ox = Math.cos(rad) * offset;
    const oy = Math.sin(rad) * offset;
    return (
      <polygon
        points={`0,${-s*0.4} ${s*0.3},${s*0.2} ${-s*0.3},${s*0.2}`}
        fill={color}
        stroke="none"
        transform={`translate(${x + ox}, ${y + oy}) rotate(${angle})`}
      />
    );
  };

  // If directionAngles provided, use them for custom topology-based angles
  if (directionAngles && directionAngles.length > 0) {
    const dirs = directions ?? directionAngles.map(() => true);
    return (
      <g>
        {directionAngles.map((angle, i) =>
          dirs[i] && <React.Fragment key={i}>{triangle(angle)}</React.Fragment>
        )}
      </g>
    );
  }

  // Default 4-way with fixed angles
  const defaultDirs = directions ?? [true, true, true, true];
  const defaultAngles = [0, 90, 180, 270]; // 0=up, clockwise

  return (
    <g>
      {defaultAngles.map((angle, i) =>
        defaultDirs[i] && <React.Fragment key={i}>{triangle(angle)}</React.Fragment>
      )}
    </g>
  );
};

// Double Arrow
export const ArrowDoubleSymbol: React.FC<SymbolProps> = ({ x, y, size, color, rotation = 0 }) => {
  const params: ArrowParams = { len1: 0, len2: 0.4, w1: 0.03, w2: 0.13, ri: -0.25 };

  return (
    <g>
      <ArrowBase x={x} y={y} size={size} color={color} rotation={rotation} params={params} />
      <ArrowBase x={x} y={y} size={size} color={color} rotation={rotation + 180} params={params} />
    </g>
  );
};
