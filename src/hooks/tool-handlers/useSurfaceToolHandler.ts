import { useCallback, useRef } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import { findNearestCell, getCellId } from '../../utils/gridUtils';
import { findNearestCellInTopology } from '../../utils/gridTopology';
import type { Point } from '../../types';
import { toDataLayer } from '../../types';

/**
 * Hook providing surface-related tool handlers
 */
export function useSurfaceToolHandler() {
  const {
    grid,
    toolSettings,
    activeLayer,
    addSurface,
    removeSurface,
    puzzle,
    setMulticolorSurface,
    removeMulticolorSurface,
    toggleSolutionAreaCell,
    setCellDisabled,
    useTopology,
    topology,
  } = usePuzzleStore();

  // Helper to find cell ID considering topology mode
  const findCellId = useCallback((point: Point): string | null => {
    if (useTopology && topology) {
      const topoCell = findNearestCellInTopology(topology, point);
      if (topoCell) {
        return topoCell.id;
      }
      return null;
    }
    const cell = findNearestCell(point, grid);
    if (cell) {
      return getCellId(cell.row, cell.col);
    }
    return null;
  }, [grid, useTopology, topology]);

  // Refs for tracking fill modes during drag
  const processedCellsRef = useRef<Set<string>>(new Set());
  const surfaceFillModeRef = useRef<'fill' | 'erase' | null>(null);
  const gridFillModeRef = useRef<'disable' | 'enable' | null>(null);

  // Reset all fill modes (call on mouse down/touch start)
  const resetSurfaceFillModes = useCallback(() => {
    processedCellsRef.current.clear();
    surfaceFillModeRef.current = null;
    gridFillModeRef.current = null;
  }, []);

  const handleSurfaceTool = useCallback(
    (point: Point, isRightClick: boolean, isShiftKey: boolean = false) => {
      const cellId = findCellId(point);
      if (!cellId) return;

      // Skip if this cell was already processed during this drag
      if (processedCellsRef.current.has(cellId)) {
        return;
      }
      processedCellsRef.current.add(cellId);

      const dataLayer = toDataLayer(activeLayer);
      const layerData = puzzle[dataLayer];

      // Determine which color to use
      const colorToUse = isRightClick ? toolSettings.secondaryColor : toolSettings.color;

      // Check if surface already exists with the same color
      const existingSurface = Object.values(layerData.surfaces).find(
        (s) => s.cellId === cellId
      );
      const hasSameColorSurface = existingSurface && existingSurface.color === colorToUse;

      // Determine fill mode on first cell of drag
      if (surfaceFillModeRef.current === null) {
        if (isShiftKey) {
          // Shift always means erase
          surfaceFillModeRef.current = 'erase';
        } else if (hasSameColorSurface) {
          // First cell has same color surface -> erase mode
          surfaceFillModeRef.current = 'erase';
        } else {
          // First cell is empty or has different color -> fill mode
          surfaceFillModeRef.current = 'fill';
        }
      }

      // Apply action based on current fill mode
      if (surfaceFillModeRef.current === 'erase') {
        // Erase mode: only remove surfaces
        if (existingSurface) {
          if (isShiftKey || existingSurface.color === colorToUse) {
            removeSurface(existingSurface.id);
          }
        }
      } else {
        // Fill mode: add or replace surfaces
        if (existingSurface) {
          if (existingSurface.color !== colorToUse) {
            // Different color: replace
            removeSurface(existingSurface.id);
            addSurface({
              cellId,
              color: colorToUse,
              layer: dataLayer,
            });
          }
          // Same color: do nothing (already filled)
        } else {
          // No existing surface: add new one
          addSurface({
            cellId,
            color: colorToUse,
            layer: dataLayer,
          });
        }
      }
    },
    [grid, puzzle, activeLayer, toolSettings.color, toolSettings.secondaryColor, addSurface, removeSurface, findCellId]
  );

  const handleGridTool = useCallback(
    (point: Point, isRightClick: boolean, isShiftKey: boolean = false) => {
      const cellId = findCellId(point);
      if (!cellId) return;

      // Skip if this cell was already processed during this drag
      if (processedCellsRef.current.has(cellId)) {
        return;
      }
      processedCellsRef.current.add(cellId);

      const disabledCells = grid.disabledCells || [];
      const isCurrentlyDisabled = disabledCells.includes(cellId);

      // Determine fill mode on first cell of drag
      if (gridFillModeRef.current === null) {
        if (isShiftKey || isRightClick) {
          // Shift or right click always means enable
          gridFillModeRef.current = 'enable';
        } else if (isCurrentlyDisabled) {
          // First cell is disabled -> enable mode
          gridFillModeRef.current = 'enable';
        } else {
          // First cell is enabled -> disable mode
          gridFillModeRef.current = 'disable';
        }
      }

      // Apply action based on current fill mode
      if (gridFillModeRef.current === 'disable') {
        if (!isCurrentlyDisabled) {
          setCellDisabled(cellId, true);
        }
      } else {
        if (isCurrentlyDisabled) {
          setCellDisabled(cellId, false);
        }
      }
    },
    [grid, setCellDisabled, findCellId]
  );

  // Handle multicolor surface tool
  const handleMulticolorSurfaceTool = useCallback(
    (point: Point, isRightClick: boolean) => {
      const cellId = findCellId(point);
      if (!cellId) return;

      if (isRightClick) {
        // Right-click removes multicolor surface
        removeMulticolorSurface(cellId);
      } else {
        // Left-click adds/updates multicolor surface with current colors
        const colors = toolSettings.multicolorSlots || [
          toolSettings.color,
          0, // transparent
          0, // transparent
          0, // transparent
        ];
        const pattern = toolSettings.multicolorPattern || 'cross';
        const customColors = toolSettings.multicolorCustomColors || [];
        setMulticolorSurface(cellId, colors, pattern, customColors);
      }
    },
    [grid, toolSettings.color, toolSettings.multicolorSlots, toolSettings.multicolorPattern, toolSettings.multicolorCustomColors, setMulticolorSurface, removeMulticolorSurface, findCellId]
  );

  // Handle solution area tool
  const handleSolutionAreaTool = useCallback(
    (point: Point, _isRightClick: boolean) => {
      const cellId = findCellId(point);
      if (!cellId) return;

      // Toggle cell in solution area
      toggleSolutionAreaCell(cellId);
    },
    [grid, toggleSolutionAreaCell, findCellId]
  );

  return {
    handleSurfaceTool,
    handleGridTool,
    handleMulticolorSurfaceTool,
    handleSolutionAreaTool,
    resetSurfaceFillModes,
  };
}
