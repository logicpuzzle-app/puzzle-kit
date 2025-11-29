/**
 * Penpa-compatible Touch Handling
 *
 * Implements touch gestures for tablet/mobile use:
 * - Single tap: select cell/point
 * - Double tap: place/toggle element
 * - Long press: right-click behavior (delete)
 * - Pinch: zoom
 * - Two-finger drag: pan
 * - Single-finger drag: draw line/select multiple
 */

import { useRef, useCallback, useEffect } from 'react';

export interface TouchPoint {
  x: number;
  y: number;
  id: number;
  timestamp: number;
}

export interface TouchGesture {
  type: 'tap' | 'double-tap' | 'long-press' | 'drag' | 'pinch' | 'pan';
  points: TouchPoint[];
  delta?: { x: number; y: number };
  scale?: number;
}

export interface UsePenpaTouchOptions {
  /** Long press threshold in ms */
  longPressDelay?: number;
  /** Double tap threshold in ms */
  doubleTapDelay?: number;
  /** Minimum distance for drag detection */
  dragThreshold?: number;
  /** Callback for gesture events */
  onGesture?: (gesture: TouchGesture) => void;
  /** Callback for touch start */
  onTouchStart?: (points: TouchPoint[]) => void;
  /** Callback for touch move */
  onTouchMove?: (points: TouchPoint[], delta: { x: number; y: number }) => void;
  /** Callback for touch end */
  onTouchEnd?: (points: TouchPoint[]) => void;
}

const DEFAULT_OPTIONS: Required<Omit<UsePenpaTouchOptions, 'onGesture' | 'onTouchStart' | 'onTouchMove' | 'onTouchEnd'>> = {
  longPressDelay: 500,
  doubleTapDelay: 300,
  dragThreshold: 10,
};

