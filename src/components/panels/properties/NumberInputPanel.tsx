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

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../../store/puzzleStoreContext';
import { constraintCatalog } from '../../../constraints/ConstraintCatalog';
import { getAutoModeConfig } from '../../../constraints/inputModeMapping';
import { toDataLayer } from '../../../types';
import { getEditableDataLayer } from '../../../utils/editPolicy';
import { toPenpaDirection } from '../../../utils/directionalClue';
import { appendDigit, getMaxDigitsForGrid } from '../../../hooks/keyboardUtils';
import { useCellFinder } from '../../../hooks/useCellFinder';
import {
  findDirectionalNumberByCellId,
  findNumberEntry,
  isNumericString,
  limitNumericString,
} from '../../../utils/numberEntries';

// Input mode type: number, alphabet, hiragana, or custom
type InputPanelMode = 'number' | 'alphabet' | 'hiragana' | 'custom';

type NumberInputPanelProps = {
  onLayoutChange?: (height: number) => void;
};

export const NumberInputPanel: React.FC<NumberInputPanelProps> = ({ onLayoutChange }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const [panelMode, setPanelMode] = useState<InputPanelMode>('number');
  const [isUpperCase, setIsUpperCase] = useState(true);
  const [isKatakana, setIsKatakana] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const {
    numberSelection,
    puzzle,
    activeLayer,
    isPlayerMode,
    addNumber,
    removeNumber,
    addDirectionalClue,
    toolSettings,
    grid,
    currentSchemaId,
    currentInputMode,
    showConstraintLayer,
  } = usePuzzleStore();
  const { findCellIdByRowCol } = useCellFinder();

  const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;
  const isConstraintEnabled = showConstraintLayer && currentSchemaId !== null;
  const editableLayer = getEditableDataLayer(activeLayer, isPlayerMode);
  const effectiveLayer = editableLayer ?? activeLayer;
  const isEditMode = editableLayer === 'problem';
  const autoConfig = getAutoModeConfig(currentSchema, isEditMode);
  const isAutoNumberMode = currentInputMode === 'auto' &&
    (autoConfig.type === 'number' || autoConfig.type === 'direc' || autoConfig.type === 'border-number');
  const isConstraintNumberInput = Boolean(editableLayer) && isConstraintEnabled && (
    currentInputMode === 'direc' ||
    currentInputMode === 'number' ||
    currentInputMode === 'number-' ||
    isAutoNumberMode
  );

  // Directional clue rendering for constraint number input (align with keyboard input)
  const isDirectionalMode = toolSettings.currentTool === 'number-directional' || isConstraintNumberInput;

  // Check if we're in regular number mode (for non-constraint number input)
  const isRegularNumberMode = toolSettings.currentTool.startsWith('number') &&
    toolSettings.currentTool !== 'number-directional' &&
    !isDirectionalMode;

  const dataLayer = editableLayer ?? toDataLayer(effectiveLayer);

  const isDirecType = currentInputMode === 'direc' ||
    (currentInputMode === 'auto' && autoConfig.type === 'direc');
  const maxDigits = getMaxDigitsForGrid(grid.rows, grid.cols, isDirecType);

  // Get the effective cell ID (considering merged cells)
  // Uses the same logic as InputHandlerLayer keyboard handler
  const getEffectiveCellId = (): string | null => {
    if (!numberSelection) return null;

    return findCellIdByRowCol(numberSelection.row, numberSelection.col)
      ?? `cell-${numberSelection.row}-${numberSelection.col}`;
  };

  const effectiveCellId = getEffectiveCellId();

  // Get cell index for directional numbers
  const getCellIndex = (): number | null => {
    if (!numberSelection) return null;
    return numberSelection.row * grid.cols + numberSelection.col;
  };

  const cellIndex = getCellIndex();

  // Get current number value in selected cell (or merged cell group)
  const getCurrentValue = (): string | null => {
    if (isDirectionalMode) {
      if (!effectiveCellId) return null;
      const existingNumber = findDirectionalNumberByCellId(puzzle[dataLayer].numbers, effectiveCellId);
      return existingNumber?.number.value ?? null;
    }

    if (!effectiveCellId) return null;
    const position = toolSettings.numberPosition || 'center';
    const cornerIndex = toolSettings.cornerIndex ?? 0;
    const sideIndex = toolSettings.sideIndex ?? 0;

    // Find number matching position and index
    const existing = findNumberEntry(puzzle[dataLayer].numbers, effectiveCellId, position, {
      cornerIndex,
      sideIndex,
    });
    return existing?.number.value || null;
  };

  const currentValue = getCurrentValue();

  // Update number value in cell (or merged cell group)
  const updateNumberValue = (newValue: string) => {
    if (!editableLayer) return;
    // For directional mode, use directional number only if value is numeric
    // Alphabets and special characters are not supported in directional numbers
    const useDirectionalClue = isDirectionalMode && (newValue === '' || isNumericString(newValue));

    if (useDirectionalClue) {
      // For directional mode, use directionalClue
      if (cellIndex === null) return;

      // Remove existing directional number
      const existingNumberEntry = effectiveCellId
        ? findDirectionalNumberByCellId(puzzle[dataLayer].numbers, effectiveCellId)
        : null;
      if (existingNumberEntry?.id) {
        removeNumber(existingNumberEntry.id);
      }

      // Add new directional number if value is not empty
      if (newValue) {
        // Use 0 for no direction (will display as centered number without arrow)
        const direction = existingNumberEntry?.number.direction ??
          toPenpaDirection(toolSettings.arrowDirection);
        addDirectionalClue({
          cellId: effectiveCellId || `cell-${numberSelection!.row}-${numberSelection!.col}`,
          cell: cellIndex,
          direction: direction as 0 | 1 | 2 | 3 | 4,
          value: parseInt(newValue, 10),
          layer: dataLayer,
          angle: existingNumberEntry?.number.angle ?? null,
          color: existingNumberEntry?.number.color ?? toolSettings.color,
        });
      }
      return;
    }

    if (!effectiveCellId) return;

    const position = toolSettings.numberPosition || 'center';
    const cornerIndex = toolSettings.cornerIndex ?? 0;
    const sideIndex = toolSettings.sideIndex ?? 0;

    // Remove existing number at current position
    const existingEntry = findNumberEntry(puzzle[dataLayer].numbers, effectiveCellId, position, {
      cornerIndex,
      sideIndex,
    });

    if (existingEntry) {
      removeNumber(existingEntry.id);
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
    const normalized = currentValue === '?' ? null : currentValue;
    const nextValue = appendDigit(normalized, String(num), maxDigits);
    updateNumberValue(nextValue);
  };

  // Handle special button click (? replaces entire value)
  const handleSpecialClick = (value: string) => {
    if (!numberSelection) return;
    // Non-numeric input is disabled for constraint/directional number inputs
    if (isDirectionalMode) return;
    updateNumberValue(value);
  };

  // Handle alphabet button click - replaces entire value with the letter
  const handleAlphabetClick = (letter: string) => {
    if (!numberSelection) return;
    // Non-numeric input is disabled for constraint/directional number inputs
    if (isDirectionalMode) return;
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
    if (isDirectionalMode) return;
    const finalChar = isKatakana ? toKatakana(char) : char;
    updateNumberValue(finalChar);
  };

  // Handle custom input submission
  const handleCustomSubmit = () => {
    if (!numberSelection || !customInput) return;
    if (isDirectionalMode && !isNumericString(customInput)) return;
    const nextValue = limitNumericString(customInput, maxDigits);
    updateNumberValue(nextValue);
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

  const isDisabled = !numberSelection || !editableLayer;

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

  // Check if non-numeric modes are disabled (for constraint/directional inputs)
  const isNonNumericDisabled = isDirectionalMode;

  useEffect(() => {
    if (!onLayoutChange) return;
    const frame = requestAnimationFrame(() => {
      const height = panelRef.current?.offsetHeight ?? 0;
      onLayoutChange(height);
    });
    return () => cancelAnimationFrame(frame);
  }, [onLayoutChange, panelMode, isKatakana, isUpperCase, customInput]);

  return (
    <div className="space-y-1" ref={panelRef}>
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
          {/* Hiragana/Katakana pad grid */}
          <div className="space-y-0.5">
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
