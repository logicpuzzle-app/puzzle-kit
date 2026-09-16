import type { GridConfig, Point } from '../types';
import type { GridTopology } from './topology/types';
import { getCellCorners, getCellIndexById } from './gridUtils';

type Board = { grid: GridConfig; useTopology: boolean; topology: GridTopology | null };

/** Logical NW, NE, SE, SW corners, independent of ID spelling and polygon start. */
export function kakuroCellCorners({ grid, useTopology, topology }: Board, cellId: string): Point[] | null {
  if (grid.gridType !== 'square' || [...(grid.voidCells ?? []), ...(grid.disabledCells ?? []), ...(grid.outboardCells ?? [])].includes(cellId)) return null;
  if (!useTopology) {
    // Explicit Grid compatibility boundary; never a fallback for a topology miss.
    const index = getCellIndexById(cellId, grid);
    return index && index.row >= 0 && index.row < grid.rows && index.col >= 0 && index.col < grid.cols
      ? getCellCorners(index.row, index.col, grid) : null;
  }
  const cell = topology?.cells.get(cellId);
  if (!cell || !topology || cell.outboard || cell.id !== cellId || cell.originalCells && cell.originalCells.length > 1) return null;
  const [row, col] = cell.index ?? [];
  if (row == null || col == null || !Number.isInteger(row) || !Number.isInteger(col)
      || row < (grid.marginTop ?? 0) || row >= (grid.marginTop ?? 0) + grid.rows
      || col < (grid.marginLeft ?? 0) || col >= (grid.marginLeft ?? 0) + grid.cols
      || cell.boundaryVertices.length !== 4 || new Set(cell.boundaryVertices).size !== 4) return null;
  const vertices = cell.boundaryVertices.map(id => topology.vertices.get(id));
  const corners = [[row, col], [row, col + 1], [row + 1, col + 1], [row + 1, col]].map(([r, c]) =>
    vertices.filter(v => v?.index?.[0] === r && v?.index?.[1] === c));
  if (corners.some(matches => matches.length !== 1)) return null;
  return corners.map(matches => matches[0]!.position);
}
