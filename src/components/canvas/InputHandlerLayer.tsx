/**
 * InputHandlerLayer - Handles all user input events for the canvas
 *
 * This layer wraps the canvas and handles:
 * - Mouse events (click, drag, wheel)
 * - Touch events (tap, pinch, pan)
 * - Context menu
 * - Number/text tool dialogs
 * - Selection tool
 */

import React, { useMemo, RefObject } from 'react';
import { usePuzzleStore } from '../../store/puzzleStoreContext';
import { useCanvasInputRouter } from '../../hooks/useCanvasInputRouter';
import { useCellFinder } from '../../hooks/useCellFinder';
import { useSpecialPreview } from '../../hooks/useSpecialPreview';
import { useNumberKeyboard } from '../../hooks/useNumberKeyboard';
import { getCellCorners, getCellIndexById, getEdgeIndexById } from '../../utils/gridUtils';
import type { Point } from '../../types';
import type { NumberClickInfo, TextClickInfo } from '../../types/canvasInput';
import type { TopologyVertex } from '../../utils/gridTopology';
import { CanvasCursors } from './CanvasCursors';
import { SpecialToolPreview } from './SpecialToolPreview';
import { getEdgeLineDrawInfo } from '../../utils/gridTopology';
export type { NumberClickInfo, TextClickInfo } from '../../types/canvasInput';

export interface InputHandlerLayerProps {
  /** Reference to the SVG canvas element */
  svgRef: RefObject<SVGSVGElement | null>;
  /** Allow multi-touch pan/zoom gestures */
  allowMultiTouchPanZoom?: boolean;
  /** Callback when number tool is clicked */
  onNumberClick?: (info: NumberClickInfo) => void; // unused for number tools (typing/selection only)
  /** Callback when text tool is clicked */
  onTextClick?: (info: TextClickInfo) => void;
  /** Children elements (the actual canvas content) */
  children: React.ReactNode;
}

// ========================================
// Component
// ========================================

