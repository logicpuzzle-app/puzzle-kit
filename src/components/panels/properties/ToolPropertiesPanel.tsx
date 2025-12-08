/**
 * Tool properties panel - line style, symbol size, rotation, etc.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../../store/puzzleStore';
import { LineStyle, LineThickness } from '../../../types';
import {
  ColorSelector,
  MulticolorSettings,
  NumberPositionSettings,
  ArrowDirectionSettings,
  NumberInputPanel,
  FreehandLineList,
} from '.';

export const ToolPropertiesPanel: React.FC = () => {
  const { t } = useTranslation();
  const { toolSettings, setToolSettings } = usePuzzleStore();

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
    <>
      {/* Color Selection - show for most tools except select */}
      {toolSettings.currentCategory !== 'select' && (
        <ColorSelector />
      )}

      {/* Line/Edge properties - toggle buttons */}
      {(toolSettings.currentCategory === 'line' ||
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

          {/* Freehand line list - only show when in freehand mode */}
          {toolSettings.currentCategory === 'line' &&
            toolSettings.lineDirections?.includes('freehand') && (
              <FreehandLineList />
            )}
        </>
      )}

      {/* Symbol size - toggle buttons */}
      {toolSettings.currentCategory === 'symbol' && (
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
                onClick={() => rotateSymbol(-15)}
                title="Rotate -15°"
              >
                -15°
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
                onClick={() => rotateSymbol(15)}
                title="Rotate +15°"
              >
                +15°
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Number settings - size and position */}
      {toolSettings.currentCategory === 'number' && toolSettings.currentTool !== 'number-directional' && (
        <>
          <NumberPositionSettings />
          <NumberInputPanel />
        </>
      )}

      {/* Arrow direction settings and number input for directional numbers */}
      {toolSettings.currentTool === 'number-directional' && (
        <>
          <ArrowDirectionSettings />
          <NumberInputPanel />
        </>
      )}

      {/* Multicolor surface settings */}
      {toolSettings.currentTool === 'multicolor-surface' && (
        <MulticolorSettings />
      )}
    </>
  );
};
