import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../store/puzzleStore';
import { LineStyle, LineThickness } from '../../types';
import { SymbolPanel } from './SymbolPanel';
import {
  ColorSelector,
  MulticolorSettings,
  NumberPositionSettings,
  ArrowDirectionSettings,
  GridPropertiesPanel,
  FreehandLineList,
} from './properties';

export const PropertiesPanel: React.FC = () => {
  const { t } = useTranslation();
  const { toolSettings, setToolSettings, isGridMode, isPropertiesPanelOpen, togglePropertiesPanel } = usePuzzleStore();

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

  // Collapsed state - show only toggle button
  if (!isPropertiesPanelOpen) {
    return (
      <div className="bg-white border-l border-office-border flex flex-col h-full">
        <button
          onClick={togglePropertiesPanel}
          className="p-2 hover:bg-office-ribbon-hover transition-colors"
          title={t('panel.properties')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-56 bg-white border-l border-office-border flex flex-col h-full">
      {/* Properties header with close button */}
      <div className="panel-header flex-shrink-0 flex items-center justify-between">
        <span>{t('panel.properties')}</span>
        <button
          onClick={togglePropertiesPanel}
          className="p-1 hover:bg-office-ribbon-hover rounded transition-colors"
          title={t('action.close')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

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
