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
import type { Point } from '../../types';

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
    puzzle,
  } = usePuzzleStore();

  const handleNumberTool = useCallback(
    (point: Point, isRightClick: boolean) => {
      const cell = findNearestCell(point, grid);
      if (!cell) return;

      const cellId = getCellId(cell.row, cell.col);
      const layerData = puzzle[activeLayer];
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
    [grid, puzzle, activeLayer, toolSettings, removeNumber]
  );

  const handleSymbolTool = useCallback(
    (point: Point, isRightClick: boolean, _isShiftKey: boolean = false) => {
      const layerData = puzzle[activeLayer];

      // Get symbol type from current tool
      const symbolType = toolSettings.currentTool.replace('symbol-', '');

      // Find the nearest grid point based on symbolGridPoints settings
      const symbolGridPoints = toolSettings.symbolGridPoints || ['cell'];
      let targetId: string | null = null;
      let minDistance = Infinity;

      // Check cell centers
      if (symbolGridPoints.includes('cell')) {
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

      // Check vertices
      if (symbolGridPoints.includes('vertex')) {
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

      // Check edges
      if (symbolGridPoints.includes('edge')) {
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
            layer: activeLayer,
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
          layer: activeLayer,
        });
      }
    },
    [grid, puzzle, activeLayer, toolSettings, addSymbol, removeSymbol]
  );

  // Handle special tools (thermo, arrow)
  const handleSpecialTool = useCallback(
    (point: Point, isStart: boolean, isEnd: boolean, isRightClick: boolean) => {
      const cell = findNearestCell(point, grid);
      if (!cell) return;

      const cellId = getCellId(cell.row, cell.col);
      const layerData = puzzle[activeLayer];

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
        // Continue path (avoid duplicates)
        setSpecialPath((prev) => {
          if (prev.length === 0) return [cellId];
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
            layer: activeLayer,
          });
        }
        setSpecialPath([]);
      }
    },
    [grid, puzzle, activeLayer, toolSettings, specialPath, addSpecial, removeSpecial, setSpecialPath]
  );

  // Handle text tool (similar to number tool - returns info for dialog)
  const handleTextTool = useCallback(
    (point: Point, isRightClick: boolean) => {
      const cell = findNearestCell(point, grid);
      if (!cell) return null;

      const cellId = getCellId(cell.row, cell.col);
      const layerData = puzzle[activeLayer];

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
    [grid, puzzle, activeLayer, toolSettings.currentTool, removeSymbol]
  );

  // Handle cage tool (killer cage style)
  const handleCageTool = useCallback(
    (point: Point, isStart: boolean, isEnd: boolean, isRightClick: boolean) => {
      const cell = findNearestCell(point, grid);
      if (!cell) return;

      const cellId = getCellId(cell.row, cell.col);
      const layerData = puzzle[activeLayer];

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
        // Continue adding cells (avoid duplicates)
        setSpecialPath((prev) => {
          if (prev.length === 0) return [cellId];
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
            layer: activeLayer,
          });
        }
        setSpecialPath([]);
      }
    },
    [grid, puzzle, activeLayer, specialPath, addCage, removeCage, setSpecialPath]
  );

  return {
    handleNumberTool,
    handleSymbolTool,
    handleSpecialTool,
    handleTextTool,
    handleCageTool,
  };
}
