import React from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw, RotateCw } from 'lucide-react';
import { usePuzzleStore } from '../../../store/puzzleStore';
import { MulticolorSwatch } from '../../../types';

// Multicolor palette - standard colors (idx 0-8)
export const MULTICOLOR_PALETTE = [
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

// Custom colors start at index 9
export const CUSTOM_COLOR_START_IDX = 9;

// Default patterns
// Pattern 'x' uses triangles: 0=left, 1=top, 2=right, 3=bottom
// Pattern 'cross' uses quadrants: 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right
// Color indices: 0=transparent, 2=grey (#999999), 3=black
export const DEFAULT_PATTERNS: MulticolorSwatch[] = [
  // === Cross (+) patterns with BLACK (idx 3) ===
  { id: 'default-cross-top-b', slots: [3, 3, 0, 0], pattern: 'cross', customColors: [] },
  { id: 'default-cross-bottom-b', slots: [0, 0, 3, 3], pattern: 'cross', customColors: [] },
  { id: 'default-cross-left-b', slots: [3, 0, 3, 0], pattern: 'cross', customColors: [] },
  { id: 'default-cross-right-b', slots: [0, 3, 0, 3], pattern: 'cross', customColors: [] },
  { id: 'default-cross-check1-b', slots: [3, 0, 0, 3], pattern: 'cross', customColors: [] },
  { id: 'default-cross-check2-b', slots: [0, 3, 3, 0], pattern: 'cross', customColors: [] },
  { id: 'default-cross-tl-b', slots: [3, 0, 0, 0], pattern: 'cross', customColors: [] },
  { id: 'default-cross-tr-b', slots: [0, 3, 0, 0], pattern: 'cross', customColors: [] },
  { id: 'default-cross-bl-b', slots: [0, 0, 3, 0], pattern: 'cross', customColors: [] },
  { id: 'default-cross-br-b', slots: [0, 0, 0, 3], pattern: 'cross', customColors: [] },
  // === Cross (+) patterns with GREY (idx 2) ===
  { id: 'default-cross-top-g', slots: [2, 2, 0, 0], pattern: 'cross', customColors: [] },
  { id: 'default-cross-bottom-g', slots: [0, 0, 2, 2], pattern: 'cross', customColors: [] },
  { id: 'default-cross-left-g', slots: [2, 0, 2, 0], pattern: 'cross', customColors: [] },
  { id: 'default-cross-right-g', slots: [0, 2, 0, 2], pattern: 'cross', customColors: [] },
  { id: 'default-cross-check1-g', slots: [2, 0, 0, 2], pattern: 'cross', customColors: [] },
  { id: 'default-cross-check2-g', slots: [0, 2, 2, 0], pattern: 'cross', customColors: [] },
  { id: 'default-cross-tl-g', slots: [2, 0, 0, 0], pattern: 'cross', customColors: [] },
  { id: 'default-cross-tr-g', slots: [0, 2, 0, 0], pattern: 'cross', customColors: [] },
  { id: 'default-cross-bl-g', slots: [0, 0, 2, 0], pattern: 'cross', customColors: [] },
  { id: 'default-cross-br-g', slots: [0, 0, 0, 2], pattern: 'cross', customColors: [] },
  // === X (diagonal) patterns with BLACK (idx 3) ===
  { id: 'default-x-half-tl-b', slots: [3, 3, 0, 0], pattern: 'x', customColors: [] },
  { id: 'default-x-half-tr-b', slots: [0, 3, 3, 0], pattern: 'x', customColors: [] },
  { id: 'default-x-half-br-b', slots: [0, 0, 3, 3], pattern: 'x', customColors: [] },
  { id: 'default-x-half-bl-b', slots: [3, 0, 0, 3], pattern: 'x', customColors: [] },
  { id: 'default-x-left-b', slots: [3, 0, 0, 0], pattern: 'x', customColors: [] },
  { id: 'default-x-top-b', slots: [0, 3, 0, 0], pattern: 'x', customColors: [] },
  { id: 'default-x-right-b', slots: [0, 0, 3, 0], pattern: 'x', customColors: [] },
  { id: 'default-x-bottom-b', slots: [0, 0, 0, 3], pattern: 'x', customColors: [] },
  // === X (diagonal) patterns with GREY (idx 2) ===
  { id: 'default-x-half-tl-g', slots: [2, 2, 0, 0], pattern: 'x', customColors: [] },
  { id: 'default-x-half-tr-g', slots: [0, 2, 2, 0], pattern: 'x', customColors: [] },
  { id: 'default-x-half-br-g', slots: [0, 0, 2, 2], pattern: 'x', customColors: [] },
  { id: 'default-x-half-bl-g', slots: [2, 0, 0, 2], pattern: 'x', customColors: [] },
  { id: 'default-x-left-g', slots: [2, 0, 0, 0], pattern: 'x', customColors: [] },
  { id: 'default-x-top-g', slots: [0, 2, 0, 0], pattern: 'x', customColors: [] },
  { id: 'default-x-right-g', slots: [0, 0, 2, 0], pattern: 'x', customColors: [] },
  { id: 'default-x-bottom-g', slots: [0, 0, 0, 2], pattern: 'x', customColors: [] },
];

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

export const MulticolorSettings: React.FC = () => {
  const { t } = useTranslation();
  const { toolSettings, setToolSettings } = usePuzzleStore();
  const [selectedSlot, setSelectedSlot] = React.useState<number | null>(null);
  const [pickerColor, setPickerColor] = React.useState('#ff00ff');

  const slots = toolSettings.multicolorSlots || [1, 0, 0, 0];
  const pattern = toolSettings.multicolorPattern || 'cross';
  const customColors = toolSettings.multicolorCustomColors || [];
  const swatches = toolSettings.multicolorSwatches || [];

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

  const loadSwatch = (swatch: MulticolorSwatch) => {
    const newCustomColors = [...customColors];
    const colorMapping: Record<number, number> = {};

    swatch.customColors.forEach((color, swatchIdx) => {
      const existingIdx = newCustomColors.indexOf(color);
      if (existingIdx >= 0) {
        colorMapping[CUSTOM_COLOR_START_IDX + swatchIdx] = CUSTOM_COLOR_START_IDX + existingIdx;
      } else {
        newCustomColors.push(color);
        colorMapping[CUSTOM_COLOR_START_IDX + swatchIdx] = CUSTOM_COLOR_START_IDX + newCustomColors.length - 1;
      }
    });

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

  const deleteSwatch = (id: string) => {
    setToolSettings({
      multicolorSwatches: swatches.filter(s => s.id !== id),
    });
  };

  const rotateLeft = () => {
    if (pattern === 'cross') {
      const newSlots = [slots[1], slots[3], slots[0], slots[2]];
      setToolSettings({ multicolorSlots: newSlots });
    } else {
      const newSlots = [slots[1], slots[2], slots[3], slots[0]];
      setToolSettings({ multicolorSlots: newSlots });
    }
  };

  const rotateRight = () => {
    if (pattern === 'cross') {
      const newSlots = [slots[2], slots[0], slots[3], slots[1]];
      setToolSettings({ multicolorSlots: newSlots });
    } else {
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
    if (selectedSlot !== null) {
      setSlotColor(selectedSlot, CUSTOM_COLOR_START_IDX + newCustomColors.length - 1);
    }
  };

  const removeCustomColor = (index: number) => {
    const colorIdxToRemove = CUSTOM_COLOR_START_IDX + index;
    const newCustomColors = customColors.filter((_, i) => i !== index);

    const newSlots = slots.map(slot => {
      if (slot === colorIdxToRemove) return 0;
      if (slot > colorIdxToRemove) return slot - 1;
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

  const size = 80;
  const cx = size / 2;
  const cy = size / 2;

  const getSectionPath = (section: number): string => {
    if (pattern === 'x') {
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
    <div>
      <label className="block text-xs text-office-text-secondary mb-2">
        {t('tool.multicolor')}
      </label>

      {/* Interactive Preview */}
      <div className="flex justify-center mb-3">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="border border-office-border rounded cursor-pointer"
          style={{ background: '#f5f5f5' }}
        >
          <defs>
            <pattern id="checkered" width="10" height="10" patternUnits="userSpaceOnUse">
              <rect width="5" height="5" fill="#ddd" />
              <rect x="5" y="5" width="5" height="5" fill="#ddd" />
            </pattern>
          </defs>
          <rect width={size} height={size} fill="url(#checkered)" />

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
        <button
          className="w-8 h-8 border rounded transition-colors flex items-center justify-center bg-white border-office-border hover:bg-office-ribbon-hover"
          onClick={rotateLeft}
          title="Rotate left"
        >
          <RotateCcw size={16} />
        </button>

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

        <button
          className="w-8 h-8 border rounded transition-colors flex items-center justify-center bg-white border-office-border hover:bg-office-ribbon-hover"
          onClick={rotateRight}
          title="Rotate right"
        >
          <RotateCw size={16} />
        </button>
      </div>

      {/* Color palette */}
      {selectedSlot !== null && (
        <div className="border border-office-border rounded p-2 bg-gray-50">
          <div className="text-xs text-office-text-secondary mb-2">
            {[t('tool.multicolor.slot1'), t('tool.multicolor.slot2'), t('tool.multicolor.slot3'), t('tool.multicolor.slot4')][selectedSlot]}
          </div>
          <div className="flex gap-1 flex-wrap">
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

      {selectedSlot === null && (
        <div className="text-xs text-office-text-secondary text-center">
          {t('tool.multicolor.clickToSelect')}
        </div>
      )}

      {/* Custom color picker */}
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

        <div className="flex flex-wrap gap-1">
          {DEFAULT_PATTERNS.map((swatch) => (
            <SwatchPreview
              key={swatch.id}
              swatch={swatch}
              onClick={() => loadSwatch(swatch)}
              onDelete={undefined}
            />
          ))}
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
