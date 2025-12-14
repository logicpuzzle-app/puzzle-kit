/**
 * SolverLayer - Displays solver results as an overlay
 *
 * Renders the solver's solution on top of the answer layer
 * with blue-colored lines and semi-transparent surfaces.
 */

import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import { resolveGridIdToPosition, parseEdgeId } from '../../utils/gridIds';
import { getCellCorners, getCellIndexById } from '../../utils/gridUtils';
import type { LineElement, SurfaceElement, Point, GridConfig } from '../../types';
import type { GridTopology } from '../../utils/gridTopology';

// Blue color for complete solution
const SOLVER_LINE_COLOR = '#3B82F6';  // Tailwind blue-500
const SOLVER_SURFACE_COLOR = '#3B82F6';
const SOLVER_SURFACE_OPACITY = 0.3;

// Orange color for partial solution (途中経過)
const PARTIAL_LINE_COLOR = '#F97316';  // Tailwind orange-500
const PARTIAL_SURFACE_COLOR = '#F97316';
const PARTIAL_SURFACE_OPACITY = 0.25;

const getStrokeWidth = (thickness: string): number => {
  switch (thickness) {
    case 'thinnest': return 1;
    case 'thin': return 2;
    case 'normal': return 3;
    case 'thick': return 5;
    case 'thickest': return 8;
    default: return 3;
  }
};

const getStrokeDasharray = (style: string): string | undefined => {
  switch (style) {
    case 'dashed': return '8,4';
    case 'dotted': return '2,4';
    default: return undefined;
  }
};

const getPointPosition = (
  id: string,
  grid: GridConfig,
  topology?: GridTopology | null
): Point | null => {
  return resolveGridIdToPosition(id, grid, topology);
};

