/**
 * Multicolor Surface Layer Component
 *
 * Renders cells with multiple colors (up to 4 per cell).
 * Each cell is divided into triangular sections, each with its own color.
 * This matches Penpa-edit's multicolor surface mode.
 */

import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStoreContext';
import { getPenpaColor } from '../../types/penpaElements';
import type { DataLayerType, MulticolorSurfaceElement } from '../../types';
import type { TopologyVertex } from '../../utils/gridTopology';

interface MulticolorSurfaceLayerProps {
  /** Whether the layer is visible */
  visible?: boolean;
  /** Which puzzle layer to render (Penpa question/answer) */
  layer?: DataLayerType;
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

/**
 * Render a multicolor cell in topology mode
 * Uses polygon vertices and center to create sections
 * - 'x' pattern: divide by lines from center to vertices (triangles)
 * - 'cross' pattern: divide by lines from center to edge midpoints (quadrilaterals)
 */
const MulticolorCellTopology: React.FC<{
  element: MulticolorSurfaceElement;
  center: { x: number; y: number };
  vertices: { x: number; y: number }[];
}> = ({ element, center, vertices }) => {
  const { colors, pattern = 'cross', customColors } = element;

  // If only one color, render full polygon
  if (colors.length === 1) {
    if (colors[0] === 0) return null; // Transparent
    const color = getColorForIndex(colors[0], customColors);

    return (
      <polygon
        points={vertices.map(v => `${v.x},${v.y}`).join(' ')}
        fill={color}
        className="multicolor-surface"
      />
    );
  }

  const numVertices = vertices.length;
  if (numVertices < 3) return null;

  // Map 4 color slots to sections
  const sectionsPerColor = Math.ceil(numVertices / 4);

  if (pattern === 'x') {
    // X pattern: divide by lines from center to vertices
    // Each slot gets triangles from center to vertex to next vertex
    return (
      <g className="multicolor-surface">
        {colors.map((colorIndex, colorSlot) => {
          if (colorIndex === 0) return null; // Skip transparent

          const color = getColorForIndex(colorIndex, customColors);
          const paths: React.ReactNode[] = [];

          const startIdx = colorSlot * sectionsPerColor;
          const endIdx = Math.min(startIdx + sectionsPerColor, numVertices);

          for (let i = startIdx; i < endIdx; i++) {
            const v1 = vertices[i];
            const v2 = vertices[(i + 1) % numVertices];

            paths.push(
              <polygon
                key={`${colorSlot}-${i}`}
                points={`${center.x},${center.y} ${v1.x},${v1.y} ${v2.x},${v2.y}`}
                fill={color}
              />
            );
          }

          return <g key={`section-${colorSlot}`}>{paths}</g>;
        })}
      </g>
    );
  }

  // Cross (+) pattern: divide by lines from center to edge midpoints
  // Calculate edge midpoints
  const edgeMidpoints = vertices.map((v, i) => {
    const next = vertices[(i + 1) % numVertices];
    return { x: (v.x + next.x) / 2, y: (v.y + next.y) / 2 };
  });

  return (
    <g className="multicolor-surface">
      {colors.map((colorIndex, colorSlot) => {
        if (colorIndex === 0) return null; // Skip transparent

        const color = getColorForIndex(colorIndex, customColors);
        const paths: React.ReactNode[] = [];

        const startIdx = colorSlot * sectionsPerColor;
        const endIdx = Math.min(startIdx + sectionsPerColor, numVertices);

        for (let i = startIdx; i < endIdx; i++) {
          const prevMid = edgeMidpoints[(i - 1 + numVertices) % numVertices];
          const vertex = vertices[i];
          const nextMid = edgeMidpoints[i];

          // Quadrilateral: center -> prevMid -> vertex -> nextMid
          paths.push(
            <polygon
              key={`${colorSlot}-${i}`}
              points={`${center.x},${center.y} ${prevMid.x},${prevMid.y} ${vertex.x},${vertex.y} ${nextMid.x},${nextMid.y}`}
              fill={color}
            />
          );
        }

        return <g key={`section-${colorSlot}`}>{paths}</g>;
      })}
    </g>
  );
};

export const MulticolorSurfaceLayer: React.FC<MulticolorSurfaceLayerProps> = ({
  visible = true,
  layer,
}) => {
  const { grid, puzzle, useTopology, topology, showProblemLayer, showAnswerLayer } = usePuzzleStore();
  const multicolorSurfaces = puzzle.multicolorSurfaces;

  const cellData = useMemo(() => {
    const data: Map<string, { x: number; y: number; polygon?: { x: number; y: number }[]; center?: { x: number; y: number } }> = new Map();

    if (useTopology && topology) {
      for (const [cellId, topoCell] of topology.cells) {
        const vertices = topoCell.boundaryVertices
          .map(vId => topology.vertices.get(vId))
          .filter((v): v is TopologyVertex => v !== undefined)
          .map(v => v.position);

        if (vertices.length === 0) continue;

        data.set(cellId, {
          x: 0,
          y: 0,
          polygon: vertices,
          center: topoCell.center,
        });
      }

      return data;
    }

    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const cellId = `cell-${row}-${col}`;
        const x = grid.outerPadding + col * grid.cellSize;
        const y = grid.outerPadding + row * grid.cellSize;
        data.set(cellId, { x, y });
      }
    }

    return data;
  }, [grid, useTopology, topology]);

  if (!visible || !multicolorSurfaces) {
    return null;
  }

  const isLayerVisible = (dataLayer: DataLayerType) =>
    (dataLayer === 'problem' && showProblemLayer) ||
    (dataLayer === 'answer' && showAnswerLayer);

  const elements = Object.values(multicolorSurfaces).filter((element) => {
    const elementLayer: DataLayerType = element.layer === 'answer' ? 'answer' : 'problem';
    if (layer && elementLayer !== layer) return false;
    return isLayerVisible(elementLayer);
  });

  if (elements.length === 0) {
    return null;
  }

  return (
    <g className="multicolor-surface-layer" data-layer={layer ?? 'both'}>
      {elements.map((element) => {
        const cellInfo = cellData.get(element.cellId);
        if (!cellInfo) return null;

        if (useTopology && cellInfo.polygon && cellInfo.center) {
          return (
            <MulticolorCellTopology
              key={element.id}
              element={element}
              center={cellInfo.center}
              vertices={cellInfo.polygon}
            />
          );
        }

        return (
          <MulticolorCell
            key={element.id}
            element={element}
            x={cellInfo.x}
            y={cellInfo.y}
            size={grid.cellSize}
          />
        );
      })}
    </g>
  );
};

export default MulticolorSurfaceLayer;
