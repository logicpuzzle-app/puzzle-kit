/**
 * useCanvasInteraction - Hook for handling canvas interactions
 *
 * Coordinates between:
 * - Mouse/touch event handling
 * - Tool handlers (surface, line, edge, wall, symbol, etc.)
 * - Grid edit mode handlers (merge, split, exclude, sculpt)
 * - Zoom/pan controls
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { usePuzzleStore } from '../store/puzzleStore';
import { screenToSvg } from '../utils/gridUtils';
import { useToolHandlers } from './useToolHandlers';
import { useSelectionTool, type SelectionRect } from './useSelectionTool';
import { useGridPointUtils } from './useGridPointUtils';
import { useGridEditMode } from './useGridEditMode';
import { useSculptMode } from './useSculptMode';
import type { Point } from '../types';

interface UseCanvasInteractionOptions {
  svgRef: React.RefObject<SVGSVGElement | null>;
}

// Touch state management
interface TouchState {
  isPinching: boolean;
  initialPinchDistance: number;
  initialZoom: number;
  lastTouchPoint: Point | null;
  touchStartTime: number;
  initialTouchCount: number;
}

export function useCanvasInteraction({ svgRef }: UseCanvasInteractionOptions) {
  const {
    grid,
    canvas,
    toolSettings,
    setCanvasState,
    setZoom,
    setPan,
    startHistoryGroup,
    endHistoryGroup,
    isGridMode,
    gridEditMode,
    topology,
  } = usePuzzleStore();

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

  // Touch state
  const touchStateRef = useRef<TouchState>({
    isPinching: false,
    initialPinchDistance: 0,
    initialZoom: 1,
    lastTouchPoint: null,
    touchStartTime: 0,
    initialTouchCount: 0,
  });

  // Get tool handlers
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
    handleTextTool,
    handleCageTool,
    handleBoxLineTool,
    handleStraightLineEnd,
    resetFillModes,
  } = useToolHandlers({
    drawStartPoint,
    setDrawStartPoint,
    drawStartPosition,
    setDrawStartPosition,
    currentStrokeId,
    setCurrentStrokeId,
    specialPath,
    setSpecialPath,
  });

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

  // Wheel handler (zoom/pan)
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Zoom
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(5, canvas.zoom * delta));

        // Zoom toward mouse position
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          const newPanX = mouseX - (mouseX - canvas.panX) * (newZoom / canvas.zoom);
          const newPanY = mouseY - (mouseY - canvas.panY) * (newZoom / canvas.zoom);

          setZoom(newZoom);
          setPan(newPanX, newPanY);
        }
      } else {
        // Pan
        setPan(canvas.panX - e.deltaX, canvas.panY - e.deltaY);
      }
    },
    [canvas.zoom, canvas.panX, canvas.panY, setZoom, setPan, svgRef]
  );

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

      if (tool.startsWith('surface')) {
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

      if (tool.startsWith('surface')) {
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Zoom shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === '=') {
        e.preventDefault();
        setZoom(canvas.zoom * 1.2);
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        setZoom(canvas.zoom / 1.2);
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        setZoom(1);
        setPan(0, 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvas.zoom, setZoom, setPan]);

  // Touch event helpers
  const getTouchPosition = useCallback(
    (touch: React.Touch | Touch): Point => {
      return screenToSvg(
        touch.clientX,
        touch.clientY,
        canvas.zoom,
        canvas.panX,
        canvas.panY,
        svgRef.current
      );
    },
    [canvas.zoom, canvas.panX, canvas.panY, svgRef]
  );

  const getPinchDistance = (touches: React.TouchList | TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getPinchCenter = (touches: React.TouchList | TouchList): Point => {
    if (touches.length < 2) {
      return { x: touches[0].clientX, y: touches[0].clientY };
    }
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  // Touch start handler
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touches = e.touches;
      const touchState = touchStateRef.current;

      touchState.touchStartTime = Date.now();
      touchState.initialTouchCount = touches.length;

      if (touches.length >= 2) {
        touchState.isPinching = true;
        touchState.initialPinchDistance = getPinchDistance(touches);
        touchState.initialZoom = canvas.zoom;
        touchState.lastTouchPoint = getPinchCenter(touches);
      } else if (touches.length === 1) {
        touchState.isPinching = false;
        touchState.lastTouchPoint = { x: touches[0].clientX, y: touches[0].clientY };

        const point = getTouchPosition(touches[0]);
        const tool = toolSettings.currentTool;

        resetFillModes();
        startHistoryGroup();
        setCanvasState({ isDrawing: true });
        isDraggingRef.current = false;
        isRightClickRef.current = false;
        isShiftKeyRef.current = false;

        if (tool.startsWith('surface')) {
          handleSurfaceTool(point, false, false);
        } else if (tool.startsWith('line')) {
          handleLineTool(point, true, false, false);
        } else if (tool.startsWith('edge')) {
          handleEdgeTool(point, true, false, false);
        } else if (tool.startsWith('wall')) {
          handleWallTool(point, false, false);
        } else if (tool.startsWith('symbol')) {
          handleSymbolTool(point, false, false);
        } else if (tool === 'special-thermo' || tool === 'special-arrow') {
          handleSpecialTool(point, true, false, false);
        } else if (tool === 'special-cage') {
          handleCageTool(point, true, false, false);
        } else if (tool === 'special-boxline') {
          handleBoxLineTool(point, true, false, false);
        } else if (tool === 'multicolor-surface') {
          handleMulticolorSurfaceTool(point, false);
        } else if (tool === 'solution-area') {
          handleSolutionAreaTool(point, false);
        }
      }
    },
    [
      canvas.zoom,
      getTouchPosition,
      toolSettings.currentTool,
      setCanvasState,
      handleSurfaceTool,
      handleLineTool,
      handleEdgeTool,
      handleWallTool,
      handleSymbolTool,
      handleSpecialTool,
      handleCageTool,
      handleBoxLineTool,
      handleMulticolorSurfaceTool,
      handleSolutionAreaTool,
      startHistoryGroup,
      resetFillModes,
    ]
  );

  // Touch move handler
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touches = e.touches;
      const touchState = touchStateRef.current;

      if (touches.length === 2 && touchState.isPinching) {
        const currentDistance = getPinchDistance(touches);
        const scale = currentDistance / touchState.initialPinchDistance;
        const newZoom = Math.max(0.1, Math.min(5, touchState.initialZoom * scale));

        const center = getPinchCenter(touches);
        if (touchState.lastTouchPoint) {
          const dx = center.x - touchState.lastTouchPoint.x;
          const dy = center.y - touchState.lastTouchPoint.y;
          setPan(canvas.panX + dx, canvas.panY + dy);
        }

        setZoom(newZoom);
        touchState.lastTouchPoint = center;
      } else if (touches.length === 1 && touchState.lastTouchPoint) {
        if (!canvas.isDrawing) {
          const dx = touches[0].clientX - touchState.lastTouchPoint.x;
          const dy = touches[0].clientY - touchState.lastTouchPoint.y;
          setPan(canvas.panX + dx, canvas.panY + dy);
          touchState.lastTouchPoint = { x: touches[0].clientX, y: touches[0].clientY };
        } else {
          isDraggingRef.current = true;
          const point = getTouchPosition(touches[0]);
          const tool = toolSettings.currentTool;
          const isRightClick = isRightClickRef.current;
          const isShiftKey = isShiftKeyRef.current;

          if (tool.startsWith('surface')) {
            handleSurfaceTool(point, isRightClick, isShiftKey);
          } else if (tool.startsWith('line')) {
            handleLineTool(point, false, isRightClick, isShiftKey);
          } else if (tool.startsWith('edge')) {
            handleEdgeTool(point, false, isRightClick, isShiftKey);
          } else if (tool.startsWith('wall')) {
            handleWallTool(point, isRightClick, isShiftKey);
          } else if (tool === 'special-thermo' || tool === 'special-arrow') {
            handleSpecialTool(point, false, false, isRightClick);
          } else if (tool === 'special-cage') {
            handleCageTool(point, false, false, isRightClick);
          } else if (tool === 'special-boxline') {
            handleBoxLineTool(point, false, false, isRightClick);
          } else if (tool === 'multicolor-surface') {
            handleMulticolorSurfaceTool(point, isRightClick);
          } else if (tool === 'solution-area') {
            handleSolutionAreaTool(point, isRightClick);
          }

          touchState.lastTouchPoint = { x: touches[0].clientX, y: touches[0].clientY };
        }
      }
    },
    [
      canvas.panX,
      canvas.panY,
      canvas.isDrawing,
      setZoom,
      setPan,
      getTouchPosition,
      toolSettings.currentTool,
      handleSurfaceTool,
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

  // Touch end handler
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touchState = touchStateRef.current;
      const touchDuration = Date.now() - touchState.touchStartTime;
      const initialTouches = touchState.initialTouchCount;

      // Multi-finger tap gestures
      if (touchDuration < 300 && !isDraggingRef.current && initialTouches >= 2) {
        const point = e.changedTouches.length > 0
          ? getTouchPosition(e.changedTouches[0])
          : touchState.lastTouchPoint
            ? screenToSvg(
                touchState.lastTouchPoint.x,
                touchState.lastTouchPoint.y,
                canvas.zoom,
                canvas.panX,
                canvas.panY,
                svgRef.current
              )
            : null;

        if (point) {
          const tool = toolSettings.currentTool;
          const isSecondaryColor = initialTouches === 2;
          const isDeleteMode = initialTouches >= 3;

          if (tool.startsWith('surface')) {
            handleSurfaceTool(point, isSecondaryColor, isDeleteMode);
          } else if (tool.startsWith('line')) {
            handleLineTool(point, true, isSecondaryColor, isDeleteMode);
          } else if (tool.startsWith('edge')) {
            handleEdgeTool(point, true, isSecondaryColor, isDeleteMode);
          } else if (tool.startsWith('wall')) {
            handleWallTool(point, isSecondaryColor, isDeleteMode);
          } else if (tool.startsWith('symbol')) {
            handleSymbolTool(point, isSecondaryColor, isDeleteMode);
          } else if (tool === 'special-thermo' || tool === 'special-arrow') {
            handleSpecialTool(point, true, true, isDeleteMode || isSecondaryColor);
          } else if (tool === 'special-cage') {
            handleCageTool(point, true, true, isDeleteMode || isSecondaryColor);
          } else if (tool === 'special-boxline') {
            handleBoxLineTool(point, true, true, isDeleteMode || isSecondaryColor);
          }
        }
      }
      // Long press for deletion
      else if (touchDuration > 500 && !isDraggingRef.current && initialTouches === 1 && e.changedTouches.length === 1) {
        const point = getTouchPosition(e.changedTouches[0]);
        const tool = toolSettings.currentTool;

        if (tool.startsWith('surface')) {
          handleSurfaceTool(point, false, true);
        } else if (tool.startsWith('wall')) {
          handleWallTool(point, false, true);
        } else if (tool.startsWith('symbol')) {
          handleSymbolTool(point, false, true);
        } else if (tool === 'special-thermo' || tool === 'special-arrow') {
          handleSpecialTool(point, false, false, true);
        } else if (tool === 'special-cage') {
          handleCageTool(point, false, false, true);
        } else if (tool === 'special-boxline') {
          handleBoxLineTool(point, false, false, true);
        }
      }

      // Handle straight line on touch end
      if (e.changedTouches.length === 1 && initialTouches === 1) {
        const point = getTouchPosition(e.changedTouches[0]);
        const tool = toolSettings.currentTool;
        if (tool.startsWith('line')) {
          const allowedDirections = toolSettings.lineDirections || ['orthogonal'];
          if (allowedDirections.includes('straight') && drawStartPoint) {
            handleStraightLineEnd(point, false, false);
          }
        } else if (tool === 'special-boxline') {
          handleBoxLineTool(point, false, true, false);
        }
      }

      endHistoryGroup();
      resetFillModes();

      touchState.isPinching = false;
      touchState.lastTouchPoint = null;
      touchState.initialTouchCount = 0;
      setCanvasState({ isDrawing: false });
      setDrawStartPoint(null);
      setDrawStartPosition(null);
      setCurrentStrokeId(null);
    },
    [
      getTouchPosition,
      toolSettings.currentTool,
      toolSettings.lineDirections,
      drawStartPoint,
      handleSurfaceTool,
      handleLineTool,
      handleEdgeTool,
      handleWallTool,
      handleSymbolTool,
      handleSpecialTool,
      handleCageTool,
      handleBoxLineTool,
      handleStraightLineEnd,
      setCanvasState,
      endHistoryGroup,
      resetFillModes,
      canvas.zoom,
      canvas.panX,
      canvas.panY,
      svgRef,
    ]
  );

  // Update line hover point
  const updateLineHoverPoint = useCallback(
    (point: Point) => {
      const tool = toolSettings.currentTool;
      if (!tool.startsWith('line')) {
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
