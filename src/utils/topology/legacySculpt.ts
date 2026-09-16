import type { GridConfig } from '../../types';
import type { GridTopology, TopologyCell, TopologyEdge } from './types';
import { createSculptEdit, type SculptEdit } from './retainedSculpt';
import { projectEdits, retainedEdits, type TopologyEdit } from './retainedEdits';
import { prepareLegacyMerges } from './legacyMerges';
import { prepareLegacySplits } from './legacySplits';
import { prepareLegacyEditedExclusions } from './legacyEditedExclusions';

const pair = (a: string, b: string) => JSON.stringify([a, b].sort());
// These spellings belong only to the pre-snapshot sculpt writer. They are not
// lookup rules for arbitrary IDs or the allocator used by new editing actions.
const oldEdgeId = (a: string, b: string) => a < b ? `${a}-${b}` : `${b}-${a}`;

/** Reproduce the old writer's record shape for exact migration verification.
 * In particular it left boundaryEdges and vertex incidences stale. This graph
 * must NEVER be used as the live graph; only the repaired projection is usable. */
function legacyStep(before: GridTopology, after: GridTopology, edit: SculptEdit): GridTopology | null {
  const cells = new Map(before.cells);
  if (edit.mode === 'rotate') {
    for (const id of edit.inputCells) {
      const cell = after.cells.get(id)!;
      cells.set(id, { ...before.cells.get(id)!, center: cell.center, boundaryVertices: cell.boundaryVertices });
    }
  } else {
    const legacyCell = (id: string): TopologyCell => {
      const c = after.cells.get(id)!;
      return { id, boundaryVertices: c.boundaryVertices, boundaryEdges: [], center: c.center, adjacentCells: [] };
    };
    cells.set(edit.cellIds[0], legacyCell(edit.cellIds[0]));
    edit.inputCells.forEach((id, i) => { cells.delete(id); cells.set(edit.cellIds[i + 1], legacyCell(edit.cellIds[i + 1])); });
  }
  const old = new Map([...before.edges.values()].map(e => [pair(e.startVertex, e.endVertex), e.id]));
  const edges = new Map<string, TopologyEdge>(), pairs = new Map<string, string>();
  for (const cell of cells.values()) for (let i = 0; i < cell.boundaryVertices.length; i++) {
    const a = cell.boundaryVertices[i], b = cell.boundaryVertices[(i + 1) % cell.boundaryVertices.length];
    const key = pair(a, b), id = (edit.mode === 'rotate' && old.get(key)) || oldEdgeId(a, b);
    if (pairs.has(id) && pairs.get(id) !== key) return null;
    pairs.set(id, key);
    const edge = edges.get(id);
    if (edge) { if (!edge.adjacentCells.includes(cell.id)) edge.adjacentCells.push(cell.id); }
    else {
      const p = after.vertices.get(a)!.position, q = after.vertices.get(b)!.position;
      edges.set(id, { id, startVertex: a, endVertex: b, midpoint: { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }, adjacentCells: [cell.id], isBoundary: true });
    }
  }
  for (const edge of edges.values()) edge.isBoundary = edge.adjacentCells.length === 1;
  if (edit.mode === 'cut') for (const [id, cell] of cells) cells.set(id, { ...cell, adjacentCells: [...new Set(cell.boundaryVertices.flatMap((a, i) => edges.get(oldEdgeId(a, cell.boundaryVertices[(i + 1) % cell.boundaryVertices.length]))!.adjacentCells.filter(other => other !== id)))] });
  const incidence = new Map<string, Set<string>>();
  for (const cell of cells.values()) for (const id of cell.boundaryVertices) {
    if (!incidence.has(id)) incidence.set(id, new Set());
    incidence.get(id)!.add(cell.id);
  }
  const vertices = new Map([...after.vertices].map(([id, v]) => [id, { ...before.vertices.get(id)!, position: v.position, adjacentCells: [...(incidence.get(id) ?? [])] }]));
  return { ...before, cells, edges, vertices, bounds: after.bounds };
}

/** Migrate explicit legacy sculpt settings; keep final saved identities while
 * assigning distinct identities to retired history nodes. No ID parsing is
 * performed by the retained editor, which receives explicit operation records. */
