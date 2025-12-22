/**
 * Solution Slice - Solution area and multicolor surface operations
 */

import { generateMulticolorId } from '../../utils/idGenerator';
import type { SolutionSlice, SliceCreator } from './types';
import { canEditDataLayer, getEditableDataLayer } from '../../utils/editPolicy';

export const createSolutionSlice: SliceCreator<SolutionSlice> = (set, get) => {
  const canEditProblem = () => canEditDataLayer('problem', get().isPlayerMode);

  return {
  // Solution Area operations
  setSolutionArea: (cells) => {
    if (!canEditProblem()) {
      return;
    }
    set((state) => ({
      puzzle: {
        ...state.puzzle,
        solutionArea: {
          cells,
          enabled: true,
        },
      },
    }));
  },

  toggleSolutionAreaCell: (cellId) => {
    if (!canEditProblem()) {
      return;
    }
    set((state) => {
      const currentCells = state.puzzle.solutionArea?.cells || [];
      const newCells = currentCells.includes(cellId)
        ? currentCells.filter((id) => id !== cellId)
        : [...currentCells, cellId];

      return {
        puzzle: {
          ...state.puzzle,
          solutionArea: {
            cells: newCells,
            enabled: state.puzzle.solutionArea?.enabled ?? true,
          },
        },
      };
    });
  },

  clearSolutionArea: () => {
    if (!canEditProblem()) {
      return;
    }
    set((state) => ({
      puzzle: {
        ...state.puzzle,
        solutionArea: undefined,
      },
    }));
  },

  enableSolutionArea: (enabled) => {
    if (!canEditProblem()) {
      return;
    }
    set((state) => ({
      puzzle: {
        ...state.puzzle,
        solutionArea: state.puzzle.solutionArea
          ? { ...state.puzzle.solutionArea, enabled }
          : { cells: [], enabled },
      },
    }));
  },

  // Multicolor Surface operations
  setMulticolorSurface: (cellId, colors, pattern = 'cross', customColors) => {
    const editableLayer = getEditableDataLayer(get().activeLayer, get().isPlayerMode);
    if (!editableLayer) {
      return;
    }
    set((state) => {
      const existing = state.puzzle.multicolorSurfaces || {};
      const existingEntry = Object.values(existing).find((e) => e.cellId === cellId);
      const id = existingEntry?.id || generateMulticolorId();

      return {
        puzzle: {
          ...state.puzzle,
          multicolorSurfaces: {
            ...existing,
            [id]: {
              id,
              cellId,
              colors,
              pattern,
              customColors,
              layer: editableLayer,
            },
          },
        },
      };
    });
  },

  removeMulticolorSurface: (cellId) => {
    const editableLayer = getEditableDataLayer(get().activeLayer, get().isPlayerMode);
    if (!editableLayer) {
      return;
    }
    set((state) => {
      const existing = state.puzzle.multicolorSurfaces || {};
      const newSurfaces = { ...existing };

      for (const [id, surface] of Object.entries(newSurfaces)) {
        if (surface.cellId === cellId) {
          delete newSurfaces[id];
        }
      }

      return {
        puzzle: {
          ...state.puzzle,
          multicolorSurfaces: newSurfaces,
        },
      };
    });
  },

  clearMulticolorSurfaces: () => {
    const editableLayer = getEditableDataLayer(get().activeLayer, get().isPlayerMode);
    if (!editableLayer) {
      return;
    }
    set((state) => ({
      puzzle: {
        ...state.puzzle,
        multicolorSurfaces: undefined,
      },
    }));
  },
  };
};
