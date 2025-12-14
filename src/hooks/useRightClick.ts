/**
 * Right Click / Context Menu Hook
 *
 * Implements Penpa-edit compatible right-click behavior:
 * - Right-click: delete element / secondary action
 * - Ctrl+click: also triggers delete on Mac
 * - Long press on touch: triggers right-click behavior
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Point } from '../types';

export type RightClickAction =
  | 'delete'        // Delete element at position
  | 'secondary'     // Use secondary color
  | 'toggle'        // Toggle element state
  | 'cycle'         // Cycle through options
  | 'context-menu'; // Show context menu

export interface RightClickEvent {
  point: Point;
  clientX: number;
  clientY: number;
  action: RightClickAction;
  targetId?: string;
}

export interface UseRightClickOptions {
  /** Target element for events */
  elementRef: React.RefObject<HTMLElement | SVGElement | null>;
  /** Whether right-click handling is enabled */
  enabled?: boolean;
  /** Default action for right-click */
  defaultAction?: RightClickAction;
  /** Whether to prevent default context menu */
  preventDefault?: boolean;
  /** Long press delay in ms (for touch) */
  longPressDelay?: number;
  /** Callback when right-click occurs */
  onRightClick?: (event: RightClickEvent) => void;
  /** Transform function for coordinates */
  clientToCanvas?: (clientX: number, clientY: number) => Point;
  /** Function to find target element ID at position */
  findTargetAtPosition?: (point: Point) => string | undefined;
}

export function useRightClick(options: UseRightClickOptions) {
  const {
    elementRef,
    enabled = true,
    defaultAction = 'delete',
    preventDefault = true,
    longPressDelay = 500,
    onRightClick,
    clientToCanvas,
    findTargetAtPosition,
  } = options;

  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const getCanvasPoint = useCallback((clientX: number, clientY: number): Point => {
    if (clientToCanvas) {
      return clientToCanvas(clientX, clientY);
    }

    const element = elementRef.current;
    if (!element) return { x: clientX, y: clientY };

    const rect = element.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, [clientToCanvas, elementRef]);

  const triggerRightClick = useCallback((
    clientX: number,
    clientY: number,
    action: RightClickAction = defaultAction
  ) => {
    const point = getCanvasPoint(clientX, clientY);
    const targetId = findTargetAtPosition?.(point);

    const event: RightClickEvent = {
      point,
      clientX,
      clientY,
      action,
      targetId,
    };

    onRightClick?.(event);
  }, [getCanvasPoint, defaultAction, findTargetAtPosition, onRightClick]);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setIsLongPressing(false);
  }, []);

  // Handle context menu (right-click)
  const eventHandlers = useCallback((): Array<{
    type: keyof HTMLElementEventMap;
    listener: EventListenerOrEventListenerObject;
    options?: AddEventListenerOptions | boolean;
  }> => [
    {
      type: 'contextmenu',
      listener: (evt: Event) => {
        const e = evt as MouseEvent;
        if (!enabled) return;
        if (preventDefault) e.preventDefault();
        triggerRightClick(e.clientX, e.clientY);
      },
    },
    {
      type: 'mousedown',
      listener: (evt: Event) => {
        const e = evt as MouseEvent;
        if (!enabled) return;
        if (e.button === 0 && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          triggerRightClick(e.clientX, e.clientY);
        }
      },
    },
    {
      type: 'touchstart',
      listener: (evt: Event) => {
        const e = evt as TouchEvent;
        if (!enabled || e.touches.length !== 1) return;
        const touch = e.touches[0];
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
        clearLongPressTimer();
        longPressTimerRef.current = setTimeout(() => {
          if (touchStartRef.current) {
            setIsLongPressing(true);
            triggerRightClick(touchStartRef.current.x, touchStartRef.current.y);
          }
        }, longPressDelay);
      },
      options: { passive: true },
    },
    {
      type: 'touchmove',
      listener: (evt: Event) => {
        const e = evt as TouchEvent;
        if (!touchStartRef.current || !longPressTimerRef.current) return;
        const touch = e.touches[0];
        const dx = touch.clientX - touchStartRef.current.x;
        const dy = touch.clientY - touchStartRef.current.y;
        if (Math.hypot(dx, dy) > 10) {
          clearLongPressTimer();
        }
      },
      options: { passive: true },
    },
    {
      type: 'touchend',
      listener: () => {
        clearLongPressTimer();
        touchStartRef.current = null;
      },
    },
    {
      type: 'touchcancel',
      listener: () => {
        clearLongPressTimer();
        touchStartRef.current = null;
      },
    },
  ], [enabled, preventDefault, triggerRightClick, clearLongPressTimer, longPressDelay]);

  // Handle touch start for long press
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || e.touches.length !== 1) return;

    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };

    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      if (touchStartRef.current) {
        setIsLongPressing(true);
        triggerRightClick(touchStartRef.current.x, touchStartRef.current.y);
      }
    }, longPressDelay);
  }, [enabled, longPressDelay, clearLongPressTimer, triggerRightClick]);

  // Handle touch move - cancel long press if moved too much
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStartRef.current || !longPressTimerRef.current) return;

    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Cancel if moved more than 10px
    if (distance > 10) {
      clearLongPressTimer();
    }
  }, [clearLongPressTimer]);

  // Handle touch end - clear long press
  const handleTouchEnd = useCallback(() => {
    clearLongPressTimer();
    touchStartRef.current = null;
  }, [clearLongPressTimer]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled) return;

    eventHandlers().forEach(({ type, listener, options }) =>
      element.addEventListener(type, listener, options)
    );

    return () => {
      eventHandlers().forEach(({ type, listener }) =>
        element.removeEventListener(type, listener as EventListener)
      );
      clearLongPressTimer();
    };
  }, [elementRef, enabled, eventHandlers, clearLongPressTimer]);

  return {
    isLongPressing,
    triggerRightClick,
  };
}

/**
 * Utility to determine right-click action based on mode
 */
export function getRightClickAction(
  editMode: string,
  submode?: string
): RightClickAction {
  switch (editMode) {
    case 'surface':
      // Right-click uses secondary color or deletes
      return submode === 'multicolor' ? 'cycle' : 'secondary';

    case 'line':
    case 'lineE':
    case 'wall':
      // Right-click deletes line
      return 'delete';

    case 'number':
      // Right-click deletes number
      return 'delete';

    case 'symbol':
      // Right-click cycles through symbol variations or deletes
      return 'toggle';

    case 'special':
      // Right-click cancels/deletes special element
      return 'delete';

    case 'cage':
      // Right-click removes cell from cage
      return 'delete';

    default:
      return 'delete';
  }
}

export default useRightClick;
