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

import { useEffect, useCallback, useMemo, useRef } from 'react';
import { usePuzzleStore } from '../store/puzzleStoreContext';
import { useCellFinder } from './useCellFinder';
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
  getArrowDirection,
  calculateNextPosition,
  appendDigit,
  removeLastChar,
  type KeyboardShortcut,
  executeMatchingShortcut,
} from './keyboardUtils';
import { getNumberInputFlags, getNumberMaxDigits } from './numberKeyboardContext';
import {
  ROMAJI_N_CONFIRM_DELAY,
  handleRomajiInput,
  handleRomajiDelete,
  isHiraganaChar,
  isKatakanaChar,
  normalizeKanaFromKatakana,
  normalizeKanaInput,
} from '../utils/romaji';

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
  panelMode: 'number' | 'alphabet' | 'hiragana' | 'custom';
  isUpperCase: boolean;
  kanaMode: 'hiragana' | 'katakana';
  wordDirection: 'horizontal' | 'vertical';
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
  const isPaintSchema = currentSchemaId === 'paint';
  const panelMode = toolSettings.numberInputMode ?? 'number';
  const isUpperCase = toolSettings.numberInputCase !== 'lower';
  const kanaMode = toolSettings.numberInputKana === 'katakana' ? 'katakana' : 'hiragana';
  const wordDirection = toolSettings.numberWordDirection ?? 'horizontal';

  const { findCellIdByRowCol } = useCellFinder();

  const editableLayer = getEditableDataLayer(activeLayer, isPlayerMode);

  const romajiBufferRef = useRef('');
  const romajiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const romajiTargetRef = useRef<{ row: number; col: number } | null>(null);
  const romajiContextRef = useRef<NumberKeyboardContext | null>(null);

  // Check if constraint mode number input is active

  // ============================================================================
  // Input Mode Detection
  // ============================================================================

  const shouldHandleInput = useCallback((): {
    isNumberTool: boolean;
    isConstraintNumberInput: boolean;
    allowNonNumeric: boolean;
  } => {
    return getNumberInputFlags({
      editableLayer,
      currentInputMode,
      currentSchemaId,
      showConstraintLayer,
      tool: toolSettings.currentTool,
      isPaintSchema,
    });
  }, [currentInputMode, currentSchemaId, editableLayer, showConstraintLayer, toolSettings.currentTool, isPaintSchema]);

  // ============================================================================
  // Max Digits Calculation
  // ============================================================================

  const getMaxDigits = useCallback((): number => {
    return getNumberMaxDigits({
      gridRows: grid.rows,
      gridCols: grid.cols,
      editableLayer,
      currentInputMode,
      currentSchemaId,
    });
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
          color: isPaintSchema ? toolSettings.color : existingNumber?.color || toolSettings.color,
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
        color: isPaintSchema ? toolSettings.color : existingNumber?.color || toolSettings.color,
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
      color: isPaintSchema ? toolSettings.color : existingNumber?.color || toolSettings.color,
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
    isPaintSchema,
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
        color: isPaintSchema ? toolSettings.color : existingNumber?.color || toolSettings.color,
      });
    } else {
      addDirectionalClue({
        cellId,
        cell: cellIndex,
        direction,
        value: parseInt(keyValue, 10),
        layer: dataLayer,
        color: isPaintSchema ? toolSettings.color : existingNumber?.color || toolSettings.color,
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
    isPaintSchema,
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

  const applyNumberInput = useCallback((
    target: { row: number; col: number },
    value: string,
    options: { isDelete: boolean; isSingleCharInput: boolean },
    context: NumberKeyboardContext
  ) => {
    if (context.isConstraintNumberInput) {
      handleConstraintNumber(target, value, options.isDelete, options.isSingleCharInput);
    } else if (toolSettings.currentTool === 'number-directional') {
      handleDirectionalNumber(target, value, options.isDelete, options.isSingleCharInput);
    } else if (context.isNumberTool) {
      handleNormalNumber(target, value, options.isDelete, options.isSingleCharInput);
    }
  }, [handleConstraintNumber, handleDirectionalNumber, handleNormalNumber, toolSettings.currentTool]);

  const applyTextInput = useCallback((
    target: { row: number; col: number },
    value: string,
    context: NumberKeyboardContext
  ) => {
    applyNumberInput(target, value, { isDelete: false, isSingleCharInput: true }, context);
  }, [applyNumberInput]);

  const clearRomajiTimer = useCallback(() => {
    if (romajiTimerRef.current) {
      clearTimeout(romajiTimerRef.current);
      romajiTimerRef.current = null;
    }
  }, []);

  const flushRomajiBuffer = useCallback((
    target: { row: number; col: number } | null,
    context: NumberKeyboardContext,
    commitN: boolean
  ) => {
    clearRomajiTimer();
    if (!target) {
      romajiBufferRef.current = '';
      return;
    }
    if (commitN && romajiBufferRef.current === 'n') {
      const output = normalizeKanaFromKatakana('ン', context.kanaMode);
      applyTextInput(target, output, context);
    }
    romajiBufferRef.current = '';
  }, [applyTextInput, clearRomajiTimer]);

  const moveWordCursor = useCallback((
    target: { row: number; col: number },
    context: NumberKeyboardContext,
    step: 1 | -1
  ) => {
    if (context.panelMode === 'number') return;
    const delta = context.wordDirection === 'vertical' ? { dr: step, dc: 0 } : { dr: 0, dc: step };
    const next = calculateNextPosition(target, delta, context.gridRows, context.gridCols);
    if (next.row !== target.row || next.col !== target.col) {
      setNumberSelection(next);
    }
  }, [setNumberSelection]);

  const advanceWordCursor = useCallback((
    target: { row: number; col: number },
    context: NumberKeyboardContext
  ) => {
    moveWordCursor(target, context, 1);
  }, [moveWordCursor]);

  const retreatWordCursor = useCallback((
    target: { row: number; col: number },
    context: NumberKeyboardContext
  ) => {
    moveWordCursor(target, context, -1);
  }, [moveWordCursor]);

  const startRomajiConfirmTimer = useCallback((
    target: { row: number; col: number },
    context: NumberKeyboardContext
  ) => {
    clearRomajiTimer();
    romajiTargetRef.current = target;
    romajiContextRef.current = context;
    romajiTimerRef.current = setTimeout(() => {
      const currentTarget = romajiTargetRef.current;
      const currentContext = romajiContextRef.current;
      if (!currentTarget || !currentContext) return;
      const output = normalizeKanaFromKatakana('ン', currentContext.kanaMode);
      applyTextInput(currentTarget, output, currentContext);
      advanceWordCursor(currentTarget, currentContext);
      romajiBufferRef.current = '';
      romajiTimerRef.current = null;
    }, ROMAJI_N_CONFIRM_DELAY);
  }, [advanceWordCursor, applyTextInput, clearRomajiTimer]);

  const handleRomajiKeyInput = useCallback((
    target: { row: number; col: number },
    keyValue: string,
    context: NumberKeyboardContext
  ) => {
    clearRomajiTimer();
    const result = handleRomajiInput(romajiBufferRef.current, keyValue);
    romajiBufferRef.current = result.buffer;
    if (result.output) {
      const normalized = normalizeKanaFromKatakana(result.output, context.kanaMode);
      applyTextInput(target, normalized, context);
      advanceWordCursor(target, context);
    }
    if (result.startNConfirm) {
      startRomajiConfirmTimer(target, context);
    }
  }, [advanceWordCursor, applyTextInput, clearRomajiTimer, startRomajiConfirmTimer]);

  const handleRomajiDeleteInput = useCallback((
    target: { row: number; col: number },
    context: NumberKeyboardContext
  ): boolean => {
    clearRomajiTimer();
    const result = handleRomajiDelete(romajiBufferRef.current);
    if (!result.handled) return false;
    romajiBufferRef.current = result.buffer;
    if (result.startNConfirm) {
      startRomajiConfirmTimer(target, context);
    }
    return true;
  }, [clearRomajiTimer, startRomajiConfirmTimer]);

  const handleDirectKanaInput = useCallback((
    target: { row: number; col: number },
    keyValue: string,
    context: NumberKeyboardContext
  ) => {
    clearRomajiTimer();
    romajiBufferRef.current = '';
    const normalized = normalizeKanaInput(keyValue, context.kanaMode);
    applyTextInput(target, normalized, context);
    advanceWordCursor(target, context);
  }, [advanceWordCursor, applyTextInput, clearRomajiTimer]);

  const handleDeleteInput = useCallback((
    target: { row: number; col: number },
    context: NumberKeyboardContext
  ) => {
    if (context.panelMode === 'hiragana' && handleRomajiDeleteInput(target, context)) {
      return;
    }
    applyNumberInput(target, '', { isDelete: true, isSingleCharInput: false }, context);
    retreatWordCursor(target, context);
  }, [applyNumberInput, handleRomajiDeleteInput, retreatWordCursor]);

  const clearRomajiState = useCallback(() => {
    clearRomajiTimer();
    romajiBufferRef.current = '';
  }, [clearRomajiTimer]);

  useEffect(() => {
    if (panelMode !== 'hiragana') {
      clearRomajiState();
    }
  }, [panelMode, clearRomajiState]);

  useEffect(() => {
    if (panelMode === 'number') return;
    if (numberSelection) return;
    if (grid.rows < 1 || grid.cols < 1) return;
    setNumberSelection({ row: 0, col: 0 });
  }, [grid.cols, grid.rows, numberSelection, panelMode, setNumberSelection]);

  useEffect(() => {
    if (!numberSelection) {
      clearRomajiState();
      return;
    }
    if (romajiBufferRef.current) {
      clearRomajiState();
    }
  }, [numberSelection?.row, numberSelection?.col, clearRomajiState]);

  useEffect(() => {
    clearRomajiState();
  }, [kanaMode, clearRomajiState]);

  useEffect(() => {
    return () => clearRomajiTimer();
  }, [clearRomajiTimer]);

  // ============================================================================
  // Shortcut Definitions
  // ============================================================================

  const shortcuts = useMemo((): KeyboardShortcut<NumberKeyboardContext>[] => [
    // Arrow key navigation
    {
      keys: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
      preventDefault: true,
      when: (ctx) => ctx.isNumberTool || ctx.isConstraintNumberInput,
      run: (ctx, _key) => {
        const direction = getArrowDirection(_key);
        if (!direction) return;

        if (ctx.panelMode === 'hiragana' && ctx.target) {
          flushRomajiBuffer(ctx.target, ctx, true);
        }

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
        handleDeleteInput(ctx.target, ctx);
      },
    },
    // Digit input (0-9)
    {
      keys: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
      preventDefault: true,
      when: (ctx) =>
        (ctx.isNumberTool || ctx.isConstraintNumberInput) &&
        ctx.panelMode === 'number' &&
        ctx.target !== null,
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
      when: (ctx) =>
        ctx.allowNonNumeric &&
        (ctx.isNumberTool || ctx.isConstraintNumberInput) &&
        ctx.target !== null &&
        (ctx.panelMode === 'alphabet' || ctx.panelMode === 'hiragana'),
      run: (ctx, key) => {
        if (!ctx.target) return;
        if (ctx.panelMode === 'hiragana') {
          handleRomajiKeyInput(ctx.target, key, ctx);
          return;
        }

        const letter = ctx.isUpperCase ? key.toUpperCase() : key.toLowerCase();
        applyTextInput(ctx.target, letter, ctx);
        advanceWordCursor(ctx.target, ctx);
      },
    },
    // Romaji special input for long vowel (ー)
    {
      keys: ['-'],
      preventDefault: true,
      when: (ctx) =>
        ctx.allowNonNumeric &&
        (ctx.isNumberTool || ctx.isConstraintNumberInput) &&
        ctx.panelMode === 'hiragana' &&
        ctx.target !== null,
      run: (ctx, key) => {
        if (!ctx.target) return;
        handleRomajiKeyInput(ctx.target, key, ctx);
      },
    },
  ], [
    numberSelection,
    setNumberSelection,
    toolSettings.currentTool,
    handleConstraintNumber,
    handleDirectionalNumber,
    handleNormalNumber,
    handleDeleteInput,
    handleRomajiKeyInput,
    applyTextInput,
    flushRomajiBuffer,
    advanceWordCursor,
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
        panelMode,
        isUpperCase,
        kanaMode,
        wordDirection,
      };

      if (
        context.allowNonNumeric &&
        context.panelMode === 'hiragana' &&
        context.target &&
        (isHiraganaChar(e.key) || isKatakanaChar(e.key))
      ) {
        e.preventDefault();
        handleDirectKanaInput(context.target, e.key, context);
        return;
      }

      executeMatchingShortcut(shortcuts, e, context);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts, shouldHandleInput, numberSelection, grid.rows, grid.cols, panelMode, isUpperCase, kanaMode, wordDirection, handleDirectKanaInput]);
}
