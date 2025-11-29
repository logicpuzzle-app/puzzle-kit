import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import { parseCellId, getCellCenter } from '../../utils/gridUtils';
import type { CageElement, SpecialElement, LayerType, GridConfig } from '../../types';

interface SpecialLayerProps {
  layer: LayerType;
}

// Cage rendering - draws a border around a group of cells
const CageRenderer: React.FC<{ cage: CageElement; grid: GridConfig }> = ({
  cage,
  grid,
}) => {
  const { cellSize, outerPadding } = grid;
  const offset = 3; // Inset from cell edge

  // Build path around cage cells
  const pathData = useMemo(() => {
    if (cage.cells.length === 0) return '';

    // Get all cell positions
    const cellPositions = cage.cells
      .map((cellId) => parseCellId(cellId, grid.gridType))
      .filter((p): p is { row: number; col: number } => p !== null);

    if (cellPositions.length === 0) return '';

    // Create a set for quick lookup
    const cellSet = new Set(cellPositions.map((p) => `${p.row},${p.col}`));

    // Build edge segments
    const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];

    for (const cell of cellPositions) {
      const x = outerPadding + cell.col * cellSize;
      const y = outerPadding + cell.row * cellSize;

      // Check each edge
      // Top edge
      if (!cellSet.has(`${cell.row - 1},${cell.col}`)) {
        segments.push({
          x1: x + offset,
          y1: y + offset,
          x2: x + cellSize - offset,
          y2: y + offset,
        });
      }
      // Bottom edge
      if (!cellSet.has(`${cell.row + 1},${cell.col}`)) {
        segments.push({
          x1: x + offset,
          y1: y + cellSize - offset,
          x2: x + cellSize - offset,
          y2: y + cellSize - offset,
        });
      }
      // Left edge
      if (!cellSet.has(`${cell.row},${cell.col - 1}`)) {
        segments.push({
          x1: x + offset,
          y1: y + offset,
          x2: x + offset,
          y2: y + cellSize - offset,
        });
      }
      // Right edge
      if (!cellSet.has(`${cell.row},${cell.col + 1}`)) {
        segments.push({
          x1: x + cellSize - offset,
          y1: y + offset,
          x2: x + cellSize - offset,
          y2: y + cellSize - offset,
        });
      }
    }

    return segments;
  }, [cage.cells, cellSize, outerPadding]);

  if (!pathData || pathData.length === 0) return null;

  const strokeDasharray = cage.style === 'dashed' ? '5,3' : undefined;

  return (
    <g>
      {pathData.map((seg, i) => (
        <line
          key={i}
          x1={seg.x1}
          y1={seg.y1}
          x2={seg.x2}
          y2={seg.y2}
          stroke={cage.color}
          strokeWidth={1.5}
          strokeDasharray={strokeDasharray}
        />
      ))}
      {/* Label in top-left of first cell */}
      {cage.label && cage.cells[0] && (() => {
        const firstCell = parseCellId(cage.cells[0], grid.gridType);
        if (!firstCell) return null;
        const x = outerPadding + firstCell.col * cellSize + 5;
        const y = outerPadding + firstCell.row * cellSize + 12;
        return (
          <text
            x={x}
            y={y}
            fill={cage.color}
            fontSize={10}
            fontFamily="Helvetica, Verdana, Arial, sans-serif"
          >
            {cage.label}
          </text>
        );
      })()}
    </g>
  );
};

// Thermo rendering - bulb at start, tapering line
const ThermoRenderer: React.FC<{
  special: SpecialElement;
  grid: GridConfig;
}> = ({ special, grid }) => {
  const { cellSize } = grid;

  const points = useMemo(() => {
    return special.points
      .map((pointId) => {
        const parsed = parseCellId(pointId, grid.gridType);
        if (!parsed) return null;
        return getCellCenter(parsed.row, parsed.col, grid);
      })
      .filter((p): p is { x: number; y: number } => p !== null);
  }, [special.points, grid]);

  if (points.length < 2) return null;

  // Build path
  const pathD = points.reduce((acc, p, i) => {
    return acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
  }, '');

  const bulbRadius = cellSize * 0.35;

  return (
    <g>
      {/* Thermo line */}
      <path
        d={pathD}
        fill="none"
        stroke={special.color}
        strokeWidth={cellSize * 0.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.5}
      />
      {/* Bulb at start */}
      <circle
        cx={points[0].x}
        cy={points[0].y}
        r={bulbRadius}
        fill={special.color}
        opacity={0.5}
      />
    </g>
  );
};

