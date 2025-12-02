/**
 * Grid Slice - Grid configuration, topology, and cell operations
 */

import type { GridConfig, Point } from '../../types';
import type { GridSlice, SliceCreator } from './types';
import type { TopologyPreset, GridTopology } from '../../utils/gridTopology';
import {
  gridConfigToTopology,
  applyTopologyPreset,
  resizeTopology,
} from '../../utils/gridTopology';
import { historyManager } from '../historyManager';

// Default grid configuration
const DEFAULT_GRID: GridConfig = {
  rows: 10,
  cols: 10,
  cellSize: 40,
  outerPadding: 20,
  showGrid: true,
  gridStyle: 'normal',
  gridType: 'square',
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  frameStyle: 'normal',
  frameColor: '#000000',
  gridColor: '#000000',
  backgroundColor: '#ffffff',
};

// Initialize default topology
const createDefaultTopology = (): GridTopology => {
  const baseTopology = gridConfigToTopology(DEFAULT_GRID);
  return applyTopologyPreset(baseTopology, { preset: 'square', intensity: 0.5 });
};

export const createGridSlice: SliceCreator<GridSlice> = (set, get) => ({
  grid: { ...DEFAULT_GRID },

  setGrid: (gridUpdate) =>
    set((state) => {
      const newGrid = { ...state.grid, ...gridUpdate };
      let newTopology = state.topology;
      if (state.useTopology) {
        const base = gridConfigToTopology(newGrid);
        newTopology = applyTopologyPreset(base, {
          preset: state.topologyPreset,
          intensity: state.topologyIntensity,
        });
      }
      return {
        grid: newGrid,
        topology: newTopology,
      };
    }),

  // Topology mode
  useTopology: true,
  setUseTopology: (useTopology) => {
    set({ useTopology });
    if (useTopology) {
      get().applyTopologyPreset();
    }
  },

  topology: createDefaultTopology(),

  updateTopology: () => {
    const state = get();
    if (state.useTopology) {
      get().applyTopologyPreset();
    }
  },

  // Topology preset
  topologyPreset: 'square' as TopologyPreset,
  topologyIntensity: 0.5,
  setTopologyPreset: (preset) => set({ topologyPreset: preset }),
  setTopologyIntensity: (intensity) => set({ topologyIntensity: intensity }),

  applyTopologyPreset: () => {
    const state = get();
    const baseTopology = gridConfigToTopology(state.grid);
    const transformedTopology = applyTopologyPreset(baseTopology, {
      preset: state.topologyPreset,
      intensity: state.topologyIntensity,
    });
    set({ topology: transformedTopology });
  },

  // Preview topology
  previewTopology: null,
  previewGrid: null,

  setPreviewGrid: (config) => {
    if (config === null) {
      set({ previewTopology: null, previewGrid: null });
    } else {
      const state = get();
      const previewGridConfig: GridConfig = {
        ...state.grid,
        gridType: config.gridType,
        rows: config.rows,
        cols: config.cols,
        cellSize: config.cellSize ?? state.grid.cellSize,
        ...(config.level !== undefined && { level: config.level }),
        ...(config.isometricFaces !== undefined && { isometricFaces: config.isometricFaces }),
        ...(config.isometricView !== undefined && { isometricView: config.isometricView }),
      };
      const baseTopology = gridConfigToTopology(previewGridConfig);
      const previewTopo = applyTopologyPreset(baseTopology, {
        preset: state.topologyPreset,
        intensity: state.topologyIntensity,
      });
      set({ previewTopology: previewTopo, previewGrid: previewGridConfig });
    }
  },

  // Show adjacency lines
  showAdjacency: false,
  setShowAdjacency: (show) => set({ showAdjacency: show }),

  // Grid cell enabled/disabled
  toggleCellDisabled: (cellId) =>
    set((state) => {
      const currentDisabled = state.grid.disabledCells || [];
      const isDisabled = currentDisabled.includes(cellId);
      const disabledCells = isDisabled
        ? currentDisabled.filter((id) => id !== cellId)
        : [...currentDisabled, cellId];
      return { grid: { ...state.grid, disabledCells } };
    }),

  setCellDisabled: (cellId, disabled) =>
    set((state) => {
      const currentDisabled = state.grid.disabledCells || [];
      const isDisabled = currentDisabled.includes(cellId);
      if (disabled && !isDisabled) {
        return { grid: { ...state.grid, disabledCells: [...currentDisabled, cellId] } };
      } else if (!disabled && isDisabled) {
        return {
          grid: { ...state.grid, disabledCells: currentDisabled.filter((id) => id !== cellId) },
        };
      }
      return state;
    }),

  // Sculpt mode: flip a 3-cell cluster vertically around pivot
  sculptRotateCluster: (vertexId: string) =>
    set((state) => {
      if (!state.topology || state.grid.gridType !== 'iso') return state;
      const topology = state.topology;
      const pivot = topology.vertices.get(vertexId);
      if (!pivot || pivot.adjacentCells.length !== 3) return state;

      const clusterCellIds = new Set(pivot.adjacentCells);
      const affectedVertexIds = new Set<string>();
      const localCellIds = new Set<string>(clusterCellIds);

      // Include neighboring cells to limit debug output
      clusterCellIds.forEach((cellId) => {
        const cell = topology.cells.get(cellId);
        cell?.adjacentCells.forEach((adjId) => localCellIds.add(adjId));
      });

      const collectCellInfo = (cellsMap: Map<string, any>, ids: Set<string>) =>
        Array.from(ids)
          .map((id) => {
            const cell = cellsMap.get(id);
            if (!cell) return null;
            return {
              id: cell.id,
              boundaryVertices: cell.boundaryVertices.slice(),
              center: cell.center,
              adjacentCells: cell.adjacentCells,
            };
          })
          .filter((c): c is NonNullable<typeof c> => !!c);

      const collectVertexInfo = (verticesMap: Map<string, any>, ids: Set<string>) =>
        Array.from(ids)
          .map((id) => {
            const v = verticesMap.get(id);
            if (!v) return null;
            return { id: v.id, pos: v.position, adjCells: v.adjacentCells };
          })
          .filter((v): v is NonNullable<typeof v> => !!v);

      const collectEdgeInfo = (edgesMap: Map<string, any>, ids: Set<string>) =>
        Array.from(edgesMap.values())
          .filter((edge) => edge.adjacentCells.some((cId: string) => ids.has(cId)))
          .map((edge) => ({
            id: edge.id,
            start: edge.startVertex,
            end: edge.endVertex,
            adj: edge.adjacentCells,
          }));

      pivot.adjacentCells.forEach((cellId) => {
        const cell = topology.cells.get(cellId);
        if (!cell) return;
        cell.boundaryVertices.forEach((vId) => affectedVertexIds.add(vId));
      });

      const localVertexIdsBefore = new Set<string>();
      localCellIds.forEach((cellId) => {
        const cell = topology.cells.get(cellId);
        cell?.boundaryVertices.forEach((vId) => localVertexIdsBefore.add(vId));
      });

      console.log('[sculptRotateCluster][before] pivot', pivot.id, 'cluster', Array.from(clusterCellIds), 'localCells', Array.from(localCellIds));
      console.log('[sculptRotateCluster][before] cells', collectCellInfo(state.topology.cells, localCellIds));
      console.log('[sculptRotateCluster][before] vertices', collectVertexInfo(state.topology.vertices, localVertexIdsBefore));
      console.log('[sculptRotateCluster][before] edges', collectEdgeInfo(state.topology.edges, localCellIds));

      const newVertices = new Map(state.topology.vertices);

      const edgeKey = (a: string, b: string) => (a < b ? `${a}-${b}` : `${b}-${a}`);
      const pairToEdge = new Map<string, any>();
      state.topology.edges.forEach((edge) => {
        const key = edgeKey(edge.startVertex, edge.endVertex);
        pairToEdge.set(key, edge);
      });

      // Outer ring: 6 vertices around pivot
      const outerVertexIds = new Set<string>();
      clusterCellIds.forEach((cellId) => {
        const cell = topology.cells.get(cellId);
        cell?.boundaryVertices.forEach((vId) => {
          if (vId !== pivot.id) outerVertexIds.add(vId);
        });
      });

      if (outerVertexIds.size !== 6) {
        console.log('[sculptRotateCluster] abort: expected 6 outer vertices, got', outerVertexIds.size);
        return state;
      }

      // Order outer vertices by angle, create remap (+3 = 180° rotation)
      const orderedOuter = Array.from(outerVertexIds)
        .map((vid) => {
          const v = newVertices.get(vid)!;
          return {
            vid,
            angle: Math.atan2(v.position.y - pivot.position.y, v.position.x - pivot.position.x),
          };
        })
        .sort((a, b) => a.angle - b.angle);

      const remap = new Map<string, string>();
      orderedOuter.forEach((item, idx) => {
        const target = orderedOuter[(idx + 3) % 6];
        remap.set(item.vid, target.vid);
      });
      const remapVertex = (vid: string) => remap.get(vid) ?? vid;

      console.log('[sculptRotateCluster] remap', Object.fromEntries(remap));

      // Find top and bottom of hexagon
      let hexTopY = Infinity;
      let hexBottomY = -Infinity;
      outerVertexIds.forEach((vid) => {
        const v = newVertices.get(vid);
        if (!v) return;
        if (v.position.y < hexTopY) hexTopY = v.position.y;
        if (v.position.y > hexBottomY) hexBottomY = v.position.y;
      });

      // Calculate flipped pivot position
      const hexCenterY = (hexTopY + hexBottomY) / 2;
      const flippedPivotY = 2 * hexCenterY - pivot.position.y;
      const pivotDeltaY = flippedPivotY - pivot.position.y;

      console.log('[sculptRotateCluster] pivot flip', {
        pivotBefore: pivot.position,
        hexTopY,
        hexBottomY,
        hexCenterY,
        flippedPivotY,
        pivotDeltaY,
      });

      // Update pivot vertex position
      newVertices.set(pivot.id, {
        ...pivot,
        position: { x: pivot.position.x, y: flippedPivotY },
      });

      // Rebuild cells: remap boundaryVertices, calculate center as centroid
      const newCells = new Map(state.topology.cells);

      clusterCellIds.forEach((cellId) => {
        const cell = state.topology!.cells.get(cellId);
        if (!cell) return;

        const boundaryVertices = cell.boundaryVertices.map(remapVertex);
        const positions = boundaryVertices
          .map((vid) => newVertices.get(vid)?.position)
          .filter((p): p is Point => !!p);

        const center: Point =
          positions.length > 0
            ? {
                x: positions.reduce((sum, p) => sum + p.x, 0) / positions.length,
                y: positions.reduce((sum, p) => sum + p.y, 0) / positions.length,
              }
            : cell.center;

        console.log('[sculptRotateCluster]', cellId, {
          before: cell.center,
          after: center,
        });

        newCells.set(cellId, { ...cell, boundaryVertices, center });
      });

      // Rebuild edges from cells
      const edgeAccumulator = new Map<
        string,
        { startVertex: string; endVertex: string; cells: string[] }
      >();
      newCells.forEach((cell, cellId) => {
        const verts = cell.boundaryVertices;
        for (let i = 0; i < verts.length; i++) {
          const start = verts[i];
          const end = verts[(i + 1) % verts.length];
          const key = edgeKey(start, end);
          const acc = edgeAccumulator.get(key) ?? {
            startVertex: start,
            endVertex: end,
            cells: [] as string[],
          };
          if (!acc.cells.includes(cellId)) acc.cells.push(cellId);
          edgeAccumulator.set(key, acc);
        }
      });

      const newEdges = new Map<string, any>();
      edgeAccumulator.forEach((acc, key) => {
        const v1 = newVertices.get(acc.startVertex);
        const v2 = newVertices.get(acc.endVertex);
        if (!v1 || !v2) return;
        const baseId = pairToEdge.get(key)?.id ?? key;
        newEdges.set(baseId, {
          id: baseId,
          startVertex: acc.startVertex,
          endVertex: acc.endVertex,
          midpoint: {
            x: (v1.position.x + v2.position.x) / 2,
            y: (v1.position.y + v2.position.y) / 2,
          },
          adjacentCells: acc.cells,
          isBoundary: acc.cells.length === 1,
        });
      });

      // Rebuild vertex adjacentCells from cells
      const vertexToCells = new Map<string, Set<string>>();
      newCells.forEach((cell, cellId) => {
        cell.boundaryVertices.forEach((vid: string) => {
          if (!vertexToCells.has(vid)) vertexToCells.set(vid, new Set());
          vertexToCells.get(vid)!.add(cellId);
        });
      });
      vertexToCells.forEach((cellIds, vid) => {
        const v = newVertices.get(vid);
        if (v) {
          newVertices.set(vid, { ...v, adjacentCells: Array.from(cellIds) });
        }
      });

      // Detect new hexagons
      const oldHexagonVertices = new Set<string>();
      state.topology.vertices.forEach((v, vid) => {
        if (v.adjacentCells.length === 3) oldHexagonVertices.add(vid);
      });

      const newHexagonVertices: string[] = [];
      newVertices.forEach((v, vid) => {
        if (v.adjacentCells.length === 3 && !oldHexagonVertices.has(vid)) {
          newHexagonVertices.push(vid);
        }
      });

      if (newHexagonVertices.length > 0) {
        console.log(
          '[sculptRotateCluster] new hexagons detected:',
          newHexagonVertices.map((vid) => {
            const v = newVertices.get(vid);
            return { id: vid, position: v?.position, cells: v?.adjacentCells };
          })
        );
      }

      const localVertexIdsAfter = new Set<string>();
      localCellIds.forEach((cellId) => {
        const cell = newCells.get(cellId);
        cell?.boundaryVertices.forEach((vId) => localVertexIdsAfter.add(vId));
      });

      console.log('[sculptRotateCluster][after] pivot', pivot.id, 'cluster', Array.from(clusterCellIds), 'localCells', Array.from(localCellIds));
      console.log('[sculptRotateCluster][after] cells', collectCellInfo(newCells, localCellIds));
      console.log('[sculptRotateCluster][after] vertices', collectVertexInfo(newVertices, localVertexIdsAfter));
      console.log('[sculptRotateCluster][after] edges', collectEdgeInfo(newEdges, localCellIds));

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      newVertices.forEach((v) => {
        minX = Math.min(minX, v.position.x);
        minY = Math.min(minY, v.position.y);
        maxX = Math.max(maxX, v.position.x);
        maxY = Math.max(maxY, v.position.y);
      });
      const prevBounds = state.topology.bounds;
      const bounds = {
        minX,
        minY,
        maxX,
        maxY,
        // Preserve original canvas extent to avoid export cropping; only update extents.
        width: prevBounds.width,
        height: prevBounds.height,
      };

      // Save operation to grid config for regeneration on load
      const currentSculptOps = state.grid.sculptOperations || [];
      const newSculptOps = [...currentSculptOps, { type: 'rotate' as const, vertexId }];

      return {
        grid: { ...state.grid, sculptOperations: newSculptOps },
        topology: {
          ...state.topology,
          vertices: newVertices,
          edges: newEdges,
          cells: newCells,
          bounds,
        },
      };
    }),

  // Merge cells
  mergeCells: (cellIds) =>
    set((state) => {
      if (cellIds.length < 2) return state;

      const currentMerged = state.grid.mergedCells || [];

      const resolveIds = (ids: string[]) => {
        const expanded: string[] = [];
        ids.forEach((id) => {
          const m = id.match(/^merged-(\d+)$/);
          if (m) {
            const idx = parseInt(m[1], 10);
            if (currentMerged[idx]) {
              expanded.push(...currentMerged[idx]);
              return;
            }
          }
          expanded.push(id);
        });
        return expanded;
      };

      const expandedCellIds = resolveIds(cellIds);

      // Check if any cells are already in a merged group
      const existingGroupIndices: number[] = [];
      expandedCellIds.forEach((cellId) => {
        currentMerged.forEach((group, idx) => {
          if (group.includes(cellId) && !existingGroupIndices.includes(idx)) {
            existingGroupIndices.push(idx);
          }
        });
      });

      // Combine all cells from existing groups with new cells
      let allCells = [...expandedCellIds];
      existingGroupIndices.forEach((idx) => {
        allCells = [...allCells, ...currentMerged[idx]];
      });
      allCells = [...new Set(allCells)];

      // Remove old groups and add new combined group
      const newMerged = currentMerged.filter((_, idx) => !existingGroupIndices.includes(idx));
      newMerged.push(allCells);

      const grid = { ...state.grid, mergedCells: newMerged };
      let topology = state.topology;
      if (state.useTopology) {
        const base = gridConfigToTopology(grid);
        topology = applyTopologyPreset(base, {
          preset: state.topologyPreset,
          intensity: state.topologyIntensity,
        });
      }
      return { grid, topology };
    }),

  // Unmerge cells
  unmergeCells: (cellIds) =>
    set((state) => {
      const currentMerged = state.grid.mergedCells || [];
      if (currentMerged.length === 0) return state;

      const resolveIds = (ids: string[]) => {
        const expanded: string[] = [];
        ids.forEach((id) => {
          const m = id.match(/^merged-(\d+)$/);
          if (m) {
            const idx = parseInt(m[1], 10);
            if (currentMerged[idx]) {
              expanded.push(...currentMerged[idx]);
              return;
            }
          }
          expanded.push(id);
        });
        return expanded;
      };

      const expanded = resolveIds(cellIds);

      const newMerged = currentMerged
        .map((group) => group.filter((id) => !expanded.includes(id)))
        .filter((group) => group.length >= 2);

      const grid = { ...state.grid, mergedCells: newMerged.length > 0 ? newMerged : undefined };
      let topology = state.topology;
      if (state.useTopology) {
        const base = gridConfigToTopology(grid);
        topology = applyTopologyPreset(base, {
          preset: state.topologyPreset,
          intensity: state.topologyIntensity,
        });
      }
      return { grid, topology };
    }),

  // Split lines
  addSplitLine: (cellId, startVertexId, endVertexId) =>
    set((state) => {
      const currentSplits = state.grid.splitLines || [];

      const exists = currentSplits.some(
        (s) =>
          s.cellId === cellId &&
          ((s.startPoint.type === 'vertex' &&
            s.startPoint.vertexId === startVertexId &&
            s.endPoint.type === 'vertex' &&
            s.endPoint.vertexId === endVertexId) ||
            (s.startPoint.type === 'vertex' &&
              s.startPoint.vertexId === endVertexId &&
              s.endPoint.type === 'vertex' &&
              s.endPoint.vertexId === startVertexId))
      );
      if (exists) return state;

      const newSplit = {
        cellId,
        startPoint: { type: 'vertex' as const, vertexId: startVertexId },
        endPoint: { type: 'vertex' as const, vertexId: endVertexId },
      };

      const grid = { ...state.grid, splitLines: [...currentSplits, newSplit] };
      let topology = state.topology;
      if (state.useTopology) {
        const base = gridConfigToTopology(grid);
        topology = applyTopologyPreset(base, {
          preset: state.topologyPreset,
          intensity: state.topologyIntensity,
        });
      }
      return { grid, topology };
    }),

  removeSplitLine: (cellId) =>
    set((state) => {
      const currentSplits = state.grid.splitLines || [];
      const newSplits = currentSplits.filter((s) => s.cellId !== cellId);

      if (newSplits.length === currentSplits.length) return state;

      const grid = { ...state.grid, splitLines: newSplits.length > 0 ? newSplits : undefined };
      let topology = state.topology;
      if (state.useTopology) {
        const base = gridConfigToTopology(grid);
        topology = applyTopologyPreset(base, {
          preset: state.topologyPreset,
          intensity: state.topologyIntensity,
        });
      }
      return { grid, topology };
    }),

  clearSplitLines: () =>
    set((state) => {
      if (!state.grid.splitLines || state.grid.splitLines.length === 0) return state;

      const grid = { ...state.grid, splitLines: undefined };
      let topology = state.topology;
      if (state.useTopology) {
        const base = gridConfigToTopology(grid);
        topology = applyTopologyPreset(base, {
          preset: state.topologyPreset,
          intensity: state.topologyIntensity,
        });
      }
      return { grid, topology };
    }),

  // Grid resize
  resizeGrid: (configChanges) => {
    const state = get();
    const oldConfig = state.grid;
    const newConfig: GridConfig = { ...oldConfig, ...configChanges };

    if (state.useTopology && state.topology) {
      const resizeResult = resizeTopology(state.topology, oldConfig, newConfig);
      const removedCellSet = new Set(resizeResult.removedCells);

      const isCellRemoved = (cellId: string): boolean => {
        const topologyCellId = `cell-${cellId}`;
        return removedCellSet.has(topologyCellId);
      };

      const filterElements = <T extends Record<string, unknown>>(elements: T): T => {
        const filtered = {} as T;
        for (const [key, value] of Object.entries(elements)) {
          if (!value || typeof value !== 'object') {
            (filtered as Record<string, unknown>)[key] = value;
            continue;
          }

          const elem = value as Record<string, unknown>;
          let shouldKeep = true;

          if ('cellId' in elem && typeof elem.cellId === 'string') {
            if (isCellRemoved(elem.cellId)) {
              shouldKeep = false;
            }
          }

          if ('from' in elem && typeof elem.from === 'string') {
            const fromParts = elem.from.split('-');
            if (fromParts.length >= 2) {
              const cellId = `${fromParts[0]}-${fromParts[1]}`;
              if (isCellRemoved(cellId)) {
                shouldKeep = false;
              }
            }
          }

          if ('position' in elem && typeof elem.position === 'string') {
            const pos = elem.position;
            const parts = pos.split('-');
            if (parts.length >= 2) {
              const cellId = `${parts[0]}-${parts[1]}`;
              if (isCellRemoved(cellId)) {
                shouldKeep = false;
              }
            }
          }

          if (shouldKeep) {
            (filtered as Record<string, unknown>)[key] = value;
          }
        }
        return filtered;
      };

      const newPuzzle = {
        problem: {
          surfaces: filterElements(state.puzzle.problem.surfaces || {}),
          lines: filterElements(state.puzzle.problem.lines || {}),
          edges: filterElements(state.puzzle.problem.edges || {}),
          walls: filterElements(state.puzzle.problem.walls || {}),
          numbers: filterElements(state.puzzle.problem.numbers || {}),
          symbols: filterElements(state.puzzle.problem.symbols || {}),
          cages: state.puzzle.problem.cages || {},
          specials: state.puzzle.problem.specials || {},
          boxLines: state.puzzle.problem.boxLines || {},
          directionalClues: filterElements(state.puzzle.problem.directionalClues || {}),
        },
        answer: {
          surfaces: filterElements(state.puzzle.answer.surfaces || {}),
          lines: filterElements(state.puzzle.answer.lines || {}),
          edges: filterElements(state.puzzle.answer.edges || {}),
          walls: filterElements(state.puzzle.answer.walls || {}),
          numbers: filterElements(state.puzzle.answer.numbers || {}),
          symbols: filterElements(state.puzzle.answer.symbols || {}),
          cages: state.puzzle.answer.cages || {},
          specials: state.puzzle.answer.specials || {},
          boxLines: state.puzzle.answer.boxLines || {},
          directionalClues: filterElements(state.puzzle.answer.directionalClues || {}),
        },
        multicolorSurfaces: filterElements(state.puzzle.multicolorSurfaces || {}),
      };

      const newDisabledCells = (oldConfig.disabledCells || []).filter(
        (cellId) => !removedCellSet.has(cellId)
      );

      const transformedTopology = applyTopologyPreset(resizeResult.topology, {
        preset: state.topologyPreset,
        intensity: state.topologyIntensity,
      });

      set({
        grid: { ...newConfig, disabledCells: newDisabledCells },
        puzzle: newPuzzle,
        topology: transformedTopology,
      });
    } else if (state.useTopology) {
      const newTopology = gridConfigToTopology(newConfig);
      const transformedTopology = applyTopologyPreset(newTopology, {
        preset: state.topologyPreset,
        intensity: state.topologyIntensity,
      });
      set({
        grid: newConfig,
        topology: transformedTopology,
      });
    } else {
      set({ grid: newConfig });
    }

    historyManager.clear();
  },
});
