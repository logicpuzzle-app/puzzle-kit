import React, { useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../../store/puzzleStore';
import { toDataLayer } from '../../../types';

// Arrow direction settings for directional numbers (Yajilin-style)
// Direction: -1=none, 0=up, 1=left, 2=right, 3=down
export const ArrowDirectionSettings: React.FC = () => {
  const { t } = useTranslation();
  const {
    toolSettings,
    setToolSettings,
    numberSelection,
    grid,
    puzzle,
    activeLayer,
    addDirectionalClue,
  } = usePuzzleStore();

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

  // Get current cell's directional clue info
  const currentCellClue = useMemo(() => {
    if (!numberSelection) return null;
    const cellIndex = numberSelection.row * grid.cols + numberSelection.col;
    const entry = Object.entries(puzzle[dataLayer].directionalClues || {}).find(
      ([, c]) => c.cell === cellIndex
    );
    if (!entry) return null;
    const [id, clue] = entry;
    // Convert Penpa direction back to arrowDirection (0=none maps to -1)
    const reverseDirMap: Record<number, number> = { 0: -1, 1: 0, 2: 3, 3: 1, 4: 2 };
    return {
      id,
      value: clue.value,
      direction: reverseDirMap[clue.direction] ?? -1,
    };
  }, [numberSelection, grid.cols, puzzle, dataLayer]);

  // The active direction to highlight: use cell's clue direction if available, otherwise tool setting
  const activeDirection = currentCellClue?.direction ?? toolSettings.arrowDirection;

  const handleDirectionChange = (newDirection: number) => {
    setToolSettings({ arrowDirection: newDirection });

    // Update existing directional clue if cell is selected (update direction, keep value)
    if (numberSelection && currentCellClue) {
      const cellIndex = numberSelection.row * grid.cols + numberSelection.col;
      addDirectionalClue({
        cell: cellIndex,
        direction: directionMap[newDirection] ?? 0,
        value: currentCellClue.value,
        layer: dataLayer,
      });
    }
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
    </div>
  );
};
