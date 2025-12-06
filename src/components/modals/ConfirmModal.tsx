/**
 * Confirm Modal - Custom confirmation dialog (Office-style UI)
 */

import React, { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../store/modalStore';

export const ConfirmModal: React.FC = () => {
  const { t } = useTranslation();
  const { confirmModal, handleConfirm, handleCancel } = useModalStore();

  const { isOpen, title, message, confirmLabel, cancelLabel, variant } = confirmModal;

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        handleCancel();
      } else if (e.key === 'Enter') {
        handleConfirm();
      }
    },
    [isOpen, handleConfirm, handleCancel]
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
      case 'danger':
        return { icon: '!', bgColor: 'bg-red-100', textColor: 'text-red-600', borderColor: 'border-red-300' };
      case 'warning':
        return { icon: '!', bgColor: 'bg-amber-100', textColor: 'text-amber-600', borderColor: 'border-amber-300' };
      default:
        return { icon: '?', bgColor: 'bg-blue-100', textColor: 'text-blue-600', borderColor: 'border-blue-300' };
    }
  };

  const { icon, bgColor, textColor, borderColor } = getIconAndColor();

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white border border-office-border shadow-lg max-w-sm w-full mx-4">
        {/* Title bar */}
        <div className="h-8 bg-office-ribbon border-b border-office-border flex items-center justify-between px-3">
          <span className="text-xs font-medium text-office-text truncate">
            {title}
          </span>
          <button
            onClick={handleCancel}
            className="w-5 h-5 flex items-center justify-center text-office-text-secondary hover:bg-red-500 hover:text-white transition-colors text-sm"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div
              className={`w-8 h-8 flex items-center justify-center rounded-full ${bgColor} ${textColor} border ${borderColor} text-sm font-bold flex-shrink-0`}
            >
              {icon}
            </div>
            {/* Message */}
            <p className="text-sm text-office-text leading-relaxed pt-1">
              {message}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex justify-end gap-2">
          <button
            onClick={handleCancel}
            className="px-4 py-1.5 text-xs bg-white border border-office-border hover:bg-office-ribbon transition-colors min-w-[70px]"
          >
            {cancelLabel || t('common.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-1.5 text-xs border transition-colors min-w-[70px] ${
              variant === 'danger'
                ? 'bg-red-500 border-red-600 text-white hover:bg-red-600'
                : 'bg-office-accent border-office-accent text-white hover:bg-blue-600'
            }`}
          >
            {confirmLabel || t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};