export const SolverLayer: React.FC = () => {
  const { grid, isSolverMode, solverResult, isPartialResult, useTopology, topology } = usePuzzleStore();

  const activeTopology = useTopology ? topology : null;
  const { cellSize, outerPadding, rows, cols } = grid;

  // Choose colors based on whether result is partial
  const lineColor = isPartialResult ? PARTIAL_LINE_COLOR : SOLVER_LINE_COLOR;
  const surfaceColor = isPartialResult ? PARTIAL_SURFACE_COLOR : SOLVER_SURFACE_COLOR;
  const surfaceOpacity = isPartialResult ? PARTIAL_SURFACE_OPACITY : SOLVER_SURFACE_OPACITY;

  // Render surfaces
  const surfaces = useMemo(() => {
    if (!isSolverMode || !solverResult) return null;

    const elements: React.ReactElement[] = [];

    Object.values(solverResult.surfaces || {}).forEach((surface: SurfaceElement) => {
      // In topology mode, use cell center and polygon
      if (activeTopology) {
        const cell = activeTopology.cells.get(surface.cellId);
        if (cell) {
          const points = cell.boundaryVertices
            .map((vid: string) => activeTopology.vertices.get(vid))
            .filter((v): v is NonNullable<typeof v> => v !== undefined)
            .map((v) => `${v.position.x},${v.position.y}`)
            .join(' ');

          elements.push(
            <polygon
              key={surface.id}
              points={points}
              fill={surfaceColor}
              fillOpacity={surfaceOpacity}
              stroke="none"
            />
          );
          return;
        }
      }

      // Standard square grid
      const index = getCellIndexById(surface.cellId, grid);
      if (!index) return;
      const [topLeft] = getCellCorners(index.row, index.col, grid);
      const x = topLeft.x;
      const y = topLeft.y;

      elements.push(
        <rect
          key={surface.id}
          x={x}
          y={y}
          width={cellSize}
          height={cellSize}
          fill={surfaceColor}
          fillOpacity={surfaceOpacity}
          stroke="none"
        />
      );
    });

    return elements;
  }, [isSolverMode, solverResult, grid, activeTopology, cellSize, outerPadding, surfaceColor, surfaceOpacity]);

  // Render lines
  const lines = useMemo(() => {
    if (!isSolverMode || !solverResult) return null;

    const elements: React.ReactElement[] = [];

    Object.values(solverResult.lines || {}).forEach((line: LineElement) => {
      let fromX: number, fromY: number, toX: number, toY: number;

      if (line.isFree && line.fromX !== undefined && line.fromY !== undefined &&
          line.toX !== undefined && line.toY !== undefined) {
        fromX = line.fromX;
        fromY = line.fromY;
        toX = line.toX;
        toY = line.toY;
      } else {
        if (!line.from || !line.to) return;
        const fromPos = getPointPosition(line.from, grid, activeTopology);
        const toPos = getPointPosition(line.to, grid, activeTopology);
        if (!fromPos || !toPos) return;
        fromX = fromPos.x;
        fromY = fromPos.y;
        toX = toPos.x;
        toY = toPos.y;
      }

      elements.push(
        <line
          key={line.id}
          x1={fromX}
          y1={fromY}
          x2={toX}
          y2={toY}
          stroke={lineColor}
          strokeWidth={getStrokeWidth(line.thickness)}
          strokeDasharray={getStrokeDasharray(line.style)}
          strokeLinecap="round"
        />
      );
    });

    return elements;
  }, [isSolverMode, solverResult, grid, activeTopology, lineColor]);

  // Render edges
  const edges = useMemo(() => {
    if (!isSolverMode || !solverResult) return null;

    const elements: React.ReactElement[] = [];

    Object.values(solverResult.edges || {}).forEach((edge: any) => {
      const fromPos = getPointPosition(edge.from, grid, activeTopology);
      const toPos = getPointPosition(edge.to, grid, activeTopology);
      if (!fromPos || !toPos) return;

      elements.push(
        <line
          key={edge.id}
          x1={fromPos.x}
          y1={fromPos.y}
          x2={toPos.x}
          y2={toPos.y}
          stroke={lineColor}
          strokeWidth={getStrokeWidth(edge.thickness || 'normal')}
          strokeDasharray={getStrokeDasharray(edge.style || 'solid')}
          strokeLinecap="round"
        />
      );
    });

    return elements;
  }, [isSolverMode, solverResult, grid, activeTopology, lineColor]);

  // Render walls
  const walls = useMemo(() => {
    if (!isSolverMode || !solverResult) return null;

    const elements: React.ReactElement[] = [];

    Object.values(solverResult.walls || {}).forEach((wall: any) => {
      // In topology mode
      if (activeTopology) {
        const topoEdge = activeTopology.edges.get(wall.position);
        if (topoEdge) {
          const startVertex = activeTopology.vertices.get(topoEdge.startVertex);
          const endVertex = activeTopology.vertices.get(topoEdge.endVertex);
          if (startVertex && endVertex) {
            elements.push(
              <line
                key={wall.id}
                x1={startVertex.position.x}
                y1={startVertex.position.y}
                x2={endVertex.position.x}
                y2={endVertex.position.y}
                stroke={lineColor}
                strokeWidth={3}
                strokeDasharray={getStrokeDasharray(wall.style || 'solid')}
                strokeLinecap="round"
              />
            );
            return;
          }
        }
      }

      // Standard mode
      const edgeCoord = parseEdgeId(wall.position);
      if (!edgeCoord) return;

      const { type, row, col } = edgeCoord;
      let x1: number, y1: number, x2: number, y2: number;

      if (type === 'h') {
        x1 = outerPadding + col * cellSize;
        y1 = outerPadding + row * cellSize;
        x2 = outerPadding + (col + 1) * cellSize;
        y2 = y1;
      } else {
        x1 = outerPadding + col * cellSize;
        y1 = outerPadding + row * cellSize;
        x2 = x1;
        y2 = outerPadding + (row + 1) * cellSize;
      }

      elements.push(
        <line
          key={wall.id}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={lineColor}
          strokeWidth={3}
          strokeDasharray={getStrokeDasharray(wall.style || 'solid')}
          strokeLinecap="round"
        />
      );
    });

    return elements;
  }, [isSolverMode, solverResult, grid, activeTopology, cellSize, outerPadding, lineColor]);

  if (!isSolverMode || !solverResult) return null;

  return (
    <g className="solver-layer" opacity={0.9}>
      {surfaces}
      {lines}
      {edges}
      {walls}
    </g>
  );
};
