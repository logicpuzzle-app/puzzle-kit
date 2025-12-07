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

import { useEffect } from 'react';
import { usePuzzleStore } from '../store/puzzleStore';
import { useCellFinder } from './useCellFinder';
import { toDataLayer } from '../types';
import { constraintCatalog } from '../constraints';
import { getAutoModeConfig } from '../constraints/inputModeMapping';

/**
 * Hook for handling keyboard input for number tools
 */
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tool = toolSettings.currentTool;

      // Check if we should handle keyboard input
      // 1. Number tool is active (number-normal, number-directional, etc.)
      // 2. Constraint mode with number/direc/auto-number/auto-direc input
      const isNumberTool = tool.startsWith('number');

      let isConstraintNumberInput = false;
      if (isConstraintEnabled) {
        const isNumberInputMode = currentInputMode === 'number' || currentInputMode === 'number-';
        const isDirecInputMode = currentInputMode === 'direc';

        // Check auto mode type
        const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;
        const isEditMode = activeLayer === 'problem';
        const autoConfig = getAutoModeConfig(currentSchema, isEditMode);
        const isAutoNumberMode = currentInputMode === 'auto' && autoConfig.type === 'number';
        const isAutoDirecMode = currentInputMode === 'auto' && autoConfig.type === 'direc';
        const isAutoBorderNumberMode = currentInputMode === 'auto' && autoConfig.type === 'border-number';

        isConstraintNumberInput = isNumberInputMode || isDirecInputMode || isAutoNumberMode || isAutoDirecMode || isAutoBorderNumberMode;
      }

      if (!isNumberTool && !isConstraintNumberInput) return;

      // Skip if focus is on input elements
      if ((e.target as HTMLElement)?.tagName) {
        const tag = (e.target as HTMLElement).tagName;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      }

      // Handle arrow keys for cursor movement
      const isArrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);
      if (isArrowKey) {
        e.preventDefault();
        const current = numberSelection || { row: 0, col: 0 };
        let newRow = current.row;
        let newCol = current.col;

        switch (e.key) {
          case 'ArrowUp':
            newRow = Math.max(0, current.row - 1);
            break;
          case 'ArrowDown':
            newRow = Math.min(grid.rows - 1, current.row + 1);
            break;
          case 'ArrowLeft':
            newCol = Math.max(0, current.col - 1);
            break;
          case 'ArrowRight':
            newCol = Math.min(grid.cols - 1, current.col + 1);
            break;
        }

        if (newRow !== current.row || newCol !== current.col) {
          setNumberSelection({ row: newRow, col: newCol });
        }
        return;
      }

      const target = numberSelection;
      if (!target) return;

      const value = e.key;
      const isDigit = /^[0-9]$/.test(value);
      const isDelete = e.key === 'Backspace' || e.key === 'Delete';
      if (!isDigit && !isDelete) return;
      e.preventDefault();

      // Handle constraint mode number input (uses directionalClues for unified storage)
      if (isConstraintNumberInput) {
        handleConstraintNumber(target, value, isDelete);
        return;
      }

      // Handle directional number tool (non-constraint mode)
      if (tool === 'number-directional') {
        handleDirectionalNumber(target, value, isDelete);
        return;
      }

      // Handle normal number tools
      handleNormalNumber(target, value, isDelete);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    numberSelection,
    setNumberSelection,
    toolSettings.currentTool,
    toolSettings.numberSize,
    toolSettings.numberPosition,
    toolSettings.cornerIndex,
    toolSettings.sideIndex,
    toolSettings.arrowDirection,
    toolSettings.color,
    puzzle,
    activeLayer,
    grid.rows,
    grid.cols,
    addNumber,
    removeNumber,
    updateNumber,
    addDirectionalClue,
    removeDirectionalClue,
    findCellIdByRowCol,
    isConstraintEnabled,
    currentInputMode,
    currentSchemaId,
  ]);

  /**
   * Calculate max digits based on puzzle type and grid size
   */
   function getMaxDigits(): number {
    // Check if direc mode
    const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;
    const isEditMode = activeLayer === 'problem';
    const autoConfig = getAutoModeConfig(currentSchema, isEditMode);
    const isDirecType = currentInputMode === 'direc' ||
      (currentInputMode === 'auto' && autoConfig.type === 'direc');

    if (isDirecType) {
      // Yajilin arrow numbers: max is about half the dimension
      const maxDimension = Math.max(grid.rows, grid.cols);
      if (maxDimension <= 20) return 1;
      if (maxDimension <= 200) return 2;
      return 3;
    }

    // Other puzzles: based on total cells
    const totalCells = grid.rows * grid.cols;
    if (totalCells >= 3000) return 4;
    if (totalCells >= 300) return 3;
    return 2;
  }

  /**
   * Handle constraint mode number input (multi-digit, uses directionalClues)
   * Used for: number, number-, direc, auto-number, auto-direc modes
   */
  function handleConstraintNumber(
    target: { row: number; col: number },
    value: string,
    isDelete: boolean
  ) {
    const cellIndex = target.row * grid.cols + target.col;
    const dataLayer = toDataLayer(activeLayer);
    const existingEntry = Object.entries(puzzle[dataLayer].directionalClues || {}).find(
      ([, c]) => c.cell === cellIndex
    );
    const existingClue = existingEntry?.[1];
    const existingId = existingEntry?.[0];
    const currentValue = existingClue?.value !== undefined ? String(existingClue.value) : null;

    // Delete/Backspace handling
    if (isDelete) {
      if (!currentValue || currentValue.length <= 1) {
        // Remove entirely
        if (existingId) {
          removeDirectionalClue(existingId);
        }
      } else {
        // Remove last digit
        const newValue = currentValue.slice(0, -1);
        const direction = existingClue?.direction ?? 0;
        addDirectionalClue({
          cell: cellIndex,
          direction: direction as 0 | 1 | 2 | 3 | 4,
          value: parseInt(newValue, 10),
          layer: dataLayer,
        });
      }
      return;
    }

    // Digit input - append to existing value
    const maxDigits = getMaxDigits();
    let newValue: string;

    if (!currentValue) {
      newValue = value;
    } else if (currentValue.length >= maxDigits) {
      // At max digits: replace with new digit
      newValue = value;
    } else {
      // Append digit
      newValue = currentValue + value;
    }

    // Preserve existing direction, or use current arrowDirection setting
    const directionMap: Record<number, 0 | 1 | 2 | 3 | 4> = {
      [-1]: 0, 0: 1, 1: 3, 2: 4, 3: 2,
    };
    const direction = existingClue?.direction ?? directionMap[toolSettings.arrowDirection] ?? 0;

    addDirectionalClue({
      cell: cellIndex,
      direction: direction as 0 | 1 | 2 | 3 | 4,
      value: parseInt(newValue, 10),
      layer: dataLayer,
    });
  }

  /**
   * Handle directional number input (Yajilin-style) - non-constraint mode
   */
  function handleDirectionalNumber(
    target: { row: number; col: number },
    value: string,
    isDelete: boolean
  ) {
    const cellIndex = target.row * grid.cols + target.col;
    const dataLayer = toDataLayer(activeLayer);
    const existingEntry = Object.entries(puzzle[dataLayer].directionalClues || {}).find(
      ([, c]) => c.cell === cellIndex
    );
    const existingId = existingEntry?.[0];

    if (isDelete) {
      if (existingId) {
        removeDirectionalClue(existingId);
      }
      return;
    }

    // Convert arrowDirection (-1=none, 0=up, 1=left, 2=right, 3=down) to Penpa direction (0=none, 1=up, 2=down, 3=left, 4=right)
    const directionMap: Record<number, 0 | 1 | 2 | 3 | 4> = {
      [-1]: 0, // no direction
      0: 1, // up
      1: 3, // left
      2: 4, // right
      3: 2, // down
    };
    const direction = directionMap[toolSettings.arrowDirection] ?? 0;

    addDirectionalClue({
      cell: cellIndex,
      direction,
      value: parseInt(value, 10),
      layer: toDataLayer(activeLayer),
    });
  }

  /**
   * Handle normal number input (center, corner, side, candidates)
   */
  function handleNormalNumber(
    target: { row: number; col: number },
    value: string,
    isDelete: boolean
  ) {
    // Use unified cell finder for merged cells
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
  }
}
