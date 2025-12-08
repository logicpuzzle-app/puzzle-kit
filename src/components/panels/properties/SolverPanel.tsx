/**
 * Solver mode panel - shows solving status and results
 */

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../../store/puzzleStore';
import { solverWorkerManager } from '../../../solver';

export const SolverPanel: React.FC = () => {
  const { t } = useTranslation();
  const {
    isSolving,
    isSolverMode,
    solverResult,
    solverStatus,
    solverTime,
    solverError,
    exitSolverMode,
    cancelSolver,
  } = usePuzzleStore();

  const handleCancelSolver = useCallback(() => {
    solverWorkerManager.cancelAll();
    cancelSolver();
  }, [cancelSolver]);

  // Don't render if not in solver mode
  if (!isSolving && !isSolverMode && !solverStatus) {
    return null;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${
          solverStatus === 'error' || solverStatus === 'unsolvable' ? 'bg-red-500' :
          solverStatus === 'multiple' || solverStatus === 'timeout' ? 'bg-orange-500' :
          isSolving ? 'bg-yellow-500 animate-pulse' : 'bg-blue-500'
        }`} />
        <span className="text-xs text-office-text-secondary font-medium">{t('solver.mode')}</span>
      </div>

      {/* Solving in progress */}
      {isSolving && (
        <div className="text-xs mb-3 p-2 bg-yellow-50 rounded-sm border border-yellow-200">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin text-yellow-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="font-medium text-yellow-700">{t('solver.solving')}</span>
          </div>
          <div className="text-yellow-600 mt-1">{t('solver.runningInBackground')}</div>
          <button
            onClick={handleCancelSolver}
            className="mt-2 w-full px-3 py-1.5 text-xs border rounded-sm bg-white border-red-300 text-red-600 hover:bg-red-50 transition-colors"
          >
            {t('solver.cancel')}
          </button>
        </div>
      )}

      {/* Solved - complete solution */}
      {!isSolving && solverStatus === 'solved' && (
        <div className="text-xs mb-3 p-2 bg-green-50 rounded-sm border border-green-200">
          <div className="flex justify-between">
            <span className="text-office-text-secondary">{t('solver.status')}:</span>
            <span className="font-medium text-green-600">{t('solver.solved')}</span>
          </div>
          {solverTime !== null && (
            <div className="flex justify-between mt-1">
              <span className="text-office-text-secondary">{t('solver.time')}:</span>
              <span>{solverTime.toFixed(0)}ms</span>
            </div>
          )}
        </div>
      )}

      {/* Multiple solutions - partial result */}
      {!isSolving && solverStatus === 'multiple' && (
        <div className="text-xs mb-3 p-2 bg-orange-50 rounded-sm border border-orange-200">
          <div className="flex justify-between">
            <span className="text-office-text-secondary">{t('solver.status')}:</span>
            <span className="font-medium text-orange-600">{t('solver.partial')}</span>
          </div>
          <div className="text-orange-700 mt-1 font-medium">{t('solver.multiple')}</div>
          <div className="text-orange-600 text-[10px] mt-0.5">{t('solver.multipleSub')}</div>
          {solverTime !== null && (
            <div className="flex justify-between mt-1">
              <span className="text-office-text-secondary">{t('solver.time')}:</span>
              <span>{solverTime.toFixed(0)}ms</span>
            </div>
          )}
        </div>
      )}

      {/* Timeout - partial result */}
      {!isSolving && solverStatus === 'timeout' && (
        <div className="text-xs mb-3 p-2 bg-orange-50 rounded-sm border border-orange-200">
          <div className="flex justify-between">
            <span className="text-office-text-secondary">{t('solver.status')}:</span>
            <span className="font-medium text-orange-600">{t('solver.partial')}</span>
          </div>
          <div className="text-orange-700 mt-1 font-medium">{t('solver.timeout')}</div>
          <div className="text-orange-600 text-[10px] mt-0.5">{t('solver.timeoutSub')}</div>
          {solverTime !== null && (
            <div className="flex justify-between mt-1">
              <span className="text-office-text-secondary">{t('solver.time')}:</span>
              <span>{solverTime.toFixed(0)}ms</span>
            </div>
          )}
        </div>
      )}

      {/* Unsolvable */}
      {!isSolving && solverStatus === 'unsolvable' && (
        <div className="text-xs mb-3 p-2 bg-red-50 rounded-sm border border-red-200">
          <div className="flex justify-between">
            <span className="text-office-text-secondary">{t('solver.status')}:</span>
            <span className="font-medium text-red-600">{t('solver.failed')}</span>
          </div>
          <div className="text-red-700 mt-1 font-medium">{t('solver.unsolvable')}</div>
          {solverResult && (
            <div className="text-red-600 text-[10px] mt-0.5">{t('solver.unsolvableSub')}</div>
          )}
          {solverTime !== null && (
            <div className="flex justify-between mt-1">
              <span className="text-office-text-secondary">{t('solver.time')}:</span>
              <span>{solverTime.toFixed(0)}ms</span>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {!isSolving && solverStatus === 'error' && (
        <div className="text-xs mb-3 p-2 bg-red-50 rounded-sm border border-red-200">
          <div className="flex justify-between mb-1">
            <span className="text-office-text-secondary">{t('solver.status')}:</span>
            <span className="font-medium text-red-600">{t('solver.failed')}</span>
          </div>
          {solverError && <div className="text-red-600">{solverError}</div>}
          {solverTime !== null && (
            <div className="flex justify-between mt-1">
              <span className="text-office-text-secondary">{t('solver.time')}:</span>
              <span>{solverTime.toFixed(0)}ms</span>
            </div>
          )}
        </div>
      )}

      {/* Exit/Dismiss button - only show when not solving */}
      {!isSolving && (
        <button
          onClick={exitSolverMode}
          className="px-3 py-1.5 text-xs border rounded-sm bg-white border-office-border hover:bg-office-ribbon-hover transition-colors"
        >
          {isSolverMode ? t('solver.exit') : t('action.dismiss')}
        </button>
      )}
    </div>
  );
};
