import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../../store/puzzleStore';

// Arrow direction settings for directional numbers (Yajilin-style)
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

  // Direction: 0=up, 1=left, 2=right, 3=down
  const directions = [
    { id: 0, icon: '↑', labelKey: 'direction.up' },
    { id: 1, icon: '←', labelKey: 'direction.left' },
    { id: 2, icon: '→', labelKey: 'direction.right' },
    { id: 3, icon: '↓', labelKey: 'direction.down' },
  ];

  // Convert arrowDirection (0=up, 1=left, 2=right, 3=down) to Penpa direction (1=up, 2=down, 3=left, 4=right)
  const directionMap: Record<number, 1 | 2 | 3 | 4> = {
    0: 1, // up
    1: 3, // left
    2: 4, // right
    3: 2, // down
  };

  const handleDirectionChange = (newDirection: number) => {
    setToolSettings({ arrowDirection: newDirection });

    // Update existing directional clue if cell is selected
    if (numberSelection) {
      const cellIndex = numberSelection.row * grid.cols + numberSelection.col;
      const existingEntry = Object.entries(puzzle[activeLayer].directionalClues || {}).find(
        ([, c]) => c.cell === cellIndex
      );
      if (existingEntry) {
        const [, existing] = existingEntry;
        addDirectionalClue({
          cell: cellIndex,
          direction: directionMap[newDirection],
          value: existing.value,
          layer: activeLayer,
        });
      }
    }
  };

  return (
    <div>
      <label className="block text-xs text-office-text-secondary mb-1">
        {t('prop.direction')}
      </label>
      {/* Visual direction selector */}
      <div className="flex justify-center">
        <div className="relative w-16 h-16 border border-office-border bg-white">
          {/* Up */}
          <button
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-6 h-6 text-sm border rounded-sm transition-colors ${
              toolSettings.arrowDirection === 0
                ? 'bg-office-accent text-white border-office-accent'
                : 'bg-white border-office-border hover:bg-office-ribbon-hover'
            }`}
            onClick={() => handleDirectionChange(0)}
            title={t('direction.up')}
          >
            ↑
          </button>
          {/* Left */}
          <button
            className={`absolute top-1/2 left-0 -translate-y-1/2 w-6 h-6 text-sm border rounded-sm transition-colors ${
              toolSettings.arrowDirection === 1
                ? 'bg-office-accent text-white border-office-accent'
                : 'bg-white border-office-border hover:bg-office-ribbon-hover'
            }`}
            onClick={() => handleDirectionChange(1)}
            title={t('direction.left')}
          >
            ←
          </button>
          {/* Right */}
          <button
            className={`absolute top-1/2 right-0 -translate-y-1/2 w-6 h-6 text-sm border rounded-sm transition-colors ${
              toolSettings.arrowDirection === 2
                ? 'bg-office-accent text-white border-office-accent'
                : 'bg-white border-office-border hover:bg-office-ribbon-hover'
            }`}
            onClick={() => handleDirectionChange(2)}
            title={t('direction.right')}
          >
            →
          </button>
          {/* Down */}
          <button
            className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-6 text-sm border rounded-sm transition-colors ${
              toolSettings.arrowDirection === 3
                ? 'bg-office-accent text-white border-office-accent'
                : 'bg-white border-office-border hover:bg-office-ribbon-hover'
            }`}
            onClick={() => handleDirectionChange(3)}
            title={t('direction.down')}
          >
            ↓
          </button>
          {/* Center indicator */}
          <span className="absolute inset-0 flex items-center justify-center text-lg pointer-events-none">
            {directions.find(d => d.id === toolSettings.arrowDirection)?.icon || '→'}
          </span>
        </div>
      </div>
    </div>
  );
};
