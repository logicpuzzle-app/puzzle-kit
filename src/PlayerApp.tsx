import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './i18n';
import { PuzzleCanvas, type TextClickInfo } from './components/canvas';
import { ToolModeSelector } from './components/toolbar/ToolModeSelector';
import { NumberInputPanel } from './components/panels/properties/NumberInputPanel';
import { TextInputDialog, type TextInputType, StorageErrorDialog } from './components/dialogs';
import { CheckAnswerModal, ConfirmModal, AlertModal, ShortcutsModal, UrlImportModal } from './components/modals';
import { usePuzzleStore, usePuzzleStoreApi } from './store/puzzleStoreContext';
import { useModalStore, useModalStoreApi } from './store/modalStoreContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useStorageErrorHandler } from './hooks/useStorageErrorHandler';
import { useStoragePersistence } from './hooks/useStoragePersistence';
import { constraintCatalog } from './constraints/ConstraintCatalog';
import type { InputMode } from './constraints/types';
import { createImportHandlers, loadFromUrlOrAutoSave } from './components/toolbar/menu';
import { toDataLayer } from './types';
import { getGridDimensions } from './utils/gridUtils';

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
  const panelPositionRef = useRef<{ x: number; y: number } | null>(null);
  const panelSizeRef = useRef<{ width: number; height: number }>({ width: 260, height: 280 });
  const panelHeaderRef = useRef<HTMLDivElement | null>(null);
  const panelBodyRef = useRef<HTMLDivElement | null>(null);
  const panelContentRef = useRef<HTMLDivElement | null>(null);
  const panelContentHeightRef = useRef(0);
  const dragStateRef = useRef<{
    type: 'drag' | 'resize';
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    originWidth: number;
    originHeight: number;
  } | null>(null);

  // Player-only keyboard shortcuts (no layer toggle)
  useKeyboardShortcuts({ allowLayerToggle: false });

  // Storage persistence (auto-save/load settings to localStorage)
  useStoragePersistence();

  // Storage error handling
  const { error: storageError, clearError: clearStorageError, isErrorOpen: isStorageErrorOpen } = useStorageErrorHandler();

  // Text dialog state
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [textDialogCellId, setTextDialogCellId] = useState('');
  const [textDialogInitialValue, setTextDialogInitialValue] = useState('');
  const [textDialogType, setTextDialogType] = useState<TextInputType>('alphabet');

  useEffect(() => {
    void loadFromUrlOrAutoSave(store);
  }, [store]);

  useEffect(() => {
    setPlayerMode(true);
    setActiveLayer('answer');
    setConstraintSubCategory('play');
  }, [setActiveLayer, setConstraintSubCategory, setPlayerMode]);

  const handleTextClick = useCallback((info: TextClickInfo) => {
    setTextDialogCellId(info.cellId);
    const existingValue = info.existingText?.symbolType?.replace('text-', '').split(':')[1] || '';
    setTextDialogInitialValue(existingValue);
    setTextDialogType(info.textType as TextInputType);
    setTextDialogOpen(true);
  }, []);

  const handleTextSubmit = useCallback(
    (data: { value: string; textType: TextInputType }) => {
      if (textDialogCellId && data.value) {
        addSymbol({
          cellId: textDialogCellId,
          symbolType: `text-${data.textType}:${data.value}`,
          size: toolSettings.symbolSize,
          rotation: 0,
          color: toolSettings.color,
          layer: toDataLayer(activeLayer),
        });
      }
    },
    [textDialogCellId, addSymbol, toolSettings, activeLayer]
  );

  const { showShortcuts } = useModalStore();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const closeMenu = useCallback(() => setActiveMenu(null), []);

  const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;
  const playModes = currentSchema?.inputModes.play ?? [];
  const isConstraintAvailable = currentSchemaId !== null && currentSchemaId !== '__custom__';
  const isConstraintEnabled = isConstraintAvailable && showConstraintLayer;
  const presetOptions = useMemo(
    () =>
      constraintCatalog
        .getAllSchemas()
        .map((schema) => ({
          id: schema.pid,
          label: schema.nameKey ? t(schema.nameKey) : schema.name,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [t]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const getBoardDimensions = useCallback(() => {
    const topologyPreferred =
      useTopology ||
      grid.gridType === 'pyramid' ||
      grid.gridType === 'iso' ||
      grid.gridType === 'penrose_P3';

    if (topologyPreferred && topology) {
      const exportPaddingLeft = grid.exportPaddingLeft ?? 0;
      const exportPaddingRight = grid.exportPaddingRight ?? 0;
      const exportPaddingTop = grid.exportPaddingTop ?? 0;
      const exportPaddingBottom = grid.exportPaddingBottom ?? 0;
      return {
        width: topology.bounds.width + exportPaddingLeft + exportPaddingRight,
        height: topology.bounds.height + exportPaddingTop + exportPaddingBottom,
      };
    }

    return getGridDimensions(grid);
  }, [grid, topology, useTopology]);

  const centerBoard = useCallback(
    (forceFit: boolean) => {
      const container = canvasWrapperRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const { width, height } = getBoardDimensions();
      if (width === 0 || height === 0) return;

      const currentZoom = store.getState().canvas.zoom;
      let nextZoom = currentZoom;

      if (forceFit) {
        const fitZoom = Math.min(1, rect.width / width, rect.height / height);
        nextZoom = Math.max(0.1, Math.min(5, fitZoom));
        if (Math.abs(nextZoom - currentZoom) > 0.001) {
          setZoom(nextZoom);
        }
      }

      const zoomForPan = forceFit ? nextZoom : currentZoom;
      const panX = (rect.width - width * zoomForPan) / 2;
      const panY = (rect.height - height * zoomForPan) / 2;
      setPan(panX, panY);
    },
    [getBoardDimensions, setPan, setZoom]
  );

  useEffect(() => {
    centerBoard(true);
  }, [centerBoard, getBoardDimensions]);

  const showNumberPad = useMemo(() => {
    const isNumberInputMode = currentInputMode === 'number' || currentInputMode === 'number-' || currentInputMode === 'direc';
    return toolSettings.currentTool.startsWith('number') || isNumberInputMode;
  }, [toolSettings.currentTool, currentInputMode]);

  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number } | null>(null);
  const [panelSize, setPanelSize] = useState<{ width: number; height: number }>({
    width: panelSizeRef.current.width,
    height: panelSizeRef.current.height,
  });

  useEffect(() => {
    panelPositionRef.current = panelPosition;
  }, [panelPosition]);

  useEffect(() => {
    panelSizeRef.current = panelSize;
  }, [panelSize]);

  const clampPanelWithinBounds = useCallback((pos: { x: number; y: number }, size: { width: number; height: number }) => {
    const container = rootRef.current;
    if (!container) return { position: pos, size };
    const rect = container.getBoundingClientRect();
    const margin = 12;
    const minWidth = 200;
    const minHeight = 220;
    const maxWidth = Math.max(minWidth, rect.width - margin * 2);
    const maxHeight = Math.max(minHeight, rect.height - margin * 2);

    const width = Math.min(Math.max(size.width, minWidth), maxWidth);
    const height = Math.min(Math.max(size.height, minHeight), maxHeight);
    const x = Math.min(Math.max(pos.x, margin), rect.width - width - margin);
    const y = Math.min(Math.max(pos.y, margin), rect.height - height - margin);
    return { position: { x, y }, size: { width, height } };
  }, []);

  const initializePanelLayout = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    if (rootRect.width === 0 || rootRect.height === 0) return;

    const canvasRect = canvasWrapperRef.current?.getBoundingClientRect();
    const anchorRect = canvasRect ?? rootRect;
    const margin = 12;
    const maxWidth = rootRect.width - margin * 2;
    const maxHeight = rootRect.height - margin * 2;
    const width = Math.min(280, Math.max(200, maxWidth));
    const height = Math.min(280, Math.max(220, maxHeight));
    const anchorX = anchorRect.left - rootRect.left + (anchorRect.width - width) / 2;
    const anchorY = anchorRect.top - rootRect.top + anchorRect.height - height - margin;

    const { position, size } = clampPanelWithinBounds({ x: anchorX, y: anchorY }, { width, height });
    setPanelSize(size);
    setPanelPosition(position);
  }, [clampPanelWithinBounds]);

  useEffect(() => {
    if (!showNumberPad) return;
    if (!panelPositionRef.current) {
      initializePanelLayout();
      return;
    }
    const { position, size } = clampPanelWithinBounds(panelPositionRef.current, panelSizeRef.current);
    setPanelPosition(position);
    setPanelSize(size);
  }, [showNumberPad, clampPanelWithinBounds, initializePanelLayout]);

  const updatePanelHeight = useCallback(() => {
    if (!showNumberPad) return;
    const headerEl = panelHeaderRef.current;
    const contentEl = panelContentRef.current;
    if (!headerEl || !contentEl) return;
    const container = rootRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const margin = 12;
    const minHeight = 220;
    const maxHeight = Math.max(minHeight, rect.height - margin * 2);
    const autoMaxHeight = Math.min(maxHeight, Math.round(rect.height * 0.8));
    const headerHeight = headerEl.getBoundingClientRect().height;
    const extraHeight = 8;
    const bodyPadding = 16;
    const contentHeight = contentEl.scrollHeight;
    const previousContentHeight = panelContentHeightRef.current;
    panelContentHeightRef.current = contentHeight;
    if (contentHeight <= previousContentHeight + 1) return;
    const desiredHeight = Math.min(
      autoMaxHeight,
      Math.max(minHeight, headerHeight + bodyPadding + contentHeight + extraHeight)
    );

    if (desiredHeight <= panelSizeRef.current.height + 1) return;
    const origin = panelPositionRef.current ?? { x: margin, y: margin };
    const { position, size } = clampPanelWithinBounds(origin, {
      width: panelSizeRef.current.width,
      height: desiredHeight,
    });
    setPanelPosition(position);
    setPanelSize(size);
  }, [showNumberPad, clampPanelWithinBounds]);

  useEffect(() => {
    if (showNumberPad) {
      panelContentHeightRef.current = 0;
    }
  }, [showNumberPad]);

  useEffect(() => {
    if (!showNumberPad) return;
    const frame = requestAnimationFrame(updatePanelHeight);
    return () => cancelAnimationFrame(frame);
  }, [showNumberPad, updatePanelHeight]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;
      const container = rootRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dx = event.clientX - dragState.startX;
      const dy = event.clientY - dragState.startY;
      const margin = 12;

      if (dragState.type === 'drag') {
        const nextX = Math.min(Math.max(dragState.originX + dx, margin), rect.width - panelSizeRef.current.width - margin);
        const nextY = Math.min(Math.max(dragState.originY + dy, margin), rect.height - panelSizeRef.current.height - margin);
        setPanelPosition({ x: nextX, y: nextY });
        return;
      }

      const minWidth = 240;
      const minHeight = 220;
      const maxWidth = Math.max(minWidth, rect.width - dragState.originX - margin);
      const maxHeight = Math.max(minHeight, rect.height - dragState.originY - margin);
      const nextWidth = Math.min(Math.max(dragState.originWidth + dx, minWidth), maxWidth);
      const nextHeight = Math.min(Math.max(dragState.originHeight + dy, minHeight), maxHeight);
      setPanelSize({ width: nextWidth, height: nextHeight });
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      centerBoard(false);
      if (panelPositionRef.current) {
        const { position, size } = clampPanelWithinBounds(panelPositionRef.current, panelSizeRef.current);
        setPanelPosition(position);
        setPanelSize(size);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [centerBoard, clampPanelWithinBounds]);

  const handleImportFromUrl = useCallback(() => {
    const storeState = store.getState();
    const handlers = createImportHandlers({
      store,
      modalStore,
      grid: storeState.grid,
      puzzle: storeState.puzzle,
      setActiveMenu: () => {},
      setCurrentSchemaId: storeState.setCurrentSchemaId,
      t,
    });
    handlers.handleImportPenpaUrl();
  }, [store, modalStore, t]);

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

  const handlePanelDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panelPositionRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    dragStateRef.current = {
      type: 'drag',
      startX: event.clientX,
      startY: event.clientY,
      originX: panelPositionRef.current.x,
      originY: panelPositionRef.current.y,
      originWidth: panelSizeRef.current.width,
      originHeight: panelSizeRef.current.height,
    };
  };

  const handlePanelResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panelPositionRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    dragStateRef.current = {
      type: 'resize',
      startX: event.clientX,
      startY: event.clientY,
      originX: panelPositionRef.current.x,
      originY: panelPositionRef.current.y,
      originWidth: panelSizeRef.current.width,
      originHeight: panelSizeRef.current.height,
    };
  };

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
      {showNumberPad && panelPosition && (
        <div
          className="absolute z-20 rounded-sm border border-office-border bg-white shadow-md flex flex-col"
          style={{
            left: panelPosition.x,
            top: panelPosition.y,
            width: panelSize.width,
            height: panelSize.height,
          }}
        >
          <div
            className="flex items-center justify-between gap-2 px-2 py-1 text-[11px] text-office-text-secondary bg-office-bg border-b border-office-border cursor-move touch-none select-none"
            ref={panelHeaderRef}
            onPointerDown={handlePanelDragStart}
          >
            <span>123</span>
            <span>{t('tool.number', 'Number')}</span>
          </div>
          <div className="flex-1 overflow-auto p-2" ref={panelBodyRef}>
            <div ref={panelContentRef}>
              <NumberInputPanel onLayoutChange={updatePanelHeight} />
            </div>
          </div>
          <div
            className="absolute bottom-1 right-1 h-3 w-3 border-b border-r border-office-border cursor-se-resize touch-none"
            onPointerDown={handlePanelResizeStart}
            role="presentation"
          />
        </div>
      )}

      <TextInputDialog
        isOpen={textDialogOpen}
        onClose={() => setTextDialogOpen(false)}
        cellId={textDialogCellId}
        initialValue={textDialogInitialValue}
        textType={textDialogType}
        onSubmit={handleTextSubmit}
      />

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
