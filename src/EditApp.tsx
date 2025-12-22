import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './i18n';
import { PuzzleCanvas, type TextClickInfo } from './components/canvas';
import { ToolModeSelector } from './components/toolbar/ToolModeSelector';
import { NumberInputPanel } from './components/panels/properties/NumberInputPanel';
import { GridSettingsDialog, TextInputDialog, type TextInputType, StorageErrorDialog } from './components/dialogs';
import { ConfirmModal, AlertModal, ShortcutsModal, UrlImportModal } from './components/modals';
import { SolverPanel } from './components/panels/properties/SolverPanel';
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
import { copyToClipboard } from './utils/export';
import { generatePuzzlinkUrl, type PuzzlinkType } from './utils/puzzlinkExporter';
import { cspuzWorkerManager, CspuzSolverCancelledError, solverWorkerManager, SolverCancelledError } from './solver';
import { EyeIcon, EyeOffIcon } from './components/toolbar/RibbonIcons';

type EditMenuItem = {
  labelKey: string;
  action?: () => void;
  divider?: boolean;
  disabled?: boolean;
  checked?: boolean;
};

type EditMenu = {
  labelKey: string;
  items: EditMenuItem[];
};

const UndoIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

const RedoIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const TrashIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

type IconButtonProps = {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
};

const IconButton: React.FC<IconButtonProps> = ({ title, onClick, disabled, children }) => (
  <button
    className={`h-7 w-7 flex items-center justify-center rounded-sm border border-office-border bg-white text-office-text transition-colors ${
      disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-office-ribbon-hover'
    }`}
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={title}
  >
    {children}
  </button>
);

