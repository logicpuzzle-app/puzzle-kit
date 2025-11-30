import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import { parseCellId, getCellCenter } from '../../utils/gridUtils';
import type { CageElement, SpecialElement, LayerType, GridConfig } from '../../types';
import type { GridTopology, TopologyVertex } from '../../utils/gridTopology';

interface SpecialLayerProps {
  layer: LayerType;
}

// Cage rendering - draws a border around a group of cells
const CageRenderer: React.FC<{
  cage: CageElement;
  grid: GridConfig;
  useTopology?: boolean;
  topology?: GridTopology | null;
}> = ({
  cage,
  grid,
  useTopology = false,
  topology = null,
}) => {
  const { cellSize, outerPadding } = grid;
  const offset = 3; // Inset from cell edge

  // Build path around cage cells
  const pathData = useMemo(() => {
    if (cage.cells.length === 0) return [];

    // Get all cell positions
    const cellPositions = cage.cells
      .map((cellId) => parseCellId(cellId, grid.gridType))
      .filter((p): p is { row: number; col: number } => p !== null);

    if (cellPositions.length === 0) return [];

    // Create a set for quick lookup
    const cellSet = new Set(cellPositions.map((p) => `${p.row},${p.col}`));
    const cellIdSet = new Set(cage.cells);

    // Build edge segments
    const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];

    if (useTopology && topology) {
      // Topology mode: use cell boundary edges from topology
      for (const cellId of cage.cells) {
        const topoCell = topology.cells.get(cellId);
        if (!topoCell) continue;

        // Check each boundary edge
        for (const edgeId of topoCell.boundaryEdges) {
          const topoEdge = topology.edges.get(edgeId);
          if (!topoEdge) continue;

          // Find adjacent cell (if any)
          const adjacentCellId = topoEdge.adjacentCells.find(id => id !== cellId);

          // Draw edge if adjacent cell is not in cage
          if (!adjacentCellId || !cellIdSet.has(adjacentCellId)) {
            const startVertex = topology.vertices.get(topoEdge.startVertex);
            const endVertex = topology.vertices.get(topoEdge.endVertex);
            if (startVertex && endVertex) {
              // Calculate inset direction (toward cell center)
              const center = topoCell.center;
              const midX = (startVertex.position.x + endVertex.position.x) / 2;
              const midY = (startVertex.position.y + endVertex.position.y) / 2;
              const toCenterX = center.x - midX;
              const toCenterY = center.y - midY;
              const dist = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);
              const insetX = dist > 0 ? (toCenterX / dist) * offset : 0;
              const insetY = dist > 0 ? (toCenterY / dist) * offset : 0;

              segments.push({
                x1: startVertex.position.x + insetX,
                y1: startVertex.position.y + insetY,
                x2: endVertex.position.x + insetX,
                y2: endVertex.position.y + insetY,
              });
            }
          }
        }
      }
    } else {
      // Standard mode
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
    }

    return segments;
  }, [cage.cells, cellSize, outerPadding, useTopology, topology, grid.gridType]);

  if (!pathData || pathData.length === 0) return null;

  const strokeDasharray = cage.style === 'dashed' ? '5,3' : undefined;

  // Get label position
  const labelPos = useMemo(() => {
    if (!cage.label || !cage.cells[0]) return null;

    if (useTopology && topology) {
      const topoCell = topology.cells.get(cage.cells[0]);
      if (topoCell) {
        // Find top-left vertex
        let minX = Infinity, minY = Infinity;
        for (const vId of topoCell.boundaryVertices) {
          const v = topology.vertices.get(vId);
          if (v) {
            if (v.position.x < minX || (v.position.x === minX && v.position.y < minY)) {
              minX = v.position.x;
              minY = v.position.y;
            }
          }
        }
        return { x: minX + 5, y: minY + 12 };
      }
    }

    const firstCell = parseCellId(cage.cells[0], grid.gridType);
    if (!firstCell) return null;
    return {
      x: outerPadding + firstCell.col * cellSize + 5,
      y: outerPadding + firstCell.row * cellSize + 12,
    };
  }, [cage.label, cage.cells, useTopology, topology, grid.gridType, outerPadding, cellSize]);

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
      {labelPos && (
        <text
          x={labelPos.x}
          y={labelPos.y}
          fill={cage.color}
          fontSize={10}
          fontFamily="Helvetica, Verdana, Arial, sans-serif"
        >
          {cage.label}
        </text>
      )}
    </g>
  );
};

