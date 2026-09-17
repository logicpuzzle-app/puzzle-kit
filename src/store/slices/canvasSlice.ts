import { resolveCellSelection } from '../../utils/cellSelection';
/**
 * Canvas Slice - Canvas viewport and interaction state
 */

import type { CanvasSlice, SliceCreator } from './types';
import { annotationScope, selectableAnnotations, selectedAnnotations, sameAnnotation } from '../../utils/annotationSelection';

export const createCanvasSlice: SliceCreator<CanvasSlice> = (set, get) => ({
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
    set((state) => {
      const nextZoom = Math.max(0.1, Math.min(5, zoom));
      return state.canvas.zoom === nextZoom ? state : { canvas: { ...state.canvas, zoom: nextZoom } };
    }),

  setPan: (x, y) =>
    set((state) => state.canvas.panX === x && state.canvas.panY === y
      ? state
      : { canvas: { ...state.canvas, panX: x, panY: y } }),

  setPanMode: (enabled) =>
    set((state) => ({
      canvas: { ...state.canvas, panMode: enabled },
    })),

  // Selection
  selectedElements: [],
  setSelection: (ids) => set({ selectedElements: ids }),
  clearSelection: () => set({ selectedElements: [] }),

  annotationSelection: null,
  setAnnotationSelection: (refs) => {
    const state = get(), scope = annotationScope(state);
    const valid = selectableAnnotations(state).filter(a => refs.some(ref => sameAnnotation(ref, a)));
    set({ annotationSelection: scope && valid.length ? { ...scope, refs: valid.map(({ kind, id }) => ({ kind, id })) } : null });
  },
  clearAnnotationSelection: () => set({ annotationSelection: null }),
  removeSelectedAnnotations: () => {
    const state = get(), refs = selectedAnnotations(state);
    if (!refs.length) return;
    state.endHistoryGroup();
    state.startHistoryGroup();
    try {
      for (const ref of refs) {
        if (ref.kind === 'vertexSurfaces') state.removeVertexSurface(ref.id);
        else if (ref.kind === 'surfaces') state.removeSurface(ref.id);
        else if (ref.kind === 'numbers') state.removeNumber(ref.id);
        else state.removeSymbol(ref.id);
      }
    } finally {
      state.endHistoryGroup();
      set({ annotationSelection: null });
    }
  },

  // Hover cursor
  hoverCell: null,
  setHoverCell: (cell) => set({ hoverCell: cell }),

  // Cursor cell (last tapped cell for direction/multicolor panels)
  cursorCell: null,
  setCursorCell: (cell) => set({ cursorCell: cell }),

  // Number tool selection
  numberSelection: null,
  setNumberSelection: (cell) => set(state => ({ numberSelection: resolveCellSelection(state, cell) })),

  // Highlighted lines (for preview in line list)
  highlightedLineIds: [],
  setHighlightedLineIds: (ids) => set({ highlightedLineIds: ids }),

  // Drawing line IDs (lines being drawn in current drag, for live group preview)
  drawingLineIds: [],
  setDrawingLineIds: (ids) => set({ drawingLineIds: ids }),
});
