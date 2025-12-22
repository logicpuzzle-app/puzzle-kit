import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { usePuzzleStore, usePuzzleStoreApi } from '../../store/puzzleStoreContext';
import { useModalStore, useModalStoreApi } from '../../store/modalStoreContext';
import { autoSave } from '../../utils/serialization';
import { NewPuzzleDialog } from '../dialogs/NewPuzzleDialog';
import { PerformanceTestDialog } from '../dialogs/PerformanceTestDialog';
import { ShareUrlDialog } from '../dialogs/ShareUrlDialog';
import {
  createExportHandlers,
  createImportHandlers,
  createMenuDefinitions,
  loadFromUrlOrAutoSave,
} from './menu';
import type { MenuDefinition } from './menu';

export const MenuBar: React.FC = () => {
  const { t } = useTranslation();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isNewPuzzleOpen, setIsNewPuzzleOpen] = useState(false);
  const [isPerformanceTestOpen, setIsPerformanceTestOpen] = useState(false);
  const [shareUrlDialogOpen, setShareUrlDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    grid,
    setGrid,
    puzzle,
    undo,
    redo,
    clearLayer,
    clearAll,
    topology,
    useTopology,
    topologyPreset,
    topologyIntensity,
    showConstraintLayer,
    toggleConstraintLayer,
    currentSchemaId,
    setCurrentSchemaId,
    showAdjacency,
    setShowAdjacency,
    showProblemLayer,
    showAnswerLayer,
    toggleProblemLayer,
    toggleAnswerLayer,
  } = usePuzzleStore();
  const store = usePuzzleStoreApi();
  const modalStore = useModalStoreApi();

  // Check if constraint mode is enabled
  const isConstraintEnabled = showConstraintLayer && currentSchemaId !== null && currentSchemaId !== '__custom__';

  const { showShortcuts } = useModalStore();

  // Auto-save on changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const topologySettings = {
        useTopology,
        topologyPreset,
        topologyIntensity,
      };
      autoSave(grid, puzzle, undefined, topologySettings);
    }, 2000);
    return () => clearTimeout(timer);
  }, [grid, puzzle, useTopology, topologyPreset, topologyIntensity]);

  // Load from URL or auto-save on mount
  useEffect(() => {
    loadFromUrlOrAutoSave(store);
  }, [store]);

  // Create export handlers
  const exportHandlers = createExportHandlers({
    modalStore,
    grid,
    puzzle,
    topology,
    useTopology,
    topologyPreset,
    topologyIntensity,
    setActiveMenu,
    t,
  });

  // Create import handlers
  const importHandlers = createImportHandlers({
    store,
    modalStore,
    grid,
    puzzle,
    setActiveMenu,
    setCurrentSchemaId,
    t,
  });

  // Create menu definitions
  const menus: MenuDefinition[] = createMenuDefinitions({
    // File menu
    onNew: () => { setIsNewPuzzleOpen(true); setActiveMenu(null); },
    onOpen: importHandlers.handleImportJson,
    onSave: exportHandlers.handleExportJson,
    onImportPenpa: importHandlers.handleImportPenpaUrl,
    onExportPuzzlink: importHandlers.handleExportPuzzlink,
    onShareUrl: () => exportHandlers.handleShareUrl(setShareUrl, setShareUrlDialogOpen),
    onExportPng: exportHandlers.handleExportPng,
    onExportPng2x: () => exportHandlers.handleExportPngHQ(2),
    onExportPng4x: () => exportHandlers.handleExportPngHQ(4),
    onExportSvg: exportHandlers.handleExportSvg,
    onExitToHome: () => {
      setActiveMenu(null);
      window.location.href = '/';
    },
    // Edit menu
    onUndo: () => { undo(); setActiveMenu(null); },
    onRedo: () => { redo(); setActiveMenu(null); },
    onToggleConstraintMode: () => { toggleConstraintLayer(); setActiveMenu(null); },
    onClearProblem: () => { clearLayer('problem'); setActiveMenu(null); },
    onClearAnswer: () => { clearLayer('answer'); setActiveMenu(null); },
    onClearAll: () => { clearAll(); setActiveMenu(null); },
    // View menu
    onToggleGrid: () => { setGrid({ showGrid: !grid.showGrid }); setActiveMenu(null); },
    onToggleAdjacency: () => { setShowAdjacency(!showAdjacency); setActiveMenu(null); },
    onToggleProblem: () => { toggleProblemLayer(); setActiveMenu(null); },
    onToggleAnswer: () => { toggleAnswerLayer(); setActiveMenu(null); },
    // Help menu
    onLanguageJa: () => { i18n.changeLanguage('ja'); setActiveMenu(null); },
    onLanguageEn: () => { i18n.changeLanguage('en'); setActiveMenu(null); },
    onShowShortcuts: () => { showShortcuts(); setActiveMenu(null); },
    onPerformanceTest: () => { setIsPerformanceTestOpen(true); setActiveMenu(null); },
    // State for checkmarks
    showConstraintLayer,
    showGrid: grid.showGrid,
    showAdjacency,
    showProblemLayer,
    showAnswerLayer,
  });

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        exportHandlers.handleExportJson();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        importHandlers.handleImportJson();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setIsNewPuzzleOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, grid, puzzle, exportHandlers, importHandlers]);

  return (
    <div
      ref={menuRef}
      className="flex items-center bg-office-ribbon border-b border-office-border h-7 px-1"
    >
      {/* App icon/title */}
      <div className="flex items-center px-2 mr-2">
        <span className={`font-semibold text-sm ${isConstraintEnabled ? 'text-purple-600' : 'text-office-accent'}`}>
          {t('app.title')}
        </span>
      </div>

      {/* Menu items */}
      {menus.map((menu) => (
        <div key={menu.labelKey} className="relative">
          <button
            className={`px-3 py-1 text-sm hover:bg-office-ribbon-hover transition-colors ${
              activeMenu === menu.labelKey ? 'bg-office-ribbon-hover' : ''
            }`}
            onClick={() =>
              setActiveMenu(activeMenu === menu.labelKey ? null : menu.labelKey)
            }
            onMouseEnter={() => activeMenu && setActiveMenu(menu.labelKey)}
          >
            {t(menu.labelKey)}
          </button>

          {/* Dropdown */}
          {activeMenu === menu.labelKey && (
            <div className="absolute top-full left-0 bg-white border border-office-border shadow-lg min-w-[200px] py-1 z-50">
              {menu.items.map((item, index) =>
                item.divider ? (
                  <div
                    key={index}
                    className="border-t border-office-border my-1"
                  />
                ) : (
                  <button
                    key={item.labelKey}
                    className={`w-full text-left px-4 py-1.5 text-sm flex justify-between items-center ${
                      item.disabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'hover:bg-office-ribbon-hover'
                    }`}
                    onClick={() => !item.disabled && item.action?.()}
                    disabled={item.disabled}
                  >
                    <span className={`flex items-center gap-2 ${item.strikethrough ? 'line-through' : ''}`}>
                      {item.checked !== undefined && (
                        <span className="w-4 text-center">
                          {item.checked ? '✓' : ''}
                        </span>
                      )}
                      {t(item.labelKey)}{item.suffix ? ` ${item.suffix}` : ''}
                    </span>
                    {item.shortcut && (
                      <span className="text-office-text-secondary text-xs ml-4">
                        {item.shortcut}
                      </span>
                    )}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}

      {/* Right side - language indicator */}
      <div className="ml-auto flex items-center gap-2 px-2">
        <span className="text-xs text-office-text-secondary">
          {i18n.language === 'ja' ? '日本語' : 'English'}
        </span>
      </div>

      {/* New Puzzle Dialog */}
      <NewPuzzleDialog
        isOpen={isNewPuzzleOpen}
        onClose={() => setIsNewPuzzleOpen(false)}
      />

      {/* Performance Test Dialog */}
      <PerformanceTestDialog
        isOpen={isPerformanceTestOpen}
        onClose={() => setIsPerformanceTestOpen(false)}
      />

      <ShareUrlDialog
        isOpen={shareUrlDialogOpen}
        onClose={() => setShareUrlDialogOpen(false)}
        url={shareUrl}
      />
    </div>
  );
};
