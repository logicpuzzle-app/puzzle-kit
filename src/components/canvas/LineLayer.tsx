import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import { parseCellId, parseVertexId, getCellCenter, getVertexPosition, getEdgePosition } from '../../utils/gridUtils';
import type { LineElement, EdgeElement, WallElement, LayerType, LineStyle, LineThickness, Point, GridConfig } from '../../types';
import type { GridTopology } from '../../utils/gridTopology';

interface LineLayerProps {
  layer: LayerType;
}

const getStrokeWidth = (thickness: LineThickness): number => {
  switch (thickness) {
    case 'thinnest':
      return 1;
    case 'thin':
      return 2;
    case 'normal':
      return 3;
    case 'thick':
      return 5;
    case 'thickest':
      return 8;
    default:
      return 3;
  }
};

const getStrokeDasharray = (style: LineStyle): string | undefined => {
  switch (style) {
    case 'dashed':
      return '8,4';
    case 'dotted':
      return '2,4';
    default:
      return undefined;
  }
};

/**
 * Parse any grid point ID (cell, vertex, or edge) and return its position
 * Uses topology if available and in topology mode
 */
const getPointPosition = (id: string, grid: GridConfig, topology?: GridTopology | null): Point | null => {
  // If topology is provided, use it for positions
  if (topology) {
    // Try cell
    const cell = topology.cells.get(id);
    if (cell) return cell.center;

    // Try vertex
    const vertex = topology.vertices.get(id);
    if (vertex) return vertex.position;

    // Try edge
    const edge = topology.edges.get(id);
    if (edge) return edge.midpoint;

    return null;
  }

  // Standard mode - use grid-based calculations
  // Try cell ID: cell-row-col
  const cellMatch = id.match(/^cell-(\d+)-(\d+)$/);
  if (cellMatch) {
    const row = parseInt(cellMatch[1]);
    const col = parseInt(cellMatch[2]);
    return getCellCenter(row, col, grid);
  }

  // Try vertex ID: vertex-row-col
  const vertexMatch = id.match(/^vertex-(\d+)-(\d+)$/);
  if (vertexMatch) {
    const row = parseInt(vertexMatch[1]);
    const col = parseInt(vertexMatch[2]);
    return getVertexPosition(row, col, grid);
  }

  // Try horizontal edge ID: edge-h-row-col
  const edgeHMatch = id.match(/^edge-h-(\d+)-(\d+)$/);
  if (edgeHMatch) {
    const row = parseInt(edgeHMatch[1]);
    const col = parseInt(edgeHMatch[2]);
    return getEdgePosition('h', row, col, grid);
  }

  // Try vertical edge ID: edge-v-row-col
  const edgeVMatch = id.match(/^edge-v-(\d+)-(\d+)$/);
  if (edgeVMatch) {
    const row = parseInt(edgeVMatch[1]);
    const col = parseInt(edgeVMatch[2]);
    return getEdgePosition('v', row, col, grid);
  }

  // Fallback: try parsing as cell ID with grid type
  const parsed = parseCellId(id, grid.gridType);
  if (parsed) {
    return getCellCenter(parsed.row, parsed.col, grid);
  }

  return null;
};

