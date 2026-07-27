import React, { useState, useEffect } from 'react';
import { shallow } from 'zustand/shallow';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { usePuzzleStore, usePuzzleStoreApi } from '../../store/puzzleStoreContext';
import { useModalStore, useModalStoreApi } from '../../store/modalStoreContext';
import { autoSave } from '../../utils/serialization';
import { useMenuState } from '../../hooks/useMenuState';
import { NewPuzzleDialog } from '../dialogs/NewPuzzleDialog';
import { PerformanceTestDialog } from '../dialogs/PerformanceTestDialog';
import { ShareUrlDialog } from '../dialogs/ShareUrlDialog';
import { OfficeMenuBar } from './OfficeMenuBar';
import {
  createExportHandlers,
  createImportHandlers,
  createMenuDefinitions,
  loadFromUrlOrAutoSave,
} from './menu';
import type { MenuDefinition } from './menu';

export const MenuBar: React.FC = () => {
  const { t } = useTranslation();
  const [isNewPuzzleOpen, setIsNewPuzzleOpen] = useState(false);
  const [isPerformanceTestOpen, setIsPerformanceTestOpen] = useState(false);
  const [shareUrlDialogOpen, setShareUrlDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const { menuRef, activeMenu, setActiveMenu, closeMenu } = useMenuState();

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
  } = usePuzzleStore(
    (state) => ({
      grid: state.grid,
      setGrid: state.setGrid,
      puzzle: state.puzzle,
      undo: state.undo,
      redo: state.redo,
      clearLayer: state.clearLayer,
      clearAll: state.clearAll,
      topology: state.topology,
      useTopology: state.useTopology,
      topologyPreset: state.topologyPreset,
      topologyIntensity: state.topologyIntensity,
      showConstraintLayer: state.showConstraintLayer,
      toggleConstraintLayer: state.toggleConstraintLayer,
      currentSchemaId: state.currentSchemaId,
      setCurrentSchemaId: state.setCurrentSchemaId,
      showAdjacency: state.showAdjacency,
      setShowAdjacency: state.setShowAdjacency,
      showProblemLayer: state.showProblemLayer,
      showAnswerLayer: state.showAnswerLayer,
      toggleProblemLayer: state.toggleProblemLayer,
      toggleAnswerLayer: state.toggleAnswerLayer,
    }),
    shallow
  );
  const store = usePuzzleStoreApi();
  const modalStore = useModalStoreApi();

  // Check if constraint mode is enabled
  const isConstraintEnabled = showConstraintLayer && currentSchemaId !== null && currentSchemaId !== '__custom__';

  const { showShortcuts } = useModalStore(
    (state) => ({ showShortcuts: state.showShortcuts }),
    shallow
  );

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
    onNew: () => { setIsNewPuzzleOpen(true); closeMenu(); },
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
      closeMenu();
      window.location.href = '/';
    },
    // Edit menu
    onUndo: () => { undo(); closeMenu(); },
    onRedo: () => { redo(); closeMenu(); },
    onToggleConstraintMode: () => { toggleConstraintLayer(); closeMenu(); },
    onClearProblem: () => { clearLayer('problem'); closeMenu(); },
    onClearAnswer: () => { clearLayer('answer'); closeMenu(); },
    onClearAll: () => { clearAll(); closeMenu(); },
    // View menu
    onToggleGrid: () => { setGrid({ showGrid: !grid.showGrid }); closeMenu(); },
    onToggleAdjacency: () => { setShowAdjacency(!showAdjacency); closeMenu(); },
    onToggleProblem: () => { toggleProblemLayer(); closeMenu(); },
    onToggleAnswer: () => { toggleAnswerLayer(); closeMenu(); },
    // Help menu
    onLanguageJa: () => { i18n.changeLanguage('ja'); closeMenu(); },
    onLanguageEn: () => { i18n.changeLanguage('en'); closeMenu(); },
    onShowShortcuts: () => { showShortcuts(); closeMenu(); },
    onPerformanceTest: () => { setIsPerformanceTestOpen(true); closeMenu(); },
    // State for checkmarks
    showConstraintLayer,
    showGrid: grid.showGrid,
    showAdjacency,
    showProblemLayer,
    showAnswerLayer,
  });

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
    <>
      <OfficeMenuBar
        menuRef={menuRef}
        menus={menus}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        className="border-b border-office-border"
        title={(
          <span className={`font-semibold text-sm ${isConstraintEnabled ? 'text-purple-600' : 'text-office-accent'}`}>
            {t('app.title')}
          </span>
        )}
        rightSlot={(
          <span className="text-xs text-office-text-secondary">
            {i18n.language === 'ja' ? '日本語' : 'English'}
          </span>
        )}
      />

      <NewPuzzleDialog
        isOpen={isNewPuzzleOpen}
        onClose={() => setIsNewPuzzleOpen(false)}
      />

      <PerformanceTestDialog
        isOpen={isPerformanceTestOpen}
        onClose={() => setIsPerformanceTestOpen(false)}
      />

      <ShareUrlDialog
        isOpen={shareUrlDialogOpen}
        onClose={() => setShareUrlDialogOpen(false)}
        url={shareUrl}
      />
    </>
  );
};
