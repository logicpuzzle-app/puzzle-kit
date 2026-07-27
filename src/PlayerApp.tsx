import React, { useEffect, useMemo, useRef } from 'react';
import { shallow } from 'zustand/shallow';
import { useTranslation } from 'react-i18next';
import './i18n';
import { PuzzleCanvas } from './components/canvas';
import { ToolModeSelector } from './components/toolbar/ToolModeSelector';
import { ConstraintPresetSelect, OfficeMenuBar } from './components/toolbar';
import { WorkspaceLayout } from './components/layouts/WorkspaceLayout';
import { FloatingNumberPad } from './components/panels/FloatingNumberPad';
import { TextInputDialog, StorageErrorDialog } from './components/dialogs';
import { CheckAnswerModal, BaseModals } from './components/modals';
import { usePuzzleStore, usePuzzleStoreApi } from './store/puzzleStoreContext';
import { useModalStore, useModalStoreApi } from './store/modalStoreContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useStorageErrorHandler } from './hooks/useStorageErrorHandler';
import { useStoragePersistence } from './hooks/useStoragePersistence';
import { useBoardCentering } from './hooks/useBoardCentering';
import { useMenuState } from './hooks/useMenuState';
import { useTextSymbolDialog } from './hooks/useTextSymbolDialog';
import { useImportFromUrl } from './hooks/useImportFromUrl';
import { useConstraintPresetOptions } from './hooks/useConstraintPresetOptions';
import { useNumberPadVisibility } from './hooks/useNumberPadVisibility';
import type { InputMode } from './constraints/types';
import type { MenuDefinition } from './components/toolbar/menu';

