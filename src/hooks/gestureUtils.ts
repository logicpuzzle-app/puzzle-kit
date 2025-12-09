/**
 * Pure utility functions for gesture handling
 *
 * These functions have no side effects and can be easily unit tested.
 */

export interface Point {
  x: number;
  y: number;
}

export interface TouchPoint extends Point {
  id: number;
  timestamp: number;
}

export interface GestureThresholds {
  longPressDelay: number;
  doubleTapDelay: number;
  dragThreshold: number;
  pinchThreshold: number;
}

export const DEFAULT_THRESHOLDS: GestureThresholds = {
  longPressDelay: 500,
  doubleTapDelay: 300,
  dragThreshold: 10,
  pinchThreshold: 0.1,
};

// ============================================================================
// Distance and Geometry
// ============================================================================

/**
 * Calculate Euclidean distance between two points
 */
export function getDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate midpoint between two points
 */
export function getMidpoint(p1: Point, p2: Point): Point {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

/**
 * Calculate delta (movement) between two points
 */
export function getDelta(from: Point, to: Point): Point {
  return {
    x: to.x - from.x,
    y: to.y - from.y,
  };
}

// ============================================================================
// Tap Detection
// ============================================================================

export interface TapRecord {
  x: number;
  y: number;
  timestamp: number;
}

/**
 * Check if a tap is a double-tap based on timing and position
 */
export function isDoubleTap(
  currentTap: TapRecord,
  lastTap: TapRecord | null,
  thresholds: Pick<GestureThresholds, 'doubleTapDelay' | 'dragThreshold'>
): boolean {
  if (!lastTap) return false;

  const timeDelta = currentTap.timestamp - lastTap.timestamp;
  const distance = getDistance(currentTap, lastTap);

  return (
    timeDelta < thresholds.doubleTapDelay &&
    distance < thresholds.dragThreshold
  );
}

// ============================================================================
// Drag Detection
// ============================================================================

/**
 * Check if movement exceeds drag threshold
 */
export function isDragStarted(
  startPoint: Point,
  currentPoint: Point,
  dragThreshold: number
): boolean {
  return getDistance(startPoint, currentPoint) > dragThreshold;
}

/**
 * Calculate total drag delta from start
 */
export function getDragDelta(startPoint: Point, currentPoint: Point): Point {
  return getDelta(startPoint, currentPoint);
}

// ============================================================================
// Pinch Detection
// ============================================================================

export interface PinchState {
  initialDistance: number;
  currentDistance: number;
  scale: number;
}

/**
 * Calculate pinch scale from two-finger touch
 */
export function calculatePinchScale(
  point1: Point,
  point2: Point,
  initialDistance: number
): number {
  const currentDistance = getDistance(point1, point2);
  return currentDistance / initialDistance;
}

/**
 * Check if pinch gesture should be recognized (scale changed significantly)
 */
export function isPinchGesture(
  scale: number,
  pinchThreshold: number = DEFAULT_THRESHOLDS.pinchThreshold
): boolean {
  return Math.abs(scale - 1) > pinchThreshold;
}

// ============================================================================
// Pan (Two-finger drag) Detection
// ============================================================================

/**
 * Calculate pan delta from two-finger midpoint movement
 */
export function calculatePanDelta(
  currentPoints: [Point, Point],
  previousPoints: [Point, Point]
): Point {
  const currentMidpoint = getMidpoint(currentPoints[0], currentPoints[1]);
  const previousMidpoint = getMidpoint(previousPoints[0], previousPoints[1]);
  return getDelta(previousMidpoint, currentMidpoint);
}

// ============================================================================
// Long Press Detection
// ============================================================================

/**
 * Check if long press should be triggered
 * (Called after timer fires, validates no drag occurred)
 */
export function shouldTriggerLongPress(
  isDragging: boolean,
  touchCount: number
): boolean {
  return !isDragging && touchCount === 1;
}

// ============================================================================
// Touch Point Conversion
// ============================================================================

/**
 * Convert native Touch to TouchPoint
 */
export function touchToPoint(touch: Touch): TouchPoint {
  return {
    x: touch.clientX,
    y: touch.clientY,
    id: touch.identifier,
    timestamp: Date.now(),
  };
}

/**
 * Convert TouchList to TouchPoint array
 */
export function touchListToPoints(touches: TouchList): TouchPoint[] {
  return Array.from(touches).map(touchToPoint);
}

// ============================================================================
// Gesture State Machine Helpers
// ============================================================================

export type GestureType = 'none' | 'tap' | 'double-tap' | 'long-press' | 'drag' | 'pinch' | 'pan';

export interface GestureState {
  type: GestureType;
  isDragging: boolean;
  isPinching: boolean;
  isPanning: boolean;
  initialPinchDistance: number;
  lastTap: TapRecord | null;
}

export const INITIAL_GESTURE_STATE: Readonly<GestureState> = {
  type: 'none',
  isDragging: false,
  isPinching: false,
  isPanning: false,
  initialPinchDistance: 0,
  lastTap: null,
};

/**
 * Determine gesture state on touch start
 */
export function onTouchStartState(
  touchCount: number,
  firstTouchDistance?: number
): Partial<GestureState> {
  if (touchCount === 1) {
    return {
      type: 'none',
      isDragging: false,
      isPinching: false,
      isPanning: false,
    };
  } else if (touchCount === 2 && firstTouchDistance !== undefined) {
    return {
      type: 'none',
      isDragging: false,
      isPinching: false,
      isPanning: true,
      initialPinchDistance: firstTouchDistance,
    };
  }
  return {};
}

/**
 * Determine gesture type during touch move for single finger
 */
export function determineSingleFingerGesture(
  startPoint: Point,
  currentPoint: Point,
  thresholds: Pick<GestureThresholds, 'dragThreshold'>
): { type: GestureType; isDragging: boolean } {
  if (isDragStarted(startPoint, currentPoint, thresholds.dragThreshold)) {
    return { type: 'drag', isDragging: true };
  }
  return { type: 'none', isDragging: false };
}

/**
 * Determine gesture type during touch move for two fingers
 */
export function determineTwoFingerGesture(
  scale: number,
  currentlyPanning: boolean,
  thresholds: Pick<GestureThresholds, 'pinchThreshold'>
): { type: GestureType; isPinching: boolean; isPanning: boolean } {
  if (isPinchGesture(scale, thresholds.pinchThreshold)) {
    return { type: 'pinch', isPinching: true, isPanning: false };
  } else if (currentlyPanning) {
    return { type: 'pan', isPinching: false, isPanning: true };
  }
  return { type: 'none', isPinching: false, isPanning: false };
}

/**
 * Determine gesture type on touch end
 */
export function determineTouchEndGesture(
  endPoint: TapRecord,
  lastTap: TapRecord | null,
  wasDragging: boolean,
  wasPinching: boolean,
  thresholds: Pick<GestureThresholds, 'doubleTapDelay' | 'dragThreshold'>
): { type: GestureType; newLastTap: TapRecord | null } {
  // If was dragging or pinching, no tap gesture
  if (wasDragging || wasPinching) {
    return { type: 'none', newLastTap: null };
  }

  // Check for double-tap
  if (isDoubleTap(endPoint, lastTap, thresholds)) {
    return { type: 'double-tap', newLastTap: null };
  }

  // Single tap
  return { type: 'tap', newLastTap: endPoint };
}

/**
 * Reset gesture state on touch end/cancel
 */
export function resetGestureState(touchesRemaining: number): Partial<GestureState> {
  if (touchesRemaining === 0) {
    return {
      isDragging: false,
      isPinching: false,
      isPanning: false,
    };
  }
  return {};
}
