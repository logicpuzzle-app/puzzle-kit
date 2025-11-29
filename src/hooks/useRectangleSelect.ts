/**
 * Rectangle Selection Hook
 *
 * Implements rectangular selection for cells, vertices, and edges
 * matching Penpa-edit's selection behavior.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Point } from '../types';

export interface SelectionRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface SelectionBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface UseRectangleSelectOptions {
  /** Target element for mouse events */
  elementRef: React.RefObject<HTMLElement | SVGElement | null>;
  /** Whether selection is enabled */
  enabled?: boolean;
  /** Minimum size to consider as a valid selection */
  minSize?: number;
  /** Modifier key required (none, shift, ctrl, alt) */
  modifierKey?: 'none' | 'shift' | 'ctrl' | 'alt';
  /** Callback when selection starts */
  onSelectionStart?: (point: Point) => void;
  /** Callback during selection */
  onSelectionChange?: (bounds: SelectionBounds) => void;
  /** Callback when selection ends */
  onSelectionEnd?: (bounds: SelectionBounds | null) => void;
  /** Transform function for converting client coordinates to canvas coordinates */
  clientToCanvas?: (clientX: number, clientY: number) => Point;
}

export function useRectangleSelect(options: UseRectangleSelectOptions) {
  const {
    elementRef,
    enabled = true,
    minSize = 5,
    modifierKey = 'none',
    onSelectionStart,
    onSelectionChange,
    onSelectionEnd,
    clientToCanvas,
  } = options;

  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const selectingRef = useRef(false);
  const startPointRef = useRef<Point | null>(null);

  const checkModifier = useCallback((e: MouseEvent): boolean => {
    switch (modifierKey) {
      case 'shift':
        return e.shiftKey;
      case 'ctrl':
        return e.ctrlKey || e.metaKey;
      case 'alt':
        return e.altKey;
      case 'none':
      default:
        return true;
    }
  }, [modifierKey]);

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

  const getBounds = useCallback((rect: SelectionRect): SelectionBounds => {
    const minX = Math.min(rect.startX, rect.endX);
    const maxX = Math.max(rect.startX, rect.endX);
    const minY = Math.min(rect.startY, rect.endY);
    const maxY = Math.max(rect.startY, rect.endY);

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!enabled || e.button !== 0) return;
    if (!checkModifier(e)) return;

    const point = getCanvasPoint(e.clientX, e.clientY);
    startPointRef.current = point;
    selectingRef.current = true;
    setIsSelecting(true);
    setSelectionRect({
      startX: point.x,
      startY: point.y,
      endX: point.x,
      endY: point.y,
    });

    onSelectionStart?.(point);
  }, [enabled, checkModifier, getCanvasPoint, onSelectionStart]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!selectingRef.current || !startPointRef.current) return;

    const point = getCanvasPoint(e.clientX, e.clientY);
    const newRect: SelectionRect = {
      startX: startPointRef.current.x,
      startY: startPointRef.current.y,
      endX: point.x,
      endY: point.y,
    };

    setSelectionRect(newRect);
    const bounds = getBounds(newRect);
    onSelectionChange?.(bounds);
  }, [getCanvasPoint, getBounds, onSelectionChange]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!selectingRef.current) return;

    selectingRef.current = false;
    setIsSelecting(false);

    if (selectionRect) {
      const bounds = getBounds(selectionRect);

      // Check if selection is large enough
      if (bounds.width >= minSize || bounds.height >= minSize) {
        onSelectionEnd?.(bounds);
      } else {
        // Too small - treat as click, not selection
        onSelectionEnd?.(null);
      }
    }

    setSelectionRect(null);
    startPointRef.current = null;
  }, [selectionRect, getBounds, minSize, onSelectionEnd]);

  const cancelSelection = useCallback(() => {
    selectingRef.current = false;
    setIsSelecting(false);
    setSelectionRect(null);
    startPointRef.current = null;
    onSelectionEnd?.(null);
  }, [onSelectionEnd]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled) return;

    element.addEventListener('mousedown', handleMouseDown as EventListener);
    document.addEventListener('mousemove', handleMouseMove as EventListener);
    document.addEventListener('mouseup', handleMouseUp as EventListener);

    // Cancel on escape
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectingRef.current) {
        cancelSelection();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      element.removeEventListener('mousedown', handleMouseDown as EventListener);
      document.removeEventListener('mousemove', handleMouseMove as EventListener);
      document.removeEventListener('mouseup', handleMouseUp as EventListener);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [elementRef, enabled, handleMouseDown, handleMouseMove, handleMouseUp, cancelSelection]);

  return {
    isSelecting,
    selectionRect,
    selectionBounds: selectionRect ? getBounds(selectionRect) : null,
    cancelSelection,
  };
}

/**
 * Find points within a selection bounds
 */
export function findPointsInBounds<T extends { x: number; y: number }>(
  points: T[],
  bounds: SelectionBounds
): T[] {
  return points.filter(
    (p) =>
      p.x >= bounds.minX &&
      p.x <= bounds.maxX &&
      p.y >= bounds.minY &&
      p.y <= bounds.maxY
  );
}

/**
 * Find cells within selection bounds (by center point)
 */
export function findCellsInBounds(
  cells: Array<{ id: string; x: number; y: number }>,
  bounds: SelectionBounds
): string[] {
  return findPointsInBounds(cells, bounds).map((c) => c.id);
}

/**
 * Selection overlay component props
 */
export interface SelectionOverlayProps {
  rect: SelectionRect | null;
  color?: string;
  opacity?: number;
  strokeWidth?: number;
}

export default useRectangleSelect;
