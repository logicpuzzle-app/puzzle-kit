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
  const { grid, setGrid } = usePuzzleStore();

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
