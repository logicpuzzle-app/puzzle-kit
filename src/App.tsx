import React, { useEffect, useState, useCallback } from 'react';
import './i18n';
import { PuzzleCanvas, type TextClickInfo } from './components/canvas';
import { MenuBar, IconToolbar, Ribbon } from './components/toolbar';
import { PropertiesPanel, StatusBar } from './components/panels';
import { TextInputDialog, type TextInputType, StorageErrorDialog } from './components/dialogs';
import { CheckAnswerModal, ConfirmModal, AlertModal, ShortcutsModal, UrlImportModal } from './components/modals';
import { usePuzzleStore } from './store/puzzleStoreContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useStorageErrorHandler } from './hooks/useStorageErrorHandler';
import { useStoragePersistence } from './hooks/useStoragePersistence';
import { toDataLayer } from './types';

function App() {
  const { addSymbol, activeLayer, toolSettings, setPlayerMode } = usePuzzleStore();

  // Global keyboard shortcuts
  useKeyboardShortcuts();

  // Storage persistence (auto-save/load settings to localStorage)
  useStoragePersistence();

  useEffect(() => {
    setPlayerMode(false);
  }, [setPlayerMode]);

  // Storage error handling
  const { error: storageError, clearError: clearStorageError, isErrorOpen: isStorageErrorOpen } = useStorageErrorHandler();

  // Text dialog state
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [textDialogCellId, setTextDialogCellId] = useState('');
  const [textDialogInitialValue, setTextDialogInitialValue] = useState('');
  const [textDialogType, setTextDialogType] = useState<TextInputType>('alphabet');

  const handleTextClick = useCallback((info: TextClickInfo) => {
    setTextDialogCellId(info.cellId);
    // Extract value from existing text symbol if present
    const existingValue = info.existingText?.symbolType?.replace('text-', '').split(':')[1] || '';
    setTextDialogInitialValue(existingValue);
    setTextDialogType(info.textType as TextInputType);
    setTextDialogOpen(true);
  }, []);

  const handleTextSubmit = useCallback(
    (data: { value: string; textType: TextInputType }) => {
      if (textDialogCellId && data.value) {
        // Store text as a symbol with a special symbolType format: text-{type}:{value}
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

  return (
    <div className="flex flex-col h-screen bg-office-bg font-segoe">
      {/* Menu Bar */}
      <MenuBar />

      {/* Icon Toolbar */}
      <IconToolbar />

      {/* Ribbon */}
      <Ribbon />

      {/* Main content area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Canvas */}
        <PuzzleCanvas
          onTextClick={handleTextClick}
        />

        {/* Properties Panel */}
        <PropertiesPanel suspended={isStorageErrorOpen || textDialogOpen} />
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Text Input Dialog */}
      <TextInputDialog
        isOpen={textDialogOpen}
        onClose={() => setTextDialogOpen(false)}
        cellId={textDialogCellId}
        initialValue={textDialogInitialValue}
        textType={textDialogType}
        onSubmit={handleTextSubmit}
      />

      {/* Storage Error Dialog */}
      <StorageErrorDialog
        isOpen={isStorageErrorOpen}
        onClose={clearStorageError}
        dataSize={storageError?.dataSize ?? 0}
        errorType={storageError?.errorType ?? 'general'}
      />

      {/* Check Answer Modal */}
      <CheckAnswerModal />

      {/* Global Modals */}
      <ConfirmModal />
      <AlertModal />
      <ShortcutsModal />
      <UrlImportModal />
    </div>
  );
}

export default App;
