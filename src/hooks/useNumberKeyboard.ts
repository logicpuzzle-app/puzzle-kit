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
import { usePuzzleStore } from '../store/puzzleStore';
import { useCellFinder } from './useCellFinder';
import { toDataLayer } from '../types';
import { constraintCatalog } from '../constraints';
import { getAutoModeConfig } from '../constraints/inputModeMapping';
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

  // Check if constraint mode number input is active
  const isConstraintEnabled = showConstraintLayer && currentSchemaId !== null;

  // ============================================================================
  // Input Mode Detection
  // ============================================================================

  const shouldHandleInput = useCallback((): { isNumberTool: boolean; isConstraintNumberInput: boolean } => {
    const tool = toolSettings.currentTool;
    const isNumberTool = tool.startsWith('number');

    let isConstraintNumberInput = false;
    if (isConstraintEnabled) {
      const isNumberInputMode = currentInputMode === 'number' || currentInputMode === 'number-';
      const isDirecInputMode = currentInputMode === 'direc';
      const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;
      const isEditMode = activeLayer === 'problem';
      const autoConfig = getAutoModeConfig(currentSchema, isEditMode);
      const isAutoNumberMode = currentInputMode === 'auto' && autoConfig.type === 'number';
      const isAutoDirecMode = currentInputMode === 'auto' && autoConfig.type === 'direc';
      const isAutoBorderNumberMode = currentInputMode === 'auto' && autoConfig.type === 'border-number';
      isConstraintNumberInput =
        isNumberInputMode || isDirecInputMode || isAutoNumberMode || isAutoDirecMode || isAutoBorderNumberMode;
    }
    return { isNumberTool, isConstraintNumberInput };
  }, [activeLayer, currentInputMode, currentSchemaId, isConstraintEnabled, toolSettings.currentTool]);

  // ============================================================================
  // Max Digits Calculation
  // ============================================================================

  const getMaxDigits = useCallback((): number => {
    const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;
    const isEditMode = activeLayer === 'problem';
    const autoConfig = getAutoModeConfig(currentSchema, isEditMode);
    const isDirecType = currentInputMode === 'direc' ||
      (currentInputMode === 'auto' && autoConfig.type === 'direc');

    return getMaxDigitsForGrid(grid.rows, grid.cols, isDirecType);
  }, [activeLayer, currentInputMode, currentSchemaId, grid.rows, grid.cols]);

  // ============================================================================
  // Number Input Handlers
  // ============================================================================

  const handleConstraintNumber: NumberInputHandler = useCallback((
    target,
    keyValue,
    isDelete,
    isSingleCharInput
  ) => {
    const cellId = findCellIdByRowCol(target.row, target.col) ?? `cell-${target.row}-${target.col}`;
    const cellIndex = target.row * grid.cols + target.col;
    const dataLayer = toDataLayer(activeLayer);

    // Find existing clue by cellId
    const existingEntry = Object.entries(puzzle[dataLayer].directionalClues || {}).find(
      ([, c]) => c.cellId === cellId
    );
    const existingClue = existingEntry?.[1];
    const existingId = existingEntry?.[0];

    // For display, char takes precedence over value
    const hasChar = existingClue?.char !== undefined;
    const currentValue = hasChar
      ? existingClue!.char!
      : (existingClue?.value !== undefined ? String(existingClue.value) : null);

    // Delete/Backspace handling
    if (isDelete) {
      if (hasChar) {
        // If has char, remove char and keep value
        if (existingClue) {
          addDirectionalClue({
            cellId,
            cell: cellIndex,
            direction: existingClue.direction,
            value: existingClue.value,
            layer: dataLayer,
            angle: existingClue.angle,
            color: existingClue.color,
          });
        }
      } else if (!currentValue || currentValue.length <= 1) {
        // Remove entirely
        if (existingId) {
          removeDirectionalClue(existingId);
        } else {
          // Also check for regular numbers (center position) and remove if found
          const numberEntry = Object.entries(puzzle[dataLayer].numbers || {}).find(
            ([, n]) => n.cellId === cellId && n.position === 'center'
          );
          if (numberEntry) {
            removeNumber(numberEntry[0]);
          }
        }
      } else {
        // Remove last digit
        const newValue = removeLastChar(currentValue);
        const direction = existingClue?.direction ?? 0;
        addDirectionalClue({
          cellId,
          cell: cellIndex,
          direction: direction as 0 | 1 | 2 | 3 | 4,
          value: newValue ? parseInt(newValue, 10) : 0,
          layer: dataLayer,
          color: existingClue?.color,
        });
      }
      return;
    }

    // For single character input, set char field
    if (isSingleCharInput) {
      const directionMap: Record<number, 0 | 1 | 2 | 3 | 4> = {
        [-1]: 0, 0: 1, 1: 3, 2: 4, 3: 2,
      };
      const direction = existingClue?.direction ?? directionMap[toolSettings.arrowDirection] ?? 0;

      addDirectionalClue({
        cellId,
        cell: cellIndex,
        direction: direction as 0 | 1 | 2 | 3 | 4,
        value: existingClue?.value ?? 0,
        char: keyValue,
        layer: dataLayer,
        angle: existingClue?.angle,
        color: existingClue?.color || toolSettings.color,
      });
      return;
    }

    // Digit input - append to existing numeric value
    const maxDigits = getMaxDigits();
    const newValue = hasChar || !currentValue
      ? keyValue
      : appendDigit(currentValue, keyValue, maxDigits);

    // Preserve existing direction, or use current arrowDirection setting
    const directionMap: Record<number, 0 | 1 | 2 | 3 | 4> = {
      [-1]: 0, 0: 1, 1: 3, 2: 4, 3: 2,
    };
    const direction = existingClue?.direction ?? directionMap[toolSettings.arrowDirection] ?? 0;

    addDirectionalClue({
      cellId,
      cell: cellIndex,
      direction: direction as 0 | 1 | 2 | 3 | 4,
      value: parseInt(newValue, 10),
      layer: dataLayer,
      angle: existingClue?.angle,
      color: existingClue?.color || toolSettings.color,
    });
  }, [
    findCellIdByRowCol,
    grid.cols,
    activeLayer,
    puzzle,
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
    const cellId = findCellIdByRowCol(target.row, target.col) ?? `cell-${target.row}-${target.col}`;
    const cellIndex = target.row * grid.cols + target.col;
    const dataLayer = toDataLayer(activeLayer);

    // Find existing clue by cellId
    const existingEntry = Object.entries(puzzle[dataLayer].directionalClues || {}).find(
      ([, c]) => c.cellId === cellId
    );
    const existingId = existingEntry?.[0];
    const existingClue = existingEntry?.[1];

    if (isDelete) {
      if (existingId) {
        removeDirectionalClue(existingId);
      }
      return;
    }

    // Convert arrowDirection to Penpa direction
    const directionMap: Record<number, 0 | 1 | 2 | 3 | 4> = {
      [-1]: 0, 0: 1, 1: 3, 2: 4, 3: 2,
    };
    const direction = directionMap[toolSettings.arrowDirection] ?? 0;

    if (isSingleCharInput) {
      addDirectionalClue({
        cellId,
        cell: cellIndex,
        direction,
        value: existingClue?.value ?? 0,
        char: keyValue,
        layer: dataLayer,
        color: existingClue?.color || toolSettings.color,
      });
    } else {
      addDirectionalClue({
        cellId,
        cell: cellIndex,
        direction,
        value: parseInt(keyValue, 10),
        layer: dataLayer,
        color: existingClue?.color || toolSettings.color,
      });
    }
  }, [
    findCellIdByRowCol,
    grid.cols,
    activeLayer,
    puzzle,
    addDirectionalClue,
    removeDirectionalClue,
    toolSettings.arrowDirection,
    toolSettings.color,
  ]);

  const handleNormalNumber: NumberInputHandler = useCallback((
    target,
    value,
    isDelete,
    _isSingleCharInput
  ) => {
    const cellId = findCellIdByRowCol(target.row, target.col) ?? `cell-${target.row}-${target.col}`;
    const dataLayerForNumbers = toDataLayer(activeLayer);
    const numbers = puzzle[dataLayerForNumbers].numbers;
    const position = toolSettings.numberPosition;
    const cornerIndex = toolSettings.cornerIndex;
    const sideIndex = toolSettings.sideIndex;

    // Find existing number at this position
    const existingEntry = Object.entries(numbers).find(([, n]) => {
      if (n.cellId !== cellId) return false;
      if (position === 'center') {
        return n.position === 'center';
      } else if (position === 'corner') {
        return n.position === 'corner' && n.cornerIndex === cornerIndex;
      } else if (position === 'side') {
        return n.position === 'side' && n.sideIndex === sideIndex;
      } else if (position === 'candidates') {
        return n.position === 'candidates' && n.value === value;
      }
      return n.position === position;
    });
    const existingId = existingEntry?.[0];

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
          layer: toDataLayer(activeLayer),
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
        layer: toDataLayer(activeLayer),
      });
    }
  }, [
    findCellIdByRowCol,
    activeLayer,
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
      when: (ctx) => (ctx.isNumberTool || ctx.isConstraintNumberInput) && ctx.target !== null,
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

      const { isNumberTool, isConstraintNumberInput } = shouldHandleInput();
      if (!isNumberTool && !isConstraintNumberInput) return;

      const context: NumberKeyboardContext = {
        isNumberTool,
        isConstraintNumberInput,
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
