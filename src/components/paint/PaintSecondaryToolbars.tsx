import React from 'react';
import { NumericInput } from '../common';
import { HexIcon, SquareIcon } from './PaintIcons';
import type { TranslateFn } from './types';
import type { GridConfig } from '../../types';

export type PaintImageAdjustToolbarProps = {
  t: TranslateFn;
  hasImage: boolean;
  backgroundScale: number;
  backgroundOpacity: number;
  onScaleChange: (value: string) => void;
  onOpacityChange: (value: string) => void;
  onResetImage: () => void;
  onAutoPadding: () => void;
  onZoomFit: () => void;
};

export const PaintImageAdjustToolbar: React.FC<PaintImageAdjustToolbarProps> = ({
  t,
  hasImage,
  backgroundScale,
  backgroundOpacity,
  onScaleChange,
  onOpacityChange,
  onResetImage,
  onAutoPadding,
  onZoomFit,
}) => (
  <div className="flex flex-wrap items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 border-t border-office-border bg-office-bg">
    <div className="flex items-center gap-1">
      <span className="text-xs text-office-text-secondary">{t('grid.scale')}</span>
      <button
        className="h-6 w-6 text-xs border border-office-border rounded-sm hover:bg-office-ribbon-hover disabled:opacity-50"
        onClick={() => onScaleChange(String(backgroundScale - 0.05))}
        disabled={!hasImage}
        type="button"
        title={t('grid.scale')}
      >
        -
      </button>
      <NumericInput
        value={Math.round(backgroundScale * 100)}
        onChange={(value) => onScaleChange(String((value ?? 100) / 100))}
        min={25}
        max={400}
        className="w-16 h-6"
      />
      <button
        className="h-6 w-6 text-xs border border-office-border rounded-sm hover:bg-office-ribbon-hover disabled:opacity-50"
        onClick={() => onScaleChange(String(backgroundScale + 0.05))}
        disabled={!hasImage}
        type="button"
        title={t('grid.scale')}
      >
        +
      </button>
    </div>

    <div className="flex items-center gap-1">
      <span className="text-xs text-office-text-secondary">
        {t('grid.opacity')} ({Math.round(backgroundOpacity * 100)}%)
      </span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        className={`w-24 ${!hasImage ? 'opacity-50' : ''}`}
        value={backgroundOpacity}
        onChange={(event) => onOpacityChange(event.target.value)}
        disabled={!hasImage}
      />
    </div>
    <button className="btn-office" onClick={onResetImage} disabled={!hasImage}>
      {t('action.reset', 'Reset')}
    </button>
    <button className="btn-office" onClick={onAutoPadding} disabled={!hasImage}>
      {t('paint.autoPadding', 'Auto Padding')}
    </button>
    <button className="btn-office" onClick={onZoomFit}>
      {t('view.zoomFit')}
    </button>
  </div>
);

export type PaintGridSettingsToolbarProps = {
  t: TranslateFn;
  grid: GridConfig;
  setGrid: (updates: Partial<GridConfig>) => void;
  onGridDimensionChange: (axis: 'rows' | 'cols', value: number | null) => void;
  onCellSizeChange: (value: number | null) => void;
};

export const PaintGridSettingsToolbar: React.FC<PaintGridSettingsToolbarProps> = ({
  t,
  grid,
  setGrid,
  onGridDimensionChange,
  onCellSizeChange,
}) => (
  <div className="flex flex-wrap items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 border-t border-office-border bg-office-bg">
    <div className="flex items-center gap-1">
      <span className="text-xs text-office-text-secondary">{t('grid.type')}</span>
      <div className="flex items-center border border-office-border rounded-sm overflow-hidden">
        <button
          className={`h-7 w-7 flex items-center justify-center ${
            grid.gridType === 'square'
              ? 'bg-office-accent text-white'
              : 'bg-white hover:bg-office-ribbon-hover'
          }`}
          onClick={() => setGrid({ gridType: 'square' })}
          type="button"
          title={t('grid.type.square')}
          aria-label={t('grid.type.square')}
          aria-pressed={grid.gridType === 'square'}
        >
          <SquareIcon />
        </button>
        <button
          className={`h-7 w-7 flex items-center justify-center border-l border-office-border ${
            grid.gridType === 'hex'
              ? 'bg-office-accent text-white'
              : 'bg-white hover:bg-office-ribbon-hover'
          }`}
          onClick={() => setGrid({ gridType: 'hex' })}
          type="button"
          title={t('grid.type.hex')}
          aria-label={t('grid.type.hex')}
          aria-pressed={grid.gridType === 'hex'}
        >
          <HexIcon />
        </button>
      </div>
    </div>
    <div className="flex items-center gap-1">
      <span className="text-xs text-office-text-secondary">{t('grid.rows')}</span>
      <NumericInput
        value={grid.rows}
        onChange={(value) => onGridDimensionChange('rows', value)}
        min={1}
        max={200}
        className="w-16 h-6"
      />
    </div>
    <div className="flex items-center gap-1">
      <span className="text-xs text-office-text-secondary">{t('grid.cols')}</span>
      <NumericInput
        value={grid.cols}
        onChange={(value) => onGridDimensionChange('cols', value)}
        min={1}
        max={200}
        className="w-16 h-6"
      />
    </div>
    <div className="flex items-center gap-1">
      <span className="text-xs text-office-text-secondary">{t('grid.cellSize')}</span>
      <NumericInput
        value={grid.cellSize}
        onChange={(value) => onCellSizeChange(value)}
        min={10}
        max={120}
        className="w-16 h-6"
      />
    </div>
    <label className="flex items-center gap-2 text-xs text-office-text-secondary">
      <input
        type="checkbox"
        checked={grid.showGrid}
        onChange={(event) => setGrid({ showGrid: event.target.checked })}
        className="w-4 h-4"
      />
      {t('view.showGrid')}
    </label>
  </div>
);
