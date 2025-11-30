import React from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import { HexGrid, TriangleGrid, PyramidGrid } from './HexGrid';
import { SquareGrid, SquareGridBackground, SquareGridLines } from './SquareGrid';
import { TopologyGrid, TopologyGridBackground, TopologyGridLines } from './TopologyGrid';

// Re-export DisabledCellsOverlay for backwards compatibility
export { DisabledCellsOverlay } from './grid/DisabledCellsOverlay';

// Opacity for preview mode (dimmed grid)
const PREVIEW_OPACITY = 0.4;

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
  const isPreview = previewTopology !== null;

  // Use topology-based background when in topology mode
  if (useTopology && effectiveTopology) {
    const content = <TopologyGridBackground topology={effectiveTopology}>{children}</TopologyGridBackground>;
    return isPreview ? <g opacity={PREVIEW_OPACITY}>{content}</g> : content;
  }

  // Non-square grids handle their own background
  if (gridType !== 'square') {
    return <>{children}</>;
  }

  const content = <SquareGridBackground>{children}</SquareGridBackground>;
  return isPreview ? <g opacity={PREVIEW_OPACITY}>{content}</g> : content;
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
  const isPreview = previewTopology !== null;

  // Use topology-based lines when in topology mode
  if (useTopology && effectiveTopology) {
    const content = <TopologyGridLines topology={effectiveTopology} grid={effectiveGrid} />;
    return isPreview ? <g opacity={PREVIEW_OPACITY}>{content}</g> : content;
  }

  // Non-square grids - no lines here (handled by HexGrid etc.)
  if (gridType !== 'square') {
    return null;
  }

  const content = <SquareGridLines />;
  return isPreview ? <g opacity={PREVIEW_OPACITY}>{content}</g> : content;
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
  const isPreview = previewTopology !== null;

  // Prefer topology-based rendering when enabled and topology available
  if (useTopology && effectiveTopology) {
    const content = <TopologyGrid topology={effectiveTopology} grid={effectiveGrid} />;
    return isPreview ? <g opacity={PREVIEW_OPACITY}>{content}</g> : content;
  }

  // Render non-square grid types
  let content: React.ReactElement;
  if (gridType === 'hex') {
    content = <HexGrid grid={effectiveGrid} />;
  } else if (gridType === 'triangle') {
    content = <TriangleGrid grid={effectiveGrid} />;
  } else if (gridType === 'pyramid') {
    content = <PyramidGrid grid={effectiveGrid} />;
  } else {
    // Use square grid
    content = <SquareGrid />;
  }

  return isPreview ? <g opacity={PREVIEW_OPACITY}>{content}</g> : content;
};