// Thermo rendering - bulb at start, tapering line
const ThermoRenderer: React.FC<{
  special: SpecialElement;
  grid: GridConfig;
  useTopology?: boolean;
  topology?: GridTopology | null;
}> = ({ special, grid, useTopology = false, topology = null }) => {
  const { cellSize } = grid;

  const points = useMemo(() => {
    return special.points
      .map((pointId) => {
        if (useTopology && topology) {
          const topoCell = topology.cells.get(pointId);
          if (topoCell) {
            return { x: topoCell.center.x, y: topoCell.center.y };
          }
        }
        const parsed = parseCellId(pointId, grid.gridType);
        if (!parsed) return null;
        return getCellCenter(parsed.row, parsed.col, grid);
      })
      .filter((p): p is { x: number; y: number } => p !== null);
  }, [special.points, grid, useTopology, topology]);

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
  useTopology?: boolean;
  topology?: GridTopology | null;
}> = ({ special, grid, useTopology = false, topology = null }) => {
  const { cellSize } = grid;

  const points = useMemo(() => {
    return special.points
      .map((pointId) => {
        if (useTopology && topology) {
          const topoCell = topology.cells.get(pointId);
          if (topoCell) {
            return { x: topoCell.center.x, y: topoCell.center.y };
          }
        }
        const parsed = parseCellId(pointId, grid.gridType);
        if (!parsed) return null;
        return getCellCenter(parsed.row, parsed.col, grid);
      })
      .filter((p): p is { x: number; y: number } => p !== null);
  }, [special.points, grid, useTopology, topology]);

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
  useTopology?: boolean;
  topology?: GridTopology | null;
}> = ({ special, grid, useTopology = false, topology = null }) => {
  const points = useMemo(() => {
    return special.points
      .map((pointId) => {
        if (useTopology && topology) {
          const topoCell = topology.cells.get(pointId);
          if (topoCell) {
            return { x: topoCell.center.x, y: topoCell.center.y };
          }
        }
        const parsed = parseCellId(pointId, grid.gridType);
        if (!parsed) return null;
        return getCellCenter(parsed.row, parsed.col, grid);
      })
      .filter((p): p is { x: number; y: number } => p !== null);
  }, [special.points, grid, useTopology, topology]);

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
  const { grid, puzzle, showProblemLayer, showAnswerLayer, useTopology, topology } = usePuzzleStore();

  const isVisible =
    (layer === 'problem' && showProblemLayer) ||
    (layer === 'answer' && showAnswerLayer);

  const cages = useMemo(() => {
    if (!isVisible) return null;

    const layerData = puzzle[layer];
    return Object.values(layerData.cages).map((cage: CageElement) => (
      <CageRenderer key={cage.id} cage={cage} grid={grid} useTopology={useTopology} topology={topology} />
    ));
  }, [puzzle, layer, grid, isVisible, useTopology, topology]);

  const specials = useMemo(() => {
    if (!isVisible) return null;

    const layerData = puzzle[layer];
    return Object.values(layerData.specials).map((special: SpecialElement) => {
      switch (special.type) {
        case 'thermo':
          return <ThermoRenderer key={special.id} special={special} grid={grid} useTopology={useTopology} topology={topology} />;
        case 'arrow':
          return <ArrowRenderer key={special.id} special={special} grid={grid} useTopology={useTopology} topology={topology} />;
        case 'polygon':
          return <PolygonRenderer key={special.id} special={special} grid={grid} useTopology={useTopology} topology={topology} />;
        default:
          return null;
      }
    });
  }, [puzzle, layer, grid, isVisible, useTopology, topology]);

  if (!isVisible) return null;

  return (
    <g className={`special-layer-${layer}`}>
      {cages}
      {specials}
    </g>
  );
};
