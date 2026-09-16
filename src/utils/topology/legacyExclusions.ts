import { v4 as uuid } from 'uuid';
import type { GridConfig } from '../../types';
import type { GridTopology, TopologyPreset } from './types';
import { gridConfigToTopology } from './converter';
import { applyTopologyPreset } from './presets';

/**
 * One-time adapter for files whose excluded cells were never stored.
 * Accept correspondence only after confirming the exact legacy-generated graph.
 * Boundary ordering here belongs to that generator, not to arbitrary node IDs.
 */
export function prepareExclusionBase(
  topology: GridTopology, grid: GridConfig, preset: TopologyPreset, intensity: number,
): GridTopology {
  if (topology.exclusionBase) return topology;
  // Structural legacy graphs require coordinated endpoint/history migration.
  // Clearing exclusions and reusing split IDs can cut a different cell edge.
  if (grid.mergedCells?.length || grid.splitLines?.length || grid.sculptOperations?.length) return topology;
  if (![grid.voidCells, grid.disabledCells, grid.outboardCells].some(ids => ids?.length)) return topology;
  const generate = (config: GridConfig) =>
    applyTopologyPreset(gridConfigToTopology(config), { preset, intensity });
  const legacy = generate(grid);
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const knownLegacyGraph =
    legacy.cells.size === topology.cells.size && legacy.vertices.size === topology.vertices.size &&
    legacy.edges.size === topology.edges.size &&
    [...legacy.cells].every(([id, cell]) => {
      const actual = topology.cells.get(id);
      return actual && same(cell.center, actual.center) &&
        same(cell.boundaryVertices, actual.boundaryVertices) && same(cell.boundaryEdges, actual.boundaryEdges);
    }) &&
    [...legacy.vertices].every(([id, vertex]) => same(vertex.position, topology.vertices.get(id)?.position)) &&
    [...legacy.edges].every(([id, edge]) => {
      const actual = topology.edges.get(id);
      return actual && edge.startVertex === actual.startVertex && edge.endVertex === actual.endVertex;
    });
  // A custom graph with missing cells cannot be reconstructed from grid settings.
  // Retain its existing graph rather than inventing a different hidden board.
  if (!knownLegacyGraph) return topology;

  const full = generate({ ...grid, voidCells: undefined, disabledCells: undefined, outboardCells: undefined });
  const vertexIds = new Map<string, string>();
  for (const cell of topology.cells.values()) {
    const generated = full.cells.get(cell.id);
    if (!generated || generated.boundaryVertices.length !== cell.boundaryVertices.length) return topology;
    for (let corner = 0; corner < cell.boundaryVertices.length; corner++) {
      const sourceId = generated.boundaryVertices[corner], actualId = cell.boundaryVertices[corner];
      if (vertexIds.has(sourceId) && vertexIds.get(sourceId) !== actualId) return topology;
      vertexIds.set(sourceId, actualId);
    }
  }
  if (new Set(vertexIds.values()).size !== vertexIds.size) return topology;
  // Unknown hidden vertices/edges get fresh IDs; never reuse a live ID for a
  // different point merely because the generator allocated that number again.
  for (const id of full.vertices.keys()) if (!vertexIds.has(id)) vertexIds.set(id, 'vertex-' + uuid());
  const pair = (a: string, b: string) => JSON.stringify([a, b].sort());
  const oldEdges = new Map([...topology.edges.values()].map(e => [pair(e.startVertex, e.endVertex), e.id]));
  const edgeIds = new Map([...full.edges.values()].map(edge => [
    edge.id, oldEdges.get(pair(vertexIds.get(edge.startVertex)!, vertexIds.get(edge.endVertex)!)) ?? 'edge-' + uuid(),
  ]));
  const retainedEdgeIds = new Set(edgeIds.values());
  if ([...topology.edges.keys()].some(id => !retainedEdgeIds.has(id))) return topology;

  const vertices = new Map([...full.vertices].map(([id, vertex]) => {
    const mapped = vertexIds.get(id)!;
    return [mapped, {
      ...vertex, id: mapped,
      position: topology.vertices.get(mapped)?.position ?? vertex.position,
      adjacentEdges: vertex.adjacentEdges.map(edgeId => edgeIds.get(edgeId)!),
      adjacentVertices: vertex.adjacentVertices.map(vertexId => vertexIds.get(vertexId)!),
    }];
  }));
  const edges = new Map([...full.edges].map(([id, edge]) => {
    const mapped = edgeIds.get(id)!;
    const original = topology.edges.get(mapped);
    const startVertex = original?.startVertex ?? vertexIds.get(edge.startVertex)!;
    const endVertex = original?.endVertex ?? vertexIds.get(edge.endVertex)!;
    const a = vertices.get(startVertex)!.position, b = vertices.get(endVertex)!.position;
    return [mapped, { ...edge, id: mapped, startVertex, endVertex,
      midpoint: topology.edges.get(mapped)?.midpoint ?? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }];
  }));
  const cells = new Map([...full.cells].map(([id, cell]) => [id, {
    ...cell, center: topology.cells.get(id)?.center ?? cell.center,
    boundaryVertices: cell.boundaryVertices.map(vertexId => vertexIds.get(vertexId)!),
    boundaryEdges: cell.boundaryEdges.map(edgeId => edgeIds.get(edgeId)!),
  }]));
  const positions = [...vertices.values()].map(vertex => vertex.position);
  // Surviving positions take precedence over a preset regenerated with different
  // bounds. Include both extents so restored legacy points cannot be clipped.
  const bounds = { ...full.bounds };
  for (const position of positions) {
    bounds.minX = Math.min(bounds.minX, position.x);
    bounds.minY = Math.min(bounds.minY, position.y);
    bounds.maxX = Math.max(bounds.maxX, position.x);
    bounds.maxY = Math.max(bounds.maxY, position.y);
  }
  bounds.width = Math.max(full.bounds.width, bounds.maxX + grid.outerPadding);
  bounds.height = Math.max(full.bounds.height, bounds.maxY + grid.outerPadding);
  return { ...topology, exclusionBase: { ...full, cells, vertices, edges, bounds } };
}
