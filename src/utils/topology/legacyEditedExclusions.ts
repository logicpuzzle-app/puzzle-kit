import { v4 as uuid } from 'uuid';
import type { GridConfig, Point, SplitPoint } from '../../types';
import type { GridTopology } from './types';
import { gridConfigToTopology } from './converter';
import { matchesLegacyGraph } from './legacyGraph';
import { legacySplitOperations } from './legacySplitOperations';
import { applyTopologyPreset } from './presets';
import { applyCellExclusions } from './exclusions';
import { editedGrid, projectEdits, type TopologyEdit } from './retainedEdits';

const position = (point: Point) => JSON.stringify([point.x, point.y]);
const pair = (a: string, b: string) => JSON.stringify([a, b].sort());

/** Restoring a disabled merge may change intermediate allocation. Resolve cut
 * endpoints on the old parent boundary before asking the generator to split. */
function remapCuts(grid: GridConfig, before: GridTopology, after: GridTopology): GridConfig | null {
  const cuts: NonNullable<GridConfig['splitLines']> = [];
  for (const cut of grid.splitLines ?? []) {
    const oldCell = before.cells.get(cut.cellId), cell = after.cells.get(cut.cellId);
    if (!oldCell || !cell) return null;
    const remap = (point: SplitPoint): SplitPoint | null => {
      if (point.type === 'vertex') {
        if (!oldCell.boundaryVertices.includes(point.vertexId)) return null;
        const origin = before.vertices.get(point.vertexId)!;
        const candidates = cell.boundaryVertices.filter(id => position(after.vertices.get(id)!.position) === position(origin.position));
        return candidates.length === 1 ? { type: 'vertex', vertexId: candidates[0] } : null;
      }
      if (!oldCell.boundaryEdges.includes(point.edgeId)) return null;
      const edge = before.edges.get(point.edgeId)!;
      const a = position(before.vertices.get(edge.startVertex)!.position), b = position(before.vertices.get(edge.endVertex)!.position);
      const candidates = cell.boundaryEdges.map(id => after.edges.get(id)!).filter(e =>
        pair(position(after.vertices.get(e.startVertex)!.position), position(after.vertices.get(e.endVertex)!.position)) === pair(a, b));
      if (candidates.length !== 1) return null;
      const target = candidates[0];
      return { type: 'edge', edgeId: target.id, t: position(after.vertices.get(target.startVertex)!.position) === a ? point.t : 1 - point.t };
    };
    const startPoint = remap(cut.startPoint), endPoint = remap(cut.endPoint);
    if (!startPoint || !endPoint) return null;
    cuts.push({ ...cut, startPoint, endPoint });
  }
  return { ...grid, splitLines: cuts.length ? cuts : undefined };
}

/** Reconstruct the old *actual* boundaries, source and history together. Hidden
 * source cells are restored independently; revealing them never silently
 * extends a surviving merge. Geometry correspondence is confined to this
 * whole-graph-verified legacy generator, never applied to arbitrary native IDs. */
