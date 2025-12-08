/**
 * NumberInputPanel - Numeric/Alphabet keypad for entering numbers or letters in cells
 *
 * Used in constraint mode when 'number' input mode is active.
 * Allows clicking on number/letter buttons to input into the selected cell.
 * Supports multi-digit numbers by appending digits.
 * Supports alphabet input (A-Z) with toggle between number and alphabet mode.
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

import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../../store/puzzleStore';
import { toDataLayer } from '../../../types';

// Input mode type: number, alphabet, hiragana, or custom
type InputPanelMode = 'number' | 'alphabet' | 'hiragana' | 'custom';

export const NumberInputPanel: React.FC = () => {
  const { t } = useTranslation();
  const [panelMode, setPanelMode] = useState<InputPanelMode>('number');
  const [isUpperCase, setIsUpperCase] = useState(true);
  const [isKatakana, setIsKatakana] = useState(false);
  const [customInput, setCustomInput] = useState('');
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

  // Check if value is a number (for directional clues which only support numbers)
  const isNumericValue = (value: string): boolean => {
    return /^\d+$/.test(value);
  };

  // Update number value in cell (or merged cell group)
  const updateNumberValue = (newValue: string) => {
    // For directional mode, use directionalClue only if value is numeric
    // Alphabets and special characters are not supported in directional clues
    const useDirectionalClue = isDirectionalMode && (newValue === '' || isNumericValue(newValue));

    if (useDirectionalClue) {
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
          cellId: effectiveCellId || `cell-${numberSelection!.row}-${numberSelection!.col}`,
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

  // Handle alphabet button click - replaces entire value with the letter
  const handleAlphabetClick = (letter: string) => {
    if (!numberSelection) return;
    // Alphabet is not valid for directional clues (direc mode)
    if (currentInputMode === 'direc') return;
    // Apply case transformation
    const finalLetter = isUpperCase ? letter.toUpperCase() : letter.toLowerCase();
    updateNumberValue(finalLetter);
  };

  // Convert hiragana to katakana
  const toKatakana = (char: string): string => {
    return char.replace(/[\u3041-\u3096]/g, (match) =>
      String.fromCharCode(match.charCodeAt(0) + 0x60)
    );
  };

  // Handle hiragana/katakana button click - replaces entire value with the character
  const handleHiraganaClick = (char: string) => {
    if (!numberSelection) return;
    if (currentInputMode === 'direc') return;
    const finalChar = isKatakana ? toKatakana(char) : char;
    updateNumberValue(finalChar);
  };

  // Handle custom input submission
  const handleCustomSubmit = () => {
    if (!numberSelection || !customInput) return;
    if (currentInputMode === 'direc' && !isNumericValue(customInput)) return;
    updateNumberValue(customInput);
    setCustomInput('');
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

  // Alphabet rows for the keyboard layout
  const alphabetRows = [
    ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    ['H', 'I', 'J', 'K', 'L', 'M', 'N'],
    ['O', 'P', 'Q', 'R', 'S', 'T', 'U'],
    ['V', 'W', 'X', 'Y', 'Z'],
  ];

  // Hiragana rows (あ行〜わ行)
  const hiraganaRows = [
    ['あ', 'い', 'う', 'え', 'お'],
    ['か', 'き', 'く', 'け', 'こ'],
    ['さ', 'し', 'す', 'せ', 'そ'],
    ['た', 'ち', 'つ', 'て', 'と'],
    ['な', 'に', 'ぬ', 'ね', 'の'],
    ['は', 'ひ', 'ふ', 'へ', 'ほ'],
    ['ま', 'み', 'む', 'め', 'も'],
    ['や', 'ゆ', 'よ'],
    ['ら', 'り', 'る', 'れ', 'ろ'],
    ['わ', 'を', 'ん'],
  ];

  // Check if non-numeric modes are disabled (for directional clues)
  const isNonNumericDisabled = currentInputMode === 'direc';

  return (
    <div className="space-y-1">
      {/* Mode toggle tabs - 2 rows */}
      <div className="flex gap-0.5">
        <button
          className={`flex-1 h-6 text-xs font-medium border rounded-sm transition-colors ${
            panelMode === 'number'
              ? 'bg-office-accent text-white border-office-accent'
              : 'bg-white border-office-border hover:bg-office-ribbon-hover'
          }`}
          onClick={() => setPanelMode('number')}
        >
          123
        </button>
        <button
          className={`flex-1 h-6 text-xs font-medium border rounded-sm transition-colors ${
            isNonNumericDisabled
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : panelMode === 'alphabet'
                ? 'bg-office-accent text-white border-office-accent'
                : 'bg-white border-office-border hover:bg-office-ribbon-hover'
          }`}
          onClick={() => !isNonNumericDisabled && setPanelMode('alphabet')}
          disabled={isNonNumericDisabled}
        >
          ABC
        </button>
        <button
          className={`flex-1 h-6 text-xs font-medium border rounded-sm transition-colors ${
            isNonNumericDisabled
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : panelMode === 'hiragana'
                ? 'bg-office-accent text-white border-office-accent'
                : 'bg-white border-office-border hover:bg-office-ribbon-hover'
          }`}
          onClick={() => !isNonNumericDisabled && setPanelMode('hiragana')}
          disabled={isNonNumericDisabled}
        >
          あ
        </button>
        <button
          className={`flex-1 h-6 text-xs font-medium border rounded-sm transition-colors ${
            panelMode === 'custom'
              ? 'bg-office-accent text-white border-office-accent'
              : 'bg-white border-office-border hover:bg-office-ribbon-hover'
          }`}
          onClick={() => setPanelMode('custom')}
        >
          ...
        </button>
      </div>

      {panelMode === 'number' ? (
        <>
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
        </>
      ) : panelMode === 'alphabet' ? (
        <>
          {/* Alphabet pad grid */}
          {alphabetRows.map((row, rowIndex) => (
            <div key={rowIndex} className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${row.length}, 1fr)` }}>
              {row.map((letter) => {
                const displayLetter = isUpperCase ? letter : letter.toLowerCase();
                return (
                  <button
                    key={letter}
                    disabled={isDisabled}
                    className={`w-full h-7 text-sm font-medium border rounded-sm transition-colors ${
                      currentValue === displayLetter
                        ? 'bg-office-accent text-white border-office-accent'
                        : isDisabled
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white border-office-border hover:bg-office-ribbon-hover active:bg-office-accent active:text-white'
                    }`}
                    onClick={() => handleAlphabetClick(letter)}
                  >
                    {displayLetter}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Shift, Backspace and ? buttons */}
          <div className="grid grid-cols-3 gap-0.5">
            <button
              className={`w-full h-7 text-sm font-medium border rounded-sm transition-colors ${
                isUpperCase
                  ? 'bg-office-accent text-white border-office-accent'
                  : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => setIsUpperCase(!isUpperCase)}
              title={isUpperCase ? 'Uppercase' : 'Lowercase'}
            >
              ⇧
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
          </div>
        </>
      ) : panelMode === 'hiragana' ? (
        <>
          {/* Hiragana/Katakana pad grid - scrollable */}
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {hiraganaRows.map((row, rowIndex) => (
              <div key={rowIndex} className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(5, 1fr)` }}>
                {row.map((char) => {
                  const displayChar = isKatakana ? toKatakana(char) : char;
                  return (
                    <button
                      key={char}
                      disabled={isDisabled}
                      className={`w-full h-7 text-sm font-medium border rounded-sm transition-colors ${
                        currentValue === displayChar
                          ? 'bg-office-accent text-white border-office-accent'
                          : isDisabled
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'bg-white border-office-border hover:bg-office-ribbon-hover active:bg-office-accent active:text-white'
                      }`}
                      onClick={() => handleHiraganaClick(char)}
                    >
                      {displayChar}
                    </button>
                  );
                })}
                {/* Fill empty cells for rows with less than 5 characters */}
                {row.length < 5 && Array.from({ length: 5 - row.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="w-full h-7" />
                ))}
              </div>
            ))}
          </div>

          {/* Hiragana/Katakana toggle, Backspace and ? buttons */}
          <div className="grid grid-cols-3 gap-0.5">
            <button
              className={`w-full h-7 text-sm font-medium border rounded-sm transition-colors ${
                isKatakana
                  ? 'bg-office-accent text-white border-office-accent'
                  : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => setIsKatakana(!isKatakana)}
              title={isKatakana ? 'Katakana' : 'Hiragana'}
            >
              {isKatakana ? 'ア' : 'あ'}
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
          </div>
        </>
      ) : (
        <>
          {/* Custom input mode */}
          <div className="space-y-1">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCustomSubmit();
                }
              }}
              placeholder={t('tool.number.customPlaceholder', 'Enter text...')}
              className="w-full h-8 px-2 text-sm border border-office-border rounded-sm focus:outline-none focus:border-office-accent"
              disabled={isDisabled}
            />
            <button
              disabled={isDisabled || !customInput}
              className={`w-full h-7 text-sm font-medium border rounded-sm transition-colors ${
                isDisabled || !customInput
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-office-accent text-white border-office-accent hover:bg-blue-600'
              }`}
              onClick={handleCustomSubmit}
            >
              {t('action.apply', 'Apply')}
            </button>
          </div>

          {/* Backspace and ? buttons */}
          <div className="grid grid-cols-2 gap-0.5">
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
          </div>
        </>
      )}

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