export function replayLegacySculpt(input: GridTopology, grid: GridConfig): { topology: GridTopology; legacy: GridTopology } | null {
  const clean = { ...grid, sculptOperations: undefined };
  const migrated = prepareLegacyEditedExclusions(input, clean);
  let prepared = migrated?.topology ?? prepareLegacySplits(input, clean);
  if (!prepared.editBase) prepared = prepareLegacyMerges(prepared, clean);
  const { base, operations: existing } = retainedEdits(prepared);
  const source = { ...base, sourceConfig: { ...(base.sourceConfig ?? clean), sculptOperations: undefined } };
  const operations: TopologyEdit[] = [...existing];
  let current = prepared, legacy = input;
  for (const op of grid.sculptOperations ?? []) {
    const edit = createSculptEdit(current, op.vertexId, op.type);
    if (!edit) return null;
    if (edit.mode === 'cut') {
      edit.cellIds = [`cell-triangle-${edit.vertexId}`, ...edit.inputCells.map(id => `cell-trapezoid-${id.replace('cell-', '')}`)];
    }
    operations.push(edit);
    const next = projectEdits(source, operations);
    if (!next) return null;
    const old = legacyStep(legacy, next, edit);
    if (!old) return null;
    legacy = old; current = next;
  }
  const aliases = new Map([...legacy.edges.values()].map(e => [pair(e.startVertex, e.endVertex), e.id]));
  if (aliases.size !== legacy.edges.size) return null;
  const ids = new Map([...current.edges].map(([id, e]) => [id, aliases.get(pair(e.startVertex, e.endVertex))!]));
  if ([...ids.values()].some(id => !id) || new Set(ids.values()).size !== ids.size) return null;
  const edgeId = (id: string) => ids.get(id) ?? id;
  // Historical allocations not in the final graph also participate in checks.
  const allocated = [...source.edges.keys(), ...operations.flatMap(op => op.kind === 'sculpt' ? op.edges.map(e => e.id) : op.kind === 'split' ? [op.edgeId] : [])];
  if (new Set(allocated.map(edgeId)).size !== allocated.length) return null;
  const remapped: GridTopology = { ...source,
    cells: new Map([...source.cells].map(([id, c]) => [id, { ...c, boundaryEdges: c.boundaryEdges.map(edgeId) }])),
    vertices: new Map([...source.vertices].map(([id, v]) => [id, { ...v, adjacentEdges: v.adjacentEdges.map(edgeId) }])),
    edges: new Map([...source.edges].map(([id, e]) => [edgeId(id), { ...e, id: edgeId(id) }])),
  };
  const boundary = (b: Extract<TopologyEdit, { kind: 'merge' }>['boundary']) => b && { ...b, edges: b.edges.map(edgeId), ...(b.sourceWalk && { sourceWalk: { ...b.sourceWalk, edges: b.sourceWalk.edges.map(edgeId) } }) };
  const edits = operations.map(op => op.kind === 'sculpt' ? { ...op, edges: op.edges.map(e => ({ ...e, id: edgeId(e.id) })) }
    : op.kind === 'split' ? { ...op, edgeId: edgeId(op.edgeId), ...(op.boundary && { boundary: boundary(op.boundary) }) }
    : { ...op, ...(op.boundary && { boundary: boundary(op.boundary) }) });
  const topology = projectEdits(remapped, edits);
  // Fix incidences and add provenance, but do not silently change saved roles
  // or geometry when another old structural feature cannot be reconstructed.
  if (!topology || topology.cells.size !== legacy.cells.size || topology.vertices.size !== legacy.vertices.size
    || [...legacy.cells].some(([id, cell]) => {
      const actual = topology.cells.get(id);
      return !actual || !!actual.outboard !== !!cell.outboard
        || JSON.stringify(actual.boundaryVertices) !== JSON.stringify(cell.boundaryVertices)
        || actual.center.x !== cell.center.x || actual.center.y !== cell.center.y;
    })) return null;
  return topology ? { topology: { ...topology, sourceConfig: grid }, legacy } : null;
}
