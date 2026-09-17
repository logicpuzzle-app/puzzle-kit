import type { GridConfig, LineElement, LineGridPoint, Point, PuzzleElements, PuzzleState } from '../types';
import type { GridTopology } from './gridTopology';
import { gridConfigToTopology, applyTopologyPreset } from './gridTopology';
import { getCellIndexMap, getCellIndexById, getCellCenter, getCellCorners, getVertexIndexMap, getVertexPosition, getEdgeIndexMap, getVertexId } from './gridUtils';
import { resolveBoardPoint, resolveLinePoints } from './lineReferences';
import type { PuzzleStore } from '../store/slices/types';
import { normalizeTriangleColumns } from './triangleLayout';

export type ReferenceModeChangeResult = { ok: true } | { ok: false; reason: string };
type Maps = Record<LineGridPoint, Map<string, string>>;
const emptyMaps = (): Maps => ({ cell: new Map(), vertex: new Map(), edge: new Map() });
const pair = (a: string, b: string) => JSON.stringify([a, b].sort());
const equalSet = (a: string[], b: string[]) => a.length === b.length && new Set(a).size === a.length && a.every(id => b.includes(id));
function fail(reason: string): never { throw new Error(reason); }

/** Compatibility boundary, not an identity generator. Validate the entire
 * retained graph against the explicitly selected Grid geometry before mapping.
 * Temporary spatial buckets only narrow candidates; incidence and uniqueness
 * are checked too. No persisted ID is parsed or replaced on the topology. */
function createMaps(grid: GridConfig, topology: GridTopology): Maps {
  if (grid.mergedCells?.length || grid.splitLines?.length || grid.sculptOperations?.length) {
    fail('Structural edits cannot be represented in Grid mode.');
  }
  const actual = topology.exclusionBase ?? topology;
  const expected = gridConfigToTopology({ ...grid, voidCells: undefined, disabledCells: undefined, outboardCells: undefined });
  if (actual.cells.size !== expected.cells.size || actual.vertices.size !== expected.vertices.size || actual.edges.size !== expected.edges.size) {
    fail('The retained board does not match the Grid shape.');
  }
  const epsilon = Math.max(1, grid.cellSize) * 1e-7;
  const close = (a: Point, b: Point) => Number.isFinite(a.x) && Number.isFinite(a.y) &&
    Math.abs(a.x - b.x) <= epsilon && Math.abs(a.y - b.y) <= epsilon;
  const byIndex = new Map<string, string>();
  for (const cell of actual.cells.values()) {
    const [r, c] = cell.index ?? [];
    if (r == null || c == null) fail('A cell has no Grid index.');
    const key = JSON.stringify([r, c]);
    if (byIndex.has(key)) fail('Multiple cells share a Grid index.');
    byIndex.set(key, cell.id);
  }
  const cells = new Map<string, string>();
  for (const cell of expected.cells.values()) {
    const id = byIndex.get(JSON.stringify(cell.index));
    const target = id === undefined ? undefined : actual.cells.get(id);
    if (!target || !close(target.baseCenter ?? target.center, cell.center)) fail('A cell does not match the Grid geometry.');
    cells.set(cell.id, target.id);
  }
  const buckets = new Map<string, string[]>();
  const bucket = (p: Point) => [Math.floor(p.x / epsilon), Math.floor(p.y / epsilon)];
  for (const vertex of actual.vertices.values()) {
    const p = vertex.basePosition ?? vertex.position;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) fail('A vertex has invalid geometry.');
    const key = JSON.stringify(bucket(p));
    buckets.set(key, [...(buckets.get(key) ?? []), vertex.id]);
  }
  const findVertex = (p: Point, adjacentCells?: string[]) => {
    const [x, y] = bucket(p);
    const candidates: string[] = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      for (const id of buckets.get(JSON.stringify([x + dx, y + dy])) ?? []) {
        const v = actual.vertices.get(id)!;
        if (close(v.basePosition ?? v.position, p) && (!adjacentCells || equalSet(v.adjacentCells, adjacentCells))) candidates.push(id);
      }
    }
    if (candidates.length !== 1) fail('A Grid vertex has no unique retained counterpart.');
    return candidates[0];
  };
  const vertices = new Map([...expected.vertices.values()].map(v =>
    [v.id, findVertex(v.position, v.adjacentCells.map(id => cells.get(id)!))]));
  if (new Set(vertices.values()).size !== vertices.size) fail('Vertex correspondence is not one-to-one.');
  const byEndpoints = new Map<string, string>();
  for (const edge of actual.edges.values()) {
    const key = pair(edge.startVertex, edge.endVertex);
    if (byEndpoints.has(key)) fail('Multiple edges share the same endpoints.');
    byEndpoints.set(key, edge.id);
  }
  const edges = new Map<string, string>();
  for (const edge of expected.edges.values()) {
    const id = byEndpoints.get(pair(vertices.get(edge.startVertex)!, vertices.get(edge.endVertex)!));
    const target = id === undefined ? undefined : actual.edges.get(id);
    if (!target || !equalSet(target.adjacentCells, edge.adjacentCells.map(id => cells.get(id)!))) fail('An edge does not match Grid incidence.');
    edges.set(edge.id, target.id);
  }
  for (const cell of expected.cells.values()) {
    const target = actual.cells.get(cells.get(cell.id)!)!;
    if (!equalSet(target.boundaryVertices, cell.boundaryVertices.map(id => vertices.get(id)!)) ||
        !equalSet(target.boundaryEdges, cell.boundaryEdges.map(id => edges.get(id)!))) fail('A cell boundary does not match Grid incidence.');
  }

  const maps = emptyMaps();
  const margins = grid.gridType === 'square' || grid.gridType === 'hex' || grid.gridType === 'triangle';
  for (const [id, p] of getCellIndexMap(grid)) {
    const target = byIndex.get(JSON.stringify([p.row + (margins ? grid.marginTop : 0), p.col + (margins ? grid.marginLeft : 0)]));
    const cell = target === undefined ? undefined : actual.cells.get(target);
    if (!cell || !close(cell.baseCenter ?? cell.center, getCellCenter(p.row, p.col, grid))) fail('Grid cell coordinates do not match the retained board.');
    maps.cell.set(id, cell.id);
  }
  for (const [id, p] of getVertexIndexMap(grid)) maps.vertex.set(id, findVertex(getVertexPosition(p.row, p.col, grid)));
  for (const [id, p] of getEdgeIndexMap(grid)) {
    const a = maps.vertex.get(getVertexId(p.row, p.col));
    const b = maps.vertex.get(getVertexId(p.row + (p.type === 'v' ? 1 : 0), p.col + (p.type === 'h' ? 1 : 0)));
    const edge = a === undefined || b === undefined ? undefined : byEndpoints.get(pair(a, b));
    if (edge === undefined) fail('A Grid edge has no retained counterpart.');
    maps.edge.set(id, edge);
  }
  return maps;
}

