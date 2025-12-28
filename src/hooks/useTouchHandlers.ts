/**
 * useTouchHandlers - Hook for handling pointer (touch/pen) events on canvas
 */

import { useCallback, useMemo, useRef } from 'react';
import { usePuzzleStore } from '../store/puzzleStoreContext';
import { useCellFinder } from './useCellFinder';
import { useCanvasPoint } from './useCanvasPoint';
import { shouldAllowOutboardForTool } from '../utils/outboardPolicy';
import { createToolDispatchers, type ToolDispatchHandlers } from './toolDispatchers';
import type { Point } from '../types';

interface TouchState {
  isPinching: boolean;
  initialPinchDistance: number;
  initialZoom: number;
  lastTouchPoint: Point | null;
  touchStartTime: number;
  initialTouchCount: number;
  /** Whether a drag occurred during this touch sequence */
  isDragging: boolean;
}

type PointerInfo = { clientX: number; clientY: number };

interface UseTouchHandlersOptions {
  svgRef: React.RefObject<SVGSVGElement | null>;
  allowMultiTouchPanZoom?: boolean;
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
    setZoom,
    setPan,
    startHistoryGroup,
    endHistoryGroup,
    grid,
    activeLayer,
    setNumberSelection,
  } = usePuzzleStore();
  const { findCellAtPoint } = useCellFinder();

  const touchStateRef = useRef<TouchState>({
    isPinching: false,
    initialPinchDistance: 0,
    initialZoom: 1,
    lastTouchPoint: null,
    touchStartTime: 0,
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
      pointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
      const points = Array.from(pointers.values());

      touchState.touchStartTime = Date.now();
      touchState.initialTouchCount = points.length;

      if (points.length >= 2) {
        if (!allowMultiTouchPanZoom) {
          touchState.isPinching = false;
          touchState.lastTouchPoint = null;
          return;
        }
        touchState.isPinching = true;
        touchState.initialPinchDistance = getPinchDistance(points);
        touchState.initialZoom = canvas.zoom;
        touchState.lastTouchPoint = getPinchCenter(points);
        return;
      }

      if (points.length === 1) {
        e.currentTarget.setPointerCapture(e.pointerId);
        touchState.isPinching = false;
        touchState.lastTouchPoint = { x: points[0].clientX, y: points[0].clientY };

        const point = getCanvasPoint(points[0].clientX, points[0].clientY);
        const tool = toolSettings.currentTool;

        resetFillModes();
        startHistoryGroup();
        setCanvasState({ isDrawing: true });
        touchState.isDragging = false;

        toolDispatchers.dispatchStart(tool, point, false, false);
      }
    },
    [
      allowMultiTouchPanZoom,
      canvas.zoom,
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
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
      const points = Array.from(pointers.values());

      if (points.length >= 2 && !allowMultiTouchPanZoom) {
        return;
      }

      if (points.length >= 2 && touchState.isPinching) {
        const currentDistance = getPinchDistance(points);
        const scale = currentDistance / touchState.initialPinchDistance;
        const newZoom = Math.max(0.1, Math.min(5, touchState.initialZoom * scale));

        const center = getPinchCenter(points);
        if (touchState.lastTouchPoint) {
          const dx = center.x - touchState.lastTouchPoint.x;
          const dy = center.y - touchState.lastTouchPoint.y;
          setPan(canvas.panX + dx, canvas.panY + dy);
        }

        setZoom(newZoom);
        touchState.lastTouchPoint = center;
      } else if (points.length === 1 && touchState.lastTouchPoint) {
        if (!canvas.isDrawing) {
          const dx = points[0].clientX - touchState.lastTouchPoint.x;
          const dy = points[0].clientY - touchState.lastTouchPoint.y;
          setPan(canvas.panX + dx, canvas.panY + dy);
          touchState.lastTouchPoint = { x: points[0].clientX, y: points[0].clientY };
        } else {
          touchState.isDragging = true;
          const point = getCanvasPoint(points[0].clientX, points[0].clientY);
          const tool = toolSettings.currentTool;
          // Touch events always use isRightClick=false, isShiftKey=false
          const isRightClick = false;
          const isShiftKey = false;

          toolDispatchers.dispatchMove(tool, point, isRightClick, isShiftKey);

          touchState.lastTouchPoint = { x: points[0].clientX, y: points[0].clientY };
        }
      }
    },
    [
      canvas.panX,
      canvas.panY,
      canvas.isDrawing,
      setZoom,
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
      const pointInfo = pointers.get(e.pointerId) ?? { clientX: e.clientX, clientY: e.clientY };
      pointers.delete(e.pointerId);
      const point = getCanvasPoint(pointInfo.clientX, pointInfo.clientY);

      // Multi-finger tap gestures
      if (touchDuration < 300 && !touchState.isDragging && initialTouches >= 2) {
        const tool = toolSettings.currentTool;
        const isSecondaryColor = initialTouches === 2;
        const isDeleteMode = initialTouches >= 3;

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

      endHistoryGroup();
      resetFillModes();

      touchState.isPinching = false;
      touchState.lastTouchPoint = null;
      touchState.initialTouchCount = 0;
      touchState.isDragging = false;
      setCanvasState({ isDrawing: false });
      setDrawStartPoint(null);
      setDrawStartPosition(null);
      setCurrentStrokeId(null);
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    },
    [
      handleTapInput,
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
