/**
 * Shortcuts Modal - Keyboard shortcuts reference (Office-style UI)
 */

import React, { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../store/modalStore';

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
      title: t('shortcuts.primaryTools'),
      items: [
        { key: 'S', description: t('shortcuts.surfaceFill') },
        { key: 'Shift+S', description: t('shortcuts.surfaceDot') },
        { key: 'L', description: t('shortcuts.lineNormal') },
        { key: 'Shift+L', description: t('shortcuts.lineDiagonal') },
        { key: 'E', description: t('shortcuts.edgeNormal') },
        { key: 'Shift+E', description: t('shortcuts.edgeDiagonal') },
        { key: 'W', description: t('shortcuts.wall') },
        { key: 'N', description: t('shortcuts.numberNormal') },
        { key: 'Shift+N', description: t('shortcuts.numberCorner') },
        { key: 'O', description: t('shortcuts.circle') },
        { key: 'Shift+O', description: t('shortcuts.triangle') },
        { key: 'X', description: t('shortcuts.cross') },
        { key: 'V', description: t('shortcuts.select') },
      ],
    },
    {
      title: t('shortcuts.colors'),
      items: [
        { key: 'Space', description: t('shortcuts.swapColors') },
        { key: 'F1', description: t('shortcuts.grey') },
        { key: 'F2', description: t('shortcuts.green') },
        { key: 'F3', description: t('shortcuts.black') },
        { key: 'F4', description: t('shortcuts.red') },
      ],
    },
    {
      title: t('shortcuts.layers'),
      items: [
        { key: 'Q', description: t('shortcuts.problemLayer') },
        { key: 'A', description: t('shortcuts.answerLayer') },
        { key: 'Tab', description: t('shortcuts.toggleLayer') },
        { key: 'P', description: t('shortcuts.toggleProblemVisibility') },
      ],
    },
    {
      title: t('shortcuts.edit'),
      items: [
        { key: 'Ctrl+Z', description: t('shortcuts.undo') },
        { key: 'Ctrl+Shift+Z', description: t('shortcuts.redo') },
        { key: 'Ctrl+S', description: t('shortcuts.save') },
        { key: 'Ctrl+O', description: t('shortcuts.open') },
        { key: 'Ctrl+N', description: t('shortcuts.new') },
      ],
    },
    {
      title: t('shortcuts.view'),
      items: [
        { key: 'Ctrl++', description: t('shortcuts.zoomIn') },
        { key: 'Ctrl+-', description: t('shortcuts.zoomOut') },
        { key: 'Ctrl+0', description: t('shortcuts.resetZoom') },
        { key: t('shortcuts.mouseWheel'), description: t('shortcuts.pan') },
        { key: 'Ctrl+' + t('shortcuts.wheel'), description: t('shortcuts.zoom') },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white border border-office-border shadow-lg max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col">
        {/* Title bar */}
        <div className="h-8 bg-office-ribbon border-b border-office-border flex items-center justify-between px-3 flex-shrink-0">
          <span className="text-xs font-medium text-office-text">
            {t('help.shortcuts')}
          </span>
          <button
            onClick={closeShortcuts}
            className="w-5 h-5 flex items-center justify-center text-office-text-secondary hover:bg-red-500 hover:text-white transition-colors text-sm"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shortcutGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="border border-office-border">
                {/* Group header */}
                <div className="bg-office-ribbon px-3 py-1.5 border-b border-office-border">
                  <h3 className="text-xs font-medium text-office-text">
                    {group.title}
                  </h3>
                </div>
                {/* Group items */}
                <div className="divide-y divide-office-border">
                  {group.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="flex items-center justify-between px-3 py-1.5 hover:bg-office-ribbon/50"
                    >
                      <span className="text-xs text-office-text">
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
        <div className="px-4 py-3 border-t border-office-border flex justify-end flex-shrink-0">
          <button
            onClick={closeShortcuts}
            className="px-4 py-1.5 text-xs bg-office-ribbon border border-office-border hover:bg-office-ribbon-hover transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
