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
import {
  TouchPoint,
  GestureThresholds,
  DEFAULT_THRESHOLDS,
  touchListToPoints,
  touchToPoint,
  getDistance,
  getMidpoint,
  getDelta,
  isDoubleTap,
  isDragStarted,
  calculatePinchScale,
  isPinchGesture,
  shouldTriggerLongPress,
  type TapRecord,
} from './gestureUtils';

export type { TouchPoint } from './gestureUtils';

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

interface TouchState {
  points: TouchPoint[];
  startPoints: TouchPoint[];
  lastTap: TapRecord | null;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  isDragging: boolean;
  isPinching: boolean;
  isPanning: boolean;
  initialPinchDistance: number;
}

const INITIAL_TOUCH_STATE: TouchState = {
  points: [],
  startPoints: [],
  lastTap: null,
  longPressTimer: null,
  isDragging: false,
  isPinching: false,
  isPanning: false,
  initialPinchDistance: 0,
};

// Handler definition type for centralized event registration
interface TouchHandler {
  type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel';
  handler: (e: TouchEvent) => void;
  options?: AddEventListenerOptions;
}

export function usePenpaTouch(
  elementRef: React.RefObject<HTMLElement | SVGElement | null>,
  options: UsePenpaTouchOptions = {}
) {
  const thresholds: GestureThresholds = {
    longPressDelay: options.longPressDelay ?? DEFAULT_THRESHOLDS.longPressDelay,
    doubleTapDelay: options.doubleTapDelay ?? DEFAULT_THRESHOLDS.doubleTapDelay,
    dragThreshold: options.dragThreshold ?? DEFAULT_THRESHOLDS.dragThreshold,
    pinchThreshold: DEFAULT_THRESHOLDS.pinchThreshold,
  };

  const { onGesture, onTouchStart, onTouchMove, onTouchEnd } = options;

  const touchStateRef = useRef<TouchState>({ ...INITIAL_TOUCH_STATE });

  // ============================================================================
  // Timer Management
  // ============================================================================

  const clearLongPressTimer = useCallback(() => {
    const state = touchStateRef.current;
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }
  }, []);

  const startLongPressTimer = useCallback(() => {
    const state = touchStateRef.current;
    clearLongPressTimer();
    state.longPressTimer = setTimeout(() => {
      if (shouldTriggerLongPress(state.isDragging, state.points.length)) {
        onGesture?.({
          type: 'long-press',
          points: state.points,
        });
      }
    }, thresholds.longPressDelay);
  }, [clearLongPressTimer, onGesture, thresholds.longPressDelay]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touches = touchListToPoints(e.touches);
    const state = touchStateRef.current;

    // Reset state
    state.points = touches;
    state.startPoints = [...touches];
    state.isDragging = false;
    state.isPinching = false;
    state.isPanning = false;

    onTouchStart?.(touches);

    if (touches.length === 1) {
      // Single touch - prepare for long press
      startLongPressTimer();
    } else if (touches.length === 2) {
      // Two touches - prepare for pinch/pan
      clearLongPressTimer();
      state.initialPinchDistance = getDistance(touches[0], touches[1]);
      state.isPanning = true;
    }
  }, [onTouchStart, startLongPressTimer, clearLongPressTimer]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const touches = touchListToPoints(e.touches);
    const state = touchStateRef.current;

    if (touches.length === 0) return;

    const delta = getDelta(
      state.points[0] ?? touches[0],
      touches[0]
    );

    onTouchMove?.(touches, delta);

    if (touches.length === 1 && state.startPoints.length === 1) {
      // Single finger drag detection
      const startPoint = state.startPoints[0];
      const totalDelta = getDelta(startPoint, touches[0]);

      if (isDragStarted(startPoint, touches[0], thresholds.dragThreshold)) {
        clearLongPressTimer();
        state.isDragging = true;

        onGesture?.({
          type: 'drag',
          points: touches,
          delta: totalDelta,
        });
      }
    } else if (touches.length === 2) {
      // Two finger gesture detection
      clearLongPressTimer();
      const scale = calculatePinchScale(
        touches[0],
        touches[1],
        state.initialPinchDistance
      );

      if (isPinchGesture(scale, thresholds.pinchThreshold)) {
        state.isPinching = true;
        state.isPanning = false;

        onGesture?.({
          type: 'pinch',
          points: touches,
          scale,
        });
      } else if (state.isPanning) {
        const currentMidpoint = getMidpoint(touches[0], touches[1]);
        const prevMidpoint = state.points.length >= 2
          ? getMidpoint(state.points[0], state.points[1])
          : currentMidpoint;

        onGesture?.({
          type: 'pan',
          points: touches,
          delta: getDelta(prevMidpoint, currentMidpoint),
        });
      }
    }

    state.points = touches;
  }, [onTouchMove, onGesture, clearLongPressTimer, thresholds]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const touches = touchListToPoints(e.touches);
    const state = touchStateRef.current;

    clearLongPressTimer();
    onTouchEnd?.(touches);

    // Check for tap/double-tap (only for single finger, non-drag/pinch)
    if (e.changedTouches.length === 1 && !state.isDragging && !state.isPinching) {
      const endPoint = touchToPoint(e.changedTouches[0]);
      const now = Date.now();
      const tapRecord: TapRecord = { x: endPoint.x, y: endPoint.y, timestamp: now };

      if (isDoubleTap(tapRecord, state.lastTap, thresholds)) {
        onGesture?.({
          type: 'double-tap',
          points: [endPoint],
        });
        state.lastTap = null;
      } else {
        onGesture?.({
          type: 'tap',
          points: [endPoint],
        });
        state.lastTap = tapRecord;
      }
    }

    state.points = touches;
    if (touches.length === 0) {
      state.isDragging = false;
      state.isPinching = false;
      state.isPanning = false;
    }
  }, [onTouchEnd, onGesture, clearLongPressTimer, thresholds]);

  const handleTouchCancel = useCallback(() => {
    clearLongPressTimer();
    const state = touchStateRef.current;
    state.points = [];
    state.isDragging = false;
    state.isPinching = false;
    state.isPanning = false;
  }, [clearLongPressTimer]);

  // ============================================================================
  // Event Registration (Centralized)
  // ============================================================================

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Prevent default touch behaviors
    const preventDefault = (e: TouchEvent) => {
      if (e.touches.length > 1 || element.contains(e.target as Node)) {
        e.preventDefault();
      }
    };

    // Handler list pattern for centralized registration
    const handlers: TouchHandler[] = [
      { type: 'touchstart', handler: handleTouchStart, options: { passive: false } },
      { type: 'touchmove', handler: handleTouchMove, options: { passive: false } },
      { type: 'touchend', handler: handleTouchEnd },
      { type: 'touchcancel', handler: handleTouchCancel },
    ];

    // Register all handlers
    handlers.forEach(({ type, handler, options: opts }) => {
      element.addEventListener(type, handler as EventListener, opts);
    });
    document.addEventListener('touchmove', preventDefault, { passive: false });

    return () => {
      handlers.forEach(({ type, handler }) => {
        element.removeEventListener(type, handler as EventListener);
      });
      document.removeEventListener('touchmove', preventDefault);
      clearLongPressTimer();
    };
  }, [elementRef, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel, clearLongPressTimer]);

  return {
    touchState: touchStateRef.current,
  };
}

export default usePenpaTouch;
