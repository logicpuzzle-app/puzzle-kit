import { useCallback, useRef } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import { findNearestCell, getCellId, parseCellId as parseCellIdFromGridUtils } from '../../utils/gridUtils';
import { findNearestCellInTopology, type GridTopology } from '../../utils/gridTopology';
import type { Point, PuzzleState } from '../../types';
import { toDataLayer } from '../../types';

/**
 * Get cell coordinates from cellId, preferring topology index when available.
 *
 * @param cellId - Cell ID string
 * @param topology - GridTopology (optional)
 * @returns {row, col} or null
 */
function getCellCoords(
  cellId: string,
  topology: GridTopology | null
): { row: number; col: number } | null {
  // Prefer topology index when available
  if (topology) {
    const cell = topology.cells.get(cellId);
    if (cell?.index && cell.index[0] !== null && cell.index[1] !== null) {
      return { row: cell.index[0], col: cell.index[1] };
    }
  }
  // Fallback to ID string parsing
  return parseCellIdFromGridUtils(cellId);
}

/**
 * Check if a cell has a directional clue (Yajilin arrow+number)
 */
function cellHasDirectionalClue(
  cellId: string,
  puzzle: PuzzleState,
  cols: number,
  topology: GridTopology | null
): boolean {
  const directionalClues = puzzle.problem.directionalClues;
  if (!directionalClues) return false;

  // Use cellId directly for comparison
  return Object.values(directionalClues).some(clue => clue.cellId === cellId);
}

/**
 * Check if a cell has lines passing through it (connected to this cell)
 */