export function usePenpaTouch(
  elementRef: React.RefObject<HTMLElement | SVGElement | null>,
  options: UsePenpaTouchOptions = {}
) {
  const {
    longPressDelay = DEFAULT_OPTIONS.longPressDelay,
    doubleTapDelay = DEFAULT_OPTIONS.doubleTapDelay,
    dragThreshold = DEFAULT_OPTIONS.dragThreshold,
    onGesture,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  } = options;

  const touchStateRef = useRef<{
    points: TouchPoint[];
    startPoints: TouchPoint[];
    lastTap: { x: number; y: number; timestamp: number } | null;
    longPressTimer: ReturnType<typeof setTimeout> | null;
    isDragging: boolean;
    isPinching: boolean;
    isPanning: boolean;
    initialPinchDistance: number;
  }>({
    points: [],
    startPoints: [],
    lastTap: null,
    longPressTimer: null,
    isDragging: false,
    isPinching: false,
    isPanning: false,
    initialPinchDistance: 0,
  });

  const getTouchPoint = useCallback((touch: Touch): TouchPoint => ({
    x: touch.clientX,
    y: touch.clientY,
    id: touch.identifier,
    timestamp: Date.now(),
  }), []);

  const getDistance = useCallback((p1: TouchPoint, p2: TouchPoint): number => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const getMidpoint = useCallback((p1: TouchPoint, p2: TouchPoint): { x: number; y: number } => ({
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  }), []);

  const clearLongPressTimer = useCallback(() => {
    if (touchStateRef.current.longPressTimer) {
      clearTimeout(touchStateRef.current.longPressTimer);
      touchStateRef.current.longPressTimer = null;
    }
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touches = Array.from(e.touches).map(getTouchPoint);
    const state = touchStateRef.current;

    state.points = touches;
    state.startPoints = [...touches];
    state.isDragging = false;
    state.isPinching = false;
    state.isPanning = false;

    onTouchStart?.(touches);

    if (touches.length === 1) {
      // Single touch - check for long press or drag
      clearLongPressTimer();
      state.longPressTimer = setTimeout(() => {
        if (!state.isDragging && state.points.length === 1) {
          onGesture?.({
            type: 'long-press',
            points: state.points,
          });
        }
      }, longPressDelay);
    } else if (touches.length === 2) {
      // Two touches - prepare for pinch or pan
      clearLongPressTimer();
      state.initialPinchDistance = getDistance(touches[0], touches[1]);
      state.isPanning = true;
    }
  }, [getTouchPoint, longPressDelay, onTouchStart, onGesture, clearLongPressTimer, getDistance]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const touches = Array.from(e.touches).map(getTouchPoint);
    const state = touchStateRef.current;

    if (touches.length === 0) return;

    const delta = {
      x: touches[0].x - (state.points[0]?.x ?? touches[0].x),
      y: touches[0].y - (state.points[0]?.y ?? touches[0].y),
    };

    onTouchMove?.(touches, delta);

    if (touches.length === 1 && state.startPoints.length === 1) {
      // Single finger drag
      const startPoint = state.startPoints[0];
      const totalDelta = {
        x: touches[0].x - startPoint.x,
        y: touches[0].y - startPoint.y,
      };
      const distance = Math.sqrt(totalDelta.x * totalDelta.x + totalDelta.y * totalDelta.y);

      if (distance > dragThreshold) {
        clearLongPressTimer();
        state.isDragging = true;

        onGesture?.({
          type: 'drag',
          points: touches,
          delta: totalDelta,
        });
      }
    } else if (touches.length === 2) {
      // Two finger gesture
      clearLongPressTimer();
      const currentDistance = getDistance(touches[0], touches[1]);
      const scale = currentDistance / state.initialPinchDistance;

      // Determine if pinch or pan
      const scaleChange = Math.abs(scale - 1);
      if (scaleChange > 0.1) {
        state.isPinching = true;
        state.isPanning = false;

        onGesture?.({
          type: 'pinch',
          points: touches,
          scale,
        });
      } else if (state.isPanning) {
        const midpoint = getMidpoint(touches[0], touches[1]);
        const prevMidpoint = state.points.length >= 2
          ? getMidpoint(state.points[0], state.points[1])
          : midpoint;

        onGesture?.({
          type: 'pan',
          points: touches,
          delta: {
            x: midpoint.x - prevMidpoint.x,
            y: midpoint.y - prevMidpoint.y,
          },
        });
      }
    }

    state.points = touches;
  }, [getTouchPoint, dragThreshold, onTouchMove, onGesture, clearLongPressTimer, getDistance, getMidpoint]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const touches = Array.from(e.touches).map(getTouchPoint);
    const state = touchStateRef.current;

    clearLongPressTimer();

    onTouchEnd?.(touches);

    // Check for tap/double-tap
    if (e.changedTouches.length === 1 && !state.isDragging && !state.isPinching) {
      const endPoint = getTouchPoint(e.changedTouches[0]);
      const now = Date.now();

      // Check for double tap
      if (
        state.lastTap &&
        now - state.lastTap.timestamp < doubleTapDelay &&
        Math.abs(endPoint.x - state.lastTap.x) < dragThreshold &&
        Math.abs(endPoint.y - state.lastTap.y) < dragThreshold
      ) {
        onGesture?.({
          type: 'double-tap',
          points: [endPoint],
        });
        state.lastTap = null;
      } else {
        // Single tap
        onGesture?.({
          type: 'tap',
          points: [endPoint],
        });
        state.lastTap = { x: endPoint.x, y: endPoint.y, timestamp: now };
      }
    }

    state.points = touches;
    if (touches.length === 0) {
      state.isDragging = false;
      state.isPinching = false;
      state.isPanning = false;
    }
  }, [getTouchPoint, doubleTapDelay, dragThreshold, onTouchEnd, onGesture, clearLongPressTimer]);

  const handleTouchCancel = useCallback(() => {
    clearLongPressTimer();
    const state = touchStateRef.current;
    state.points = [];
    state.isDragging = false;
    state.isPinching = false;
    state.isPanning = false;
  }, [clearLongPressTimer]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Prevent default touch behaviors
    const preventDefault = (e: TouchEvent) => {
      // Allow scrolling in non-canvas areas
      if (e.touches.length > 1 || element.contains(e.target as Node)) {
        e.preventDefault();
      }
    };

    element.addEventListener('touchstart', handleTouchStart as EventListener, { passive: false });
    element.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false });
    element.addEventListener('touchend', handleTouchEnd as EventListener);
    element.addEventListener('touchcancel', handleTouchCancel as EventListener);
    document.addEventListener('touchmove', preventDefault as EventListener, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart as EventListener);
      element.removeEventListener('touchmove', handleTouchMove as EventListener);
      element.removeEventListener('touchend', handleTouchEnd as EventListener);
      element.removeEventListener('touchcancel', handleTouchCancel as EventListener);
      document.removeEventListener('touchmove', preventDefault as EventListener);
      clearLongPressTimer();
    };
  }, [elementRef, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel, clearLongPressTimer]);

  return {
    touchState: touchStateRef.current,
  };
}

export default usePenpaTouch;
