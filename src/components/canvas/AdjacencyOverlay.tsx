import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStoreContext';

/**
 * AdjacencyOverlay - Draws dotted lines between adjacent cell centers
 * Only visible when showAdjacency is enabled
 * For isometric grids, lines go through the shared edge midpoint
 */
export const AdjacencyOverlay: React.FC = () => {
  const {
    showAdjacency,
    topology: storeTopology,
    previewTopology,
    useTopology,
    grid,
  } = usePuzzleStore();

  // Use preview topology if available
  const topology = previewTopology ?? storeTopology;
  const isIsometric = grid.gridType === 'iso';

  // Generate adjacency lines from topology
  const adjacencyLines = useMemo(() => {
    if (!showAdjacency || !useTopology || !topology) return null;

    const lines: React.ReactElement[] = [];
    const processedPairs = new Set<string>();

    // For each cell, draw lines to its neighbors
    for (const [cellId, cell] of topology.cells) {
      const center1 = cell.center;

      // Get neighbors from boundary edges
      for (const edgeId of cell.boundaryEdges) {
        const edge = topology.edges.get(edgeId);
        if (!edge) continue;

        // Find the adjacent cell through this edge
        for (const adjCellId of edge.adjacentCells) {
          if (adjCellId === cellId) continue;

          // Create a unique pair key to avoid duplicate lines
          const pairKey = [cellId, adjCellId].sort().join('-');
          if (processedPairs.has(pairKey)) continue;
          processedPairs.add(pairKey);

          const adjCell = topology.cells.get(adjCellId);
          if (!adjCell) continue;

          const center2 = adjCell.center;

          if (isIsometric) {
            // For isometric: go through edge midpoint
            const midpoint = edge.midpoint;
            lines.push(
              <path
                key={pairKey}
                d={`M ${center1.x} ${center1.y} L ${midpoint.x} ${midpoint.y} L ${center2.x} ${center2.y}`}
                fill="none"
                stroke="#666"
                strokeWidth={1}
                strokeDasharray="4,4"
                opacity={0.6}
              />
            );
          } else {
            // For other grids: direct line
            lines.push(
              <line
                key={pairKey}
                x1={center1.x}
                y1={center1.y}
                x2={center2.x}
                y2={center2.y}
                stroke="#666"
                strokeWidth={1}
                strokeDasharray="4,4"
                opacity={0.6}
              />
            );
          }
        }
      }
    }

    return lines;
  }, [showAdjacency, useTopology, topology, isIsometric]);

  if (!showAdjacency || !adjacencyLines || adjacencyLines.length === 0) {
    return null;
  }

  return (
    <g className="adjacency-overlay" pointerEvents="none">
      {adjacencyLines}
    </g>
  );
};
