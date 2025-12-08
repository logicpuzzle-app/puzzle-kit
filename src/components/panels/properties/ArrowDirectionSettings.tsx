import React, { useMemo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../../store/puzzleStore';
import { toDataLayer } from '../../../types';
import { useCellFinder } from '../../../hooks/useCellFinder';

// Arrow direction settings for directional numbers (Yajilin-style)
// Direction: -1=none, 0=up, 1=left, 2=right, 3=down
// Supports arbitrary angles via arrowAngle
export const ArrowDirectionSettings: React.FC = () => {
  const { t } = useTranslation();
  const [angleInput, setAngleInput] = useState('');
  const {
    toolSettings,
    setToolSettings,
    numberSelection,
    puzzle,
    activeLayer,
    addDirectionalClue,
    removeNumber,
    grid,
  } = usePuzzleStore();

  const { findCellIdByRowCol } = useCellFinder();
  const dataLayer = toDataLayer(activeLayer);

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

  // Convert arrowDirection (-1=none, 0=up, 1=left, 2=right, 3=down) to Penpa direction (0=none, 1=up, 2=down, 3=left, 4=right)
  const directionMap: Record<number, 0 | 1 | 2 | 3 | 4> = {
    [-1]: 0, // no direction
    0: 1, // up
    1: 3, // left
    2: 4, // right
    3: 2, // down
  };

  // Get current cell's directional clue info (using cellId)
  const currentCellClue = useMemo(() => {
    if (!numberSelection) return null;
    const cellId = findCellIdByRowCol(numberSelection.row, numberSelection.col);
    if (!cellId) return null;
    const entry = Object.entries(puzzle[dataLayer].directionalClues || {}).find(
      ([, c]) => c.cellId === cellId
    );
    if (!entry) return null;
    const [id, clue] = entry;
    // Convert Penpa direction back to arrowDirection (0=none maps to -1)
    const reverseDirMap: Record<number, number> = { 0: -1, 1: 0, 2: 3, 3: 1, 4: 2 };
    return {
      id,
      cellId,
      value: clue.value,
      char: clue.char,
      direction: reverseDirMap[clue.direction] ?? -1,
      angle: clue.angle,
    };
  }, [numberSelection, findCellIdByRowCol, puzzle, dataLayer]);

  // Get current cell's regular number (for conversion to directionalClue)
  const currentCellNumber = useMemo(() => {
    if (!numberSelection) return null;
    const cellId = findCellIdByRowCol(numberSelection.row, numberSelection.col);
    if (!cellId) return null;
    const entry = Object.entries(puzzle[dataLayer].numbers || {}).find(
      ([, n]) => n.cellId === cellId && n.position === 'center'
    );
    if (!entry) return null;
    const [id, num] = entry;
    return { id, cellId, value: num.value };
  }, [numberSelection, findCellIdByRowCol, puzzle, dataLayer]);

  // The active direction to highlight: use cell's clue direction if available, otherwise tool setting
  const activeDirection = currentCellClue?.direction ?? toolSettings.arrowDirection;
  // The active angle: use cell's clue angle if available, otherwise tool setting
  const activeAngle = currentCellClue?.angle ?? toolSettings.arrowAngle;

  const handleDirectionChange = (newDirection: number) => {
    // Clear arbitrary angle when selecting a preset direction
    setToolSettings({ arrowDirection: newDirection, arrowAngle: null });

    if (!numberSelection) return;

    const cellId = findCellIdByRowCol(numberSelection.row, numberSelection.col);
    if (!cellId) return;
    const cellIndex = numberSelection.row * grid.cols + numberSelection.col;

    // Update existing directional clue if present (update direction, keep value/char)
    if (currentCellClue) {
      addDirectionalClue({
        cellId: currentCellClue.cellId,
        cell: cellIndex,
        direction: directionMap[newDirection] ?? 0,
        value: currentCellClue.value,
        char: currentCellClue.char,
        layer: dataLayer,
        angle: null, // Clear arbitrary angle
      });
    } else if (currentCellNumber) {
      // Convert regular number to directionalClue with direction
      // Single character values use char field, multi-digit numbers use value field
      const val = currentCellNumber.value;
      const numValue = parseInt(val, 10);
      const isSingleChar = val.length === 1 && isNaN(numValue);

      addDirectionalClue({
        cellId,
        cell: cellIndex,
        direction: directionMap[newDirection] ?? 0,
        value: isSingleChar ? 0 : (isNaN(numValue) ? 0 : numValue),
        char: isSingleChar ? val : undefined,
        layer: dataLayer,
        angle: null,
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

    if (!numberSelection) return;

    const cellId = findCellIdByRowCol(numberSelection.row, numberSelection.col);
    if (!cellId) return;
    const cellIndex = numberSelection.row * grid.cols + numberSelection.col;

    // Update existing directional clue if present
    if (currentCellClue) {
      addDirectionalClue({
        cellId: currentCellClue.cellId,
        cell: cellIndex,
        direction: 0, // No preset direction when using arbitrary angle
        value: currentCellClue.value,
        char: currentCellClue.char,
        layer: dataLayer,
        angle: angleValue,
      });
    } else if (currentCellNumber) {
      // Convert regular number to directionalClue with angle
      // Single character values use char field, multi-digit numbers use value field
      const val = currentCellNumber.value;
      const numValue = parseInt(val, 10);
      const isSingleChar = val.length === 1 && isNaN(numValue);

      addDirectionalClue({
        cellId,
        cell: cellIndex,
        direction: 0,
        value: isSingleChar ? 0 : (isNaN(numValue) ? 0 : numValue),
        char: isSingleChar ? val : undefined,
        layer: dataLayer,
        angle: angleValue,
      });
      // Remove the original number
      removeNumber(currentCellNumber.id);
    }
  };

  const handleAngleInputSubmit = () => {
    const parsed = parseFloat(angleInput);
    if (!isNaN(parsed)) {
      // Normalize to 0-360
      const normalized = ((parsed % 360) + 360) % 360;
      handleAngleChange(normalized);
    }
    setAngleInput('');
  };

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
          title="-15°"
        >
          -15
        </button>
        <input
          type="number"
          value={activeAngle !== null ? activeAngle : ''}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '') {
              handleAngleChange(null);
            } else {
              const parsed = parseFloat(val);
              if (!isNaN(parsed)) {
                handleAngleChange(((parsed % 360) + 360) % 360);
              }
            }
          }}
          placeholder="°"
          className={`w-12 h-6 px-1 text-xs text-center border rounded-sm focus:outline-none focus:border-office-accent ${
            activeAngle !== null
              ? 'border-office-accent bg-blue-50'
              : 'border-office-border'
          }`}
          title={t('direction.customAngle', 'Custom angle (degrees)')}
        />
        <button
          className="h-6 px-1 text-xs font-medium border rounded-sm transition-colors bg-white border-office-border hover:bg-office-ribbon-hover"
          onClick={() => handleAngleChange(activeAngle !== null ? ((activeAngle + 15) % 360) : 15)}
          title="+15°"
        >
          +15
        </button>
      </div>
    </div>
  );
};
