import { v4 as uuid } from 'uuid';
import type { GridConfig, Point } from '../../types';
import type { GridTopology, TopologyCell, TopologyEdge, TopologyVertex } from './types';
import { gridConfigToTopology } from './converter';
import { legacySplitOperations } from './legacySplitOperations';
import { applyTopologyPreset } from './presets';
import { prepareLegacyMerges } from './legacyMerges';
import { matchesLegacyGraph } from './legacyGraph';
import { editedGrid, projectEdits, type TopologyEdit } from './retainedEdits';

const positionKey = (point: Point) => JSON.stringify([point.x, point.y]);
const pair = (a: string, b: string) => JSON.stringify([a, b].sort());

/** Adapter for the verified GridConfig mergeSplit generator. This is the only
 * place that reconstructs an old source. Matching is against the whole graph,
 * never an ID suffix, and all live entity IDs and annotation targets survive. */
export function prepareLegacySplits(topology: GridTopology, grid: GridConfig): GridTopology {
  if (topology.editBase || topology.mergeBase || topology.exclusionBase || !grid.splitLines?.length || grid.sculptOperations?.length) return topology;
  if ([grid.voidCells, grid.disabledCells, grid.outboardCells].some(ids => ids?.length)) return topology;
  if (new Set(grid.splitLines.map(split => split.cellId)).size !== grid.splitLines.length) return topology;
  const preset = topology.appliedPreset ?? { preset: 'square' as const, intensity: 0.5 };
  const generated = gridConfigToTopology(grid), expected = applyTopologyPreset(generated, preset);
  if (!matchesLegacyGraph(topology, expected)) return topology;
  const beforeGrid = { ...grid, splitLines: undefined };
  const before = gridConfigToTopology(beforeGrid);
  const prepared = prepareLegacyMerges(applyTopologyPreset(before, preset), beforeGrid);
  if (grid.mergedCells?.length && !prepared.mergeBase) return topology;
  const source = prepared.mergeBase ?? prepared;
  const reserved = new Set([...topology.vertices.keys(), ...topology.edges.keys()]);
  const fresh = () => { let id: string; do { id = uuid(); } while (reserved.has(id)); reserved.add(id); return id; };
  const liveAt = new Map([...generated.vertices.values()].map(v => [positionKey(v.position), v.id]));
  if (liveAt.size !== generated.vertices.size) return topology;
  const vertexIds = new Map([...source.vertices].map(([id, vertex]) => [id, liveAt.get(positionKey(vertex.basePosition ?? vertex.position)) ?? fresh()]));
  if (new Set(vertexIds.values()).size !== vertexIds.size) return topology;
  const liveEdges = new Map([...topology.edges.values()].map(edge => [pair(edge.startVertex, edge.endVertex), edge]));
  if (liveEdges.size !== topology.edges.size) return topology;
  const edgeIds = new Map([...source.edges].map(([id, edge]) => [id,
    liveEdges.get(pair(vertexIds.get(edge.startVertex)!, vertexIds.get(edge.endVertex)!))?.id ?? fresh()]));
  if (new Set(edgeIds.values()).size !== edgeIds.size) return topology;
  const vertices = new Map<string, TopologyVertex>();
  for (const [oldId, vertex] of source.vertices) {
    const id = vertexIds.get(oldId)!, live = topology.vertices.get(id);
    vertices.set(id, { ...vertex, ...live, id,
      ...(vertex.basePosition && { basePosition: vertex.basePosition }),
      adjacentCells: vertex.adjacentCells,
      adjacentEdges: vertex.adjacentEdges.map(e => edgeIds.get(e)!),
      adjacentVertices: vertex.adjacentVertices.map(v => vertexIds.get(v)!),
    });
  }
  const edges = new Map<string, TopologyEdge>();
  for (const [oldId, edge] of source.edges) {
    const id = edgeIds.get(oldId)!, live = topology.edges.get(id);
    edges.set(id, { ...edge, ...live, id,
      startVertex: live?.startVertex ?? vertexIds.get(edge.startVertex)!, endVertex: live?.endVertex ?? vertexIds.get(edge.endVertex)!,
      ...(edge.baseMidpoint && { baseMidpoint: edge.baseMidpoint }), adjacentCells: edge.adjacentCells,
    });
  }
  const cells = new Map<string, TopologyCell>();
  for (const [id, cell] of source.cells) cells.set(id, { ...cell,
    boundaryVertices: cell.boundaryVertices.map(v => vertexIds.get(v)!), boundaryEdges: cell.boundaryEdges.map(e => edgeIds.get(e)!),
  });
  const operations: TopologyEdit[] = (prepared.mergeGroups ?? []).map(group => ({ ...group, kind: 'merge',
    ...(group.boundary && { boundary: { ...group.boundary, vertices: group.boundary.vertices.map(id => vertexIds.get(id)!), edges: group.boundary.edges.map(id => edgeIds.get(id)!) } }),
  }));
  const cuts = legacySplitOperations(before, grid, topology);
  if (!cuts) return topology;
  const diagonals = new Set(cuts.map(cut => cut.edgeId));
  if ([...edges.keys()].some(id => diagonals.has(id))) return topology;
  // Edge-interior points and refined side segments belong to the source
  // archive, but are materialized only while their split operation is alive.
  for (const [id, vertex] of expected.vertices) if (!vertices.has(id)) vertices.set(id, {
    ...vertex, adjacentCells: [], adjacentEdges: [], adjacentVertices: [],
  });
  for (const [id, edge] of expected.edges) if (!edges.has(id) && !diagonals.has(id)) edges.set(id, { ...edge, adjacentCells: [], isBoundary: false });
  const base: GridTopology = { ...source, cells, vertices, edges };
  const projected = projectEdits(base, [...operations, ...cuts], expected.cells, expected.edges);
  if (!projected || !matchesLegacyGraph(projected, expected, true)) return topology;
  // Keep the exact saved graph. Only validated restoration metadata is added.
  const migrated = { ...topology, editBase: base, editOperations: projected.editOperations,
    cells: new Map([...topology.cells].map(([id, cell]) => [id, { ...cell, ...(expected.cells.get(id)!.baseCenter && { baseCenter: expected.cells.get(id)!.baseCenter }) }])),
    vertices: new Map([...topology.vertices].map(([id, vertex]) => [id, { ...vertex, ...(expected.vertices.get(id)!.basePosition && { basePosition: expected.vertices.get(id)!.basePosition }) }])),
    edges: new Map([...topology.edges].map(([id, edge]) => [id, { ...edge, ...(expected.edges.get(id)!.baseMidpoint && { baseMidpoint: expected.edges.get(id)!.baseMidpoint }) }])),
    ...(expected.deformationBounds && { deformationBounds: expected.deformationBounds }),
  };
  return { ...migrated, sourceConfig: editedGrid(migrated, grid) };
}