export function prepareLegacyEditedExclusions(topology: GridTopology, grid: GridConfig): { topology: GridTopology; grid: GridConfig } | null {
  if (topology.editBase || topology.mergeBase || topology.exclusionBase || grid.sculptOperations?.length
      || !(grid.mergedCells?.length || grid.splitLines?.length)
      || ![grid.voidCells, grid.disabledCells, grid.outboardCells].some(ids => ids?.length)
      || new Set(grid.splitLines?.map(cut => cut.cellId)).size !== (grid.splitLines?.length ?? 0)) return null;
  const preset = topology.appliedPreset ?? { preset: 'square' as const, intensity: 0.5 };
  const raw = gridConfigToTopology(grid), expected = applyTopologyPreset(raw, preset);
  if (!matchesLegacyGraph(topology, expected)) return null;
  // The legacy merge/split generator dropped outboard flags even on untouched
  // live cells. Keep the saved role and adjacency; reapplying stale flags would
  // silently change that board. Hidden source settings remain until restoration.
  const outboardCells = grid.outboardCells?.filter(id => !raw.cells.has(id) || raw.cells.get(id)!.outboard);
  grid = { ...grid, outboardCells: outboardCells?.length ? outboardCells : undefined };
  const sourceGrid = { ...grid, mergedCells: undefined, splitLines: undefined };
  const source = gridConfigToTopology(sourceGrid);
  const complete = gridConfigToTopology({ ...sourceGrid, voidCells: undefined, disabledCells: undefined, outboardCells: undefined });
  // disabledCells can hide a merged output as well as a source cell. Restore
  // those outputs for the archive, while retaining the original source mask.
  const structuralGrid = { ...grid, disabledCells: grid.disabledCells?.filter(id => complete.cells.has(id)) };
  const originalBefore = gridConfigToTopology({ ...grid, splitLines: undefined });
  const before = gridConfigToTopology({ ...structuralGrid, splitLines: undefined });
  const structural = remapCuts(structuralGrid, originalBefore, before);
  if (!structural) return null;
  const after = gridConfigToTopology(structural);
  const rawCuts = legacySplitOperations(before, structural, after);
  if (!rawCuts) return null;
  const diagonalPairs = new Set(rawCuts.map(cut => pair(position(after.vertices.get(cut.startVertex)!.position), position(after.vertices.get(cut.endVertex)!.position))));

  const reserved = new Set([...topology.vertices.keys(), ...topology.edges.keys()]);
  const fresh = () => { let id: string; do { id = uuid(); } while (reserved.has(id)); reserved.add(id); return id; };
  const vertexAt = new Map([...raw.vertices.values()].map(vertex => [position(vertex.position), vertex.id]));
  const edgeAt = new Map([...raw.edges.values()].map(edge => [pair(edge.startVertex, edge.endVertex), edge.id]));
  if (vertexAt.size !== raw.vertices.size || edgeAt.size !== raw.edges.size) return null;
  const remapGraph = (graph: GridTopology, isSource = false): GridTopology | null => {
    const vertexIds = new Map<string, string>(), edgeIds = new Map<string, string>();
    for (const [id, vertex] of graph.vertices) {
      const key = position(vertex.position);
      if (!vertexAt.has(key)) vertexAt.set(key, fresh());
      vertexIds.set(id, vertexAt.get(key)!);
    }
    if (new Set(vertexIds.values()).size !== vertexIds.size) return null;
    for (const [id, edge] of graph.edges) {
      const key = pair(vertexIds.get(edge.startVertex)!, vertexIds.get(edge.endVertex)!);
      const geometry = pair(position(graph.vertices.get(edge.startVertex)!.position), position(graph.vertices.get(edge.endVertex)!.position));
      // A split can reintroduce the geometry of an internal source edge that
      // disappeared during merging. Those two lifetimes need distinct IDs.
      if (isSource && diagonalPairs.has(geometry)) edgeIds.set(id, fresh());
      else {
        if (!edgeAt.has(key)) edgeAt.set(key, fresh());
        edgeIds.set(id, edgeAt.get(key)!);
      }
    }
    if (new Set(edgeIds.values()).size !== edgeIds.size) return null;
    return { ...graph,
      cells: new Map([...graph.cells].map(([id, cell]) => [id, { ...cell,
        boundaryVertices: cell.boundaryVertices.map(v => vertexIds.get(v)!), boundaryEdges: cell.boundaryEdges.map(e => edgeIds.get(e)!),
      }])),
      vertices: new Map([...graph.vertices].map(([id, vertex]) => { const mapped = vertexIds.get(id)!; return [mapped, { ...vertex, id: mapped,
        adjacentEdges: vertex.adjacentEdges.map(e => edgeIds.get(e)!), adjacentVertices: vertex.adjacentVertices.map(v => vertexIds.get(v)!),
      }]; })),
      edges: new Map([...graph.edges].map(([id, edge]) => { const mapped = edgeIds.get(id)!, live = raw.edges.get(mapped); return [mapped, { ...edge, id: mapped,
        startVertex: live?.startVertex ?? vertexIds.get(edge.startVertex)!, endVertex: live?.endVertex ?? vertexIds.get(edge.endVertex)!,
      }]; })),
    };
  };
  const mappedBase = remapGraph(complete, true), mappedBefore = remapGraph(before), mappedAfter = remapGraph(after);
  if (!mappedBase || !mappedBefore || !mappedAfter) return null;
  const cuts = legacySplitOperations(before, structural, mappedAfter);
  if (!cuts) return null;
  const diagonals = new Set(cuts.map(cut => cut.edgeId));
  const edits: TopologyEdit[] = [];
  for (const requested of grid.mergedCells ?? []) {
    const members = requested.filter(id => source.cells.has(id));
    if (!members.length) continue; // No merged entity existed for this group.
    const matches = [...mappedBefore.cells.values()].filter(cell => !source.cells.has(cell.id)
      && cell.originalCells?.length === members.length && members.every(id => cell.originalCells!.includes(id)));
    if (matches.length !== 1) return null;
    const cell = matches[0];
    edits.push({ kind: 'merge', id: cell.id, cellIds: members,
      boundary: { vertices: cell.boundaryVertices, edges: cell.boundaryEdges } });
  }
  edits.push(...cuts);
  // Archive the old perimeter, including coalesced edges, dropped corners and
  // edge-interior split points. Never replace it with a newly generated outline.
  for (const graph of [mappedBefore, mappedAfter]) {
    for (const [id, vertex] of graph.vertices) if (!mappedBase.vertices.has(id)) mappedBase.vertices.set(id, {
      ...vertex, adjacentCells: [], adjacentEdges: [], adjacentVertices: [],
    });
    for (const [id, edge] of graph.edges) if (!mappedBase.edges.has(id) && !diagonals.has(id)) mappedBase.edges.set(id, {
      ...edge, adjacentCells: [], isBoundary: false,
    });
  }
  if ([...diagonals].some(id => mappedBase.edges.has(id))) return null;
  const retainedCells = new Map([...mappedBefore.cells, ...mappedAfter.cells]);
  const projected = projectEdits(mappedBase, edits, retainedCells, mappedAfter.edges);
  if (!projected) return null;
  const visible = applyCellExclusions(projected, grid);
  if (!matchesLegacyGraph({ ...visible, bounds: raw.bounds }, raw, true)) return null;
  // Hidden and archived nodes use the original deformation frame too. Reusing
  // the complete board's frame would move old notes when a preset is reapplied.
  const frame = preset.preset === 'square' || preset.preset === 'pyramid' ? {} : { deformationBounds: raw.bounds };
  const transformed = applyTopologyPreset({ ...projected, ...frame,
    ...(edits.length && { editBase: { ...mappedBase, ...frame } }) }, preset);
  const full = { ...transformed,
    cells: new Map([...transformed.cells].map(([id, cell]) => [id, { ...cell, ...topology.cells.get(id),
      adjacentCells: cell.adjacentCells, ...(cell.baseCenter && { baseCenter: cell.baseCenter }) }])),
    vertices: new Map([...transformed.vertices].map(([id, vertex]) => [id, { ...vertex, ...topology.vertices.get(id),
      adjacentCells: vertex.adjacentCells, adjacentEdges: vertex.adjacentEdges, adjacentVertices: vertex.adjacentVertices,
      ...(vertex.basePosition && { basePosition: vertex.basePosition }) }])),
    edges: new Map([...transformed.edges].map(([id, edge]) => [id, { ...edge, ...topology.edges.get(id),
      adjacentCells: edge.adjacentCells, isBoundary: edge.isBoundary, ...(edge.baseMidpoint && { baseMidpoint: edge.baseMidpoint }) }])),
  };
  const config = editedGrid(full, grid);
  const result = applyCellExclusions({ ...full, sourceConfig: config }, config);
  // Leave the saved visible graph (including ordering/index metadata) intact.
  return { grid: config, topology: { ...result, bounds: topology.bounds,
    cells: new Map([...topology.cells].map(([id, cell]) => [id, { ...cell, ...(full.cells.get(id)!.baseCenter && { baseCenter: full.cells.get(id)!.baseCenter }) }])),
    vertices: new Map([...topology.vertices].map(([id, vertex]) => [id, { ...vertex, ...(full.vertices.get(id)!.basePosition && { basePosition: full.vertices.get(id)!.basePosition }) }])),
    edges: new Map([...topology.edges].map(([id, edge]) => [id, { ...edge, ...(full.edges.get(id)!.baseMidpoint && { baseMidpoint: full.edges.get(id)!.baseMidpoint }) }])),
  } };
}
