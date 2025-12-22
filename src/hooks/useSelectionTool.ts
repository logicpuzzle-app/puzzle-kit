import { useCallback, useRef, useState, useEffect } from 'react';
import { usePuzzleStore } from '../store/puzzleStoreContext';
import { resolveCell } from '../utils/pointResolver';
import { shouldAllowOutboardForTool } from '../utils/outboardPolicy';
import type { Point } from '../types';
import { toDataLayer } from '../types';

// Selection rectangle interface
export interface SelectionRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface UseSelectionToolOptions {
  getMousePosition: (e: MouseEvent) => Point;
}

/**
 * Hook providing selection tool functionality
 */
export function useSelectionTool({ getMousePosition }: UseSelectionToolOptions) {
  const {
    grid,
    puzzle,
    activeLayer,
    toolSettings,
    selectedElements,
    setSelection,
    clearSelection,
    useTopology,
    topology,
  } = usePuzzleStore();

  // Helper to find cell considering topology mode
  const findCellId = useCallback((point: Point): string | null => {
    const cell = resolveCell(
      point,
      { grid, useTopology, topology },
      { allowOutboard: shouldAllowOutboardForTool('select', activeLayer) }
    );
    return cell ? cell.cellId : null;
  }, [grid, useTopology, topology, activeLayer]);

  // Selection state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const selectionStartRef = useRef<Point | null>(null);

  /**
   * Find element at a given point
   */
  const collectElementsAtCell = useCallback(
    (cellId: string): string[] => {
      const dataLayer = toDataLayer(activeLayer);
      const layer = puzzle[dataLayer];
      const ids: string[] = [];

      for (const surface of Object.values(layer.surfaces)) {
        if (surface.cellId === cellId) ids.push(surface.id);
      }
      for (const num of Object.values(layer.numbers)) {
        if (num.cellId === cellId) ids.push(num.id);
      }
      for (const sym of Object.values(layer.symbols)) {
        if (sym.cellId === cellId) ids.push(sym.id);
      }

      return ids;
    },
    [activeLayer, puzzle]
  );

  const findElementAtPoint = useCallback(
    (point: Point): string | null => {
      const cellId = findCellId(point);
      if (!cellId) return null;
      const elements = collectElementsAtCell(cellId);
      return elements[0] ?? null;
    },
    [collectElementsAtCell, findCellId]
  );

  /**
   * Find elements within a rectangle
   */
  const findElementsInRect = useCallback(
    (rect: SelectionRect): string[] => {
      const minX = Math.min(rect.startX, rect.endX);
      const maxX = Math.max(rect.startX, rect.endX);
      const minY = Math.min(rect.startY, rect.endY);
      const maxY = Math.max(rect.startY, rect.endY);
      const ids: string[] = [];

      const addElementsForCell = (cellId: string) => {
        for (const id of collectElementsAtCell(cellId)) {
          if (!ids.includes(id)) {
            ids.push(id);
          }
        }
      };

      if (useTopology && topology) {
        topology.cells.forEach((cell, cellId) => {
          if (cell.outboard) return;
          const { x, y } = cell.center;
          if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
            addElementsForCell(cellId);
          }
        });
        return ids;
      }

      // Compute row/col bounds to avoid scanning full grid
      const startCol = Math.max(
        0,
        Math.floor((minX - grid.outerPadding) / grid.cellSize)
      );
      const endCol = Math.min(
        grid.cols - 1,
        Math.floor((maxX - grid.outerPadding) / grid.cellSize)
      );
      const startRow = Math.max(
        0,
        Math.floor((minY - grid.outerPadding) / grid.cellSize)
      );
      const endRow = Math.min(
        grid.rows - 1,
        Math.floor((maxY - grid.outerPadding) / grid.cellSize)
      );

      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          const cellX = grid.outerPadding + col * grid.cellSize + grid.cellSize / 2;
          const cellY = grid.outerPadding + row * grid.cellSize + grid.cellSize / 2;
          if (cellX >= minX && cellX <= maxX && cellY >= minY && cellY <= maxY) {
            addElementsForCell(getCellId(row, col));
          }
        }
      }

      return ids;
    },
    [collectElementsAtCell, grid.cellSize, grid.cols, grid.outerPadding, grid.rows, useTopology, topology]
  );

  /**
   * Handle select tool - click to select, drag to marquee select
   */
  const handleSelectTool = useCallback(
    (point: Point, isShiftKey: boolean) => {
      // Start selection
      selectionStartRef.current = point;
      setIsSelecting(true);
      setSelectionRect({
        startX: point.x,
        startY: point.y,
        endX: point.x,
        endY: point.y,
      });

      // If not shift-clicking, check for click on element
      if (!isShiftKey) {
        const elementId = findElementAtPoint(point);
        if (elementId) {
          // Click on element - select it
          setSelection([elementId]);
        } else {
          // Click on empty space - clear selection
          clearSelection();
        }
      }
    },
    [findElementAtPoint, setSelection, clearSelection]
  );

  /**
   * Handle select tool mouse move (update selection rect during drag)
   */
  const handleSelectMove = useCallback(
    (point: Point) => {
      if (!isSelecting || !selectionStartRef.current) return;

      setSelectionRect({
        startX: selectionStartRef.current.x,
        startY: selectionStartRef.current.y,
        endX: point.x,
        endY: point.y,
      });
    },
    [isSelecting]
  );

  /**
   * Handle select tool mouse up (finalize selection)
   */
  const handleSelectEnd = useCallback(
    (point: Point, isShiftKey: boolean) => {
      if (!isSelecting || !selectionStartRef.current) {
        setIsSelecting(false);
        setSelectionRect(null);
        return;
      }

      const startPoint = selectionStartRef.current;
      const dx = Math.abs(point.x - startPoint.x);
      const dy = Math.abs(point.y - startPoint.y);

      // If dragged more than a threshold, do marquee selection
      if (dx > 5 || dy > 5) {
        const rect: SelectionRect = {
          startX: startPoint.x,
          startY: startPoint.y,
          endX: point.x,
          endY: point.y,
        };
        const elements = findElementsInRect(rect);

        if (isShiftKey) {
          // Add to existing selection
          const newSelection = [...selectedElements];
          for (const id of elements) {
            if (!newSelection.includes(id)) {
              newSelection.push(id);
            }
          }
          setSelection(newSelection);
        } else {
          setSelection(elements);
        }
      }

      setIsSelecting(false);
      setSelectionRect(null);
      selectionStartRef.current = null;
    },
    [isSelecting, findElementsInRect, selectedElements, setSelection]
  );

  // Update handleMouseMove to include selection handling
  useEffect(() => {
    if (toolSettings.currentTool === 'select' && isSelecting) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const point = getMousePosition(e);
        handleSelectMove(point);
      };

      const handleGlobalMouseUp = (e: MouseEvent) => {
        const point = getMousePosition(e);
        handleSelectEnd(point, e.shiftKey);
      };

      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [toolSettings.currentTool, isSelecting, getMousePosition, handleSelectMove, handleSelectEnd]);

  return {
    isSelecting,
    selectionRect,
    handleSelectTool,
    handleSelectMove,
    handleSelectEnd,
    findElementAtPoint,
    findElementsInRect,
  };
}