function EditApp() {
  const { t, i18n } = useTranslation();
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
    undo,
    redo,
    canUndo,
    canRedo,
    clearLayer,
    grid,
    showAdjacency,
    setShowAdjacency,
    setGrid,
    puzzle,
    topology,
    useTopology,
    setPan,
    setZoom,
    showAnswerLayer,
    toggleAnswerLayer,
    showProblemLayer,
    toggleProblemLayer,
    // Solver
    isSolverMode,
    isSolving,
    solverStatus,
    setSolving,
    enterSolverMode,
    setSolverError,
    solverBackend,
    setSolverBackend,
    cancelSolver,
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

  useKeyboardShortcuts({ allowLayerToggle: false });
  useStoragePersistence();

  const { error: storageError, clearError: clearStorageError, isErrorOpen: isStorageErrorOpen } = useStorageErrorHandler();

  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [textDialogCellId, setTextDialogCellId] = useState('');
  const [textDialogInitialValue, setTextDialogInitialValue] = useState('');
  const [textDialogType, setTextDialogType] = useState<TextInputType>('alphabet');
  const [gridDialogOpen, setGridDialogOpen] = useState(false);

  useEffect(() => {
    void loadFromUrlOrAutoSave(store);
  }, [store]);

  useEffect(() => {
    setPlayerMode(false);
    setActiveLayer('problem');
    setConstraintSubCategory('edit');
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

  const { showShortcuts, showAlert } = useModalStore();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const closeMenu = useCallback(() => setActiveMenu(null), []);
  const isJapanese = i18n.language?.toLowerCase().startsWith('ja');
  const isEnglish = i18n.language?.toLowerCase().startsWith('en');

  const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;
  const editModes = currentSchema?.inputModes.edit ?? [];
  const playModes = currentSchema?.inputModes.play ?? [];
  const activeModes = activeLayer === 'answer' ? playModes : editModes;
  const isConstraintAvailable = currentSchemaId !== null && currentSchemaId !== '__custom__';
  const isConstraintEnabled = isConstraintAvailable && showConstraintLayer;
  const hasCspuzSolver = currentSchemaId ? cspuzWorkerManager.hasSolver(currentSchemaId) : false;
  const hasSolverKit = currentSchemaId ? solverWorkerManager.hasSolver(currentSchemaId) : false;
  const hasSolver = hasCspuzSolver || hasSolverKit;
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

  const handleSolve = useCallback(async () => {
    if (!currentSchemaId || isSolving) return;

    const useSolverKit = !hasCspuzSolver && hasSolverKit;

    if (!useSolverKit && !hasCspuzSolver) {
      setSolverError(t('solver.notAvailable'));
      showAlert({
        title: t('solver.solve'),
        message: t('solver.notAvailable'),
        variant: 'error',
      });
      return;
    }

    setSolving(true);
    setSolverError(null);
    setSolverBackend(useSolverKit ? 'solver-kit' : 'cspuz');

    try {
      const result = useSolverKit
        ? await solverWorkerManager.solve(currentSchemaId, grid, puzzle.problem)
        : await cspuzWorkerManager.solve(currentSchemaId, grid, puzzle.problem);
      enterSolverMode(result);
    } catch (error) {
      if (error instanceof CspuzSolverCancelledError || error instanceof SolverCancelledError) {
        return;
      }
      setSolverError(error instanceof Error ? error.message : t('solver.failed'));
      setSolving(false);
      showAlert({
        title: t('solver.failed'),
        message: error instanceof Error ? error.message : t('solver.failed'),
        variant: 'error',
      });
    }
  }, [
    currentSchemaId,
    grid,
    puzzle.problem,
    isSolving,
    setSolving,
    setSolverError,
    enterSolverMode,
    showAlert,
    t,
    hasSolverKit,
    hasCspuzSolver,
    setSolverBackend,
  ]);

  const handleCancelSolver = useCallback(() => {
    if (solverBackend === 'solver-kit') {
      solverWorkerManager.cancelAll();
    } else {
      cspuzWorkerManager.cancelAll();
    }
    cancelSolver();
  }, [cancelSolver, solverBackend]);

  const schemaToPuzzlink: Partial<Record<string, PuzzlinkType>> = useMemo(() => ({
    nurikabe: 'nurikabe',
    slither: 'slither',
    mashu: 'masyu',
    yajilin: 'yajilin',
    heyawake: 'heyawake',
    lightup: 'akari',
    ayeheya: 'ayeheya',
    akichi: 'akichi',
    lits: 'lits',
    norinori: 'norinori',
    cbanana: 'cbanana',
    nurimisaki: 'nurimisaki',
    simpleloop: 'simpleloop',
    nanro: 'nanro',
  }), []);
  const puzzlinkType = currentSchemaId ? schemaToPuzzlink[currentSchemaId] : undefined;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleExportPuzzlink = useCallback(async () => {
    if (!puzzlinkType) return;
    try {
      const url = generatePuzzlinkUrl(puzzlinkType, grid, puzzle.problem);
      const success = await copyToClipboard(url);
      if (success) {
        showAlert({
          title: t('file.exportPuzzlink'),
          message: t('share.copied'),
          variant: 'success',
        });
      } else {
        showAlert({
          title: t('file.exportPuzzlink'),
          message: t('error.copyFailed', 'Failed to copy URL'),
          variant: 'error',
        });
      }
    } catch (error) {
      showAlert({
        title: t('file.exportPuzzlink'),
        message: error instanceof Error ? error.message : t('error.invalidFile'),
        variant: 'error',
      });
    }
  }, [grid, puzzlinkType, puzzle.problem, showAlert, t]);

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
    }
  }, [showNumberPad, initializePanelLayout]);

  useEffect(() => {
    if (!showNumberPad) return;
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
  }, [centerBoard, clampPanelWithinBounds, showNumberPad]);

  useEffect(() => {
    if (!showNumberPad) return;
    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;
      event.preventDefault();
      const dx = event.clientX - dragState.startX;
      const dy = event.clientY - dragState.startY;

      if (dragState.type === 'drag') {
        const nextPosition = { x: dragState.originX + dx, y: dragState.originY + dy };
        const { position } = clampPanelWithinBounds(nextPosition, panelSizeRef.current);
        setPanelPosition(position);
      } else {
        const minWidth = 200;
        const minHeight = 220;
        const container = rootRef.current;
        const rect = container ? container.getBoundingClientRect() : null;
        const maxWidth = rect ? rect.width - 24 : dragState.originWidth + dx;
        const maxHeight = rect ? rect.height - 24 : dragState.originHeight + dy;
        const nextWidth = Math.min(Math.max(dragState.originWidth + dx, minWidth), maxWidth);
        const nextHeight = Math.min(Math.max(dragState.originHeight + dy, minHeight), maxHeight);
        setPanelSize({ width: nextWidth, height: nextHeight });
      }
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
  }, [clampPanelWithinBounds, showNumberPad]);

  const handlePanelDragStart = useCallback((event: React.PointerEvent) => {
    if (!panelPositionRef.current) return;
    dragStateRef.current = {
      type: 'drag',
      startX: event.clientX,
      startY: event.clientY,
      originX: panelPositionRef.current.x,
      originY: panelPositionRef.current.y,
      originWidth: panelSizeRef.current.width,
      originHeight: panelSizeRef.current.height,
    };
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }, []);

  const handlePanelResizeStart = useCallback((event: React.PointerEvent) => {
    if (!panelPositionRef.current) return;
    dragStateRef.current = {
      type: 'resize',
      startX: event.clientX,
      startY: event.clientY,
      originX: panelPositionRef.current.x,
      originY: panelPositionRef.current.y,
      originWidth: panelSizeRef.current.width,
      originHeight: panelSizeRef.current.height,
    };
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }, []);

  const updatePanelHeight = useCallback((height: number) => {
    panelContentHeightRef.current = height;
  }, []);

  useEffect(() => {
    if (!showNumberPad) return;
    const updateHeight = () => {
      if (!panelBodyRef.current || !panelContentHeightRef.current) return;
      const headerHeight = panelHeaderRef.current?.offsetHeight ?? 0;
      const bodyPadding = 16;
      const extraHeight = 6;
      const desiredHeight = headerHeight + panelContentHeightRef.current + bodyPadding + extraHeight;
      setPanelSize((prev) => ({ ...prev, height: Math.max(prev.height, desiredHeight) }));
    };
    updateHeight();
  }, [showNumberPad, updatePanelHeight]);

  const editMenus = useMemo<EditMenu[]>(() => [
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
        {
          labelKey: 'file.exportPuzzlink',
          action: () => {
            void handleExportPuzzlink();
            closeMenu();
          },
          disabled: !puzzlinkType,
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
          labelKey: 'grid.settings',
          action: () => {
            setGridDialogOpen(true);
            closeMenu();
          },
        },
        { divider: true, labelKey: '' },
        {
          labelKey: 'edit.clearProblem',
          action: () => {
            clearLayer('problem');
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
          labelKey: 'language.ja',
          checked: isJapanese,
          action: () => {
            i18n.changeLanguage('ja');
            closeMenu();
          },
        },
        {
          labelKey: 'language.en',
          checked: isEnglish,
          action: () => {
            i18n.changeLanguage('en');
            closeMenu();
          },
        },
        { divider: true, labelKey: '' },
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
    canRedo,
    canUndo,
    clearLayer,
    closeMenu,
    grid.showGrid,
    handleExportPuzzlink,
    handleImportFromUrl,
    i18n,
    isConstraintAvailable,
    isConstraintEnabled,
    isEnglish,
    isJapanese,
    puzzlinkType,
    redo,
    setGrid,
    setGridDialogOpen,
    setShowAdjacency,
    showAdjacency,
    showShortcuts,
    toggleConstraintLayer,
    undo,
  ]);

  return (
    <div ref={rootRef} className="flex flex-col h-screen bg-office-bg font-segoe relative">
      <div className="flex flex-col flex-1 min-h-0 w-full max-w-[1024px] mx-auto">
        <header className="sticky top-0 z-30 border-b border-office-border bg-white px-3 pb-2 pt-0 space-y-2">
          <div
            ref={menuRef}
            className="flex items-center bg-office-ribbon border border-office-border h-7 px-1 -mx-3"
          >
            <div className="flex items-center px-2 mr-2">
              <span className="font-semibold text-sm text-office-accent">
                {t('app.editTitle', 'PuzzleKit Editor')}
              </span>
            </div>
            {editMenus.map((menu) => (
              <div key={menu.labelKey} className="relative">
                <button
                  className={`px-2 py-1 text-sm rounded hover:bg-office-ribbon-hover ${
                    activeMenu === menu.labelKey ? 'bg-office-ribbon-hover' : ''
                  }`}
                  onClick={() =>
                    setActiveMenu(activeMenu === menu.labelKey ? null : menu.labelKey)
                  }
                >
                  {t(menu.labelKey)}
                </button>
                {activeMenu === menu.labelKey && (
                  <div className="absolute left-0 mt-1 w-52 bg-white border border-office-border shadow-lg z-50">
                    {menu.items.map((item, idx) =>
                      item.divider ? (
                        <div key={`${item.labelKey}-${idx}`} className="border-t border-office-border my-1" />
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
          <div className="flex items-center gap-2">
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
            <button className="btn-office" onClick={() => setGridDialogOpen(true)}>
              {t('grid.settings')}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="flex items-center">
                <button
                  className={`h-7 px-2 text-xs rounded-l-sm border border-r-0 transition-colors ${
                    activeLayer === 'problem'
                      ? 'bg-office-accent text-white border-office-accent'
                      : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                  }`}
                  onClick={() => {
                    if (!showProblemLayer) {
                      toggleProblemLayer();
                    }
                    setActiveLayer('problem');
                  }}
                  aria-pressed={activeLayer === 'problem'}
                >
                  {t('layer.problem')}
                </button>
                <button
                  className={`h-7 w-7 flex items-center justify-center rounded-r-sm border-t border-b border-r transition-colors ${
                    showProblemLayer
                      ? activeLayer === 'problem'
                        ? 'bg-office-accent text-white border-office-accent'
                        : 'bg-white border-office-border text-office-text hover:bg-office-ribbon-hover'
                      : 'bg-white border-office-border text-gray-400 hover:bg-office-ribbon-hover'
                  }`}
                  onClick={toggleProblemLayer}
                  title={t('view.showProblem')}
                >
                  {showProblemLayer ? <EyeIcon size={14} /> : <EyeOffIcon size={14} />}
                </button>
              </div>
              <div className="flex items-center">
                <button
                  className={`h-7 px-2 text-xs rounded-l-sm border border-r-0 transition-colors ${
                    activeLayer === 'answer'
                      ? 'bg-office-accent text-white border-office-accent'
                      : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                  }`}
                  onClick={() => {
                    if (!showAnswerLayer) {
                      toggleAnswerLayer();
                    }
                    setActiveLayer('answer');
                  }}
                  aria-pressed={activeLayer === 'answer'}
                >
                  {t('layer.answer')}
                </button>
                <button
                  className={`h-7 w-7 flex items-center justify-center rounded-r-sm border-t border-b border-r transition-colors ${
                    showAnswerLayer
                      ? activeLayer === 'answer'
                        ? 'bg-office-accent text-white border-office-accent'
                        : 'bg-white border-office-border text-office-text hover:bg-office-ribbon-hover'
                      : 'bg-white border-office-border text-gray-400 hover:bg-office-ribbon-hover'
                  }`}
                  onClick={toggleAnswerLayer}
                  title={t('view.showAnswer')}
                >
                  {showAnswerLayer ? <EyeIcon size={14} /> : <EyeOffIcon size={14} />}
                </button>
              </div>
            </div>
            <IconButton title={t('edit.undo')} onClick={() => undo()} disabled={!canUndo()}>
              <UndoIcon size={16} />
            </IconButton>
            <IconButton title={t('edit.redo')} onClick={() => redo()} disabled={!canRedo()}>
              <RedoIcon size={16} />
            </IconButton>
            <IconButton title={t('edit.clearProblem', 'Clear problem')} onClick={() => clearLayer('problem')}>
              <TrashIcon size={16} />
            </IconButton>
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
            {hasSolver && (activeLayer === 'problem' || isSolving) && (
              isSolving ? (
                <button
                  className="h-7 px-2 text-xs border rounded-sm transition-colors bg-red-500 text-white border-red-600 hover:bg-red-600"
                  onClick={handleCancelSolver}
                  title={t('solver.cancel')}
                >
                  {t('solver.cancel')}
                </button>
              ) : (
                <button
                  className="h-7 px-2 text-xs border rounded-sm transition-colors bg-blue-600 text-white border-blue-700 hover:bg-blue-700"
                  onClick={handleSolve}
                  title={t('solver.solve')}
                  disabled={!currentSchemaId}
                >
                  {t('solver.solve')}
                </button>
              )
            )}
          </div>
          {(isSolving || isSolverMode || solverStatus) && (
            <div className="rounded-sm border border-office-border bg-white px-3 py-2">
              <SolverPanel />
            </div>
          )}
      </header>

        <div ref={canvasWrapperRef} className="flex-1 min-h-0 flex flex-col">
          <PuzzleCanvas onTextClick={handleTextClick} allowMultiTouchPanZoom={false} />
        </div>

        <footer className="border-t border-office-border bg-white px-3 py-2">
          {activeModes.length > 0 ? (
            <div className="flex flex-col gap-2">
              <ToolModeSelector
                modes={activeModes as InputMode[]}
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

      <GridSettingsDialog
        isOpen={gridDialogOpen}
        onClose={() => setGridDialogOpen(false)}
      />

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

      <ConfirmModal />
      <AlertModal />
      <ShortcutsModal />
      <UrlImportModal />
    </div>
  );
}

export default EditApp;
