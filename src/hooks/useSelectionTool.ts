import { useCallback, useRef, useState, useEffect } from 'react';
import { usePuzzleStore } from '../store/puzzleStore';
import { findNearestCell, getCellId } from '../utils/gridUtils';
import { findNearestCellInTopology } from '../utils/gridTopology';
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
  const findCell = useCallback((point: Point): { row: number; col: number } | null => {
    if (useTopology && topology) {
      const topoCell = findNearestCellInTopology(topology, point);
      if (topoCell) {
        const match = topoCell.id.match(/^cell-(\d+)-(\d+)$/);
        if (match) {
          return { row: parseInt(match[1]), col: parseInt(match[2]) };
        }
      }
      return null;
    }
    return findNearestCell(point, grid);
  }, [grid, useTopology, topology]);

  // Selection state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const selectionStartRef = useRef<Point | null>(null);

  /**
   * Find element at a given point
   */
  const findElementAtPoint = useCallback(
    (point: Point): string | null => {
      const cell = findCell(point);
      if (!cell) return null;

      const cellId = getCellId(cell.row, cell.col);
      const dataLayer = toDataLayer(activeLayer);
      const layer = puzzle[dataLayer];

      // Check surfaces
      for (const surface of Object.values(layer.surfaces)) {
        if (surface.cellId === cellId) {
          return surface.id;
        }
      }

      // Check numbers
      for (const num of Object.values(layer.numbers)) {
        if (num.cellId === cellId) {
          return num.id;
        }
      }

      // Check symbols
      for (const sym of Object.values(layer.symbols)) {
        if (sym.cellId === cellId) {
          return sym.id;
        }
      }

      return null;
    },
    [puzzle, activeLayer, findCell]
  );

  /**
   * Find elements within a rectangle
   */
  const findElementsInRect = useCallback(
    (rect: SelectionRect): string[] => {
      const elements: string[] = [];
      const dataLayer = toDataLayer(activeLayer);
      const layer = puzzle[dataLayer];

      const minX = Math.min(rect.startX, rect.endX);
      const maxX = Math.max(rect.startX, rect.endX);
      const minY = Math.min(rect.startY, rect.endY);
      const maxY = Math.max(rect.startY, rect.endY);

      // Check all cells within the rectangle
      for (let row = 0; row < grid.rows; row++) {
        for (let col = 0; col < grid.cols; col++) {
          let cellX: number;
          let cellY: number;

          if (useTopology && topology) {
            // Get cell center from topology
            const cellId = getCellId(row, col);
            const topoCell = topology.cells.get(cellId);
            if (!topoCell) continue;
            cellX = topoCell.center.x;
            cellY = topoCell.center.y;
          } else {
            // Standard grid calculation
            cellX = grid.outerPadding + col * grid.cellSize + grid.cellSize / 2;
            cellY = grid.outerPadding + row * grid.cellSize + grid.cellSize / 2;
          }

          if (cellX >= minX && cellX <= maxX && cellY >= minY && cellY <= maxY) {
            const cellId = getCellId(row, col);

            // Find elements at this cell
            for (const surface of Object.values(layer.surfaces)) {
              if (surface.cellId === cellId && !elements.includes(surface.id)) {
                elements.push(surface.id);
              }
            }

            for (const num of Object.values(layer.numbers)) {
              if (num.cellId === cellId && !elements.includes(num.id)) {
                elements.push(num.id);
              }
            }

            for (const sym of Object.values(layer.symbols)) {
              if (sym.cellId === cellId && !elements.includes(sym.id)) {
                elements.push(sym.id);
              }
            }
          }
        }
      }

      return elements;
    },
    [grid, puzzle, activeLayer, useTopology, topology]
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
