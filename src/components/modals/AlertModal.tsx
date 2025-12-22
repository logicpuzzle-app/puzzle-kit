/**
 * Alert Modal - Custom alert dialog (Office-style UI)
 */

import React, { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../store/modalStoreContext';

export const AlertModal: React.FC = () => {
  const { t } = useTranslation();
  const { alertModal, closeAlert } = useModalStore();

  const { isOpen, title, message, variant, closeLabel } = alertModal;

  // Handle Escape/Enter key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape' || e.key === 'Enter') {
        closeAlert();
      }
    },
    [isOpen, closeAlert]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) {
    return null;
  }

  // Variant-based styling
  const getIconAndColor = () => {
    switch (variant) {
      case 'success':
        return { icon: '\u2713', bgColor: 'bg-green-100', textColor: 'text-green-600', borderColor: 'border-green-300' };
      case 'error':
        return { icon: '!', bgColor: 'bg-red-100', textColor: 'text-red-600', borderColor: 'border-red-300' };
      case 'warning':
        return { icon: '!', bgColor: 'bg-amber-100', textColor: 'text-amber-600', borderColor: 'border-amber-300' };
      default:
        return { icon: 'i', bgColor: 'bg-blue-100', textColor: 'text-blue-600', borderColor: 'border-blue-300' };
    }
  };

  const { icon, bgColor, textColor, borderColor } = getIconAndColor();

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-gray-100 border border-gray-400 shadow-lg max-w-sm w-full mx-4">
        {/* Title bar */}
        <div className="h-8 bg-gray-200 border-b border-gray-400 flex items-center justify-between px-3">
          <span className="text-xs font-medium text-gray-800 truncate">
            {title}
          </span>
          <button
            onClick={closeAlert}
            className="w-5 h-5 flex items-center justify-center text-gray-600 hover:bg-red-500 hover:text-white transition-colors text-sm"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 bg-white">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div
              className={`w-8 h-8 flex items-center justify-center rounded-full ${bgColor} ${textColor} border ${borderColor} text-sm font-bold flex-shrink-0`}
            >
              {icon}
            </div>
            {/* Message */}
            <p className="text-sm text-gray-800 leading-relaxed pt-1 whitespace-pre-wrap">
              {message}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-100 flex justify-end border-t border-gray-300">
          <button
            onClick={closeAlert}
            autoFocus
            className="h-7 px-3 text-xs bg-white border border-gray-400 rounded-sm hover:bg-gray-50 transition-colors min-w-[70px]"
          >
            {closeLabel || t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
