import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import type { GridTopology, TopologyCell, TopologyVertex, TopologyEdge } from '../../utils/gridTopology';
import type { GridConfig } from '../../types';

interface TopologyGridProps {
  topology?: GridTopology | null;
  grid?: GridConfig;
}

/**
 * TopologyGrid - Renders grid based on topology data (deformed grids)
 */
export const TopologyGrid: React.FC<TopologyGridProps> = (props) => {
  const store = usePuzzleStore();
  const topology = props.topology ?? store.topology;
  const grid = props.grid ?? store.grid;
  const {
    showGrid,
    gridStyle,
    frameStyle,
    frameColor,
    gridColor,
    backgroundColor,
    mergedCells,
  } = grid;

  // Build a set of edges that should be hidden (internal edges within merged groups)
  const hiddenEdges = useMemo(() => {
    if (!topology || !mergedCells || mergedCells.length === 0) return new Set<string>();

    const hidden = new Set<string>();

    for (const group of mergedCells) {
      if (group.length < 2) continue;
      const groupSet = new Set(group);

      // Find edges where both adjacent cells are in the same merged group
      for (const [edgeId, edge] of topology.edges) {
        const adjacentCells = edge.adjacentCells;
        if (adjacentCells.length === 2) {
          const [cell1, cell2] = adjacentCells;
          if (groupSet.has(cell1) && groupSet.has(cell2)) {
            hidden.add(edgeId);
          }
        }
      }
    }

    return hidden;
  }, [topology, mergedCells]);

  // Render cells as polygons
  const cellPolygons = useMemo(() => {
    if (!topology) return null;

    const polygons: React.ReactElement[] = [];

    for (const [cellId, cell] of topology.cells) {
      // Get vertex positions for this cell
      const points = cell.boundaryVertices
        .map(vId => topology.vertices.get(vId))
        .filter((v): v is TopologyVertex => v !== undefined)
        .map(v => `${v.position.x},${v.position.y}`)
        .join(' ');

      if (points) {
        polygons.push(
          <polygon
            key={cellId}
            points={points}
            fill={backgroundColor}
            stroke="none"
          />
        );
      }
    }

    return polygons;
  }, [topology, backgroundColor]);

  // Render grid lines (edges)
  const gridLines = useMemo(() => {
    if (!topology || !showGrid) return null;

    const lines: React.ReactElement[] = [];
    const strokeWidth = gridStyle === 'thick' ? 2 : 1;
    const isDashed = gridStyle === 'dashed';
    const dashArray = isDashed ? '4,4' : undefined;

    if (gridStyle === 'dots') {
      // Render dots at vertices
      for (const [vertexId, vertex] of topology.vertices) {
        lines.push(
          <circle
            key={vertexId}
            cx={vertex.position.x}
            cy={vertex.position.y}
            r={2}
            fill={gridColor}
          />
        );
      }
    } else {
      // Render edges as lines
      for (const [edgeId, edge] of topology.edges) {
        // Skip hidden edges (internal edges within merged groups)
        if (hiddenEdges.has(edgeId)) continue;

        const startVertex = topology.vertices.get(edge.startVertex);
        const endVertex = topology.vertices.get(edge.endVertex);

        if (startVertex && endVertex) {
          // Non-boundary edges (internal grid lines)
          if (!edge.isBoundary) {
            lines.push(
              <line
                key={edgeId}
                x1={startVertex.position.x}
                y1={startVertex.position.y}
                x2={endVertex.position.x}
                y2={endVertex.position.y}
                stroke={gridColor}
                strokeWidth={strokeWidth}
                strokeDasharray={dashArray}
              />
            );
          }
        }
      }
    }

    return lines;
  }, [topology, showGrid, gridStyle, gridColor, hiddenEdges]);

  // Render outer frame (boundary edges)
  const outerFrame = useMemo(() => {
    if (!topology || frameStyle === 'none') return null;

    const lines: React.ReactElement[] = [];
    const strokeWidth = frameStyle === 'thick' ? 4 : 2;

    for (const [edgeId, edge] of topology.edges) {
      if (edge.isBoundary) {
        const startVertex = topology.vertices.get(edge.startVertex);
        const endVertex = topology.vertices.get(edge.endVertex);

        if (startVertex && endVertex) {
          lines.push(
            <line
              key={`frame-${edgeId}`}
              x1={startVertex.position.x}
              y1={startVertex.position.y}
              x2={endVertex.position.x}
              y2={endVertex.position.y}
              stroke={frameColor}
              strokeWidth={strokeWidth}
            />
          );
        }
      }
    }

    // For double frame style, add outer offset lines
    if (frameStyle === 'double' && lines.length > 0) {
      const outerLines: React.ReactElement[] = [];
      const offset = 3;

      for (const [edgeId, edge] of topology.edges) {
        if (edge.isBoundary) {
          const startVertex = topology.vertices.get(edge.startVertex);
          const endVertex = topology.vertices.get(edge.endVertex);

          if (startVertex && endVertex) {
            // Calculate perpendicular offset direction (outward from grid)
            const dx = endVertex.position.x - startVertex.position.x;
            const dy = endVertex.position.y - startVertex.position.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len === 0) continue;

            // Normal vector (perpendicular)
            const nx = -dy / len;
            const ny = dx / len;

            // Determine which direction is "outward" by checking cell positions
            const adjacentCell = edge.adjacentCells[0];
            const cell = adjacentCell ? topology.cells.get(adjacentCell) : null;
            let outwardX = nx;
            let outwardY = ny;

            if (cell) {
              // Check which side of the edge the cell center is on
              const midX = (startVertex.position.x + endVertex.position.x) / 2;
              const midY = (startVertex.position.y + endVertex.position.y) / 2;
              const toCellX = cell.center.x - midX;
              const toCellY = cell.center.y - midY;
              const dot = toCellX * nx + toCellY * ny;
              if (dot > 0) {
                outwardX = -nx;
                outwardY = -ny;
              }
            }

            outerLines.push(
              <line
                key={`frame-outer-${edgeId}`}
                x1={startVertex.position.x + outwardX * offset}
                y1={startVertex.position.y + outwardY * offset}
                x2={endVertex.position.x + outwardX * offset}
                y2={endVertex.position.y + outwardY * offset}
                stroke={frameColor}
                strokeWidth={1}
              />
            );
          }
        }
      }

      return <>{outerLines}{lines}</>;
    }

    return <>{lines}</>;
  }, [topology, frameStyle, frameColor]);

  if (!topology) {
    return null;
  }

  return (
    <g className="topology-grid-layer">
      {/* Cell backgrounds */}
      {cellPolygons}
      {/* Grid lines */}
      {gridLines}
      {/* Outer frame */}
      {outerFrame}
    </g>
  );
};