function PlayerApp() {
  const { t } = useTranslation();
  const {
    addSymbol,
    activeLayer,
    toolSettings,
    setActiveLayer,
    setPlayerMode,
    setConstraintSubCategory,
    setCurrentSchemaId,
    currentSchemaId,
    showConstraintLayer,
    toggleConstraintLayer,
    currentInputMode,
    setInputMode,
    checkAnswer,
    clearLayer,
    undo,
    redo,
    canUndo,
    canRedo,
    trialStage,
    enterTrial,
    acceptTrial,
    rejectCurrentTrial,
    rejectTrial,
    grid,
    showAdjacency,
    setShowAdjacency,
    setGrid,
    topology,
    useTopology,
    setPan,
    setZoom,
  } = usePuzzleStore(
    (state) => ({
      addSymbol: state.addSymbol,
      activeLayer: state.activeLayer,
      toolSettings: state.toolSettings,
      setActiveLayer: state.setActiveLayer,
      setPlayerMode: state.setPlayerMode,
      setConstraintSubCategory: state.setConstraintSubCategory,
      setCurrentSchemaId: state.setCurrentSchemaId,
      currentSchemaId: state.currentSchemaId,
      showConstraintLayer: state.showConstraintLayer,
      toggleConstraintLayer: state.toggleConstraintLayer,
      currentInputMode: state.currentInputMode,
      setInputMode: state.setInputMode,
      checkAnswer: state.checkAnswer,
      clearLayer: state.clearLayer,
      undo: state.undo,
      redo: state.redo,
      canUndo: state.canUndo,
      canRedo: state.canRedo,
      trialStage: state.trialStage,
      enterTrial: state.enterTrial,
      acceptTrial: state.acceptTrial,
      rejectCurrentTrial: state.rejectCurrentTrial,
      rejectTrial: state.rejectTrial,
      grid: state.grid,
      showAdjacency: state.showAdjacency,
      setShowAdjacency: state.setShowAdjacency,
      setGrid: state.setGrid,
      topology: state.topology,
      useTopology: state.useTopology,
      setPan: state.setPan,
      setZoom: state.setZoom,
    }),
    shallow
  );
  const store = usePuzzleStoreApi();
  const modalStore = useModalStoreApi();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasWrapperRef = useRef<HTMLDivElement | null>(null);

  // Player-only keyboard shortcuts (no layer toggle)
  useKeyboardShortcuts({ allowLayerToggle: false });

  // Storage persistence (auto-save/load settings to localStorage)
  useStoragePersistence();

  // Storage error handling
  const { error: storageError, clearError: clearStorageError, isErrorOpen: isStorageErrorOpen } = useStorageErrorHandler();

  const { handleTextClick, dialogProps: textDialogProps } = useTextSymbolDialog({
    addSymbol,
    toolSettings,
    activeLayer,
  });

  useEffect(() => {
    setPlayerMode(true);
    setActiveLayer('answer');
    setConstraintSubCategory('play');
  }, [setActiveLayer, setConstraintSubCategory, setPlayerMode]);

  const { showShortcuts } = useModalStore(
    (state) => ({ showShortcuts: state.showShortcuts }),
    shallow
  );
  const { menuRef, activeMenu, setActiveMenu, closeMenu } = useMenuState();
  const { handleImportFromUrl } = useImportFromUrl({
    store,
    modalStore,
    t,
    setActiveMenu,
  });
  const {
    presetOptions,
    isConstraintAvailable,
    isConstraintEnabled,
    playModes,
  } = useConstraintPresetOptions({
    currentSchemaId,
    showConstraintLayer,
    t,
  });
  const { centerBoard } = useBoardCentering({
    canvasWrapperRef,
    grid,
    topology,
    useTopology,
    setPan,
    setZoom,
    getCurrentZoom: () => store.getState().canvas.zoom,
  });

  useEffect(() => {
    centerBoard(true);
  }, [centerBoard]);

  const showNumberPad = useNumberPadVisibility({
    currentTool: toolSettings.currentTool,
    currentInputMode,
  });

  useEffect(() => {
    const handleResize = () => {
      centerBoard(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [centerBoard]);

  const playerMenus = useMemo<MenuDefinition[]>(() => [
    {
      labelKey: 'menu.file',
      items: [
        {
          labelKey: 'file.importFromUrl',
          action: () => {
            handleImportFromUrl();
            closeMenu();
          },
        },
        { divider: true, labelKey: '' },
        {
          labelKey: 'file.exitToHome',
          action: () => {
            closeMenu();
            window.location.href = '/';
          },
        },
      ],
    },
    {
      labelKey: 'menu.edit',
      items: [
        {
          labelKey: 'edit.undo',
          action: () => {
            undo();
            closeMenu();
          },
          disabled: !canUndo(),
        },
        {
          labelKey: 'edit.redo',
          action: () => {
            redo();
            closeMenu();
          },
          disabled: !canRedo(),
        },
        { divider: true, labelKey: '' },
        {
          labelKey: 'edit.constraintMode',
          checked: isConstraintEnabled,
          action: () => {
            toggleConstraintLayer();
            closeMenu();
          },
          disabled: !isConstraintAvailable,
        },
        { divider: true, labelKey: '' },
        {
          labelKey: 'trial.enter',
          action: () => {
            enterTrial();
            closeMenu();
          },
        },
        {
          labelKey: 'trial.accept',
          action: () => {
            acceptTrial();
            closeMenu();
          },
          disabled: trialStage === 0,
        },
        {
          labelKey: 'trial.reject',
          action: () => {
            rejectCurrentTrial();
            closeMenu();
          },
          disabled: trialStage === 0,
        },
        {
          labelKey: 'trial.rejectAll',
          action: () => {
            rejectTrial();
            closeMenu();
          },
          disabled: trialStage <= 1,
        },
        { divider: true, labelKey: '' },
        {
          labelKey: 'edit.clearAnswer',
          action: () => {
            clearLayer('answer');
            closeMenu();
          },
        },
      ],
    },
    {
      labelKey: 'menu.view',
      items: [
        {
          labelKey: 'view.showGrid',
          checked: grid.showGrid,
          action: () => {
            setGrid({ showGrid: !grid.showGrid });
            closeMenu();
          },
        },
        {
          labelKey: 'view.showAdjacency',
          checked: showAdjacency,
          action: () => {
            setShowAdjacency(!showAdjacency);
            closeMenu();
          },
        },
      ],
    },
    {
      labelKey: 'menu.help',
      items: [
        {
          labelKey: 'help.shortcuts',
          action: () => {
            showShortcuts();
            closeMenu();
          },
        },
      ],
    },
  ], [
    acceptTrial,
    canRedo,
    canUndo,
    clearLayer,
    closeMenu,
    enterTrial,
    grid.showGrid,
    handleImportFromUrl,
    isConstraintAvailable,
    isConstraintEnabled,
    redo,
    rejectCurrentTrial,
    rejectTrial,
    setGrid,
    setShowAdjacency,
    showAdjacency,
    showShortcuts,
    toggleConstraintLayer,
    trialStage,
    undo,
  ]);

  return (
    <div ref={rootRef} className="flex flex-col h-screen bg-office-bg font-segoe relative">
      <WorkspaceLayout
        canvasWrapperRef={canvasWrapperRef}
        header={(
          <header className="sticky top-0 z-30 flex flex-col gap-2 px-3 pb-2 pt-0 border-b border-office-border bg-white">
            <OfficeMenuBar
              menuRef={menuRef}
              menus={playerMenus}
              activeMenu={activeMenu}
              setActiveMenu={setActiveMenu}
              className="border border-office-border -mx-3"
              title={(
                <span className={`font-semibold text-sm ${isConstraintEnabled ? 'text-purple-600' : 'text-office-accent'}`}>
                  {t('app.playerTitle', 'PuzzleKit Player')}
                </span>
              )}
            />
            <ConstraintPresetSelect
              className="flex-wrap justify-end"
              currentSchemaId={currentSchemaId}
              presetOptions={presetOptions}
              onChange={setCurrentSchemaId}
            />

            <div className="flex flex-wrap items-center gap-2">
              <button className="btn-office" onClick={handleImportFromUrl}>
                {t('file.importFromUrl')}
              </button>
              <button
                className="btn-office-primary"
                onClick={() => checkAnswer()}
                disabled={!isConstraintAvailable}
              >
                {t('constraint.checkAnswer')}
              </button>
              <button className="btn-office" onClick={() => undo()} disabled={!canUndo()}>
                {t('edit.undo')}
              </button>
              <button className="btn-office" onClick={() => redo()} disabled={!canRedo()}>
                {t('edit.redo')}
              </button>
              <button className="btn-office" onClick={() => enterTrial()}>
                {t('trial.enter')}
              </button>
              <button className="btn-office" onClick={() => acceptTrial()} disabled={trialStage === 0}>
                {t('trial.accept')}
              </button>
              <button className="btn-office" onClick={() => rejectCurrentTrial()} disabled={trialStage === 0}>
                {t('trial.reject')}
              </button>
              {trialStage > 1 && (
                <button className="btn-office" onClick={() => rejectTrial()}>
                  {t('trial.rejectAll')}
                </button>
              )}
              {trialStage > 0 && (
                <span className="text-xs text-office-text-secondary">
                  {t('trial.stage')}: {trialStage}
                </span>
              )}
              <button
                className={`btn-office ${isConstraintEnabled ? 'bg-office-accent text-white border-office-accent' : ''}`}
                onClick={() => toggleConstraintLayer()}
                disabled={!isConstraintAvailable}
                aria-pressed={isConstraintEnabled}
              >
                {isConstraintAvailable
                  ? (isConstraintEnabled ? t('constraint.enabled') : t('constraint.disabled'))
                  : t('constraint.noPreset')}
              </button>
              <button className="btn-office" onClick={() => clearLayer('answer')}>
                {t('edit.clearAnswer')}
              </button>
            </div>
          </header>
        )}
        footer={(
          <footer className="border-t border-office-border bg-white px-3 py-2">
            {playModes.length > 0 ? (
              <div className="flex flex-col gap-2">
                <ToolModeSelector
                  modes={playModes as InputMode[]}
                  currentMode={currentInputMode as InputMode}
                  onModeChange={(mode) => setInputMode(mode)}
                />
              </div>
            ) : (
              <div className="text-xs text-office-text-secondary">
                {t('constraint.noPreset')}
              </div>
            )}
          </footer>
        )}
      >
        <PuzzleCanvas onTextClick={handleTextClick} allowMultiTouchPanZoom={false} />
      </WorkspaceLayout>
      <FloatingNumberPad
        show={showNumberPad}
        rootRef={rootRef}
        anchorRef={canvasWrapperRef}
        title={t('tool.number', 'Number')}
      />

      <TextInputDialog {...textDialogProps} />

      <StorageErrorDialog
        isOpen={isStorageErrorOpen}
        onClose={clearStorageError}
        dataSize={storageError?.dataSize ?? 0}
        errorType={storageError?.errorType ?? 'general'}
      />

      <CheckAnswerModal />
      <BaseModals />
    </div>
  );
}

export default PlayerApp;
