import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw, RotateCw, Trash2, Pipette } from 'lucide-react';
import { usePuzzleStore } from '../../store/puzzleStore';
import { LineStyle, LineThickness, MulticolorSwatch, LineElement } from '../../types';
import { SymbolPanel } from './SymbolPanel';

// Multicolor palette - standard colors (idx 0-8)
const MULTICOLOR_PALETTE = [
  { idx: 0, color: 'transparent' },
  { idx: 1, color: '#cfcfcf' }, // light grey
  { idx: 2, color: '#a0a0a0' }, // grey
  { idx: 3, color: '#000000' }, // black
  { idx: 4, color: '#ff0000' }, // red
  { idx: 5, color: '#0000ff' }, // blue
  { idx: 6, color: '#00ff00' }, // green
  { idx: 7, color: '#ffff00' }, // yellow
  { idx: 8, color: '#ff8000' }, // orange
];

// General color palette for tools
const COLOR_PALETTE = [
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
// Custom colors start at index 9
const CUSTOM_COLOR_START_IDX = 9;

// Default patterns
// Pattern 'x' uses triangles: 0=left, 1=top, 2=right, 3=bottom
// Pattern 'cross' uses quadrants: 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right
// Color indices: 0=transparent, 2=grey (#999999), 3=black
const DEFAULT_PATTERNS: MulticolorSwatch[] = [
  // === Cross (+) patterns with BLACK (idx 3) ===
  // Half-filled (2 quadrants black)
  { id: 'default-cross-top-b', slots: [3, 3, 0, 0], pattern: 'cross', customColors: [] },
  { id: 'default-cross-bottom-b', slots: [0, 0, 3, 3], pattern: 'cross', customColors: [] },
  { id: 'default-cross-left-b', slots: [3, 0, 3, 0], pattern: 'cross', customColors: [] },
  { id: 'default-cross-right-b', slots: [0, 3, 0, 3], pattern: 'cross', customColors: [] },
  // Checkerboard
  { id: 'default-cross-check1-b', slots: [3, 0, 0, 3], pattern: 'cross', customColors: [] },
  { id: 'default-cross-check2-b', slots: [0, 3, 3, 0], pattern: 'cross', customColors: [] },
  // Quarter-filled (1 quadrant black)
  { id: 'default-cross-tl-b', slots: [3, 0, 0, 0], pattern: 'cross', customColors: [] },
  { id: 'default-cross-tr-b', slots: [0, 3, 0, 0], pattern: 'cross', customColors: [] },
  { id: 'default-cross-bl-b', slots: [0, 0, 3, 0], pattern: 'cross', customColors: [] },
  { id: 'default-cross-br-b', slots: [0, 0, 0, 3], pattern: 'cross', customColors: [] },
  // === Cross (+) patterns with GREY (idx 2) ===
  // Half-filled (2 quadrants grey)
  { id: 'default-cross-top-g', slots: [2, 2, 0, 0], pattern: 'cross', customColors: [] },
  { id: 'default-cross-bottom-g', slots: [0, 0, 2, 2], pattern: 'cross', customColors: [] },
  { id: 'default-cross-left-g', slots: [2, 0, 2, 0], pattern: 'cross', customColors: [] },
  { id: 'default-cross-right-g', slots: [0, 2, 0, 2], pattern: 'cross', customColors: [] },
  // Checkerboard
  { id: 'default-cross-check1-g', slots: [2, 0, 0, 2], pattern: 'cross', customColors: [] },
  { id: 'default-cross-check2-g', slots: [0, 2, 2, 0], pattern: 'cross', customColors: [] },
  // Quarter-filled (1 quadrant grey)
  { id: 'default-cross-tl-g', slots: [2, 0, 0, 0], pattern: 'cross', customColors: [] },
  { id: 'default-cross-tr-g', slots: [0, 2, 0, 0], pattern: 'cross', customColors: [] },
  { id: 'default-cross-bl-g', slots: [0, 0, 2, 0], pattern: 'cross', customColors: [] },
  { id: 'default-cross-br-g', slots: [0, 0, 0, 2], pattern: 'cross', customColors: [] },
  // === X (diagonal) patterns with BLACK (idx 3) ===
  // Half-filled (2 triangles black)
  { id: 'default-x-half-tl-b', slots: [3, 3, 0, 0], pattern: 'x', customColors: [] },
  { id: 'default-x-half-tr-b', slots: [0, 3, 3, 0], pattern: 'x', customColors: [] },
  { id: 'default-x-half-br-b', slots: [0, 0, 3, 3], pattern: 'x', customColors: [] },
  { id: 'default-x-half-bl-b', slots: [3, 0, 0, 3], pattern: 'x', customColors: [] },
  // Quarter-filled (1 triangle black)
  { id: 'default-x-left-b', slots: [3, 0, 0, 0], pattern: 'x', customColors: [] },
  { id: 'default-x-top-b', slots: [0, 3, 0, 0], pattern: 'x', customColors: [] },
  { id: 'default-x-right-b', slots: [0, 0, 3, 0], pattern: 'x', customColors: [] },
  { id: 'default-x-bottom-b', slots: [0, 0, 0, 3], pattern: 'x', customColors: [] },
  // === X (diagonal) patterns with GREY (idx 2) ===
  // Half-filled (2 triangles grey)
  { id: 'default-x-half-tl-g', slots: [2, 2, 0, 0], pattern: 'x', customColors: [] },
  { id: 'default-x-half-tr-g', slots: [0, 2, 2, 0], pattern: 'x', customColors: [] },
  { id: 'default-x-half-br-g', slots: [0, 0, 2, 2], pattern: 'x', customColors: [] },
  { id: 'default-x-half-bl-g', slots: [2, 0, 0, 2], pattern: 'x', customColors: [] },
  // Quarter-filled (1 triangle grey)
  { id: 'default-x-left-g', slots: [2, 0, 0, 0], pattern: 'x', customColors: [] },
  { id: 'default-x-top-g', slots: [0, 2, 0, 0], pattern: 'x', customColors: [] },
  { id: 'default-x-right-g', slots: [0, 0, 2, 0], pattern: 'x', customColors: [] },
  { id: 'default-x-bottom-g', slots: [0, 0, 0, 2], pattern: 'x', customColors: [] },
];

export const PropertiesPanel: React.FC = () => {
  const { t } = useTranslation();
  const { toolSettings, setToolSettings, isGridMode } = usePuzzleStore();

  const lineStyles: { value: LineStyle; labelKey: string }[] = [
    { value: 'solid', labelKey: 'style.solid' },
    { value: 'dashed', labelKey: 'style.dashed' },
    { value: 'dotted', labelKey: 'style.dotted' },
  ];

  const lineThicknesses: { value: LineThickness; labelKey: string }[] = [
    { value: 'thinnest', labelKey: 'thickness.thinnest' },
    { value: 'thin', labelKey: 'thickness.thin' },
    { value: 'normal', labelKey: 'thickness.normal' },
    { value: 'thick', labelKey: 'thickness.thick' },
    { value: 'thickest', labelKey: 'thickness.thickest' },
  ];

  const sizes: { value: 'large' | 'medium' | 'small'; labelKey: string }[] = [
    { value: 'large', labelKey: 'size.large' },
    { value: 'medium', labelKey: 'size.medium' },
    { value: 'small', labelKey: 'size.small' },
  ];

  const rotateSymbol = (delta: number) => {
    const next = (toolSettings.symbolRotation + delta) % 360;
    setToolSettings({ symbolRotation: next < 0 ? next + 360 : next });
  };

  const resetRotation = () => setToolSettings({ symbolRotation: 0 });

  return (
    <div className="w-56 bg-white border-l border-office-border flex flex-col h-full">
      {/* Properties header */}
      <div className="panel-header flex-shrink-0">{t('panel.properties')}</div>

      <div className="p-3 flex flex-col gap-4 flex-shrink-0">
        {/* Grid properties - show when in grid mode */}
        {isGridMode && (
          <GridPropertiesPanel />
        )}

        {/* Color Selection - show for most tools except select, and not in grid mode */}
        {!isGridMode && toolSettings.currentCategory !== 'select' && (
          <ColorSelector />
        )}

        {/* Line/Edge properties - toggle buttons */}
        {!isGridMode && (toolSettings.currentCategory === 'line' ||
          toolSettings.currentCategory === 'edge' ||
          toolSettings.currentCategory === 'wall') && (
          <>
            {/* Line Style */}
            <div>
              <label className="block text-xs text-office-text-secondary mb-1">
                {t('prop.style')}
              </label>
              <div className="flex gap-1">
                {lineStyles.map((style) => (
                  <button
                    key={style.value}
                    className={`flex-1 px-2 py-1.5 text-xs border rounded-sm transition-colors ${
                      toolSettings.lineStyle === style.value
                        ? 'bg-office-accent text-white border-office-accent'
                        : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                    }`}
                    onClick={() => setToolSettings({ lineStyle: style.value })}
                  >
                    {t(style.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Line Thickness */}
            <div>
              <label className="block text-xs text-office-text-secondary mb-1">
                {t('prop.thickness')}
              </label>
              <div className="flex gap-1">
                {lineThicknesses.map((thickness) => (
                  <button
                    key={thickness.value}
                    className={`flex-1 px-2 py-1.5 text-xs border rounded-sm transition-colors ${
                      toolSettings.lineThickness === thickness.value
                        ? 'bg-office-accent text-white border-office-accent'
                        : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                    }`}
                    onClick={() => setToolSettings({ lineThickness: thickness.value })}
                  >
                    {t(thickness.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Half mode option - only show for line category with both cell and edge points */}
            {toolSettings.currentCategory === 'line' &&
              toolSettings.lineGridPoints?.includes('cell') &&
              toolSettings.lineGridPoints?.includes('edge') &&
              !toolSettings.lineDirections?.includes('freehand') && (
                <div>
                  <label className="flex items-center gap-2 text-xs text-office-text-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={toolSettings.lineHalfMode || false}
                      onChange={(e) =>
                        setToolSettings({ lineHalfMode: e.target.checked })
                      }
                      className="rounded border-office-border"
                    />
                    {t('prop.halfMode')}
                  </label>
                </div>
              )}

            {/* Freehand line list - only show when in freehand mode */}
            {toolSettings.currentCategory === 'line' &&
              toolSettings.lineDirections?.includes('freehand') && (
                <FreehandLineList />
              )}
          </>
        )}

        {/* Symbol size - toggle buttons */}
        {!isGridMode && toolSettings.currentCategory === 'symbol' && (
          <div>
            <label className="block text-xs text-office-text-secondary mb-1">
              {t('prop.size')}
            </label>
            <div className="flex gap-1">
              {sizes.map((size) => (
                <button
                  key={size.value}
                  className={`flex-1 px-2 py-1.5 text-xs border rounded-sm transition-colors ${
                    toolSettings.symbolSize === size.value
                      ? 'bg-office-accent text-white border-office-accent'
                      : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                  }`}
                  onClick={() => setToolSettings({ symbolSize: size.value })}
                >
                  {t(size.labelKey)}
                </button>
              ))}
            </div>
            {/* Rotation controls */}
            <div className="mt-2">
              <label className="block text-xs text-office-text-secondary mb-1">
                Rotation ({Math.round(toolSettings.symbolRotation)}°)
              </label>
              <div className="flex gap-1">
                <button
                  className="flex-1 px-2 py-1.5 text-xs border rounded-sm bg-white border-office-border hover:bg-office-ribbon-hover"
                  onClick={() => rotateSymbol(-45)}
                  title="Rotate -45°"
                >
                  -45°
                </button>
                <button
                  className="flex-1 px-2 py-1.5 text-xs border rounded-sm bg-white border-office-border hover:bg-office-ribbon-hover"
                  onClick={resetRotation}
                  title="Reset rotation"
                >
                  Reset
                </button>
                <button
                  className="flex-1 px-2 py-1.5 text-xs border rounded-sm bg-white border-office-border hover:bg-office-ribbon-hover"
                  onClick={() => rotateSymbol(45)}
                  title="Rotate +45°"
                >
                  +45°
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Number settings - size and position */}
        {!isGridMode && toolSettings.currentCategory === 'number' && toolSettings.currentTool !== 'number-directional' && (
          <NumberPositionSettings />
        )}

        {/* Arrow direction settings for directional numbers */}
        {!isGridMode && toolSettings.currentTool === 'number-directional' && (
          <ArrowDirectionSettings />
        )}

        {/* Multicolor surface settings */}
        {!isGridMode && toolSettings.currentTool === 'multicolor-surface' && (
          <MulticolorSettings />
        )}
      </div>

      {/* Symbol Panel - show when symbol category selected */}
      {!isGridMode && toolSettings.currentCategory === 'symbol' && <SymbolPanel />}
    </div>
  );
};

// Arrow direction settings for directional numbers (Yajilin-style)
const ArrowDirectionSettings: React.FC = () => {
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

// Color selector component with custom color picker and eyedropper
const ColorSelector: React.FC = () => {
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

  const [customColor, setCustomColor] = useState(toolSettings.color);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // Find existing number at current position (for position-specific updates)
  const findExistingNumberAtPosition = () => {
    if (!numberSelection) return null;
    const cellId = `cell-${numberSelection.row}-${numberSelection.col}`;
    const numbers = puzzle[activeLayer].numbers;
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
        const existingEntry = Object.entries(puzzle[activeLayer].directionalClues || {}).find(
          ([, c]) => c.cell === cellIndex
        );
        if (existingEntry) {
          const [, existing] = existingEntry;
          addDirectionalClue({
            cell: cellIndex,
            direction: existing.direction,
            value: existing.value,
            color: newColor,
            layer: activeLayer,
          });
        }
      } else {
        // Update normal number color at current position
        const position = toolSettings.numberPosition;

        if (position === 'candidates') {
          // Update all candidates in the cell
          const candidates = Object.entries(puzzle[activeLayer].numbers).filter(
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
              layer: activeLayer,
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
              layer: activeLayer,
            });
          }
        }
      }
    }
  }, [numberSelection, toolSettings, grid, puzzle, activeLayer, addNumber, addDirectionalClue, setToolSettings]);

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

// Position icons as SVG components
const PositionIconCenter: React.FC<{ active?: boolean }> = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    <rect x="3" y="3" width="10" height="10" fill={active ? 'white' : 'currentColor'} />
  </svg>
);

const PositionIconCorner: React.FC<{ active?: boolean }> = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    <rect x="1" y="1" width="6" height="6" fill={active ? 'white' : 'currentColor'} />
    <rect x="9" y="1" width="6" height="6" fill={active ? 'white' : 'currentColor'} />
    <rect x="1" y="9" width="6" height="6" fill={active ? 'white' : 'currentColor'} />
    <rect x="9" y="9" width="6" height="6" fill={active ? 'white' : 'currentColor'} />
  </svg>
);

const PositionIconSide: React.FC<{ active?: boolean }> = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    <rect x="5" y="0" width="6" height="5" fill={active ? 'white' : 'currentColor'} />
    <rect x="11" y="5" width="5" height="6" fill={active ? 'white' : 'currentColor'} />
    <rect x="5" y="11" width="6" height="5" fill={active ? 'white' : 'currentColor'} />
    <rect x="0" y="5" width="5" height="6" fill={active ? 'white' : 'currentColor'} />
  </svg>
);

const PositionIconCandidates: React.FC<{ active?: boolean }> = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    {[0, 1, 2].map(row =>
      [0, 1, 2].map(col => (
        <rect
          key={`${row}-${col}`}
          x={1 + col * 5}
          y={1 + row * 5}
          width="4"
          height="4"
          fill={active ? 'white' : 'currentColor'}
        />
      ))
    )}
  </svg>
);

// Candidates selector component - shows and toggles candidates in selected cell
const CandidatesSelector: React.FC = () => {
  const { t } = useTranslation();
  const {
    toolSettings,
    numberSelection,
    puzzle,
    activeLayer,
    addNumber,
    removeNumber,
  } = usePuzzleStore();

  // Get existing candidates in selected cell
  const getCellCandidates = (): Set<number> => {
    if (!numberSelection) return new Set();
    const cellId = `cell-${numberSelection.row}-${numberSelection.col}`;
    const numbers = puzzle[activeLayer].numbers;
    const candidates = new Set<number>();

    Object.values(numbers).forEach((n) => {
      if (n.cellId === cellId && n.position === 'candidates' && n.value) {
        const num = parseInt(n.value, 10);
        if (num >= 1 && num <= 9) {
          candidates.add(num);
        }
      }
    });

    return candidates;
  };

  const cellCandidates = getCellCandidates();

  const handleToggleCandidate = (n: number) => {
    if (!numberSelection) return;
    const cellId = `cell-${numberSelection.row}-${numberSelection.col}`;
    const numbers = puzzle[activeLayer].numbers;

    // Find existing candidate
    const existingEntry = Object.entries(numbers).find(
      ([, num]) => num.cellId === cellId && num.position === 'candidates' && num.value === String(n)
    );

    if (existingEntry) {
      // Remove existing
      removeNumber(existingEntry[0]);
    } else {
      // Add new candidate
      addNumber({
        cellId,
        value: String(n),
        size: toolSettings.numberSize,
        position: 'candidates',
        cornerIndex: 0,
        sideIndex: 0,
        color: toolSettings.color,
        layer: activeLayer,
      });
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-office-text-secondary text-center">
        {numberSelection ? t('tool.number.selectCandidates') : t('tool.number.noCandidatesSelected')}
      </span>
      <div className="grid grid-cols-3 gap-0.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
          const selected = cellCandidates.has(n);
          return (
            <button
              key={n}
              className={`w-6 h-6 text-xs border rounded-sm transition-colors ${
                selected
                  ? 'bg-office-accent text-white border-office-accent'
                  : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => handleToggleCandidate(n)}
              disabled={!numberSelection}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Number position settings component with visual grid selector
const NumberPositionSettings: React.FC = () => {
  const { t } = useTranslation();
  const {
    toolSettings,
    setToolSettings,
    numberSelection,
    puzzle,
    activeLayer,
    addNumber,
  } = usePuzzleStore();

  const sizes: { value: 'large' | 'medium' | 'small'; labelKey: string }[] = [
    { value: 'large', labelKey: 'size.large' },
    { value: 'medium', labelKey: 'size.medium' },
    { value: 'small', labelKey: 'size.small' },
  ];

  const positions: { id: 'center' | 'corner' | 'side' | 'candidates'; labelKey: string }[] = [
    { id: 'center', labelKey: 'tool.number.center' },
    { id: 'corner', labelKey: 'tool.number.corner' },
    { id: 'side', labelKey: 'tool.number.side' },
    { id: 'candidates', labelKey: 'tool.number.candidates' },
  ];

  const getPositionIcon = (id: string, active: boolean) => {
    switch (id) {
      case 'center': return <PositionIconCenter active={active} />;
      case 'corner': return <PositionIconCorner active={active} />;
      case 'side': return <PositionIconSide active={active} />;
      case 'candidates': return <PositionIconCandidates active={active} />;
      default: return null;
    }
  };

  const corners = [
    { idx: 0, labelKey: 'position.topLeft', pos: 'top-0 left-0' },
    { idx: 1, labelKey: 'position.topRight', pos: 'top-0 right-0' },
    { idx: 2, labelKey: 'position.bottomLeft', pos: 'bottom-0 left-0' },
    { idx: 3, labelKey: 'position.bottomRight', pos: 'bottom-0 right-0' },
  ];

  const sides = [
    { idx: 0, labelKey: 'position.top', pos: 'top-0 left-1/2 -translate-x-1/2' },
    { idx: 1, labelKey: 'position.right', pos: 'top-1/2 right-0 -translate-y-1/2' },
    { idx: 2, labelKey: 'position.bottom', pos: 'bottom-0 left-1/2 -translate-x-1/2' },
    { idx: 3, labelKey: 'position.left', pos: 'top-1/2 left-0 -translate-y-1/2' },
  ];

  // Find existing number at current position
  const findExistingNumber = () => {
    if (!numberSelection) return null;
    const cellId = `cell-${numberSelection.row}-${numberSelection.col}`;
    const numbers = puzzle[activeLayer].numbers;
    const position = toolSettings.numberPosition;
    const cornerIndex = toolSettings.cornerIndex;
    const sideIndex = toolSettings.sideIndex;

    return Object.entries(numbers).find(([, n]) => {
      if (n.cellId !== cellId) return false;
      if (position === 'center') return n.position === 'center';
      if (position === 'corner') return n.position === 'corner' && n.cornerIndex === cornerIndex;
      if (position === 'side') return n.position === 'side' && n.sideIndex === sideIndex;
      return false;
    });
  };

  // Update existing number size
  const handleSizeChange = (newSize: 'large' | 'medium' | 'small') => {
    setToolSettings({ numberSize: newSize });

    const existingEntry = findExistingNumber();
    if (existingEntry) {
      const [, existing] = existingEntry;
      addNumber({
        cellId: existing.cellId,
        value: existing.value,
        size: newSize,
        position: existing.position,
        cornerIndex: existing.cornerIndex,
        sideIndex: existing.sideIndex,
        color: existing.color,
        layer: activeLayer,
      });
    }
  };

  return (
    <div className="space-y-3">
      {/* Number Size */}
      <div>
        <label className="block text-xs text-office-text-secondary mb-1">
          {t('prop.size')}
        </label>
        <div className="flex gap-1">
          {sizes.map((size) => (
            <button
              key={size.value}
              className={`flex-1 px-2 py-1.5 text-xs border rounded-sm transition-colors ${
                toolSettings.numberSize === size.value
                  ? 'bg-office-accent text-white border-office-accent'
                  : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => handleSizeChange(size.value)}
            >
              {t(size.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Number Position */}
      <div>
        <label className="block text-xs text-office-text-secondary mb-1">
          {t('prop.position') || 'Position'}
        </label>
        <div className="flex gap-1 mb-2">
          {positions.map((pos) => {
            const isActive = toolSettings.numberPosition === pos.id;
            return (
              <button
                key={pos.id}
                className={`flex-1 px-2 py-1.5 border rounded-sm transition-colors flex items-center justify-center ${
                  isActive
                    ? 'bg-office-accent text-white border-office-accent'
                    : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                }`}
                onClick={() => setToolSettings({ numberPosition: pos.id })}
                title={t(pos.labelKey)}
              >
                {getPositionIcon(pos.id, isActive)}
              </button>
            );
          })}
        </div>

        {/* Visual grid selector for corner/side */}
        <div className="flex justify-center">
          {/* Corner index selector */}
          {toolSettings.numberPosition === 'corner' && (
            <div className="relative w-16 h-16 border border-office-border bg-white">
              {corners.map((c) => (
                <button
                  key={c.idx}
                  className={`absolute w-6 h-6 text-[10px] border rounded-sm ${c.pos} ${
                    toolSettings.cornerIndex === c.idx
                      ? 'bg-office-accent text-white border-office-accent'
                      : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                  }`}
                  onClick={() => setToolSettings({ cornerIndex: c.idx })}
                  title={t(c.labelKey)}
                >
                  {t(c.labelKey)}
                </button>
              ))}
              <span className="absolute inset-0 flex items-center justify-center text-xs text-office-text-secondary pointer-events-none">
                {t('tool.number.cell')}
              </span>
            </div>
          )}

          {/* Side index selector */}
          {toolSettings.numberPosition === 'side' && (
            <div className="relative w-20 h-20 border border-office-border bg-white">
              {/* Top */}
              <button
                className={`absolute w-6 h-5 text-[10px] border rounded-sm top-0 left-1/2 -translate-x-1/2 ${
                  toolSettings.sideIndex === 0
                    ? 'bg-office-accent text-white border-office-accent'
                    : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                }`}
                onClick={() => setToolSettings({ sideIndex: 0 })}
                title={t('position.top')}
              >
                {t('position.top')}
              </button>
              {/* Right */}
              <button
                className={`absolute w-5 h-6 text-[10px] border rounded-sm top-1/2 right-0 -translate-y-1/2 ${
                  toolSettings.sideIndex === 1
                    ? 'bg-office-accent text-white border-office-accent'
                    : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                }`}
                onClick={() => setToolSettings({ sideIndex: 1 })}
                title={t('position.right')}
              >
                {t('position.right')}
              </button>
              {/* Bottom */}
              <button
                className={`absolute w-6 h-5 text-[10px] border rounded-sm bottom-0 left-1/2 -translate-x-1/2 ${
                  toolSettings.sideIndex === 2
                    ? 'bg-office-accent text-white border-office-accent'
                    : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                }`}
                onClick={() => setToolSettings({ sideIndex: 2 })}
                title={t('position.bottom')}
              >
                {t('position.bottom')}
              </button>
              {/* Left */}
              <button
                className={`absolute w-5 h-6 text-[10px] border rounded-sm top-1/2 left-0 -translate-y-1/2 ${
                  toolSettings.sideIndex === 3
                    ? 'bg-office-accent text-white border-office-accent'
                    : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                }`}
                onClick={() => setToolSettings({ sideIndex: 3 })}
                title={t('position.left')}
              >
                {t('position.left')}
              </button>
              <span className="absolute inset-0 flex items-center justify-center text-xs text-office-text-secondary pointer-events-none">
                {t('tool.number.cell')}
              </span>
            </div>
          )}

          {/* Candidates selector - shows candidates in selected cell */}
          {toolSettings.numberPosition === 'candidates' && (
            <CandidatesSelector />
          )}
        </div>
      </div>
    </div>
  );
};

// Multicolor settings component with visual preview
const MulticolorSettings: React.FC = () => {
  const { t } = useTranslation();
  const { toolSettings, setToolSettings } = usePuzzleStore();
  const [selectedSlot, setSelectedSlot] = React.useState<number | null>(null);
  const [pickerColor, setPickerColor] = React.useState('#ff00ff');

  const slots = toolSettings.multicolorSlots || [1, 0, 0, 0];
  const pattern = toolSettings.multicolorPattern || 'cross';
  const customColors = toolSettings.multicolorCustomColors || [];
  const swatches = toolSettings.multicolorSwatches || [];

  // Save current pattern as a swatch
  const saveSwatch = () => {
    const newSwatch: MulticolorSwatch = {
      id: `swatch-${Date.now()}`,
      slots: [...slots],
      pattern,
      customColors: [...customColors],
    };
    setToolSettings({
      multicolorSwatches: [...swatches, newSwatch],
    });
  };

  // Load a swatch
  const loadSwatch = (swatch: MulticolorSwatch) => {
    // Merge custom colors from swatch with current custom colors
    const newCustomColors = [...customColors];
    const colorMapping: Record<number, number> = {}; // Old index -> new index

    swatch.customColors.forEach((color, swatchIdx) => {
      const existingIdx = newCustomColors.indexOf(color);
      if (existingIdx >= 0) {
        colorMapping[CUSTOM_COLOR_START_IDX + swatchIdx] = CUSTOM_COLOR_START_IDX + existingIdx;
      } else {
        newCustomColors.push(color);
        colorMapping[CUSTOM_COLOR_START_IDX + swatchIdx] = CUSTOM_COLOR_START_IDX + newCustomColors.length - 1;
      }
    });

    // Map slot indices to account for merged custom colors
    const newSlots = swatch.slots.map(slot => {
      if (slot >= CUSTOM_COLOR_START_IDX && colorMapping[slot] !== undefined) {
        return colorMapping[slot];
      }
      return slot;
    });

    setToolSettings({
      multicolorSlots: newSlots,
      multicolorPattern: swatch.pattern,
      multicolorCustomColors: newCustomColors,
    });
  };

  // Delete a swatch
  const deleteSwatch = (id: string) => {
    setToolSettings({
      multicolorSwatches: swatches.filter(s => s.id !== id),
    });
  };

  // Rotate slots left (counter-clockwise)
  const rotateLeft = () => {
    // For cross pattern (quadrants): 0=TL, 1=TR, 2=BL, 3=BR
    // Rotate left: TL->BL, TR->TL, BR->TR, BL->BR => [1, 3, 0, 2] maps from old
    // For x pattern (triangles): 0=TL, 1=TR, 2=BR, 3=BL
    // Rotate left: each shifts clockwise in visual position
    if (pattern === 'cross') {
      // Quadrants rotate: [0,1,2,3] -> [1,3,0,2]
      const newSlots = [slots[1], slots[3], slots[0], slots[2]];
      setToolSettings({ multicolorSlots: newSlots });
    } else {
      // X triangles rotate: [0,1,2,3] -> [1,2,3,0]
      const newSlots = [slots[1], slots[2], slots[3], slots[0]];
      setToolSettings({ multicolorSlots: newSlots });
    }
  };

  // Rotate slots right (clockwise)
  const rotateRight = () => {
    if (pattern === 'cross') {
      // Quadrants rotate: [0,1,2,3] -> [2,0,3,1]
      const newSlots = [slots[2], slots[0], slots[3], slots[1]];
      setToolSettings({ multicolorSlots: newSlots });
    } else {
      // X triangles rotate: [0,1,2,3] -> [3,0,1,2]
      const newSlots = [slots[3], slots[0], slots[1], slots[2]];
      setToolSettings({ multicolorSlots: newSlots });
    }
  };

  const setSlotColor = (slotIndex: number, colorIndex: number) => {
    const newSlots = [...slots];
    newSlots[slotIndex] = colorIndex;
    setToolSettings({ multicolorSlots: newSlots });
  };

  const addCustomColor = () => {
    const newCustomColors = [...customColors, pickerColor];
    setToolSettings({ multicolorCustomColors: newCustomColors });
    // Select the newly added color for the current slot
    if (selectedSlot !== null) {
      setSlotColor(selectedSlot, CUSTOM_COLOR_START_IDX + newCustomColors.length - 1);
    }
  };

  const removeCustomColor = (index: number) => {
    const colorIdxToRemove = CUSTOM_COLOR_START_IDX + index;
    const newCustomColors = customColors.filter((_, i) => i !== index);

    // Update slots that use this or higher custom color indices
    const newSlots = slots.map(slot => {
      if (slot === colorIdxToRemove) return 0; // Reset to transparent
      if (slot > colorIdxToRemove) return slot - 1; // Shift down
      return slot;
    });

    setToolSettings({
      multicolorCustomColors: newCustomColors,
      multicolorSlots: newSlots
    });
  };

  const getColorForIdx = (idx: number): string => {
    if (idx >= CUSTOM_COLOR_START_IDX) {
      const customIdx = idx - CUSTOM_COLOR_START_IDX;
      if (customIdx < customColors.length) {
        return customColors[customIdx];
      }
    }
    const found = MULTICOLOR_PALETTE.find(c => c.idx === idx);
    return found ? found.color : 'transparent';
  };

  // SVG paths for each section
  const size = 80;
  const cx = size / 2;
  const cy = size / 2;

  const getSectionPath = (section: number): string => {
    if (pattern === 'x') {
      // X pattern: corner triangles (diagonals divide cell)
      // 0=top-left, 1=top-right, 2=bottom-right, 3=bottom-left
      switch (section) {
        case 0: return `M 0 0 L ${cx} ${cy} L 0 ${size} Z`; // Top-left triangle
        case 1: return `M 0 0 L ${size} 0 L ${cx} ${cy} Z`; // Top-right triangle
        case 2: return `M ${size} 0 L ${size} ${size} L ${cx} ${cy} Z`; // Bottom-right triangle
        case 3: return `M ${size} ${size} L 0 ${size} L ${cx} ${cy} Z`; // Bottom-left triangle
        default: return '';
      }
    }
    // Cross (+) pattern: quadrants (horizontal/vertical divide cell)
    // 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right
    switch (section) {
      case 0: return `M 0 0 L ${cx} 0 L ${cx} ${cy} L 0 ${cy} Z`; // Top-left quadrant
      case 1: return `M ${cx} 0 L ${size} 0 L ${size} ${cy} L ${cx} ${cy} Z`; // Top-right quadrant
      case 2: return `M 0 ${cy} L ${cx} ${cy} L ${cx} ${size} L 0 ${size} Z`; // Bottom-left quadrant
      case 3: return `M ${cx} ${cy} L ${size} ${cy} L ${size} ${size} L ${cx} ${size} Z`; // Bottom-right quadrant
      default: return '';
    }
  };

  return (
    <div>
      <label className="block text-xs text-office-text-secondary mb-2">
        {t('tool.multicolor')}
      </label>

      {/* Interactive Preview - click sections to select, shows actual result */}
      <div className="flex justify-center mb-3">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="border border-office-border rounded cursor-pointer"
          style={{ background: '#f5f5f5' }}
        >
          {/* Checkered background for transparency */}
          <defs>
            <pattern id="checkered" width="10" height="10" patternUnits="userSpaceOnUse">
              <rect width="5" height="5" fill="#ddd" />
              <rect x="5" y="5" width="5" height="5" fill="#ddd" />
            </pattern>
          </defs>
          <rect width={size} height={size} fill="url(#checkered)" />

          {/* Sections (quadrants for cross, triangles for x) */}
          {[0, 1, 2, 3].map((section) => {
            const color = getColorForIdx(slots[section]);
            const isSelected = selectedSlot === section;
            return (
              <path
                key={section}
                d={getSectionPath(section)}
                fill={color === 'transparent' ? 'transparent' : color}
                stroke={isSelected ? '#0078d7' : '#999'}
                strokeWidth={isSelected ? 2 : 0.5}
                onClick={() => setSelectedSlot(section)}
                className="cursor-pointer hover:opacity-80"
              />
            );
          })}

          {/* Center divider lines */}
          {pattern === 'cross' ? (
            <>
              <line x1={cx} y1="0" x2={cx} y2={size} stroke="#666" strokeWidth="0.5" />
              <line x1="0" y1={cy} x2={size} y2={cy} stroke="#666" strokeWidth="0.5" />
            </>
          ) : (
            <>
              <line x1="0" y1="0" x2={size} y2={size} stroke="#666" strokeWidth="0.5" />
              <line x1={size} y1="0" x2="0" y2={size} stroke="#666" strokeWidth="0.5" />
            </>
          )}
        </svg>
      </div>

      {/* Pattern toggle and rotation buttons */}
      <div className="flex justify-center items-center gap-2 mb-3">
        {/* Rotate left button */}
        <button
          className="w-8 h-8 border rounded transition-colors flex items-center justify-center bg-white border-office-border hover:bg-office-ribbon-hover"
          onClick={rotateLeft}
          title="Rotate left"
        >
          <RotateCcw size={16} />
        </button>

        {/* Pattern toggle buttons */}
        <button
          className={`w-8 h-8 border rounded transition-colors flex items-center justify-center ${
            pattern === 'cross'
              ? 'bg-office-accent text-white border-office-accent'
              : 'bg-white border-office-border hover:bg-office-ribbon-hover'
          }`}
          onClick={() => setToolSettings({ multicolorPattern: 'cross' })}
          title="+ pattern"
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="2" />
            <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
        <button
          className={`w-8 h-8 border rounded transition-colors flex items-center justify-center ${
            pattern === 'x'
              ? 'bg-office-accent text-white border-office-accent'
              : 'bg-white border-office-border hover:bg-office-ribbon-hover'
          }`}
          onClick={() => setToolSettings({ multicolorPattern: 'x' })}
          title="× pattern"
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" strokeWidth="2" />
            <line x1="13" y1="3" x2="3" y2="13" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>

        {/* Rotate right button */}
        <button
          className="w-8 h-8 border rounded transition-colors flex items-center justify-center bg-white border-office-border hover:bg-office-ribbon-hover"
          onClick={rotateRight}
          title="Rotate right"
        >
          <RotateCw size={16} />
        </button>
      </div>

      {/* Color palette - shows when a slot is selected */}
      {selectedSlot !== null && (
        <div className="border border-office-border rounded p-2 bg-gray-50">
          <div className="text-xs text-office-text-secondary mb-2">
            {pattern === 'cross'
              ? [t('tool.multicolor.slot1'), t('tool.multicolor.slot2'), t('tool.multicolor.slot3'), t('tool.multicolor.slot4')][selectedSlot]
              : [t('tool.multicolor.slot1'), t('tool.multicolor.slot2'), t('tool.multicolor.slot3'), t('tool.multicolor.slot4')][selectedSlot]
            }
          </div>
          <div className="flex gap-1 flex-wrap">
            {/* Standard palette colors */}
            {MULTICOLOR_PALETTE.map((colorInfo) => (
              <button
                key={colorInfo.idx}
                className={`w-6 h-6 border rounded-sm transition-all ${
                  slots[selectedSlot] === colorInfo.idx
                    ? 'border-office-accent border-2 scale-110'
                    : 'border-office-border hover:border-office-accent'
                } ${colorInfo.color === 'transparent' ? 'bg-checkered' : ''}`}
                style={colorInfo.color !== 'transparent' ? { backgroundColor: colorInfo.color } : undefined}
                onClick={() => setSlotColor(selectedSlot, colorInfo.idx)}
                title={colorInfo.color === 'transparent' ? 'Transparent' : colorInfo.color}
              />
            ))}
            {/* Custom colors */}
            {customColors.map((color, idx) => (
              <button
                key={`custom-${idx}`}
                className={`w-6 h-6 border rounded-sm transition-all relative group ${
                  slots[selectedSlot] === CUSTOM_COLOR_START_IDX + idx
                    ? 'border-office-accent border-2 scale-110'
                    : 'border-office-border hover:border-office-accent'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setSlotColor(selectedSlot, CUSTOM_COLOR_START_IDX + idx)}
                title={color}
              >
                {/* Delete button on hover */}
                <span
                  className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white text-[8px] rounded-full hidden group-hover:flex items-center justify-center cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeCustomColor(idx);
                  }}
                >
                  ×
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hint when no slot selected */}
      {selectedSlot === null && (
        <div className="text-xs text-office-text-secondary text-center">
          {t('tool.multicolor.clickToSelect')}
        </div>
      )}

      {/* Custom color picker - add new colors */}
      <div className="mt-3 flex items-center gap-2">
        <input
          type="color"
          value={pickerColor}
          onChange={(e) => setPickerColor(e.target.value)}
          className="w-8 h-6 border border-office-border rounded cursor-pointer"
        />
        <button
          className="px-2 py-1 text-xs border border-office-border rounded hover:bg-office-ribbon-hover"
          onClick={addCustomColor}
          title={t('action.add')}
        >
          +
        </button>
        <span className="text-xs text-office-text-secondary flex-1">
          {customColors.length > 0 && `${customColors.length} ${t('prop.customColor')}`}
        </span>
      </div>

      {/* Swatches section */}
      <div className="mt-3 border-t border-office-border pt-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-office-text-secondary">
            {t('tool.multicolor.swatches')}
          </label>
          <button
            className="px-2 py-1 text-xs border border-office-border rounded hover:bg-office-ribbon-hover"
            onClick={saveSwatch}
            title={t('action.add')}
          >
            {t('action.add')}
          </button>
        </div>

        {/* Swatch grid - default patterns first, then user patterns */}
        <div className="flex flex-wrap gap-1">
          {/* Default patterns (not deletable) */}
          {DEFAULT_PATTERNS.map((swatch) => (
            <SwatchPreview
              key={swatch.id}
              swatch={swatch}
              onClick={() => loadSwatch(swatch)}
              onDelete={undefined}
            />
          ))}
          {/* User-saved patterns (deletable) */}
          {swatches.map((swatch) => (
            <SwatchPreview
              key={swatch.id}
              swatch={swatch}
              onClick={() => loadSwatch(swatch)}
              onDelete={() => deleteSwatch(swatch.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Mini swatch preview component
const SwatchPreview: React.FC<{
  swatch: MulticolorSwatch;
  onClick: () => void;
  onDelete?: () => void;
}> = ({ swatch, onClick, onDelete }) => {
  const size = 24;
  const cx = size / 2;
  const cy = size / 2;

  const getColorForSwatchIdx = (idx: number): string => {
    if (idx >= CUSTOM_COLOR_START_IDX) {
      const customIdx = idx - CUSTOM_COLOR_START_IDX;
      if (customIdx < swatch.customColors.length) {
        return swatch.customColors[customIdx];
      }
    }
    const found = MULTICOLOR_PALETTE.find(c => c.idx === idx);
    return found ? found.color : 'transparent';
  };

  const getSectionPath = (section: number): string => {
    if (swatch.pattern === 'x') {
      switch (section) {
        case 0: return `M 0 0 L ${cx} ${cy} L 0 ${size} Z`;
        case 1: return `M 0 0 L ${size} 0 L ${cx} ${cy} Z`;
        case 2: return `M ${size} 0 L ${size} ${size} L ${cx} ${cy} Z`;
        case 3: return `M ${size} ${size} L 0 ${size} L ${cx} ${cy} Z`;
        default: return '';
      }
    }
    switch (section) {
      case 0: return `M 0 0 L ${cx} 0 L ${cx} ${cy} L 0 ${cy} Z`;
      case 1: return `M ${cx} 0 L ${size} 0 L ${size} ${cy} L ${cx} ${cy} Z`;
      case 2: return `M 0 ${cy} L ${cx} ${cy} L ${cx} ${size} L 0 ${size} Z`;
      case 3: return `M ${cx} ${cy} L ${size} ${cy} L ${size} ${size} L ${cx} ${size} Z`;
      default: return '';
    }
  };

  return (
    <div className="relative group">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="border border-office-border rounded cursor-pointer hover:border-office-accent transition-colors"
        onClick={onClick}
      >
        <defs>
          <pattern id={`checkered-${swatch.id}`} width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="2" height="2" fill="#ddd" />
            <rect x="2" y="2" width="2" height="2" fill="#ddd" />
          </pattern>
        </defs>
        <rect width={size} height={size} fill={`url(#checkered-${swatch.id})`} />
        {[0, 1, 2, 3].map((section) => {
          const color = getColorForSwatchIdx(swatch.slots[section]);
          return (
            <path
              key={section}
              d={getSectionPath(section)}
              fill={color === 'transparent' ? 'transparent' : color}
            />
          );
        })}
      </svg>
      {/* Delete button on hover (only for user-saved patterns) */}
      {onDelete && (
        <span
          className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white text-[8px] rounded-full hidden group-hover:flex items-center justify-center cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          ×
        </span>
      )}
    </div>
  );
};

// Group freehand lines by strokeId
interface FreehandStroke {
  strokeId: string;
  lines: LineElement[];
  color: string;
  style: string;
  thickness: string;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

// Freehand line list component - shows list of strokes that can be deleted
const FreehandLineList: React.FC = () => {
  const { t } = useTranslation();
  const { puzzle, activeLayer, removeLine } = usePuzzleStore();

  // Get all freehand lines grouped by strokeId
  const strokes = React.useMemo(() => {
    const layerData = puzzle[activeLayer];
    const freeLines = Object.values(layerData.lines).filter((line: LineElement) => line.isFree);

    // Group lines by strokeId
    const strokeMap = new Map<string, LineElement[]>();
    freeLines.forEach((line) => {
      const sid = line.strokeId || line.id; // Fallback to id for legacy lines
      if (!strokeMap.has(sid)) {
        strokeMap.set(sid, []);
      }
      strokeMap.get(sid)!.push(line);
    });

    // Convert to stroke objects with bounds calculation
    const result: FreehandStroke[] = [];
    strokeMap.forEach((lines, strokeId) => {
      // Calculate bounding box for the stroke
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      lines.forEach((line) => {
        if (line.fromX !== undefined && line.fromY !== undefined &&
            line.toX !== undefined && line.toY !== undefined) {
          minX = Math.min(minX, line.fromX, line.toX);
          minY = Math.min(minY, line.fromY, line.toY);
          maxX = Math.max(maxX, line.fromX, line.toX);
          maxY = Math.max(maxY, line.fromY, line.toY);
        }
      });

      result.push({
        strokeId,
        lines,
        color: lines[0].color,
        style: lines[0].style,
        thickness: lines[0].thickness,
        bounds: { minX, minY, maxX, maxY },
      });
    });

    return result;
  }, [puzzle, activeLayer]);

  // Delete all lines in a stroke
  const deleteStroke = (stroke: FreehandStroke) => {
    stroke.lines.forEach((line) => removeLine(line.id));
  };

  if (strokes.length === 0) {
    return (
      <div className="text-xs text-office-text-secondary text-center py-2">
        {t('tool.line.freehand.noLines')}
      </div>
    );
  }

  return (
    <div className="border-t border-office-border pt-2 mt-2">
      <label className="block text-xs text-office-text-secondary mb-2">
        {t('tool.line.freehand.list')} ({strokes.length})
      </label>
      <div className="max-h-40 overflow-y-auto space-y-1">
        {strokes.map((stroke, index) => {
          // Calculate SVG viewBox to show the stroke
          const padding = 2;
          const width = stroke.bounds.maxX - stroke.bounds.minX;
          const height = stroke.bounds.maxY - stroke.bounds.minY;
          const viewBox = `${stroke.bounds.minX - padding} ${stroke.bounds.minY - padding} ${Math.max(width + padding * 2, 10)} ${Math.max(height + padding * 2, 10)}`;

          return (
            <div
              key={stroke.strokeId}
              className="flex items-center justify-between p-1.5 bg-gray-50 rounded border border-office-border group hover:bg-gray-100"
            >
              <div className="flex items-center gap-2">
                {/* Thumbnail preview of the stroke */}
                <svg
                  width="40"
                  height="24"
                  viewBox={viewBox}
                  preserveAspectRatio="xMidYMid meet"
                  className="bg-white rounded border border-gray-200"
                >
                  {stroke.lines.map((line) => (
                    line.fromX !== undefined && line.fromY !== undefined &&
                    line.toX !== undefined && line.toY !== undefined && (
                      <line
                        key={line.id}
                        x1={line.fromX}
                        y1={line.fromY}
                        x2={line.toX}
                        y2={line.toY}
                        stroke={line.color}
                        strokeWidth={line.thickness === 'thinnest' ? 1 : line.thickness === 'thin' ? 2 : line.thickness === 'thick' ? 5 : line.thickness === 'thickest' ? 8 : 3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={line.style === 'dashed' ? '4,2' : line.style === 'dotted' ? '1,2' : undefined}
                      />
                    )
                  ))}
                </svg>
                <span className="text-[10px] text-office-text-secondary">#{index + 1}</span>
                <span className="text-[10px] text-gray-400">({stroke.lines.length})</span>
              </div>
              {/* Delete button */}
              <button
                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                onClick={() => deleteStroke(stroke)}
                title={t('action.delete')}
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Grid properties panel component
const GridPropertiesPanel: React.FC = () => {
  const { t } = useTranslation();
  const { grid, setGrid } = usePuzzleStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert(t('error.invalidImageFile') || 'Please select an image file');
      return;
    }

    // Read file as data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setGrid({
        backgroundImage: dataUrl,
        backgroundOpacity: grid.backgroundOpacity ?? 0.5,
        backgroundFit: grid.backgroundFit ?? 'contain',
        backgroundScale: grid.backgroundScale ?? 1,
        backgroundTile: grid.backgroundTile ?? false,
      });
    };
    reader.readAsDataURL(file);
  }, [setGrid, grid.backgroundOpacity, grid.backgroundFit, grid.backgroundScale, grid.backgroundTile, t]);

  const handleOpacityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const opacity = parseFloat(e.target.value);
    setGrid({ backgroundOpacity: opacity });
  }, [setGrid]);

  const handleScaleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const scale = parseFloat(e.target.value);
    setGrid({ backgroundScale: scale });
  }, [setGrid]);

  const handleOffsetChange = useCallback((axis: 'X' | 'Y', value: number) => {
    if (axis === 'X') {
      setGrid({ backgroundOffsetX: value });
    } else {
      setGrid({ backgroundOffsetY: value });
    }
  }, [setGrid]);

  const handleRemoveImage = useCallback(() => {
    setGrid({
      backgroundImage: undefined,
      backgroundOpacity: undefined,
      backgroundFit: undefined,
      backgroundScale: undefined,
      backgroundTile: undefined,
      backgroundOffsetX: undefined,
      backgroundOffsetY: undefined,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [setGrid]);

  const fitModes: { value: 'contain' | 'cover' | 'fill' | 'none'; labelKey: string }[] = [
    { value: 'contain', labelKey: 'grid.fit.contain' },
    { value: 'cover', labelKey: 'grid.fit.cover' },
    { value: 'fill', labelKey: 'grid.fit.fill' },
    { value: 'none', labelKey: 'grid.fit.none' },
  ];

  const handlePaddingChange = useCallback((side: 'Top' | 'Bottom' | 'Left' | 'Right', value: number) => {
    const key = `exportPadding${side}` as const;
    setGrid({ [key]: value });
  }, [setGrid]);

  const handleCellSizeChange = useCallback((delta: number) => {
    const newSize = Math.max(10, Math.min(100, grid.cellSize + delta));
    setGrid({ cellSize: newSize });
  }, [grid.cellSize, setGrid]);

  return (
    <div className="space-y-2">
      {/* Cell Size */}
      <div>
        <label className="block text-xs text-office-text-secondary mb-1">
          {t('grid.cellSize')}
        </label>
        <div className="flex gap-1 items-center">
          <button
            className="w-6 h-5 text-xs border border-office-border rounded-sm hover:bg-office-ribbon-hover"
            onClick={() => handleCellSizeChange(-1)}
          >
            -
          </button>
          <input
            type="number"
            value={grid.cellSize}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 10;
              setGrid({ cellSize: Math.max(10, Math.min(100, val)) });
            }}
            className="w-14 h-5 px-1 text-[10px] border border-office-border rounded-sm text-center"
          />
          <button
            className="w-6 h-5 text-xs border border-office-border rounded-sm hover:bg-office-ribbon-hover"
            onClick={() => handleCellSizeChange(1)}
          >
            +
          </button>
          <span className="text-[10px] text-office-text-secondary">px</span>
        </div>
      </div>

      {/* Export Padding - two rows */}
      <div>
        <label className="block text-xs text-office-text-secondary mb-1">
          {t('grid.exportPadding')}
        </label>
        <div className="flex flex-col gap-1">
          <div className="flex gap-1 items-center">
            <span className="text-[10px] text-office-text-secondary w-4">{t('grid.paddingTop')}</span>
            <input
              type="number"
              value={grid.exportPaddingTop ?? 0}
              onChange={(e) => handlePaddingChange('Top', parseInt(e.target.value) || 0)}
              className="w-14 h-5 px-1 text-[10px] border border-office-border rounded-sm text-center"
            />
            <span className="text-[10px] text-office-text-secondary w-4 ml-1">{t('grid.paddingBottom')}</span>
            <input
              type="number"
              value={grid.exportPaddingBottom ?? 0}
              onChange={(e) => handlePaddingChange('Bottom', parseInt(e.target.value) || 0)}
              className="w-14 h-5 px-1 text-[10px] border border-office-border rounded-sm text-center"
            />
          </div>
          <div className="flex gap-1 items-center">
            <span className="text-[10px] text-office-text-secondary w-4">{t('grid.paddingLeft')}</span>
            <input
              type="number"
              value={grid.exportPaddingLeft ?? 0}
              onChange={(e) => handlePaddingChange('Left', parseInt(e.target.value) || 0)}
              className="w-14 h-5 px-1 text-[10px] border border-office-border rounded-sm text-center"
            />
            <span className="text-[10px] text-office-text-secondary w-4 ml-1">{t('grid.paddingRight')}</span>
            <input
              type="number"
              value={grid.exportPaddingRight ?? 0}
              onChange={(e) => handlePaddingChange('Right', parseInt(e.target.value) || 0)}
              className="w-14 h-5 px-1 text-[10px] border border-office-border rounded-sm text-center"
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-office-border" />

      {/* Background Image */}
      <div>
        <label className="block text-xs text-office-text-secondary mb-1">
          {t('grid.backgroundImage')}
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
        <div className="flex gap-1">
          <button
            className="flex-1 px-2 py-1.5 text-xs border border-office-border rounded-sm hover:bg-office-ribbon-hover"
            onClick={() => fileInputRef.current?.click()}
          >
            {t('grid.selectImage')}
          </button>
          {grid.backgroundImage && (
            <button
              className="px-2 py-1.5 text-xs border border-office-border rounded-sm hover:bg-red-50 hover:border-red-300 text-red-600"
              onClick={handleRemoveImage}
              title={t('action.delete')}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
        {grid.backgroundImage && (
          <div className="mt-2">
            <img
              src={grid.backgroundImage}
              alt="Background preview"
              className="w-full h-20 object-contain border border-office-border rounded-sm bg-gray-100"
            />
          </div>
        )}
      </div>

      {/* Image options - only show when image is set */}
      {grid.backgroundImage && (
        <>
          {/* Fit mode */}
          <div>
            <label className="block text-xs text-office-text-secondary mb-1">
              {t('grid.fit')}
            </label>
            <div className="flex gap-0.5 flex-wrap">
              {fitModes.map((mode) => (
                <button
                  key={mode.value}
                  className={`px-2 py-1 text-[10px] border rounded-sm transition-colors ${
                    (grid.backgroundFit ?? 'contain') === mode.value
                      ? 'bg-office-accent text-white border-office-accent'
                      : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                  }`}
                  onClick={() => setGrid({ backgroundFit: mode.value })}
                >
                  {t(mode.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Tile option */}
          <div>
            <label className="flex items-center gap-2 text-xs text-office-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={grid.backgroundTile ?? false}
                onChange={(e) => setGrid({ backgroundTile: e.target.checked })}
                className="rounded border-office-border"
              />
              {t('grid.tile')}
            </label>
          </div>

          {/* Scale slider - only show when not tiling or fit is 'none' */}
          {(grid.backgroundFit === 'none' || grid.backgroundTile) && (
            <div>
              <label className="block text-xs text-office-text-secondary mb-1">
                {t('grid.scale')} ({Math.round((grid.backgroundScale ?? 1) * 100)}%)
              </label>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={grid.backgroundScale ?? 1}
                onChange={handleScaleChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          )}

          {/* Offset controls - only show when fit is 'none' or tiling */}
          {(grid.backgroundFit === 'none' || grid.backgroundTile) && (
            <div>
              <label className="block text-xs text-office-text-secondary mb-1">
                {t('grid.offset')}
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-office-text-secondary">X</label>
                  <input
                    type="number"
                    value={grid.backgroundOffsetX ?? 0}
                    onChange={(e) => handleOffsetChange('X', parseInt(e.target.value) || 0)}
                    className="w-full h-6 px-1 text-xs border border-office-border rounded-sm text-center"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-office-text-secondary">Y</label>
                  <input
                    type="number"
                    value={grid.backgroundOffsetY ?? 0}
                    onChange={(e) => handleOffsetChange('Y', parseInt(e.target.value) || 0)}
                    className="w-full h-6 px-1 text-xs border border-office-border rounded-sm text-center"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Opacity slider */}
          <div>
            <label className="block text-xs text-office-text-secondary mb-1">
              {t('grid.opacity')} ({Math.round((grid.backgroundOpacity ?? 0.5) * 100)}%)
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={grid.backgroundOpacity ?? 0.5}
              onChange={handleOpacityChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </>
      )}
    </div>
  );
};

