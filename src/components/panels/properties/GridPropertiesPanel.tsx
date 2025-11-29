import React, { useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { usePuzzleStore } from '../../../store/puzzleStore';

// Grid properties panel component
export const GridPropertiesPanel: React.FC = () => {
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
