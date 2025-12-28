/**
 * Numberlink Solver using Plugin Architecture
 *
 * Demonstrates how to use path constraints.
 * Rules:
 * - Connect pairs of same numbers with paths
 * - Paths cannot cross or branch
 * - Each cell is used by exactly one path
 */
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { Constraint } from '../core/registry.js';
export declare enum EdgeState {
    UNKNOWN = 0,
    PATH = 1,
    WALL = 2
}
export interface NumberlinkState {
    height: number;
    width: number;
    numbers: Grid<number | null>;
    hEdges: Grid<EdgeState>;
    vEdges: Grid<EdgeState>;
}
/**
 * Constraint: Number endpoints have exactly 1 path edge
 */
export declare class EndpointDegreeConstraint implements Constraint<NumberlinkState> {
    readonly type = "endpoint-degree";
    readonly name = "Endpoint Degree";
    propagate(state: NumberlinkState): PropagationResult;
    isSatisfied(state: NumberlinkState): boolean;
}
/**
 * Constraint: Non-endpoint cells have 0 or 2 path edges
 */
export declare class PathCellDegreeConstraint implements Constraint<NumberlinkState> {
    readonly type = "path-cell-degree";
    readonly name = "Path Cell Degree";
    propagate(state: NumberlinkState): PropagationResult;
    isSatisfied(state: NumberlinkState): boolean;
}
/**
 * Constraint: All cells must be used (no empty cells)
 */
export declare class AllCellsUsedConstraint implements Constraint<NumberlinkState> {
    readonly type = "all-cells-used";
    readonly name = "All Cells Used";
    propagate(_state: NumberlinkState): PropagationResult;
    isSatisfied(state: NumberlinkState): boolean;
}
/**
 * Constraint: Paths connect same numbers
 */
export declare class PathConnectsNumbersConstraint implements Constraint<NumberlinkState> {
    readonly type = "path-connects-numbers";
    readonly name = "Path Connects Numbers";
    propagate(_state: NumberlinkState): PropagationResult;
    isSatisfied(state: NumberlinkState): boolean;
    private tracePath;
}
export declare function createNumberlinkRunner(): ConstraintRunner<NumberlinkState>;
/**
 * Get unknown edges for branching
 */
export declare function getUnknownEdges(state: NumberlinkState): Array<{
    row: number;
    col: number;
    horizontal: boolean;
}>;
/**
 * Clone state
 */
export declare function cloneState(state: NumberlinkState): NumberlinkState;
/**
 * Simple solver using plugin constraints
 */
export declare function solveNumberlink(state: NumberlinkState): NumberlinkState | null;
/**
 * Create initial state from puzzle
 */
export declare function createNumberlinkState(height: number, width: number, numbers: Array<{
    row: number;
    col: number;
    value: number;
}>): NumberlinkState;
//# sourceMappingURL=numberlink-plugin.d.ts.map