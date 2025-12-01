/**
 * Elements Slice - Puzzle element CRUD operations
 */

import {
  generateSurfaceId,
  generateLineId as generateLineIdCompact,
  generateEdgeId,
  generateWallId,
  generateNumberId,
  generateSymbolId,
  generateCageId,
  generateSpecialId,
  generateBoxLineId,
  generateDirectionalClueId,
  resetIdCounters,
} from '../../utils/idGenerator';
import type {
  SurfaceElement,
  LineElement,
  EdgeElement,
  WallElement,
  NumberElement,
  SymbolElement,
  CageElement,
  SpecialElement,
  BoxLineElement,
} from '../../types';
import type { ElementsSlice, SliceCreator } from './types';
import { createEmptyElements, createEmptyState } from './types';
import { historyManager } from '../historyManager';
import {
  createAddSurfaceAction,
  createRemoveSurfaceAction,
  createAddLineAction,
  createRemoveLineAction,
  createAddEdgeAction,
  createRemoveEdgeAction,
  createAddWallAction,
  createRemoveWallAction,
  createAddNumberAction,
  createRemoveNumberAction,
  createUpdateNumberAction,
  createAddSymbolAction,
  createRemoveSymbolAction,
  createAddCageAction,
  createRemoveCageAction,
  createAddSpecialAction,
  createRemoveSpecialAction,
} from '../actions';
import {
  normalizeSegmentEndpoints,
  generateLineId,
} from '../../utils/lineNormalization';