/** Calculate everything first. The store applies a successful result once and
 * records its original mode/data snapshot, so older history keeps its scope. */
export function migrateReferenceMode(state: PuzzleStore, useTopology: boolean): Partial<PuzzleStore> {
  if (!state.topology) fail('No retained topology is available for reference migration.');
  const topology = state.topology!;
  const full = topology.exclusionBase ?? topology;
  const sourceGrid = normalizeTriangleColumns(state.grid, state.useTopology);
  const maps = createMaps(sourceGrid, topology);
  const topologyToGridCells = new Map([...maps.cell].map(([a, b]) => [b, a]));
  // Current corner/side number rendering uses boundary offsets. Do not move a
  // clue to another corner on a custom reordered polygon during conversion.
  const validateNumberSlot = (cellId: string, position: string) => {
    if (position !== 'corner' && position !== 'side') return;
    const topologyId = state.useTopology ? cellId : maps.cell.get(cellId);
    const gridId = state.useTopology ? topologyToGridCells.get(cellId) : cellId;
    const cell = topologyId === undefined ? undefined : full.cells.get(topologyId);
    const index = gridId === undefined ? null : getCellIndexById(gridId, sourceGrid);
    if (!cell || !index) fail('Unresolved number placement.');
    const corners = getCellCorners(index.row, index.col, sourceGrid);
    if (cell.boundaryVertices.length !== corners.length || corners.some((p, i) => {
      const vertex = full.vertices.get(cell.boundaryVertices[i]);
      const q = vertex?.basePosition ?? vertex?.position;
      return !q || Math.abs(p.x - q.x) > state.grid.cellSize * 1e-7 || Math.abs(p.y - q.y) > state.grid.cellSize * 1e-7;
    })) fail('Corner/side numbering cannot be preserved on this cell boundary.');
  };
  if (!useTopology) for (const kind of ['cell', 'vertex', 'edge'] as const) {
    maps[kind] = new Map([...maps[kind]].map(([gridId, topologyId]) => [topologyId, gridId]));
  }
  const reference = (id: string, kind: LineGridPoint): string => {
    const result = maps[kind].get(id);
    if (result === undefined) fail(`Unresolved ${kind} reference: ${id}`);
    return result;
  };
  // Hidden notes are retained and migrate with the restorable graph too.
  const context = { grid: sourceGrid, topology: full, useTopology: state.useTopology };
  const line = (entry: LineElement): LineElement => {
    if (entry.isFree) return entry;
    const points = resolveLinePoints(entry, context);
    if (!points) fail(`Unresolved line endpoints: ${entry.id}`);
    const [a, b] = points!;
    return { ...entry, from: reference(a.id, a.type), fromType: a.type,
      to: reference(b.id, b.type), toType: b.type,
      ...(entry.edgeId !== undefined && { edgeId: reference(entry.edgeId, 'edge') }) };
  };
  const record = <T,>(items: Record<string, T>, convert: (item: T) => T): Record<string, T> =>
    Object.fromEntries(Object.entries(items).map(([id, item]) => [id, convert(item)]));
  const cellItem = <T extends { cellId: string },>(item: T): T => ({ ...item, cellId: reference(item.cellId, 'cell') });
  const elements = (layer: PuzzleElements): PuzzleElements => {
    const known = new Set(['vertexSurfaces', 'surfaces', 'lines', 'edges', 'walls', 'numbers', 'symbols', 'cages',
      'specials', 'boxLines', 'lineGroups', 'roomMap', 'borders', 'clueCells', 'rowClues', 'colClues', 'tapaClues']);
    for (const [key, value] of Object.entries(layer)) if (!known.has(key) && value != null &&
      (typeof value !== 'object' || Object.keys(value).length)) fail(`Unknown reference collection: ${key}`);
    const result: PuzzleElements = { ...layer,
      surfaces: record(layer.surfaces, cellItem), numbers: record(layer.numbers, item => {
        validateNumberSlot(item.cellId, item.position);
        return cellItem(item);
      }),
      lines: record(layer.lines, line),
      edges: record(layer.edges, item => line({ ...item, lineTarget: item.lineTarget ?? 'edge' })),
      walls: record(layer.walls, item => line({ ...item, lineTarget: item.lineTarget ?? 'wall' })),
      symbols: record(layer.symbols, item => {
        const p = resolveBoardPoint(item.cellId, item.pointType, context);
        if (!p) fail(`Unresolved symbol target: ${item.id}`);
        return { ...item, cellId: reference(p!.id, p!.type), pointType: p!.type };
      }),
      cages: record(layer.cages, item => ({ ...item, cells: item.cells.map(id => reference(id, 'cell')) })),
      specials: record(layer.specials, item => ({ ...item, points: item.points.map(id => reference(id, 'cell')) })),
      boxLines: record(layer.boxLines, item => ({ ...item, cells: item.cells.map(id => reference(id, 'cell')) })),
    };
    if (layer.roomMap) result.roomMap = Object.fromEntries(Object.entries(layer.roomMap).map(([id, room]) => [reference(id, 'cell'), room]));
    for (const key of ['clueCells', 'tapaClues'] as const) if (layer[key]) result[key] = record(layer[key]!, cellItem);
    if (layer.borders) result.borders = record(layer.borders, item => {
      if (!item || typeof item !== 'object' || !('edgeId' in item) || typeof item.edgeId !== 'string') fail('Unknown border reference format.');
      return { ...item as object, edgeId: reference((item as { edgeId: string }).edgeId, 'edge') };
    });
    return result;
  };
  const puzzle: PuzzleState = { ...state.puzzle,
    problem: elements(state.puzzle.problem), answer: elements(state.puzzle.answer),
    ...(state.puzzle.multicolorSurfaces && { multicolorSurfaces: record(state.puzzle.multicolorSurfaces, cellItem) }),
    ...(state.puzzle.solutionArea && { solutionArea: { ...state.puzzle.solutionArea, cells: state.puzzle.solutionArea.cells.map(id => reference(id, 'cell')) } }),
  };
  const grid: GridConfig = { ...sourceGrid };
  for (const key of ['voidCells', 'disabledCells', 'outboardCells'] as const) if (grid[key]) grid[key] = grid[key]!.map(id => reference(id, 'cell'));
  let nextTopology = JSON.stringify(grid) === JSON.stringify(state.grid) ? topology : { ...topology, sourceConfig: grid };
  const preset = useTopology ? state.topologyPreset : 'square';
  const intensity = useTopology ? state.topologyIntensity : 0.5;
  if (nextTopology.appliedPreset?.preset !== preset || nextTopology.appliedPreset?.intensity !== intensity) {
    nextTopology = applyTopologyPreset(nextTopology, { preset, intensity });
  }
  return { useTopology, grid, topology: nextTopology, puzzle, trialStack: state.trialStack.map(elements),
    selectedElements: [], annotationSelection: null, highlightedLineIds: [], drawingLineIds: [],
    previewGrid: null, previewTopology: null, previewState: null, hoverCell: null, cursorCell: null, numberSelection: null };
}
