/**
 * Solution Slice - Solution area and multicolor surface operations
 */

import { v4 as uuidv4 } from 'uuid';
import type { SolutionSlice, SliceCreator } from './types';

export const createSolutionSlice: SliceCreator<SolutionSlice> = (set) => ({
  // Solution Area operations
  setSolutionArea: (cells) => {
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
    set((state) => ({
      puzzle: {
        ...state.puzzle,
        solutionArea: undefined,
      },
    }));
  },

  enableSolutionArea: (enabled) => {
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
    set((state) => {
      const existing = state.puzzle.multicolorSurfaces || {};
      const existingEntry = Object.values(existing).find((e) => e.cellId === cellId);
      const id = existingEntry?.id || uuidv4();

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
              layer: state.activeLayer,
            },
          },
        },
      };
    });
  },

  removeMulticolorSurface: (cellId) => {
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
    set((state) => ({
      puzzle: {
        ...state.puzzle,
        multicolorSurfaces: undefined,
      },
    }));
  },
});