export const createElementsSlice: SliceCreator<ElementsSlice> = (set, get) => ({
  puzzle: createEmptyState(),

  // Surface operations
  addSurface: (element) => {
    const id = generateSurfaceId();
    const fullElement: SurfaceElement = { ...element, id };

    set((state) => {
      const layer = fullElement.layer;
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            surfaces: {
              ...state.puzzle[layer].surfaces,
              [id]: fullElement,
            },
          },
        },
      };
    });

    historyManager.addAction(createAddSurfaceAction(fullElement));
    return id;
  },

  removeSurface: (id) => {
    const state = get();
    const layer = state.activeLayer;
    const element = state.puzzle[layer].surfaces[id];
    if (element) {
      set((state) => {
        const newSurfaces = { ...state.puzzle[layer].surfaces };
        delete newSurfaces[id];
        return {
          puzzle: {
            ...state.puzzle,
            [layer]: {
              ...state.puzzle[layer],
              surfaces: newSurfaces,
            },
          },
        };
      });

      historyManager.addAction(createRemoveSurfaceAction(id, element));
    }
  },

  // Line operations
  addLine: (element) => {
    let id: string;
    let normalizedElement: LineElement;

    if (element.isFree) {
      // Freehand lines: use compact ID
      id = generateLineIdCompact();
      normalizedElement = { ...element, id };
    } else {
      // Grid-snapped lines: normalize endpoints and generate deterministic ID
      const [normFrom, normTo] = normalizeSegmentEndpoints(element.from, element.to);
      id = generateLineId(normFrom, normTo);
      normalizedElement = { ...element, id, from: normFrom, to: normTo };

      // Check if line with this ID already exists in this layer
      const state = get();
      if (state.puzzle[element.layer].lines[id]) {
        return id;
      }
    }

    set((state) => {
      const layer = normalizedElement.layer;
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            lines: {
              ...state.puzzle[layer].lines,
              [id]: normalizedElement,
            },
          },
        },
      };
    });
    historyManager.addAction(createAddLineAction(normalizedElement));
    return id;
  },

  removeLine: (id) => {
    const state = get();
    const layer = state.activeLayer;
    const element = state.puzzle[layer].lines[id];
    if (element) {
      set((state) => {
        const newLines = { ...state.puzzle[layer].lines };
        delete newLines[id];
        return {
          puzzle: {
            ...state.puzzle,
            [layer]: {
              ...state.puzzle[layer],
              lines: newLines,
            },
          },
        };
      });
      historyManager.addAction(createRemoveLineAction(id, element));
    }
  },

  // Edge operations
  addEdge: (element) => {
    const id = generateEdgeId();
    const fullElement: EdgeElement = { ...element, id };
    set((state) => {
      const layer = fullElement.layer;
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            edges: {
              ...state.puzzle[layer].edges,
              [id]: fullElement,
            },
          },
        },
      };
    });
    historyManager.addAction(createAddEdgeAction(fullElement));
    return id;
  },

  removeEdge: (id) => {
    const state = get();
    const layer = state.activeLayer;
    const element = state.puzzle[layer].edges[id];
    if (element) {
      set((state) => {
        const newEdges = { ...state.puzzle[layer].edges };
        delete newEdges[id];
        return {
          puzzle: {
            ...state.puzzle,
            [layer]: {
              ...state.puzzle[layer],
              edges: newEdges,
            },
          },
        };
      });
      historyManager.addAction(createRemoveEdgeAction(id, element));
    }
  },

  // Wall operations
  addWall: (element) => {
    const id = generateWallId();
    const fullElement: WallElement = { ...element, id };
    set((state) => {
      const layer = fullElement.layer;
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            walls: {
              ...state.puzzle[layer].walls,
              [id]: fullElement,
            },
          },
        },
      };
    });
    historyManager.addAction(createAddWallAction(fullElement));
    return id;
  },

  removeWall: (id) => {
    const state = get();
    const layer = state.activeLayer;
    const element = state.puzzle[layer].walls[id];
    if (element) {
      set((state) => {
        const newWalls = { ...state.puzzle[layer].walls };
        delete newWalls[id];
        return {
          puzzle: {
            ...state.puzzle,
            [layer]: {
              ...state.puzzle[layer],
              walls: newWalls,
            },
          },
        };
      });
      historyManager.addAction(createRemoveWallAction(id, element));
    }
  },

  // Number operations
  addNumber: (element) => {
    const id = generateNumberId();
    const fullElement: NumberElement = { ...element, id };
    set((state) => {
      const layer = fullElement.layer;
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            numbers: {
              ...state.puzzle[layer].numbers,
              [id]: fullElement,
            },
          },
        },
      };
    });
    historyManager.addAction(createAddNumberAction(fullElement));
    return id;
  },

  removeNumber: (id) => {
    const state = get();
    const layer = state.activeLayer;
    const element = state.puzzle[layer].numbers[id];
    if (element) {
      set((state) => {
        const newNumbers = { ...state.puzzle[layer].numbers };
        delete newNumbers[id];
        return {
          puzzle: {
            ...state.puzzle,
            [layer]: {
              ...state.puzzle[layer],
              numbers: newNumbers,
            },
          },
        };
      });
      historyManager.addAction(createRemoveNumberAction(id, element));
    }
  },

  updateNumber: (id, value) => {
    const state = get();
    const layer = state.activeLayer;
    const element = state.puzzle[layer].numbers[id];
    if (element) {
      set((state) => ({
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            numbers: {
              ...state.puzzle[layer].numbers,
              [id]: { ...element, value },
            },
          },
        },
      }));
      historyManager.addAction(createUpdateNumberAction(id, element.value, value, layer));
    }
  },

  // Symbol operations
  addSymbol: (element) => {
    const id = generateSymbolId();
    const fullElement: SymbolElement = { ...element, id };
    set((state) => {
      const layer = fullElement.layer;
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            symbols: {
              ...state.puzzle[layer].symbols,
              [id]: fullElement,
            },
          },
        },
      };
    });
    historyManager.addAction(createAddSymbolAction(fullElement));
    return id;
  },

  removeSymbol: (id) => {
    const state = get();
    const layer = state.activeLayer;
    const element = state.puzzle[layer].symbols[id];
    if (element) {
      set((state) => {
        const newSymbols = { ...state.puzzle[layer].symbols };
        delete newSymbols[id];
        return {
          puzzle: {
            ...state.puzzle,
            [layer]: {
              ...state.puzzle[layer],
              symbols: newSymbols,
            },
          },
        };
      });
      historyManager.addAction(createRemoveSymbolAction(id, element));
    }
  },

  // Cage operations
  addCage: (element) => {
    const id = generateCageId();
    const fullElement: CageElement = { ...element, id };
    set((state) => {
      const layer = fullElement.layer;
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            cages: {
              ...state.puzzle[layer].cages,
              [id]: fullElement,
            },
          },
        },
      };
    });
    historyManager.addAction(createAddCageAction(fullElement));
    return id;
  },

  removeCage: (id) => {
    const state = get();
    const layer = state.activeLayer;
    const element = state.puzzle[layer].cages[id];
    if (element) {
      set((state) => {
        const newCages = { ...state.puzzle[layer].cages };
        delete newCages[id];
        return {
          puzzle: {
            ...state.puzzle,
            [layer]: {
              ...state.puzzle[layer],
              cages: newCages,
            },
          },
        };
      });
      historyManager.addAction(createRemoveCageAction(id, element));
    }
  },

  // Special operations
  addSpecial: (element) => {
    const id = generateSpecialId();
    const fullElement: SpecialElement = { ...element, id };
    set((state) => {
      const layer = fullElement.layer;
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            specials: {
              ...state.puzzle[layer].specials,
              [id]: fullElement,
            },
          },
        },
      };
    });
    historyManager.addAction(createAddSpecialAction(fullElement));
    return id;
  },

  removeSpecial: (id) => {
    const state = get();
    const layer = state.activeLayer;
    const element = state.puzzle[layer].specials[id];
    if (element) {
      set((state) => {
        const newSpecials = { ...state.puzzle[layer].specials };
        delete newSpecials[id];
        return {
          puzzle: {
            ...state.puzzle,
            [layer]: {
              ...state.puzzle[layer],
              specials: newSpecials,
            },
          },
        };
      });
      historyManager.addAction(createRemoveSpecialAction(id, element));
    }
  },

  // BoxLine operations
  addBoxLine: (element) => {
    const id = generateBoxLineId();
    const fullElement: BoxLineElement = { ...element, id };
    set((state) => {
      const layer = fullElement.layer;
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            boxLines: {
              ...state.puzzle[layer].boxLines,
              [id]: fullElement,
            },
          },
        },
      };
    });
    return id;
  },

  removeBoxLine: (id) => {
    const state = get();
    const layer = state.activeLayer;
    const boxLines = state.puzzle[layer].boxLines || {};
    if (boxLines[id]) {
      set((state) => {
        const newBoxLines = { ...state.puzzle[layer].boxLines };
        delete newBoxLines[id];
        return {
          puzzle: {
            ...state.puzzle,
            [layer]: {
              ...state.puzzle[layer],
              boxLines: newBoxLines,
            },
          },
        };
      });
    }
  },

  updateBoxLine: (id, cells) => {
    const state = get();
    const layer = state.activeLayer;
    const boxLines = state.puzzle[layer].boxLines || {};
    const element = boxLines[id];
    if (element) {
      set((state) => ({
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            boxLines: {
              ...state.puzzle[layer].boxLines,
              [id]: { ...element, cells },
            },
          },
        },
      }));
    }
  },

  // DirectionalClue operations
  addDirectionalClue: (element) => {
    const id = generateDirectionalClueId();
    const fullElement = { ...element, id };
    set((state) => {
      const layer = fullElement.layer;
      const clues = { ...(state.puzzle[layer].directionalClues || {}) };
      // enforce one clue per cell
      const existingEntry = Object.entries(clues).find(
        ([, clue]) => clue.cell === fullElement.cell
      );
      if (existingEntry) {
        delete clues[existingEntry[0]];
      }
      clues[id] = fullElement;
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            directionalClues: clues,
          },
        },
      };
    });
    return id;
  },

  removeDirectionalClue: (id) => {
    set((state) => {
      const layer = state.activeLayer;
      const clues = { ...(state.puzzle[layer].directionalClues || {}) };
      delete clues[id];
      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            directionalClues: clues,
          },
        },
      };
    });
  },

  // Clear operations
  clearLayer: (layer) => {
    set((state) => ({
      puzzle: {
        ...state.puzzle,
        [layer]: createEmptyElements(),
      },
    }));
  },

  clearAll: () => {
    set({
      puzzle: createEmptyState(),
    });
    historyManager.clear();
    resetIdCounters();
  },
});
