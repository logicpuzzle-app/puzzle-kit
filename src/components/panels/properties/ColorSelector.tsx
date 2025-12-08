import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pipette } from 'lucide-react';
import { usePuzzleStore } from '../../../store/puzzleStore';
import { toDataLayer } from '../../../types';

// General color palette for tools
export const COLOR_PALETTE = [
  '#000000', // black
  '#808080', // grey
  '#ffffff', // white
  '#ff0000', // red
  '#0000ff', // blue
  '#00ff00', // green
  '#ff8000', // orange
  '#ffff00', // yellow
  '#00ffff', // cyan
  '#ff00ff', // magenta
  '#800000', // dark red
  '#008000', // dark green
  '#000080', // dark blue
];

export const ColorSelector: React.FC = () => {
  const { t } = useTranslation();
  const {
    toolSettings,
    setToolSettings,
    numberSelection,
    grid,
    puzzle,
    activeLayer,
    addNumber,
    addDirectionalClue,
  } = usePuzzleStore();

  const dataLayer = toDataLayer(activeLayer);
  const [customColor, setCustomColor] = useState(toolSettings.color);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // Find existing number at current position (for position-specific updates)
  const findExistingNumberAtPosition = () => {
    if (!numberSelection) return null;
    const cellId = `cell-${numberSelection.row}-${numberSelection.col}`;
    const numbers = puzzle[dataLayer].numbers;
    const position = toolSettings.numberPosition;
    const cornerIndex = toolSettings.cornerIndex;
    const sideIndex = toolSettings.sideIndex;

    return Object.entries(numbers).find(([, n]) => {
      if (n.cellId !== cellId) return false;
      if (position === 'center') return n.position === 'center';
      if (position === 'corner') return n.position === 'corner' && n.cornerIndex === cornerIndex;
      if (position === 'side') return n.position === 'side' && n.sideIndex === sideIndex;
      // For candidates, we update all candidates in the cell
      if (position === 'candidates') return n.position === 'candidates';
      return false;
    });
  };

  const handleColorChange = useCallback((newColor: string) => {
    setToolSettings({ color: newColor });
    setCustomColor(newColor);

    // Update existing number/directional clue if cell is selected
    if (numberSelection && toolSettings.currentTool.startsWith('number')) {
      const cellId = `cell-${numberSelection.row}-${numberSelection.col}`;

      if (toolSettings.currentTool === 'number-directional') {
        // Update directional clue color
        const cellIndex = numberSelection.row * grid.cols + numberSelection.col;
        const cellId = `cell-${numberSelection.row}-${numberSelection.col}`;
        const existingEntry = Object.entries(puzzle[dataLayer].directionalClues || {}).find(
          ([, c]) => c.cellId === cellId || c.cell === cellIndex
        );
        if (existingEntry) {
          const [, existing] = existingEntry;
          addDirectionalClue({
            cellId,
            cell: cellIndex,
            direction: existing.direction,
            value: existing.value,
            color: newColor,
            layer: dataLayer,
          });
        }
      } else {
        // Update normal number color at current position
        const position = toolSettings.numberPosition;

        if (position === 'candidates') {
          // Update all candidates in the cell
          const candidates = Object.entries(puzzle[dataLayer].numbers).filter(
            ([, n]) => n.cellId === cellId && n.position === 'candidates'
          );
          candidates.forEach(([, existing]) => {
            addNumber({
              cellId,
              value: existing.value,
              size: existing.size,
              position: existing.position,
              cornerIndex: existing.cornerIndex,
              sideIndex: existing.sideIndex,
              color: newColor,
              layer: dataLayer,
            });
          });
        } else {
          // Update number at specific position
          const existingEntry = findExistingNumberAtPosition();
          if (existingEntry) {
            const [, existing] = existingEntry;
            addNumber({
              cellId,
              value: existing.value,
              size: existing.size,
              position: existing.position,
              cornerIndex: existing.cornerIndex,
              sideIndex: existing.sideIndex,
              color: newColor,
              layer: dataLayer,
            });
          }
        }
      }
    }
  }, [numberSelection, toolSettings, grid, puzzle, dataLayer, addNumber, addDirectionalClue, setToolSettings]);

  const handleCustomColorInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setCustomColor(newColor);
    handleColorChange(newColor);
  }, [handleColorChange]);

  const openColorPicker = useCallback(() => {
    colorInputRef.current?.click();
  }, []);

  // Eyedropper API (if supported by browser)
  const handleEyedropper = useCallback(async () => {
    if (!('EyeDropper' in window)) {
      // Fallback: just open color picker
      openColorPicker();
      return;
    }
    try {
      // @ts-expect-error EyeDropper is not in TypeScript types yet
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      if (result?.sRGBHex) {
        handleColorChange(result.sRGBHex);
      }
    } catch {
      // User cancelled or error - do nothing
    }
  }, [handleColorChange, openColorPicker]);

  return (
    <div>
      <label className="block text-xs text-office-text-secondary mb-1">
        {t('prop.color')}
      </label>
      <div className="flex flex-col gap-2">
        {/* Color palette */}
        <div className="flex gap-0.5 flex-wrap">
          {COLOR_PALETTE.map((color) => (
            <button
              key={color}
              className={`w-5 h-5 border rounded-sm transition-all ${
                toolSettings.color === color
                  ? 'border-office-accent border-2 scale-110'
                  : 'border-office-border hover:border-office-accent'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => handleColorChange(color)}
              title={color}
            />
          ))}
        </div>

        {/* Custom color row */}
        <div className="flex items-center gap-1">
          {/* Hidden color input */}
          <input
            ref={colorInputRef}
            type="color"
            value={customColor}
            onChange={handleCustomColorInputChange}
            className="w-6 h-6 p-0 border border-office-border rounded cursor-pointer"
            title={t('prop.customColor') || 'Custom color'}
          />
          {/* Current color preview */}
          <div
            className="w-8 h-6 border border-office-border rounded"
            style={{ backgroundColor: toolSettings.color }}
            title={toolSettings.color}
          />
          {/* Eyedropper button */}
          <button
            className="w-6 h-6 border border-office-border rounded hover:bg-office-ribbon-hover flex items-center justify-center"
            onClick={handleEyedropper}
            title={t('prop.eyedropper') || 'Pick color from screen'}
          >
            <Pipette size={14} />
          </button>
          {/* Swap button */}
          <button
            className="w-6 h-6 text-xs border border-office-border rounded hover:bg-office-ribbon-hover flex items-center justify-center"
            onClick={() =>
              setToolSettings({
                color: toolSettings.secondaryColor,
                secondaryColor: toolSettings.color,
              })
            }
            title={t('prop.swapColors')}
          >
            ⇄
          </button>
          {/* Secondary color indicator */}
          <div
            className="w-5 h-5 border border-office-border rounded-sm cursor-pointer hover:scale-110 transition-transform"
            style={{ backgroundColor: toolSettings.secondaryColor }}
            title={`${t('prop.secondaryColor')}: ${toolSettings.secondaryColor}`}
            onClick={() => handleColorChange(toolSettings.secondaryColor)}
          />
        </div>
      </div>
    </div>
  );
};
