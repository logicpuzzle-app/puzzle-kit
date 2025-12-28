/**
 * Visibility Constraint Plugin
 *
 * Handles line-of-sight constraints found in puzzles like:
 * - Akari (light beams)
 * - Skyscrapers (viewing buildings)
 * - Kurodoko (visibility counts)
 * - View (sight lines)
 */
import { Position, Direction } from '../../core/types.js';
import { Grid, PropagationResult } from '../../core/field.js';
import { Constraint, ConstraintParams } from '../../core/registry.js';
/**
 * Parameters for visibility constraint
 */
export interface VisibilityParams extends ConstraintParams {
    /** Directions to check visibility */
    directions?: Direction[];
    /** Function to check if a cell blocks visibility */
    isBlocker: (row: number, col: number) => boolean;
    /** Function to check if a cell is a target (counts toward visibility) */
    isTarget?: (row: number, col: number) => boolean;
    /** Expected count (if applicable) */
    expectedCount?: number | null;
    /** Position of the viewing cell */
    position?: Position;
}
/**
 * Get all cells visible from a position
 */
export declare function getVisiblePositions<T>(grid: Grid<T>, pos: Position, directions: Direction[], isBlocker: (value: T, pos: Position) => boolean): Position[];
/**
 * Count visible cells matching a predicate
 */
export declare function countVisible<T>(grid: Grid<T>, pos: Position, directions: Direction[], isBlocker: (value: T, pos: Position) => boolean, isTarget: (value: T, pos: Position) => boolean): {
    count: number;
    possible: number;
};
/**
 * Generic visibility constraint
 * Can be configured for different puzzle types
 */
export declare class VisibilityConstraint<TState> implements Constraint<TState> {
    readonly type = "visibility";
    readonly name: string;
    private grid;
    private directions;
    private isBlocker;
    private isTarget;
    private expectedCount;
    private position;
    constructor(params: VisibilityParams);
    /**
     * Set the grid for this constraint
     * Must be called before propagate/isSatisfied
     */
    setGrid(grid: Grid<unknown>): void;
    propagate(_state: TState): PropagationResult;
    isSatisfied(_state: TState): boolean;
}
/**
 * Factory function for visibility constraints
 */
export declare function createVisibilityConstraint<TState>(params: VisibilityParams): VisibilityConstraint<TState>;
/**
 * Check if two positions can see each other
 */
export declare function canSee<T>(grid: Grid<T>, from: Position, to: Position, isBlocker: (value: T, pos: Position) => boolean): boolean;
//# sourceMappingURL=visibility.d.ts.map