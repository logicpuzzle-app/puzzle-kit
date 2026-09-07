/**
 * Aqre Solver using Plugin Architecture
 *
 * Demonstrates how to use region and consecutive constraints.
 * Rules:
 * - Shade some cells
 * - Each region contains a number showing how many shaded cells it has
 * - No more than 3 consecutive shaded cells in a row/column
 * - All shaded cells must be connected
 */
import { CellState, Position } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { Constraint } from '../core/registry.js';
export interface AqreState {
    height: number;
    width: number;
    cells: Grid<CellState>;
    regions: Grid<number>;
    numbers: Grid<number | null>;
    regionCount: number;
}
/**
 * Constraint: Region must have exactly the specified number of shaded cells
 */
export declare class RegionCountConstraint implements Constraint<AqreState> {
    readonly type = "region-count";
    readonly name = "Region Count";
    propagate(state: AqreState): PropagationResult;
    isSatisfied(state: AqreState): boolean;
}
/**
 * Constraint: No more than 3 consecutive shaded cells in rows/columns
 */
export declare class NoFourConsecutiveConstraint implements Constraint<AqreState> {
    readonly type = "no-four-consecutive";
    readonly name = "No Four Consecutive";
    propagate(state: AqreState): PropagationResult;
    isSatisfied(state: AqreState): boolean;
}
/**
 * Constraint: All shaded cells must be connected
 */
export declare class ShadedConnectedConstraint implements Constraint<AqreState> {
    readonly type = "shaded-connected";
    readonly name = "Shaded Connected";
    propagate(_state: AqreState): PropagationResult;
    isSatisfied(state: AqreState): boolean;
}
export declare function createAqreRunner(): ConstraintRunner<AqreState>;
/**
 * Check if state has unknown cells
 */
export declare function hasUnknownCells(state: AqreState): boolean;
/**
 * Get unknown cells for branching
 */
export declare function getUnknownCells(state: AqreState): Position[];
/**
 * Clone state
 */
export declare function cloneState(state: AqreState): AqreState;
/**
 * Simple solver using plugin constraints
 */
export declare function solveAqre(state: AqreState): AqreState | null;
/**
 * Create initial state from puzzle
 */
export declare function createAqreState(height: number, width: number, regionGrid: number[][], numbers: Array<{
    row: number;
    col: number;
    value: number;
}>): AqreState;
//# sourceMappingURL=aqre-plugin.d.ts.map