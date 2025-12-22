/**
 * Shortcuts Modal - Keyboard shortcuts reference (Office-style UI)
 */

import React, { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../store/modalStoreContext';

interface ShortcutItem {
  key: string;
  description: string;
}

interface ShortcutGroup {
  title: string;
  items: ShortcutItem[];
}

export const ShortcutsModal: React.FC = () => {
  const { t } = useTranslation();
  const { shortcutsModal, closeShortcuts } = useModalStore();

  const { isOpen } = shortcutsModal;

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        closeShortcuts();
      }
    },
    [isOpen, closeShortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) {
    return null;
  }

  const shortcutGroups: ShortcutGroup[] = [
    {
      title: t('shortcuts.edit'),
      items: [
        { key: 'Ctrl+Z', description: t('shortcuts.undo') },
        { key: 'Ctrl+Shift+Z', description: t('shortcuts.redo') },
        { key: 'Ctrl+Y', description: t('shortcuts.redo') },
      ],
    },
    {
      title: t('shortcuts.layers'),
      items: [
        { key: 'Tab', description: t('shortcuts.toggleLayer') },
      ],
    },
    {
      title: t('shortcuts.colors'),
      items: [
        { key: 'Space', description: t('shortcuts.swapColors') },
      ],
    },
    {
      title: t('shortcuts.view'),
      items: [
        { key: 'Ctrl++', description: t('shortcuts.zoomIn') },
        { key: 'Ctrl+-', description: t('shortcuts.zoomOut') },
        { key: 'Ctrl+0', description: t('shortcuts.resetZoom') },
        { key: 'H', description: t('shortcuts.panMode') },
        { key: t('shortcuts.mouseWheel'), description: t('shortcuts.pan') },
        { key: 'Ctrl+' + t('shortcuts.wheel'), description: t('shortcuts.zoom') },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-gray-100 border border-gray-400 shadow-lg max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col">
        {/* Title bar */}
        <div className="h-8 bg-gray-200 border-b border-gray-400 flex items-center justify-between px-3 flex-shrink-0">
          <span className="text-xs font-medium text-gray-800">
            {t('help.shortcuts')}
          </span>
          <button
            onClick={closeShortcuts}
            className="w-5 h-5 flex items-center justify-center text-gray-600 hover:bg-red-500 hover:text-white transition-colors text-sm"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shortcutGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="border border-gray-300">
                {/* Group header */}
                <div className="bg-gray-100 px-3 py-1.5 border-b border-gray-300">
                  <h3 className="text-xs font-medium text-gray-800">
                    {group.title}
                  </h3>
                </div>
                {/* Group items */}
                <div className="divide-y divide-gray-200">
                  {group.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50"
                    >
                      <span className="text-xs text-gray-800">
                        {item.description}
                      </span>
                      <kbd className="text-[10px] bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 font-mono text-gray-700 ml-2 flex-shrink-0">
                        {item.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-300 flex justify-end flex-shrink-0">
          <button
            onClick={closeShortcuts}
            className="h-7 px-3 text-xs bg-white border border-gray-400 rounded-sm hover:bg-gray-50 transition-colors min-w-[70px]"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
