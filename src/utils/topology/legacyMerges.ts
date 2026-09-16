import { matchesLegacyGraph } from './legacyGraph';
import { v4 as uuid } from 'uuid';
import type { GridConfig, Point } from '../../types';
import type { GridTopology, TopologyCell, TopologyEdge, TopologyVertex } from './types';
import { gridConfigToTopology } from './converter';
import { applyTopologyPreset } from './presets';
import { projectMerges, type MergeGroup } from './retainedMerge';

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const pair = (a: string, b: string) => JSON.stringify([a, b].sort());
const positionKey = (p: Point) => JSON.stringify([p.x, p.y]);

/** Explicit adapter for the legacy GridConfig -> mergeSplit generator. It first
 * proves that every live ID, coordinate and incidence matches that generator.
 * Coordinate correspondence is used only inside this verified format boundary;
 * an arbitrary native graph or a missing reference is never reinterpreted.
 */
export function prepareLegacyMerges(topology: GridTopology, grid: GridConfig): GridTopology {
  const full = topology.exclusionBase ?? topology;
  if (topology.exclusionBase || full.mergeBase || !grid.mergedCells?.length || grid.splitLines?.length || grid.sculptOperations?.length) return topology;
  // Excluded source cells absent from old snapshots need their own migration.
  if ([grid.voidCells, grid.disabledCells, grid.outboardCells].some(ids => ids?.length)) return topology;
  const preset = topology.appliedPreset ?? { preset: 'square' as const, intensity: 0.5 };
  const generated = gridConfigToTopology(grid);
  const expected = applyTopologyPreset(generated, preset);
  if (!matchesLegacyGraph(full, expected)) return topology;

  const sourceGrid = { ...grid, mergedCells: undefined };
  const rawSource = gridConfigToTopology(sourceGrid);
  const transformedSource = applyTopologyPreset(rawSource, preset);
  const reserved = new Set([...full.vertices.keys(), ...full.edges.keys()]);
  const fresh = () => { let id: string; do { id = uuid(); } while (reserved.has(id)); reserved.add(id); return id; };
  const legacyVertices = new Map<string, string>();
  for (const vertex of generated.vertices.values()) {
    const key = positionKey(vertex.position);
    if (legacyVertices.has(key)) return topology; // correspondence must be unique
    legacyVertices.set(key, vertex.id);
  }
  const vertexIds = new Map([...rawSource.vertices].map(([id, vertex]) => [id, legacyVertices.get(positionKey(vertex.position)) ?? fresh()]));
  const retainedVertexIds = new Set(vertexIds.values());
  if ([...full.vertices.keys()].some(id => !retainedVertexIds.has(id))) return topology;
  const liveEdges = new Map([...full.edges.values()].map(edge => [pair(edge.startVertex, edge.endVertex), edge]));
  if (liveEdges.size !== full.edges.size) return topology;
  const edgeIds = new Map([...rawSource.edges].map(([id, edge]) => [id, liveEdges.get(pair(vertexIds.get(edge.startVertex)!, vertexIds.get(edge.endVertex)!))?.id ?? fresh()]));
  const vertices = new Map<string, TopologyVertex>();
  for (const [oldId, vertex] of transformedSource.vertices) {
    const id = vertexIds.get(oldId)!;
    const live = full.vertices.get(id);
    vertices.set(id, { ...vertex, ...live, id,
      ...(vertex.basePosition && { basePosition: vertex.basePosition }),
      adjacentCells: vertex.adjacentCells,
      adjacentEdges: vertex.adjacentEdges.map(edgeId => edgeIds.get(edgeId)!),
      adjacentVertices: vertex.adjacentVertices.map(vertexId => vertexIds.get(vertexId)!),
    });
  }
  const edges = new Map<string, TopologyEdge>();
  for (const [oldId, edge] of transformedSource.edges) {
    const id = edgeIds.get(oldId)!, live = full.edges.get(id);
    edges.set(id, { ...edge, ...live, id,
      startVertex: live?.startVertex ?? vertexIds.get(edge.startVertex)!, endVertex: live?.endVertex ?? vertexIds.get(edge.endVertex)!,
      ...(edge.baseMidpoint && { baseMidpoint: edge.baseMidpoint }), adjacentCells: edge.adjacentCells,
    });
  }
  // Legacy merges coalesced collinear edges. Retain those live long edges as
  // archived boundary primitives, without pretending they bound a source cell.
  for (const [id, edge] of full.edges) if (!edges.has(id)) edges.set(id, {
    ...edge, ...(expected.edges.get(id)!.baseMidpoint && { baseMidpoint: expected.edges.get(id)!.baseMidpoint }), adjacentCells: [], isBoundary: false,
  });
  const cells = new Map<string, TopologyCell>();
  for (const [id, cell] of transformedSource.cells) cells.set(id, { ...cell, ...full.cells.get(id),
    ...(cell.baseCenter && { baseCenter: cell.baseCenter }),
    adjacentCells: cell.adjacentCells,
    boundaryVertices: cell.boundaryVertices.map(vertexId => vertexIds.get(vertexId)!),
    boundaryEdges: cell.boundaryEdges.map(edgeId => edgeIds.get(edgeId)!),
  });
  const base: GridTopology = { ...transformedSource, vertices, edges, cells };
  const groups: MergeGroup[] = [];
  for (const members of grid.mergedCells) {
    const matches = [...full.cells.values()].filter(cell => cell.originalCells?.length === members.length && members.every(id => cell.originalCells!.includes(id)));
    if (matches.length !== 1) return topology;
    const cell = matches[0];
    groups.push({ id: cell.id, cellIds: members, boundary: { vertices: cell.boundaryVertices, edges: cell.boundaryEdges } });
  }
  const projected = projectMerges(base, groups, full.cells);
  if (!projected || projected.cells.size !== full.cells.size || projected.vertices.size !== full.vertices.size || projected.edges.size !== full.edges.size) return topology;
  for (const [id, cell] of full.cells) {
    const other = projected.cells.get(id);
    if (!other || !same(cell.boundaryVertices, other.boundaryVertices) || !same(cell.boundaryEdges, other.boundaryEdges)) return topology;
  }
  // Attaching source metadata does not replace any live entity or annotation.
  return { ...full,
    cells: new Map([...full.cells].map(([id, cell]) => [id, { ...cell, ...(expected.cells.get(id)!.baseCenter && { baseCenter: expected.cells.get(id)!.baseCenter }) }])),
    vertices: new Map([...full.vertices].map(([id, vertex]) => [id, { ...vertex, ...(expected.vertices.get(id)!.basePosition && { basePosition: expected.vertices.get(id)!.basePosition }) }])),
    edges: new Map([...full.edges].map(([id, edge]) => [id, { ...edge, ...(expected.edges.get(id)!.baseMidpoint && { baseMidpoint: expected.edges.get(id)!.baseMidpoint }) }])),
    ...(expected.deformationBounds && { deformationBounds: expected.deformationBounds }),
    mergeBase: base, mergeGroups: groups,
  };
}
