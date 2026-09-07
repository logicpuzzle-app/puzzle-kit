import { useCallback, useEffect } from 'react';
import type { TFunction } from 'i18next';
import { createImportHandlers, loadFromUrlOrAutoSave } from '../components/toolbar/menu';
import type { useModalStoreApi } from '../store/modalStoreContext';
import type { usePuzzleStoreApi } from '../store/puzzleStoreContext';

type PuzzleStoreApi = ReturnType<typeof usePuzzleStoreApi>;
type ModalStoreApi = ReturnType<typeof useModalStoreApi>;

interface UseImportFromUrlOptions {
  store: PuzzleStoreApi;
  modalStore: ModalStoreApi;
  t: TFunction;
  setActiveMenu?: (menu: string | null) => void;
}

export function useImportFromUrl({
  store,
  modalStore,
  t,
  setActiveMenu,
}: UseImportFromUrlOptions) {
  useEffect(() => {
    void loadFromUrlOrAutoSave(store);
  }, [store]);

  const handleImportFromUrl = useCallback(() => {
    const storeState = store.getState();
    const handlers = createImportHandlers({
      store,
      modalStore,
      grid: storeState.grid,
      puzzle: storeState.puzzle,
      setActiveMenu: setActiveMenu ?? (() => {}),
      setCurrentSchemaId: storeState.setCurrentSchemaId,
      t,
    });
    handlers.handleImportPenpaUrl();
  }, [modalStore, setActiveMenu, store, t]);

  return { handleImportFromUrl };
}