function cellHasLine(cellId: string, puzzle: PuzzleState): boolean {
  // Check answer layer lines
  const lines = puzzle.answer.lines;
  return Object.values(lines).some(line => line.from === cellId || line.to === cellId);
}

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
    updateTopology,
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
  // For noAdjacent constraint: track first cell's checker parity
  const firstCellParityRef = useRef<boolean | null>(null);

  // Helper to get cell row/col from cellId (topology index preferred, fallback to ID parsing)
  const getCellCoordsFromId = useCallback((cellId: string): { row: number; col: number } | null => {
    return getCellCoords(cellId, topology ?? null);
  }, [topology]);

  // Helper to check if cell has same checker parity as first cell (for noAdjacent constraint)
  const hasSameParity = useCallback((cellId: string): boolean => {
    if (firstCellParityRef.current === null) return true;
    const coords = getCellCoordsFromId(cellId);
    if (!coords) return true;
    const parity = (coords.row + coords.col) % 2 === 0;
    return parity === firstCellParityRef.current;
  }, [getCellCoordsFromId]);

  // Reset all fill modes (call on mouse down/touch start)
  const resetSurfaceFillModes = useCallback(() => {
    processedCellsRef.current.clear();
    surfaceFillModeRef.current = null;
    gridFillModeRef.current = null;
    firstCellParityRef.current = null;
  }, []);

  const handleSurfaceTool = useCallback(
    (point: Point, isRightClick: boolean, isShiftKey: boolean = false) => {
      const cellId = findCellId(point);
      if (!cellId) return;

      // Determine display mode based on current tool
      const isDotTool = toolSettings.currentTool === 'surface-dot';
      const displayMode = isDotTool ? 'dot' : 'fill';

      // Skip if this cell was already processed during this drag
      if (processedCellsRef.current.has(cellId)) {
        return;
      }

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
      const isFirstCell = surfaceFillModeRef.current === null;
      if (isFirstCell) {
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

        // For noAdjacent constraint: record first cell's checker parity
        if (toolSettings.inputConstraint === 'noAdjacent') {
          const coords = getCellCoordsFromId(cellId);
          if (coords) {
            firstCellParityRef.current = (coords.row + coords.col) % 2 === 0;
          }
        }
      }

      // noAdjacent constraint: skip cells that cannot be shaded when filling
      if (toolSettings.inputConstraint === 'noAdjacent' && surfaceFillModeRef.current === 'fill') {
        // Check 1: skip cells with different checker parity (adjacent to potential shaded cell)
        if (!hasSameParity(cellId)) {
          return;
        }
        // Check 2: skip cells with directional clues (Yajilin arrow+number)
        if (cellHasDirectionalClue(cellId, puzzle, grid.cols, topology ?? null)) {
          return;
        }
        // Check 3: skip cells with lines passing through (Yajilin loop)
        if (cellHasLine(cellId, puzzle)) {
          return;
        }
      }

      processedCellsRef.current.add(cellId);

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
          if (existingSurface.color !== colorToUse || existingSurface.displayMode !== displayMode) {
            // Different color or display mode: replace
            removeSurface(existingSurface.id);
            addSurface({
              cellId,
              color: colorToUse,
              layer: dataLayer,
              displayMode,
            });
          }
          // Same color and display mode: do nothing (already filled)
        } else {
          // No existing surface: add new one
          addSurface({
            cellId,
            color: colorToUse,
            layer: dataLayer,
            displayMode,
          });
        }
      }
    },
    [grid, puzzle, activeLayer, toolSettings.currentTool, toolSettings.color, toolSettings.secondaryColor, toolSettings.inputConstraint, addSurface, removeSurface, findCellId, getCellCoordsFromId, hasSameParity, topology]
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

      // Check if cell is currently disabled (either void or outboard)
      const voidCells = grid.voidCells || [];
      const outboardCells = grid.outboardCells || [];
      const legacyDisabled = grid.disabledCells || [];
      const isCurrentlyDisabled = voidCells.includes(cellId) || outboardCells.includes(cellId) || legacyDisabled.includes(cellId);

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
      // Skip topology regeneration during drag for better performance
      // Topology will be regenerated on mouse up via finishGridTool
      if (gridFillModeRef.current === 'disable') {
        if (!isCurrentlyDisabled) {
          setCellDisabled(cellId, true, true);
        }
      } else {
        if (isCurrentlyDisabled) {
          setCellDisabled(cellId, false, true);
        }
      }
    },
    [grid, setCellDisabled, findCellId]
  );

  // Finish grid tool operation and regenerate topology if needed
  const finishGridTool = useCallback(() => {
    if (useTopology && processedCellsRef.current.size > 0) {
      updateTopology();
    }
  }, [useTopology, updateTopology]);

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

  // Handle surface cycle tool (auto mode: none -> shade -> unshade -> none)
  // colorOverride allows direct color specification without relying on async state updates
  const handleSurfaceCycleTool = useCallback(
    (point: Point, isRightClick: boolean, colorOverride?: { color?: string; secondaryColor?: string }) => {
      const cellId = findCellId(point);
      if (!cellId) return;

      // Skip if this cell was already processed during this drag
      if (processedCellsRef.current.has(cellId)) {
        return;
      }

      const dataLayer = toDataLayer(activeLayer);
      const layerData = puzzle[dataLayer];

      // Use color override if provided, otherwise fall back to toolSettings
      const shadeColor = colorOverride?.color ?? toolSettings.color; // black/shade
      const unshadeColor = colorOverride?.secondaryColor ?? toolSettings.secondaryColor; // green/unshade

      // Find existing surface
      const existingSurface = Object.values(layerData.surfaces).find(
        (s) => s.cellId === cellId
      );

      // For noAdjacent constraint: record first cell's checker parity on first cell
      const isFirstCell = firstCellParityRef.current === null;
      if (isFirstCell && toolSettings.inputConstraint === 'noAdjacent') {
        const coords = getCellCoordsFromId(cellId);
        if (coords) {
          firstCellParityRef.current = (coords.row + coords.col) % 2 === 0;
        }
      }

      // Determine what action will happen
      let willShade = false;
      if (isRightClick) {
        // unshade -> shade transition
        willShade = existingSurface?.color === unshadeColor;
      } else {
        // none -> shade transition
        willShade = !existingSurface;
      }

      // noAdjacent constraint: skip cells that cannot be shaded
      if (toolSettings.inputConstraint === 'noAdjacent' && willShade) {
        // Check 1: skip cells with different checker parity (adjacent to potential shaded cell)
        if (!hasSameParity(cellId)) {
          return;
        }
        // Check 2: skip cells with directional clues (Yajilin arrow+number)
        if (cellHasDirectionalClue(cellId, puzzle, grid.cols, topology ?? null)) {
          return;
        }
        // Check 3: skip cells with lines passing through (Yajilin loop)
        if (cellHasLine(cellId, puzzle)) {
          return;
        }
      }

      processedCellsRef.current.add(cellId);

      if (isRightClick) {
        // Right click: reverse cycle (none -> unshade -> shade -> none)
        if (!existingSurface) {
          // none -> unshade (displayed as dot)
          addSurface({ cellId, color: unshadeColor, layer: dataLayer, displayMode: 'dot' });
        } else if (existingSurface.displayMode === 'dot') {
          // unshade (dot) -> shade
          removeSurface(existingSurface.id);
          addSurface({ cellId, color: shadeColor, layer: dataLayer, displayMode: 'fill' });
        } else {
          // shade -> none
          removeSurface(existingSurface.id);
        }
      } else {
        // Left click: forward cycle (none -> shade -> unshade -> none)
        if (!existingSurface) {
          // none -> shade
          addSurface({ cellId, color: shadeColor, layer: dataLayer, displayMode: 'fill' });
        } else if (existingSurface.displayMode !== 'dot') {
          // shade -> unshade (displayed as dot)
          removeSurface(existingSurface.id);
          addSurface({ cellId, color: unshadeColor, layer: dataLayer, displayMode: 'dot' });
        } else {
          // unshade (dot) -> none
          removeSurface(existingSurface.id);
        }
      }
    },
    [grid, puzzle, activeLayer, toolSettings.color, toolSettings.secondaryColor, toolSettings.inputConstraint, addSurface, removeSurface, findCellId, getCellCoordsFromId, hasSameParity, topology]
  );

  return {
    handleSurfaceTool,
    handleGridTool,
    finishGridTool,
    handleMulticolorSurfaceTool,
    handleSolutionAreaTool,
    handleSurfaceCycleTool,
    resetSurfaceFillModes,
  };
}
