/**
 * useNumberKeyboard - Hook for Excel-like keyboard input for number tools
 *
 * Handles:
 * - Arrow key navigation between cells
 * - Digit input for numbers (multi-digit support)
 * - Delete/Backspace for removing numbers
 * - Directional number tool support (Yajilin-style)
 * - Constraint mode number input (number/direc/auto modes)
 * - Candidates mode (pencil marks)
 */

import { useEffect, useCallback, useMemo } from 'react';
import { usePuzzleStore } from '../store/puzzleStoreContext';
import { useCellFinder } from './useCellFinder';
import { constraintCatalog } from '../constraints';
import { getAutoModeConfig } from '../constraints/inputModeMapping';
import { getEditableDataLayer } from '../utils/editPolicy';
import { toPenpaDirection } from '../utils/directionalClue';
import {
  findDirectionalNumberByCellId,
  findNumberEntry,
  hasNumberAtCell,
  isNumericString,
} from '../utils/numberEntries';
import {
  shouldIgnoreKeyEvent,
  isArrowKey,
  getArrowDirection,
  calculateNextPosition,
  isDigit,
  isSingleChar,
  isDeleteKey,
  getMaxDigitsForGrid,
  appendDigit,
  removeLastChar,
  type KeyboardShortcut,
  executeMatchingShortcut,
} from './keyboardUtils';

// ============================================================================
// Types
// ============================================================================

interface NumberKeyboardContext {
  isNumberTool: boolean;
  isConstraintNumberInput: boolean;
  allowNonNumeric: boolean;
  target: { row: number; col: number } | null;
  gridRows: number;
  gridCols: number;
}

type NumberInputHandler = (
  target: { row: number; col: number },
  key: string,
  isDelete: boolean,
  isSingleCharInput: boolean
) => void;

// ============================================================================
// Hook
// ============================================================================

