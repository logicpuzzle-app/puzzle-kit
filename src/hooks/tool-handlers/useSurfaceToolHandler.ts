import { useCallback, useRef } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import { findNearestCell, getCellId } from '../../utils/gridUtils';
import { findNearestCellInTopology } from '../../utils/gridTopology';
import type { Point, PuzzleState } from '../../types';
import { toDataLayer } from '../../types';

/**
 * Parse cell ID to row/col
 */
function parseCellIdHelper(cellId: string): { row: number; col: number } | null {
  const match = cellId.match(/^cell-(\d+)-(\d+)$/);
  if (match) {
    return { row: parseInt(match[1]), col: parseInt(match[2]) };
  }
  return null;
}

/**
 * Check if a cell has a directional clue (Yajilin arrow+number)
 */
function cellHasDirectionalClue(cellId: string, puzzle: PuzzleState, cols: number): boolean {
  const directionalClues = puzzle.problem.directionalClues;
  if (!directionalClues) return false;

  // Convert cellId to linear index
  const coords = parseCellIdHelper(cellId);
  if (!coords) return false;
  const cellIndex = coords.row * cols + coords.col;

  return Object.values(directionalClues).some(clue => clue.cell === cellIndex);
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

  // Helper to get cell row/col from cellId
  const parseCellId = useCallback((cellId: string): { row: number; col: number } | null => {
    // cellId format: "cell-{row}-{col}" (e.g., "cell-0-0", "cell-1-2")
    const match = cellId.match(/^cell-(\d+)-(\d+)$/);
    if (match) {
      return { row: parseInt(match[1]), col: parseInt(match[2]) };
    }
    // Also try "r{row}c{col}" format (e.g., "r0c0", "r1c2")
    const matchAlt = cellId.match(/^r(\d+)c(\d+)$/);
    if (matchAlt) {
      return { row: parseInt(matchAlt[1]), col: parseInt(matchAlt[2]) };
    }
    return null;
  }, []);

  // Helper to check if cell has same checker parity as first cell (for noAdjacent constraint)
  const hasSameParity = useCallback((cellId: string): boolean => {
    if (firstCellParityRef.current === null) return true;
    const coords = parseCellId(cellId);
    if (!coords) return true;
    const parity = (coords.row + coords.col) % 2 === 0;
    return parity === firstCellParityRef.current;
  }, [parseCellId]);

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

      // Debug: log inputConstraint at start
      console.log('[handleSurfaceTool] Called with inputConstraint:', toolSettings.inputConstraint);

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
          const coords = parseCellId(cellId);
          if (coords) {
            firstCellParityRef.current = (coords.row + coords.col) % 2 === 0;
            console.log('[handleSurfaceTool] First cell parity set:', {
              cellId,
              coords,
              parity: firstCellParityRef.current,
              inputConstraint: toolSettings.inputConstraint,
            });
          }
        }
      }

      // noAdjacent constraint: skip cells that cannot be shaded when filling
      if (toolSettings.inputConstraint === 'noAdjacent' && surfaceFillModeRef.current === 'fill') {
        console.log('[handleSurfaceTool] noAdjacent check:', {
          cellId,
          inputConstraint: toolSettings.inputConstraint,
          firstCellParity: firstCellParityRef.current,
          hasSameParity: hasSameParity(cellId),
        });
        // Check 1: skip cells with different checker parity (adjacent to potential shaded cell)
        if (!hasSameParity(cellId)) {
          console.log('[handleSurfaceTool] Skipping cell due to noAdjacent constraint');
          return;
        }
        // Check 2: skip cells with directional clues (Yajilin arrow+number)
        if (cellHasDirectionalClue(cellId, puzzle, grid.cols)) {
          console.log('[handleSurfaceTool] Skipping cell with directional clue');
          return;
        }
        // Check 3: skip cells with lines passing through (Yajilin loop)
        if (cellHasLine(cellId, puzzle)) {
          console.log('[handleSurfaceTool] Skipping cell with line');
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
    [grid, puzzle, activeLayer, toolSettings.color, toolSettings.secondaryColor, toolSettings.inputConstraint, addSurface, removeSurface, findCellId, parseCellId, hasSameParity]
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

  // Handle surface cycle tool (auto mode: none -> shade -> unshade -> none)
  const handleSurfaceCycleTool = useCallback(
    (point: Point, isRightClick: boolean) => {
      const cellId = findCellId(point);
      if (!cellId) return;

      // Debug: log inputConstraint at start
      console.log('[handleSurfaceCycleTool] Called with inputConstraint:', toolSettings.inputConstraint);

      // Skip if this cell was already processed during this drag
      if (processedCellsRef.current.has(cellId)) {
        return;
      }

      const dataLayer = toDataLayer(activeLayer);
      const layerData = puzzle[dataLayer];

      const shadeColor = toolSettings.color; // black/shade
      const unshadeColor = toolSettings.secondaryColor; // green/unshade

      // Find existing surface
      const existingSurface = Object.values(layerData.surfaces).find(
        (s) => s.cellId === cellId
      );

      // For noAdjacent constraint: record first cell's checker parity on first cell
      const isFirstCell = firstCellParityRef.current === null;
      if (isFirstCell && toolSettings.inputConstraint === 'noAdjacent') {
        const coords = parseCellId(cellId);
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
        if (cellHasDirectionalClue(cellId, puzzle, grid.cols)) {
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
          // none -> unshade
          addSurface({ cellId, color: unshadeColor, layer: dataLayer });
        } else if (existingSurface.color === unshadeColor) {
          // unshade -> shade
          removeSurface(existingSurface.id);
          addSurface({ cellId, color: shadeColor, layer: dataLayer });
        } else {
          // shade -> none
          removeSurface(existingSurface.id);
        }
      } else {
        // Left click: forward cycle (none -> shade -> unshade -> none)
        if (!existingSurface) {
          // none -> shade
          addSurface({ cellId, color: shadeColor, layer: dataLayer });
        } else if (existingSurface.color === shadeColor) {
          // shade -> unshade
          removeSurface(existingSurface.id);
          addSurface({ cellId, color: unshadeColor, layer: dataLayer });
        } else {
          // unshade -> none
          removeSurface(existingSurface.id);
        }
      }
    },
    [grid, puzzle, activeLayer, toolSettings.color, toolSettings.secondaryColor, toolSettings.inputConstraint, addSurface, removeSurface, findCellId, parseCellId, hasSameParity]
  );

  return {
    handleSurfaceTool,
    handleGridTool,
    handleMulticolorSurfaceTool,
    handleSolutionAreaTool,
    handleSurfaceCycleTool,
    resetSurfaceFillModes,
  };
}
