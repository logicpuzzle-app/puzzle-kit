import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { usePuzzleStore } from '../../../store/puzzleStore';
import type { TopologyPreset } from '../../../utils/gridTopology';
import type { GridType, IsometricFace, IsometricView } from '../../../types';

// Background fit mode options
const fitModes = [
  { value: 'contain' as const, labelKey: 'grid.fit.contain' },
  { value: 'cover' as const, labelKey: 'grid.fit.cover' },
  { value: 'fill' as const, labelKey: 'grid.fit.fill' },
  { value: 'none' as const, labelKey: 'grid.fit.none' },
];

// Grid properties panel component
export const GridPropertiesPanel: React.FC = () => {
  const { t } = useTranslation();
  const {
    grid,
    setGrid,
    useTopology,
    topologyPreset,
    topologyIntensity,
    setTopologyPreset,
    setTopologyIntensity,
    applyTopologyPreset,
    gridSubTab,
    setPreviewGrid,
    gridEditMode,
  } = usePuzzleStore();
  const [pendingGridType, setPendingGridType] = useState<GridType>(grid.gridType);
  const [pendingRows, setPendingRows] = useState<number>(grid.rows);
  const [pendingCols, setPendingCols] = useState<number>(grid.cols);
  const [pendingLevel, setPendingLevel] = useState<number>(grid.level ?? 1);
  const [pendingCellSize, setPendingCellSize] = useState<number>(grid.cellSize);
  const [pendingIsoFaces, setPendingIsoFaces] = useState<IsometricFace[]>(
    grid.isometricFaces ?? ['top', 'left', 'right']
  );
  const [pendingIsoView, setPendingIsoView] = useState<IsometricView>(
    grid.isometricView ?? 'exterior'
  );
  const isPyramid = pendingGridType === 'pyramid';
  const isIso = pendingGridType === 'iso';
  const effectiveCols = isPyramid ? pendingRows : pendingCols;

  // Keep local form in sync when external grid changes (e.g., load puzzle)
  useEffect(() => {
    setPendingGridType(grid.gridType);
    setPendingRows(grid.rows);
    setPendingCols(grid.cols);
    setPendingCellSize(grid.cellSize);
  }, [grid.gridType, grid.rows, grid.cols, grid.cellSize]);
  useEffect(() => {
    setPendingLevel(grid.level ?? 1);
  }, [grid.level]);
  useEffect(() => {
    setPendingIsoFaces(grid.isometricFaces ?? ['top', 'left', 'right']);
  }, [grid.isometricFaces]);
  useEffect(() => {
    setPendingIsoView(grid.isometricView ?? 'exterior');
  }, [grid.isometricView]);

  // Helper to compare face arrays
  const facesChanged = () => {
    const currentFaces = grid.isometricFaces ?? ['top', 'left', 'right'];
    if (pendingIsoFaces.length !== currentFaces.length) return true;
    return !pendingIsoFaces.every((f) => currentFaces.includes(f));
  };

  // Check if pending values differ from current grid
  const hasChanges = pendingGridType !== grid.gridType ||
    pendingRows !== grid.rows ||
    effectiveCols !== grid.cols ||
    pendingLevel !== (grid.level ?? 1) ||
    pendingCellSize !== grid.cellSize ||
    (isIso && facesChanged()) ||
    (isIso && pendingIsoView !== (grid.isometricView ?? 'exterior'));

  // Auto-preview when values change
  useEffect(() => {
    if (hasChanges) {
      setPreviewGrid({
        gridType: pendingGridType,
        rows: pendingRows,
        cols: effectiveCols,
        cellSize: pendingCellSize,
        level: pendingLevel,
        isometricFaces: isIso ? pendingIsoFaces : undefined,
        isometricView: isIso ? pendingIsoView : undefined,
      });
    } else {
      setPreviewGrid(null);
    }
  }, [hasChanges, pendingGridType, pendingRows, effectiveCols, pendingLevel, pendingCellSize, pendingIsoFaces, pendingIsoView, isIso, setPreviewGrid]);

  // Clear preview when component unmounts
  useEffect(() => {
    return () => {
      setPreviewGrid(null);
    };
  }, [setPreviewGrid]);

  // Cancel: revert pending values to current grid
  const handleCancel = useCallback(() => {
    setPendingGridType(grid.gridType);
    setPendingRows(grid.rows);
    setPendingCols(grid.cols);
    setPendingCellSize(grid.cellSize);
    setPendingLevel(grid.level ?? 1);
    setPendingIsoFaces(grid.isometricFaces ?? ['top', 'left', 'right']);
    setPendingIsoView(grid.isometricView ?? 'exterior');
    setPreviewGrid(null);
  }, [grid.gridType, grid.rows, grid.cols, grid.cellSize, grid.level, grid.isometricFaces, grid.isometricView, setPreviewGrid]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(t('error.invalidImageFile') || 'Please select an image file');
      return;
    }

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

  const handleOffsetChange = useCallback((axis: 'X' | 'Y', value: number) => {
    if (axis === 'X') {
      setGrid({ backgroundOffsetX: value });
    } else {
      setGrid({ backgroundOffsetY: value });
    }
  }, [setGrid]);

  const handleScaleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setGrid({ backgroundScale: parseFloat(e.target.value) });
  }, [setGrid]);

  const handleOpacityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setGrid({ backgroundOpacity: parseFloat(e.target.value) });
  }, [setGrid]);

  const handlePaddingChange = useCallback((side: 'Top' | 'Bottom' | 'Left' | 'Right', value: number) => {
    const key = `exportPadding${side}` as const;
    setGrid({ [key]: value });
  }, [setGrid]);

  // All available grid types grouped by category
  const gridTypeGroups: { category: string; labelKey: string; types: { id: GridType; labelKey: string }[] }[] = [
    {
      category: 'regular',
      labelKey: 'tiling.regular',
      types: [
        { id: 'square', labelKey: 'tiling.square' },
        { id: 'triangle', labelKey: 'tiling.triangle' },
        { id: 'hex', labelKey: 'tiling.hex' },
      ],
    },
    {
      category: 'semiRegular',
      labelKey: 'tiling.semiRegular',
      types: [
        { id: 'trihexagonal', labelKey: 'tiling.trihexagonal' },
        { id: 'snub-square', labelKey: 'tiling.snubSquare' },
        { id: 'truncated-square', labelKey: 'tiling.truncatedSquare' },
        { id: 'rhombitrihexagonal', labelKey: 'tiling.rhombitrihexagonal' },
        { id: 'truncated-hexagonal', labelKey: 'tiling.truncatedHexagonal' },
        { id: 'truncated-trihexagonal', labelKey: 'tiling.truncatedTrihexagonal' },
        { id: 'snub-trihexagonal', labelKey: 'tiling.snubTrihexagonal' },
        { id: 'elongated-triangular', labelKey: 'tiling.elongatedTriangular' },
      ],
    },
    {
      category: 'dual',
      labelKey: 'tiling.dual',
      types: [
        { id: 'cairo', labelKey: 'tiling.cairo' },
        { id: 'rhombille', labelKey: 'tiling.rhombille' },
        { id: 'deltoidal-trihexagonal', labelKey: 'tiling.deltoidalTrihexagonal' },
        { id: 'tetrakis-square', labelKey: 'tiling.tetrakisSquare' },
        { id: 'triakis-triangular', labelKey: 'tiling.triakisTriangular' },
        { id: 'kisrhombille', labelKey: 'tiling.kisrhombille' },
        { id: 'floret-pentagonal', labelKey: 'tiling.floretPentagonal' },
        { id: 'prismatic-pentagonal', labelKey: 'tiling.prismaticPentagonal' },
      ],
    },
    {
      category: 'others',
      labelKey: 'tiling.others',
      types: [
        { id: 'pyramid', labelKey: 'tiling.pyramid' },
        { id: 'iso', labelKey: 'tiling.iso' },
      ],
    },
  ];

  const presetOptions: { id: TopologyPreset; labelKey: string }[] = [
    { id: 'square', labelKey: 'topology.preset.square' },
    { id: 'cylinder', labelKey: 'topology.preset.cylinder' },
    { id: 'mobius', labelKey: 'topology.preset.mobius' },
    { id: 'torus', labelKey: 'topology.preset.torus' },
    { id: 'sphere', labelKey: 'topology.preset.sphere' },
    { id: 'hyperbolic', labelKey: 'topology.preset.hyperbolic' },
    { id: 'spiral', labelKey: 'topology.preset.spiral' },
    { id: 'radial', labelKey: 'topology.preset.radial' },
    { id: 'wave', labelKey: 'topology.preset.wave' },
    { id: 'fisheye', labelKey: 'topology.preset.fisheye' },
    { id: 'perspective', labelKey: 'topology.preset.perspective' },
    { id: 'pyramid', labelKey: 'topology.preset.pyramid' },
  ];

  // Shape tab content
  const renderShapeContent = () => (
    <>
      {/* Grid Type and Size */}
      <div className="space-y-2">
        <div>
          <label className="block text-xs text-office-text-secondary mb-1">
            {t('grid.type')}
          </label>
          <select
            className="w-full h-7 px-2 text-xs border border-office-border rounded-sm"
            value={pendingGridType}
            onChange={(e) => {
              const next = e.target.value as GridType;
              setPendingGridType(next);
              if (next === 'pyramid') {
                setPendingCols(pendingRows);
              }
            }}
          >
            {gridTypeGroups.map((group) => (
              <optgroup key={group.category} label={t(group.labelKey)}>
                {group.types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {t(type.labelKey)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-office-text-secondary mb-1">
              {isPyramid ? t('grid.height') : t('grid.rows')}
            </label>
            <input
              type="number"
              className="w-full h-7 px-2 text-xs border border-office-border rounded-sm"
              value={pendingRows}
              min={1}
              max={50}
              onChange={(e) => {
                const value = Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1));
                setPendingRows(value);
                if (isPyramid) {
                  setPendingCols(value);
                }
              }}
            />
          </div>
          {!isPyramid && (
            <div className="flex-1">
              <label className="block text-xs text-office-text-secondary mb-1">{t('grid.cols')}</label>
              <input
                type="number"
                className="w-full h-7 px-2 text-xs border border-office-border rounded-sm"
                value={pendingCols}
                min={1}
                max={50}
                onChange={(e) => setPendingCols(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))}
              />
            </div>
          )}
          {isIso && (
            <div className="flex-1">
              <label className="block text-xs text-office-text-secondary mb-1">{t('grid.level')}</label>
              <input
                type="number"
                className="w-full h-7 px-2 text-xs border border-office-border rounded-sm"
                value={pendingLevel}
                min={1}
                max={50}
                onChange={(e) => setPendingLevel(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))}
              />
            </div>
          )}
        </div>

        {isIso && (
          <>
            {/* Exterior / Interior toggle */}
            <div>
              <label className="block text-xs text-office-text-secondary mb-1">{t('grid.iso.view')}</label>
              <div className="flex gap-1">
                {(['exterior', 'interior'] as IsometricView[]).map((view) => {
                  const isActive = pendingIsoView === view;
                  return (
                    <button
                      key={view}
                      type="button"
                      className={`flex-1 px-2 py-1.5 text-xs border rounded-sm transition-colors ${
                        isActive
                          ? 'bg-office-accent text-white border-office-accent'
                          : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                      }`}
                      onClick={() => setPendingIsoView(view)}
                    >
                      {t(`grid.iso.${view}`)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Faces toggle - show different faces based on view mode */}
            <div>
              <label className="block text-xs text-office-text-secondary mb-1">{t('grid.iso.faces')}</label>
              <div className="flex gap-1">
                {(pendingIsoView === 'interior'
                  ? (['bottom', 'left', 'right'] as IsometricFace[])
                  : (['top', 'left', 'right'] as IsometricFace[])
                ).map((face) => {
                  // Map 'bottom' to 'top' internally for face toggle state
                  const stateKey = face === 'bottom' ? 'top' : face;
                  const isActive = pendingIsoFaces.includes(stateKey);
                  const canToggle = pendingIsoFaces.length > 1 || !isActive;
                  return (
                    <button
                      key={face}
                      type="button"
                      disabled={!canToggle}
                      className={`flex-1 px-2 py-1.5 text-xs border rounded-sm transition-colors ${
                        isActive
                          ? 'bg-office-accent text-white border-office-accent'
                          : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                      } ${!canToggle ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => {
                        if (!canToggle) return;
                        if (isActive) {
                          setPendingIsoFaces(pendingIsoFaces.filter((f) => f !== stateKey));
                        } else {
                          setPendingIsoFaces([...pendingIsoFaces, stateKey]);
                        }
                      }}
                    >
                      {t(`grid.iso.${face}`)}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Topology shape (preset/intensity) - only when square grid and topology enabled */}
        {useTopology && (pendingGridType === 'square' || pendingGridType === 'pyramid') && (
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-office-text-secondary mb-1">
                {t('topology.preset')}
              </label>
              <select
                className="w-full h-7 px-2 text-xs border border-office-border rounded-sm"
                value={topologyPreset}
                onChange={(e) => setTopologyPreset(e.target.value as TopologyPreset)}
              >
                {presetOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-office-text-secondary mb-1">
                {t('topology.intensity')} ({Math.round(topologyIntensity * 100)}%)
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={topologyIntensity}
                onChange={(e) => setTopologyIntensity(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Cell Size (preview) */}
        <div>
          <label className="block text-xs text-office-text-secondary mb-1">
            {t('grid.cellSize')}
          </label>
          <div className="flex gap-1 items-center">
            <button
              className="w-6 h-5 text-xs border border-office-border rounded-sm hover:bg-office-ribbon-hover"
              onClick={() => setPendingCellSize(Math.max(10, pendingCellSize - 1))}
            >
              -
            </button>
            <input
              type="number"
              value={pendingCellSize}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 10;
                setPendingCellSize(Math.max(10, Math.min(100, val)));
              }}
              className="w-14 h-5 px-1 text-[10px] border border-office-border rounded-sm text-center"
            />
            <button
              className="w-6 h-5 text-xs border border-office-border rounded-sm hover:bg-office-ribbon-hover"
              onClick={() => setPendingCellSize(Math.min(100, pendingCellSize + 1))}
            >
              +
            </button>
            <span className="text-[10px] text-office-text-secondary">px</span>
          </div>
        </div>

        {/* Cancel / Apply buttons */}
        <div className="flex gap-1">
          <button
            className={`flex-1 h-7 text-xs border rounded-sm transition-colors ${
              hasChanges
                ? 'bg-white border-office-border hover:bg-office-ribbon-hover'
                : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            onClick={handleCancel}
            disabled={!hasChanges}
          >
            {t('action.cancel')}
          </button>
          <button
            className={`flex-1 h-7 text-xs border rounded-sm transition-colors ${
              hasChanges
                ? 'bg-office-accent text-white border-office-accent hover:bg-office-accent/90'
                : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            onClick={() => {
              setPreviewGrid(null); // Clear preview first
              setGrid({
                gridType: pendingGridType,
                rows: pendingRows,
                cols: effectiveCols,
                level: pendingLevel,
                cellSize: pendingCellSize,
                isometricFaces: isIso ? pendingIsoFaces : undefined,
                isometricView: isIso ? pendingIsoView : undefined,
              });
              if (useTopology) {
                setTimeout(() => applyTopologyPreset(), 0);
              }
            }}
            disabled={!hasChanges}
          >
            {t('common.apply')}
          </button>
        </div>
      </div>
    </>
  );

  // Merge mode content
  const renderMergeContent = () => {
    const mergedCount = grid.mergedCells?.length ?? 0;
    const totalMergedCells = grid.mergedCells?.reduce((sum, group) => sum + group.length, 0) ?? 0;

    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="text-xs text-office-text-secondary">
            {t('gridEdit.mergedGroups')}: <span className="font-medium text-office-text">{mergedCount}</span>
          </div>
          {mergedCount > 0 && (
            <div className="text-xs text-office-text-secondary">
              {t('gridEdit.totalMergedCells')}: <span className="font-medium text-office-text">{totalMergedCells}</span>
            </div>
          )}
        </div>

        {mergedCount > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-office-text-secondary mb-1">{t('gridEdit.mergedCellsList')}:</div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {grid.mergedCells?.map((group, idx) => (
                <div key={idx} className="flex items-center justify-between p-1.5 bg-gray-50 rounded text-xs">
                  <span className="text-office-text-secondary">
                    {t('gridEdit.group')} {idx + 1}: {group.length} {t('gridEdit.cells')}
                  </span>
                  <button
                    className="px-1.5 py-0.5 text-[10px] text-red-600 hover:bg-red-50 rounded"
                    onClick={() => {
                      const newMerged = grid.mergedCells?.filter((_, i) => i !== idx);
                      setGrid({ mergedCells: newMerged && newMerged.length > 0 ? newMerged : undefined });
                    }}
                  >
                    {t('action.delete')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Split mode content
  const renderSplitContent = () => (
    <div className="space-y-3">
      <div className="text-xs text-office-text-secondary italic">
        {t('gridEdit.splitNotImplemented')}
      </div>
    </div>
  );

  // Exclude mode content
  const renderExcludeContent = () => {
    const disabledCount = grid.disabledCells?.length ?? 0;

    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="text-xs text-office-text-secondary">
            {t('gridEdit.disabledCells')}: <span className="font-medium text-office-text">{disabledCount}</span>
          </div>
        </div>

        {disabledCount > 0 && (
          <button
            className="w-full px-2 py-1.5 text-xs border border-office-border rounded-sm hover:bg-red-50 hover:border-red-300 text-red-600"
            onClick={() => setGrid({ disabledCells: undefined })}
          >
            {t('gridEdit.clearAllDisabled')}
          </button>
        )}

        {/* Disabled cell color */}
        <div>
          <label className="block text-xs text-office-text-secondary mb-1">
            {t('gridEdit.disabledCellColor')}
          </label>
          <input
            type="color"
            value={grid.disabledCellColor ?? grid.backgroundColor}
            onChange={(e) => setGrid({ disabledCellColor: e.target.value })}
            className="w-full h-7 border border-office-border rounded-sm cursor-pointer"
          />
        </div>
      </div>
    );
  };

  // Display tab content
  const renderDisplayContent = () => (
    <>
      {/* Cell Size (direct change) */}
      <div>
        <label className="block text-xs text-office-text-secondary mb-1">
          {t('grid.cellSize')}
        </label>
        <div className="flex gap-1 items-center">
          <button
            className="w-6 h-5 text-xs border border-office-border rounded-sm hover:bg-office-ribbon-hover"
            onClick={() => {
              const newSize = Math.max(10, grid.cellSize - 1);
              setGrid({ cellSize: newSize });
            }}
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
            onClick={() => {
              const newSize = Math.min(100, grid.cellSize + 1);
              setGrid({ cellSize: newSize });
            }}
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
    </>
  );

  // Render content based on gridEditMode
  const renderContent = () => {
    switch (gridEditMode) {
      case 'preset':
        // Preset mode shows shape/display tabs
        return gridSubTab === 'shape' ? renderShapeContent() : renderDisplayContent();
      case 'merge':
        return renderMergeContent();
      case 'split':
        return renderSplitContent();
      case 'exclude':
        return renderExcludeContent();
      default:
        return gridSubTab === 'shape' ? renderShapeContent() : renderDisplayContent();
    }
  };

  return (
    <div className="space-y-2">
      {renderContent()}
    </div>
  );
};
