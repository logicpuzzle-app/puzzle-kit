/**
 * RibbonGridContent - Grid tab content components for the Ribbon toolbar
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../store/puzzleStore';

// Grid Type Tab Content - grid type, size, topology preset
export const GridShapeContent: React.FC = () => {
  const { t } = useTranslation();
  const { showAdjacency, setShowAdjacency, gridEditMode, setGridEditMode, previewTopology, grid } = usePuzzleStore();

  const isIsometric = grid.gridType === 'iso';

  const editModes: { id: 'preset' | 'merge' | 'split' | 'exclude' | 'sculpt'; labelKey: string; isoOnly?: boolean }[] = [
    { id: 'preset', labelKey: 'gridEdit.preset' },
    { id: 'merge', labelKey: 'gridEdit.merge' },
    { id: 'split', labelKey: 'gridEdit.split' },
    { id: 'exclude', labelKey: 'gridEdit.exclude' },
    { id: 'sculpt', labelKey: 'gridEdit.sculpt', isoOnly: true },
  ];

  // Filter modes based on grid type
  const availableModes = editModes.filter((mode) => !mode.isoOnly || isIsometric);

  // During preview, only allow preset mode (disable merge/split/exclude/sculpt)
  const isPreviewActive = previewTopology !== null;

  // Auto-switch to preset mode when preview becomes active
  React.useEffect(() => {
    if (isPreviewActive && gridEditMode !== 'preset') {
      setGridEditMode('preset');
    }
  }, [isPreviewActive, gridEditMode, setGridEditMode]);

  // Auto-switch from sculpt mode when changing away from isometric
  React.useEffect(() => {
    if (!isIsometric && gridEditMode === 'sculpt') {
      setGridEditMode('preset');
    }
  }, [isIsometric, gridEditMode, setGridEditMode]);

  return (
    <>
      {/* Grid Edit Mode toggle buttons */}
      <div className="flex items-center gap-0.5 px-2 border-r border-office-border">
        {availableModes.map((mode) => {
          const isDisabled = isPreviewActive && mode.id !== 'preset';
          return (
            <button
              key={mode.id}
              className={`px-2 py-1 text-xs border rounded-sm transition-colors ${
                gridEditMode === mode.id
                  ? 'bg-office-accent text-white border-office-accent'
                  : isDisabled
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => !isDisabled && setGridEditMode(mode.id)}
              disabled={isDisabled}
              title={isDisabled ? t('gridEdit.disabledDuringPreview') : undefined}
            >
              {t(mode.labelKey)}
            </button>
          );
        })}
      </div>

      {/* Show Adjacency checkbox */}
      <div className="flex items-center px-3">
        <label className="flex items-center gap-1.5 text-xs text-office-text cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showAdjacency}
            onChange={(e) => setShowAdjacency(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-office-border"
          />
          {t('topology.showAdjacency')}
        </label>
      </div>
    </>
  );
};

// Grid Style Tab Content - styles and colors
export const GridDisplayContent: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { grid, setGrid } = usePuzzleStore();

  return (
    <>
      {/* Grid Style */}
      <div className="flex flex-col items-center px-3 border-r border-office-border">
        <div className="flex gap-0.5 mb-1">
          {(['normal', 'thick', 'dots', 'dashed'] as const).map((style) => (
            <button
              key={style}
              className={`px-2 py-1 text-[10px] border rounded-sm transition-colors ${
                grid.gridStyle === style
                  ? 'bg-office-accent text-white border-office-accent'
                  : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => setGrid({ gridStyle: style })}
            >
              {t(`grid.style.${style}`)}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-office-text-secondary uppercase">
          {t('grid.style')}
        </span>
      </div>

      {/* Frame Style */}
      <div className="flex flex-col items-center px-3 border-r border-office-border">
        <div className="flex gap-0.5 mb-1">
          {(['normal', 'thick', 'double', 'none'] as const).map((style) => (
            <button
              key={style}
              className={`px-2 py-1 text-[10px] border rounded-sm transition-colors ${
                grid.frameStyle === style
                  ? 'bg-office-accent text-white border-office-accent'
                  : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => setGrid({ frameStyle: style })}
            >
              {t(`grid.frame.${style}`)}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-office-text-secondary uppercase">
          {t('grid.frame')}
        </span>
      </div>

      {/* Colors */}
      <div className="flex flex-col items-center px-3">
        <div className="flex gap-2 mb-1">
          <div className="flex flex-col items-center">
            <input
              type="color"
              className="w-6 h-6 cursor-pointer border border-office-border rounded"
              value={grid.backgroundColor}
              onChange={(e) => setGrid({ backgroundColor: e.target.value })}
              title={t('grid.backgroundColor')}
            />
            <span className="text-[8px] text-office-text-secondary">{i18n.language === 'ja' ? '背景' : 'BG'}</span>
          </div>
          <div className="flex flex-col items-center">
            <input
              type="color"
              className="w-6 h-6 cursor-pointer border border-office-border rounded"
              value={grid.gridColor}
              onChange={(e) => setGrid({ gridColor: e.target.value })}
              title={t('grid.gridColor')}
            />
            <span className="text-[8px] text-office-text-secondary">{i18n.language === 'ja' ? '線' : 'Line'}</span>
          </div>
          <div className="flex flex-col items-center">
            <input
              type="color"
              className="w-6 h-6 cursor-pointer border border-office-border rounded"
              value={grid.frameColor}
              onChange={(e) => setGrid({ frameColor: e.target.value })}
              title={t('grid.frameColor')}
            />
            <span className="text-[8px] text-office-text-secondary">{i18n.language === 'ja' ? '枠' : 'Frame'}</span>
          </div>
          {/* Disabled cell color - only show when there are disabled cells */}
          {grid.disabledCells && grid.disabledCells.length > 0 && (
            <div className="flex flex-col items-center">
              <input
                type="color"
                className="w-6 h-6 cursor-pointer border border-office-border rounded"
                value={grid.disabledCellColor || '#c0c0c0'}
                onChange={(e) => setGrid({ disabledCellColor: e.target.value })}
                title={t('grid.disabledCellColor')}
              />
              <span className="text-[8px] text-office-text-secondary">{i18n.language === 'ja' ? '無効' : 'Off'}</span>
            </div>
          )}
        </div>
        <span className="text-[10px] text-office-text-secondary uppercase">
          {t('panel.colors')}
        </span>
      </div>
    </>
  );
};
