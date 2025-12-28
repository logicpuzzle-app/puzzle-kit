/**
 * Constraint primitives for puzzle solving
 * Common constraint patterns found across many puzzle types
 */
export * from './plugins/index.js';
import { Position, Direction, CellState, EdgeState } from '../core/index.js';
import { Grid, EdgeGrid } from '../core/field.js';
/**
 * Check if all values in a group are unique (Latin square constraint)
 * Used in Sudoku, Kakuro, etc.
 */
export declare function allUnique<T>(values: T[]): boolean;
/**
 * Get row values from grid
 */
export declare function getRow<T>(grid: Grid<T>, row: number): T[];
/**
 * Get column values from grid
 */
export declare function getColumn<T>(grid: Grid<T>, col: number): T[];
/**
 * Check if all white cells are connected (single region)
 * Used in Nurikabe, Hitori, etc.
 */
export declare function isWhiteConnected(cells: Grid<CellState>): boolean;
/**
 * Check if black cells form a 2x2 pool (forbidden in many puzzles)
 */
export declare function hasBlackPool(cells: Grid<CellState>): boolean;
/**
 * Count connected regions of a specific state
 */
export declare function countRegions(cells: Grid<CellState>, state: CellState): number;
/**
 * Count edges around a vertex in edge grid
 */
export declare function countEdgesAtVertex(edges: EdgeGrid<EdgeState>, row: number, col: number, state?: EdgeState): number;
/**
 * Count edges around a cell
 */
export declare function countEdgesAroundCell(edges: EdgeGrid<EdgeState>, row: number, col: number, state?: EdgeState): number;
/**
 * Check if loop is properly formed (all vertices have 0 or 2 edges)
 */
export declare function isValidLoop(edges: EdgeGrid<EdgeState>): boolean;
/**
 * Check if loop is single connected loop (not multiple separate loops)
 */
export declare function isSingleLoop(edges: EdgeGrid<EdgeState>): boolean;
/**
 * Get all cells visible from a position in given directions
 * Visibility is blocked by cells matching the blocker predicate
 */
export declare function getVisibleCells<T>(grid: Grid<T>, pos: Position, directions: Direction[], isBlocker: (value: T) => boolean): Position[];
/**
 * Count visible cells in all directions
 */
export declare function countVisibleCells<T>(grid: Grid<T>, pos: Position, isBlocker: (value: T) => boolean): number;
/**
 * Get connected region containing a position
 * @param grid The grid to search
 * @param start Starting position
 * @param matches Predicate to match cells
 * @param diagonal If true, use 8-direction connectivity (including diagonals)
 */
export declare function getConnectedRegion<T>(grid: Grid<T>, start: Position, matches: (value: T) => boolean, diagonal?: boolean): Position[];
/**
 * Check if all matching cells form a single connected region
 * @param grid The grid to check
 * @param matches Predicate to match cells
 * @param diagonal If true, use 8-direction connectivity
 */
export declare function isConnected<T>(grid: Grid<T>, matches: (value: T) => boolean, diagonal?: boolean): boolean;
/**
 * Normalize polyomino shape (translate to origin, canonical form)
 * Used for shape matching in Fillomino, etc.
 */
export declare function normalizeShape(positions: Position[]): Position[];
/**
 * Check if two shapes are equivalent (same polyomino)
 */
export declare function shapesEqual(a: Position[], b: Position[]): boolean;
//# sourceMappingURL=index.d.ts.map