/**
 * Tapa Solver using Plugin Architecture
 *
 * Demonstrates how to use neighbor counting and connectivity constraints.
 * Rules:
 * - Paint some cells black
 * - Numbers indicate consecutive black cell groups around the clue
 * - Black cells must be connected
 * - No 2x2 black areas
 */
import { CellState, Position } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { Constraint } from '../core/registry.js';
export interface TapaState {
    height: number;
    width: number;
    cells: Grid<CellState>;
    clues: Grid<number[] | null>;
}
/**
 * Constraint: Clue cells indicate black cell groups around them
 */
export declare class TapaClueConstraint implements Constraint<TapaState> {
    readonly type = "tapa-clue";
    readonly name = "Tapa Clue";
    propagate(state: TapaState): PropagationResult;
    isSatisfied(state: TapaState): boolean;
}
/**
 * Constraint: Clue cells cannot be black
 */
export declare class ClueCellWhiteConstraint implements Constraint<TapaState> {
    readonly type = "clue-cell-white";
    readonly name = "Clue Cell White";
    propagate(state: TapaState): PropagationResult;
    isSatisfied(state: TapaState): boolean;
}
/**
 * Constraint: No 2x2 black areas
 */
export declare class No2x2BlackConstraint implements Constraint<TapaState> {
    readonly type = "no-2x2-black";
    readonly name = "No 2x2 Black";
    propagate(state: TapaState): PropagationResult;
    isSatisfied(state: TapaState): boolean;
}
/**
 * Constraint: All black cells must be connected
 */
export declare class BlackConnectedConstraint implements Constraint<TapaState> {
    readonly type = "black-connected";
    readonly name = "Black Connected";
    propagate(_state: TapaState): PropagationResult;
    isSatisfied(state: TapaState): boolean;
}
export declare function createTapaRunner(): ConstraintRunner<TapaState>;
/**
 * Check if state has unknown cells
 */
export declare function hasUnknownCells(state: TapaState): boolean;
/**
 * Get unknown cells for branching
 */
export declare function getUnknownCells(state: TapaState): Position[];
/**
 * Clone state
 */
export declare function cloneState(state: TapaState): TapaState;
/**
 * Simple solver using plugin constraints
 */
export declare function solveTapa(state: TapaState): TapaState | null;
/**
 * Create initial state from puzzle
 */
export declare function createTapaState(height: number, width: number, clues: Array<{
    row: number;
    col: number;
    values: number[];
}>): TapaState;
//# sourceMappingURL=tapa-plugin.d.ts.map