/**
 * Pattern Match Constraint Plugin
 *
 * Handles local pattern constraints found in puzzles like:
 * - Nurikabe (2x2 black pool forbidden)
 * - Tapa (run-length patterns)
 * - Masyu (turn/straight rules)
 * - Heyawake (region crossing limits)
 */
import { Position, Direction } from '../../core/types.js';
import { Grid, PropagationResult } from '../../core/field.js';
import { Constraint, ConstraintParams } from '../../core/registry.js';
/**
 * A pattern template with relative positions and expected values
 */
export interface PatternTemplate<T> {
    /** Name for debugging */
    name: string;
    /** Relative positions to check (from anchor) */
    positions: Position[];
    /** Function to check if pattern matches */
    matches: (values: T[]) => boolean;
    /** If matched, what action to take (optional) */
    action?: 'forbid' | 'require' | 'none';
}
/**
 * Parameters for pattern match constraint
 */
export interface PatternMatchParams<T> extends ConstraintParams {
    /** Pattern templates to check */
    patterns: PatternTemplate<T>[];
    /** Grid to check patterns on */
    grid?: Grid<T>;
}
/**
 * Check if a 2x2 area contains all matching values (pool check)
 */
export declare function has2x2Pool<T>(grid: Grid<T>, matches: (value: T) => boolean): Position | null;
/**
 * Check if placing a value would create a 2x2 pool
 */
export declare function would2x2Pool<T>(grid: Grid<T>, pos: Position, newValue: T, matches: (value: T) => boolean): boolean;
/**
 * Count consecutive matching cells in a direction
 */
export declare function countRun<T>(grid: Grid<T>, start: Position, dir: Direction, matches: (value: T) => boolean): number;
/**
 * Get run lengths around a cell (for Tapa-like puzzles)
 */
export declare function getRunLengths<T>(grid: Grid<T>, center: Position, matches: (value: T) => boolean): number[];
/**
 * Generic pattern match constraint
 */
export declare class PatternMatchConstraint<TState, T> implements Constraint<TState> {
    readonly type = "pattern-match";
    readonly name: string;
    private patterns;
    private grid;
    constructor(params: PatternMatchParams<T>);
    setGrid(grid: Grid<T>): void;
    propagate(_state: TState): PropagationResult;
    isSatisfied(_state: TState): boolean;
    private getPatternValues;
}
/**
 * Factory for pattern match constraints
 */
export declare function createPatternMatchConstraint<TState, T>(params: PatternMatchParams<T>): PatternMatchConstraint<TState, T>;
/**
 * Pre-built pattern: 2x2 pool forbidden
 */
export declare function create2x2ForbiddenPattern<T>(matches: (value: T) => boolean): PatternTemplate<T>;
//# sourceMappingURL=pattern-match.d.ts.map