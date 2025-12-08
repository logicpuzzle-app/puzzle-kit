/**
 * GridEditModeContent - Merge, Split, Exclude mode content
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../../../store/puzzleStore';

// Merge mode content
export const GridMergeContent: React.FC = () => {
  const { t } = useTranslation();
  const { grid, setGrid } = usePuzzleStore();

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
export const GridSplitContent: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="text-xs text-office-text-secondary italic">
        {t('gridEdit.splitNotImplemented')}
      </div>
    </div>
  );
};

// Exclude mode content
export const GridExcludeContent: React.FC = () => {
  const { t } = useTranslation();
  const { grid, setGrid, topology } = usePuzzleStore();

  const excludeMode = grid.excludeMode ?? 'void';

  // Count void cells and outboard cells separately
  const voidCells = grid.voidCells ?? [];
  const outboardCells = grid.outboardCells ?? [];
  // Legacy: disabledCells are treated as void cells
  const legacyDisabled = grid.disabledCells ?? [];
  const totalVoidCount = voidCells.length + legacyDisabled.length;

  // Count outboard cells from topology (includes margin cells)
  const marginOutboardCount = topology
    ? Array.from(topology.cells.values()).filter(cell => cell.outboard && !outboardCells.includes(cell.id)).length
    : 0;

  return (
    <div className="space-y-3">
      {/* Exclude mode selector */}
      <div>
        <label className="block text-xs text-office-text-secondary mb-1">
          {t('gridEdit.excludeMode')}
        </label>
        <div className="flex gap-1">
          {(['void', 'outboard'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`flex-1 px-2 py-1.5 text-xs border rounded-sm transition-colors ${
                excludeMode === mode
                  ? 'bg-office-accent text-white border-office-accent'
                  : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => setGrid({ excludeMode: mode })}
            >
              {t(`gridEdit.excludeMode.${mode}`)}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-office-text-secondary mt-1">
          {excludeMode === 'void'
            ? t('gridEdit.excludeMode.voidHelp')
            : t('gridEdit.excludeMode.outboardHelp')}
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-xs text-office-text-secondary">
          {t('gridEdit.voidCells')}: <span className="font-medium text-office-text">{totalVoidCount}</span>
        </div>
        <div className="text-xs text-office-text-secondary">
          {t('gridEdit.outboardCells')}: <span className="font-medium text-office-text">{outboardCells.length}</span>
          {marginOutboardCount > 0 && (
            <span className="text-office-text-secondary"> (+{marginOutboardCount} {t('gridEdit.marginCells')})</span>
          )}
        </div>
      </div>

      {(totalVoidCount > 0 || outboardCells.length > 0) && (
        <button
          className="w-full px-2 py-1.5 text-xs border border-office-border rounded-sm hover:bg-red-50 hover:border-red-300 text-red-600"
          onClick={() => setGrid({ voidCells: undefined, outboardCells: undefined, disabledCells: undefined })}
        >
          {t('gridEdit.clearAllDisabled')}
        </button>
      )}
    </div>
  );
};

// Sculpt mode content (for isometric grids)
export const GridSculptContent: React.FC = () => {
  const { t } = useTranslation();
  const { sculptMode, setSculptMode, grid, setGrid } = usePuzzleStore();

  const sculptCount = grid.sculptOperations?.length ?? 0;

  return (
    <div className="space-y-3">
      {/* Sculpt mode selector */}
      <div>
        <label className="block text-xs text-office-text-secondary mb-1">
          {t('gridEdit.sculptMode')}
        </label>
        <div className="flex gap-1">
          {(['rotate', 'cut'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`flex-1 px-2 py-1.5 text-xs border rounded-sm transition-colors ${
                sculptMode === mode
                  ? 'bg-office-accent text-white border-office-accent'
                  : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => setSculptMode(mode)}
            >
              {t(`gridEdit.sculptMode.${mode}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Mode description */}
      <div className="text-xs text-office-text-secondary">
        {sculptMode === 'rotate'
          ? t('gridEdit.sculptHelp.rotate')
          : t('gridEdit.sculptHelp.cut')}
      </div>

      {/* Sculpt operations count */}
      <div className="space-y-1">
        <div className="text-xs text-office-text-secondary">
          {t('gridEdit.sculptOperations')}: <span className="font-medium text-office-text">{sculptCount}</span>
        </div>
      </div>

      {/* Clear all sculpt operations */}
      {sculptCount > 0 && (
        <button
          className="w-full px-2 py-1.5 text-xs border border-office-border rounded-sm hover:bg-red-50 hover:border-red-300 text-red-600"
          onClick={() => setGrid({ sculptOperations: undefined })}
        >
          {t('gridEdit.clearAllSculpt')}
        </button>
      )}
    </div>
  );
};
