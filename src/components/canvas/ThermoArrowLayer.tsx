/**
 * Thermo & Arrow Layer Component
 *
 * Renders Penpa-compatible thermometers and arrows.
 * - Thermometers: bulb + line indicating increasing values
 * - Arrows: circle + arrow line for sum constraints
 */

import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStoreContext';
import { getPenpaColor } from '../../types/penpaElements';
import type { GridPoints, Point } from '../../types/point';
import { PointType } from '../../types/point';

interface ThermoArrowLayerProps {
  gridPoints?: GridPoints;
  layer?: 'problem' | 'answer';
}

/**
 * Build a smooth path through cell centers
 */
function buildSmoothPath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const parts: string[] = [`M ${points[0].x} ${points[0].y}`];

  for (let i = 1; i < points.length; i++) {
    parts.push(`L ${points[i].x} ${points[i].y}`);
  }

  return parts.join(' ');
}

/**
 * Calculate arrow head points
 */
function getArrowHead(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  headLength: number = 10,
  headAngle: number = Math.PI / 6
): string {
  const angle = Math.atan2(toY - fromY, toX - fromX);

  const x1 = toX - headLength * Math.cos(angle - headAngle);
  const y1 = toY - headLength * Math.sin(angle - headAngle);
  const x2 = toX - headLength * Math.cos(angle + headAngle);
  const y2 = toY - headLength * Math.sin(angle + headAngle);

  return `M ${toX} ${toY} L ${x1} ${y1} M ${toX} ${toY} L ${x2} ${y2}`;
}

/**
 * Render a thermometer
 */
const ThermoElement: React.FC<{
  id: string;
  points: Point[];
  hasBulb: boolean;
  bulbColor: string;
  lineColor: string;
  bulbRadius?: number;
  lineWidth?: number;
}> = ({
  id,
  points,
  hasBulb,
  bulbColor,
  lineColor,
  bulbRadius = 12,
  lineWidth = 6,
}) => {
  if (points.length === 0) return null;

  const path = buildSmoothPath(points);

  return (
    <g className={`thermo thermo-${id}`}>
      {/* Thermo line */}
      <path
        d={path}
        fill="none"
        stroke={lineColor}
        strokeWidth={lineWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bulb */}
      {hasBulb && points.length > 0 && (
        <circle
          cx={points[0].x}
          cy={points[0].y}
          r={bulbRadius}
          fill={bulbColor}
          stroke={lineColor}
          strokeWidth={2}
        />
      )}
    </g>
  );
};

/**
 * Render an arrow constraint
 */
const ArrowElement: React.FC<{
  id: string;
  points: Point[];
  circleColor: string;
  arrowColor: string;
  circleRadius?: number;
  lineWidth?: number;
}> = ({
  id,
  points,
  circleColor,
  arrowColor,
  circleRadius = 14,
  lineWidth = 2,
}) => {
  if (points.length < 2) return null;

  const circlePoint = points[0];
  const arrowPoints = points.slice(1);
  const path = buildSmoothPath(arrowPoints);

  // Arrow head at the last point
  const lastIdx = arrowPoints.length - 1;
  const prevIdx = Math.max(0, lastIdx - 1);
  const arrowHead = getArrowHead(
    arrowPoints[prevIdx].x,
    arrowPoints[prevIdx].y,
    arrowPoints[lastIdx].x,
    arrowPoints[lastIdx].y
  );

  return (
    <g className={`arrow arrow-${id}`}>
      {/* Circle */}
      <circle
        cx={circlePoint.x}
        cy={circlePoint.y}
        r={circleRadius}
        fill="none"
        stroke={circleColor}
        strokeWidth={2}
      />
      {/* Arrow line */}
      <path
        d={path}
        fill="none"
        stroke={arrowColor}
        strokeWidth={lineWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Arrow head */}
      <path
        d={arrowHead}
        fill="none"
        stroke={arrowColor}
        strokeWidth={lineWidth}
        strokeLinecap="round"
      />
    </g>
  );
};

/**
 * Render a direction indicator
 */
const DirectionElement: React.FC<{
  id: string;
  cell: Point;
  angle: number;
  color: string;
  size?: number;
}> = ({ id, cell, angle, color, size = 16 }) => {
  const radians = (angle * Math.PI) / 180;
  const endX = cell.x + Math.cos(radians) * size;
  const endY = cell.y + Math.sin(radians) * size;

  const arrowHead = getArrowHead(cell.x, cell.y, endX, endY, 8);

  return (
    <g className={`direction direction-${id}`}>
      <line
        x1={cell.x}
        y1={cell.y}
        x2={endX}
        y2={endY}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d={arrowHead}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </g>
  );
};

