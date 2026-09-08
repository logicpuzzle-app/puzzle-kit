import { resolveSymbolSize } from '../../utils/symbolSize';
/**
 * SolverLayer - Displays solver results as an overlay
 *
 * Renders the solver's solution on top of the answer layer
 * with blue-colored lines and semi-transparent surfaces.
 */

import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStoreContext';
import { resolveGridIdToPosition, parseEdgeId } from '../../utils/gridIds';
import {
  getCellCenter,
  getCellCorners,
  getCellIndexById,
  getEdgeIndexById,
  getEdgePosition,
  getVertexIndexById,
  getVertexPosition,
} from '../../utils/gridUtils';
import type { LineElement, SurfaceElement, NumberElement, SymbolElement, Point, GridConfig } from '../../types';
import type { GridTopology, TopologyVertex } from '../../utils/gridTopology';
import { renderSymbol } from './symbols';

// Blue color for complete solution
const SOLVER_LINE_COLOR = '#3B82F6';  // Tailwind blue-500
const SOLVER_SURFACE_COLOR = '#3B82F6';
const SOLVER_SURFACE_OPACITY = 0.3;

// Orange color for partial solution
const PARTIAL_LINE_COLOR = '#F97316';  // Tailwind orange-500
const PARTIAL_SURFACE_COLOR = '#F97316';
const PARTIAL_SURFACE_OPACITY = 0.25;

const getFontSize = (size: 'large' | 'medium' | 'small', cellSize: number): number => {
  switch (size) {
    case 'large':
      return cellSize * 0.7;
    case 'medium':
      return cellSize * 0.5;
    case 'small':
      return cellSize * 0.3;
    default:
      return cellSize * 0.5;
  }
};

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

  // Render symbols
  const symbols = useMemo(() => {
    if (!isSolverMode || !solverResult) return null;

    const elements: React.ReactElement[] = [];

    Object.values(solverResult.symbols || {}).forEach((symbol: SymbolElement) => {
      let center: { x: number; y: number } | null = null;

      if (activeTopology) {
        const cell = activeTopology.cells.get(symbol.cellId);
        if (cell) {
          center = cell.center;
        } else {
          const vertex = activeTopology.vertices.get(symbol.cellId);
          if (vertex) {
            center = vertex.position;
          } else {
            const edge = activeTopology.edges.get(symbol.cellId);
            if (edge) {
              center = edge.midpoint;
            }
          }
        }
      } else {
        if (symbol.cellId.startsWith('vertex-')) {
          const index = getVertexIndexById(symbol.cellId, grid);
          if (index) center = getVertexPosition(index.row, index.col, grid);
        } else if (symbol.cellId.startsWith('edge-h-')) {
          const index = getEdgeIndexById(symbol.cellId, grid);
          if (index && index.type === 'h') center = getEdgePosition('h', index.row, index.col, grid);
        } else if (symbol.cellId.startsWith('edge-v-')) {
          const index = getEdgeIndexById(symbol.cellId, grid);
          if (index && index.type === 'v') center = getEdgePosition('v', index.row, index.col, grid);
        } else {
          const index = getCellIndexById(symbol.cellId, grid);
          if (index) center = getCellCenter(index.row, index.col, grid);
        }
      }

      if (!center) return;

      const sizeMultiplier =
        resolveSymbolSize(symbol.size);

      elements.push(
        <g key={symbol.id}>
          {renderSymbol(symbol.symbolType, {
            x: center.x,
            y: center.y,
            size: cellSize * sizeMultiplier,
            color: lineColor,
            fillColor: symbol.fillColor,
            rotation: symbol.rotation,
            directions: symbol.directions,
            directionAngles: symbol.directionAngles,
          })}
        </g>
      );
    });

    return elements;
  }, [isSolverMode, solverResult, grid, activeTopology, cellSize, lineColor]);

  // Render numbers
  const numbers = useMemo(() => {
    if (!isSolverMode || !solverResult) return null;

    const elements: React.ReactElement[] = [];

    Object.values(solverResult.numbers || {}).forEach((num: NumberElement) => {
      let center: Point;
      let corners: Point[];

      if (activeTopology) {
        const cell = activeTopology.cells.get(num.cellId);
        if (!cell) return;

        center = cell.center;
        corners = cell.boundaryVertices
          .map((vId) => activeTopology.vertices.get(vId))
          .filter((v): v is TopologyVertex => v !== undefined)
          .map((v) => v.position);

        if (corners.length < 4) {
          corners = [center, center, center, center];
        }
      } else {
        const index = getCellIndexById(num.cellId, grid);
        if (!index) return;
        center = getCellCenter(index.row, index.col, grid);
        corners = getCellCorners(index.row, index.col, grid);
      }

      const fontSize = getFontSize(num.size, cellSize);
      let x = center.x;
      let y = center.y;
      let textAnchor: 'start' | 'middle' | 'end' = 'middle';
      let dominantBaseline: 'auto' | 'middle' | 'hanging' | 'ideographic' = 'middle';

      if (num.position === 'corner' && num.cornerIndex !== undefined) {
        const cornerOffset = cellSize * 0.2;
        switch (num.cornerIndex) {
          case 0:
            x = corners[0].x + cornerOffset;
            y = corners[0].y + cornerOffset;
            textAnchor = 'start';
            dominantBaseline = 'hanging';
            break;
          case 1:
            x = corners[1].x - cornerOffset;
            y = corners[1].y + cornerOffset;
            textAnchor = 'end';
            dominantBaseline = 'hanging';
            break;
          case 2:
            x = corners[3].x + cornerOffset;
            y = corners[3].y - cornerOffset;
            textAnchor = 'start';
            dominantBaseline = 'ideographic';
            break;
          case 3:
            x = corners[2].x - cornerOffset;
            y = corners[2].y - cornerOffset;
            textAnchor = 'end';
            dominantBaseline = 'ideographic';
            break;
          default:
            break;
        }
      } else if (num.position === 'side' && num.sideIndex !== undefined) {
        switch (num.sideIndex) {
          case 0:
            y = corners[0].y + cellSize * 0.15;
            dominantBaseline = 'hanging';
            break;
          case 1:
            x = corners[1].x - cellSize * 0.15;
            textAnchor = 'end';
            break;
          case 2:
            y = corners[2].y - cellSize * 0.15;
            dominantBaseline = 'ideographic';
            break;
          case 3:
            x = corners[0].x + cellSize * 0.15;
            textAnchor = 'start';
            break;
          default:
            break;
        }
      } else {
        const yOffset = fontSize * 0.05;
        y += yOffset;
      }

      elements.push(
        <text
          key={num.id}
          x={x}
          y={y}
          fill={lineColor}
          fontSize={fontSize}
          fontFamily="Helvetica, Verdana, Arial, sans-serif"
          fontWeight="normal"
          textAnchor={textAnchor}
          dominantBaseline={dominantBaseline}
        >
          {num.value}
        </text>
      );
    });

    return elements;
  }, [isSolverMode, solverResult, grid, activeTopology, cellSize, lineColor]);

  if (!isSolverMode || !solverResult) return null;

  return (
    <g className="solver-layer" opacity={0.9}>
      {surfaces}
      {lines}
      {edges}
      {walls}
      {symbols}
      {numbers}
    </g>
  );
};
