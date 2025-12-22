import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pipette } from 'lucide-react';
import { usePuzzleStore } from '../../../store/puzzleStoreContext';
import { toDataLayer, LineElement } from '../../../types';
import { getEditableDataLayer } from '../../../utils/editPolicy';
import {
  findDirectionalNumberByCellId,
  findNumberEntry,
  getCandidateEntries,
  toPenpaDirectionalClue,
} from '../../../utils/numberEntries';

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

interface ColorSelectorProps {
  compact?: boolean;
}

export const ColorSelector: React.FC<ColorSelectorProps> = ({ compact = false }) => {
  const { t } = useTranslation();
  const {
    toolSettings,
    setToolSettings,
    numberSelection,
    grid,
    puzzle,
    activeLayer,
    isPlayerMode,
    addNumber,
    addDirectionalClue,
    highlightedLineIds,
    updateLine,
  } = usePuzzleStore();

  const editableLayer = getEditableDataLayer(activeLayer, isPlayerMode);
  const dataLayer = editableLayer ?? toDataLayer(activeLayer);
  const [customColor, setCustomColor] = useState(toolSettings.color);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // Check if there are selected lines (for line category tools)
  const selectedLines = React.useMemo(() => {
    if (toolSettings.currentCategory !== 'line' &&
        toolSettings.currentCategory !== 'edge' &&
        toolSettings.currentCategory !== 'wall') {
      return [];
    }
    const layerData = puzzle[dataLayer];
    return highlightedLineIds
      .map(id => layerData.lines[id])
      .filter((line): line is LineElement => line !== undefined && !line.isFree);
  }, [puzzle, dataLayer, highlightedLineIds, toolSettings.currentCategory]);

  const hasSelectedLines = selectedLines.length > 0;
  const selectedLinesColor = hasSelectedLines && selectedLines.every(l => l.color === selectedLines[0].color)
    ? selectedLines[0].color
    : null;

  // Find existing number at current position (for position-specific updates)
  const findExistingNumberAtPosition = () => {
    if (!numberSelection) return null;
    const cellId = `cell-${numberSelection.row}-${numberSelection.col}`;
    const position = toolSettings.numberPosition;
    const cornerIndex = toolSettings.cornerIndex;
    const sideIndex = toolSettings.sideIndex;

    return findNumberEntry(puzzle[dataLayer].numbers, cellId, position, {
      cornerIndex,
      sideIndex,
    });
  };

  const handleColorChange = useCallback((newColor: string) => {
    setToolSettings({ color: newColor });
    setCustomColor(newColor);
    const canEdit = Boolean(editableLayer);

    // Update selected lines if any
    if (canEdit && hasSelectedLines) {
      highlightedLineIds.forEach(id => {
        const line = puzzle[dataLayer].lines[id];
        if (line && !line.isFree) {
          updateLine(id, { color: newColor });
        }
      });
    }

    // Update existing number/directional number if cell is selected
    if (canEdit && numberSelection && toolSettings.currentTool.startsWith('number')) {
      const cellId = `cell-${numberSelection.row}-${numberSelection.col}`;

      if (toolSettings.currentTool === 'number-directional') {
        // Update directional number color (preserve all existing properties)
        const cellIndex = numberSelection.row * grid.cols + numberSelection.col;
        const cellId = `cell-${numberSelection.row}-${numberSelection.col}`;
        const existingDirectionalEntry = findDirectionalNumberByCellId(puzzle[dataLayer].numbers, cellId);
        const existing = existingDirectionalEntry
          ? toPenpaDirectionalClue(existingDirectionalEntry.number)
          : null;
        if (existing) {
          addDirectionalClue({
            cellId,
            cell: cellIndex,
            direction: existing.direction,
            value: existing.value,
            char: existing.char,
            angle: existing.angle,
            color: newColor,
            layer: editableLayer,
          });
        }
      } else {
        // Update normal number color at current position
        const position = toolSettings.numberPosition;

        if (position === 'candidates') {
          // Update all candidates in the cell
          const candidates = getCandidateEntries(puzzle[dataLayer].numbers, cellId);
          candidates.forEach(({ number: existing }) => {
            addNumber({
              cellId,
              value: existing.value,
              size: existing.size,
              position: existing.position,
              cornerIndex: existing.cornerIndex,
              sideIndex: existing.sideIndex,
              color: newColor,
              layer: editableLayer,
            });
          });
        } else {
          // Update number at specific position
          const existingEntry = findExistingNumberAtPosition();
          if (existingEntry) {
            const existing = existingEntry.number;
            addNumber({
              cellId,
              value: existing.value,
              size: existing.size,
              position: existing.position,
              cornerIndex: existing.cornerIndex,
              sideIndex: existing.sideIndex,
              color: newColor,
              layer: editableLayer,
            });
          }
        }
      }
    }
  }, [numberSelection, toolSettings, grid, puzzle, dataLayer, editableLayer, addNumber, addDirectionalClue, setToolSettings, hasSelectedLines, highlightedLineIds, updateLine]);

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

  // Compact mode: color picker + full palette in one row
  if (compact) {
    const currentColor = hasSelectedLines && selectedLinesColor ? selectedLinesColor : toolSettings.color;
    return (
      <div className="flex items-center gap-1 flex-1">
        <input
          ref={colorInputRef}
          type="color"
          value={currentColor}
          onChange={handleCustomColorInputChange}
          className="w-5 h-5 p-0 border border-office-border rounded cursor-pointer flex-shrink-0"
          title={t('prop.customColor') || 'Custom color'}
        />
        <div className="flex gap-0.5 flex-wrap flex-1">
          {COLOR_PALETTE.map((color) => {
            const isActive = currentColor === color;
            return (
              <button
                key={color}
                className={`w-4 h-4 border rounded-sm transition-all ${
                  isActive
                    ? 'border-office-accent border-2 scale-110'
                    : 'border-office-border hover:border-office-accent'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorChange(color)}
                title={color}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-2">
        {/* Color palette */}
        <div className="flex gap-0.5 flex-wrap">
          {COLOR_PALETTE.map((color) => {
            // Use selected lines' color if available, otherwise toolSettings
            const isActive = hasSelectedLines
              ? selectedLinesColor === color
              : toolSettings.color === color;
            return (
              <button
                key={color}
                className={`w-5 h-5 border rounded-sm transition-all ${
                  isActive
                    ? 'border-office-accent border-2 scale-110'
                    : 'border-office-border hover:border-office-accent'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorChange(color)}
                title={color}
              />
            );
          })}
        </div>

        {/* Custom color row */}
        <div className="flex items-center gap-1">
          {/* Hidden color input */}
          <input
            ref={colorInputRef}
            type="color"
            value={hasSelectedLines && selectedLinesColor ? selectedLinesColor : customColor}
            onChange={handleCustomColorInputChange}
            className="w-6 h-6 p-0 border border-office-border rounded cursor-pointer"
            title={t('prop.customColor') || 'Custom color'}
          />
          {/* Current color preview */}
          <div
            className="w-8 h-6 border border-office-border rounded"
            style={{ backgroundColor: hasSelectedLines && selectedLinesColor ? selectedLinesColor : toolSettings.color }}
            title={hasSelectedLines && selectedLinesColor ? selectedLinesColor : toolSettings.color}
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
