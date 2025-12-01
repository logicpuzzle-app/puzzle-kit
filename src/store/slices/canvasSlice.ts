/**
 * Canvas Slice - Canvas viewport and interaction state
 */

import type { CanvasSlice, SliceCreator } from './types';

export const createCanvasSlice: SliceCreator<CanvasSlice> = (set) => ({
  canvas: {
    zoom: 1,
    panX: 0,
    panY: 0,
    isDragging: false,
    isDrawing: false,
    selection: [],
    panMode: false,
  },

  setCanvasState: (canvasUpdate) =>
    set((state) => ({
      canvas: { ...state.canvas, ...canvasUpdate },
    })),

  setZoom: (zoom) =>
    set((state) => ({
      canvas: { ...state.canvas, zoom: Math.max(0.1, Math.min(5, zoom)) },
    })),

  setPan: (x, y) =>
    set((state) => ({
      canvas: { ...state.canvas, panX: x, panY: y },
    })),

  setPanMode: (enabled) =>
    set((state) => ({
      canvas: { ...state.canvas, panMode: enabled },
    })),

  // Selection
  selectedElements: [],
  setSelection: (ids) => set({ selectedElements: ids }),
  clearSelection: () => set({ selectedElements: [] }),

  // Hover cursor
  hoverCell: null,
  setHoverCell: (cell) => set({ hoverCell: cell }),

  // Number tool selection
  numberSelection: null,
  setNumberSelection: (cell) => set({ numberSelection: cell }),
});
