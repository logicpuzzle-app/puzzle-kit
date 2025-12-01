/**
 * Layer Slice - Layer visibility and active layer management
 */

import type { LayerSlice, SliceCreator } from './types';

export const createLayerSlice: SliceCreator<LayerSlice> = (set) => ({
  activeLayer: 'problem',
  setActiveLayer: (layer) => set({ activeLayer: layer }),

  // Layer visibility
  showProblemLayer: true,
  showAnswerLayer: true,
  showConstraintLayer: false,
  toggleProblemLayer: () =>
    set((state) => ({ showProblemLayer: !state.showProblemLayer })),
  toggleAnswerLayer: () =>
    set((state) => ({ showAnswerLayer: !state.showAnswerLayer })),
  toggleConstraintLayer: () =>
    set((state) => ({ showConstraintLayer: !state.showConstraintLayer })),
});
