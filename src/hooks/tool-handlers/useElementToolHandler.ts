import { useCallback, useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import {
  findNearestCell,
  findNearestVertex,
  findNearestEdge,
  getCellId,
  getVertexId,
  getEdgeHId,
  getEdgeVId,
  getCellCenter,
  getVertexPosition,
  getEdgePosition,
} from '../../utils/gridUtils';
import {
  findNearestCellInTopology,
  findNearestVertexInTopology,
  findNearestEdgeInTopology,
} from '../../utils/gridTopology';
import type { Point } from '../../types';
import { toDataLayer } from '../../types';
import { constraintCatalog } from '../../constraints';
import { getAutoModeConfig } from '../../constraints/inputModeMapping';

interface UseElementToolHandlerOptions {
  specialPath: string[];
  setSpecialPath: React.Dispatch<React.SetStateAction<string[]>>;
}

/**
 * Hook providing element-related tool handlers (numbers, symbols, specials, cages, text)
 */
export function useElementToolHandler({
  specialPath,
  setSpecialPath,
}: UseElementToolHandlerOptions) {
  const {
    grid,
    toolSettings,
    activeLayer,
    addNumber,
    removeNumber,
    updateNumber,
    addSymbol,
    removeSymbol,
    addCage,
    removeCage,
    addSpecial,
    removeSpecial,
    addBoxLine,
    removeBoxLine,
    updateBoxLine,
    addDirectionalClue,
    removeDirectionalClue,
    puzzle,
    useTopology,
    topology,
    currentInputMode,
    currentSchemaId,
  } = usePuzzleStore();

  // Check if auto mode is direc type
  const isAutoDirecMode = useMemo(() => {
    if (currentInputMode !== 'auto' || !currentSchemaId) return false;
    const schema = constraintCatalog.getSchema(currentSchemaId);
    if (!schema) return false;
    // For auto mode, check edit mode config (problem layer uses edit mode)
    const autoConfig = getAutoModeConfig(schema, true);
    return autoConfig.type === 'direc';
  }, [currentInputMode, currentSchemaId]);

  // Check if auto mode is number type (e.g., Nurikabe edit mode)
  const isAutoNumberMode = useMemo(() => {
    if (currentInputMode !== 'auto' || !currentSchemaId) return false;
    const schema = constraintCatalog.getSchema(currentSchemaId);
    if (!schema) return false;
    // For auto mode, check edit mode config (problem layer uses edit mode)
    const autoConfig = getAutoModeConfig(schema, true);
    return autoConfig.type === 'number';
  }, [currentInputMode, currentSchemaId]);

  // Check if auto mode is border-number type (e.g., Heyawake edit mode)
  const isAutoBorderNumberMode = useMemo(() => {
    if (currentInputMode !== 'auto' || !currentSchemaId) return false;
    const schema = constraintCatalog.getSchema(currentSchemaId);
    if (!schema) return false;
    // For auto mode, check edit mode config (problem layer uses edit mode)
    const autoConfig = getAutoModeConfig(schema, true);
    return autoConfig.type === 'border-number';
  }, [currentInputMode, currentSchemaId]);

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

  /**
   * Get min/max values for number input based on grid size and input mode
   * - For yajilin (direc mode or auto-direc): max is about half the max dimension
   * - For other puzzles (nurikabe, etc.): max is based on total cells (island size)
   */
  const getNumberRange = useCallback((): { min: number; max: number } => {
    if (currentInputMode === 'direc' || isAutoDirecMode) {
      // Yajilin arrow numbers: max is about half the dimension
      const maxDimension = Math.max(grid.rows, grid.cols);
      return { min: 0, max: Math.floor(maxDimension / 2) };
    }
    // Other puzzles (nurikabe, etc.): max is total cells (for island size)
    // Start from 1 for island-based puzzles
    const totalCells = grid.rows * grid.cols;
    return { min: 1, max: totalCells };
  }, [grid.rows, grid.cols, currentInputMode, isAutoDirecMode]);

  const handleNumberTool = useCallback(
    (point: Point, isRightClick: boolean) => {
      const cellId = findCellId(point);
      if (!cellId) return null;
      const dataLayer = toDataLayer(activeLayer);
      const layerData = puzzle[dataLayer];
      const { numberPosition, cornerIndex, sideIndex, selectedCandidates, color, numberSize } = toolSettings;

      // Find existing number at this position with same submode
      let existingNumber: (typeof layerData.numbers)[string] | undefined;
      let existingId: string | undefined;

      if (numberPosition === 'center') {
        const entry = Object.entries(layerData.numbers).find(
          ([, n]) => n.cellId === cellId && n.position === 'center'
        );
        if (entry) {
          existingId = entry[0];
          existingNumber = entry[1];
        }
      } else if (numberPosition === 'corner') {
        const entry = Object.entries(layerData.numbers).find(
          ([, n]) => n.cellId === cellId && n.position === 'corner' && n.cornerIndex === cornerIndex
        );
        if (entry) {
          existingId = entry[0];
          existingNumber = entry[1];
        }
      } else if (numberPosition === 'side') {
        const entry = Object.entries(layerData.numbers).find(
          ([, n]) => n.cellId === cellId && n.position === 'side' && n.sideIndex === sideIndex
        );
        if (entry) {
          existingId = entry[0];
          existingNumber = entry[1];
        }
      } else if (numberPosition === 'candidates') {
        const entry = Object.entries(layerData.numbers).find(
          ([, n]) => n.cellId === cellId && n.position === 'candidates'
        );
        if (entry) {
          existingId = entry[0];
          existingNumber = entry[1];
        }
      }

      // In constraint input mode (number/number-/direc/auto-direc/auto-number/auto-border-number), use pzpr-puzzlink style click increment/decrement
      // Store as directionalClues with direction=0 (no arrow) to allow later arrow direction conversion
      // direc mode and auto-direc: same as number mode (click for number, flick for direction)
      // auto-number mode (Nurikabe): click increment/decrement for island size numbers
      // auto-border-number mode (Heyawake): click for number input
      const isConstraintNumberMode = currentInputMode === 'number' || currentInputMode === 'number-' || currentInputMode === 'direc' || isAutoDirecMode || isAutoNumberMode || isAutoBorderNumberMode;
      if (isConstraintNumberMode) {
        const { min, max } = getNumberRange();

        // Convert cellId to cell index for directionalClues
        const cellMatch = cellId.match(/cell-(\d+)-(\d+)/);
        const cellIndex = cellMatch ? parseInt(cellMatch[1], 10) * grid.cols + parseInt(cellMatch[2], 10) : -1;
        if (cellIndex === -1) return null;

        // Check existing directionalClue for this cell
        const existingClueEntry = Object.entries(layerData.directionalClues || {}).find(
          ([, c]) => c.cell === cellIndex
        );
        const existingClue = existingClueEntry ? existingClueEntry[1] : null;
        const existingClueId = existingClueEntry ? existingClueEntry[0] : null;

        // Get current value from directionalClue or fallback to numbers
        const currentNum = existingClue ? existingClue.value :
          (existingNumber ? parseInt(existingNumber.value, 10) : -1);
        const isValidNum = !isNaN(currentNum) && currentNum >= min;

        let newValue: number | null = null;

        if (currentInputMode === 'number' || currentInputMode === 'direc' || isAutoDirecMode || isAutoNumberMode || isAutoBorderNumberMode) {
          // Normal mode (number/direc/auto-direc/auto-number/auto-border-number): left click +1, right click -1
          if (isRightClick) {
            // Right click: decrement (空白 → max → max-1 → ... → min → 空白)
            if (!isValidNum || currentNum === -1) {
              newValue = max;
            } else if (currentNum <= min) {
              newValue = -1; // Clear
            } else {
              newValue = currentNum - 1;
            }
          } else {
            // Left click: increment (空白 → min → min+1 → ... → max → 空白)
            if (!isValidNum || currentNum === -1) {
              newValue = min;
            } else if (currentNum >= max) {
              newValue = -1; // Clear
            } else {
              newValue = currentNum + 1;
            }
          }
        } else {
          // Reverse mode (number-): left click -1, right click +1
          if (isRightClick) {
            // Right click: increment
            if (!isValidNum || currentNum === -1) {
              newValue = min;
            } else if (currentNum >= max) {
              newValue = -1; // Clear
            } else {
              newValue = currentNum + 1;
            }
          } else {
            // Left click: decrement
            if (!isValidNum || currentNum === -1) {
              newValue = max;
            } else if (currentNum <= min) {
              newValue = -1; // Clear
            } else {
              newValue = currentNum - 1;
            }
          }
        }

        // Apply the change using directionalClues (direction=0 for no arrow)
        if (newValue === -1) {
          // Clear - remove both directionalClue and legacy number
          if (existingClueId) {
            removeDirectionalClue(existingClueId);
          }
          if (existingId) {
            removeNumber(existingId);
          }
        } else if (newValue !== null) {
          // Preserve existing direction if updating, otherwise use 0 (no direction)
          const direction = existingClue?.direction ?? 0;
          addDirectionalClue({
            cell: cellIndex,
            direction: direction as 0 | 1 | 2 | 3 | 4,
            value: newValue,
            layer: dataLayer,
          });
          // Remove legacy number if it exists (migrate to directionalClues)
          if (existingId) {
            removeNumber(existingId);
          }
        }
        return null; // Handled directly, no dialog needed
      }

      // Non-constraint mode: click increment/decrement (pzpr-puzzlink style)
      // For candidates mode, return info for panel handling
      if (numberPosition === 'candidates') {
        return {
          cellId,
          existingNumber: existingNumber,
          numberPosition,
          selectedCandidates: existingNumber?.candidates || selectedCandidates,
        };
      }

      // For center/corner/side modes: implement click +1/-1
      const currentNum = existingNumber ? parseInt(existingNumber.value, 10) : -1;
      const isValidNum = !isNaN(currentNum) && currentNum >= 0;
      // Use sensible range for non-constraint mode (0-99)
      const min = 0;
      const max = 99;

      let newValue: number | null = null;

      if (isRightClick) {
        // Right click: decrement (空白 → max → max-1 → ... → min → 空白)
        if (!isValidNum || currentNum === -1) {
          newValue = max;
        } else if (currentNum <= min) {
          newValue = -1; // Clear
        } else {
          newValue = currentNum - 1;
        }
      } else {
        // Left click: increment (空白 → min → min+1 → ... → max → 空白)
        if (!isValidNum || currentNum === -1) {
          newValue = min;
        } else if (currentNum >= max) {
          newValue = -1; // Clear
        } else {
          newValue = currentNum + 1;
        }
      }

      // Apply the change
      if (newValue === -1) {
        // Clear
        if (existingId) {
          removeNumber(existingId);
        }
      } else if (newValue !== null) {
        if (existingId) {
          // Update existing number
          updateNumber(existingId, String(newValue));
        } else {
          // Add new number
          addNumber({
            cellId,
            value: String(newValue),
            size: numberSize || 'large',
            position: numberPosition,
            cornerIndex: numberPosition === 'corner' ? cornerIndex : 0,
            sideIndex: numberPosition === 'side' ? sideIndex : 0,
            color: color || '#000000',
            layer: dataLayer,
          });
        }
      }
      return null;
    },
    [grid, puzzle, activeLayer, toolSettings, currentInputMode, isAutoDirecMode, isAutoNumberMode, isAutoBorderNumberMode, getNumberRange, addNumber, removeNumber, updateNumber, addDirectionalClue, removeDirectionalClue, findCellId]
  );

  const handleSymbolTool = useCallback(
    (point: Point, isRightClick: boolean, _isShiftKey: boolean = false) => {
      const dataLayer = toDataLayer(activeLayer);
      const layerData = puzzle[dataLayer];

      // Get symbol type from current tool (or use override if set by constraint mode)
      const symbolType = toolSettings.overrideSymbolType || toolSettings.currentTool.replace('symbol-', '');

      // Find the nearest grid point based on symbolGridPoints settings
      const symbolGridPoints = toolSettings.symbolGridPoints || ['cell'];
      let targetId: string | null = null;
      let minDistance = Infinity;

      // Check cell centers
      if (symbolGridPoints.includes('cell')) {
        if (useTopology && topology) {
          const topoCell = findNearestCellInTopology(topology, point);
          if (topoCell) {
            const dist = Math.sqrt(Math.pow(point.x - topoCell.center.x, 2) + Math.pow(point.y - topoCell.center.y, 2));
            if (dist < minDistance) {
              minDistance = dist;
              targetId = topoCell.id;
            }
          }
        } else {
          const cell = findNearestCell(point, grid);
          if (cell) {
            const center = getCellCenter(cell.row, cell.col, grid);
            const dist = Math.sqrt(Math.pow(point.x - center.x, 2) + Math.pow(point.y - center.y, 2));
            if (dist < minDistance) {
              minDistance = dist;
              targetId = getCellId(cell.row, cell.col);
            }
          }
        }
      }

      // Check vertices
      if (symbolGridPoints.includes('vertex')) {
        if (useTopology && topology) {
          const topoVertex = findNearestVertexInTopology(topology, point);
          if (topoVertex) {
            const dist = Math.sqrt(Math.pow(point.x - topoVertex.position.x, 2) + Math.pow(point.y - topoVertex.position.y, 2));
            if (dist < minDistance) {
              minDistance = dist;
              targetId = topoVertex.id;
            }
          }
        } else {
          const vertex = findNearestVertex(point, grid, grid.cellSize * 0.6);
          if (vertex) {
            const pos = getVertexPosition(vertex.row, vertex.col, grid);
            const dist = Math.sqrt(Math.pow(point.x - pos.x, 2) + Math.pow(point.y - pos.y, 2));
            if (dist < minDistance) {
              minDistance = dist;
              targetId = getVertexId(vertex.row, vertex.col);
            }
          }
        }
      }

      // Check edges
      if (symbolGridPoints.includes('edge')) {
        if (useTopology && topology) {
          const topoEdge = findNearestEdgeInTopology(topology, point);
          if (topoEdge) {
            const dist = Math.sqrt(Math.pow(point.x - topoEdge.midpoint.x, 2) + Math.pow(point.y - topoEdge.midpoint.y, 2));
            if (dist < minDistance) {
              minDistance = dist;
              targetId = topoEdge.id;
            }
          }
        } else {
          const edge = findNearestEdge(point, grid, grid.cellSize * 0.6);
          if (edge) {
            const pos = getEdgePosition(edge.type, edge.row, edge.col, grid);
            const dist = Math.sqrt(Math.pow(point.x - pos.x, 2) + Math.pow(point.y - pos.y, 2));
            if (dist < minDistance) {
              minDistance = dist;
              targetId = edge.type === 'h'
                ? getEdgeHId(edge.row, edge.col)
                : getEdgeVId(edge.row, edge.col);
            }
          }
        }
      }

      if (!targetId) return;

      // Right-click: delete any symbol at this position
      if (isRightClick) {
        const existingSymbol = Object.values(layerData.symbols).find(
          (s) => s.cellId === targetId
        );
        if (existingSymbol) {
          removeSymbol(existingSymbol.id);
        }
        return;
      }

      // Left-click: add or toggle symbol
      const existingSymbol = Object.values(layerData.symbols).find(
        (s) => s.cellId === targetId && s.symbolType === symbolType
      );

      if (existingSymbol) {
        if (existingSymbol.color === toolSettings.color) {
          // Same color: toggle off
          removeSymbol(existingSymbol.id);
        } else {
          // Different color: replace
          removeSymbol(existingSymbol.id);
          addSymbol({
            cellId: targetId,
            symbolType,
            size: toolSettings.symbolSize,
            rotation: toolSettings.symbolRotation,
            color: toolSettings.color,
            layer: toDataLayer(activeLayer),
          });
        }
      } else {
        // Add new symbol
        addSymbol({
          cellId: targetId,
          symbolType,
          size: toolSettings.symbolSize,
          rotation: toolSettings.symbolRotation,
          color: toolSettings.color,
          layer: toDataLayer(activeLayer),
        });
      }
    },
    [grid, puzzle, activeLayer, toolSettings, addSymbol, removeSymbol, useTopology, topology]
  );

  // Handle special tools (thermo, arrow)
  const handleSpecialTool = useCallback(
    (point: Point, isStart: boolean, isEnd: boolean, isRightClick: boolean) => {
      const cellId = findCellId(point);
      if (!cellId) return;
      const dataLayer = toDataLayer(activeLayer);
      const layerData = puzzle[dataLayer];

      // Get special type from current tool (special-thermo -> thermo)
      const specialType = toolSettings.currentTool.replace('special-', '') as 'thermo' | 'arrow';

      if (isRightClick) {
        // Right-click to remove existing special at this cell
        const existingSpecial = Object.values(layerData.specials).find(
          (s) => s.type === specialType && s.points.includes(cellId)
        );
        if (existingSpecial) {
          removeSpecial(existingSpecial.id);
        }
        return;
      }

      if (isStart) {
        // Start new path
        setSpecialPath([cellId]);
      } else if (!isEnd) {
        // Continue path - handle backtracking (remove last cell if returning to previous cell)
        setSpecialPath((prev) => {
          if (prev.length === 0) return [cellId];
          // If returning to second-to-last cell, remove the last cell (backtrack)
          if (prev.length >= 2 && prev[prev.length - 2] === cellId) {
            return prev.slice(0, -1);
          }
          // If not at the last cell, add it
          if (prev[prev.length - 1] !== cellId) {
            return [...prev, cellId];
          }
          return prev;
        });
      }

      if (isEnd && specialPath.length >= 1) {
        // End path and create special element
        const finalPath = [...specialPath];
        if (finalPath.length === 0 || finalPath[finalPath.length - 1] !== cellId) {
          finalPath.push(cellId);
        }

        if (finalPath.length >= 2) {
          addSpecial({
            type: specialType,
            points: finalPath,
            color: specialType === 'thermo' ? '#c0c0c0' : '#000000',
            layer: toDataLayer(activeLayer),
          });
        }
        setSpecialPath([]);
      }
    },
    [grid, puzzle, activeLayer, toolSettings, specialPath, addSpecial, removeSpecial, setSpecialPath, findCellId]
  );

  // Handle text tool (similar to number tool - returns info for dialog)
  const handleTextTool = useCallback(
    (point: Point, isRightClick: boolean) => {
      const cellId = findCellId(point);
      if (!cellId) return null;
      const dataLayer = toDataLayer(activeLayer);
      const layerData = puzzle[dataLayer];

      // Get text type from current tool (text-alphabet -> alphabet)
      const textType = toolSettings.currentTool.replace('text-', '');

      // Find existing symbol at this cell with text content
      // Text is stored as a symbol with symbolType starting with 'text-'
      const existingText = Object.values(layerData.symbols).find(
        (s) => s.cellId === cellId && s.symbolType.startsWith('text-')
      );

      if (isRightClick && existingText) {
        removeSymbol(existingText.id);
        return null;
      } else if (!isRightClick) {
        // Open text input dialog - handled by component
        return {
          cellId,
          existingText,
          textType,
        };
      }
      return null;
    },
    [grid, puzzle, activeLayer, toolSettings.currentTool, removeSymbol, findCellId]
  );

  // Handle cage tool (killer cage style)
  const handleCageTool = useCallback(
    (point: Point, isStart: boolean, isEnd: boolean, isRightClick: boolean) => {
      const cellId = findCellId(point);
      if (!cellId) return;
      const dataLayer = toDataLayer(activeLayer);
      const layerData = puzzle[dataLayer];

      if (isRightClick) {
        // Right-click to remove existing cage at this cell
        const existingCage = Object.values(layerData.cages).find(
          (c) => c.cells.includes(cellId)
        );
        if (existingCage) {
          removeCage(existingCage.id);
        }
        return;
      }

      if (isStart) {
        // Start new cage
        setSpecialPath([cellId]);
      } else if (!isEnd) {
        // Continue adding cells - handle backtracking
        setSpecialPath((prev) => {
          if (prev.length === 0) return [cellId];
          // If returning to second-to-last cell, remove the last cell (backtrack)
          if (prev.length >= 2 && prev[prev.length - 2] === cellId) {
            return prev.slice(0, -1);
          }
          // Add new cell if not already in path
          if (!prev.includes(cellId)) {
            return [...prev, cellId];
          }
          return prev;
        });
      }

      if (isEnd && specialPath.length >= 1) {
        // End and create cage element
        const finalCells = [...specialPath];
        if (!finalCells.includes(cellId)) {
          finalCells.push(cellId);
        }

        if (finalCells.length >= 1) {
          addCage({
            cells: finalCells,
            style: 'dashed',
            color: '#000000',
            layer: toDataLayer(activeLayer),
          });
        }
        setSpecialPath([]);
      }
    },
    [grid, puzzle, activeLayer, specialPath, addCage, removeCage, setSpecialPath, findCellId]
  );

  // Helper to check if two cells are adjacent
  const areCellsAdjacent = useCallback((cellId1: string, cellId2: string): boolean => {
    // For topology mode, use the topology's adjacency information
    if (useTopology && topology) {
      const cell1 = topology.cells.get(cellId1);
      if (cell1) {
        return cell1.adjacentCells.includes(cellId2);
      }
      return false;
    }

    // For standard grid, check orthogonal adjacency
    const match1 = cellId1.match(/^cell-(\d+)-(\d+)$/);
    const match2 = cellId2.match(/^cell-(\d+)-(\d+)$/);

    if (match1 && match2) {
      const [, row1, col1] = match1.map(Number);
      const [, row2, col2] = match2.map(Number);
      const rowDiff = Math.abs(row2 - row1);
      const colDiff = Math.abs(col2 - col1);

      // Only orthogonally adjacent cells
      return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }

    return false;
  }, [useTopology, topology]);

  // Handle BoxLine tool (hybrid of filled cell and line)
  // Creates connected boxes that can form snake-like paths
  const handleBoxLineTool = useCallback(
    (point: Point, isStart: boolean, isEnd: boolean, isRightClick: boolean) => {
      const cellId = findCellId(point);
      if (!cellId) return;
      const dataLayer = toDataLayer(activeLayer);
      const layerData = puzzle[dataLayer];
      const boxLines = layerData.boxLines || {};

      if (isRightClick) {
        // Right-click to remove existing boxline at this cell
        const existingBoxLine = Object.values(boxLines).find(
          (b) => b.cells.includes(cellId)
        );
        if (existingBoxLine) {
          removeBoxLine(existingBoxLine.id);
        }
        return;
      }

      if (isStart) {
        // Start new boxline path
        setSpecialPath([cellId]);
      } else if (!isEnd) {
        // Continue path - handle backtracking and only add adjacent cells
        setSpecialPath((prev) => {
          if (prev.length === 0) return [cellId];

          // If returning to second-to-last cell, remove the last cell (backtrack)
          if (prev.length >= 2 && prev[prev.length - 2] === cellId) {
            return prev.slice(0, -1);
          }

          // Check if cell is already in path
          if (prev.includes(cellId)) return prev;

          // Check if new cell is adjacent to the last cell
          const lastCellId = prev[prev.length - 1];
          if (areCellsAdjacent(lastCellId, cellId)) {
            return [...prev, cellId];
          }

          return prev;
        });
      }

      if (isEnd && specialPath.length >= 1) {
        // End path and create boxline element
        const finalPath = [...specialPath];

        // Check if end cell is adjacent and should be added
        if (finalPath.length > 0 && !finalPath.includes(cellId)) {
          const lastCellId = finalPath[finalPath.length - 1];
          if (areCellsAdjacent(lastCellId, cellId)) {
            finalPath.push(cellId);
          }
        }

        if (finalPath.length >= 1) {
          addBoxLine({
            cells: finalPath,
            color: toolSettings.color,
            layer: toDataLayer(activeLayer),
          });
        }
        setSpecialPath([]);
      }
    },
    [grid, puzzle, activeLayer, toolSettings.color, specialPath, addBoxLine, removeBoxLine, updateBoxLine, setSpecialPath, findCellId, areCellsAdjacent]
  );

  return {
    handleNumberTool,
    handleSymbolTool,
    handleSpecialTool,
    handleTextTool,
    handleCageTool,
    handleBoxLineTool,
  };
}
