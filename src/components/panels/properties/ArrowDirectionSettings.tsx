import React, { useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../../store/puzzleStoreContext';
import { toDataLayer } from '../../../types';
import { useCellFinder } from '../../../hooks/useCellFinder';
import { NumericInput } from '../../common';
import { getEditableDataLayer } from '../../../utils/editPolicy';
import { toArrowDirection, toPenpaDirection } from '../../../utils/directionalClue';
import {
  findDirectionalNumberByCellId,
  findNumberEntry,
  getDirectionalClueValueFields,
  toPenpaDirectionalClue,
  isDirectionalNumber,
} from '../../../utils/numberEntries';

// Arrow direction settings for directional numbers (Yajilin-style)
// Direction: -1=none, 0=up, 1=left, 2=right, 3=down
// Supports arbitrary angles via arrowAngle
export const ArrowDirectionSettings: React.FC = () => {
  const { t } = useTranslation();
  const {
    toolSettings,
    setToolSettings,
    numberSelection,
    puzzle,
    activeLayer,
    isPlayerMode,
    addDirectionalClue,
    removeNumber,
    grid,
  } = usePuzzleStore();

  const { findCellIdByRowCol } = useCellFinder();
  const editableLayer = getEditableDataLayer(activeLayer, isPlayerMode);
  const dataLayer = editableLayer ?? toDataLayer(activeLayer);

  // Track previous selection to detect changes
  const prevSelectionRef = useRef<{ row: number; col: number } | null>(null);

  // Reset arrowDirection to -1 when cursor moves to a different cell
  useEffect(() => {
    const prevSelection = prevSelectionRef.current;
    const currentSelection = numberSelection;

    // Check if selection actually changed (different cell or cleared)
    const selectionChanged =
      (prevSelection === null && currentSelection !== null) ||
      (prevSelection !== null && currentSelection === null) ||
      (prevSelection !== null && currentSelection !== null &&
        (prevSelection.row !== currentSelection.row || prevSelection.col !== currentSelection.col));

    if (selectionChanged) {
      setToolSettings({ arrowDirection: -1 });
    }

    prevSelectionRef.current = currentSelection;
  }, [numberSelection, setToolSettings]);

  // Get current cell's directional number info (using cellId)
  const currentCellClue = useMemo(() => {
    if (!numberSelection) return null;
    const cellId = findCellIdByRowCol(numberSelection.row, numberSelection.col);
    if (!cellId) return null;
    const directionalEntry = findDirectionalNumberByCellId(puzzle[dataLayer].numbers, cellId);
    const entry = directionalEntry
      ? toPenpaDirectionalClue(directionalEntry.number)
      : null;
    if (!entry) return null;
    return {
      id: directionalEntry?.id ?? cellId,
      cellId,
      value: entry.value,
      char: entry.char,
      direction: toArrowDirection(entry.direction),
      angle: entry.angle,
      color: entry.color,
    };
  }, [numberSelection, findCellIdByRowCol, puzzle, dataLayer]);

  // Get current cell's regular number (for conversion to directionalClue)
  const currentCellNumber = useMemo(() => {
    if (!numberSelection) return null;
    const cellId = findCellIdByRowCol(numberSelection.row, numberSelection.col);
    if (!cellId) return null;
    const entry = findNumberEntry(puzzle[dataLayer].numbers, cellId, 'center');
    if (!entry) return null;
    const { id, number } = entry;
    if (isDirectionalNumber(number)) return null;
    return { id, cellId, value: number.value };
  }, [numberSelection, findCellIdByRowCol, puzzle, dataLayer]);

  // The active direction to highlight: use cell's clue direction if available, otherwise tool setting
  const activeDirection = currentCellClue?.direction ?? toolSettings.arrowDirection;
  // The active angle: use cell's clue angle if available, otherwise tool setting
  const activeAngle = currentCellClue?.angle ?? toolSettings.arrowAngle;

  const handleDirectionChange = (newDirection: number) => {
    // Clear arbitrary angle when selecting a preset direction
    setToolSettings({ arrowDirection: newDirection, arrowAngle: null });

    if (!numberSelection || !editableLayer) return;

    const cellId = findCellIdByRowCol(numberSelection.row, numberSelection.col);
    if (!cellId) return;
    const cellIndex = numberSelection.row * grid.cols + numberSelection.col;

  // Update existing directional number if present (update direction, keep value/char/color)
    if (currentCellClue) {
      addDirectionalClue({
        cellId: currentCellClue.cellId,
        cell: cellIndex,
        direction: toPenpaDirection(newDirection),
        value: currentCellClue.value,
        char: currentCellClue.char,
        layer: editableLayer,
        angle: null, // Clear arbitrary angle
        color: currentCellClue.color || toolSettings.color,
      });
    } else if (currentCellNumber) {
      // Convert regular number to directionalClue with direction
      // Single character values use char field, multi-digit numbers use value field
      const { value, char } = getDirectionalClueValueFields(currentCellNumber.value);

      addDirectionalClue({
        cellId,
        cell: cellIndex,
        direction: toPenpaDirection(newDirection),
        value,
        char,
        layer: editableLayer,
        angle: null,
        color: toolSettings.color,
      });
      // Remove the original number
      removeNumber(currentCellNumber.id);
    }
  };

  // Handle arbitrary angle input - always use angle field (no conversion to preset)
  const handleAngleChange = (angleValue: number | null) => {
    if (angleValue === null) {
      setToolSettings({ arrowAngle: null, arrowDirection: -1 });
      return;
    }

    // Always use arbitrary angle (allows continuous +15/-15 cycling)
    setToolSettings({ arrowAngle: angleValue, arrowDirection: -1 });

    if (!numberSelection || !editableLayer) return;

    const cellId = findCellIdByRowCol(numberSelection.row, numberSelection.col);
    if (!cellId) return;
    const cellIndex = numberSelection.row * grid.cols + numberSelection.col;

  // Update existing directional number if present (keep color)
    if (currentCellClue) {
      addDirectionalClue({
        cellId: currentCellClue.cellId,
        cell: cellIndex,
        direction: 0, // No preset direction when using arbitrary angle
        value: currentCellClue.value,
        char: currentCellClue.char,
        layer: editableLayer,
        angle: angleValue,
        color: currentCellClue.color || toolSettings.color,
      });
    } else if (currentCellNumber) {
      // Convert regular number to directionalClue with angle
      // Single character values use char field, multi-digit numbers use value field
      const { value, char } = getDirectionalClueValueFields(currentCellNumber.value);

      addDirectionalClue({
        cellId,
        cell: cellIndex,
        direction: 0,
        value,
        char,
        layer: editableLayer,
        angle: angleValue,
        color: toolSettings.color,
      });
      // Remove the original number
      removeNumber(currentCellNumber.id);
    }
  };

  const isDisabled = !numberSelection || !editableLayer;

  return (
    <div className="space-y-1">
      {/* Visual direction selector - 3x3 grid layout, compact size */}
      <div className="grid grid-cols-3 gap-0.5">
        {/* Top row: empty, up, empty */}
        <div />
        <button
          className={`w-full h-7 text-sm font-medium border rounded-sm transition-colors ${
            activeDirection === 0
              ? 'bg-office-accent text-white border-office-accent'
              : 'bg-white border-office-border hover:bg-office-ribbon-hover'
          }`}
          onClick={() => handleDirectionChange(0)}
          disabled={isDisabled}
          title={t('direction.up')}
        >
          ↑
        </button>
        <div />

        {/* Middle row: left, no-direction center, right */}
        <button
          className={`w-full h-7 text-sm font-medium border rounded-sm transition-colors ${
            activeDirection === 1
              ? 'bg-office-accent text-white border-office-accent'
              : 'bg-white border-office-border hover:bg-office-ribbon-hover'
          }`}
          onClick={() => handleDirectionChange(1)}
          disabled={isDisabled}
          title={t('direction.left')}
        >
          ←
        </button>
        <button
          className={`w-full h-7 text-sm font-medium border rounded-sm transition-colors ${
            activeDirection === -1 || (numberSelection && !currentCellClue)
              ? 'bg-office-accent text-white border-office-accent'
              : 'bg-white border-office-border hover:bg-office-ribbon-hover'
          }`}
          onClick={() => handleDirectionChange(-1)}
          disabled={isDisabled}
          title={t('direction.none', 'No direction')}
        >
          ○
        </button>
        <button
          className={`w-full h-7 text-sm font-medium border rounded-sm transition-colors ${
            activeDirection === 2
              ? 'bg-office-accent text-white border-office-accent'
              : 'bg-white border-office-border hover:bg-office-ribbon-hover'
          }`}
          onClick={() => handleDirectionChange(2)}
          disabled={isDisabled}
          title={t('direction.right')}
        >
          →
        </button>

        {/* Bottom row: empty, down, empty */}
        <div />
        <button
          className={`w-full h-7 text-sm font-medium border rounded-sm transition-colors ${
            activeDirection === 3
              ? 'bg-office-accent text-white border-office-accent'
              : 'bg-white border-office-border hover:bg-office-ribbon-hover'
          }`}
          onClick={() => handleDirectionChange(3)}
          disabled={isDisabled}
          title={t('direction.down')}
        >
          ↓
        </button>
        <div />
      </div>

      {/* Arbitrary angle input */}
      <div className="flex gap-0.5 items-center">
        <button
          className="h-6 px-1 text-xs font-medium border rounded-sm transition-colors bg-white border-office-border hover:bg-office-ribbon-hover"
          onClick={() => handleAngleChange(activeAngle !== null ? ((activeAngle - 15 + 360) % 360) : 345)}
          disabled={isDisabled}
          title="-15°"
        >
          -15
        </button>
        <NumericInput
          value={activeAngle}
          onChange={(val) => handleAngleChange(val)}
          normalize={(v) => ((v % 360) + 360) % 360}
          allowNull
          placeholder="°"
          className={`w-10 h-6 ${activeAngle !== null ? 'border-office-accent bg-blue-50' : ''}`}
          disabled={isDisabled}
          title={t('direction.customAngle', 'Custom angle (degrees)')}
        />
        <button
          className="h-6 px-1 text-xs font-medium border rounded-sm transition-colors bg-white border-office-border hover:bg-office-ribbon-hover"
          onClick={() => handleAngleChange(activeAngle !== null ? ((activeAngle + 15) % 360) : 15)}
          disabled={isDisabled}
          title="+15°"
        >
          +15
        </button>
      </div>
    </div>
  );
};
