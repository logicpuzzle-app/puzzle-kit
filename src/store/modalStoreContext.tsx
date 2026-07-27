import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { StoreApi, UseBoundStore } from 'zustand';
import { useStoreWithEqualityFn } from 'zustand/traditional';

import type { ModalStore } from './modalStore';
import { useModalStore as defaultStore } from './modalStore';

type ModalStoreHook = UseBoundStore<StoreApi<ModalStore>>;

const ModalStoreContext = createContext<ModalStoreHook | null>(null);

type ModalStoreProviderProps = {
  store?: ModalStoreHook;
  children: ReactNode;
};

export const ModalStoreProvider = ({ store, children }: ModalStoreProviderProps) => (
  <ModalStoreContext.Provider value={store ?? defaultStore}>
    {children}
  </ModalStoreContext.Provider>
);

export function useModalStore<T = ModalStore>(
  selector?: (state: ModalStore) => T,
  equalityFn?: (a: T, b: T) => boolean
): T {
  const store = useContext(ModalStoreContext) ?? defaultStore;
  if (selector) {
    return useStoreWithEqualityFn(store, selector, equalityFn);
  }
  return useStoreWithEqualityFn(store, (state) => state as unknown as T);
}

export function useModalStoreApi(): ModalStoreHook {
  return useContext(ModalStoreContext) ?? defaultStore;
}
