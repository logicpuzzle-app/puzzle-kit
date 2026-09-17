import { useEffect, useRef } from 'react';
import { loadFromUrlOrAutoSave } from '../components/toolbar/menu/importHandlers';
import type { usePuzzleStoreApi } from '../store/puzzleStoreContext';

/** URL loading removes its query parameter. Replaying the mount effect must
 * not then replace that document with an older autosave. */
export function useInitialPuzzleLoad(store: ReturnType<typeof usePuzzleStoreApi>) {
  const loadedStore = useRef<typeof store | null>(null);
  useEffect(() => {
    if (loadedStore.current === store) return;
    loadedStore.current = store;
    void loadFromUrlOrAutoSave(store).catch(error => console.warn('Unable to restore saved puzzle', error));
  }, [store]);
}
