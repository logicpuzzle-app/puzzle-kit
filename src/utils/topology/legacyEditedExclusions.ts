import { v4 as uuid } from 'uuid';
import type { GridConfig, Point, SplitPoint } from '../../types';
import type { GridTopology } from './types';
import { gridConfigToTopology } from './converter';
import { matchesLegacyGraph } from './legacyGraph';
import { prepareLegacyMerges } from './legacyMerges';
import { prepareLegacySplits } from './legacySplits';
import { applyTopologyPreset } from './presets';
import { applyCellExclusions } from './exclusions';
import { editedGrid, projectEdits, retainedEdits, type TopologyEdit } from './retainedEdits';

const position = (point: Point) => JSON.stringify([point.x, point.y]);
const pair = (a: string, b: string) => JSON.stringify([a, b].sort());

/** Old splits refer to the graph *after exclusions*, whose allocation differs
 * from the complete graph. Resolve those references before generating the full
 * board. This correspondence is only used inside the verified legacy format. */
function completeConfig(grid: GridConfig): GridConfig | null {
  const full = { ...grid, voidCells: undefined, disabledCells: undefined, outboardCells: undefined };
  if (!grid.splitLines?.length) return full;
  const before = gridConfigToTopology({ ...grid, splitLines: undefined });
  const after = gridConfigToTopology({ ...full, splitLines: undefined });
  const cuts: NonNullable<GridConfig['splitLines']> = [];
  for (const cut of grid.splitLines) {
    const oldCell = before.cells.get(cut.cellId), cell = after.cells.get(cut.cellId);
    if (!oldCell || !cell) return null;
    const remap = (point: SplitPoint): SplitPoint | null => {
      if (point.type === 'vertex') {
        if (!oldCell.boundaryVertices.includes(point.vertexId)) return null;
        const origin = before.vertices.get(point.vertexId);
        const candidates = cell.boundaryVertices.filter(id => position(after.vertices.get(id)!.position) === position(origin!.position));
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
  return { ...full, splitLines: cuts };
}

/** Reconstruct hidden source cells and structural history together. Neither the
 * saved graph nor annotations are reassigned. If revealing a cell would require
 * changing an existing boundary, this adapter cannot prove that correspondence. */
export function prepareLegacyEditedExclusions(topology: GridTopology, grid: GridConfig): GridTopology {
  if (topology.editBase || topology.mergeBase || topology.exclusionBase || grid.sculptOperations?.length
      || !(grid.mergedCells?.length || grid.splitLines?.length)
      || ![grid.voidCells, grid.disabledCells, grid.outboardCells].some(ids => ids?.length)) return topology;
  const preset = topology.appliedPreset ?? { preset: 'square' as const, intensity: 0.5 };
  const raw = gridConfigToTopology(grid), expected = applyTopologyPreset(raw, preset);
  if (!matchesLegacyGraph(topology, expected)) return topology;
  const fullGrid = completeConfig(grid);
  if (!fullGrid) return topology;
  const complete = gridConfigToTopology(fullGrid);
  const prepared = grid.splitLines?.length ? prepareLegacySplits(complete, fullGrid) : prepareLegacyMerges(complete, fullGrid);
  if (!prepared.editBase && !prepared.mergeBase) return topology;
  const { base, operations } = retainedEdits(prepared);
  const vertices = new Map([...base.vertices, ...prepared.vertices]);
  const edges = new Map([...base.edges, ...prepared.edges]);
  const liveAt = new Map([...raw.vertices.values()].map(vertex => [position(vertex.position), vertex.id]));
  if (liveAt.size !== raw.vertices.size || new Set([...vertices.values()].map(v => position(v.position))).size !== vertices.size) return topology;
  const reserved = new Set([...topology.vertices.keys(), ...topology.edges.keys()]);
  const fresh = () => { let id: string; do { id = uuid(); } while (reserved.has(id)); reserved.add(id); return id; };
  const vertexIds = new Map([...vertices].map(([id, vertex]) => [id, liveAt.get(position(vertex.position)) ?? fresh()]));
  const liveEdges = new Map([...raw.edges.values()].map(edge => [pair(edge.startVertex, edge.endVertex), edge]));
  if (liveEdges.size !== raw.edges.size) return topology;
  const edgeIds = new Map([...edges].map(([id, edge]) => [id, liveEdges.get(pair(vertexIds.get(edge.startVertex)!, vertexIds.get(edge.endVertex)!))?.id ?? fresh()]));
  if (new Set(edgeIds.values()).size !== edgeIds.size) return topology;
  const mapGraph = (graph: GridTopology): GridTopology => ({
    ...graph, sourceConfig: fullGrid,
    cells: new Map([...graph.cells].map(([id, cell]) => [id, { ...cell,
      boundaryVertices: cell.boundaryVertices.map(v => vertexIds.get(v)!), boundaryEdges: cell.boundaryEdges.map(e => edgeIds.get(e)!),
    }])),
    vertices: new Map([...graph.vertices].map(([id, vertex]) => { const mapped = vertexIds.get(id)!; return [mapped, { ...vertex, id: mapped,
      adjacentEdges: vertex.adjacentEdges.map(e => edgeIds.get(e)!), adjacentVertices: vertex.adjacentVertices.map(v => vertexIds.get(v)!),
    }]; })),
    edges: new Map([...graph.edges].map(([id, edge]) => { const mapped = edgeIds.get(id)!, live = raw.edges.get(mapped); return [mapped, { ...edge, id: mapped,
      startVertex: live?.startVertex ?? vertexIds.get(edge.startVertex)!, endVertex: live?.endVertex ?? vertexIds.get(edge.endVertex)!,
    }]; })),
  });
  const mappedBase = mapGraph(base), mapped = mapGraph(prepared);
  const edits: TopologyEdit[] = operations.map(operation => {
    const boundary = operation.boundary && { vertices: operation.boundary.vertices.map(id => vertexIds.get(id)!), edges: operation.boundary.edges.map(id => edgeIds.get(id)!) };
    if (operation.kind === 'merge') return { ...operation, boundary };
    const edgeId = edgeIds.get(operation.edgeId)!, endVertex = vertexIds.get(operation.endVertex)!;
    return { ...operation, boundary, startVertex: vertexIds.get(operation.startVertex)!, endVertex, edgeId,
      reverseEdge: mapped.edges.get(edgeId)!.startVertex === endVertex };
  });
  const projected = projectEdits(mappedBase, edits, mapped.cells, mapped.edges);
  if (!projected) return topology;
  const visible = applyCellExclusions(projected, grid);
  // Bounds expand to include restored hidden cells, but every visible entity
  // and incidence must still match the actual old generator before adoption.
  if (!matchesLegacyGraph({ ...visible, bounds: raw.bounds }, raw, true)) return topology;
  // Hidden and archived nodes use the original deformation frame too. Reusing
  // the complete board's frame would move old notes when a preset is reapplied.
  const frame = preset.preset === 'square' || preset.preset === 'pyramid' ? {} : { deformationBounds: raw.bounds };
  const transformed = applyTopologyPreset({ ...projected, ...frame,
    editBase: { ...mappedBase, ...frame } }, preset);
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
  return { ...result, bounds: topology.bounds,
    cells: new Map([...topology.cells].map(([id, cell]) => [id, { ...cell, ...(full.cells.get(id)!.baseCenter && { baseCenter: full.cells.get(id)!.baseCenter }) }])),
    vertices: new Map([...topology.vertices].map(([id, vertex]) => [id, { ...vertex, ...(full.vertices.get(id)!.basePosition && { basePosition: full.vertices.get(id)!.basePosition }) }])),
    edges: new Map([...topology.edges].map(([id, edge]) => [id, { ...edge, ...(full.edges.get(id)!.baseMidpoint && { baseMidpoint: full.edges.get(id)!.baseMidpoint }) }])),
  };
}
