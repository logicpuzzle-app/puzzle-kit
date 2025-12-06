import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../../store/puzzleStore';
import type { TopologyVertex } from '../../../utils/gridTopology';

/**
 * DisabledCellsOverlay - Renders disabled cells overlay and border lines
 * In grid mode: shows grey semi-transparent overlay + border lines
 * In other modes: shows only border lines between enabled and disabled cells
 */
export const DisabledCellsOverlay: React.FC = () => {
  const { grid, activeLayer, useTopology, topology } = usePuzzleStore();

  // Derived state: grid mode is when activeLayer is 'grid'
  const isGridMode = activeLayer === 'grid';
  const {
    cellSize,
    outerPadding,
    gridType = 'square',
    marginTop = 0,
    marginLeft = 0,
    disabledCells,
    rows,
    cols,
    frameColor,
    frameStyle,
    disabledCellColor,
    backgroundColor,
  } = grid;

  // useMemo must be called unconditionally (React Hooks rules)
  const { rects, borderLines } = useMemo(() => {
    // Return empty if conditions not met (but check for disabledCells regardless of mode)
    if (gridType !== 'square' || !disabledCells || disabledCells.length === 0) {
      return { rects: [], borderLines: [] };
    }
    const rectElements: React.ReactElement[] = [];
    const lineElements: React.ReactElement[] = [];

    // Handle both array and Set (for backwards compatibility)
    const disabledArray = Array.isArray(disabledCells) ? disabledCells : Array.from(disabledCells as unknown as Set<string>);
    const disabledSet = new Set(disabledArray);

    // Use same stroke width as frame style
    const strokeWidth = frameStyle === 'thick' ? 4 : 2;

    // Helper to check if a cell is disabled
    const isDisabled = (r: number, c: number) => disabledSet.has(`cell-${r}-${c}`);

    // Helper to check if a cell is within the grid bounds
    const isInBounds = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols;

    // Helper to check if adjacent cell is enabled (in bounds and not disabled)
    const isAdjacentEnabled = (r: number, c: number) => isInBounds(r, c) && !isDisabled(r, c);

    // Topology mode - use topology positions
    if (useTopology && topology) {
      const fillColor = disabledCellColor || '#c0c0c0';

      disabledArray.forEach((cellId) => {
        const cell = topology.cells.get(cellId);
        if (!cell) return;

        // Get polygon points from topology vertices
        const points = cell.boundaryVertices
          .map(vId => topology.vertices.get(vId))
          .filter((v): v is TopologyVertex => v !== undefined)
          .map(v => `${v.position.x},${v.position.y}`)
          .join(' ');

        if (points) {
          rectElements.push(
            <polygon
              key={cellId}
              points={points}
              fill={fillColor}
              pointerEvents="none"
            />
          );
        }

        // Draw borders for edges adjacent to enabled cells
        cell.boundaryEdges.forEach((edgeId) => {
          const edge = topology.edges.get(edgeId);
          if (!edge) return;

          // Check if adjacent cell is enabled
          const adjacentCellId = edge.adjacentCells.find(id => id !== cellId);
          if (!adjacentCellId) return; // Boundary edge

          // Parse adjacent cell ID to check if enabled
          const match = adjacentCellId.match(/^cell-(-?\d+)-(-?\d+)$/);
          if (!match) return;
          const adjRow = parseInt(match[1], 10);
          const adjCol = parseInt(match[2], 10);

          if (isAdjacentEnabled(adjRow, adjCol)) {
            const startVertex = topology.vertices.get(edge.startVertex);
            const endVertex = topology.vertices.get(edge.endVertex);
            if (startVertex && endVertex) {
              lineElements.push(
                <line
                  key={`${cellId}-${edgeId}`}
                  x1={startVertex.position.x}
                  y1={startVertex.position.y}
                  x2={endVertex.position.x}
                  y2={endVertex.position.y}
                  stroke={frameColor}
                  strokeWidth={strokeWidth}
                  pointerEvents="none"
                />
              );
            }
          }
        });
      });

      return { rects: rectElements, borderLines: lineElements };
    }

    // Standard mode
    disabledArray.forEach((cellId) => {
      // Parse cell ID (e.g., "cell-0-0")
      const match = cellId.match(/^cell-(-?\d+)-(-?\d+)$/);
      if (!match) return;
      const row = parseInt(match[1], 10);
      const col = parseInt(match[2], 10);

      // Skip cells outside the main grid
      if (!isInBounds(row, col)) return;

      // Calculate actual position (adjusted for margins)
      const actualCol = col + marginLeft;
      const actualRow = row + marginTop;
      const x = outerPadding + actualCol * cellSize;
      const y = outerPadding + actualRow * cellSize;

      // Add overlay for disabled cell
      // Use disabledCellColor in all modes (default: light grey #c0c0c0)
      const fillColor = disabledCellColor || '#c0c0c0';
      rectElements.push(
        <rect
          key={cellId}
          x={x}
          y={y}
          width={cellSize}
          height={cellSize}
          fill={fillColor}
          pointerEvents="none"
        />
      );

      // Draw border only if adjacent cell is enabled (in bounds and not disabled)
      // No border for edges adjacent to out-of-bounds cells
      // Top edge
      if (isAdjacentEnabled(row - 1, col)) {
        lineElements.push(
          <line
            key={`${cellId}-top`}
            x1={x}
            y1={y}
            x2={x + cellSize}
            y2={y}
            stroke={frameColor}
            strokeWidth={strokeWidth}
            pointerEvents="none"
          />
        );
      }
      // Bottom edge
      if (isAdjacentEnabled(row + 1, col)) {
        lineElements.push(
          <line
            key={`${cellId}-bottom`}
            x1={x}
            y1={y + cellSize}
            x2={x + cellSize}
            y2={y + cellSize}
            stroke={frameColor}
            strokeWidth={strokeWidth}
            pointerEvents="none"
          />
        );
      }
      // Left edge
      if (isAdjacentEnabled(row, col - 1)) {
        lineElements.push(
          <line
            key={`${cellId}-left`}
            x1={x}
            y1={y}
            x2={x}
            y2={y + cellSize}
            stroke={frameColor}
            strokeWidth={strokeWidth}
            pointerEvents="none"
          />
        );
      }
      // Right edge
      if (isAdjacentEnabled(row, col + 1)) {
        lineElements.push(
          <line
            key={`${cellId}-right`}
            x1={x + cellSize}
            y1={y}
            x2={x + cellSize}
            y2={y + cellSize}
            stroke={frameColor}
            strokeWidth={strokeWidth}
            pointerEvents="none"
          />
        );
      }
    });

    return { rects: rectElements, borderLines: lineElements };
  }, [isGridMode, gridType, disabledCells, cellSize, outerPadding, marginTop, marginLeft, rows, cols, frameColor, frameStyle, disabledCellColor, backgroundColor, useTopology, topology]);

  // Return null if no content to render
  if (rects.length === 0 && borderLines.length === 0) return null;

  return (
    <g className="disabled-cells-overlay">
      {rects}
      {borderLines}
    </g>
  );
};
