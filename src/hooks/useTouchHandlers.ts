/**
 * useTouchHandlers - Hook for handling touch events on canvas
 */

import { useCallback, useRef } from 'react';
import { usePuzzleStore } from '../store/puzzleStore';
import { screenToSvg } from '../utils/gridUtils';
import type { Point } from '../types';

interface TouchState {
  isPinching: boolean;
  initialPinchDistance: number;
  initialZoom: number;
  lastTouchPoint: Point | null;
  touchStartTime: number;
  initialTouchCount: number;
}

interface UseTouchHandlersOptions {
  svgRef: React.RefObject<SVGSVGElement | null>;
  toolHandlers: {
    handleSurfaceTool: (point: Point, isRightClick: boolean, isShiftKey: boolean) => void;
    handleSurfaceCycleTool: (point: Point, isRightClick: boolean) => void;
    handleLineTool: (point: Point, isStart: boolean, isRightClick: boolean, isShiftKey: boolean) => void;
    handleEdgeTool: (point: Point, isStart: boolean, isRightClick: boolean, isShiftKey: boolean) => void;
    handleWallTool: (point: Point, isRightClick: boolean, isShiftKey: boolean) => void;
    handleSymbolTool: (point: Point, isRightClick: boolean, isShiftKey: boolean) => void;
    handleSpecialTool: (point: Point, isStart: boolean, isEnd: boolean, isRightClick: boolean) => void;
    handleCageTool: (point: Point, isStart: boolean, isEnd: boolean, isRightClick: boolean) => void;
    handleBoxLineTool: (point: Point, isStart: boolean, isEnd: boolean, isRightClick: boolean) => void;
    handleMulticolorSurfaceTool: (point: Point, isRightClick: boolean) => void;
    handleSolutionAreaTool: (point: Point, isRightClick: boolean) => void;
    handleStraightLineEnd: (point: Point, isRightClick: boolean, isShiftKey: boolean) => void;
    resetFillModes: () => void;
  };
  drawStartPoint: string | null;
  setDrawStartPoint: (point: string | null) => void;
  setDrawStartPosition: (point: Point | null) => void;
  setCurrentStrokeId: (id: string | null) => void;
  isDraggingRef: React.MutableRefObject<boolean>;
  isRightClickRef: React.MutableRefObject<boolean>;
  isShiftKeyRef: React.MutableRefObject<boolean>;
}

// Helper functions
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

export function useTouchHandlers({
  svgRef,
  toolHandlers,
  drawStartPoint,
  setDrawStartPoint,
  setDrawStartPosition,
  setCurrentStrokeId,
  isDraggingRef,
  isRightClickRef,
  isShiftKeyRef,
}: UseTouchHandlersOptions) {
  const {
    canvas,
    toolSettings,
    setCanvasState,
    setZoom,
    setPan,
    startHistoryGroup,
    endHistoryGroup,
  } = usePuzzleStore();

  const touchStateRef = useRef<TouchState>({
    isPinching: false,
    initialPinchDistance: 0,
    initialZoom: 1,
    lastTouchPoint: null,
    touchStartTime: 0,
    initialTouchCount: 0,
  });

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
  } = toolHandlers;

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

        if (tool === 'surface-cycle') {
          handleSurfaceCycleTool(point, false);
        } else if (tool.startsWith('surface')) {
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
      startHistoryGroup,
      resetFillModes,
      isDraggingRef,
      isRightClickRef,
      isShiftKeyRef,
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

          if (tool === 'surface-cycle') {
            handleSurfaceCycleTool(point, isRightClick);
          } else if (tool.startsWith('surface')) {
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
      handleSurfaceCycleTool,
      handleLineTool,
      handleEdgeTool,
      handleWallTool,
      handleSpecialTool,
      handleCageTool,
      handleBoxLineTool,
      handleMulticolorSurfaceTool,
      handleSolutionAreaTool,
      isDraggingRef,
      isRightClickRef,
      isShiftKeyRef,
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

          if (tool === 'surface-cycle') {
            handleSurfaceCycleTool(point, isSecondaryColor);
          } else if (tool.startsWith('surface')) {
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

        if (tool === 'surface-cycle') {
          // Long press on surface-cycle clears the cell
          handleSurfaceCycleTool(point, false); // Will cycle, effectively clearing if already unshaded
        } else if (tool.startsWith('surface')) {
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
      handleSurfaceCycleTool,
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
      setDrawStartPoint,
      setDrawStartPosition,
      setCurrentStrokeId,
      isDraggingRef,
    ]
  );

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    touchStateRef,
  };
}
