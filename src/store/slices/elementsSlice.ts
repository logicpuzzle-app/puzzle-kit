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
  LineGroup,
} from '../../types';
import { toDataLayer } from '../../types';
import type { ElementsSlice, SliceCreator } from './types';
import {
  normalizeChain,
  splitChain,
} from '../../utils/lineMerge';
import { historyManager } from '../historyManager';
import {
  createAddSurfaceAction,
  createRemoveSurfaceAction,
  createAddLineAction,
  createRemoveLineAction,
  createUpdateLineAction,
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

// Import from refactored modules
import { createEmptyState } from './elements/state';
import {
  buildLinesWithPosition,
  groupAndNormalizeByConnectivity,
  groupAndNormalizeByCollinearity,
  normalizeLineGroupWithExisting,
  createLineGroupRecords,
  applyArrowDirections,
  type GeometryContext,
} from './elements/helpers';

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
    const layer = toDataLayer(state.activeLayer);
    const element = state.puzzle[layer].surfaces[id];
    if (element) {
      set((state) => {
        const dataLayer = toDataLayer(state.activeLayer);
        const newSurfaces = { ...state.puzzle[dataLayer].surfaces };
        delete newSurfaces[id];
        return {
          puzzle: {
            ...state.puzzle,
            [dataLayer]: {
              ...state.puzzle[dataLayer],
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
    } else if (element.edgeId && element.lineTarget) {
      // Edge-based lines (unified representation): use edgeId + lineTarget for ID
      id = `${element.lineTarget}-${element.edgeId}`;
      normalizedElement = { ...element, id };

      // Check if line with this ID already exists in this layer
      const state = get();
      if (state.puzzle[element.layer].lines[id]) {
        return id;
      }
    } else if (element.from && element.to) {
      // Legacy grid-snapped lines: normalize endpoints and generate deterministic ID
      const [normFrom, normTo] = normalizeSegmentEndpoints(element.from, element.to);
      id = generateLineId(normFrom, normTo);
      normalizedElement = { ...element, id, from: normFrom, to: normTo };

      // Check if line with this ID already exists in this layer
      const state = get();
      if (state.puzzle[element.layer].lines[id]) {
        return id;
      }
    } else {
      // Invalid line element - skip
      console.warn('addLine: Invalid line element (missing edgeId/lineTarget or from/to)');
      return '';
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
    const layer = toDataLayer(state.activeLayer);
    const lineElement = state.puzzle[layer].lines[id];
    const edgeElement = state.puzzle[layer].edges[id];
    const wallElement = state.puzzle[layer].walls[id];

    if (lineElement) {
      set((state) => {
        const dataLayer = toDataLayer(state.activeLayer);
        const newLines = { ...state.puzzle[dataLayer].lines };
        delete newLines[id];
        return {
          puzzle: {
            ...state.puzzle,
            [dataLayer]: {
              ...state.puzzle[dataLayer],
              lines: newLines,
            },
          },
        };
      });
      historyManager.addAction(createRemoveLineAction(id, lineElement));
    } else if (edgeElement) {
      // Remove from legacy edges
      set((state) => {
        const dataLayer = toDataLayer(state.activeLayer);
        const newEdges = { ...state.puzzle[dataLayer].edges };
        delete newEdges[id];
        return {
          puzzle: {
            ...state.puzzle,
            [dataLayer]: {
              ...state.puzzle[dataLayer],
              edges: newEdges,
            },
          },
        };
      });
      historyManager.addAction(createRemoveEdgeAction(id, edgeElement));
    } else if (wallElement) {
      // Remove from legacy walls
      set((state) => {
        const dataLayer = toDataLayer(state.activeLayer);
        const newWalls = { ...state.puzzle[dataLayer].walls };
        delete newWalls[id];
        return {
          puzzle: {
            ...state.puzzle,
            [dataLayer]: {
              ...state.puzzle[dataLayer],
              walls: newWalls,
            },
          },
        };
      });
      historyManager.addAction(createRemoveWallAction(id, wallElement));
    }
  },

  updateLine: (id, updates) => {
    const state = get();
    const layer = toDataLayer(state.activeLayer);
    const element = state.puzzle[layer].lines[id];
    if (element) {
      const newElement: LineElement = { ...element, ...updates };
      set((state) => {
        const dataLayer = toDataLayer(state.activeLayer);
        return {
          puzzle: {
            ...state.puzzle,
            [dataLayer]: {
              ...state.puzzle[dataLayer],
              lines: {
                ...state.puzzle[dataLayer].lines,
                [id]: newElement,
              },
            },
          },
        };
      });
      historyManager.addAction(createUpdateLineAction(id, element, newElement, layer));
    }
  },

  // Edge operations (deprecated - use addLine with lineTarget='edge')
  addEdge: (element) => {
    const id = generateEdgeId();
    // Add lineTarget='edge' for new unified representation
    const fullElement: EdgeElement = { ...element, id, lineTarget: 'edge' };
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
    const layer = toDataLayer(state.activeLayer);
    const element = state.puzzle[layer].edges[id];
    if (element) {
      set((state) => {
        const dataLayer = toDataLayer(state.activeLayer);
        const newEdges = { ...state.puzzle[dataLayer].edges };
        delete newEdges[id];
        return {
          puzzle: {
            ...state.puzzle,
            [dataLayer]: {
              ...state.puzzle[dataLayer],
              edges: newEdges,
            },
          },
        };
      });
      historyManager.addAction(createRemoveEdgeAction(id, element));
    }
  },

  // Wall operations (deprecated - use addLine with lineTarget='wall')
  addWall: (element) => {
    const id = generateWallId();
    // Add lineTarget='wall' and convert position to edgeId for unified representation
    const fullElement: WallElement = {
      ...element,
      id,
      lineTarget: 'wall',
      edgeId: element.position, // position is already an edge ID
    };
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
    const layer = toDataLayer(state.activeLayer);
    const element = state.puzzle[layer].walls[id];
    if (element) {
      set((state) => {
        const dataLayer = toDataLayer(state.activeLayer);
        const newWalls = { ...state.puzzle[dataLayer].walls };
        delete newWalls[id];
        return {
          puzzle: {
            ...state.puzzle,
            [dataLayer]: {
              ...state.puzzle[dataLayer],
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
      const newNumbers = { ...state.puzzle[layer].numbers, [id]: fullElement };

      // If adding center number, remove any directionalClue at the same cell
      let newClues = state.puzzle[layer].directionalClues || {};
      if (fullElement.position === 'center') {
        const existingClueEntry = Object.entries(newClues).find(
          ([, clue]) => clue.cellId === fullElement.cellId
        );
        if (existingClueEntry) {
          newClues = { ...newClues };
          delete newClues[existingClueEntry[0]];
        }
      }

      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            numbers: newNumbers,
            directionalClues: newClues,
          },
        },
      };
    });
    historyManager.addAction(createAddNumberAction(fullElement));
    return id;
  },

  removeNumber: (id) => {
    const state = get();
    const layer = toDataLayer(state.activeLayer);
    const element = state.puzzle[layer].numbers[id];
    if (element) {
      set((state) => {
        const dataLayer = toDataLayer(state.activeLayer);
        const newNumbers = { ...state.puzzle[dataLayer].numbers };
        delete newNumbers[id];
        return {
          puzzle: {
            ...state.puzzle,
            [dataLayer]: {
              ...state.puzzle[dataLayer],
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
    const layer = toDataLayer(state.activeLayer);
    const element = state.puzzle[layer].numbers[id];
    if (element) {
      set((state) => {
        const dataLayer = toDataLayer(state.activeLayer);
        return {
          puzzle: {
            ...state.puzzle,
            [dataLayer]: {
              ...state.puzzle[dataLayer],
              numbers: {
                ...state.puzzle[dataLayer].numbers,
                [id]: { ...element, value },
              },
            },
          },
        };
      });
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
    const layer = toDataLayer(state.activeLayer);
    const element = state.puzzle[layer].symbols[id];
    if (element) {
      set((state) => {
        const dataLayer = toDataLayer(state.activeLayer);
        const newSymbols = { ...state.puzzle[dataLayer].symbols };
        delete newSymbols[id];
        return {
          puzzle: {
            ...state.puzzle,
            [dataLayer]: {
              ...state.puzzle[dataLayer],
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
    const layer = toDataLayer(state.activeLayer);
    const element = state.puzzle[layer].cages[id];
    if (element) {
      set((state) => {
        const dataLayer = toDataLayer(state.activeLayer);
        const newCages = { ...state.puzzle[dataLayer].cages };
        delete newCages[id];
        return {
          puzzle: {
            ...state.puzzle,
            [dataLayer]: {
              ...state.puzzle[dataLayer],
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
    const layer = toDataLayer(state.activeLayer);
    const element = state.puzzle[layer].specials[id];
    if (element) {
      set((state) => {
        const dataLayer = toDataLayer(state.activeLayer);
        const newSpecials = { ...state.puzzle[dataLayer].specials };
        delete newSpecials[id];
        return {
          puzzle: {
            ...state.puzzle,
            [dataLayer]: {
              ...state.puzzle[dataLayer],
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
    const layer = toDataLayer(state.activeLayer);
    const boxLines = state.puzzle[layer].boxLines || {};
    if (boxLines[id]) {
      set((state) => {
        const dataLayer = toDataLayer(state.activeLayer);
        const newBoxLines = { ...state.puzzle[dataLayer].boxLines };
        delete newBoxLines[id];
        return {
          puzzle: {
            ...state.puzzle,
            [dataLayer]: {
              ...state.puzzle[dataLayer],
              boxLines: newBoxLines,
            },
          },
        };
      });
    }
  },

  updateBoxLine: (id, cells) => {
    const state = get();
    const layer = toDataLayer(state.activeLayer);
    const boxLines = state.puzzle[layer].boxLines || {};
    const element = boxLines[id];
    if (element) {
      set((state) => {
        const dataLayer = toDataLayer(state.activeLayer);
        return {
          puzzle: {
            ...state.puzzle,
            [dataLayer]: {
              ...state.puzzle[dataLayer],
              boxLines: {
                ...state.puzzle[dataLayer].boxLines,
                [id]: { ...element, cells },
              },
            },
          },
        };
      });
    }
  },

  // DirectionalClue operations
  addDirectionalClue: (element) => {
    const id = generateDirectionalClueId();
    const fullElement = { ...element, id };
    set((state) => {
      const layer = fullElement.layer;
      const clues = { ...(state.puzzle[layer].directionalClues || {}) };
      // enforce one clue per cell (using cellId for lookup)
      const existingEntry = Object.entries(clues).find(
        ([, clue]) => clue.cellId === fullElement.cellId
      );
      if (existingEntry) {
        delete clues[existingEntry[0]];
      }
      clues[id] = fullElement;

      // Remove any center number at the same cell (mutual exclusivity)
      let newNumbers = state.puzzle[layer].numbers;
      const existingNumberEntry = Object.entries(newNumbers).find(
        ([, num]) => num.cellId === fullElement.cellId && num.position === 'center'
      );
      if (existingNumberEntry) {
        newNumbers = { ...newNumbers };
        delete newNumbers[existingNumberEntry[0]];
      }

      return {
        puzzle: {
          ...state.puzzle,
          [layer]: {
            ...state.puzzle[layer],
            directionalClues: clues,
            numbers: newNumbers,
          },
        },
      };
    });
    return id;
  },

  removeDirectionalClue: (id) => {
    set((state) => {
      const layer = toDataLayer(state.activeLayer);
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

  // Line group operations (for arrow chains, etc.)
  addLineGroup: (lineIds, groupType) => {
    const state = get();
    const layer = toDataLayer(state.activeLayer);
    const lines = state.puzzle[layer].lines || {};
    const edges = state.puzzle[layer].edges || {};
    const walls = state.puzzle[layer].walls || {};
    const context: GeometryContext = { grid: state.grid, topology: state.topology };

    // Build LineWithPosition array using helper
    const groupLines = buildLinesWithPosition(lineIds, lines, edges, walls, context);

    // Normalize and get arrow directions using helper
    const { id, lineIds: normalizedIds, arrowDirections } = normalizeLineGroupWithExisting(groupLines);
    const newGroup = { id, lineIds: normalizedIds, groupType, layer };

    set((state) => {
      const dataLayer = toDataLayer(state.activeLayer);
      const newLines = applyArrowDirections(state.puzzle[dataLayer].lines, arrowDirections);

      return {
        puzzle: {
          ...state.puzzle,
          [dataLayer]: {
            ...state.puzzle[dataLayer],
            lines: newLines,
            lineGroups: {
              ...(state.puzzle[dataLayer].lineGroups || {}),
              [id]: newGroup,
            },
          },
        },
      };
    });
    return id;
  },

  removeLineGroup: (groupId) => {
    const state = get();
    const layer = toDataLayer(state.activeLayer);
    const groups = state.puzzle[layer].lineGroups || {};
    const group = groups[groupId];
    if (!group) return;

    const lines = state.puzzle[layer].lines || {};
    const edges = state.puzzle[layer].edges || {};
    const walls = state.puzzle[layer].walls || {};
    const context: GeometryContext = { grid: state.grid, topology: state.topology };

    // Build LineWithPosition array and normalize to get correct arrow directions
    const groupLines = buildLinesWithPosition(group.lineIds, lines, edges, walls, context);
    const { arrowDirections } = normalizeLineGroupWithExisting(groupLines);

    set((state) => {
      const dataLayer = toDataLayer(state.activeLayer);
      const newGroups = { ...(state.puzzle[dataLayer].lineGroups || {}) };
      delete newGroups[groupId];

      const newLines = applyArrowDirections(state.puzzle[dataLayer].lines, arrowDirections);

      return {
        puzzle: {
          ...state.puzzle,
          [dataLayer]: {
            ...state.puzzle[dataLayer],
            lines: newLines,
            lineGroups: newGroups,
          },
        },
      };
    });
  },

  addLinesToGroup: (groupId, lineIds) => {
    const state = get();
    const layer = toDataLayer(state.activeLayer);
    const groups = state.puzzle[layer].lineGroups || {};
    const group = groups[groupId];
    if (group) {
      const newLineIds = [...new Set([...group.lineIds, ...lineIds])];
      set((state) => {
        const dataLayer = toDataLayer(state.activeLayer);
        return {
          puzzle: {
            ...state.puzzle,
            [dataLayer]: {
              ...state.puzzle[dataLayer],
              lineGroups: {
                ...(state.puzzle[dataLayer].lineGroups || {}),
                [groupId]: { ...group, lineIds: newLineIds },
              },
            },
          },
        };
      });
    }
  },

  removeLinesFromGroup: (groupId, lineIds) => {
    const state = get();
    const layer = toDataLayer(state.activeLayer);
    const groups = state.puzzle[layer].lineGroups || {};
    const group = groups[groupId];
    if (group) {
      const lineIdSet = new Set(lineIds);
      const newLineIds = group.lineIds.filter(id => !lineIdSet.has(id));

      set((state) => {
        const dataLayer = toDataLayer(state.activeLayer);
        // If group becomes empty or has only 1 line, remove it entirely
        if (newLineIds.length <= 1) {
          const newGroups = { ...(state.puzzle[dataLayer].lineGroups || {}) };
          delete newGroups[groupId];
          return {
            puzzle: {
              ...state.puzzle,
              [dataLayer]: {
                ...state.puzzle[dataLayer],
                lineGroups: newGroups,
              },
            },
          };
        }
        return {
          puzzle: {
            ...state.puzzle,
            [dataLayer]: {
              ...state.puzzle[dataLayer],
              lineGroups: {
                ...(state.puzzle[dataLayer].lineGroups || {}),
                [groupId]: { ...group, lineIds: newLineIds },
              },
            },
          },
        };
      });
    }
  },

  getLineGroup: (lineId) => {
    const state = get();
    const layer = toDataLayer(state.activeLayer);
    const groups = state.puzzle[layer].lineGroups || {};
    return Object.values(groups).find(group => group.lineIds.includes(lineId));
  },

  splitLineGroup: (groupId, splitAtLineId) => {
    const state = get();
    const layer = toDataLayer(state.activeLayer);
    const groups = state.puzzle[layer].lineGroups || {};
    const group = groups[groupId];

    if (!group) {
      return { group1: null, group2: null };
    }

    const lines = state.puzzle[layer].lines || {};
    const edges = state.puzzle[layer].edges || {};
    const walls = state.puzzle[layer].walls || {};
    const context: GeometryContext = { grid: state.grid, topology: state.topology };

    // Build LineWithPosition array using helper
    const groupLines = buildLinesWithPosition(group.lineIds, lines, edges, walls, context);

    // Normalize the chain first
    const normalizedChain = normalizeChain(groupLines);
    if (!normalizedChain) {
      return { group1: null, group2: null };
    }

    // Split the chain
    const splitResult = splitChain(normalizedChain, splitAtLineId, groupLines);

    let newGroup1: LineGroup | null = null;
    let newGroup2: LineGroup | null = null;

    set((state) => {
      const dataLayer = toDataLayer(state.activeLayer);
      const newGroups = { ...(state.puzzle[dataLayer].lineGroups || {}) };

      // Remove the original group
      delete newGroups[groupId];

      // Create new groups if they have 2+ lines
      if (splitResult.before && splitResult.before.lineIds.length >= 2) {
        const id1 = `lg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        newGroup1 = {
          id: id1,
          lineIds: splitResult.before.lineIds,
          groupType: group.groupType,
          layer: group.layer,
        };
        newGroups[id1] = newGroup1;
      }

      if (splitResult.after && splitResult.after.lineIds.length >= 2) {
        const id2 = `lg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-2`;
        newGroup2 = {
          id: id2,
          lineIds: splitResult.after.lineIds,
          groupType: group.groupType,
          layer: group.layer,
        };
        newGroups[id2] = newGroup2;
      }

      return {
        puzzle: {
          ...state.puzzle,
          [dataLayer]: {
            ...state.puzzle[dataLayer],
            lineGroups: newGroups,
          },
        },
      };
    });

    return { group1: newGroup1, group2: newGroup2 };
  },

  normalizeLineGroup: (groupId) => {
    const state = get();
    const layer = toDataLayer(state.activeLayer);
    const groups = state.puzzle[layer].lineGroups || {};
    const group = groups[groupId];

    if (!group) return;

    const lines = state.puzzle[layer].lines || {};
    const edges = state.puzzle[layer].edges || {};
    const walls = state.puzzle[layer].walls || {};
    const context: GeometryContext = { grid: state.grid, topology: state.topology };

    // Build LineWithPosition array and normalize using helpers
    const groupLines = buildLinesWithPosition(group.lineIds, lines, edges, walls, context);
    const { lineIds: normalizedIds, arrowDirections } = normalizeLineGroupWithExisting(groupLines, groupId);

    set((state) => {
      const dataLayer = toDataLayer(state.activeLayer);
      const newLines = applyArrowDirections(state.puzzle[dataLayer].lines, arrowDirections);
      const currentGroups = { ...(state.puzzle[dataLayer].lineGroups || {}) };

      // Update group lineIds order
      currentGroups[groupId] = {
        ...group,
        lineIds: normalizedIds,
      };

      return {
        puzzle: {
          ...state.puzzle,
          [dataLayer]: {
            ...state.puzzle[dataLayer],
            lines: newLines,
            lineGroups: currentGroups,
          },
        },
      };
    });
  },

  groupSelectedLinesByConnectivity: (lineIds) => {
    const state = get();
    const layer = toDataLayer(state.activeLayer);
    const lines = state.puzzle[layer].lines || {};
    const edges = state.puzzle[layer].edges || {};
    const walls = state.puzzle[layer].walls || {};
    const context: GeometryContext = { grid: state.grid, topology: state.topology };

    // Build LineWithPosition array using helper
    const selectedLines = buildLinesWithPosition(lineIds, lines, edges, walls, context);
    if (selectedLines.length === 0) return [];

    // Group and normalize using helper
    const { groups, allArrowDirections } = groupAndNormalizeByConnectivity(selectedLines);
    const createdGroupIds = groups.map(g => g.id);

    if (groups.length === 0 && allArrowDirections.size === 0) {
      return createdGroupIds;
    }

    // Create LineGroup records
    const lineGroupRecords = createLineGroupRecords(groups, layer);

    set((state) => {
      const dataLayer = toDataLayer(state.activeLayer);
      const existingGroups = state.puzzle[dataLayer].lineGroups || {};
      const newLines = applyArrowDirections(state.puzzle[dataLayer].lines, allArrowDirections);

      return {
        puzzle: {
          ...state.puzzle,
          [dataLayer]: {
            ...state.puzzle[dataLayer],
            lines: newLines,
            lineGroups: { ...existingGroups, ...lineGroupRecords },
          },
        },
      };
    });

    return createdGroupIds;
  },

  groupSelectedLinesByCollinearity: (lineIds) => {
    const state = get();
    const layer = toDataLayer(state.activeLayer);
    const lines = state.puzzle[layer].lines || {};
    const edges = state.puzzle[layer].edges || {};
    const walls = state.puzzle[layer].walls || {};
    const context: GeometryContext = { grid: state.grid, topology: state.topology };

    // Build LineWithPosition array using helper
    const selectedLines = buildLinesWithPosition(lineIds, lines, edges, walls, context);
    if (selectedLines.length === 0) return [];

    // Group by collinearity and normalize using helper
    const { groups, allArrowDirections } = groupAndNormalizeByCollinearity(selectedLines);
    const createdGroupIds = groups.map(g => g.id);

    if (groups.length === 0 && allArrowDirections.size === 0) {
      return createdGroupIds;
    }

    // Create LineGroup records
    const lineGroupRecords = createLineGroupRecords(groups, layer);

    set((state) => {
      const dataLayer = toDataLayer(state.activeLayer);
      const existingGroups = state.puzzle[dataLayer].lineGroups || {};
      const newLines = applyArrowDirections(state.puzzle[dataLayer].lines, allArrowDirections);

      return {
        puzzle: {
          ...state.puzzle,
          [dataLayer]: {
            ...state.puzzle[dataLayer],
            lines: newLines,
            lineGroups: { ...existingGroups, ...lineGroupRecords },
          },
        },
      };
    });

    return createdGroupIds;
  },

  // Room map operations (for Heyawake, etc.)
  setRoomMap: (roomMap) => {
    set((state) => ({
      puzzle: {
        ...state.puzzle,
        problem: {
          ...state.puzzle.problem,
          roomMap,
        },
      },
    }));
  },

  clearRoomMap: () => {
    set((state) => {
      const { roomMap, ...rest } = state.puzzle.problem;
      return {
        puzzle: {
          ...state.puzzle,
          problem: rest as typeof state.puzzle.problem,
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
