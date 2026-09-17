import type { GridConfig } from '../types';
import type { GridTopology, TopologyCell } from './topology/types';
import { getCellIndexMap } from './gridUtils';
import { calculateNextPosition } from '../hooks/keyboardUtils';

/** Identity is required once a selection has been resolved. Indices are only navigation hints. */
export interface CellSelection { cellId: string; row?: number; col?: number }
export type CellSelectionRequest = CellSelection | { cellId?: undefined; row: number; col: number };
type Board = { grid: GridConfig; useTopology: boolean; topology: GridTopology | null };

function cellIndex(cell: TopologyCell): { row?: number; col?: number } {
  const row = cell.index === undefined ? cell.row : cell.index?.[0];
  const col = cell.index === undefined ? cell.col : cell.index?.[1];
  return { row: row ?? undefined, col: col ?? undefined };
}

export function resolveCellSelection(board: Board, target: CellSelectionRequest | null): CellSelection | null {
  if (!target) return null;
  const excluded = new Set([...(board.grid.voidCells ?? []), ...(board.grid.disabledCells ?? [])]);
  if (board.useTopology) {
    const topology = board.topology;
    if (!topology) return null;
    const candidates = target.cellId !== undefined
      ? [topology.cells.get(target.cellId)].filter((c): c is TopologyCell => !!c)
      : [...topology.cells.values()].filter(cell => {
        const index = cellIndex(cell);
        return index.row === target.row && index.col === target.col;
      });
    if (candidates.length !== 1 || excluded.has(candidates[0].id)) return null;
    return { cellId: candidates[0].id, ...cellIndex(candidates[0]) };
  }
  // Only the explicit legacy grid mode uses its format-specific lookup.
  const candidates = [...getCellIndexMap(board.grid)].filter(([id, index]) =>
    !excluded.has(id) && (target.cellId !== undefined ? id === target.cellId : index.row === target.row && index.col === target.col));
  return candidates.length === 1 ? { cellId: candidates[0][0], ...candidates[0][1] } : null;
}

export function moveCellSelection(board: Board, target: CellSelectionRequest, delta: { dr: number; dc: number }): CellSelection | null {
  const current = resolveCellSelection(board, target);
  if (!current) return null;
  if (current.row !== undefined && current.col !== undefined) {
    const next = calculateNextPosition({ row: current.row, col: current.col }, delta, board.grid.rows, board.grid.cols);
    return resolveCellSelection(board, next);
  }
  const topology = board.useTopology ? board.topology : null;
  const cell = topology?.cells.get(current.cellId);
  if (!cell || !topology) return null;
  // Indexless cells move along actual adjacency, preferring the closest direction.
  const candidates = cell.adjacentCells.flatMap(id => {
    const neighbor = topology.cells.get(id);
    if (!neighbor || !resolveCellSelection(board, { cellId: id })) return [];
    const dx = neighbor.center.x - cell.center.x, dy = neighbor.center.y - cell.center.y;
    const forward = dx * delta.dc + dy * delta.dr;
    if (forward <= 1e-8) return [];
    return [{ id, angle: Math.abs(dx * delta.dr - dy * delta.dc) / forward, distance: dx * dx + dy * dy }];
  }).sort((a, b) => a.angle - b.angle || a.distance - b.distance);
  if (!candidates.length) return null;
  const [first, second] = candidates;
  if (second && Math.abs(first.angle - second.angle) < 1e-8 && Math.abs(first.distance - second.distance) < 1e-8) return null;
  return resolveCellSelection(board, { cellId: first.id });
}
