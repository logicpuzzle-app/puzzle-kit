/**
 * NumberInputPanel - Numeric keypad for entering numbers in cells
 *
 * Used in constraint mode when 'number' input mode is active.
 * Allows clicking on number buttons to input into the selected cell.
 * Supports multi-digit numbers by appending digits.
 *
 * Digit limit is based on puzzle type and grid size:
 * - Yajilin (direc mode): Based on max dimension / 2 (arrow counts cells in one direction)
 *   - max dimension <= 20: 1 digit
 *   - max dimension <= 200: 2 digits
 *   - max dimension <= 2000: 3 digits
 * - Other puzzles (nurikabe, etc.): Based on total cells
 *   - cells < 300: 2 digits
 *   - cells < 3000: 3 digits
 *   - cells >= 3000: 4 digits
 */

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../../store/puzzleStore';
import { toDataLayer } from '../../../types';

export const NumberInputPanel: React.FC = () => {
  const { t } = useTranslation();
  const {
    numberSelection,
    puzzle,
    activeLayer,
    addNumber,
    removeNumber,
    addDirectionalClue,
    removeDirectionalClue,
    toolSettings,
    grid,
    currentSchemaId,
    currentInputMode,
    useTopology,
    topology,
  } = usePuzzleStore();

  // Check if we're in directional number mode or constraint number mode
  // All constraint number modes (number, number-, direc) use directionalClues with direction=0 for no arrow
  const isDirectionalMode = toolSettings.currentTool === 'number-directional' ||
    currentInputMode === 'direc' ||
    currentInputMode === 'number' ||
    currentInputMode === 'number-';

  // Check if we're in regular number mode (for non-constraint number input)
  const isRegularNumberMode = toolSettings.currentTool.startsWith('number') &&
    toolSettings.currentTool !== 'number-directional' &&
    !isDirectionalMode;

  const dataLayer = toDataLayer(activeLayer);

  // Find the topology cell ID for merged cells (same logic as InputHandlerLayer keyboard handler)
  const findTopologyCellId = useCallback(
    (row: number, col: number): string | null => {
      if (!topology) return null;
      const targetCellId = `cell-${row}-${col}`;

      // First, check for direct match by row/col
      const candidates = Array.from(topology.cells.values()).filter(
        c => c.row === row && c.col === col
      );
      if (candidates.length > 0) {
        const hex = candidates.find(c => c.id.includes('hex'));
        return (hex ?? candidates[0]).id;
      }

      // If not found, check for merged cells that contain this cell
      for (const cell of topology.cells.values()) {
        if (cell.originalCells && cell.originalCells.includes(targetCellId)) {
          return cell.id;
        }
      }

      return null;
    },
    [topology]
  );

  // Calculate max digits based on puzzle type and grid size
  const getMaxDigits = (): number => {
    // For Yajilin arrow numbers (direc mode), use max dimension / 2
    // Arrow counts shaded cells in one direction, so max is about half the dimension
    if (currentSchemaId === 'yajilin' || currentInputMode === 'direc') {
      const maxDimension = Math.max(grid.rows, grid.cols);
      if (maxDimension <= 20) return 1;
      if (maxDimension <= 200) return 2;
      if (maxDimension <= 2000) return 3;
      return 4;
    }

    // For other puzzles (nurikabe island size, etc.), use total cells
    const totalCells = grid.rows * grid.cols;
    if (totalCells >= 3000) return 4;
    if (totalCells >= 300) return 3;
    return 2;
  };

  const maxDigits = getMaxDigits();

  // Get the effective cell ID (considering merged cells)
  // Uses the same logic as InputHandlerLayer keyboard handler
  const getEffectiveCellId = (): string | null => {
    if (!numberSelection) return null;

    // Use topology-aware cell ID for merged cells (same as keyboard input)
    if (useTopology) {
      return findTopologyCellId(numberSelection.row, numberSelection.col)
        ?? `cell-${numberSelection.row}-${numberSelection.col}`;
    }

    return `cell-${numberSelection.row}-${numberSelection.col}`;
  };

  const effectiveCellId = getEffectiveCellId();

  // Get cell index for directional clues
  const getCellIndex = (): number | null => {
    if (!numberSelection) return null;
    return numberSelection.row * grid.cols + numberSelection.col;
  };

  const cellIndex = getCellIndex();

  // Get current number value in selected cell (or merged cell group)
  const getCurrentValue = (): string | null => {
    if (isDirectionalMode) {
      // For directional mode, get value from directionalClues
      if (cellIndex === null) return null;
      const clues = puzzle[dataLayer].directionalClues || {};
      const existing = Object.values(clues).find((c) => c.cell === cellIndex);
      return existing?.value !== undefined ? String(existing.value) : null;
    }

    if (!effectiveCellId) return null;
    const numbers = puzzle[dataLayer].numbers;
    const position = toolSettings.numberPosition || 'center';
    const cornerIndex = toolSettings.cornerIndex ?? 0;
    const sideIndex = toolSettings.sideIndex ?? 0;

    // Find number matching position and index
    const existing = Object.values(numbers).find((n) => {
      if (n.cellId !== effectiveCellId) return false;
      if (position === 'center') {
        return n.position === 'center';
      } else if (position === 'corner') {
        return n.position === 'corner' && n.cornerIndex === cornerIndex;
      } else if (position === 'side') {
        return n.position === 'side' && n.sideIndex === sideIndex;
      }
      return n.position === position;
    });
    return existing?.value || null;
  };

  const currentValue = getCurrentValue();

  // Convert arrowDirection (-1=none, 0=up, 1=left, 2=right, 3=down) to Penpa direction (0=none, 1=up, 2=down, 3=left, 4=right)
  const directionMap: Record<number, number> = {
    [-1]: 0, // no direction
    0: 1, // up
    1: 3, // left
    2: 4, // right
    3: 2, // down
  };

  // Update number value in cell (or merged cell group)
  const updateNumberValue = (newValue: string) => {
    if (isDirectionalMode) {
      // For directional mode, use directionalClue
      if (cellIndex === null) return;

      // Remove existing directional clue
      const clues = puzzle[dataLayer].directionalClues || {};
      const existingEntry = Object.entries(clues).find(([, c]) => c.cell === cellIndex);
      if (existingEntry) {
        removeDirectionalClue(existingEntry[0]);
      }

      // Add new directional clue if value is not empty
      if (newValue) {
        // Use 0 for no direction (will display as centered number without arrow)
        const direction = directionMap[toolSettings.arrowDirection] ?? 0;
        addDirectionalClue({
          cell: cellIndex,
          direction: direction as 0 | 1 | 2 | 3 | 4,
          value: parseInt(newValue, 10),
          layer: dataLayer,
        });
      }
      return;
    }

    if (!effectiveCellId) return;

    const position = toolSettings.numberPosition || 'center';
    const cornerIndex = toolSettings.cornerIndex ?? 0;
    const sideIndex = toolSettings.sideIndex ?? 0;

    // Remove existing number at current position
    const numbers = puzzle[dataLayer].numbers;
    const existingEntry = Object.entries(numbers).find(([, n]) => {
      if (n.cellId !== effectiveCellId) return false;
      if (position === 'center') {
        return n.position === 'center';
      } else if (position === 'corner') {
        return n.position === 'corner' && n.cornerIndex === cornerIndex;
      } else if (position === 'side') {
        return n.position === 'side' && n.sideIndex === sideIndex;
      }
      return n.position === position;
    });

    if (existingEntry) {
      removeNumber(existingEntry[0]);
    }

    // Add new number if value is not empty
    if (newValue) {
      addNumber({
        cellId: effectiveCellId,
        value: newValue,
        size: toolSettings.numberSize || 'large',
        position,
        cornerIndex,
        sideIndex,
        color: toolSettings.color || '#000000',
        layer: dataLayer,
      });
    }
  };

  // Handle number button click - append digit to current value
  const handleNumberClick = (num: number) => {
    if (!numberSelection) return;

    // If current value is '?' or null, replace with the new digit
    if (currentValue === '?' || currentValue === null) {
      updateNumberValue(String(num));
    } else if (currentValue.length >= maxDigits) {
      // At max digits: clear and start with the new digit
      updateNumberValue(String(num));
    } else {
      // Append digit to existing value
      const newValue = currentValue + String(num);
      updateNumberValue(newValue);
    }
  };

  // Handle special button click (? replaces entire value)
  const handleSpecialClick = (value: string) => {
    if (!numberSelection) return;
    // Special characters like '?' are not valid for directional clues
    if (isDirectionalMode) return;
    updateNumberValue(value);
  };

  // Handle backspace - remove last digit
  const handleBackspace = () => {
    if (!numberSelection || !currentValue) return;

    if (currentValue.length <= 1) {
      // Remove entirely if only one character
      updateNumberValue('');
    } else {
      // Remove last digit
      updateNumberValue(currentValue.slice(0, -1));
    }
  };

  // Handle clear button - remove all
  const handleClear = () => {
    if (!numberSelection) return;
    updateNumberValue('');
  };

  const isDisabled = !numberSelection;

  return (
    <div className="space-y-1">
      {/* Current value display - compact */}
      {numberSelection && (
        <div className="text-center py-1 px-2 bg-gray-50 rounded-sm border border-gray-200">
          <span className="text-sm font-medium font-mono">
            {currentValue || '-'}
          </span>
        </div>
      )}

      {/* Number pad grid - tenkey layout, compact size */}
      <div className="grid grid-cols-3 gap-0.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            disabled={isDisabled}
            className={`w-full h-7 text-sm font-medium border rounded-sm transition-colors ${
              isDisabled
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-white border-office-border hover:bg-office-ribbon-hover active:bg-office-accent active:text-white'
            }`}
            onClick={() => handleNumberClick(num)}
          >
            {num}
          </button>
        ))}
      </div>

      {/* Bottom row: ?, 0, Backspace */}
      <div className="grid grid-cols-3 gap-0.5">
        <button
          disabled={isDisabled}
          className={`w-full h-7 text-sm font-medium border rounded-sm transition-colors ${
            currentValue === '?'
              ? 'bg-office-accent text-white border-office-accent'
              : isDisabled
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : 'bg-white border-office-border hover:bg-office-ribbon-hover'
          }`}
          onClick={() => handleSpecialClick('?')}
          title={t('tool.number.unknown', 'Unknown')}
        >
          ?
        </button>
        <button
          disabled={isDisabled}
          className={`w-full h-7 text-sm font-medium border rounded-sm transition-colors ${
            isDisabled
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : 'bg-white border-office-border hover:bg-office-ribbon-hover active:bg-office-accent active:text-white'
          }`}
          onClick={() => handleNumberClick(0)}
        >
          0
        </button>
        <button
          disabled={isDisabled}
          className={`w-full h-7 text-sm font-medium border rounded-sm transition-colors ${
            isDisabled
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
          }`}
          onClick={handleBackspace}
          title={t('action.backspace', 'Backspace')}
        >
          ←
        </button>
      </div>

      {/* Clear button - compact */}
      <button
        disabled={isDisabled}
        className={`w-full h-6 text-xs font-medium border rounded-sm transition-colors ${
          isDisabled
            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
            : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
        }`}
        onClick={handleClear}
        title={t('action.clear', 'Clear')}
      >
        {t('action.clear', 'Clear')}
      </button>
    </div>
  );
};
