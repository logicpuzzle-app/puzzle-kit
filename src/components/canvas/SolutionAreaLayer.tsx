/**
 * Solution Area Layer Components
 *
 * Split into two components for proper layering:
 * - SolutionAreaMaskLayer: Renders the mask fills (same layer as surfaces)
 * - SolutionAreaBorderLayer: Renders the boundary lines (on top of everything)
 */

import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';

interface SolutionAreaMaskLayerProps {
  /** Whether to show the mask overlay */
  visible?: boolean;
  /** Opacity of the mask for cells outside solution area */
  maskOpacity?: number;
  /** Color of the mask overlay */
  maskColor?: string;
}

/**
 * SolutionAreaMaskLayer - Renders mask fills for non-solution cells
 * Should be rendered at the same layer as SurfaceLayer (after grid background, before grid lines)
 */
export const SolutionAreaMaskLayer: React.FC<SolutionAreaMaskLayerProps> = ({
  visible = true,
  maskOpacity = 0.3,
  maskColor = '#888888',
}) => {
  const { grid, puzzle } = usePuzzleStore();
  const solutionArea = puzzle.solutionArea;

  const { cellPositions, nonSolutionCellIds } = useMemo(() => {
    const positions: Map<string, { x: number; y: number }> = new Map();
    const nonSolutionSet = new Set<string>();

    if (!solutionArea || !solutionArea.enabled) {
      return { cellPositions: positions, nonSolutionCellIds: nonSolutionSet };
    }

    const solutionSet = new Set(solutionArea.cells);

    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const cellId = `cell-${row}-${col}`;
        const x = grid.outerPadding + col * grid.cellSize;
        const y = grid.outerPadding + row * grid.cellSize;
        positions.set(cellId, { x, y });

        if (!solutionSet.has(cellId)) {
          nonSolutionSet.add(cellId);
        }
      }
    }

    return { cellPositions: positions, nonSolutionCellIds: nonSolutionSet };
  }, [grid, solutionArea]);

  if (!visible || !solutionArea?.enabled) {
    return null;
  }

  return (
    <g className="solution-area-mask-layer">
      {Array.from(nonSolutionCellIds).map((cellId) => {
        const pos = cellPositions.get(cellId);
        if (!pos) return null;

        return (
          <rect
            key={`mask-${cellId}`}
            x={pos.x}
            y={pos.y}
            width={grid.cellSize}
            height={grid.cellSize}
            fill={maskColor}
            opacity={maskOpacity}
            pointerEvents="none"
          />
        );
      })}
    </g>
  );
};

interface SolutionAreaBorderLayerProps {
  /** Whether to show the border */
  visible?: boolean;
  /** Border color */
  borderColor?: string;
}

/**
 * SolutionAreaBorderLayer - Renders boundary lines around solution area
 * Should be rendered on top of all puzzle elements
 */
export const SolutionAreaBorderLayer: React.FC<SolutionAreaBorderLayerProps> = ({
  visible = true,
  borderColor = '#0000ff',
}) => {
  const { grid, puzzle } = usePuzzleStore();
  const solutionArea = puzzle.solutionArea;

  const boundaryEdges = useMemo(() => {
    if (!solutionArea || !solutionArea.enabled) {
      return [];
    }

    const solutionSet = new Set(solutionArea.cells);
    const edges: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

    for (const cellId of solutionArea.cells) {
      const match = cellId.match(/cell-(\d+)-(\d+)/);
      if (!match) continue;

      const row = parseInt(match[1], 10);
      const col = parseInt(match[2], 10);
      const x = grid.outerPadding + col * grid.cellSize;
      const y = grid.outerPadding + row * grid.cellSize;
      const size = grid.cellSize;

      // Top edge
      const topCellId = `cell-${row - 1}-${col}`;
      if (!solutionSet.has(topCellId)) {
        edges.push({ x1: x, y1: y, x2: x + size, y2: y });
      }

      // Bottom edge
      const bottomCellId = `cell-${row + 1}-${col}`;
      if (!solutionSet.has(bottomCellId)) {
        edges.push({ x1: x, y1: y + size, x2: x + size, y2: y + size });
      }

      // Left edge
      const leftCellId = `cell-${row}-${col - 1}`;
      if (!solutionSet.has(leftCellId)) {
        edges.push({ x1: x, y1: y, x2: x, y2: y + size });
      }

      // Right edge
      const rightCellId = `cell-${row}-${col + 1}`;
      if (!solutionSet.has(rightCellId)) {
        edges.push({ x1: x + size, y1: y, x2: x + size, y2: y + size });
      }
    }

    return edges;
  }, [solutionArea, grid]);

  if (!visible || !solutionArea?.enabled || boundaryEdges.length === 0) {
    return null;
  }

  return (
    <g className="solution-area-border-layer">
      {boundaryEdges.map((edge, index) => (
        <line
          key={`boundary-${index}`}
          x1={edge.x1}
          y1={edge.y1}
          x2={edge.x2}
          y2={edge.y2}
          stroke={borderColor}
          strokeWidth={3}
          strokeLinecap="square"
          pointerEvents="none"
        />
      ))}
    </g>
  );
};

interface SolutionAreaLayerProps {
  /** Whether to show the solution area overlay */
  visible?: boolean;
  /** Opacity of the mask for cells outside solution area */
  maskOpacity?: number;
  /** Color of the mask overlay */
  maskColor?: string;
  /** Whether to show border around solution area */
  showBorder?: boolean;
  /** Border color */
  borderColor?: string;
}

/**
 * SolutionAreaLayer - Combined component for backward compatibility
 * Renders both mask and border together (use separate components for proper layering)
 */
export const SolutionAreaLayer: React.FC<SolutionAreaLayerProps> = ({
  visible = true,
  maskOpacity = 0.3,
  maskColor = '#888888',
  showBorder = true,
  borderColor = '#0000ff',
}) => {
  return (
    <>
      <SolutionAreaMaskLayer
        visible={visible}
        maskOpacity={maskOpacity}
        maskColor={maskColor}
      />
      {showBorder && (
        <SolutionAreaBorderLayer visible={visible} borderColor={borderColor} />
      )}
    </>
  );
};

export default SolutionAreaLayer;