interface TopologyGridBackgroundProps {
  children?: React.ReactNode;
  topology?: GridTopology | null;
}

/**
 * TopologyGridBackground - Renders only the cell backgrounds
 */
export const TopologyGridBackground: React.FC<TopologyGridBackgroundProps> = ({ children, topology: topologyProp }) => {
  const store = usePuzzleStore();
  const topology = topologyProp ?? store.topology;
  const { backgroundColor } = store.grid;

  const cellPolygons = useMemo(() => {
    if (!topology) return null;

    const polygons: React.ReactElement[] = [];

    for (const [cellId, cell] of topology.cells) {
      const points = cell.boundaryVertices
        .map(vId => topology.vertices.get(vId))
        .filter((v): v is TopologyVertex => v !== undefined)
        .map(v => `${v.position.x},${v.position.y}`)
        .join(' ');

      if (points) {
        polygons.push(
          <polygon
            key={cellId}
            points={points}
            fill={backgroundColor}
            stroke="none"
          />
        );
      }
    }

    return polygons;
  }, [topology, backgroundColor]);

  if (!topology) {
    return <>{children}</>;
  }

  return (
    <g className="topology-grid-background">
      {cellPolygons}
      {children}
    </g>
  );
};

interface TopologyGridLinesProps {
  topology?: GridTopology | null;
  grid?: GridConfig;
}

/**
 * TopologyGridLines - Renders only the grid lines and frame
 */
export const TopologyGridLines: React.FC<TopologyGridLinesProps> = (props) => {
  const store = usePuzzleStore();
  const topology = props.topology ?? store.topology;
  const grid = props.grid ?? store.grid;
  const {
    showGrid,
    gridStyle,
    frameStyle,
    frameColor,
    gridColor,
  } = grid;

  const gridLines = useMemo(() => {
    if (!topology || !showGrid) return null;

    const lines: React.ReactElement[] = [];
    const strokeWidth = gridStyle === 'thick' ? 2 : 1;
    const isDashed = gridStyle === 'dashed';
    const dashArray = isDashed ? '4,4' : undefined;

    if (gridStyle === 'dots') {
      for (const [vertexId, vertex] of topology.vertices) {
        lines.push(
          <circle
            key={vertexId}
            cx={vertex.position.x}
            cy={vertex.position.y}
            r={2}
            fill={gridColor}
          />
        );
      }
    } else {
      for (const [edgeId, edge] of topology.edges) {
        if (!edge.isBoundary) {
          const startVertex = topology.vertices.get(edge.startVertex);
          const endVertex = topology.vertices.get(edge.endVertex);

          if (startVertex && endVertex) {
            lines.push(
              <line
                key={edgeId}
                x1={startVertex.position.x}
                y1={startVertex.position.y}
                x2={endVertex.position.x}
                y2={endVertex.position.y}
                stroke={gridColor}
                strokeWidth={strokeWidth}
                strokeDasharray={dashArray}
              />
            );
          }
        }
      }
    }

    return lines;
  }, [topology, showGrid, gridStyle, gridColor]);

  const outerFrame = useMemo(() => {
    if (!topology || frameStyle === 'none') return null;

    const lines: React.ReactElement[] = [];
    const strokeWidth = frameStyle === 'thick' ? 4 : 2;

    for (const [edgeId, edge] of topology.edges) {
      if (edge.isBoundary) {
        const startVertex = topology.vertices.get(edge.startVertex);
        const endVertex = topology.vertices.get(edge.endVertex);

        if (startVertex && endVertex) {
          lines.push(
            <line
              key={`frame-${edgeId}`}
              x1={startVertex.position.x}
              y1={startVertex.position.y}
              x2={endVertex.position.x}
              y2={endVertex.position.y}
              stroke={frameColor}
              strokeWidth={strokeWidth}
            />
          );
        }
      }
    }

    return <>{lines}</>;
  }, [topology, frameStyle, frameColor]);

  if (!topology) {
    return null;
  }

  return (
    <g className="topology-grid-lines">
      {gridLines}
      {outerFrame}
    </g>
  );
};