export const LineLayer: React.FC<LineLayerProps> = ({ layer }) => {
  const { grid, puzzle, showProblemLayer, showAnswerLayer, useTopology, topology } = usePuzzleStore();

  const isVisible =
    (layer === 'problem' && showProblemLayer) ||
    (layer === 'answer' && showAnswerLayer);

  // Get topology for position lookups if in topology mode
  const activeTopology = useTopology ? topology : null;

  // Lines (can connect cell centers, vertices, or edge centers, or free coordinates)
  const lines = useMemo(() => {
    if (!isVisible) return null;

    const layerData = puzzle[layer];
    const elements: React.ReactElement[] = [];

    Object.values(layerData.lines).forEach((line: LineElement) => {
      let fromX: number, fromY: number, toX: number, toY: number;

      if (line.isFree && line.fromX !== undefined && line.fromY !== undefined && line.toX !== undefined && line.toY !== undefined) {
        // Free line - use raw coordinates
        fromX = line.fromX;
        fromY = line.fromY;
        toX = line.toX;
        toY = line.toY;
      } else {
        // Grid-snapped line - calculate positions from IDs (using topology if available)
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
          stroke={line.color}
          strokeWidth={getStrokeWidth(line.thickness)}
          strokeDasharray={getStrokeDasharray(line.style)}
          strokeLinecap="round"
        />
      );
    });

    return elements;
  }, [puzzle, layer, grid, isVisible, activeTopology]);

  // Edges (vertex to vertex)
  const edges = useMemo(() => {
    if (!isVisible) return null;

    const layerData = puzzle[layer];
    const elements: React.ReactElement[] = [];

    Object.values(layerData.edges).forEach((edge: EdgeElement) => {
      // In topology mode, use topology vertex positions
      if (activeTopology) {
        const fromVertex = activeTopology.vertices.get(edge.from);
        const toVertex = activeTopology.vertices.get(edge.to);
        if (!fromVertex || !toVertex) return;

        elements.push(
          <line
            key={edge.id}
            x1={fromVertex.position.x}
            y1={fromVertex.position.y}
            x2={toVertex.position.x}
            y2={toVertex.position.y}
            stroke={edge.color}
            strokeWidth={getStrokeWidth(edge.thickness)}
            strokeDasharray={getStrokeDasharray(edge.style)}
            strokeLinecap="round"
          />
        );
        return;
      }

      // Standard mode
      const from = parseVertexId(edge.from);
      const to = parseVertexId(edge.to);
      if (!from || !to) return;

      const fromPos = getVertexPosition(from.row, from.col, grid);
      const toPos = getVertexPosition(to.row, to.col, grid);

      elements.push(
        <line
          key={edge.id}
          x1={fromPos.x}
          y1={fromPos.y}
          x2={toPos.x}
          y2={toPos.y}
          stroke={edge.color}
          strokeWidth={getStrokeWidth(edge.thickness)}
          strokeDasharray={getStrokeDasharray(edge.style)}
          strokeLinecap="round"
        />
      );
    });

    return elements;
  }, [puzzle, layer, grid, isVisible, activeTopology]);

  // Walls
  const walls = useMemo(() => {
    if (!isVisible) return null;

    const layerData = puzzle[layer];
    const elements: React.ReactElement[] = [];
    const { cellSize, outerPadding } = grid;

    Object.values(layerData.walls).forEach((wall: WallElement) => {
      // In topology mode, use topology edge positions
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
                stroke={wall.color}
                strokeWidth={3}
                strokeDasharray={getStrokeDasharray(wall.style)}
                strokeLinecap="round"
              />
            );
          }
        }
        return;
      }

      // Standard mode
      const match = wall.position.match(/^edge-(h|v)-(\d+)-(\d+)$/);
      if (!match) return;

      const type = match[1];
      const row = parseInt(match[2]);
      const col = parseInt(match[3]);

      let x1: number, y1: number, x2: number, y2: number;

      if (type === 'h') {
        // Horizontal edge (wall is vertical segment)
        x1 = outerPadding + col * cellSize;
        y1 = outerPadding + row * cellSize;
        x2 = outerPadding + (col + 1) * cellSize;
        y2 = y1;
      } else {
        // Vertical edge (wall is horizontal segment)
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
          stroke={wall.color}
          strokeWidth={3}
          strokeDasharray={getStrokeDasharray(wall.style)}
          strokeLinecap="round"
        />
      );
    });

    return elements;
  }, [puzzle, layer, grid, isVisible, activeTopology]);

  if (!isVisible) return null;

  return (
    <g className={`line-layer-${layer}`}>
      {lines}
      {edges}
      {walls}
    </g>
  );
};
