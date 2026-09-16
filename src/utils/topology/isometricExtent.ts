import { v4 as uuid } from 'uuid';
import type { GridConfig, Point } from '../../types';
import type { GridTopology, TopologyCell, TopologyVertex, TopologyEdge } from './types';
import { isometricGridToTopology } from './special/isometric';
import { applyCellExclusions } from './exclusions';
import { visibleIsometricFaces } from './isometricFaces';

const setKey = (ids: string[]) => JSON.stringify([...ids].sort());
const pointKey = (p: Point) => JSON.stringify([Math.round(p.x * 1e6), Math.round(p.y * 1e6)]);
const clean = (grid: GridConfig): GridConfig => ({ ...grid, voidCells: undefined, disabledCells: undefined, outboardCells: undefined });

/** Recognize a complete regular embedding, independent of every ID spelling.
 * Geometry is only an adapter for this declared generator/configuration. An
 * ambiguous or edited graph must not be replaced by a generated approximation.
 */
function bindRegularGraph(actual: GridTopology, expected: GridTopology) {
  if (actual.cells.size !== expected.cells.size || actual.vertices.size !== expected.vertices.size || actual.edges.size !== expected.edges.size) return null;
  const at = new Map([...actual.vertices.values()].map(v => [pointKey(v.position), v]));
  if (at.size !== actual.vertices.size) return null;
  const vertices = new Map<string, TopologyVertex>();
  for (const v of expected.vertices.values()) {
    const found = at.get(pointKey(v.position)); if (!found) return null;
    vertices.set(v.id, found);
  }
  if (new Set([...vertices.values()].map(v => v.id)).size !== actual.vertices.size) return null;
  const shapes = new Map([...actual.cells.values()].map(c => [setKey(c.boundaryVertices), c]));
  const cells = new Map<string, TopologyCell>();
  if (shapes.size !== actual.cells.size) return null;
  for (const cell of expected.cells.values()) {
    const boundary = cell.boundaryVertices.map(id => vertices.get(id)!.id);
    const found = shapes.get(setKey(boundary));
    if (!found || pointKey(found.center) !== pointKey(cell.center) || (found.isometricFace !== undefined && found.isometricFace !== cell.isometricFace)) return null;
    const pairs = new Set(boundary.map((id, i) => setKey([id, boundary[(i + 1) % boundary.length]])));
    if (found.boundaryVertices.some((id, i) => !pairs.has(setKey([id, found.boundaryVertices[(i + 1) % boundary.length]])))) return null;
    cells.set(cell.id, found);
  }
  const byPair = new Map([...actual.edges.values()].map(e => [setKey([e.startVertex, e.endVertex]), e]));
  if (byPair.size !== actual.edges.size) return null;
  const edges = new Map<string, TopologyEdge>();
  for (const edge of expected.edges.values()) {
    const found = byPair.get(setKey([vertices.get(edge.startVertex)!.id, vertices.get(edge.endVertex)!.id]));
    if (!found || pointKey(found.midpoint) !== pointKey(edge.midpoint) || found.isBoundary !== edge.isBoundary
      || setKey(found.adjacentCells) !== setKey(edge.adjacentCells.map(id => cells.get(id)!.id))) return null;
    edges.set(edge.id, found);
  }
  for (const cell of expected.cells.values()) {
    const found = cells.get(cell.id)!;
    if (setKey(found.boundaryEdges) !== setKey(cell.boundaryEdges.map(id => edges.get(id)!.id))
      || setKey(found.adjacentCells) !== setKey(cell.adjacentCells.map(id => cells.get(id)!.id))) return null;
  }
  for (const vertex of expected.vertices.values()) {
    const found = vertices.get(vertex.id)!;
    if (setKey(found.adjacentCells) !== setKey(vertex.adjacentCells.map(id => cells.get(id)!.id))
      || setKey(found.adjacentEdges) !== setKey(vertex.adjacentEdges.map(id => edges.get(id)!.id))
      || setKey(found.adjacentVertices) !== setKey(vertex.adjacentVertices.map(id => vertices.get(id)!.id))) return null;
  }
  return { cells, vertices, edges };
}

/** Cells keep their face/local-index identity. Vertices survive only a one-to-one
 * correspondence through surviving cell corners. A seam can split or fuse as a
 * face moves: that retires the ambiguous vertex instead of attaching its note to
 * an arbitrary face. Edges survive when the same two surviving vertices bound it.
 */
