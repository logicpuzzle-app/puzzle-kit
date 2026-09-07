/**
 * useTouchHandlers - Hook for handling pointer (touch/pen) events on canvas
 */

import { useCallback, useMemo, useRef } from 'react';
import { usePuzzleStore, usePuzzleStoreApi } from '../store/puzzleStoreContext';
import { useCellFinder } from './useCellFinder';
import { useCanvasPoint } from './useCanvasPoint';
import { shouldAllowOutboardForTool } from '../utils/outboardPolicy';
import { createToolDispatchers, type ToolDispatchHandlers } from './toolDispatchers';
import type { Point } from '../types';

interface TouchState {
  isPinching: boolean;
  isPanning: boolean;
  initialPinchDistance: number;
  initialZoom: number;
  lastTouchPoint: Point | null;
  touchStartTime: number;
  tapPoint: Point | null;
  initialTouchCount: number;
  /** Whether a drag occurred during this touch sequence */
  isDragging: boolean;
}

type PointerInfo = { clientX: number; clientY: number; startX: number; startY: number };

interface UseTouchHandlersOptions {
  svgRef: React.RefObject<SVGSVGElement | null>;
  allowMultiTouchPanZoom?: boolean;
  gridHandlers?: {
    down: (point: Point) => void;
    move: (point: Point) => void;
    up: (point: Point) => void;
    cancel: () => void;
  };
  toolHandlers: ToolDispatchHandlers & {
    handleStraightLineEnd: (point: Point, isRightClick: boolean, isShiftKey: boolean) => void;
    resetFillModes: () => void;
    handleNumberTool?: (point: Point, isRightClick: boolean, options?: { cellId?: string }) => void;
    handleTextTool?: (point: Point, isRightClick: boolean) => void;
  };
  drawStartPoint: string | null;
  setDrawStartPoint: (point: string | null) => void;
  setDrawStartPosition: (point: Point | null) => void;
  setCurrentStrokeId: (id: string | null) => void;
}

