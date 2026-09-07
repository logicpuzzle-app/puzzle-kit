/**
 * LITS Solver using Plugin Architecture
 *
 * Demonstrates how to use tetromino and region constraints.
 * Rules:
 * - Paint exactly one tetromino (L, I, T, or S shape) in each region
 * - All painted cells must be connected
 * - No 2x2 black areas
 * - Same-shaped tetrominoes cannot touch orthogonally
 */
import { CellState, Position } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { Constraint } from '../core/registry.js';
export interface LITSState {
    height: number;
    width: number;
    cells: Grid<CellState>;
    regions: Grid<number>;
    regionCount: number;
}
/**
 * Constraint: Each region must have exactly 4 black cells
 */
export declare class RegionTetrominoConstraint implements Constraint<LITSState> {
    readonly type = "region-tetromino";
    readonly name = "Region Tetromino";
    propagate(state: LITSState): PropagationResult;
    isSatisfied(state: LITSState): boolean;
}
/**
 * Constraint: Black cells in each region must be connected (form a tetromino)
 */
export declare class RegionConnectedConstraint implements Constraint<LITSState> {
    readonly type = "region-connected";
    readonly name = "Region Connected";
    propagate(_state: LITSState): PropagationResult;
    isSatisfied(state: LITSState): boolean;
}
/**
 * Constraint: All black cells must be connected globally
 */
export declare class GlobalConnectedConstraint implements Constraint<LITSState> {
    readonly type = "global-connected";
    readonly name = "Global Connected";
    propagate(_state: LITSState): PropagationResult;
    isSatisfied(state: LITSState): boolean;
}
/**
 * Constraint: No 2x2 black areas
 */
export declare class No2x2BlackConstraint implements Constraint<LITSState> {
    readonly type = "no-2x2-black";
    readonly name = "No 2x2 Black";
    propagate(state: LITSState): PropagationResult;
    isSatisfied(state: LITSState): boolean;
}
export declare function createLITSRunner(): ConstraintRunner<LITSState>;
/**
 * Check if state has unknown cells
 */
export declare function hasUnknownCells(state: LITSState): boolean;
/**
 * Get unknown cells for branching
 */
export declare function getUnknownCells(state: LITSState): Position[];
/**
 * Clone state
 */
export declare function cloneState(state: LITSState): LITSState;
/**
 * Simple solver using plugin constraints
 */
export declare function solveLITS(state: LITSState): LITSState | null;
/**
 * Create initial state from puzzle
 */
export declare function createLITSState(height: number, width: number, regionGrid: number[][]): LITSState;
//# sourceMappingURL=lits-plugin.d.ts.map