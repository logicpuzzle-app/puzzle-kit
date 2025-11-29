import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../store/puzzleStore';
import type { GridType } from '../../types';

interface NewPuzzleDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const GRID_TYPES: { id: GridType; icon: string }[] = [
  { id: 'square', icon: '▦' },
  { id: 'hex', icon: '⬡' },
  { id: 'triangle', icon: '△' },
  { id: 'pyramid', icon: '▲' },
];

export const NewPuzzleDialog: React.FC<NewPuzzleDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const { newPuzzle } = usePuzzleStore();

  const [gridType, setGridType] = useState<GridType>('square');
  const [rows, setRows] = useState(9);
  const [cols, setCols] = useState(9);

  const handleCreate = () => {
    newPuzzle({ gridType, rows, cols });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      handleCreate();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div
        className="bg-white border border-office-border shadow-lg rounded-sm p-4 min-w-[320px]"
        onKeyDown={handleKeyDown}
      >
        <h2 className="text-lg font-semibold mb-4 border-b border-office-border pb-2">
          {t('file.new')}
        </h2>

        {/* Grid Type */}
        <div className="mb-4">
          <label className="block text-xs text-office-text-secondary mb-2">
            {t('grid.type')}
          </label>
          <div className="grid grid-cols-4 gap-2">
            {GRID_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                className={`flex flex-col items-center justify-center p-3 border rounded-sm transition-colors ${
                  gridType === type.id
                    ? 'bg-office-accent text-white border-office-accent'
                    : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                }`}
                onClick={() => setGridType(type.id)}
              >
                <span className="text-2xl mb-1">{type.icon}</span>
                <span className="text-xs">{t(`grid.type.${type.id}`)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Grid Size */}
        <div className="mb-4">
          <label className="block text-xs text-office-text-secondary mb-2">
            {t('grid.size')}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-office-text-secondary mb-1">
                {t('grid.rows')}
              </label>
              <input
                type="number"
                className="input-office w-full"
                value={rows}
                onChange={(e) => {
                  const num = parseInt(e.target.value, 10);
                  if (!isNaN(num) && num >= 1 && num <= 50) setRows(num);
                }}
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
                value={cols}
                onChange={(e) => {
                  const num = parseInt(e.target.value, 10);
                  if (!isNaN(num) && num >= 1 && num <= 50) setCols(num);
                }}
                min={1}
                max={50}
              />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 justify-end border-t border-office-border pt-3">
          <button type="button" className="btn-office" onClick={onClose}>
            {t('action.cancel')}
          </button>
          <button type="button" className="btn-office-primary" onClick={handleCreate}>
            {t('action.create')}
          </button>
        </div>
      </div>
    </div>
  );
};