export function resizeIsometricExtent(topology: GridTopology, before: GridConfig, after: GridConfig): GridTopology | null {
  if (before.gridType !== 'iso' || after.gridType !== 'iso'
    || [before, after].some(g => g.mergedCells?.length || g.splitLines?.length || g.sculptOperations?.length
      || ![g.rows, g.cols, g.level ?? 1].every(n => Number.isInteger(n) && n > 0)
      || !['exterior', 'interior'].includes(g.isometricView ?? 'exterior')
      || g.isometricFaces?.some(face => !['top', 'bottom', 'left', 'right'].includes(face))
      || !Number.isFinite(g.cellSize) || g.cellSize <= 0 || !Number.isFinite(g.outerPadding))) return null;
  const full = topology.exclusionBase ?? topology;
  if (full.editBase || full.mergeBase) return null;
  const oldConfig = clean({ ...before, isometricFaces: full.sourceConfig?.isometricFaces ?? before.isometricFaces });
  const oldFaces = visibleIsometricFaces(oldConfig), visibleFaces = visibleIsometricFaces(after);
  const viewChanged = (before.isometricView ?? 'exterior') !== (after.isometricView ?? 'exterior');
  // The UI has one horizontal face. A custom two-horizontal-face board cannot
  // map both identities to the single floor of an interior view.
  if (viewChanged && ((oldFaces.has('top') && oldFaces.has('bottom')) || (visibleFaces.has('top') && visibleFaces.has('bottom')))) return null;
  const archivedFaces = [...oldFaces].map(face => viewChanged && (face === 'top' || face === 'bottom')
    ? (after.isometricView === 'interior' ? 'bottom' as const : 'top' as const) : face);
  const nextConfig = clean({ ...after, isometricFaces: [...new Set([...archivedFaces, ...visibleFaces])] });
  const cellSlot = (cell: TopologyCell) => JSON.stringify([
    viewChanged && (cell.isometricFace === 'top' || cell.isometricFace === 'bottom') ? 'horizontal' : cell.isometricFace, cell.index,
  ]);
  const oldTemplate = isometricGridToTopology(oldConfig), next = isometricGridToTopology(nextConfig);
  if (!oldTemplate.cells.size || !next.cells.size) return null;
  const bound = bindRegularGraph(full, oldTemplate); if (!bound) return null;
  const reserved = new Set([...full.cells.keys(), ...full.vertices.keys(), ...full.edges.keys()]);
  const fresh = () => { let id: string; do { id = uuid(); } while (reserved.has(id)); reserved.add(id); return id; };
  const oldSlots = new Map([...oldTemplate.cells.values()].map(c => [cellSlot(c), c]));
  const cellIds = new Map<string, string>(), survivors = new Map<string, TopologyCell>();
  const oldCandidates = new Map<string, Set<string>>(), newCandidates = new Map<string, Set<string>>();
  for (const cell of next.cells.values()) {
    const old = oldSlots.get(cellSlot(cell)), live = old && bound.cells.get(old.id);
    cellIds.set(cell.id, live?.id ?? fresh());
    if (!old || !live) continue;
    survivors.set(cell.id, live);
    cell.boundaryVertices.forEach((id, i) => {
      const from = bound.vertices.get(old.boundaryVertices[i])!.id;
      if (!oldCandidates.has(from)) oldCandidates.set(from, new Set());
      if (!newCandidates.has(id)) newCandidates.set(id, new Set());
      oldCandidates.get(from)!.add(id); newCandidates.get(id)!.add(from);
    });
  }
  const vertexIds = new Map<string, string>();
  for (const vertex of next.vertices.values()) {
    const candidates = newCandidates.get(vertex.id), old = candidates?.size === 1 ? [...candidates][0] : undefined;
    vertexIds.set(vertex.id, old && oldCandidates.get(old)?.size === 1 ? old : fresh());
  }
  const oldEdges = new Map([...full.edges.values()].map(e => [setKey([e.startVertex, e.endVertex]), e]));
  const edgeIds = new Map([...next.edges.values()].map(e => [e.id, oldEdges.get(setKey([vertexIds.get(e.startVertex)!, vertexIds.get(e.endVertex)!]))?.id ?? fresh()]));
  const cells = new Map<string, TopologyCell>(), vertices = new Map<string, TopologyVertex>(), edges = new Map<string, TopologyEdge>();
  for (const cell of next.cells.values()) {
    const id = cellIds.get(cell.id)!, old = survivors.get(cell.id), template = oldSlots.get(cellSlot(cell));
    // Preserve the saved polygon order: corner/side annotations use that order.
    const vertexOrder = old && template ? old.boundaryVertices.map(v => template.boundaryVertices.findIndex(t => bound.vertices.get(t)!.id === v)) : cell.boundaryVertices.map((_, i) => i);
    const edgeOrder = old && template ? old.boundaryEdges.map(e => template.boundaryEdges.findIndex(t => bound.edges.get(t)!.id === e)) : cell.boundaryEdges.map((_, i) => i);
    cells.set(id, { ...old, ...cell, id, originalCells: old?.originalCells ?? [id],
      boundaryVertices: vertexOrder.map(i => vertexIds.get(cell.boundaryVertices[i])!),
      boundaryEdges: edgeOrder.map(i => edgeIds.get(cell.boundaryEdges[i])!), adjacentCells: cell.adjacentCells.map(id => cellIds.get(id)!) });
  }
  for (const vertex of next.vertices.values()) {
    const id = vertexIds.get(vertex.id)!;
    vertices.set(id, { ...vertex, id, index: null,
      adjacentCells: vertex.adjacentCells.map(id => cellIds.get(id)!), adjacentEdges: vertex.adjacentEdges.map(id => edgeIds.get(id)!), adjacentVertices: vertex.adjacentVertices.map(id => vertexIds.get(id)!) });
  }
  for (const edge of next.edges.values()) {
    const id = edgeIds.get(edge.id)!, old = full.edges.get(id);
    edges.set(id, { ...edge, id, index: null,
      startVertex: old?.startVertex ?? vertexIds.get(edge.startVertex)!, endVertex: old?.endVertex ?? vertexIds.get(edge.endVertex)!,
      adjacentCells: edge.adjacentCells.map(id => cellIds.get(id)!) });
  }
  return applyCellExclusions({ ...next, cells, vertices, edges }, after);
}
