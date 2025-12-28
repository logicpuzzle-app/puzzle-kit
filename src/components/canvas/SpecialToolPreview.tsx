/**
 * SpecialToolPreview - Renders preview for special tools (thermo, arrow, cage, boxline)
 */

import React from 'react';
import type { Point } from '../../types';

interface SpecialPreviewCell {
  center: Point;
  polygon: Point[];
  cellId: string;
}

interface SpecialToolPreviewProps {
  canvas: {
    zoom: number;
    panX: number;
    panY: number;
  };
  offsetX?: number;
  offsetY?: number;
  specialToolType: 'thermo' | 'arrow' | 'cage' | 'boxline' | null;
  specialPreviewPoints: Point[];
  specialPreviewCells: SpecialPreviewCell[];
  color: string;
}

export const SpecialToolPreview: React.FC<SpecialToolPreviewProps> = ({
  canvas,
  offsetX = 0,
  offsetY = 0,
  specialToolType,
  specialPreviewPoints,
  specialPreviewCells,
  color,
}) => {
  if (!specialToolType || specialPreviewPoints.length < 1) {
    return null;
  }

  const transform = `translate(${canvas.panX}, ${canvas.panY}) scale(${canvas.zoom}) translate(${offsetX}, ${offsetY})`;

  return (
    <g data-preview="true" transform={transform}>
      <g opacity={0.5} pointerEvents="none">
        {specialToolType === 'thermo' && (
          <>
            {/* Thermo line preview */}
            {specialPreviewPoints.length >= 1 && (
              <path
                d={`M ${specialPreviewPoints.map((p) => `${p.x} ${p.y}`).join(' L ')}`}
                fill="none"
                stroke={color}
                strokeWidth={6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {/* Thermo bulb preview */}
            <circle
              cx={specialPreviewPoints[0].x}
              cy={specialPreviewPoints[0].y}
              r={12}
              fill="#cfcfcf"
              stroke={color}
              strokeWidth={2}
            />
          </>
        )}

        {specialToolType === 'arrow' && specialPreviewPoints.length >= 1 && (
          <>
            {/* Arrow circle preview */}
            <circle
              cx={specialPreviewPoints[0].x}
              cy={specialPreviewPoints[0].y}
              r={14}
              fill="none"
              stroke={color}
              strokeWidth={2}
            />
            {/* Arrow line preview */}
            {specialPreviewPoints.length >= 2 && (
              <>
                <path
                  d={`M ${specialPreviewPoints.map((p) => `${p.x} ${p.y}`).join(' L ')}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Arrow head */}
                {(() => {
                  const lastIdx = specialPreviewPoints.length - 1;
                  const prevIdx = Math.max(0, lastIdx - 1);
                  const from = specialPreviewPoints[prevIdx];
                  const to = specialPreviewPoints[lastIdx];
                  const angle = Math.atan2(to.y - from.y, to.x - from.x);
                  const headLength = 10;
                  const headAngle = Math.PI / 6;
                  const x1 = to.x - headLength * Math.cos(angle - headAngle);
                  const y1 = to.y - headLength * Math.sin(angle - headAngle);
                  const x2 = to.x - headLength * Math.cos(angle + headAngle);
                  const y2 = to.y - headLength * Math.sin(angle + headAngle);
                  return (
                    <path
                      d={`M ${to.x} ${to.y} L ${x1} ${y1} M ${to.x} ${to.y} L ${x2} ${y2}`}
                      fill="none"
                      stroke={color}
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  );
                })()}
              </>
            )}
          </>
        )}

        {specialToolType === 'cage' && specialPreviewCells.length >= 1 && (
          <CagePreview cells={specialPreviewCells} color={color} />
        )}

        {specialToolType === 'boxline' && specialPreviewCells.length >= 1 && (
          <BoxLinePreview cells={specialPreviewCells} color={color} />
        )}
      </g>
    </g>
  );
};

// Cage preview helper
const CagePreview: React.FC<{ cells: SpecialPreviewCell[]; color: string }> = ({ cells, color }) => {
  const INSET_SCALE = 0.85;
  const pathParts: string[] = [];

  // Build a map of edge midpoints to check for shared edges
  const edgeMidpointCount = new Map<string, number>();

  // First pass: count how many cells share each edge
  cells.forEach((cell) => {
    const { polygon } = cell;
    if (polygon.length < 3) return;

    for (let i = 0; i < polygon.length; i++) {
      const v1 = polygon[i];
      const v2 = polygon[(i + 1) % polygon.length];
      const midX = Math.round((v1.x + v2.x) / 2 * 100) / 100;
      const midY = Math.round((v1.y + v2.y) / 2 * 100) / 100;
      const key = `${midX},${midY}`;
      edgeMidpointCount.set(key, (edgeMidpointCount.get(key) || 0) + 1);
    }
  });

  // Second pass: draw edges that are not shared
  cells.forEach((cell) => {
    const { center, polygon } = cell;
    if (polygon.length < 3) return;

    // Scale polygon inward
    const scaledPolygon = polygon.map(p => ({
      x: center.x + (p.x - center.x) * INSET_SCALE,
      y: center.y + (p.y - center.y) * INSET_SCALE,
    }));

    for (let i = 0; i < polygon.length; i++) {
      const v1 = polygon[i];
      const v2 = polygon[(i + 1) % polygon.length];
      const midX = Math.round((v1.x + v2.x) / 2 * 100) / 100;
      const midY = Math.round((v1.y + v2.y) / 2 * 100) / 100;
      const key = `${midX},${midY}`;

      if ((edgeMidpointCount.get(key) || 0) <= 1) {
        const sv1 = scaledPolygon[i];
        const sv2 = scaledPolygon[(i + 1) % scaledPolygon.length];
        pathParts.push(`M ${sv1.x} ${sv1.y} L ${sv2.x} ${sv2.y}`);
      }
    }
  });

  return (
    <path
      d={pathParts.join(' ')}
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeDasharray="4,4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
};

// BoxLine preview helper
const BoxLinePreview: React.FC<{ cells: SpecialPreviewCell[]; color: string }> = ({ cells, color }) => {
  const SCALE = 0.9;
  const elements: React.ReactNode[] = [];

  const scalePolygon = (polygon: Point[], center: Point) =>
    polygon.map(p => ({
      x: center.x + (p.x - center.x) * SCALE,
      y: center.y + (p.y - center.y) * SCALE,
    }));

  const edgeMidpointKeySet = (polygon: Point[]) => {
    const keys = new Set<string>();
    for (let i = 0; i < polygon.length; i++) {
      const v1 = polygon[i];
      const v2 = polygon[(i + 1) % polygon.length];
      const midX = Math.round((v1.x + v2.x) / 2 * 100) / 100;
      const midY = Math.round((v1.y + v2.y) / 2 * 100) / 100;
      keys.add(`${midX},${midY}`);
    }
    return keys;
  };

  const areAdjacent = (c1: SpecialPreviewCell, c2: SpecialPreviewCell) => {
    if (c1.polygon.length < 3 || c2.polygon.length < 3) return false;
    const s1 = edgeMidpointKeySet(c1.polygon);
    const s2 = edgeMidpointKeySet(c2.polygon);
    for (const k of s1) {
      if (s2.has(k)) return true;
    }
    return false;
  };

  // Draw connections first
  for (let i = 0; i < cells.length - 1; i++) {
    const currCell = cells[i];
    const nextCell = cells[i + 1];

    if (!areAdjacent(currCell, nextCell)) continue;

    const curr = currCell.center;
    const next = nextCell.center;
    const currScaled = scalePolygon(currCell.polygon, curr);
    const nextScaled = scalePolygon(nextCell.polygon, next);

    const currClosest = [...currScaled]
      .map((p, idx) => ({ p, idx, dist: Math.hypot(p.x - next.x, p.y - next.y) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 2);
    const nextClosest = [...nextScaled]
      .map((p, idx) => ({ p, idx, dist: Math.hypot(p.x - curr.x, p.y - curr.y) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 2);

    const angle = Math.atan2(next.y - curr.y, next.x - curr.x);
    const perpAngle = angle + Math.PI / 2;
    const sortByPerp = (a: Point, b: Point) => {
      const aDot = (a.x - curr.x) * Math.cos(perpAngle) + (a.y - curr.y) * Math.sin(perpAngle);
      const bDot = (b.x - curr.x) * Math.cos(perpAngle) + (b.y - curr.y) * Math.sin(perpAngle);
      return aDot - bDot;
    };

    const currSorted = [...currClosest].sort((a, b) => sortByPerp(a.p, b.p));
    const nextSorted = [...nextClosest].sort((a, b) => sortByPerp(a.p, b.p));

    const connPoints = [
      currSorted[0].p,
      currSorted[1].p,
      nextSorted[1].p,
      nextSorted[0].p,
    ];

    elements.push(
      <polygon
        key={`conn-${i}`}
        points={connPoints.map(p => `${p.x},${p.y}`).join(' ')}
        fill={color}
      />
    );
  }

  // Draw scaled polygons for each cell
  cells.forEach((cell, i) => {
    const scaledPoints = scalePolygon(cell.polygon, cell.center);
    elements.push(
      <polygon
        key={`box-${i}`}
        points={scaledPoints.map(p => `${p.x},${p.y}`).join(' ')}
        fill={color}
      />
    );
  });

  return <>{elements}</>;
};

export default SpecialToolPreview;
