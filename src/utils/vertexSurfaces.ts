import type { Point, ToolSettings, VertexSurfaceElement } from '../types';
import type { GridTopology } from './gridTopology';

export function usesVertexSurface(settings: ToolSettings) {
  return settings.surfaceTarget === 'vertex'
    && (settings.currentTool === 'surface-fill' || settings.currentTool === 'surface-dot');
}

// Intersect a cell polygon with the half-plane closer to this vertex than another.
function clipCloser(polygon: Point[], vertex: Point, other: Point): Point[] {
  const dx = other.x - vertex.x;
  const dy = other.y - vertex.y;
  const limit = (other.x * other.x + other.y * other.y - vertex.x * vertex.x - vertex.y * vertex.y) / 2;
  const side = (p: Point) => p.x * dx + p.y * dy - limit;
  const result: Point[] = [];
  for (let index = 0; index < polygon.length; index++) {
    const a = polygon[index]; const b = polygon[(index + 1) % polygon.length];
    const sa = side(a); const sb = side(b);
    const insideA = sa <= 1e-7; const insideB = sb <= 1e-7;
    if (insideA) result.push(a);
    if (insideA !== insideB) {
      const t = sa / (sa - sb);
      result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return result;
}

/** Partition each adjacent cell by its nearest boundary vertex; never shade void/outboard space. */
export function getVertexSurfaceRegion(topology: GridTopology, vertexId: string) {
  const vertex = topology.vertices.get(vertexId);
  if (!vertex) return null;
  const paths: string[] = [];
  for (const cellId of vertex.adjacentCells) {
    const cell = topology.cells.get(cellId);
    if (!cell || cell.outboard) continue;
    const boundary = cell.boundaryVertices.map(id => topology.vertices.get(id)?.position);
    if (boundary.some(p => !p)) continue;
    let polygon = boundary as Point[];
    for (const id of cell.boundaryVertices) {
      if (id === vertexId) continue;
      polygon = clipCloser(polygon, vertex.position, topology.vertices.get(id)!.position);
    }
    if (polygon.length >= 3) paths.push(`M ${polygon.map(p => `${p.x} ${p.y}`).join(' L ')} Z`);
  }
  return paths.length ? { path: paths.join(' '), position: vertex.position } : null;
}

/** Missing references stay unresolved; never infer identity from cell corners. */
export function resolveSurfaceVertex(element: VertexSurfaceElement, topology: GridTopology): string | null {
  return topology.vertices.has(element.vertexId) ? element.vertexId : null;
}