// Arrow rendering - circle at start with arrow head
const ArrowRenderer: React.FC<{
  special: SpecialElement;
  grid: GridConfig;
}> = ({ special, grid }) => {
  const { cellSize } = grid;

  const points = useMemo(() => {
    return special.points
      .map((pointId) => {
        const parsed = parseCellId(pointId, grid.gridType);
        if (!parsed) return null;
        return getCellCenter(parsed.row, parsed.col, grid);
      })
      .filter((p): p is { x: number; y: number } => p !== null);
  }, [special.points, grid]);

  if (points.length < 2) return null;

  // Build path for arrow body
  const pathD = points.slice(1).reduce((acc, p, i) => {
    const prev = i === 0 ? points[0] : points[i];
    return acc + (i === 0 ? `M ${prev.x} ${prev.y}` : '') + ` L ${p.x} ${p.y}`;
  }, `M ${points[0].x} ${points[0].y}`);

  const circleRadius = cellSize * 0.35;

  // Arrow head at end
  const lastPoint = points[points.length - 1];
  const prevPoint = points[points.length - 2];
  const angle = Math.atan2(lastPoint.y - prevPoint.y, lastPoint.x - prevPoint.x);
  const headLength = cellSize * 0.15;
  const headAngle = Math.PI / 6;

  const arrowHead = [
    {
      x: lastPoint.x - headLength * Math.cos(angle - headAngle),
      y: lastPoint.y - headLength * Math.sin(angle - headAngle),
    },
    lastPoint,
    {
      x: lastPoint.x - headLength * Math.cos(angle + headAngle),
      y: lastPoint.y - headLength * Math.sin(angle + headAngle),
    },
  ];

  return (
    <g>
      {/* Circle at start */}
      <circle
        cx={points[0].x}
        cy={points[0].y}
        r={circleRadius}
        fill="none"
        stroke={special.color}
        strokeWidth={2}
      />
      {/* Arrow body */}
      <path
        d={pathD}
        fill="none"
        stroke={special.color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Arrow head */}
      <polyline
        points={arrowHead.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke={special.color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
};

// Polygon rendering
const PolygonRenderer: React.FC<{
  special: SpecialElement;
  grid: GridConfig;
}> = ({ special, grid }) => {
  const points = useMemo(() => {
    return special.points
      .map((pointId) => {
        const parsed = parseCellId(pointId, grid.gridType);
        if (!parsed) return null;
        return getCellCenter(parsed.row, parsed.col, grid);
      })
      .filter((p): p is { x: number; y: number } => p !== null);
  }, [special.points, grid]);

  if (points.length < 3) return null;

  const pointsStr = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <polygon
      points={pointsStr}
      fill={special.color}
      fillOpacity={0.3}
      stroke={special.color}
      strokeWidth={2}
    />
  );
};

export const SpecialLayer: React.FC<SpecialLayerProps> = ({ layer }) => {
  const { grid, puzzle, showProblemLayer, showAnswerLayer } = usePuzzleStore();

  const isVisible =
    (layer === 'problem' && showProblemLayer) ||
    (layer === 'answer' && showAnswerLayer);

  const cages = useMemo(() => {
    if (!isVisible) return null;

    const layerData = puzzle[layer];
    return Object.values(layerData.cages).map((cage: CageElement) => (
      <CageRenderer key={cage.id} cage={cage} grid={grid} />
    ));
  }, [puzzle, layer, grid, isVisible]);

  const specials = useMemo(() => {
    if (!isVisible) return null;

    const layerData = puzzle[layer];
    return Object.values(layerData.specials).map((special: SpecialElement) => {
      switch (special.type) {
        case 'thermo':
          return <ThermoRenderer key={special.id} special={special} grid={grid} />;
        case 'arrow':
          return <ArrowRenderer key={special.id} special={special} grid={grid} />;
        case 'polygon':
          return <PolygonRenderer key={special.id} special={special} grid={grid} />;
        default:
          return null;
      }
    });
  }, [puzzle, layer, grid, isVisible]);

  if (!isVisible) return null;

  return (
    <g className={`special-layer-${layer}`}>
      {cages}
      {specials}
    </g>
  );
};
