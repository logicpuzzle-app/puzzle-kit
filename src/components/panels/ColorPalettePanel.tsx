import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../store/puzzleStoreContext';
import { DEFAULT_COLORS } from '../../types';

// Penpa-compatible color palette
const SURFACE_COLORS = [
  { id: 'grey', color: '#808080', label: 'Grey' },
  { id: 'green', color: '#00C000', label: 'Green' },
  { id: 'lightgrey', color: '#C0C0C0', label: 'Light Grey' },
  { id: 'black', color: '#000000', label: 'Black' },
  { id: 'blue', color: '#0000FF', label: 'Blue' },
  { id: 'red', color: '#FF0000', label: 'Red' },
  { id: 'yellow', color: '#FFFF00', label: 'Yellow' },
  { id: 'orange', color: '#FF8000', label: 'Orange' },
  { id: 'pink', color: '#FF00FF', label: 'Pink' },
  { id: 'cyan', color: '#00FFFF', label: 'Cyan' },
  { id: 'white', color: '#FFFFFF', label: 'White' },
  { id: 'purple', color: '#8000FF', label: 'Purple' },
];

const LINE_COLORS = [
  { id: 'black', color: '#000000', label: 'Black' },
  { id: 'grey', color: '#808080', label: 'Grey' },
  { id: 'lightgrey', color: '#C0C0C0', label: 'Light Grey' },
  { id: 'red', color: '#FF0000', label: 'Red' },
  { id: 'green', color: '#00C000', label: 'Green' },
  { id: 'blue', color: '#0000FF', label: 'Blue' },
];

export const ColorPalettePanel: React.FC = () => {
  const { t } = useTranslation();
  const { toolSettings, setToolSettings } = usePuzzleStore();
  const [customColor, setCustomColor] = useState(toolSettings.color);

  const currentCategory = toolSettings.currentCategory;
  const colors = currentCategory === 'surface' ? SURFACE_COLORS : LINE_COLORS;

  const handleColorSelect = (color: string) => {
    setToolSettings({ color });
    setCustomColor(color);
  };

  const handleSecondaryColorSelect = (color: string) => {
    setToolSettings({ secondaryColor: color });
  };

  return (
    <div className="border-t border-office-border">
      <div className="panel-header">{t('panel.colors')}</div>
      <div className="p-2">
        {/* Primary color */}
        <div className="mb-3">
          <div className="text-xs text-office-text-secondary mb-1">
            {t('prop.color')}
          </div>
          <div className="grid grid-cols-6 gap-1">
            {colors.map((c) => (
              <button
                key={c.id}
                className={`w-6 h-6 border-2 rounded-sm transition-all ${
                  toolSettings.color === c.color
                    ? 'border-office-accent scale-110 ring-1 ring-office-accent'
                    : 'border-office-border hover:border-office-accent'
                }`}
                style={{ backgroundColor: c.color }}
                onClick={() => handleColorSelect(c.color)}
                title={c.label}
              />
            ))}
          </div>
        </div>

        {/* Custom color input */}
        <div className="mb-3">
          <div className="text-xs text-office-text-secondary mb-1">
            {t('prop.customColor') || 'Custom'}
          </div>
          <div className="flex gap-1">
            <input
              type="color"
              className="w-8 h-8 cursor-pointer border border-office-border rounded-sm"
              value={customColor}
              onChange={(e) => {
                setCustomColor(e.target.value);
                handleColorSelect(e.target.value);
              }}
            />
            <input
              type="text"
              className="input-office flex-1 text-xs"
              value={customColor}
              onChange={(e) => {
                setCustomColor(e.target.value);
                if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                  handleColorSelect(e.target.value);
                }
              }}
              placeholder="#RRGGBB"
            />
          </div>
        </div>

        {/* Secondary color (for surface double-click) */}
        {currentCategory === 'surface' && (
          <div className="mb-3">
            <div className="text-xs text-office-text-secondary mb-1">
              {t('prop.secondaryColor') || 'Secondary (Right-click)'}
            </div>
            <div className="grid grid-cols-6 gap-1">
              {colors.slice(0, 6).map((c) => (
                <button
                  key={c.id}
                  className={`w-6 h-6 border-2 rounded-sm transition-all ${
                    toolSettings.secondaryColor === c.color
                      ? 'border-office-accent scale-110'
                      : 'border-office-border hover:border-office-accent'
                  }`}
                  style={{ backgroundColor: c.color }}
                  onClick={() => handleSecondaryColorSelect(c.color)}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        )}

        {/* Current color preview */}
        <div className="flex items-center gap-2 p-2 bg-office-bg rounded">
          <div
            className="w-6 h-6 border border-office-border rounded"
            style={{ backgroundColor: toolSettings.color }}
          />
          <span className="text-xs text-office-text-secondary">
            {toolSettings.color}
          </span>
        </div>
      </div>
    </div>
  );
};
