import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './i18n';
import { PuzzleCanvas } from './components/canvas';
import { ToolModeSelector } from './components/toolbar/ToolModeSelector';
import { FloatingNumberPad } from './components/panels/FloatingNumberPad';
import { TextInputDialog, StorageErrorDialog } from './components/dialogs';
import { CheckAnswerModal, ConfirmModal, AlertModal, ShortcutsModal, UrlImportModal } from './components/modals';
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

type PlayerMenuItem = {
  labelKey: string;
  action?: () => void;
  divider?: boolean;
  disabled?: boolean;
  checked?: boolean;
};

type PlayerMenu = {
  labelKey: string;
  items: PlayerMenuItem[];
};

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
  } = usePuzzleStore();
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

  const { showShortcuts } = useModalStore();
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
  const getCurrentZoom = useCallback(() => store.getState().canvas.zoom, [store]);
  const { centerBoard } = useBoardCentering({
    canvasWrapperRef,
    grid,
    topology,
    useTopology,
    setPan,
    setZoom,
    getCurrentZoom,
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

  const playerMenus = useMemo<PlayerMenu[]>(() => [
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
      <div className="flex flex-col flex-1 min-h-0 w-full max-w-[1024px] mx-auto">
        <header className="sticky top-0 z-30 flex flex-col gap-2 px-3 pb-2 pt-0 border-b border-office-border bg-white">
          <div
            ref={menuRef}
            className="flex items-center bg-office-ribbon border border-office-border h-7 px-1 -mx-3"
          >
            <div className="flex items-center px-2 mr-2">
              <span className={`font-semibold text-sm ${isConstraintEnabled ? 'text-purple-600' : 'text-office-accent'}`}>
                {t('app.playerTitle', 'PuzzleKit Player')}
              </span>
            </div>
            {playerMenus.map((menu) => (
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

                {activeMenu === menu.labelKey && (
                  <div className="absolute top-full left-0 bg-white border border-office-border shadow-lg min-w-[200px] py-1 z-40">
                    {menu.items.map((item, index) =>
                      item.divider ? (
                        <div key={`${menu.labelKey}-divider-${index}`} className="border-t border-office-border my-1" />
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
                          <span className="flex items-center gap-2">
                            {item.checked !== undefined && (
                              <span className="w-4 text-center">
                                {item.checked ? '✓' : ''}
                              </span>
                            )}
                            {t(item.labelKey)}
                          </span>
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="text-xs text-office-text-secondary">{t('constraint.preset')}</span>
            <select
              className="select-office text-xs"
              value={currentSchemaId && currentSchemaId !== '__custom__' ? currentSchemaId : ''}
              onChange={(event) => {
                const value = event.target.value;
                setCurrentSchemaId(value ? value : null);
              }}
            >
              <option value="">{t('constraint.noPreset')}</option>
              {presetOptions.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

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

        <div ref={canvasWrapperRef} className="flex-1 min-h-0 flex flex-col">
          <PuzzleCanvas onTextClick={handleTextClick} allowMultiTouchPanZoom={false} />
        </div>

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
      </div>
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
      <ConfirmModal />
      <AlertModal />
      <ShortcutsModal />
      <UrlImportModal />
    </div>
  );
}

export default PlayerApp;
