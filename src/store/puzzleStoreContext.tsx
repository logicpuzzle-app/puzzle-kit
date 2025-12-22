import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { StoreApi, UseBoundStore } from 'zustand';

import type { PuzzleStore } from './slices/types';
import { usePuzzleStore as defaultStore } from './puzzleStore';

type PuzzleStoreHook = UseBoundStore<StoreApi<PuzzleStore>>;

const PuzzleStoreContext = createContext<PuzzleStoreHook | null>(null);

type PuzzleStoreProviderProps = {
  store?: PuzzleStoreHook;
  children: ReactNode;
};

export const PuzzleStoreProvider = ({ store, children }: PuzzleStoreProviderProps) => (
  <PuzzleStoreContext.Provider value={store ?? defaultStore}>
    {children}
  </PuzzleStoreContext.Provider>
);

export function usePuzzleStore<T = PuzzleStore>(
  selector?: (state: PuzzleStore) => T
): T {
  const store = useContext(PuzzleStoreContext) ?? defaultStore;
  if (selector) {
    return store(selector);
  }
  return store((state) => state as unknown as T);
}

export function usePuzzleStoreApi(): PuzzleStoreHook {
  return useContext(PuzzleStoreContext) ?? defaultStore;
}
