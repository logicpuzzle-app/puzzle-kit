import type { ValidationContext } from '../validators/core';
import { getCellIndexMap } from '../../utils/gridUtils';

export interface RectangularCell {
  id: string;
  row: number;
  col: number;
  neighbors: string[];
}
export interface RectangularBoard {
  cells: Map<string, RectangularCell>;
  excluded: Set<string>;
  at: (row: number, col: number) => RectangularCell | undefined;
}
const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;
const key = (row: number, col: number) => JSON.stringify([row, col]);

/** A logical square lattice, including holes and display deformation. Indexes
 * are query metadata, never persistent identities. Reject ambiguous indexes or
 * non-lattice incidence instead of reconstructing cells from an ID spelling. */
export function rectangularBoard(ctx: ValidationContext): RectangularBoard | null {
  const { grid, topology } = ctx;
  const referenceMode = ctx.referenceMode ?? (topology ? 'topology' : 'grid');
  if (grid.gridType !== 'square' || !Number.isInteger(grid.rows) || grid.rows < 1 || !Number.isInteger(grid.cols) || grid.cols < 1) return null;
  const excluded = new Set([...(grid.voidCells ?? []), ...(grid.disabledCells ?? []), ...(grid.outboardCells ?? [])]);
  const cells = new Map<string, RectangularCell>(), byIndex = new Map<string, RectangularCell>();
  const add = (id: string, row: number, col: number): boolean => {
    const slot = key(row, col);
    if (byIndex.has(slot) || cells.has(id)) return false;
    const cell = { id, row, col, neighbors: [] as string[] };
    cells.set(id, cell); byIndex.set(slot, cell); return true;
  };
  if (referenceMode === 'grid') {
    // Explicit compatibility boundary: Grid files use playable-board indices,
    // including negative margin indices. Never enter this after a topology miss.
    for (const [id, index] of getCellIndexMap(grid)) {
      if (index.row < 0 || index.row >= grid.rows || index.col < 0 || index.col >= grid.cols) excluded.add(id);
      if (!excluded.has(id)) add(id, index.row, index.col);
    }
  } else {
    if (!topology) return null;
    for (const [id, cell] of topology.cells) {
      if (cell.outboard) excluded.add(id);
      if (excluded.has(id)) continue;
      const [row, col] = cell.index ?? [];
      if (cell.id !== id || row == null || col == null || !Number.isInteger(row) || !Number.isInteger(col)
          || row < (grid.marginTop ?? 0) || row >= (grid.marginTop ?? 0) + grid.rows
          || col < (grid.marginLeft ?? 0) || col >= (grid.marginLeft ?? 0) + grid.cols
          || cell.originalCells && cell.originalCells.length > 1
          || cell.boundaryVertices.length !== 4 || new Set(cell.boundaryVertices).size !== 4
          || cell.boundaryEdges.length !== 4 || new Set(cell.boundaryEdges).size !== 4
          || !add(id, row, col)) return null;
      const edges = cell.boundaryEdges.map(edgeId => topology.edges.get(edgeId));
      if (edges.some(edge => !edge || !edge.adjacentCells.includes(id))) return null;
      for (let i = 0; i < 4; i++) {
        const a = cell.boundaryVertices[i], b = cell.boundaryVertices[(i + 1) % 4];
        // The polygon is ordered; its edge-ID array need not use the same start
        // or direction. Match actual endpoints rather than array positions.
        if (!topology.vertices.has(a) || edges.filter(edge =>
          edge!.startVertex === a && edge!.endVertex === b || edge!.startVertex === b && edge!.endVertex === a).length !== 1) return null;
      }
    }
  }
  if (!cells.size) return null;
  for (const cell of cells.values()) {
    const expected = directions.flatMap(([dr, dc]) => {
      const neighbor = byIndex.get(key(cell.row + dr, cell.col + dc));
      return neighbor ? [neighbor.id] : [];
    });
    if (referenceMode !== 'grid') {
      const original = topology!.cells.get(cell.id)!;
      const actual = original.adjacentCells.filter(id => !excluded.has(id));
      if (new Set(actual).size !== actual.length || actual.length !== expected.length || actual.some(id => !expected.includes(id))) return null;
      for (const id of expected) {
        const other = topology!.cells.get(id)!;
        if (!original.boundaryEdges.some(edgeId => other.boundaryEdges.includes(edgeId)
          && topology!.edges.get(edgeId)!.adjacentCells.includes(id))) return null;
      }
      cell.neighbors = actual;
    } else cell.neighbors = expected;
  }
  return { cells, excluded, at: (row, col) => byIndex.get(key(row, col)) };
}
