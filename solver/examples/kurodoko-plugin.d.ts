/**
 * Kurodoko (Where is Black Cells) Solver using Plugin Architecture
 *
 * Demonstrates how to use visibility/line-of-sight constraints.
 * Rules:
 * - Paint some cells black
 * - Numbers indicate visible white cells in 4 directions (including itself)
 * - Black cells cannot be adjacent
 * - White cells must be connected
 */
import { CellState, Position } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { Constraint } from '../core/registry.js';
export interface KurodokoState {
    height: number;
    width: number;
    cells: Grid<CellState>;
    numbers: Grid<number | null>;
}
/**
 * Constraint: Number cells show visible count
 */
export declare class VisibilityConstraint implements Constraint<KurodokoState> {
    readonly type = "visibility";
    readonly name = "Visibility";
    propagate(state: KurodokoState): PropagationResult;
    isSatisfied(state: KurodokoState): boolean;
}
/**
 * Constraint: Number cells cannot be black
 */
export declare class NumberCellWhiteConstraint implements Constraint<KurodokoState> {
    readonly type = "number-cell-white";
    readonly name = "Number Cell White";
    propagate(state: KurodokoState): PropagationResult;
    isSatisfied(state: KurodokoState): boolean;
}
/**
 * Constraint: Black cells cannot be adjacent
 */
export declare class NoAdjacentBlackConstraint implements Constraint<KurodokoState> {
    readonly type = "no-adjacent-black";
    readonly name = "No Adjacent Black";
    propagate(state: KurodokoState): PropagationResult;
    isSatisfied(state: KurodokoState): boolean;
}
/**
 * Constraint: White cells must be connected
 */
export declare class WhiteConnectedConstraint implements Constraint<KurodokoState> {
    readonly type = "white-connected";
    readonly name = "White Connected";
    propagate(_state: KurodokoState): PropagationResult;
    isSatisfied(state: KurodokoState): boolean;
}
export declare function createKurodokoRunner(): ConstraintRunner<KurodokoState>;
/**
 * Check if state has unknown cells
 */
export declare function hasUnknownCells(state: KurodokoState): boolean;
/**
 * Get unknown cells for branching
 */
export declare function getUnknownCells(state: KurodokoState): Position[];
/**
 * Clone state
 */
export declare function cloneState(state: KurodokoState): KurodokoState;
/**
 * Simple solver using plugin constraints
 */
export declare function solveKurodoko(state: KurodokoState): KurodokoState | null;
/**
 * Create initial state from puzzle
 */
export declare function createKurodokoState(height: number, width: number, numbers: Array<{
    row: number;
    col: number;
    value: number;
}>): KurodokoState;
//# sourceMappingURL=kurodoko-plugin.d.ts.map