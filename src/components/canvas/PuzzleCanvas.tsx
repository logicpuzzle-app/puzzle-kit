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
import { BoxLineLayer } from './BoxLineLayer';
import { LineLayer } from './LineLayer';
import { NumberLayer } from './NumberLayer';
import { SymbolLayer } from './SymbolLayer';
import { SpecialLayer } from './SpecialLayer';
import { DirectionalClueLayer, ArrowStyle } from './DirectionalClueLayer';
import { SolutionAreaMaskLayer, SolutionAreaBorderLayer } from './SolutionAreaLayer';
import { AdjacencyOverlay } from './AdjacencyOverlay';
import { SolverLayer } from './SolverLayer';
import { TrialStackLayer } from './TrialStackLayer';

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
  const {
    grid,
    canvas,
    useTopology,
    topology,
    previewTopology,
    previewGrid,
    trialStage,
  } = usePuzzleStore();

  // Trial mode opacity for current answer layer:
  // - Not in trial: 100%
  // - In trial: 50% (latest layer)
  // TrialStackLayer handles base (100%) and intermediate (75%) layers
  const currentLayerOpacity = trialStage > 0 ? 0.5 : 1;

  const effectiveTopology = previewTopology ?? topology;
  const effectiveGrid = previewGrid ?? grid;

  const { width, height } = useMemo(() => {
    // Prefer topology bounds when available (non-square tilings)
    if (useTopology && effectiveTopology) {
      const exportPaddingLeft = effectiveGrid.exportPaddingLeft ?? 0;
      const exportPaddingRight = effectiveGrid.exportPaddingRight ?? 0;
      const exportPaddingTop = effectiveGrid.exportPaddingTop ?? 0;
      const exportPaddingBottom = effectiveGrid.exportPaddingBottom ?? 0;
      return {
        width: effectiveTopology.bounds.width + exportPaddingLeft + exportPaddingRight,
        height: effectiveTopology.bounds.height + exportPaddingTop + exportPaddingBottom,
      };
    }
    return getGridDimensions(effectiveGrid);
  }, [useTopology, effectiveTopology, effectiveGrid]);

  // Export padding offsets
  const exportPaddingLeft = effectiveGrid.exportPaddingLeft ?? 0;
  const exportPaddingTop = effectiveGrid.exportPaddingTop ?? 0;

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
          {effectiveGrid.gridType === 'square' || !effectiveGrid.gridType ? (
            <>
              {/* Grid background (cell fills) */}
              <GridBackground />

              {/* Surface layers (rendered after grid background, before grid lines) */}
              <SurfaceLayer layer="problem" />
              {/* Trial stack layers (saved states with graduated opacity) */}
              <TrialStackLayer />
              {/* Answer surface with trial opacity (current/latest layer) */}
              <g opacity={currentLayerOpacity}>
                <SurfaceLayer layer="answer" />
              </g>

              {/* Multicolor surface layer */}
              <MulticolorSurfaceLayer />

              {/* Solution area mask (same layer as surfaces) */}
              <SolutionAreaMaskLayer />

              {/* Grid lines and frame (rendered after surfaces) */}
              <GridLines />

              {/* Adjacency overlay (dotted lines between adjacent cell centers) */}
              <AdjacencyOverlay />

              {/* Disabled cells overlay (only visible in grid mode) */}
              <DisabledCellsOverlay />
            </>
          ) : (
            <>
              {/* Non-square grids: Grid renders everything together */}
              <Grid />

              {/* Surface layers (rendered after grid for non-square) */}
              <SurfaceLayer layer="problem" />
              {/* Trial stack layers (saved states with graduated opacity) */}
              <TrialStackLayer />
              {/* Answer surface with trial opacity (current/latest layer) */}
              <g opacity={currentLayerOpacity}>
                <SurfaceLayer layer="answer" />
              </g>

              {/* Multicolor surface layer */}
              <MulticolorSurfaceLayer />

              {/* Solution area mask (same layer as surfaces) */}
              <SolutionAreaMaskLayer />

              {/* Adjacency overlay (dotted lines between adjacent cell centers) */}
              <AdjacencyOverlay />
            </>
          )}

          {/* BoxLine layers (snake/patrol style filled boxes with connections) */}
          <BoxLineLayer layer="problem" />
          {/* Answer BoxLine with trial opacity */}
          <g opacity={currentLayerOpacity}>
            <BoxLineLayer layer="answer" />
          </g>

          {/* Line layers (edges, walls, lines) */}
          <LineLayer layer="problem" />
          {/* Answer lines with trial opacity */}
          <g opacity={currentLayerOpacity}>
            <LineLayer layer="answer" />
          </g>

          {/* Special layers (cages, thermos, arrows) */}
          <SpecialLayer layer="problem" />
          {/* Answer specials with trial opacity */}
          <g opacity={currentLayerOpacity}>
            <SpecialLayer layer="answer" />
          </g>

          {/* Symbol layers */}
          <SymbolLayer layer="problem" />
          {/* Answer symbols with trial opacity */}
          <g opacity={currentLayerOpacity}>
            <SymbolLayer layer="answer" />
          </g>

          {/* Directional clue layer (Yajilin-style arrows with numbers) */}
          <DirectionalClueLayer layer="problem" arrowStyle={arrowStyle} />
          {/* Answer directional clues with trial opacity */}
          <g opacity={currentLayerOpacity}>
            <DirectionalClueLayer layer="answer" arrowStyle={arrowStyle} />
          </g>

          {/* Number layers (rendered last, on top) */}
          <NumberLayer layer="problem" />
          {/* Answer numbers with trial opacity */}
          <g opacity={currentLayerOpacity}>
            <NumberLayer layer="answer" />
          </g>

          {/* Solution area border (rendered on top of all puzzle elements) */}
          <SolutionAreaBorderLayer />

          {/* Solver layer (rendered on top of everything when solver mode is active) */}
          <SolverLayer />
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