export const InputHandlerLayer: React.FC<InputHandlerLayerProps> = ({
  svgRef,
  allowMultiTouchPanZoom,
  onNumberClick,
  onTextClick,
  children,
}) => {
  const {
    canvas,
    toolSettings,
    grid,
    hoverCell,
    cursorCell,
    numberSelection,
    useTopology,
    topology: storeTopology,
    previewTopology,
    gridEditMode,
    currentInputMode,
    activeLayer,
  } = usePuzzleStore();

  // Excel-like keyboard input for number tools
  useNumberKeyboard();

  // Derived state: grid mode is when activeLayer is 'grid'
  const isGridMode = activeLayer === 'grid';

  // Use preview topology if available (for grid shape preview)
  const topology = previewTopology ?? storeTopology;
  const exportPaddingLeft = grid.exportPaddingLeft ?? 0;
  const exportPaddingTop = grid.exportPaddingTop ?? 0;

  // Unified cell finder hook
  const { findCellIdByRowCol } = useCellFinder();

  const {
    handleWheel,
    handleContextMenu,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    specialPath,
    lineHoverPoint,
    lineStartPoint,
    symbolHoverPoint,
    symbolHoverId,
    isSelecting,
    selectionRect,
    mergingCells,
    splitStartVertex,
    splitHoverVertex,
    sculptHover,
    getSculptHoverPolygons,
    symbolPreview,
  } = useCanvasInputRouter({ svgRef, allowMultiTouchPanZoom, onNumberClick, onTextClick });

  // Get cursor configuration from centralized cursor model
  const { getCssCursor, getOverlayConfig } = usePuzzleStore();
  const cursorClass = getCssCursor();
  const overlayConfig = getOverlayConfig();

  // Calculate hover cell position using overlay config
  const isLineTool = overlayConfig.showLineCursor;
  const isSymbolTool = overlayConfig.showSymbolCursor;

  const showSymbolEdgeLine = useMemo(() => {
    const points = toolSettings.symbolGridPoints || [];
    return points.includes('edge') && currentInputMode !== 'peke';
  }, [currentInputMode, toolSettings.symbolGridPoints]);

  const symbolHoverEdgeLine = useMemo(() => {
    if (!showSymbolEdgeLine) return null;
    if (!symbolHoverPoint || !symbolHoverId) return null;
    if (useTopology && topology) {
      const edgeInfo = getEdgeLineDrawInfo(topology, symbolHoverId);
      if (!edgeInfo) return null;
      return {
        x1: edgeInfo.startVertex.x,
        y1: edgeInfo.startVertex.y,
        x2: edgeInfo.endVertex.x,
        y2: edgeInfo.endVertex.y,
      };
    }
    const edgeIndex = getEdgeIndexById(symbolHoverId, grid);
    if (!edgeIndex) return null;
    const { cellSize, outerPadding } = grid;
    if (edgeIndex.type === 'h') {
      const x1 = outerPadding + edgeIndex.col * cellSize;
      const x2 = x1 + cellSize;
      const y = outerPadding + edgeIndex.row * cellSize;
      return { x1, y1: y, x2, y2: y };
    }
    const y1 = outerPadding + edgeIndex.row * cellSize;
    const y2 = y1 + cellSize;
    const x = outerPadding + edgeIndex.col * cellSize;
    return { x1: x, y1, x2: x, y2 };
  }, [grid, symbolHoverId, symbolHoverPoint, showSymbolEdgeLine, topology, useTopology]);

  // For topology mode, get polygon points for hover cell
  const hoverCellPolygon = useMemo(() => {
    // Use overlay config to determine if cell cursor should be shown
    if (!overlayConfig.showCellCursor) return null;
    if (!hoverCell) return null;
    if (!useTopology || !topology) return null;
    // Hide cursor during topology preview (but not in grid mode)
    if (previewTopology && !isGridMode) return null;

    const cell = topology.cells.get(hoverCell);
    if (!cell) return null;

    const points = cell.boundaryVertices
      .map(vId => topology.vertices.get(vId))
      .filter((v): v is TopologyVertex => v !== undefined)
      .map(v => `${v.position.x},${v.position.y}`)
      .join(' ');

    return points;
  }, [hoverCell, overlayConfig.showCellCursor, useTopology, topology, previewTopology, isGridMode]);

  const hoverCellRect = useMemo(() => {
    // Use overlay config to determine if cell cursor should be shown
    if (!overlayConfig.showCellCursor) return null;
    if (!hoverCell) return null;
    if (useTopology && topology) return null; // Use polygon instead
    // Hide cursor during topology preview (but not in grid mode)
    if (previewTopology && !isGridMode) return null;
    const index = getCellIndexById(hoverCell, grid);
    if (!index) return null;
    const [topLeft] = getCellCorners(index.row, index.col, grid);
    return { x: topLeft.x, y: topLeft.y, size: grid.cellSize };
  }, [hoverCell, grid.outerPadding, grid.cellSize, overlayConfig.showCellCursor, useTopology, topology, previewTopology, isGridMode]);

  // Cursor cell (last tapped) - for direction panel
  const cursorCellPolygon = useMemo(() => {
    // Use overlay config to determine if cursor cell highlight should be shown
    if (!overlayConfig.showCursorCellHighlight) return null;
    if (!cursorCell) return null;
    if (!useTopology || !topology) return null;

    const cell = topology.cells.get(cursorCell);
    if (!cell) return null;

    const points = cell.boundaryVertices
      .map(vId => topology.vertices.get(vId))
      .filter((v): v is TopologyVertex => v !== undefined)
      .map(v => `${v.position.x},${v.position.y}`)
      .join(' ');

    return points;
  }, [cursorCell, overlayConfig.showCursorCellHighlight, useTopology, topology]);

  const cursorCellRect = useMemo(() => {
    // Use overlay config to determine if cursor cell highlight should be shown
    if (!overlayConfig.showCursorCellHighlight) return null;
    if (!cursorCell) return null;
    if (useTopology && topology) return null; // Use polygon instead
    const index = getCellIndexById(cursorCell, grid);
    if (!index) return null;
    const [topLeft] = getCellCorners(index.row, index.col, grid);
    return { x: topLeft.x, y: topLeft.y, size: grid.cellSize };
  }, [cursorCell, overlayConfig.showCursorCellHighlight, grid.outerPadding, grid.cellSize, useTopology, topology]);

  // Use special preview hook for thermo/arrow/cage/boxline tools
  const {
    specialToolType,
    specialPreviewCells,
    specialPreviewPoints,
  } = useSpecialPreview({ specialPath, hoverCell });

  // Calculate split mode preview (line between vertices)
  const splitPreview = useMemo(() => {
    if (!splitStartVertex || !topology) return null;

    const startVertex = topology.vertices.get(splitStartVertex);
    if (!startVertex) return null;

    const startPos = startVertex.position;
    let endPos: Point | null = null;

    if (splitHoverVertex) {
      const hoverVertex = topology.vertices.get(splitHoverVertex);
      if (hoverVertex) {
        endPos = hoverVertex.position;
      }
    }

    return {
      startPos,
      endPos,
      startVertexId: splitStartVertex,
      endVertexId: splitHoverVertex,
    };
  }, [splitStartVertex, splitHoverVertex, topology]);

  // Calculate split mode hover vertex position (for cursor display when not dragging)
  const splitHoverVertexPos = useMemo(() => {
    if (!isGridMode || gridEditMode !== 'split') return null;
    if (!splitHoverVertex || !topology) return null;

    const vertex = topology.vertices.get(splitHoverVertex);
    return vertex?.position ?? null;
  }, [isGridMode, gridEditMode, splitHoverVertex, topology]);

  // Calculate merging cells highlight polygons
  const mergingCellsPolygons = useMemo(() => {
    if (!mergingCells || mergingCells.length === 0) return [];
    if (!topology) return [];

    return mergingCells.map(cellId => {
      const cell = topology.cells.get(cellId);
      if (!cell) return null;

      const points = cell.boundaryVertices
        .map(vId => topology.vertices.get(vId))
        .filter((v): v is TopologyVertex => v !== undefined)
        .map(v => `${v.position.x},${v.position.y}`)
        .join(' ');

      return { cellId, points };
    }).filter((p): p is { cellId: string; points: string } => p !== null);
  }, [mergingCells, topology]);

  // Calculate sculpt mode hover polygons (3-cell cluster)
  const sculptHoverPolygons = useMemo(() => {
    if (!isGridMode || gridEditMode !== 'sculpt') return null;
    return getSculptHoverPolygons(sculptHover);
  }, [isGridMode, gridEditMode, sculptHover, getSculptHoverPolygons]);

  const cellCursorPath = useMemo(() => {
    const tool = toolSettings.currentTool;
    if (!tool.startsWith('number')) return null;

    // Determine target cellId using unified finder
    let targetCellId: string | null = null;
    if (numberSelection) {
      targetCellId = findCellIdByRowCol(numberSelection.row, numberSelection.col);
    } else if (hoverCell) {
      targetCellId = hoverCell;
    }
    if (!targetCellId) return null;

    // In topology mode, use topology vertex positions
    if (useTopology && topology) {
      const cell = topology.cells.get(targetCellId);
      if (!cell) return null;

      const vertices = cell.boundaryVertices
        .map(vId => topology.vertices.get(vId))
        .filter((v): v is TopologyVertex => v !== undefined);

      if (vertices.length < 3) return null;

      return `M ${vertices.map(v => `${v.position.x} ${v.position.y}`).join(' L ')} Z`;
    }

    // Standard mode - parse row/col from cellId
    const index = getCellIndexById(targetCellId, grid);
    if (!index) return null;
    const corners = getCellCorners(index.row, index.col, grid);
    return `M ${corners[0].x} ${corners[0].y} L ${corners[1].x} ${corners[1].y} L ${corners[2].x} ${corners[2].y} L ${corners[3].x} ${corners[3].y} Z`;
  }, [hoverCell, numberSelection, grid, toolSettings.currentTool, useTopology, topology, findCellIdByRowCol]);

  return (
    <svg
      id="puzzle-canvas"
      ref={svgRef}
      className={`w-full h-full touch-none select-none ${cursorClass}`}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onContextMenu={handleContextMenu}
    >
      {children}
      {/* Special preview (thermo/arrow/cage/boxline) */}
      <SpecialToolPreview
        canvas={canvas}
        offsetX={exportPaddingLeft}
        offsetY={exportPaddingTop}
        specialToolType={specialToolType}
        specialPreviewPoints={specialPreviewPoints}
        specialPreviewCells={specialPreviewCells}
        color={toolSettings.color}
      />
      {/* All cursor overlays */}
      <CanvasCursors
        canvas={canvas}
        offsetX={exportPaddingLeft}
        offsetY={exportPaddingTop}
        hoverCellPolygon={hoverCellPolygon}
        hoverCellRect={hoverCellRect}
        cursorCellPolygon={cursorCellPolygon}
        cursorCellRect={cursorCellRect}
        lineStartPoint={lineStartPoint}
        lineHoverPoint={lineHoverPoint}
        isLineTool={isLineTool}
        isStraightMode={toolSettings.lineDirections?.includes('straight') ?? false}
        symbolHoverPoint={symbolHoverPoint}
        symbolHoverEdgeLine={symbolHoverEdgeLine}
        isSymbolTool={isSymbolTool}
        symbolPreview={symbolPreview}
        cellCursorPath={cellCursorPath}
        isSelecting={isSelecting}
        selectionRect={selectionRect}
        mergingCellsPolygons={mergingCellsPolygons}
        splitPreview={splitPreview}
        splitHoverVertexPos={splitHoverVertexPos}
        sculptHoverPolygons={sculptHoverPolygons}
      />
    </svg>
  );
};

export default InputHandlerLayer;
