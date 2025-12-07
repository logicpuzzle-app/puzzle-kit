/**
 * Check Answer Modal - Displays validation results (Office-style UI)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../store/puzzleStore';

export const CheckAnswerModal: React.FC = () => {
  const { t } = useTranslation();
  const {
    lastValidationResult,
    isValidationModalOpen,
    closeValidationModal,
  } = usePuzzleStore();

  if (!isValidationModalOpen || !lastValidationResult) {
    return null;
  }

  const { complete, undecided, errors } = lastValidationResult;

  // Group errors by ruleId (show only one per error type)
  const groupedErrors = errors.reduce((acc, error) => {
    if (!acc[error.ruleId]) {
      acc[error.ruleId] = { error, count: 1 };
    } else {
      acc[error.ruleId].count++;
    }
    return acc;
  }, {} as Record<string, { error: typeof errors[0]; count: number }>);
  const uniqueErrors = Object.values(groupedErrors);

  // Determine status
  let statusIcon = '?';
  let statusColor = 'text-office-text-secondary';
  let statusMessage = t('validation.undecided');

  if (complete) {
    statusIcon = '\u2713'; // checkmark
    statusColor = 'text-green-600';
    statusMessage = t('validation.complete');
  } else if (!undecided && errors.length > 0) {
    statusIcon = '\u2717'; // X mark
    statusColor = 'text-red-600';
    statusMessage = t('validation.incorrect');
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-gray-100 border border-gray-400 shadow-lg max-w-sm w-full mx-4">
        {/* Title bar */}
        <div className="h-8 bg-gray-200 border-b border-gray-400 flex items-center justify-between px-3">
          <span className="text-xs font-medium text-gray-800">
            {t('constraint.checkAnswer')}
          </span>
          <button
            onClick={closeValidationModal}
            className="w-5 h-5 flex items-center justify-center text-gray-600 hover:bg-red-500 hover:text-white transition-colors text-sm"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 bg-white">
          {/* Status */}
          <div className="flex items-center gap-3 mb-3">
            <span className={`text-2xl ${statusColor}`}>{statusIcon}</span>
            <span className={`text-sm font-medium ${statusColor}`}>
              {statusMessage}
            </span>
          </div>

          {/* Error list */}
          {errors.length > 0 && (
            <div className="border border-gray-300 bg-gray-50 p-2 max-h-40 overflow-y-auto">
              <div className="text-xs text-gray-500 mb-1">
                {t('validation.errorCount', { count: errors.length })}
              </div>
              <ul className="space-y-1">
                {uniqueErrors.map(({ error, count }) => (
                  <li
                    key={error.ruleId}
                    className="text-xs text-gray-800 flex items-start gap-1"
                  >
                    <span className="text-red-500">•</span>
                    <span>
                      {t(error.messageKey, { defaultValue: error.failcode })}
                      {count > 1 && (
                        <span className="text-gray-500 ml-1">
                          (×{count})
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Complete message */}
          {complete && (
            <div className="text-xs text-green-600 text-center">
              {t('validation.congratulations')}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-100 flex justify-end border-t border-gray-300">
          <button
            onClick={closeValidationModal}
            className="h-7 px-3 text-xs bg-white border border-gray-400 rounded-sm hover:bg-gray-50 transition-colors min-w-[70px]"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
