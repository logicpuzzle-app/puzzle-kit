/**
 * PuzzleCanvas - Main canvas component for puzzle rendering
 *
 * This component is responsible for:
 * - Rendering the puzzle grid and all elements
 * - Managing the SVG coordinate system
 * - Delegating input handling to InputHandlerLayer
 */

import React, { useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../store/puzzleStoreContext';
import { getGridDimensions } from '../../utils/gridUtils';
import { getHexSize } from '../../utils/hexGridUtils';
import type { NumberClickInfo, TextClickInfo } from '../../types/canvasInput';
import { InputHandlerLayer } from './InputHandlerLayer';
import { Grid, GridBackground, GridLines, DisabledCellsOverlay } from './Grid';
import { BackgroundImageLayer } from './grid/BackgroundImageLayer';
import { SurfaceLayer } from './SurfaceLayer';
import { MulticolorSurfaceLayer } from './MulticolorSurfaceLayer';
import { BoxLineLayer } from './BoxLineLayer';
import { HighlightLayer } from './HighlightLayer';
import { LineLayer } from './LineLayer';
import { NumberLayer } from './NumberLayer';
import { SymbolLayer } from './SymbolLayer';
import { SpecialLayer } from './SpecialLayer';
import { DirectionalClueLayer, ArrowStyle } from './DirectionalClueLayer';
import { SolutionAreaMaskLayer, SolutionAreaBorderLayer } from './SolutionAreaLayer';
import { AdjacencyOverlay } from './AdjacencyOverlay';
import { SolverLayer } from './SolverLayer';
import { TrialStackLayer } from './TrialStackLayer';

const ZoomInIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const ZoomOutIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

// Re-export input types for downstream usage
export type { NumberClickInfo, TextClickInfo } from '../../types/canvasInput';

interface PuzzleCanvasProps {
  onNumberClick?: (info: NumberClickInfo) => void;
  onTextClick?: (info: TextClickInfo) => void;
  /** Arrow style for directional numbers: 'polygon' (pzprjs-style) or 'unicode' */
  arrowStyle?: ArrowStyle;
  /** Allow multi-touch pan/zoom gestures */
  allowMultiTouchPanZoom?: boolean;
}

export const PuzzleCanvas: React.FC<PuzzleCanvasProps> = ({
  onNumberClick,
  onTextClick,
  arrowStyle = 'polygon',
  allowMultiTouchPanZoom,
}) => {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const {
    grid,
    canvas,
    useTopology,
    topology,
    previewTopology,
    previewGrid,
    trialStage,
    setZoom,
    setPan,
  } = usePuzzleStore();

  // Trial mode opacity for current answer layer:
  // - Not in trial: 100%
  // - In trial: 50% (latest layer)
  // TrialStackLayer handles base (100%) and intermediate (75%) layers
  const currentLayerOpacity = trialStage > 0 ? 0.5 : 1;

  const effectiveTopology = previewTopology ?? topology;
  const effectiveGrid = previewGrid ?? grid;
  const topologyPreferred =
    useTopology ||
    effectiveGrid.gridType === 'pyramid' ||
    effectiveGrid.gridType === 'iso' ||
    effectiveGrid.gridType === 'penrose_P3';

  const { width, height } = useMemo(() => {
    // Prefer topology bounds when available (non-square tilings)
    if (topologyPreferred && effectiveTopology) {
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
  }, [topologyPreferred, effectiveTopology, effectiveGrid]);

  // Export padding offsets
  const exportPaddingLeft = effectiveGrid.exportPaddingLeft ?? 0;
  const exportPaddingTop = effectiveGrid.exportPaddingTop ?? 0;

  // Calculate grid area for background image
  const gridArea = useMemo(() => {
    if (topologyPreferred && effectiveTopology) {
      const { minX, minY, maxX, maxY } = effectiveTopology.bounds;
      return {
        x: minX,
        y: minY,
        width: Math.max(0, maxX - minX),
        height: Math.max(0, maxY - minY),
      };
    }
    if (effectiveGrid.gridType === 'hex') {
      const { width: hexWidth, height: hexHeight } = getHexSize(effectiveGrid.cellSize);
      const rowHeight = hexHeight * 0.75;
      return {
        x: effectiveGrid.outerPadding,
        y: effectiveGrid.outerPadding,
        width: effectiveGrid.cols * hexWidth + hexWidth / 2,
        height: (effectiveGrid.rows - 1) * rowHeight + hexHeight,
      };
    }
    const { outerPadding, cellSize, rows, cols, marginTop = 0, marginLeft = 0 } = effectiveGrid;
    const totalRows = rows + marginTop + (effectiveGrid.marginBottom ?? 0);
    const totalCols = cols + marginLeft + (effectiveGrid.marginRight ?? 0);
    return {
      x: outerPadding,
      y: outerPadding,
      width: totalCols * cellSize,
      height: totalRows * cellSize,
    };
  }, [topologyPreferred, effectiveTopology, effectiveGrid]);

  const transform = `translate(${canvas.panX}, ${canvas.panY}) scale(${canvas.zoom})`;

  return (
    <div className="flex-1 overflow-hidden bg-office-bg relative">
      <InputHandlerLayer
        svgRef={svgRef}
        allowMultiTouchPanZoom={allowMultiTouchPanZoom}
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
              {/* Background image layer (rendered before grid) */}
              <BackgroundImageLayer
                gridConfig={effectiveGrid}
                gridX={gridArea.x}
                gridY={gridArea.y}
                gridWidth={gridArea.width}
                gridHeight={gridArea.height}
              />

              {/* Grid background (cell fills) */}
              <GridBackground />

              {/* Highlight layer below surfaces (play-only visual helpers) */}
              <g opacity={currentLayerOpacity}>
                <HighlightLayer layer="under-surfaces" />
              </g>

              {/* Surface layers (rendered after grid background, before grid lines) */}
              <SurfaceLayer layer="problem" />
              {/* Trial stack layers (saved states with graduated opacity) */}
              <TrialStackLayer />
              {/* Answer surface with trial opacity (current/latest layer) */}
              <g opacity={currentLayerOpacity}>
                <SurfaceLayer layer="answer" />
              </g>

              {/* Multicolor surface layers */}
              <MulticolorSurfaceLayer layer="problem" />
              <g opacity={currentLayerOpacity}>
                <MulticolorSurfaceLayer layer="answer" />
              </g>

              {/* Solution area mask (same layer as surfaces) */}
              <SolutionAreaMaskLayer />

              {/* Highlight layer (play-only visual helpers) */}
              <g opacity={currentLayerOpacity}>
                <HighlightLayer layer="under-lines" />
              </g>

              {/* Grid lines and frame (rendered after surfaces) */}
              <GridLines />

              {/* Adjacency overlay (dotted lines between adjacent cell centers) */}
              <AdjacencyOverlay />

              {/* Disabled cells overlay (only visible in grid mode) */}
              <DisabledCellsOverlay />
            </>
          ) : (
            <>
              {/* Background image layer (rendered before grid) */}
              <BackgroundImageLayer
                gridConfig={effectiveGrid}
                gridX={gridArea.x}
                gridY={gridArea.y}
                gridWidth={gridArea.width}
                gridHeight={gridArea.height}
              />

              {/* Non-square grids: Grid renders everything together */}
              <Grid />

              {/* Highlight layer below surfaces (play-only visual helpers) */}
              <g opacity={currentLayerOpacity}>
                <HighlightLayer layer="under-surfaces" />
              </g>

              {/* Surface layers (rendered after grid for non-square) */}
              <SurfaceLayer layer="problem" />
              {/* Trial stack layers (saved states with graduated opacity) */}
              <TrialStackLayer />
              {/* Answer surface with trial opacity (current/latest layer) */}
              <g opacity={currentLayerOpacity}>
                <SurfaceLayer layer="answer" />
              </g>

              {/* Multicolor surface layers */}
              <MulticolorSurfaceLayer layer="problem" />
              <g opacity={currentLayerOpacity}>
                <MulticolorSurfaceLayer layer="answer" />
              </g>

              {/* Solution area mask (same layer as surfaces) */}
              <SolutionAreaMaskLayer />

              {/* Highlight layer (play-only visual helpers) */}
              <g opacity={currentLayerOpacity}>
                <HighlightLayer layer="under-lines" />
              </g>

              {/* Adjacency overlay (dotted lines between adjacent cell centers) */}
              <AdjacencyOverlay />

              {/* Disabled cells overlay (for hex and other non-square grids) */}
              <DisabledCellsOverlay />
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
          {/* Answer directional numbers with trial opacity */}
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

      {/* Zoom controls */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1 py-0.5 bg-white/80 border border-office-border rounded text-xs text-office-text-secondary shadow-sm">
        <button
          className="h-6 w-6 flex items-center justify-center rounded-sm hover:bg-office-ribbon-hover"
          onClick={() => setZoom(canvas.zoom / 1.2)}
          title={t('view.zoomOut')}
          aria-label={t('view.zoomOut')}
          type="button"
        >
          <ZoomOutIcon size={12} />
        </button>
        <button
          className="h-6 px-1 min-w-[44px] rounded-sm hover:bg-office-ribbon-hover"
          onClick={() => {
            setZoom(1);
            setPan(0, 0);
          }}
          title={t('view.zoom100')}
          aria-label={t('view.zoom100')}
          type="button"
        >
          {Math.round(canvas.zoom * 100)}%
        </button>
        <button
          className="h-6 w-6 flex items-center justify-center rounded-sm hover:bg-office-ribbon-hover"
          onClick={() => setZoom(canvas.zoom * 1.2)}
          title={t('view.zoomIn')}
          aria-label={t('view.zoomIn')}
          type="button"
        >
          <ZoomInIcon size={12} />
        </button>
      </div>
    </div>
  );
};
