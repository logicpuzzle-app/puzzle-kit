import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../../store/puzzleStoreContext';
import type { TopologyVertex } from '../../../utils/gridTopology';
import { getCellCorners, getCellId, getCellIndexById } from '../../../utils/gridUtils';

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
    // Support both legacy disabledCells and new voidCells/outboardCells
    disabledCells,
    voidCells,
    outboardCells,
    rows,
    cols,
    frameColor,
    frameStyle,
    disabledCellColor,
    backgroundColor,
  } = grid;

  // useMemo must be called unconditionally (React Hooks rules)
  const { rects, borderLines } = useMemo(() => {
    // Combine all disabled cells (legacy + void + outboard)
    const allDisabledCells = [
      ...(disabledCells || []),
      ...(voidCells || []),
      ...(outboardCells || []),
    ];

    // Return empty if no disabled cells
    if (allDisabledCells.length === 0) {
      return { rects: [], borderLines: [] };
    }

    // For non-square grids without topology, return empty
    if (gridType !== 'square' && !useTopology) {
      return { rects: [], borderLines: [] };
    }
    const rectElements: React.ReactElement[] = [];
    const lineElements: React.ReactElement[] = [];

    // Use combined disabled cells
    const disabledArray = allDisabledCells;
    const disabledSet = new Set(disabledArray);

    // Use same stroke width as frame style
    const strokeWidth = frameStyle === 'thick' ? 4 : 2;

    // Helper to check if a cell is within the main grid bounds (excludes margin cells)
    const isInBounds = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols;

    // Helper to check if a cell is disabled (by ID)
    const isDisabledByIndex = (r: number, c: number) => disabledSet.has(getCellId(r, c, gridType));

    // Helper to check if adjacent cell is enabled (in bounds and not disabled)
    const isAdjacentEnabled = (r: number, c: number) => isInBounds(r, c) && !isDisabledByIndex(r, c);

    // Topology mode - use topology positions
    if (useTopology && topology) {
      const fillColor = disabledCellColor || '#ffffff';

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

          // In topology mode, treat the adjacent cell as enabled if it exists and isn't disabled.
          const adjacentCell = topology.cells.get(adjacentCellId);
          if (!adjacentCell) return;
          if (!disabledSet.has(adjacentCellId)) {
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
      const index = getCellIndexById(cellId, grid);
      if (!index) return;
      const row = index.row;
      const col = index.col;

      // Skip cells outside the main grid
      if (!isInBounds(row, col)) return;

      const [topLeft] = getCellCorners(row, col, grid);
      const x = topLeft.x;
      const y = topLeft.y;

      // Add overlay for disabled cell
      // Use disabledCellColor in all modes (default: white #ffffff)
      const fillColor = disabledCellColor || '#ffffff';
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
  }, [isGridMode, gridType, disabledCells, voidCells, outboardCells, cellSize, outerPadding, marginTop, marginLeft, rows, cols, frameColor, frameStyle, disabledCellColor, backgroundColor, useTopology, topology]);

  // Return null if no content to render
  if (rects.length === 0 && borderLines.length === 0) return null;

  return (
    <g className="disabled-cells-overlay">
      {rects}
      {borderLines}
    </g>
  );
};
