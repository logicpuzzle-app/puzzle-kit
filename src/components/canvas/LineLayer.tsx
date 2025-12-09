import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import {
  resolveGridIdToPosition,
  resolveEdgeVertices,
  parseEdgeId,
  buildVertexGridToTopologyMap,
} from '../../utils/gridIds';
import { getEdgeLineDrawInfo } from '../../utils/gridTopology';
import type { LineElement, LayerType, LineStyle, LineThickness, Point, GridConfig } from '../../types';
import type { GridTopology, TopologyVertex } from '../../utils/gridTopology';

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
 * Uses topology if available, with fallback to grid-based calculations
 *
 * This function first tries topology lookup (for topology-mode IDs),
 * then falls back to grid-based calculation (for grid-mode IDs like vertex-r-c).
 */
const getPointPosition = (
  id: string,
  grid: GridConfig,
  topology?: GridTopology | null,
  vertexMap?: Map<string, TopologyVertex>
): Point | null => {
  // Use the unified resolver which handles both topology and grid modes
  // and properly falls back to grid calculation for grid-mode IDs
  return resolveGridIdToPosition(id, grid, topology);
};

/**
 * Find the shared edge midpoint between two cells in topology
 */
const findSharedEdgeMidpoint = (
  fromCellId: string,
  toCellId: string,
  topology: GridTopology
): Point | null => {
  const fromCell = topology.cells.get(fromCellId);
  const toCell = topology.cells.get(toCellId);
  if (!fromCell || !toCell) return null;

  // Find edge that is shared by both cells
  for (const edgeId of fromCell.boundaryEdges) {
    const edge = topology.edges.get(edgeId);
    if (edge && edge.adjacentCells.includes(toCellId)) {
      return edge.midpoint;
    }
  }
  return null;
};

