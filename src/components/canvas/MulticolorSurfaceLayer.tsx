/**
 * Multicolor Surface Layer Component
 *
 * Renders cells with multiple colors (up to 4 per cell).
 * Each cell is divided into triangular sections, each with its own color.
 * This matches Penpa-edit's multicolor surface mode.
 */

import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import { getPenpaColor } from '../../types/penpaElements';
import type { MulticolorSurfaceElement } from '../../types';

interface MulticolorSurfaceLayerProps {
  /** Whether the layer is visible */
  visible?: boolean;
}

/**
 * Generate SVG path for a section of a cell
 * For 'cross' (+) pattern: quadrants - 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right
 * For 'x' (×) pattern: triangles - 0=top-left, 1=top-right, 2=bottom-right, 3=bottom-left
 */
function getSectionPath(
  x: number,
  y: number,
  size: number,
  section: number,
  pattern: 'cross' | 'x' = 'cross'
): string {
  const cx = x + size / 2;
  const cy = y + size / 2;

  if (pattern === 'x') {
    // X pattern: diagonals divide the cell into 4 corner triangles
    // 0=top-left, 1=top-right, 2=bottom-right, 3=bottom-left
    switch (section) {
      case 0: // Top-left corner triangle
        return `M ${x} ${y} L ${cx} ${cy} L ${x} ${y + size} Z`;
      case 1: // Top-right corner triangle
        return `M ${x} ${y} L ${x + size} ${y} L ${cx} ${cy} Z`;
      case 2: // Bottom-right corner triangle
        return `M ${x + size} ${y} L ${x + size} ${y + size} L ${cx} ${cy} Z`;
      case 3: // Bottom-left corner triangle
        return `M ${x + size} ${y + size} L ${x} ${y + size} L ${cx} ${cy} Z`;
      default:
        return '';
    }
  }

  // Cross (+) pattern: quadrants (horizontal/vertical divide cell)
  // 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right
  switch (section) {
    case 0: // Top-left quadrant
      return `M ${x} ${y} L ${cx} ${y} L ${cx} ${cy} L ${x} ${cy} Z`;
    case 1: // Top-right quadrant
      return `M ${cx} ${y} L ${x + size} ${y} L ${x + size} ${cy} L ${cx} ${cy} Z`;
    case 2: // Bottom-left quadrant
      return `M ${x} ${cy} L ${cx} ${cy} L ${cx} ${y + size} L ${x} ${y + size} Z`;
    case 3: // Bottom-right quadrant
      return `M ${cx} ${cy} L ${x + size} ${cy} L ${x + size} ${y + size} L ${cx} ${y + size} Z`;
    default:
      return '';
  }
}

// Custom color starts at index 9
const CUSTOM_COLOR_START_IDX = 9;

/**
 * Get color for a given index, handling custom colors array
 * Index 0-8: standard palette colors
 * Index 9+: custom colors from the array
 */
function getColorForIndex(colorIndex: number, customColors?: string[]): string {
  if (colorIndex >= CUSTOM_COLOR_START_IDX && customColors) {
    const customIdx = colorIndex - CUSTOM_COLOR_START_IDX;
    if (customIdx < customColors.length) {
      return customColors[customIdx];
    }
  }
  return getPenpaColor(colorIndex);
}

/**
 * Render a single multicolor cell
 */
const MulticolorCell: React.FC<{
  element: MulticolorSurfaceElement;
  x: number;
  y: number;
  size: number;
}> = ({ element, x, y, size }) => {
  const { colors, pattern = 'cross', customColors } = element;

  // If only one color, render full cell
  if (colors.length === 1) {
    if (colors[0] === 0) return null; // Transparent
    const color = getColorForIndex(colors[0], customColors);

    return (
      <rect
        x={x}
        y={y}
        width={size}
        height={size}
        fill={color}
        className="multicolor-surface"
      />
    );
  }

  // Multiple colors - render sections based on pattern
  return (
    <g className="multicolor-surface">
      {colors.map((colorIndex, section) => {
        if (colorIndex === 0) return null; // Skip transparent

        const color = getColorForIndex(colorIndex, customColors);
        const path = getSectionPath(x, y, size, section, pattern);

        return (
          <path
            key={`section-${section}`}
            d={path}
            fill={color}
          />
        );
      })}
    </g>
  );
};

export const MulticolorSurfaceLayer: React.FC<MulticolorSurfaceLayerProps> = ({
  visible = true,
}) => {
  const { grid, puzzle } = usePuzzleStore();
  const multicolorSurfaces = puzzle.multicolorSurfaces;

  const cellPositions = useMemo(() => {
    const positions: Map<string, { x: number; y: number }> = new Map();

    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const cellId = `cell-${row}-${col}`;
        const x = grid.outerPadding + col * grid.cellSize;
        const y = grid.outerPadding + row * grid.cellSize;
        positions.set(cellId, { x, y });
      }
    }

    return positions;
  }, [grid]);

  if (!visible || !multicolorSurfaces) {
    return null;
  }

  const elements = Object.values(multicolorSurfaces);

  if (elements.length === 0) {
    return null;
  }

  return (
    <g className="multicolor-surface-layer">
      {elements.map((element) => {
        const pos = cellPositions.get(element.cellId);
        if (!pos) return null;

        return (
          <MulticolorCell
            key={element.id}
            element={element}
            x={pos.x}
            y={pos.y}
            size={grid.cellSize}
          />
        );
      })}
    </g>
  );
};

export default MulticolorSurfaceLayer;
