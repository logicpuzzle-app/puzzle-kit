/**
 * PuzzleCanvas - Main canvas component for puzzle rendering
 *
 * This component is responsible for:
 * - Rendering the puzzle grid and all elements
 * - Managing the SVG coordinate system
 * - Delegating input handling to InputHandlerLayer
 */

import React, { useRef, useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import { getGridDimensions } from '../../utils/gridUtils';
import { InputHandlerLayer } from './InputHandlerLayer';
import { Grid, GridBackground, GridLines, DisabledCellsOverlay } from './Grid';
import { SurfaceLayer } from './SurfaceLayer';
import { MulticolorSurfaceLayer } from './MulticolorSurfaceLayer';
import { LineLayer } from './LineLayer';
import { NumberLayer } from './NumberLayer';
import { SymbolLayer } from './SymbolLayer';
import { SpecialLayer } from './SpecialLayer';
import { DirectionalClueLayer, ArrowStyle } from './DirectionalClueLayer';
import { SolutionAreaMaskLayer, SolutionAreaBorderLayer } from './SolutionAreaLayer';

// Re-export types from InputHandlerLayer
export type { NumberClickInfo, TextClickInfo } from './InputHandlerLayer';

interface PuzzleCanvasProps {
  onNumberClick?: (info: import('./InputHandlerLayer').NumberClickInfo) => void;
  onTextClick?: (info: import('./InputHandlerLayer').TextClickInfo) => void;
  /** Arrow style for directional clues: 'polygon' (pzprjs-style) or 'unicode' */
  arrowStyle?: ArrowStyle;
}

export const PuzzleCanvas: React.FC<PuzzleCanvasProps> = ({
  onNumberClick,
  onTextClick,
  arrowStyle = 'polygon',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { grid, canvas } = usePuzzleStore();

  const { width, height } = useMemo(() => getGridDimensions(grid), [grid]);

  // Export padding offsets
  const exportPaddingLeft = grid.exportPaddingLeft ?? 0;
  const exportPaddingTop = grid.exportPaddingTop ?? 0;

  const transform = `translate(${canvas.panX}, ${canvas.panY}) scale(${canvas.zoom})`;

  return (
    <div className="flex-1 overflow-hidden bg-office-bg relative">
      <InputHandlerLayer
        svgRef={svgRef}
        onNumberClick={onNumberClick}
        onTextClick={onTextClick}
      >
        <defs>
          {/* Patterns for special fills */}
          <pattern
            id="dots-pattern"
            x="0"
            y="0"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1" fill="#666666" />
          </pattern>
          <pattern
            id="diagonal-pattern"
            x="0"
            y="0"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M-1,1 l2,-2 M0,8 l8,-8 M7,9 l2,-2"
              stroke="#666666"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        <g transform={transform}>
          {/* Background for panning area */}
          <rect
            x={-1000}
            y={-1000}
            width={width + 2000}
            height={height + 2000}
            fill="#f3f2f1"
          />

          {/* Export padding background (same color as grid background) */}
          {(exportPaddingLeft > 0 || exportPaddingTop > 0 || (grid.exportPaddingRight ?? 0) > 0 || (grid.exportPaddingBottom ?? 0) > 0) && (
            <rect
              x={0}
              y={0}
              width={width}
              height={height}
              fill={grid.backgroundColor}
            />
          )}

          {/* Grid content offset by export padding */}
          <g transform={`translate(${exportPaddingLeft}, ${exportPaddingTop})`}>

          {/* For square grids: separate background and lines for proper surface layering */}
          {/* For non-square grids: use combined Grid component */}
          {grid.gridType === 'square' || !grid.gridType ? (
            <>
              {/* Grid background (cell fills) */}
              <GridBackground />

              {/* Surface layers (rendered after grid background, before grid lines) */}
              <SurfaceLayer layer="problem" />
              <SurfaceLayer layer="answer" />

              {/* Multicolor surface layer */}
              <MulticolorSurfaceLayer />

              {/* Solution area mask (same layer as surfaces) */}
              <SolutionAreaMaskLayer />

              {/* Grid lines and frame (rendered after surfaces) */}
              <GridLines />

              {/* Disabled cells overlay (only visible in grid mode) */}
              <DisabledCellsOverlay />
            </>
          ) : (
            <>
              {/* Non-square grids: Grid renders everything together */}
              <Grid />

              {/* Surface layers (rendered after grid for non-square) */}
              <SurfaceLayer layer="problem" />
              <SurfaceLayer layer="answer" />

              {/* Multicolor surface layer */}
              <MulticolorSurfaceLayer />

              {/* Solution area mask (same layer as surfaces) */}
              <SolutionAreaMaskLayer />
            </>
          )}

          {/* Line layers (edges, walls, lines) */}
          <LineLayer layer="problem" />
          <LineLayer layer="answer" />

          {/* Special layers (cages, thermos, arrows) */}
          <SpecialLayer layer="problem" />
          <SpecialLayer layer="answer" />

          {/* Symbol layers */}
          <SymbolLayer layer="problem" />
          <SymbolLayer layer="answer" />

          {/* Directional clue layer (Yajilin-style arrows with numbers) */}
          <DirectionalClueLayer layer="problem" arrowStyle={arrowStyle} />
          <DirectionalClueLayer layer="answer" arrowStyle={arrowStyle} />

          {/* Number layers (rendered last, on top) */}
          <NumberLayer layer="problem" />
          <NumberLayer layer="answer" />

          {/* Solution area border (rendered on top of all puzzle elements) */}
          <SolutionAreaBorderLayer />
          </g>
        </g>
      </InputHandlerLayer>

      {/* Zoom indicator */}
      <div className="absolute bottom-2 right-2 px-2 py-1 bg-white/80 border border-office-border rounded text-xs text-office-text-secondary">
        {Math.round(canvas.zoom * 100)}%
      </div>
    </div>
  );
};
