/**
 * URL Import Modal - Custom dialog for importing puzzles from URL
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../store/modalStoreContext';

export const UrlImportModal: React.FC = () => {
  const { t } = useTranslation();
  const { urlImportModal, closeUrlImport, submitUrlImport } = useModalStore();
  const [url, setUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { isOpen } = urlImportModal;

  // Reset URL when modal opens
  useEffect(() => {
    if (isOpen) {
      setUrl('');
      // Focus input after a short delay to ensure modal is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        closeUrlImport();
      }
    },
    [isOpen, closeUrlImport]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      submitUrlImport(url);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-gray-100 border border-gray-400 shadow-lg w-full max-w-md mx-4">
        {/* Title bar */}
        <div className="h-8 bg-gray-200 border-b border-gray-400 flex items-center justify-between px-3">
          <span className="text-xs font-medium text-gray-800 truncate">
            {t('file.importFromUrl')}
          </span>
          <button
            onClick={closeUrlImport}
            className="w-5 h-5 flex items-center justify-center text-gray-600 hover:bg-red-500 hover:text-white transition-colors text-sm"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-4 bg-white">
            <label className="block text-sm text-gray-700 mb-2">
              {t('file.urlImportDescription')}
            </label>
            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://puzz.link/p?... or https://pzv.jp/p.html?..."
              className="w-full px-3 py-2 text-sm border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-2 text-xs text-gray-500">
              {t('file.urlImportHint')}
            </p>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-100 flex justify-end gap-2 border-t border-gray-300">
            <button
              type="button"
              onClick={closeUrlImport}
              className="h-7 px-3 text-xs bg-white border border-gray-400 rounded-sm hover:bg-gray-50 transition-colors min-w-[70px]"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={!url.trim()}
              className="h-7 px-3 text-xs bg-blue-600 text-white border border-blue-700 rounded-sm hover:bg-blue-700 transition-colors min-w-[70px] disabled:bg-gray-400 disabled:border-gray-500 disabled:cursor-not-allowed"
            >
              {t('file.import')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
