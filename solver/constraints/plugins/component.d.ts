/**
 * Component Constraint Plugin
 *
 * Handles connectivity constraints found in puzzles like:
 * - Nurikabe (black connected, white islands)
 * - Fillomino (polyomino sizes)
 * - Hitori (white connectivity)
 * - LITS (tetromino shapes)
 */
import { Position } from '../../core/types.js';
import { Grid, PropagationResult } from '../../core/field.js';
import { Constraint, ConstraintParams } from '../../core/registry.js';
/**
 * A connected component (region)
 */
export interface Component {
    /** Positions in this component */
    positions: Position[];
    /** Unique identifier */
    id: number;
    /** Size of the component */
    size: number;
}
/**
 * Parameters for component constraint
 */
export interface ComponentParams extends ConstraintParams {
    /** Function to check if a cell belongs to the component */
    matches: (row: number, col: number) => boolean;
    /** Use 8-direction connectivity (including diagonals) */
    diagonal?: boolean;
    /** Expected component count */
    expectedCount?: number;
    /** Expected component size (for single component) */
    expectedSize?: number;
    /** Minimum component size */
    minSize?: number;
    /** Maximum component size */
    maxSize?: number;
    /** Require exactly one component */
    requireConnected?: boolean;
}
/**
 * Find all connected components in a grid
 */
export declare function findComponents<T>(grid: Grid<T>, matches: (value: T, pos: Position) => boolean, diagonal?: boolean): Component[];
/**
 * Check if all matching cells are connected
 */
export declare function isConnected<T>(grid: Grid<T>, matches: (value: T, pos: Position) => boolean, diagonal?: boolean): boolean;
/**
 * Get the component containing a specific position
 */
export declare function getComponentAt<T>(grid: Grid<T>, pos: Position, matches: (value: T, pos: Position) => boolean, diagonal?: boolean): Component | null;
/**
 * Check if a position is an articulation point (removing it disconnects the component)
 */
export declare function isArticulationPoint<T>(grid: Grid<T>, pos: Position, matches: (value: T, pos: Position) => boolean, diagonal?: boolean): boolean;
/**
 * Generic component constraint
 */
export declare class ComponentConstraint<TState> implements Constraint<TState> {
    readonly type = "component";
    readonly name: string;
    private grid;
    private matches;
    private diagonal;
    private expectedCount;
    private expectedSize;
    private minSize;
    private maxSize;
    private requireConnected;
    constructor(params: ComponentParams);
    setGrid(grid: Grid<unknown>): void;
    propagate(_state: TState): PropagationResult;
    isSatisfied(_state: TState): boolean;
}
/**
 * Factory for component constraints
 */
export declare function createComponentConstraint<TState>(params: ComponentParams): ComponentConstraint<TState>;
//# sourceMappingURL=component.d.ts.map