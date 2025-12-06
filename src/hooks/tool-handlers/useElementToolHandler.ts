import { useCallback } from 'react';
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
    removeNumber,
    addSymbol,
    removeSymbol,
    addCage,
    removeCage,
    addSpecial,
    removeSpecial,
    addBoxLine,
    removeBoxLine,
    updateBoxLine,
    puzzle,
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

  const handleNumberTool = useCallback(
    (point: Point, isRightClick: boolean) => {
      const cellId = findCellId(point);
      if (!cellId) return;
      const dataLayer = toDataLayer(activeLayer);
      const layerData = puzzle[dataLayer];
      const { numberPosition, cornerIndex, sideIndex, selectedCandidates } = toolSettings;

      // Find existing number at this position with same submode
      let existingNumber;
      if (numberPosition === 'center') {
        existingNumber = Object.values(layerData.numbers).find(
          (n) => n.cellId === cellId && n.position === 'center'
        );
      } else if (numberPosition === 'corner') {
        existingNumber = Object.values(layerData.numbers).find(
          (n) => n.cellId === cellId && n.position === 'corner' && n.cornerIndex === cornerIndex
        );
      } else if (numberPosition === 'side') {
        existingNumber = Object.values(layerData.numbers).find(
          (n) => n.cellId === cellId && n.position === 'side' && n.sideIndex === sideIndex
        );
      } else if (numberPosition === 'candidates') {
        existingNumber = Object.values(layerData.numbers).find(
          (n) => n.cellId === cellId && n.position === 'candidates'
        );
      }

      if (isRightClick && existingNumber) {
        removeNumber(existingNumber.id);
        return null;
      } else if (!isRightClick) {
        // For candidates mode, toggle the candidate directly
        if (numberPosition === 'candidates') {
          return {
            cellId,
            existingNumber,
            numberPosition,
            selectedCandidates: existingNumber?.candidates || selectedCandidates,
          };
        }
        // Open number input dialog - handled by component
        return {
          cellId,
          existingNumber,
          numberPosition,
          cornerIndex: numberPosition === 'corner' ? cornerIndex : undefined,
          sideIndex: numberPosition === 'side' ? sideIndex : undefined,
        };
      }
      return null;
    },
    [grid, puzzle, activeLayer, toolSettings, removeNumber, findCellId]
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
