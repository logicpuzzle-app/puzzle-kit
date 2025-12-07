import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../store/puzzleStore';
import { historyManager } from '../../store/historyManager';

export const StatusBar: React.FC = () => {
  const { t } = useTranslation();
  const { grid, canvas } = usePuzzleStore();

  // Subscribe to history changes for reactive updates
  const [historyState, setHistoryState] = useState(() => historyManager.getState());
  useEffect(() => {
    return historyManager.subscribe(setHistoryState);
  }, []);

  const historyLength = historyState.entries.length;
  const historyIndex = historyState.currentIndex;
  const hasChanges = historyIndex >= 0;

  return (
    <div className="h-6 bg-office-ribbon border-t border-office-border flex items-center px-2 text-xs text-office-text-secondary">
      {/* Status */}
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            hasChanges ? 'bg-yellow-500' : 'bg-green-500'
          }`}
        />
        <span>{hasChanges ? t('status.modified') : t('status.ready')}</span>
      </div>

      {/* Separator */}
      <div className="mx-3 h-4 border-l border-office-border" />

      {/* Grid info */}
      <span>
        {grid.rows} × {grid.cols}
      </span>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-4">
        {/* History count */}
        <span>
          {historyIndex + 1}/{historyLength}
        </span>

        {/* Zoom */}
        <span>
          {t('status.zoom')}: {Math.round(canvas.zoom * 100)}%
        </span>
      </div>
    </div>
  );
};