/**
 * Render a polygon
 */
const PolygonElement: React.FC<{
  id: string;
  vertices: Point[];
  fillColor: string;
  strokeColor: string;
}> = ({ id, vertices, fillColor, strokeColor }) => {
  if (vertices.length < 3) return null;

  const pathData =
    vertices.map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x} ${v.y}`).join(' ') + ' Z';

  return (
    <path
      className={`polygon polygon-${id}`}
      d={pathData}
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={2}
      opacity={0.3}
    />
  );
};

/**
 * Render a square frame
 */
const SquareFrameElement: React.FC<{
  id: string;
  cells: Point[];
  color: string;
}> = ({ id, cells, color }) => {
  if (cells.length === 0) return null;

  // Find bounding box
  const xs = cells.map((c) => c.x);
  const ys = cells.map((c) => c.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // Expand slightly
  const padding = 5;

  return (
    <rect
      className={`frame frame-${id}`}
      x={minX - padding}
      y={minY - padding}
      width={maxX - minX + padding * 2}
      height={maxY - minY + padding * 2}
      fill="none"
      stroke={color}
      strokeWidth={2}
    />
  );
};

/**
 * Thermo & Arrow Layer
 */
export const ThermoArrowLayer: React.FC<ThermoArrowLayerProps> = ({
  gridPoints,
  layer = 'problem',
}) => {
  const { puzzle } = usePuzzleStore();

  const elements = useMemo(() => {
    if (!gridPoints) {
      return { thermos: [], arrows: [], directions: [], polygons: [], frames: [] };
    }

    const puzzleLayer = layer === 'problem' ? puzzle.problem : puzzle.answer;
    const specialElements = puzzleLayer.specials || {};

    const thermos: Array<{
      id: string;
      points: Point[];
      hasBulb: boolean;
      bulbColor: string;
      lineColor: string;
    }> = [];

    const arrows: Array<{
      id: string;
      points: Point[];
      circleColor: string;
      arrowColor: string;
    }> = [];

    const directions: Array<{
      id: string;
      cell: Point;
      angle: number;
      color: string;
    }> = [];

    const polygons: Array<{
      id: string;
      vertices: Point[];
      fillColor: string;
      strokeColor: string;
    }> = [];

    const frames: Array<{
      id: string;
      cells: Point[];
      color: string;
    }> = [];

    for (const [id, special] of Object.entries(specialElements)) {
      const color = getPenpaColor(special.color ?? 2);

      // Parse point indices
      const points: Point[] = [];
      for (const pointId of special.points || []) {
        const idx = typeof pointId === 'string' ? parseInt(pointId, 10) : pointId;
        if (!isNaN(idx) && gridPoints.points[idx]) {
          points.push(gridPoints.points[idx]);
        }
      }

      switch (special.type) {
        case 'thermo':
          thermos.push({
            id,
            points,
            hasBulb: true,
            bulbColor: '#cfcfcf',
            lineColor: color,
          });
          break;

        case 'arrow':
          arrows.push({
            id,
            points,
            circleColor: color,
            arrowColor: color,
          });
          break;

        case 'polygon':
          polygons.push({
            id,
            vertices: points,
            fillColor: color,
            strokeColor: color,
          });
          break;

        default:
          // Handle other types as generic
          break;
      }
    }

    return { thermos, arrows, directions, polygons, frames };
  }, [gridPoints, puzzle, layer]);

  return (
    <g className="thermo-arrow-layer">
      {/* Polygons first (background) */}
      {elements.polygons.map((p) => (
        <PolygonElement
          key={p.id}
          id={p.id}
          vertices={p.vertices}
          fillColor={p.fillColor}
          strokeColor={p.strokeColor}
        />
      ))}

      {/* Frames */}
      {elements.frames.map((f) => (
        <SquareFrameElement
          key={f.id}
          id={f.id}
          cells={f.cells}
          color={f.color}
        />
      ))}

      {/* Thermos */}
      {elements.thermos.map((t) => (
        <ThermoElement
          key={t.id}
          id={t.id}
          points={t.points}
          hasBulb={t.hasBulb}
          bulbColor={t.bulbColor}
          lineColor={t.lineColor}
        />
      ))}

      {/* Arrows */}
      {elements.arrows.map((a) => (
        <ArrowElement
          key={a.id}
          id={a.id}
          points={a.points}
          circleColor={a.circleColor}
          arrowColor={a.arrowColor}
        />
      ))}

      {/* Directions */}
      {elements.directions.map((d) => (
        <DirectionElement
          key={d.id}
          id={d.id}
          cell={d.cell}
          angle={d.angle}
          color={d.color}
        />
      ))}
    </g>
  );
};

export default ThermoArrowLayer;
