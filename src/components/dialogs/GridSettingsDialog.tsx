import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../store/puzzleStore';
import type { GridConfig } from '../../types';

interface GridSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GridSettingsDialog: React.FC<GridSettingsDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const { grid, setGrid, resizeGrid } = usePuzzleStore();

  const [localGrid, setLocalGrid] = useState<GridConfig>(grid);

  useEffect(() => {
    if (isOpen) {
      setLocalGrid(grid);
    }
  }, [isOpen, grid]);

  const handleChange = (key: keyof GridConfig, value: string | number | boolean) => {
    setLocalGrid((prev) => ({ ...prev, [key]: value }));
  };

  const handleNumberChange = (key: keyof GridConfig, value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0) {
      handleChange(key, num);
    }
  };

  const handleApply = () => {
    // Check if size-related properties changed
    const sizeChanged = localGrid.rows !== grid.rows || localGrid.cols !== grid.cols ||
      localGrid.marginTop !== grid.marginTop || localGrid.marginBottom !== grid.marginBottom ||
      localGrid.marginLeft !== grid.marginLeft || localGrid.marginRight !== grid.marginRight;

    if (sizeChanged) {
      // Use resizeGrid to properly update topology and filter elements on removed cells
      resizeGrid(localGrid);
    } else {
      setGrid(localGrid);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      handleApply();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div
        className="bg-white border border-office-border shadow-lg rounded-sm p-4 min-w-[400px] max-h-[80vh] overflow-y-auto"
        onKeyDown={handleKeyDown}
      >
        <h2 className="text-lg font-semibold mb-4 border-b border-office-border pb-2">
          {t('grid.settings')}
        </h2>

        {/* Grid Size */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-office-text-secondary mb-2">
            {t('grid.size') || 'Size'}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-office-text-secondary mb-1">
                {t('grid.rows')}
              </label>
              <input
                type="number"
                className="input-office w-full"
                value={localGrid.rows}
                onChange={(e) => handleNumberChange('rows', e.target.value)}
                min={1}
                max={50}
              />
            </div>
            <div>
              <label className="block text-xs text-office-text-secondary mb-1">
                {t('grid.cols')}
              </label>
              <input
                type="number"
                className="input-office w-full"
                value={localGrid.cols}
                onChange={(e) => handleNumberChange('cols', e.target.value)}
                min={1}
                max={50}
              />
            </div>
          </div>
        </div>

        {/* Cell Size */}
        <div className="mb-4">
          <label className="block text-xs text-office-text-secondary mb-1">
            {t('grid.cellSize')}
          </label>
          <input
            type="number"
            className="input-office w-24"
            value={localGrid.cellSize}
            onChange={(e) => handleNumberChange('cellSize', e.target.value)}
            min={20}
            max={100}
          />
        </div>

        {/* Margins */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-office-text-secondary mb-2">
            {t('grid.margin')}
          </h3>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-xs text-office-text-secondary mb-1">
                {t('grid.marginTop')}
              </label>
              <input
                type="number"
                className="input-office w-full"
                value={localGrid.marginTop}
                onChange={(e) => handleNumberChange('marginTop', e.target.value)}
                min={0}
                max={10}
              />
            </div>
            <div>
              <label className="block text-xs text-office-text-secondary mb-1">
                {t('grid.marginBottom')}
              </label>
              <input
                type="number"
                className="input-office w-full"
                value={localGrid.marginBottom}
                onChange={(e) => handleNumberChange('marginBottom', e.target.value)}
                min={0}
                max={10}
              />
            </div>
            <div>
              <label className="block text-xs text-office-text-secondary mb-1">
                {t('grid.marginLeft')}
              </label>
              <input
                type="number"
                className="input-office w-full"
                value={localGrid.marginLeft}
                onChange={(e) => handleNumberChange('marginLeft', e.target.value)}
                min={0}
                max={10}
              />
            </div>
            <div>
              <label className="block text-xs text-office-text-secondary mb-1">
                {t('grid.marginRight')}
              </label>
              <input
                type="number"
                className="input-office w-full"
                value={localGrid.marginRight}
                onChange={(e) => handleNumberChange('marginRight', e.target.value)}
                min={0}
                max={10}
              />
            </div>
          </div>
        </div>

        {/* Grid Type */}
        <div className="mb-4">
          <label className="block text-xs text-office-text-secondary mb-1">
            {t('grid.type') || 'Grid Type'}
          </label>
          <div className="flex gap-1 flex-wrap">
            {(['square', 'hex', 'triangle', 'pyramid'] as const).map((type) => (
              <button
                key={type}
                type="button"
                className={`px-3 py-1 text-xs border rounded-sm transition-colors ${
                  localGrid.gridType === type
                    ? 'bg-office-accent text-white border-office-accent'
                    : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                }`}
                onClick={() => handleChange('gridType', type)}
              >
                {t(`grid.type.${type}`) || type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Grid Style */}
        <div className="mb-4">
          <label className="block text-xs text-office-text-secondary mb-1">
            {t('grid.style')}
          </label>
          <div className="flex gap-1">
            {(['normal', 'thick', 'sudoku', 'dots', 'dashed'] as const).map((style) => (
              <button
                key={style}
                type="button"
                className={`px-3 py-1 text-xs border rounded-sm transition-colors ${
                  localGrid.gridStyle === style
                    ? 'bg-office-accent text-white border-office-accent'
                    : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                }`}
                onClick={() => handleChange('gridStyle', style)}
              >
                {t(`grid.style.${style}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Frame Style */}
        <div className="mb-4">
          <label className="block text-xs text-office-text-secondary mb-1">
            {t('grid.frame')}
          </label>
          <div className="flex gap-1">
            {(['normal', 'thick', 'double', 'none'] as const).map((style) => (
              <button
                key={style}
                type="button"
                className={`px-3 py-1 text-xs border rounded-sm transition-colors ${
                  localGrid.frameStyle === style
                    ? 'bg-office-accent text-white border-office-accent'
                    : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                }`}
                onClick={() => handleChange('frameStyle', style)}
              >
                {t(`grid.frame.${style}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Colors */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-office-text-secondary mb-2">
            {t('panel.colors')}
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-office-text-secondary mb-1">
                {t('grid.backgroundColor')}
              </label>
              <input
                type="color"
                className="w-full h-8 cursor-pointer border border-office-border rounded"
                value={localGrid.backgroundColor}
                onChange={(e) => handleChange('backgroundColor', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-office-text-secondary mb-1">
                {t('grid.gridColor')}
              </label>
              <input
                type="color"
                className="w-full h-8 cursor-pointer border border-office-border rounded"
                value={localGrid.gridColor}
                onChange={(e) => handleChange('gridColor', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-office-text-secondary mb-1">
                {t('grid.frameColor')}
              </label>
              <input
                type="color"
                className="w-full h-8 cursor-pointer border border-office-border rounded"
                value={localGrid.frameColor}
                onChange={(e) => handleChange('frameColor', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Show Grid Toggle */}
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={localGrid.showGrid}
              onChange={(e) => handleChange('showGrid', e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">{t('view.showGrid')}</span>
          </label>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 justify-end border-t border-office-border pt-3">
          <button type="button" className="btn-office" onClick={onClose}>
            {t('action.cancel')}
          </button>
          <button type="button" className="btn-office-primary" onClick={handleApply}>
            {t('action.apply')}
          </button>
        </div>
      </div>
    </div>
  );
};
