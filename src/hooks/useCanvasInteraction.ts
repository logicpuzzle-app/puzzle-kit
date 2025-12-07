/**
 * useCanvasInteraction - Hook for handling canvas interactions
 *
 * Coordinates between:
 * - Mouse/touch event handling
 * - Tool handlers (surface, line, edge, wall, symbol, etc.)
 * - Grid edit mode handlers (merge, split, exclude, sculpt)
 * - Zoom/pan controls
 *
 * Sub-hooks:
 * - useZoomPan: Zoom and pan controls
 * - useTouchHandlers: Touch event handling
 * - useToolHandlers: Tool-specific logic
 * - useSelectionTool: Selection rectangle
 * - useGridEditMode: Grid merge/split
 * - useSculptMode: Isometric sculpting
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { usePuzzleStore } from '../store/puzzleStore';
import { screenToSvg } from '../utils/gridUtils';
import { useToolHandlers } from './useToolHandlers';
import { useSelectionTool, type SelectionRect } from './useSelectionTool';
import { useGridPointUtils } from './useGridPointUtils';
import { useGridEditMode } from './useGridEditMode';
import { useSculptMode } from './useSculptMode';
import { useZoomPan } from './useZoomPan';
import { useTouchHandlers } from './useTouchHandlers';
import type { Point } from '../types';

interface UseCanvasInteractionOptions {
  svgRef: React.RefObject<SVGSVGElement | null>;
}

export function useCanvasInteraction({ svgRef }: UseCanvasInteractionOptions) {
  const {
    grid,
    canvas,
    toolSettings,
    setCanvasState,
    setPan,
    startHistoryGroup,
    endHistoryGroup,
    activeLayer,
    gridEditMode,
    topology,
  } = usePuzzleStore();

  // Derived state: grid mode is when activeLayer is 'grid'
  const isGridMode = activeLayer === 'grid';

  // Drawing state
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null);
  const [drawStartPoint, setDrawStartPoint] = useState<string | null>(null);
  const [drawStartPosition, setDrawStartPosition] = useState<Point | null>(null);
  const [specialPath, setSpecialPath] = useState<string[]>([]);
  const [lineHoverPoint, setLineHoverPoint] = useState<Point | null>(null);
  const [symbolHoverPoint, setSymbolHoverPoint] = useState<Point | null>(null);
  const [currentStrokeId, setCurrentStrokeId] = useState<string | null>(null);
  const isDraggingRef = useRef(false);
  const isRightClickRef = useRef(false);
  const isShiftKeyRef = useRef(false);

  // Clear cursor states when switching to non-editable layers
  useEffect(() => {
    if (activeLayer === 'constraint' || activeLayer === 'grid') {
      setLineHoverPoint(null);
      setSymbolHoverPoint(null);
      setDrawStartPoint(null);
      setDrawStartPosition(null);
    }
  }, [activeLayer]);

  // Get tool handlers
  const toolHandlers = useToolHandlers({
    drawStartPoint,
    setDrawStartPoint,
    drawStartPosition,
    setDrawStartPosition,
    currentStrokeId,
    setCurrentStrokeId,
    specialPath,
    setSpecialPath,
  });

  const {
    handleSurfaceTool,
    handleGridTool,
    handleLineTool,
    handleEdgeTool,
    handleWallTool,
    handleNumberTool,
    handleSymbolTool,
    handleSpecialTool,
    handleMulticolorSurfaceTool,
    handleSolutionAreaTool,
    handleSurfaceCycleTool,
    handleTextTool,
    handleCageTool,
    handleBoxLineTool,
    handleStraightLineEnd,
    resetFillModes,
  } = toolHandlers;

  const { findNearestGridPoint } = useGridPointUtils(grid);

  // Grid edit mode handlers (merge, split)
  const {
    mergingCells,
    handleMergeMode,
    splitStartVertex,
    splitHoverVertex,
    handleSplitMode,
    updateSplitHoverVertex,
  } = useGridEditMode({ topology });

  // Sculpt mode handlers
  const {
    sculptHover,
    handleSculptMode,
    updateSculptHover,
    getSculptHoverPolygons,
  } = useSculptMode({ grid, topology });

  // Zoom/pan handlers
  const { handleWheel } = useZoomPan({ svgRef });

  // Mouse position helper
  const getMousePosition = useCallback(
    (e: React.MouseEvent | MouseEvent): Point => {
      return screenToSvg(
        e.clientX,
        e.clientY,
        canvas.zoom,
        canvas.panX,
        canvas.panY,
        svgRef.current
      );
    },
    [canvas.zoom, canvas.panX, canvas.panY, svgRef]
  );

  // Selection tool handlers
  const {
    isSelecting,
    selectionRect,
    handleSelectTool,
  } = useSelectionTool({ getMousePosition });

  // Touch handlers
  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useTouchHandlers({
    svgRef,
    toolHandlers,
    drawStartPoint,
    setDrawStartPoint,
    setDrawStartPosition,
    setCurrentStrokeId,
    isDraggingRef,
    isRightClickRef,
    isShiftKeyRef,
  });

  // Mouse down handler
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const point = getMousePosition(e);
      const isRightClick = e.button === 2;
      const isShiftKey = e.shiftKey;

      // Middle mouse button, alt+click, or panMode for panning
      if (e.button === 1 || (e.button === 0 && e.altKey) || (e.button === 0 && canvas.panMode)) {
        setIsPanning(true);
        setLastPanPoint({ x: e.clientX, y: e.clientY });
        return;
      }

      // Reset fill modes for new drawing operation
      resetFillModes();

      // Start a history group for drag operations
      startHistoryGroup();

      setCanvasState({ isDrawing: true });
      isDraggingRef.current = false;
      isRightClickRef.current = isRightClick;
      isShiftKeyRef.current = isShiftKey;

      // Handle grid mode based on gridEditMode
      if (isGridMode) {
        if (gridEditMode === 'exclude') {
          handleGridTool(point, isRightClick, isShiftKey);
        } else if (gridEditMode === 'merge') {
          handleMergeMode(point, true, false, isRightClick);
        } else if (gridEditMode === 'split') {
          handleSplitMode(point, true, false, isRightClick);
        } else if (gridEditMode === 'sculpt') {
          handleSculptMode(point, isRightClick);
        }
        // preset mode: do nothing (just view properties panel)
        return;
      }

      const tool = toolSettings.currentTool;

      if (tool === 'surface-cycle') {
        handleSurfaceCycleTool(point, isRightClick);
      } else if (tool.startsWith('surface')) {
        handleSurfaceTool(point, isRightClick, isShiftKey);
      } else if (tool.startsWith('line')) {
        handleLineTool(point, true, isRightClick, isShiftKey);
      } else if (tool.startsWith('edge')) {
        handleEdgeTool(point, true, isRightClick, isShiftKey);
      } else if (tool.startsWith('wall')) {
        handleWallTool(point, isRightClick, isShiftKey);
      } else if (tool.startsWith('symbol')) {
        handleSymbolTool(point, isRightClick, isShiftKey);
      } else if (tool === 'special-thermo' || tool === 'special-arrow') {
        handleSpecialTool(point, true, false, isRightClick);
      } else if (tool === 'special-cage') {
        handleCageTool(point, true, false, isRightClick);
      } else if (tool === 'special-boxline') {
        handleBoxLineTool(point, true, false, isRightClick);
      } else if (tool === 'multicolor-surface') {
        handleMulticolorSurfaceTool(point, isRightClick);
      } else if (tool === 'solution-area') {
        handleSolutionAreaTool(point, isRightClick);
      }
    },
    [
      getMousePosition,
      setCanvasState,
      toolSettings.currentTool,
      isGridMode,
      gridEditMode,
      canvas.panMode,
      handleGridTool,
      handleMergeMode,
      handleSplitMode,
      handleSculptMode,
      handleSurfaceTool,
      handleSurfaceCycleTool,
      handleLineTool,
      handleEdgeTool,
      handleWallTool,
      handleSymbolTool,
      handleSpecialTool,
      handleCageTool,
      handleMulticolorSurfaceTool,
      handleSolutionAreaTool,
      startHistoryGroup,
      resetFillModes,
    ]
  );

  // Mouse move handler
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning && lastPanPoint) {
        const dx = e.clientX - lastPanPoint.x;
        const dy = e.clientY - lastPanPoint.y;
        setPan(canvas.panX + dx, canvas.panY + dy);
        setLastPanPoint({ x: e.clientX, y: e.clientY });
        return;
      }

      if (!canvas.isDrawing) return;

      isDraggingRef.current = true;
      const point = getMousePosition(e);

      // Handle grid mode based on gridEditMode during drag
      if (isGridMode) {
        if (gridEditMode === 'exclude') {
          handleGridTool(point, isRightClickRef.current, isShiftKeyRef.current);
        } else if (gridEditMode === 'merge') {
          handleMergeMode(point, false, false, isRightClickRef.current);
        } else if (gridEditMode === 'split') {
          handleSplitMode(point, false, false, isRightClickRef.current);
        }
        // preset mode: do nothing
        return;
      }

      const tool = toolSettings.currentTool;

      if (tool === 'surface-cycle') {
        handleSurfaceCycleTool(point, isRightClickRef.current);
      } else if (tool.startsWith('surface')) {
        handleSurfaceTool(point, isRightClickRef.current, isShiftKeyRef.current);
      } else if (tool.startsWith('line')) {
        handleLineTool(point, false, isRightClickRef.current, isShiftKeyRef.current);
      } else if (tool.startsWith('edge')) {
        handleEdgeTool(point, false, isRightClickRef.current, isShiftKeyRef.current);
      } else if (tool.startsWith('wall')) {
        handleWallTool(point, isRightClickRef.current, isShiftKeyRef.current);
      } else if (tool === 'special-thermo' || tool === 'special-arrow') {
        handleSpecialTool(point, false, false, isRightClickRef.current);
      } else if (tool === 'special-cage') {
        handleCageTool(point, false, false, isRightClickRef.current);
      } else if (tool === 'special-boxline') {
        handleBoxLineTool(point, false, false, isRightClickRef.current);
      } else if (tool === 'multicolor-surface') {
        handleMulticolorSurfaceTool(point, isRightClickRef.current);
      } else if (tool === 'solution-area') {
        handleSolutionAreaTool(point, isRightClickRef.current);
      }
    },
    [
      isPanning,
      lastPanPoint,
      canvas.isDrawing,
      canvas.panX,
      canvas.panY,
      setPan,
      getMousePosition,
      toolSettings.currentTool,
      isGridMode,
      gridEditMode,
      handleGridTool,
      handleMergeMode,
      handleSplitMode,
      handleSurfaceTool,
      handleSurfaceCycleTool,
      handleLineTool,
      handleEdgeTool,
      handleWallTool,
      handleSpecialTool,
      handleCageTool,
      handleBoxLineTool,
      handleMulticolorSurfaceTool,
      handleSolutionAreaTool,
    ]
  );

  // Mouse up handler
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setIsPanning(false);
        setLastPanPoint(null);
        return;
      }

      const point = getMousePosition(e);
      const tool = toolSettings.currentTool;
      const isRightClick = isRightClickRef.current;
      const isShiftKey = isShiftKeyRef.current;

      // Handle grid mode completion
      if (isGridMode && !isRightClick) {
        if (gridEditMode === 'merge') {
          handleMergeMode(point, false, true, isRightClick);
        } else if (gridEditMode === 'split') {
          handleSplitMode(point, false, true, isRightClick);
        }
      }

      // Complete special/cage/boxline tools on mouse up
      if (tool === 'special-thermo' || tool === 'special-arrow') {
        handleSpecialTool(point, false, true, false);
      } else if (tool === 'special-cage') {
        handleCageTool(point, false, true, false);
      } else if (tool === 'special-boxline') {
        handleBoxLineTool(point, false, true, false);
      } else if (tool.startsWith('line')) {
        // Handle straight line completion on mouse up
        const allowedDirections = toolSettings.lineDirections || ['orthogonal'];
        if (allowedDirections.includes('straight') && drawStartPoint) {
          handleStraightLineEnd(point, isRightClick, isShiftKey);
        }
      }

      // End the history group when mouse is released
      endHistoryGroup();

      // Reset fill modes
      resetFillModes();

      setCanvasState({ isDrawing: false });
      setDrawStartPoint(null);
      setDrawStartPosition(null);
      setCurrentStrokeId(null);
    },
    [isPanning, setCanvasState, endHistoryGroup, getMousePosition, toolSettings.currentTool, toolSettings.lineDirections, drawStartPoint, handleSpecialTool, handleCageTool, handleBoxLineTool, handleStraightLineEnd, resetFillModes, isGridMode, gridEditMode, handleMergeMode, handleSplitMode]
  );

  // Context menu handler
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Update line hover point (for line and edge tools)
  const updateLineHoverPoint = useCallback(
    (point: Point) => {
      const tool = toolSettings.currentTool;
      if (!tool.startsWith('line') && !tool.startsWith('edge')) {
        setLineHoverPoint(null);
        return;
      }

      const allowedGridPoints = toolSettings.lineGridPoints || ['cell'];
      const gridPoint = findNearestGridPoint(point, allowedGridPoints);
      if (gridPoint) {
        setLineHoverPoint(gridPoint.position);
      } else {
        setLineHoverPoint(null);
      }
    },
    [toolSettings.currentTool, toolSettings.lineGridPoints, findNearestGridPoint]
  );

  // Update symbol hover point
  const updateSymbolHoverPoint = useCallback(
    (point: Point) => {
      const tool = toolSettings.currentTool;
      if (!tool.startsWith('symbol')) {
        setSymbolHoverPoint(null);
        return;
      }

      const allowedGridPoints = toolSettings.symbolGridPoints || ['cell'];
      const gridPoint = findNearestGridPoint(point, allowedGridPoints);
      if (gridPoint) {
        setSymbolHoverPoint(gridPoint.position);
      } else {
        setSymbolHoverPoint(null);
      }
    },
    [toolSettings.currentTool, toolSettings.symbolGridPoints, findNearestGridPoint]
  );

  return {
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleContextMenu,
    handleNumberTool,
    handleTextTool,
    // Surface handlers (exposed for line-cell auto mode)
    handleSurfaceCycleTool,
    resetFillModes,
    // Symbol handlers (exposed for line auto mode - peke input)
    handleSymbolTool,
    // Touch handlers
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    // Selection handlers
    handleSelectTool,
    isSelecting,
    selectionRect,
    // Special tool preview
    specialPath,
    // Line tool hover and preview
    lineHoverPoint,
    lineStartPoint: drawStartPosition,
    updateLineHoverPoint,
    // Symbol tool hover
    symbolHoverPoint,
    updateSymbolHoverPoint,
    // Merge mode state
    mergingCells,
    // Split mode state
    splitStartVertex,
    splitHoverVertex,
    updateSplitHoverVertex,
    // Sculpt mode state
    sculptHover,
    updateSculptHover,
    getSculptHoverPolygons,
  };
}

// Re-export SelectionRect type for convenience
export type { SelectionRect };
