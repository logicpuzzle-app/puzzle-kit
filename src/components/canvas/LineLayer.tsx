import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import {
  resolveGridIdToPosition,
  resolveEdgeVertices,
  parseEdgeId,
  buildVertexGridToTopologyMap,
} from '../../utils/gridIds';
import { getEdgeLineDrawInfo } from '../../utils/gridTopology';
import {
  mergeDirectedLines,
  type LineWithPosition,
} from '../../utils/lineMerge';
import {
  getStrokeWidth,
  getStrokeDasharray,
  getArrowPoints,
  buildPathFromPoints,
  shortenPathEnds,
} from '../../utils/lineRender';
import type { LineElement, LayerType, Point, GridConfig } from '../../types';
import type { GridTopology, TopologyVertex } from '../../utils/gridTopology';

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
  const { grid, puzzle, showProblemLayer, showAnswerLayer, useTopology, topology, highlightedLineIds, drawingLineIds } = usePuzzleStore();

  const isVisible =
    (layer === 'problem' && showProblemLayer) ||
    (layer === 'answer' && showAnswerLayer);

  // Get topology for position lookups if in topology mode
  const activeTopology = useTopology ? topology : null;
  const isIsometric = grid.gridType === 'iso';

  // Get line groups for this layer, including temporary drawing group
  const lineGroups = useMemo(() => {
    const existingGroups = puzzle[layer].lineGroups || {};

    // If there are drawing lines, add them as a temporary group
    if (drawingLineIds.length >= 1) {
      // Filter to only directed lines
      const directedDrawingIds = drawingLineIds.filter(id => {
        const line = puzzle[layer].lines[id];
        return line && line.directed && !line.isFree;
      });

      if (directedDrawingIds.length >= 1) {
        return {
          ...existingGroups,
          '__drawing__': {
            id: '__drawing__',
            lineIds: directedDrawingIds,
            groupType: 'arrow' as const,
            layer,
          },
        };
      }
    }

    return existingGroups;
  }, [puzzle, layer, drawingLineIds]);

  // Lines (can connect cell centers, vertices, or edge centers, or free coordinates)
  const lines = useMemo(() => {
    if (!isVisible) return null;

    const layerData = puzzle[layer];
    const elements: React.ReactElement[] = [];

    // First pass: collect all lines with their positions
    const linesWithPos: LineWithPosition[] = [];

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

      linesWithPos.push({ line, fromX, fromY, toX, toY, midpoint });
    });

    // Merge lines based on line groups
    const chains = mergeDirectedLines(linesWithPos, lineGroups);

    // Render each chain
    for (const chain of chains) {
      const firstLine = chain.lines[0].line;
      // Get set of highlighted line IDs in this chain for individual highlighting
      const highlightedInChain = new Set(chain.lines.filter(l => highlightedLineIds.includes(l.line.id)).map(l => l.line.id));
      const isDoubleStyle = firstLine.style === 'double';
      // For double lines, use thinner base stroke
      const baseStrokeWidth = getStrokeWidth(firstLine.thickness);
      const strokeWidth = isDoubleStyle ? Math.max(1, baseStrokeWidth * 0.5) : baseStrokeWidth;
      // For double lines, arrow must be larger than total line width (strokeWidth + doubleGap)
      // doubleGap = strokeWidth * 2.5, total = strokeWidth * 3.5
      const totalLineWidth = isDoubleStyle ? strokeWidth * 3.5 : strokeWidth;
      const arrowSize = isDoubleStyle ? totalLineWidth * 3 : strokeWidth * 3;
      const chainKey = chain.lines.map(l => l.line.id).join('-');

      // Calculate arrow position(s) for directed lines
      const arrows: { points: string; cx: number; cy: number }[] = [];
      let shortenStart = 0;
      let shortenEnd = 0;

      if (firstLine.directed && chain.points.length >= 2) {
        const directed = firstLine.directed;

        if (directed === 'endpoint') {
          // Arrow at the end of the chain (chain.points is ordered start->end)
          // Use chain.points which is correctly ordered by mergeEndpointLines
          const chainPoints = chain.points;
          if (chainPoints.length >= 2) {
            const endPoint = chainPoints[chainPoints.length - 1];
            const secondLastPoint = chainPoints[chainPoints.length - 2];
            arrows.push(getArrowPoints(secondLastPoint.x, secondLastPoint.y, endPoint.x, endPoint.y, arrowSize, 'endpoint', 'forward', true));
            // Shorten line end so arrow tip sits exactly on endpoint
            shortenEnd = arrowSize;
          }
        } else if (directed === 'midpoint') {
          // Arrow at the midpoint of the chain
          // Use chain.points which is correctly ordered
          const chainPoints = chain.points;
          if (chainPoints.length >= 2) {
            const isEven = chainPoints.length % 2 === 0;
            if (isEven) {
              // Even number of points: arrow at the midpoint of the middle segment
              // e.g., 4 points [0,1,2,3]: midIndex=2, draw arrow at midpoint of segment 1->2
              const midIndex = chainPoints.length / 2;
              const segStart = chainPoints[midIndex - 1];
              const segEnd = chainPoints[midIndex];
              // Arrow at midpoint position (center of the segment)
              arrows.push(getArrowPoints(segStart.x, segStart.y, segEnd.x, segEnd.y, arrowSize, 'midpoint', 'forward'));
            } else {
              // Odd number of points: arrow at the junction point (the middle point itself)
              // e.g., 3 points [0,1,2]: midIndex=1, draw arrow at point 1 (junction)
              // e.g., 5 points [0,1,2,3,4]: midIndex=2, draw arrow at point 2 (junction)
              const midIndex = Math.floor(chainPoints.length / 2);
              const beforeMid = chainPoints[midIndex - 1];
              const afterMid = chainPoints[midIndex];
              // Arrow at the junction point, pointing in chain direction
              arrows.push(getArrowPoints(beforeMid.x, beforeMid.y, afterMid.x, afterMid.y, arrowSize, 'endpoint', 'forward'));
            }
          }
        } else if (directed === 'both') {
          // Arrows at both ends of the chain (bidirectional)
          // Use chain.points which is correctly ordered by mergeEndpointLines
          const chainPoints = chain.points;
          if (chainPoints.length >= 2) {
            const startPoint = chainPoints[0];
            const secondPoint = chainPoints[1];
            const endPoint = chainPoints[chainPoints.length - 1];
            const secondLastPoint = chainPoints[chainPoints.length - 2];
            // Arrow at start pointing outward (tip at start point)
            arrows.push(getArrowPoints(secondPoint.x, secondPoint.y, startPoint.x, startPoint.y, arrowSize, 'endpoint', 'forward', true));
            // Arrow at end pointing outward (tip at end point)
            arrows.push(getArrowPoints(secondLastPoint.x, secondLastPoint.y, endPoint.x, endPoint.y, arrowSize, 'endpoint', 'forward', true));
          }
          // Shorten line at both ends to not overlap with arrows
          shortenStart = arrowSize;
          shortenEnd = arrowSize;
        }
      }

      // Build SVG path from points, shortening ends if needed for 'both' mode
      const pathPoints = (shortenStart > 0 || shortenEnd > 0)
        ? shortenPathEnds(chain.points, shortenStart, shortenEnd)
        : chain.points;
      const pathD = buildPathFromPoints(pathPoints);

      const doubleGap = strokeWidth * 2.5; // Gap between double lines

      // For midpoint arrows with double lines, render arrow below the line
      const isMidpointArrow = firstLine.directed === 'midpoint';
      const arrowsBelowLine = isDoubleStyle && isMidpointArrow;

      const arrowElements = arrows.map((arrow, i) => arrow.points && (
        <polygon
          key={`arrow-${i}`}
          points={arrow.points}
          fill={firstLine.color}
        />
      ));

      const lineElements = isDoubleStyle ? (
        <>
          {/* Double line: outer stroke (color) */}
          <path
            d={pathD}
            fill="none"
            stroke={firstLine.color}
            strokeWidth={strokeWidth + doubleGap}
            strokeLinecap="butt"
            strokeLinejoin="round"
          />
          {/* Double line: inner stroke (white/background) */}
          <path
            d={pathD}
            fill="none"
            stroke="white"
            strokeWidth={doubleGap - strokeWidth}
            strokeLinecap="butt"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <path
          d={pathD}
          fill="none"
          stroke={firstLine.color}
          strokeWidth={strokeWidth}
          strokeDasharray={getStrokeDasharray(firstLine.style)}
          strokeLinecap="butt"
          strokeLinejoin="round"
        />
      );

      // Build highlight elements for individual selected lines within the chain
      const highlightElements: React.ReactNode[] = [];
      if (highlightedInChain.size > 0) {
        for (const lineWithPos of chain.lines) {
          if (highlightedInChain.has(lineWithPos.line.id)) {
            // Build path for this single line segment
            const segmentPoints = lineWithPos.midpoint
              ? [{ x: lineWithPos.fromX, y: lineWithPos.fromY }, lineWithPos.midpoint, { x: lineWithPos.toX, y: lineWithPos.toY }]
              : [{ x: lineWithPos.fromX, y: lineWithPos.fromY }, { x: lineWithPos.toX, y: lineWithPos.toY }];
            highlightElements.push(
              <path
                key={`highlight-${lineWithPos.line.id}`}
                d={buildPathFromPoints(segmentPoints)}
                fill="none"
                stroke="#ff9800"
                strokeWidth={isDoubleStyle ? strokeWidth + doubleGap + 8 : strokeWidth + 8}
                strokeOpacity={0.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          }
        }
      }

      elements.push(
        <React.Fragment key={chainKey}>
          {/* Highlight glow effect for individual selected lines */}
          {highlightElements}
          {arrowsBelowLine ? (
            <>
              {arrowElements}
              {lineElements}
            </>
          ) : (
            <>
              {lineElements}
              {arrowElements}
            </>
          )}
        </React.Fragment>
      );
    }

    return elements;
  }, [puzzle, layer, grid, isVisible, activeTopology, isIsometric, highlightedLineIds, lineGroups]);

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
