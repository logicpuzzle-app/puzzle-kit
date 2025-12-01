/**
 * GridShapeContent - Grid type and size configuration
 */

import React, { useCallback, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../../../store/puzzleStore';
import type { TopologyPreset } from '../../../../utils/gridTopology';
import type { GridType, IsometricFace, IsometricView } from '../../../../types';

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

export const GridShapeContent: React.FC = () => {
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
    setPreviewGrid,
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

  // Keep local form in sync when external grid changes
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

  const handleApply = useCallback(() => {
    setPreviewGrid(null);
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
  }, [pendingGridType, pendingRows, effectiveCols, pendingLevel, pendingCellSize, pendingIsoFaces, pendingIsoView, isIso, setGrid, setPreviewGrid, useTopology, applyTopologyPreset]);

  return (
    <div className="space-y-2">
      {/* Grid Type and Size */}
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

          {/* Faces toggle */}
          <div>
            <label className="block text-xs text-office-text-secondary mb-1">{t('grid.iso.faces')}</label>
            <div className="flex gap-1">
              {(pendingIsoView === 'interior'
                ? (['bottom', 'left', 'right'] as IsometricFace[])
                : (['top', 'left', 'right'] as IsometricFace[])
              ).map((face) => {
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

      {/* Topology shape (preset/intensity) */}
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
          onClick={handleApply}
          disabled={!hasChanges}
        >
          {t('common.apply')}
        </button>
      </div>
    </div>
  );
};