export const LineLayer: React.FC<LineLayerProps> = ({ layer }) => {
  const { grid, puzzle, showProblemLayer, showAnswerLayer, useTopology, topology, highlightedLineIds } = usePuzzleStore();

  const isVisible =
    (layer === 'problem' && showProblemLayer) ||
    (layer === 'answer' && showAnswerLayer);

  // Get topology for position lookups if in topology mode
  const activeTopology = useTopology ? topology : null;
  const isIsometric = grid.gridType === 'iso';

  // Lines (can connect cell centers, vertices, or edge centers, or free coordinates)
  const lines = useMemo(() => {
    if (!isVisible) return null;

    const layerData = puzzle[layer];
    const elements: React.ReactElement[] = [];

    Object.values(layerData.lines).forEach((line: LineElement) => {
      let fromX: number, fromY: number, toX: number, toY: number;
      let midpoint: Point | null = null;

      if (line.isFree && line.fromX !== undefined && line.fromY !== undefined && line.toX !== undefined && line.toY !== undefined) {
        // Free line - use raw coordinates
        fromX = line.fromX;
        fromY = line.fromY;
        toX = line.toX;
        toY = line.toY;
      } else if (line.edgeId && activeTopology) {
        // Edge-based line - use edgeId to get drawing coordinates
        const drawInfo = getEdgeLineDrawInfo(activeTopology, line.edgeId);
        if (!drawInfo) return;

        const lineTarget = line.lineTarget || 'cell'; // default to cell for backward compat

        if (lineTarget === 'edge' || lineTarget === 'wall') {
          // Draw between vertices (Slitherlink/Wall style)
          fromX = drawInfo.startVertex.x;
          fromY = drawInfo.startVertex.y;
          toX = drawInfo.endVertex.x;
          toY = drawInfo.endVertex.y;
        } else {
          // Draw between cell centers (Mashu style)
          if (drawInfo.adjacentCellCenters.length < 2) {
            // Boundary edge - can't draw cell-to-cell line
            return;
          }
          fromX = drawInfo.adjacentCellCenters[0].x;
          fromY = drawInfo.adjacentCellCenters[0].y;
          toX = drawInfo.adjacentCellCenters[1].x;
          toY = drawInfo.adjacentCellCenters[1].y;
          // Go through edge midpoint for isometric grids
          if (isIsometric) {
            midpoint = drawInfo.midpoint;
          }
        }
      } else if (line.from && line.to) {
        // Legacy: Grid-snapped line - calculate positions from IDs (using topology if available)
        const fromPos = getPointPosition(line.from, grid, activeTopology);
        const toPos = getPointPosition(line.to, grid, activeTopology);
        if (!fromPos || !toPos) return;
        fromX = fromPos.x;
        fromY = fromPos.y;
        toX = toPos.x;
        toY = toPos.y;

        // For isometric grids, if both endpoints are cells, go through shared edge midpoint
        if (isIsometric && activeTopology && line.from.startsWith('cell-') && line.to.startsWith('cell-')) {
          midpoint = findSharedEdgeMidpoint(line.from, line.to, activeTopology);
        }
      } else {
        // Invalid line - skip
        return;
      }

      const isHighlighted = highlightedLineIds.includes(line.id);

      if (midpoint) {
        // Draw path through midpoint
        elements.push(
          <React.Fragment key={line.id}>
            {/* Highlight glow effect */}
            {isHighlighted && (
              <path
                d={`M ${fromX} ${fromY} L ${midpoint.x} ${midpoint.y} L ${toX} ${toY}`}
                fill="none"
                stroke="#ff9800"
                strokeWidth={getStrokeWidth(line.thickness) + 8}
                strokeOpacity={0.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            <path
              d={`M ${fromX} ${fromY} L ${midpoint.x} ${midpoint.y} L ${toX} ${toY}`}
              fill="none"
              stroke={line.color}
              strokeWidth={getStrokeWidth(line.thickness)}
              strokeDasharray={getStrokeDasharray(line.style)}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </React.Fragment>
        );
      } else {
        // Draw direct line
        elements.push(
          <React.Fragment key={line.id}>
            {/* Highlight glow effect */}
            {isHighlighted && (
              <line
                x1={fromX}
                y1={fromY}
                x2={toX}
                y2={toY}
                stroke="#ff9800"
                strokeWidth={getStrokeWidth(line.thickness) + 8}
                strokeOpacity={0.5}
                strokeLinecap="round"
              />
            )}
            <line
              x1={fromX}
              y1={fromY}
              x2={toX}
              y2={toY}
              stroke={line.color}
              strokeWidth={getStrokeWidth(line.thickness)}
              strokeDasharray={getStrokeDasharray(line.style)}
              strokeLinecap="round"
            />
          </React.Fragment>
        );
      }
    });

    return elements;
  }, [puzzle, layer, grid, isVisible, activeTopology, isIsometric, highlightedLineIds]);

  // Build vertex lookup map for efficient grid-mode to topology-mode conversion
  const vertexMap = useMemo(() => {
    if (!activeTopology) return undefined;
    return buildVertexGridToTopologyMap(activeTopology, grid);
  }, [activeTopology, grid]);

  // Edges (vertex to vertex)
  const edges = useMemo(() => {
    if (!isVisible) return null;

    const layerData = puzzle[layer];
    const elements: React.ReactElement[] = [];

    Object.values(layerData.edges).forEach((edge: EdgeElement) => {
      // Use unified resolver that handles both topology-mode and grid-mode IDs
      // This properly converts grid-mode IDs (vertex-r-c) to positions
      // even when topology is active
      const result = resolveEdgeVertices(edge.from, edge.to, grid, activeTopology, vertexMap);
      if (!result) return;

      elements.push(
        <line
          key={edge.id}
          x1={result.from.x}
          y1={result.from.y}
          x2={result.to.x}
          y2={result.to.y}
          stroke={edge.color}
          strokeWidth={getStrokeWidth(edge.thickness)}
          strokeDasharray={getStrokeDasharray(edge.style)}
          strokeLinecap="round"
        />
      );
    });

    return elements;
  }, [puzzle, layer, grid, isVisible, activeTopology, vertexMap]);

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
            return;
          }
        }
        // Fall through to standard mode if topology lookup fails
      }

      // Standard mode - parse edge-h-r-c or edge-v-r-c format
      const edgeCoord = parseEdgeId(wall.position);
      if (!edgeCoord) return;

      const { type, row, col } = edgeCoord;

      let x1: number, y1: number, x2: number, y2: number;

      if (type === 'h') {
        // Horizontal edge (wall is horizontal segment)
        x1 = outerPadding + col * cellSize;
        y1 = outerPadding + row * cellSize;
        x2 = outerPadding + (col + 1) * cellSize;
        y2 = y1;
      } else {
        // Vertical edge (wall is vertical segment)
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
