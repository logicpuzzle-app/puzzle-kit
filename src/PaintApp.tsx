import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './i18n';
import { NumberInputPanel } from './components/panels/properties/NumberInputPanel';
import { StorageErrorDialog } from './components/dialogs';
import { AlertModal, ConfirmModal, ShortcutsModal } from './components/modals';
import { usePuzzleStore, usePuzzleStoreApi } from './store/puzzleStoreContext';
import { useModalStore } from './store/modalStoreContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useStorageErrorHandler } from './hooks/useStorageErrorHandler';
import { useStoragePersistence } from './hooks/useStoragePersistence';
import { useMediaQuery } from './hooks/useMediaQuery';
import { PaintAppDesktopLayout, PaintAppMobileLayout } from './components/paint/PaintAppLayouts';
import { usePaintBoardCentering } from './hooks/paint/usePaintBoardCentering';
import { usePaintMenus } from './hooks/paint/usePaintMenus';
import { usePaintModes } from './hooks/paint/usePaintModes';
import { usePaintMedia } from './hooks/paint/usePaintMedia';
import { usePaintAdjustments } from './hooks/paint/usePaintAdjustments';
import { usePaintNumberPadPanel } from './hooks/paint/usePaintNumberPadPanel';

function PaintApp() {
  const { t, i18n } = useTranslation();
  const isJa = i18n.language?.toLowerCase().startsWith('ja');
  const isEn = i18n.language?.toLowerCase().startsWith('en');
  const {
    toolSettings,
    currentInputMode,
    setInputMode,
    setCurrentSchemaId,
    setPlayerMode,
    setConstraintSubCategory,
    setToolSettings,
    grid,
    setGrid,
    resizeGrid,
    undo,
    redo,
    canUndo,
    canRedo,
    clearLayer,
    canvas,
    topology,
    useTopology,
    setPan,
    setZoom,
    trialStage,
    enterTrial,
    acceptTrial,
    rejectTrial,
    rejectCurrentTrial,
    getCurrentTrialColor,
  } = usePuzzleStore();
  const store = usePuzzleStoreApi();
  const { showAlert, showShortcuts } = useModalStore();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasWrapperRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const paintInitRef = useRef(false);
  const [isExpanded, setIsExpanded] = useState(false);
  useKeyboardShortcuts({ allowLayerToggle: false });
  useStoragePersistence();

  const { error: storageError, clearError: clearStorageError, isErrorOpen: isStorageErrorOpen } = useStorageErrorHandler();

  const { centerBoard, getBoardDimensions } = usePaintBoardCentering({
    grid,
    topology,
    useTopology,
    canvasWrapperRef,
    setPan,
    setZoom,
    store,
  });

  const { menuRef, activeMenu, setActiveMenu, paintMenus } = usePaintMenus({
    t,
    grid,
    setGrid,
    fileInputRef,
    undo,
    redo,
    canUndo,
    canRedo,
    enterTrial,
    acceptTrial,
    rejectCurrentTrial,
    rejectTrial,
    trialStage,
    clearLayer,
    centerBoard,
    showShortcuts,
  });

  const {
    paintModes,
    categoryModes,
    availableCategories,
    activeCategory,
    selectedSwatchId,
    lineAnchor,
    wordDirection,
    handleCategorySelect,
    handleInputModeSelect,
    handleSwatchSelect,
    handleLineAnchorChange,
    handleWordDirectionChange,
  } = usePaintModes({
    toolSettings,
    currentInputMode,
    setInputMode,
    setToolSettings,
  });

  const {
    pdfImportOpen,
    pdfPages,
    pdfLoading,
    pdfImporting,
    pdfImagePages,
    pdfPageIndex,
    selectedPdfCount,
    currentPdfPage,
    handleImageSelect,
    handleRemoveImage,
    handlePdfImport,
    togglePdfPage,
    selectAllPdfPages,
    clearPdfPages,
    closePdfImport,
    handlePdfPageIndexChange,
    handlePdfPageSelect,
  } = usePaintMedia({
    t,
    grid,
    setGrid,
    fileInputRef,
    showAlert,
  });

  const {
    imageAdjustMode,
    boardAdjustMode,
    activePaintMode,
    isAnswerMode,
    hasImage,
    boardBounds,
    imageBounds,
    handleSetAdjustMode,
    handleGridDimensionChange,
    handleCellSizeChange,
    handleImageScaleChange,
    handleOpacityChange,
    handleResetImage,
    handleAutoPadding,
    handleZoomFit,
    handleImagePointerDown,
    handleImagePointerMove,
    handleImagePointerUp,
    handleImageWheel,
    handleResizePointerDown,
    handleResizePointerMove,
    handleResizePointerUp,
    handleBoardPointerDown,
    handleBoardPointerMove,
    handleBoardPointerUp,
    handleBoardResizePointerDown,
    handleBoardResizePointerMove,
    handleBoardResizePointerUp,
  } = usePaintAdjustments({
    grid,
    setGrid,
    resizeGrid,
    canvas,
    store,
    canvasWrapperRef,
    getBoardDimensions,
    centerBoard,
  });

  const {
    showNumberPad,
    panelPosition,
    panelSize,
    panelHeaderRef,
    panelContentRef,
    handlePanelDragStart,
    handlePanelResizeStart,
    updatePanelHeight,
  } = usePaintNumberPadPanel({
    rootRef,
    canvasWrapperRef,
    toolSettings,
    currentInputMode,
    onWindowResize: () => centerBoard(false),
  });

  useEffect(() => {
    if (paintInitRef.current) return;
    paintInitRef.current = true;
    setCurrentSchemaId('paint');
    setPlayerMode(true);
    setConstraintSubCategory('play');
    setGrid({
      showGrid: true,
      frameStyle: 'none',
      backgroundColor: 'transparent',
      gridColor: 'rgba(0,0,0,0.35)',
      backgroundClip: false,
    });
  }, [setCurrentSchemaId, setPlayerMode, setConstraintSubCategory, setGrid]);

  useEffect(() => {
    if (!grid.backgroundImage) return;
    if (grid.backgroundFit !== 'none') {
      setGrid({ backgroundFit: 'none' });
    }
  }, [grid.backgroundFit, grid.backgroundImage, setGrid]);

  useEffect(() => {
    if (grid.backgroundColor !== 'transparent') {
      setGrid({ backgroundColor: 'transparent' });
    }
  }, [grid.backgroundColor, setGrid]);

  useEffect(() => {
    if (grid.gridColor !== 'rgba(0,0,0,0.35)') {
      setGrid({ gridColor: 'rgba(0,0,0,0.35)' });
    }
  }, [grid.gridColor, setGrid]);

  const isMobile = useMediaQuery('(max-width: 639px)');

  const menuBarProps = {
    t,
    paintMenus,
    activeMenu,
    setActiveMenu,
    menuRef,
    isJa,
    isEn,
    onLanguageChange: (lang: 'ja' | 'en') => {
      void i18n.changeLanguage(lang);
    },
    isExpanded,
    onToggleExpand: () => setIsExpanded((prev) => !prev),
  };

  const primaryToolbarProps = {
    t,
    fileInputRef,
    onImageSelect: handleImageSelect,
    hasImage,
    onRemoveImage: handleRemoveImage,
    pdfImagePages,
    pdfPageIndex,
    onPdfPageIndexChange: handlePdfPageIndexChange,
    onPdfPageSelect: handlePdfPageSelect,
    currentPdfPage,
    activePaintMode,
    onSetAdjustMode: handleSetAdjustMode,
    isAnswerMode,
    trialStage,
    onEnterTrial: enterTrial,
    onAcceptTrial: acceptTrial,
    onRejectCurrentTrial: rejectCurrentTrial,
    onRejectTrial: rejectTrial,
    getCurrentTrialColor,
    onUndo: undo,
    onRedo: redo,
    canUndo: canUndo(),
    canRedo: canRedo(),
    onClearAnswer: () => clearLayer('answer'),
  };

  const imageAdjustToolbarProps = imageAdjustMode
    ? {
        t,
        hasImage,
        backgroundScale: grid.backgroundScale ?? 1,
        backgroundOpacity: grid.backgroundOpacity ?? 0.5,
        onScaleChange: handleImageScaleChange,
        onOpacityChange: handleOpacityChange,
        onResetImage: handleResetImage,
        onAutoPadding: handleAutoPadding,
        onZoomFit: handleZoomFit,
      }
    : null;

  const gridSettingsToolbarProps = boardAdjustMode
    ? {
        t,
        grid,
        setGrid,
        onGridDimensionChange: handleGridDimensionChange,
        onCellSizeChange: handleCellSizeChange,
      }
    : null;

  const canvasAreaProps = {
    t,
    canvasWrapperRef,
    boardAdjustMode,
    hasImage,
    boardBounds,
    grid,
    handleBoardPointerDown,
    handleBoardPointerMove,
    handleBoardPointerUp,
    handleBoardResizePointerDown,
    handleBoardResizePointerMove,
    handleBoardResizePointerUp,
    imageAdjustMode,
    imageBounds,
    handleImagePointerDown,
    handleImagePointerMove,
    handleImagePointerUp,
    handleImageWheel,
    handleResizePointerDown,
    handleResizePointerMove,
    handleResizePointerUp,
  };

  const genreToolbarProps = {
    t,
    paintModes,
    isAnswerMode,
    availableCategories,
    activeCategory,
    onCategorySelect: handleCategorySelect,
    selectedSwatchId,
    onSwatchSelect: handleSwatchSelect,
    currentInputMode,
    categoryModes,
    lineAnchor,
    onLineAnchorChange: handleLineAnchorChange,
    onInputModeSelect: handleInputModeSelect,
    wordDirection,
    onWordDirectionChange: handleWordDirectionChange,
  };

  return (
    <div ref={rootRef} className="min-h-screen bg-office-bg font-segoe relative">
      {isMobile ? (
        <PaintAppMobileLayout
          isExpanded={isExpanded}
          menuBarProps={menuBarProps}
          mediaControlsProps={primaryToolbarProps}
          trialControlsProps={primaryToolbarProps}
          adjustModeControlsProps={primaryToolbarProps}
          historyControlsProps={primaryToolbarProps}
          imageAdjustToolbarProps={imageAdjustToolbarProps}
          gridSettingsToolbarProps={gridSettingsToolbarProps}
          canvasAreaProps={canvasAreaProps}
          genreToolbarProps={genreToolbarProps}
        />
      ) : (
        <PaintAppDesktopLayout
          isExpanded={isExpanded}
          menuBarProps={menuBarProps}
          primaryToolbarProps={primaryToolbarProps}
          imageAdjustToolbarProps={imageAdjustToolbarProps}
          gridSettingsToolbarProps={gridSettingsToolbarProps}
          canvasAreaProps={canvasAreaProps}
          genreToolbarProps={genreToolbarProps}
        />
      )}
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
          <div className="flex-1 overflow-auto p-2">
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

      <StorageErrorDialog
        isOpen={isStorageErrorOpen}
        onClose={clearStorageError}
        dataSize={storageError?.dataSize ?? 0}
        errorType={storageError?.errorType ?? 'general'}
      />

      <ConfirmModal />
      <AlertModal />
      <ShortcutsModal />

      {pdfImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-[860px] max-h-[90vh] bg-white border border-office-border rounded-lg shadow-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-office-border">
              <div className="text-sm font-semibold text-office-text">
                {t('paint.pdfImportTitle', 'Import PDF Pages')}
              </div>
              <button
                type="button"
                className="h-6 w-6 flex items-center justify-center rounded-sm hover:bg-office-ribbon-hover"
                onClick={closePdfImport}
                disabled={pdfImporting}
                aria-label={t('action.close', 'Close')}
                title={t('action.close', 'Close')}
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="text-xs text-office-text-secondary mb-3">
                {t('paint.pdfImportHint', 'Select pages to import. All pages are selected by default.')}
              </div>
              {pdfLoading ? (
                <div className="text-sm text-office-text-secondary">
                  {t('paint.pdfLoading', 'Rendering pages...')}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {pdfPages.map((page) => {
                    const isSelected = page.selected;
                    return (
                      <button
                        key={page.pageNumber}
                        type="button"
                        className={`group flex flex-col items-stretch gap-2 border rounded-sm p-2 transition-colors ${
                          isSelected
                            ? 'border-office-accent ring-1 ring-office-accent'
                            : 'border-office-border hover:bg-office-ribbon-hover'
                        }`}
                        onClick={() => togglePdfPage(page.pageNumber)}
                        disabled={pdfImporting}
                        aria-pressed={isSelected}
                        title={t('paint.pdfPageLabel', 'Page {{number}}', { number: page.pageNumber })}
                      >
                        <div className="relative w-full bg-office-bg border border-office-border rounded-sm overflow-hidden aspect-[3/4] flex items-center justify-center">
                          {page.thumbnail ? (
                            <img src={page.thumbnail} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-xs text-office-text-secondary">
                              {t('paint.pdfLoading', 'Rendering pages...')}
                            </span>
                          )}
                          <div
                            className={`absolute top-1 right-1 h-4 w-4 rounded-full text-[10px] flex items-center justify-center ${
                              isSelected
                                ? 'bg-office-accent text-white'
                                : 'bg-white border border-office-border text-office-text-secondary'
                            }`}
                          >
                            {isSelected ? '✓' : ''}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-office-text-secondary">
                          <span>{t('paint.pdfPageLabel', 'Page {{number}}', { number: page.pageNumber })}</span>
                          <span className="text-[10px]">
                            {Math.round(page.width)}×{Math.round(page.height)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 px-4 py-2 border-t border-office-border bg-office-bg">
              <div className="flex flex-wrap items-center gap-2 text-xs text-office-text-secondary">
                <span>{t('paint.pdfSelectedCount', '{{count}} pages selected', { count: selectedPdfCount })}</span>
                <button
                  className="btn-office"
                  type="button"
                  onClick={selectAllPdfPages}
                  disabled={pdfLoading || pdfImporting}
                >
                  {t('paint.pdfSelectAll', 'Select All')}
                </button>
                <button
                  className="btn-office"
                  type="button"
                  onClick={clearPdfPages}
                  disabled={pdfLoading || pdfImporting}
                >
                  {t('paint.pdfClearAll', 'Clear')}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="btn-office"
                  type="button"
                  onClick={closePdfImport}
                  disabled={pdfImporting}
                >
                  {t('action.cancel', 'Cancel')}
                </button>
                <button
                  className="btn-office-primary"
                  type="button"
                  onClick={handlePdfImport}
                  disabled={pdfLoading || pdfImporting || selectedPdfCount === 0}
                >
                  {pdfImporting
                    ? t('paint.pdfImporting', 'Importing...')
                    : t('paint.pdfImportConfirm', 'Import')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PaintApp;
