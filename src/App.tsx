import React, { useEffect } from 'react';
import './i18n';
import { PuzzleCanvas } from './components/canvas';
import { MenuBar, IconToolbar, Ribbon } from './components/toolbar';
import { PropertiesPanel, StatusBar } from './components/panels';
import { TextInputDialog, StorageErrorDialog } from './components/dialogs';
import { CheckAnswerModal, ConfirmModal, AlertModal, ShortcutsModal, UrlImportModal } from './components/modals';
import { usePuzzleStore } from './store/puzzleStoreContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useStorageErrorHandler } from './hooks/useStorageErrorHandler';
import { useStoragePersistence } from './hooks/useStoragePersistence';
import { useTextSymbolDialog } from './hooks/useTextSymbolDialog';

function App() {
  const { addSymbol, removeSymbol, activeLayer, toolSettings, setPlayerMode } = usePuzzleStore();

  // Global keyboard shortcuts
  useKeyboardShortcuts();

  // Storage persistence (auto-save/load settings to localStorage)
  useStoragePersistence();

  useEffect(() => {
    setPlayerMode(false);
  }, [setPlayerMode]);

  // Storage error handling
  const { error: storageError, clearError: clearStorageError, isErrorOpen: isStorageErrorOpen } = useStorageErrorHandler();

  const { handleTextClick, dialogProps } = useTextSymbolDialog({ addSymbol, removeSymbol, activeLayer, toolSettings });

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
        <PropertiesPanel suspended={isStorageErrorOpen || dialogProps.isOpen} />
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Text Input Dialog */}
      <TextInputDialog {...dialogProps} />

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