export function useNumberKeyboard() {
  const {
    grid,
    toolSettings,
    puzzle,
    activeLayer,
    isPlayerMode,
    numberSelection,
    setNumberSelection,
    addNumber,
    removeNumber,
    updateNumber,
    addDirectionalClue,
    removeDirectionalClue,
    currentInputMode,
    currentSchemaId,
    showConstraintLayer,
  } = usePuzzleStore();

  const { findCellIdByRowCol } = useCellFinder();

  const editableLayer = getEditableDataLayer(activeLayer, isPlayerMode);

  // Check if constraint mode number input is active
  const isConstraintEnabled = showConstraintLayer && currentSchemaId !== null;

  // ============================================================================
  // Input Mode Detection
  // ============================================================================

  const shouldHandleInput = useCallback((): {
    isNumberTool: boolean;
    isConstraintNumberInput: boolean;
    allowNonNumeric: boolean;
  } => {
    if (!editableLayer) {
      return { isNumberTool: false, isConstraintNumberInput: false, allowNonNumeric: false };
    }

    const tool = toolSettings.currentTool;
    const isNumberTool = tool.startsWith('number');

    let isConstraintNumberInput = false;
    if (isConstraintEnabled) {
      const isNumberInputMode = currentInputMode === 'number' || currentInputMode === 'number-';
      const isDirecInputMode = currentInputMode === 'direc';
      const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;
      const isEditMode = editableLayer === 'problem';
      const autoConfig = getAutoModeConfig(currentSchema, isEditMode);
      const isAutoNumberMode = currentInputMode === 'auto' && autoConfig.type === 'number';
      const isAutoDirecMode = currentInputMode === 'auto' && autoConfig.type === 'direc';
      const isAutoBorderNumberMode = currentInputMode === 'auto' && autoConfig.type === 'border-number';
      isConstraintNumberInput =
        isNumberInputMode || isDirecInputMode || isAutoNumberMode || isAutoDirecMode || isAutoBorderNumberMode;
    }
    const allowNonNumeric = !isConstraintNumberInput && toolSettings.currentTool !== 'number-directional';
    return { isNumberTool, isConstraintNumberInput, allowNonNumeric };
  }, [currentInputMode, currentSchemaId, editableLayer, isConstraintEnabled, toolSettings.currentTool]);

  // ============================================================================
  // Max Digits Calculation
  // ============================================================================

  const getMaxDigits = useCallback((): number => {
    const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;
    const isEditMode = editableLayer === 'problem';
    const autoConfig = getAutoModeConfig(currentSchema, isEditMode);
    const isDirecType = currentInputMode === 'direc' ||
      (currentInputMode === 'auto' && autoConfig.type === 'direc');

    return getMaxDigitsForGrid(grid.rows, grid.cols, isDirecType);
  }, [currentInputMode, currentSchemaId, editableLayer, grid.rows, grid.cols]);

  // ============================================================================
  // Number Input Handlers
  // ============================================================================

  const handleConstraintNumber: NumberInputHandler = useCallback((
    target,
    keyValue,
    isDelete,
    isSingleCharInput
  ) => {
    if (!editableLayer) {
      return;
    }
    const cellId = findCellIdByRowCol(target.row, target.col) ?? `cell-${target.row}-${target.col}`;
    const cellIndex = target.row * grid.cols + target.col;
    const dataLayer = editableLayer;

    if (currentSchemaId === 'simplegako' && dataLayer === 'answer') {
      const hasProblemNumber = hasNumberAtCell(puzzle.problem.numbers, cellId) ||
        Boolean(findDirectionalNumberByCellId(puzzle.problem.numbers, cellId));
      if (hasProblemNumber) {
        return;
      }
    }

    const existingDirectionalEntry = findDirectionalNumberByCellId(puzzle[dataLayer].numbers, cellId);
    const existingId = existingDirectionalEntry?.id;
    const existingNumber = existingDirectionalEntry?.number;

    // For display, char takes precedence over value
    const hasChar = existingNumber ? !isNumericString(existingNumber.value) : false;
    const currentValue = existingNumber?.value ?? null;

    // Delete/Backspace handling
    if (isDelete) {
      if (hasChar) {
        if (existingId) {
          removeNumber(existingId);
        }
        return;
      } else if (!currentValue || currentValue.length <= 1) {
        // Remove entirely
        if (existingId) {
          removeNumber(existingId);
        } else {
          // Also check for regular numbers (center position) and remove if found
          const numberEntry = findNumberEntry(puzzle[dataLayer].numbers, cellId, 'center');
            if (numberEntry) {
              removeNumber(numberEntry.id);
          }
        }
      } else {
        // Remove last digit
        const newValue = removeLastChar(currentValue);
        const direction = existingNumber?.direction ?? 0;
        addDirectionalClue({
          cellId,
          cell: cellIndex,
          direction: direction as 0 | 1 | 2 | 3 | 4,
          value: newValue ? parseInt(newValue, 10) : 0,
          layer: dataLayer,
          color: existingNumber?.color,
        });
      }
      return;
    }

    // For single character input, set char field
    if (isSingleCharInput) {
      const direction = existingNumber?.direction ?? toPenpaDirection(toolSettings.arrowDirection);
      const numericValue = existingNumber && isNumericString(existingNumber.value)
        ? parseInt(existingNumber.value, 10)
        : 0;

      addDirectionalClue({
        cellId,
        cell: cellIndex,
        direction: direction as 0 | 1 | 2 | 3 | 4,
        value: numericValue,
        char: keyValue,
        layer: dataLayer,
        angle: existingNumber?.angle,
        color: existingNumber?.color || toolSettings.color,
      });
      return;
    }

    // Digit input - append to existing numeric value
    const maxDigits = getMaxDigits();
    const newValue = hasChar || !currentValue
      ? keyValue
      : appendDigit(currentValue, keyValue, maxDigits);

    // Preserve existing direction, or use current arrowDirection setting
    const direction = existingNumber?.direction ?? toPenpaDirection(toolSettings.arrowDirection);

    addDirectionalClue({
      cellId,
      cell: cellIndex,
      direction: direction as 0 | 1 | 2 | 3 | 4,
      value: parseInt(newValue, 10),
      layer: dataLayer,
      angle: existingNumber?.angle,
      color: existingNumber?.color || toolSettings.color,
    });
  }, [
    findCellIdByRowCol,
    grid.cols,
    editableLayer,
    puzzle,
    currentSchemaId,
    addDirectionalClue,
    removeDirectionalClue,
    removeNumber,
    toolSettings.arrowDirection,
    toolSettings.color,
    getMaxDigits,
  ]);

  const handleDirectionalNumber: NumberInputHandler = useCallback((
    target,
    keyValue,
    isDelete,
    isSingleCharInput
  ) => {
    if (!editableLayer) {
      return;
    }
    const cellId = findCellIdByRowCol(target.row, target.col) ?? `cell-${target.row}-${target.col}`;
    const cellIndex = target.row * grid.cols + target.col;
    const dataLayer = editableLayer;

    const existingDirectionalEntry = findDirectionalNumberByCellId(puzzle[dataLayer].numbers, cellId);
    const existingId = existingDirectionalEntry?.id;
    const existingNumber = existingDirectionalEntry?.number;

    if (isDelete) {
      if (existingId) {
        removeDirectionalClue(existingId);
      }
      return;
    }

    // Convert arrowDirection to Penpa direction
    const direction = toPenpaDirection(toolSettings.arrowDirection);

    if (isSingleCharInput) {
      addDirectionalClue({
        cellId,
        cell: cellIndex,
        direction,
        value: 0,
        char: keyValue,
        layer: dataLayer,
        color: existingNumber?.color || toolSettings.color,
      });
    } else {
      addDirectionalClue({
        cellId,
        cell: cellIndex,
        direction,
        value: parseInt(keyValue, 10),
        layer: dataLayer,
        color: existingNumber?.color || toolSettings.color,
      });
    }
  }, [
    findCellIdByRowCol,
    grid.cols,
    editableLayer,
    puzzle,
    addDirectionalClue,
    removeDirectionalClue,
    removeNumber,
    toolSettings.arrowDirection,
    toolSettings.color,
  ]);

  const handleNormalNumber: NumberInputHandler = useCallback((
    target,
    value,
    isDelete,
    _isSingleCharInput
  ) => {
    if (!editableLayer) {
      return;
    }
    const cellId = findCellIdByRowCol(target.row, target.col) ?? `cell-${target.row}-${target.col}`;
    const dataLayerForNumbers = editableLayer;
    const numbers = puzzle[dataLayerForNumbers].numbers;
    const position = toolSettings.numberPosition;
    const cornerIndex = toolSettings.cornerIndex;
    const sideIndex = toolSettings.sideIndex;

    // Find existing number at this position
    const existingEntry = findNumberEntry(numbers, cellId, position, {
      cornerIndex,
      sideIndex,
      value: position === 'candidates' ? value : undefined,
    });
    const existingId = existingEntry?.id;

    if (isDelete) {
      if (position === 'candidates') {
        // For candidates mode, delete doesn't do anything special
      } else if (existingId) {
        removeNumber(existingId);
      }
      return;
    }

    // For candidates mode, toggle the digit
    if (position === 'candidates') {
      if (existingId) {
        removeNumber(existingId);
      } else {
        addNumber({
          cellId,
          value,
          size: toolSettings.numberSize,
          position: 'candidates',
          cornerIndex: 0,
          sideIndex: 0,
          color: toolSettings.color,
          layer: dataLayerForNumbers,
        });
      }
      return;
    }

    // Add or update number for center/corner/side
    if (existingId && existingEntry) {
      updateNumber(existingId, value);
    } else {
      addNumber({
        cellId,
        value,
        size: toolSettings.numberSize,
        position,
        cornerIndex,
        sideIndex,
        color: toolSettings.color,
        layer: dataLayerForNumbers,
      });
    }
  }, [
    findCellIdByRowCol,
    editableLayer,
    puzzle,
    toolSettings.numberPosition,
    toolSettings.cornerIndex,
    toolSettings.sideIndex,
    toolSettings.numberSize,
    toolSettings.color,
    removeNumber,
    addNumber,
    updateNumber,
  ]);

  // ============================================================================
  // Shortcut Definitions
  // ============================================================================

  const shortcuts = useMemo((): KeyboardShortcut<NumberKeyboardContext>[] => [
    // Arrow key navigation
    {
      keys: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
      preventDefault: true,
      when: (ctx) => ctx.isNumberTool || ctx.isConstraintNumberInput,
      run: (ctx, key) => {
        const direction = getArrowDirection(key);
        if (!direction) return;

        const current = numberSelection || { row: 0, col: 0 };
        const next = calculateNextPosition(current, direction, ctx.gridRows, ctx.gridCols);
        if (next.row !== current.row || next.col !== current.col) {
          setNumberSelection(next);
        }
      },
    },
    // Delete/Backspace
    {
      keys: ['Backspace', 'Delete'],
      preventDefault: true,
      when: (ctx) => (ctx.isNumberTool || ctx.isConstraintNumberInput) && ctx.allowNonNumeric && ctx.target !== null,
      run: (ctx, key) => {
        if (!ctx.target) return;
        const { isConstraintNumberInput, isNumberTool } = ctx;

        if (isConstraintNumberInput) {
          handleConstraintNumber(ctx.target, key, true, false);
        } else if (toolSettings.currentTool === 'number-directional') {
          handleDirectionalNumber(ctx.target, key, true, false);
        } else if (isNumberTool) {
          handleNormalNumber(ctx.target, key, true, false);
        }
      },
    },
    // Digit input (0-9)
    {
      keys: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
      preventDefault: true,
      when: (ctx) => (ctx.isNumberTool || ctx.isConstraintNumberInput) && ctx.target !== null,
      run: (ctx, key) => {
        if (!ctx.target) return;
        const { isConstraintNumberInput, isNumberTool } = ctx;

        if (isConstraintNumberInput) {
          handleConstraintNumber(ctx.target, key, false, false);
        } else if (toolSettings.currentTool === 'number-directional') {
          handleDirectionalNumber(ctx.target, key, false, false);
        } else if (isNumberTool) {
          handleNormalNumber(ctx.target, key, false, false);
        }
      },
    },
    // Single character input (non-digit)
    {
      keys: 'abcdefghijklmnopqrstuvwxyz'.split(''),
      preventDefault: true,
      when: (ctx) => (ctx.isNumberTool || ctx.isConstraintNumberInput) && ctx.target !== null,
      run: (ctx, key) => {
        if (!ctx.target) return;
        const { isConstraintNumberInput, isNumberTool } = ctx;

        if (isConstraintNumberInput) {
          handleConstraintNumber(ctx.target, key, false, true);
        } else if (toolSettings.currentTool === 'number-directional') {
          handleDirectionalNumber(ctx.target, key, false, true);
        } else if (isNumberTool) {
          handleNormalNumber(ctx.target, key, false, true);
        }
      },
    },
  ], [
    numberSelection,
    setNumberSelection,
    toolSettings.currentTool,
    handleConstraintNumber,
    handleDirectionalNumber,
    handleNormalNumber,
  ]);

  // ============================================================================
  // Event Handler
  // ============================================================================

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if typing in input field
      if (shouldIgnoreKeyEvent(e)) return;

      const { isNumberTool, isConstraintNumberInput, allowNonNumeric } = shouldHandleInput();
      if (!isNumberTool && !isConstraintNumberInput) return;

      const context: NumberKeyboardContext = {
        isNumberTool,
        isConstraintNumberInput,
        allowNonNumeric,
        target: numberSelection,
        gridRows: grid.rows,
        gridCols: grid.cols,
      };

      executeMatchingShortcut(shortcuts, e, context);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts, shouldHandleInput, numberSelection, grid.rows, grid.cols]);
}
