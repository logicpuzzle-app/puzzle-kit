import React from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import { HexGrid, TriangleGrid, PyramidGrid } from './HexGrid';
import { SquareGrid, SquareGridBackground, SquareGridLines } from './SquareGrid';
import { TopologyGrid, TopologyGridBackground, TopologyGridLines } from './TopologyGrid';

// Re-export DisabledCellsOverlay for backwards compatibility
export { DisabledCellsOverlay } from './grid/DisabledCellsOverlay';

interface GridBackgroundProps {
  children?: React.ReactNode;
}

/**
 * GridBackground - Renders only the grid background (cell fills)
 * Used to render surfaces between background and grid lines
 */
export const GridBackground: React.FC<GridBackgroundProps> = ({ children }) => {
  const { grid, useTopology, topology, previewTopology, previewGrid } = usePuzzleStore();
  // Use preview topology/grid if available
  const effectiveTopology = previewTopology ?? topology;
  const effectiveGrid = previewGrid ?? grid;
  const { gridType = 'square' } = effectiveGrid;

  // Use topology-based background when in topology mode
  if (useTopology && effectiveTopology) {
    return <TopologyGridBackground topology={effectiveTopology}>{children}</TopologyGridBackground>;
  }

  // Non-square grids handle their own background
  if (gridType !== 'square') {
    return <>{children}</>;
  }

  return <SquareGridBackground>{children}</SquareGridBackground>;
};

/**
 * GridLines - Renders grid lines and frame (without background)
 */
export const GridLines: React.FC = () => {
  const { grid, useTopology, topology, previewTopology, previewGrid } = usePuzzleStore();
  // Use preview topology/grid if available
  const effectiveTopology = previewTopology ?? topology;
  const effectiveGrid = previewGrid ?? grid;
  const { gridType = 'square' } = effectiveGrid;

  // Use topology-based lines when in topology mode
  if (useTopology && effectiveTopology) {
    return <TopologyGridLines topology={effectiveTopology} grid={effectiveGrid} />;
  }

  // Non-square grids - no lines here (handled by HexGrid etc.)
  if (gridType !== 'square') {
    return null;
  }

  return <SquareGridLines />;
};

/**
 * Grid - Full grid component (background + lines + frame)
 */
export const Grid: React.FC = () => {
  const { grid, useTopology, topology, previewTopology, previewGrid } = usePuzzleStore();
  // Use preview topology/grid if available
  const effectiveTopology = previewTopology ?? topology;
  const effectiveGrid = previewGrid ?? grid;
  const { gridType = 'square' } = effectiveGrid;

  // Prefer topology-based rendering when enabled and topology available
  if (useTopology && effectiveTopology) {
    return <TopologyGrid topology={effectiveTopology} grid={effectiveGrid} />;
  }

  // Render non-square grid types
  if (gridType === 'hex') {
    return <HexGrid grid={effectiveGrid} />;
  } else if (gridType === 'triangle') {
    return <TriangleGrid grid={effectiveGrid} />;
  } else if (gridType === 'pyramid') {
    return <PyramidGrid grid={effectiveGrid} />;
  }

  // Use topology-based grid when in topology mode
  return <SquareGrid />;
};