// Helper functions
const getPinchDistance = (points: PointerInfo[]): number => {
  if (points.length < 2) return 0;
  const dx = points[0].clientX - points[1].clientX;
  const dy = points[0].clientY - points[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

const getPinchCenter = (points: PointerInfo[]): Point => {
  if (points.length < 2) {
    return { x: points[0].clientX, y: points[0].clientY };
  }
  return {
    x: (points[0].clientX + points[1].clientX) / 2,
    y: (points[0].clientY + points[1].clientY) / 2,
  };
};

export function useTouchHandlers({
  svgRef,
  allowMultiTouchPanZoom = true,
  gridHandlers,
  toolHandlers,
  drawStartPoint,
  setDrawStartPoint,
  setDrawStartPosition,
  setCurrentStrokeId,
}: UseTouchHandlersOptions) {
  const {
    canvas,
    toolSettings,
    setCanvasState,
    setPan,
    startHistoryGroup,
    endHistoryGroup,
    grid,
    activeLayer,
    setNumberSelection,
  } = usePuzzleStore();
  const store = usePuzzleStoreApi();
  const { findCellAtPoint } = useCellFinder();

  const touchStateRef = useRef<TouchState>({
    isPinching: false,
    isPanning: false,
    initialPinchDistance: 0,
    initialZoom: 1,
    lastTouchPoint: null,
    touchStartTime: 0,
    tapPoint: null,
    initialTouchCount: 0,
    isDragging: false,
  });
  const activePointersRef = useRef<Map<number, PointerInfo>>(new Map());

  const getCanvasPoint = useCanvasPoint({
    svgRef,
    zoom: canvas.zoom,
    panX: canvas.panX,
    panY: canvas.panY,
    exportPaddingLeft: grid.exportPaddingLeft ?? 0,
    exportPaddingTop: grid.exportPaddingTop ?? 0,
  });

  const {
    handleSurfaceTool,
    handleSurfaceCycleTool,
    handleLineTool,
    handleEdgeTool,
    handleWallTool,
    handleSymbolTool,
    handleSpecialTool,
    handleCageTool,
    handleBoxLineTool,
    handleMulticolorSurfaceTool,
    handleSolutionAreaTool,
    handleStraightLineEnd,
    resetFillModes,
    handleNumberTool,
    handleTextTool,
  } = toolHandlers;

  const toolDispatchers = useMemo(() => createToolDispatchers({
    handleSurfaceTool,
    handleSurfaceCycleTool,
    handleLineTool,
    handleEdgeTool,
    handleWallTool,
    handleSymbolTool,
    handleSpecialTool,
    handleCageTool,
    handleBoxLineTool,
    handleMulticolorSurfaceTool,
    handleSolutionAreaTool,
  }), [
    handleSurfaceTool,
    handleSurfaceCycleTool,
    handleLineTool,
    handleEdgeTool,
    handleWallTool,
    handleSymbolTool,
    handleSpecialTool,
    handleCageTool,
    handleBoxLineTool,
    handleMulticolorSurfaceTool,
    handleSolutionAreaTool,
  ]);

  // Pointer start handler (touch/pen only)
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      if (e.cancelable) {
        e.preventDefault();
      }
      const touchState = touchStateRef.current;
      const pointers = activePointersRef.current;
      if (pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY, startX: e.clientX, startY: e.clientY });
      e.currentTarget.setPointerCapture(e.pointerId);
      const points = Array.from(pointers.values());

      if (points.length === 1) touchState.touchStartTime = Date.now();
      touchState.initialTouchCount = Math.max(touchState.initialTouchCount, points.length);

      if (points.length >= 2) {
        // Switching to a multi-finger gesture abandons pending shape previews,
        // while incremental edits remain in the current undo group.
        gridHandlers?.cancel();
        setDrawStartPoint(null);
        setDrawStartPosition(null);
        setCurrentStrokeId(null);
        setCanvasState({ isDrawing: false, isDragging: allowMultiTouchPanZoom });
        if (!allowMultiTouchPanZoom) {
          touchState.isPinching = false;
          touchState.lastTouchPoint = null;
          return;
        }
        touchState.isPinching = true;
        touchState.initialPinchDistance = getPinchDistance(points);
        touchState.initialZoom = store.getState().canvas.zoom;
        touchState.lastTouchPoint = getPinchCenter(points);
        return;
      }

      if (points.length === 1) {
        touchState.isPinching = false;
        touchState.lastTouchPoint = { x: points[0].clientX, y: points[0].clientY };

        const point = getCanvasPoint(points[0].clientX, points[0].clientY);
        const tool = toolSettings.currentTool;
        touchState.tapPoint = point;

        resetFillModes();
        touchState.isDragging = false;
        touchState.isPanning = canvas.panMode;
        if (touchState.isPanning) {
          setCanvasState({ isDragging: true, isDrawing: false });
          return;
        }
        startHistoryGroup();
        setCanvasState({ isDrawing: true });

        if (activeLayer === 'grid') {
          gridHandlers?.down(point);
        } else {
          toolDispatchers.dispatchStart(tool, point, false, false);
        }
      }
    },
    [
      allowMultiTouchPanZoom,
      store,
      setDrawStartPoint,
      setDrawStartPosition,
      setCurrentStrokeId,
      canvas.panMode,
      activeLayer,
      gridHandlers,
      getCanvasPoint,
      toolSettings.currentTool,
      setCanvasState,
      toolDispatchers,
      startHistoryGroup,
      resetFillModes,
    ]
  );

  const handleTapInput = useCallback((
    point: Point
  ) => {
    const tool = toolSettings.currentTool;

    if (tool.startsWith('number')) {
      const cellInfo = findCellAtPoint(point, {
        allowOutboard: shouldAllowOutboardForTool(tool, activeLayer),
      });
      if (cellInfo?.row !== undefined && cellInfo.col !== undefined) {
        setNumberSelection({ row: cellInfo.row, col: cellInfo.col });
      }
      if ((toolSettings.numberInputMode ?? 'number') !== 'number') {
        return;
      }
      handleNumberTool?.(point, false);
      return;
    }

    if (tool.startsWith('text')) {
      handleTextTool?.(point, false);
      return;
    }

    return;
  }, [
    activeLayer,
    findCellAtPoint,
    handleNumberTool,
    handleTextTool,
    setNumberSelection,
    toolSettings.currentTool,
    toolSettings.numberInputMode,
  ]);

  // Pointer move handler (touch/pen only)
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      if (e.cancelable) {
        e.preventDefault();
      }
      const touchState = touchStateRef.current;
      const pointers = activePointersRef.current;
      const previousPoint = pointers.get(e.pointerId);
      if (!previousPoint) return;
      if (touchState.initialTouchCount >= 2 &&
          Math.hypot(e.clientX - previousPoint.startX, e.clientY - previousPoint.startY) > 0.5) {
        touchState.isDragging = true;
      }
      pointers.set(e.pointerId, { ...previousPoint, clientX: e.clientX, clientY: e.clientY });
      const points = Array.from(pointers.values());

      if (touchState.initialTouchCount >= 2 && !allowMultiTouchPanZoom) {
        return;
      }

      // Pointer events can arrive before React renders the preceding update.
      const currentCanvas = store.getState().canvas;
      if (points.length >= 2 && touchState.isPinching) {
        const currentDistance = getPinchDistance(points);
        const scale = touchState.initialPinchDistance > 0 ? currentDistance / touchState.initialPinchDistance : 1;
        const newZoom = Math.max(0.1, Math.min(5, touchState.initialZoom * scale));

        const center = getPinchCenter(points);
        if (touchState.lastTouchPoint) {
          // Keep the point under the previous midpoint under the new midpoint.
          // Both transforms use live store values, including clamped zoom. The
          // export padding is inside the scaled group, so it needs no extra shift.
          const rect = svgRef.current?.getBoundingClientRect();
          const previousX = touchState.lastTouchPoint.x - (rect?.left ?? 0);
          const previousY = touchState.lastTouchPoint.y - (rect?.top ?? 0);
          const ratio = newZoom / currentCanvas.zoom;
          setCanvasState({
            zoom: newZoom,
            panX: center.x - (rect?.left ?? 0) - (previousX - currentCanvas.panX) * ratio,
            panY: center.y - (rect?.top ?? 0) - (previousY - currentCanvas.panY) * ratio,
          });
        }

        touchState.lastTouchPoint = center;
      } else if (points.length === 1 && touchState.lastTouchPoint) {
        if (touchState.initialTouchCount >= 2 || touchState.isPanning || !currentCanvas.isDrawing) {
          const dx = points[0].clientX - touchState.lastTouchPoint.x;
          const dy = points[0].clientY - touchState.lastTouchPoint.y;
          setPan(currentCanvas.panX + dx, currentCanvas.panY + dy);
          touchState.lastTouchPoint = { x: points[0].clientX, y: points[0].clientY };
        } else {
          touchState.isDragging = true;
          const point = getCanvasPoint(points[0].clientX, points[0].clientY);
          const tool = toolSettings.currentTool;
          // Touch events always use isRightClick=false, isShiftKey=false
          const isRightClick = false;
          const isShiftKey = false;

          if (activeLayer === 'grid') {
            gridHandlers?.move(point);
          } else {
            toolDispatchers.dispatchMove(tool, point, isRightClick, isShiftKey);
          }

          touchState.lastTouchPoint = { x: points[0].clientX, y: points[0].clientY };
        }
      }
    },
    [
      store,
      svgRef,
      setCanvasState,
      activeLayer,
      gridHandlers,
      setPan,
      getCanvasPoint,
      allowMultiTouchPanZoom,
      toolSettings.currentTool,
      toolDispatchers,
    ]
  );

  // Pointer end handler (touch/pen only)
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      if (e.cancelable) {
        e.preventDefault();
      }
      const touchState = touchStateRef.current;
      const touchDuration = Date.now() - touchState.touchStartTime;
      const initialTouches = touchState.initialTouchCount;
      const pointers = activePointersRef.current;
      const pointInfo = pointers.get(e.pointerId);
      if (!pointInfo) return;
      const cancelled = e.type === 'pointercancel';
      pointers.delete(e.pointerId);
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      if (!cancelled && pointers.size > 0) {
        const remaining = Array.from(pointers.values());
        touchState.lastTouchPoint = getPinchCenter(remaining);
        touchState.isPinching = allowMultiTouchPanZoom && remaining.length >= 2;
        touchState.initialPinchDistance = getPinchDistance(remaining);
        touchState.initialZoom = store.getState().canvas.zoom;
        return;
      }
      const point = initialTouches >= 2 && touchState.tapPoint
        ? touchState.tapPoint : getCanvasPoint(pointInfo.clientX, pointInfo.clientY);

      // Cancellation is cleanup, never a tap or a free-segment commit. Exclusions
      // already applied during a drag still need their topology refreshed.
      if (activeLayer === 'grid' && !touchState.isPanning) {
        if (cancelled || initialTouches >= 2) gridHandlers?.cancel();
        else gridHandlers?.up(point);
      } else if (!cancelled && !touchState.isPanning) {
        // Multi-finger tap gestures
        if (touchDuration < 300 && !touchState.isDragging && initialTouches >= 2) {
          const tool = toolSettings.currentTool;
          const isSecondaryColor = initialTouches === 2;
          const isDeleteMode = initialTouches >= 3;

          resetFillModes();
          toolDispatchers.dispatchTap(tool, point, isSecondaryColor, isDeleteMode);
        }
        // Single-finger tap for click-style input (number/text/select)
        else if (touchDuration < 300 && !touchState.isDragging && initialTouches === 1) {
          handleTapInput(point);
        }
        // Long press for deletion
        else if (touchDuration > 500 && !touchState.isDragging && initialTouches === 1) {
          const tool = toolSettings.currentTool;

          toolDispatchers.dispatchLongPress(tool, point);
        }

        // Handle straight line on touch end
        if (initialTouches === 1) {
          const tool = toolSettings.currentTool;
          if (tool.startsWith('line')) {
            const allowedDirections = toolSettings.lineDirections || ['orthogonal'];
            if (allowedDirections.includes('straight') && drawStartPoint) {
              handleStraightLineEnd(point, false, false);
            }
          } else if (tool === 'special-boxline') {
            toolDispatchers.dispatchEnd(tool, point);
          }
        }
      }

      if (!touchState.isPanning) endHistoryGroup();
      if (cancelled) {
        for (const id of pointers.keys()) {
          if (e.currentTarget.hasPointerCapture?.(id)) e.currentTarget.releasePointerCapture(id);
        }
        pointers.clear();
      }
      resetFillModes();

      touchState.isPinching = false;
      touchState.lastTouchPoint = null;
      touchState.initialTouchCount = 0;
      touchState.tapPoint = null;
      touchState.isPanning = false;
      touchState.isDragging = false;
      setCanvasState({ isDrawing: false, isDragging: false });
      setDrawStartPoint(null);
      setDrawStartPosition(null);
      setCurrentStrokeId(null);
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    },
    [
      handleTapInput,
      store,
      allowMultiTouchPanZoom,
      activeLayer,
      gridHandlers,
      getCanvasPoint,
      toolSettings.currentTool,
      toolSettings.lineDirections,
      drawStartPoint,
      handleStraightLineEnd,
      setCanvasState,
      endHistoryGroup,
      resetFillModes,
      setDrawStartPoint,
      setDrawStartPosition,
      setCurrentStrokeId,
      toolDispatchers,
    ]
  );

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    touchStateRef,
  };
}
