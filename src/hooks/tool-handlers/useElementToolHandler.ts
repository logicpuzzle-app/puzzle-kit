import { useCallback, useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStoreContext';
import { parseEdgeId } from '../../utils/gridIds';
import type { Point } from '../../types';
import {
  resolveAutoMode,
  findCellIdFromPoint,
  findNearestTarget,
  getNumberRange,
  calculateNextValue,
  getSymbolMetadata,
  findExistingNumber,
  findConflictingSymbols,
  MULTI_DIRECTION_ARROWS,
  buildNumberObjectKey,
} from './toolHandlerUtils';
import { handlePathContinuation, finalizeCellPath } from './usePathBuilder';
import { shouldAllowOutboardForTool } from '../../utils/outboardPolicy';
import { getEditableDataLayer } from '../../utils/editPolicy';
import {
  findDirectionalNumberByCellId,
  hasNumberAtCell,
  isNumericString,
} from '../../utils/numberEntries';

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
    isPlayerMode,
    addNumber,
    removeNumber,
    updateNumber,
    addSymbol,
    removeSymbol,
    removeLine,
    addCage,
    removeCage,
    addSpecial,
    removeSpecial,
    addBoxLine,
    removeBoxLine,
    addDirectionalClue,
    puzzle,
    useTopology,
    topology,
    currentInputMode,
    currentSchemaId,
    showConstraintLayer,
  } = usePuzzleStore();

  const editableLayer = getEditableDataLayer(activeLayer, isPlayerMode);

  // Unified auto mode detection - replaces 3 separate useMemo blocks
  const autoModeInfo = useMemo(
    () => resolveAutoMode(currentInputMode, currentSchemaId),
    [currentInputMode, currentSchemaId]
  );

  // Helper to find cell ID considering topology mode
  const findCellId = useCallback(
    (point: Point, options?: { allowOutboard?: boolean }): string | null =>
      findCellIdFromPoint(
        point,
        grid,
        useTopology,
        topology,
        { allowOutboard: options?.allowOutboard }
      ),
    [grid, useTopology, topology]
  );

  // Get number range based on current mode
  // Use primitive dimensions as dependencies to avoid stale memo when grid object mutates in place
  const numberRange = useMemo(
    () => getNumberRange(grid, autoModeInfo),
    [grid.rows, grid.cols, autoModeInfo]
  );

  const handleNumberTool = useCallback(
    (point: Point, isRightClick: boolean, options?: { cellId?: string }) => {
      if (!editableLayer) return null;
      const cellId = options?.cellId ?? findCellId(point, { allowOutboard: shouldAllowOutboardForTool(toolSettings.currentTool, activeLayer) });
      if (!cellId) return null;

      const dataLayer = editableLayer;
      const layerData = puzzle[dataLayer];
      const { numberPosition, cornerIndex, sideIndex, selectedCandidates, color, numberSize } = toolSettings;
      const numberObjectKey = buildNumberObjectKey(numberPosition, cornerIndex, sideIndex);

      // Find existing number at this position with same submode
      const existingResult = findExistingNumber(
        layerData.numbers,
        cellId,
        numberPosition,
        cornerIndex,
        sideIndex,
        numberObjectKey
      );
      const existingNumber = existingResult?.number;
      const existingId = existingResult?.id;

      const isConstraintNumberMode =
        showConstraintLayer && currentSchemaId !== null && autoModeInfo.isConstraintNumberMode;

      // Check if in constraint number mode (handled by resolveAutoMode)
      if (isConstraintNumberMode) {
        const isPlayMode = editableLayer === 'answer';
        if (currentSchemaId === 'simplegako' && isPlayMode) {
          const hasProblemNumber = hasNumberAtCell(puzzle.problem.numbers, cellId) ||
            Boolean(findDirectionalNumberByCellId(puzzle.problem.numbers, cellId));
          if (hasProblemNumber) {
            return null;
          }
        }

        const existingDirectionalEntry = findDirectionalNumberByCellId(layerData.numbers, cellId);
        const existingDirectionalNumber = existingDirectionalEntry?.number ?? null;
        const existingClueId = existingDirectionalEntry?.id ?? null;

        // Get current value from directional numbers or fallback to regular number
        const hasChar = existingDirectionalNumber ? !isNumericString(existingDirectionalNumber.value) : false;
        const currentNum = hasChar ? null :
          (existingDirectionalNumber ? parseInt(existingDirectionalNumber.value, 10) :
            (existingNumber ? parseInt(existingNumber.value, 10) : null));

        // Determine increment mode
        const incrementMode = currentInputMode === 'number-' ? 'reverse' : 'normal';
        const newValue = calculateNextValue(currentNum, numberRange, isRightClick, incrementMode);

        // Apply the change using directional numbers
        if (newValue === null) {
          // Clear - remove both directional number and legacy number
          if (existingClueId) {
            removeNumber(existingClueId);
          }
          if (existingId) {
            removeNumber(existingId);
          }
        } else {
          // Preserve existing direction and angle if updating
          const direction = existingDirectionalNumber?.direction ?? 0;
          const angle = existingDirectionalNumber?.angle ?? null;
          addDirectionalClue({
            cellId,
            direction: direction as 0 | 1 | 2 | 3 | 4,
            value: newValue,
            layer: dataLayer,
            angle: angle,
            color: existingDirectionalNumber?.color || toolSettings.color,
            objectKey: 'directional-clue',
          });
          // Remove legacy number if it exists (migrate to directional number)
          if (existingId) {
            removeNumber(existingId);
          }
        }
        return null;
      }

      // Non-constraint mode
      if (numberPosition === 'candidates') {
        return {
          cellId,
          existingNumber,
          numberPosition,
          selectedCandidates: existingNumber?.candidates || selectedCandidates,
        };
      }

      // For center/corner/side modes: click +1/-1
      const currentNum = existingNumber ? parseInt(existingNumber.value, 10) : null;
      const nonConstraintRange = { min: 0, max: 99 };
      const newValue = calculateNextValue(
        isNaN(currentNum as number) ? null : currentNum,
        nonConstraintRange,
        isRightClick
      );

      if (newValue === null) {
        if (existingId) {
          removeNumber(existingId);
        }
      } else {
        if (existingId) {
          updateNumber(existingId, String(newValue));
        } else {
          addNumber({
            cellId,
            value: String(newValue),
            size: numberSize || 'large',
            position: numberPosition,
            cornerIndex: numberPosition === 'corner' ? cornerIndex : 0,
            sideIndex: numberPosition === 'side' ? sideIndex : 0,
            color: color || '#000000',
            layer: dataLayer,
            objectKey: numberObjectKey,
          });
        }
      }
      return null;
    },
    [grid, puzzle, activeLayer, editableLayer, currentSchemaId, toolSettings, currentInputMode, autoModeInfo, numberRange, addNumber, removeNumber, updateNumber, addDirectionalClue, findCellId, showConstraintLayer]
  );

  /**
   * Handle symbol tool input
   */
  const handleSymbolTool = useCallback(
    (point: Point, isRightClick: boolean, _isShiftKey: boolean = false, options?: {
      symbolTypeOverride?: string;
      inputMode?: 'add' | 'remove' | 'toggle';
      colorOverride?: string;
      symbolGridPointsOverride?: ('cell' | 'vertex' | 'edge')[];
    }) => {
      if (!editableLayer) return;
      const dataLayer = editableLayer;
      const layerData = puzzle[dataLayer];

      const symbolType = options?.symbolTypeOverride || toolSettings.overrideSymbolType || toolSettings.currentTool.replace('symbol-', '');
      const color = options?.colorOverride || toolSettings.color;
      const symbolGridPoints = options?.symbolGridPointsOverride || toolSettings.symbolGridPoints || ['cell'];
      const inputMode = options?.inputMode || 'toggle';

      // Find nearest target using unified helper
      const target = findNearestTarget(
        point,
        symbolGridPoints,
        grid,
        useTopology,
        topology,
        { allowOutboard: shouldAllowOutboardForTool(toolSettings.currentTool, activeLayer) }
      );

      if (!target) return;
      const targetId = target.id;

      // Get symbol metadata for handling conflicts and side effects
      const metadata = getSymbolMetadata(symbolType);
      const objectKey = metadata.objectKey ?? symbolType;

      // Find existing symbol of the same type
      const existingSymbol = Object.values(
        layerData.symbols as Record<string, { id: string; cellId: string; symbolType: string; color: string; objectKey?: string }>
      ).find(
        (s) =>
          s.cellId === targetId &&
          s.symbolType === symbolType &&
          (!objectKey || !s.objectKey || s.objectKey === objectKey)
      );

      // Right-click: delete
      if (isRightClick) {
        if (existingSymbol) {
          removeSymbol(existingSymbol.id);
        }
        return;
      }

      // Helper: remove line at the same edge when adding peke
      const applyOnAddEffects = () => {
        if (metadata.onAdd?.removeLineAtEdge && targetId) {
          const edgeParsed = parseEdgeId(targetId);
          if (!edgeParsed) return;

          const { type, row, col } = edgeParsed;
          const vertexFrom = type === 'h' ? `vertex-${row}-${col}` : `vertex-${row}-${col}`;
          const vertexTo = type === 'h' ? `vertex-${row}-${col + 1}` : `vertex-${row + 1}-${col}`;

          const existingLine = Object.values(puzzle[dataLayer].lines).find(
            (line) =>
              (line.from === vertexFrom && line.to === vertexTo) ||
              (line.from === vertexTo && line.to === vertexFrom)
          );
          if (existingLine) {
            removeLine(existingLine.id);
          }
        }
      };

      // Remove conflicting symbols
      const removeConflicts = () => {
        const conflicts = findConflictingSymbols(
          layerData.symbols as Record<string, { id: string; cellId: string; symbolType: string; color: string; objectKey?: string }>,
          targetId,
          symbolType,
          objectKey
        );
        for (const conflict of conflicts) {
          removeSymbol(conflict.id);
        }
      };

      // Build symbol props
      const isMultiDirection = (MULTI_DIRECTION_ARROWS as readonly string[]).includes(symbolType);
      const symbolProps = {
        cellId: targetId,
        symbolType,
        size: toolSettings.symbolSize,
        rotation: toolSettings.symbolRotation,
        color,
        layer: dataLayer,
        objectKey,
        ...(isMultiDirection && {
          directions: [...toolSettings.multiDirections],
          directionAngles: [...(toolSettings.multiDirectionAngles || [])],
        }),
      };

      // Handle based on inputMode
      if (inputMode === 'add') {
        if (!existingSymbol) {
          removeConflicts();
          applyOnAddEffects();
          addSymbol(symbolProps);
        }
        return;
      }

      if (inputMode === 'remove') {
        if (existingSymbol) {
          removeSymbol(existingSymbol.id);
        }
        return;
      }

      // Toggle mode
      if (existingSymbol) {
        if (existingSymbol.color === color) {
          removeSymbol(existingSymbol.id);
        } else {
          removeSymbol(existingSymbol.id);
          removeConflicts();
          applyOnAddEffects();
          addSymbol(symbolProps);
        }
      } else {
        removeConflicts();
        applyOnAddEffects();
        addSymbol(symbolProps);
      }
    },
    [grid, puzzle, activeLayer, editableLayer, toolSettings, addSymbol, removeSymbol, removeLine, useTopology, topology]
  );

  // Handle special tools (thermo, arrow)
  const handleSpecialTool = useCallback(
    (point: Point, isStart: boolean, isEnd: boolean, isRightClick: boolean) => {
      if (!editableLayer) return;
      const cellId = findCellId(point);
      if (!cellId) return;

      const dataLayer = editableLayer;
      const layerData = puzzle[dataLayer];
      const specialType = toolSettings.currentTool.replace('special-', '') as 'thermo' | 'arrow';

      if (isRightClick) {
        const existingSpecial = Object.values(layerData.specials).find(
          (s) => s.type === specialType && s.points.includes(cellId)
        );
        if (existingSpecial) {
          removeSpecial(existingSpecial.id);
        }
        return;
      }

      if (isStart) {
        setSpecialPath([cellId]);
      } else if (!isEnd) {
        setSpecialPath((prev) => handlePathContinuation(prev, cellId, {
          allowReuse: true,
          enforceAdjacency: false,
        }));
      }

      if (isEnd && specialPath.length >= 1) {
        const finalPath = finalizeCellPath(specialPath, cellId, {
          allowReuse: true,
          enforceAdjacency: false,
          minCells: 2,
        });

        if (finalPath.length >= 2) {
          addSpecial({
            type: specialType,
            points: finalPath,
            color: specialType === 'thermo' ? '#c0c0c0' : '#000000',
            layer: dataLayer,
          });
        }
        setSpecialPath([]);
      }
    },
    [puzzle, activeLayer, editableLayer, toolSettings, specialPath, addSpecial, removeSpecial, setSpecialPath, findCellId]
  );

  // Handle text tool
  const handleTextTool = useCallback(
    (point: Point, isRightClick: boolean) => {
      if (!editableLayer) return null;
      const cellId = findCellId(point, { allowOutboard: shouldAllowOutboardForTool(toolSettings.currentTool, activeLayer) });
      if (!cellId) return null;

      const dataLayer = editableLayer;
      const layerData = puzzle[dataLayer];
      const textType = toolSettings.currentTool.replace('text-', '');

      const existingText = Object.values(layerData.symbols).find(
        (s) => s.cellId === cellId && s.symbolType.startsWith('text-')
      );

      if (isRightClick && existingText) {
        removeSymbol(existingText.id);
        return null;
      } else if (!isRightClick) {
        return { cellId, existingText, textType };
      }
      return null;
    },
    [puzzle, activeLayer, editableLayer, toolSettings.currentTool, removeSymbol, findCellId]
  );

  // Handle cage tool
  const handleCageTool = useCallback(
    (point: Point, isStart: boolean, isEnd: boolean, isRightClick: boolean) => {
      if (!editableLayer) return;
      const cellId = findCellId(point);
      if (!cellId) return;

      const dataLayer = editableLayer;
      const layerData = puzzle[dataLayer];

      if (isRightClick) {
        const existingCage = Object.values(layerData.cages).find(
          (c) => c.cells.includes(cellId)
        );
        if (existingCage) {
          removeCage(existingCage.id);
        }
        return;
      }

      if (isStart) {
        setSpecialPath([cellId]);
      } else if (!isEnd) {
        setSpecialPath((prev) => handlePathContinuation(prev, cellId, {
          allowReuse: false,
          enforceAdjacency: false,
        }));
      }

      if (isEnd && specialPath.length >= 1) {
        const finalCells = finalizeCellPath(specialPath, cellId, {
          allowReuse: false,
          enforceAdjacency: false,
          minCells: 1,
        });

        if (finalCells.length >= 1) {
          addCage({
            cells: finalCells,
            style: 'dashed',
            color: '#000000',
            layer: dataLayer,
          });
        }
        setSpecialPath([]);
      }
    },
    [puzzle, activeLayer, editableLayer, specialPath, addCage, removeCage, setSpecialPath, findCellId]
  );

  // Handle BoxLine tool
  const handleBoxLineTool = useCallback(
    (point: Point, isStart: boolean, isEnd: boolean, isRightClick: boolean) => {
      if (!editableLayer) return;
      const cellId = findCellId(point);
      if (!cellId) return;

      const dataLayer = editableLayer;
      const layerData = puzzle[dataLayer];
      const boxLines = layerData.boxLines || {};

      if (isRightClick) {
        const existingBoxLine = Object.values(boxLines).find(
          (b) => b.cells.includes(cellId)
        );
        if (existingBoxLine) {
          removeBoxLine(existingBoxLine.id);
        }
        return;
      }

      if (isStart) {
        setSpecialPath([cellId]);
      } else if (!isEnd) {
        setSpecialPath((prev) => handlePathContinuation(prev, cellId, {
          allowReuse: false,
          enforceAdjacency: true,
          useTopology,
          topology,
          grid,
        }));
      }

      if (isEnd && specialPath.length >= 1) {
        const finalPath = finalizeCellPath(specialPath, cellId, {
          allowReuse: false,
          enforceAdjacency: true,
          useTopology,
          topology,
          grid,
          minCells: 1,
        });

        if (finalPath.length >= 1) {
          addBoxLine({
            cells: finalPath,
            color: toolSettings.color,
            layer: dataLayer,
          });
        }
        setSpecialPath([]);
      }
    },
    [puzzle, activeLayer, editableLayer, toolSettings.color, specialPath, addBoxLine, removeBoxLine, setSpecialPath, findCellId, useTopology, topology]
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
