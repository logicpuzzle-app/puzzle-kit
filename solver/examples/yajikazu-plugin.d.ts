/**
 * Yajisan-Kazusan Solver using Plugin Architecture
 *
 * Demonstrates how to use arrow clue and shading constraints.
 * Rules:
 * - Shade some cells
 * - White arrow clues are true: they show the count of shaded cells in that direction
 * - Shaded arrow clues may be false (ignored)
 * - No adjacent shaded cells
 * - White cells must be connected
 */
import { CellState, Position, Direction } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { Constraint } from '../core/registry.js';
export interface YajikazuClue {
    direction: Direction;
    count: number;
}
export interface YajikazuState {
    height: number;
    width: number;
    cells: Grid<CellState>;
    clues: Grid<YajikazuClue | null>;
}
/**
 * Constraint: White clue cells must be correct
 */
export declare class WhiteClueConstraint implements Constraint<YajikazuState> {
    readonly type = "white-clue";
    readonly name = "White Clue";
    propagate(state: YajikazuState): PropagationResult;
    isSatisfied(state: YajikazuState): boolean;
}
/**
 * Constraint: No adjacent shaded cells
 */
export declare class NoAdjacentShadedConstraint implements Constraint<YajikazuState> {
    readonly type = "no-adjacent-shaded";
    readonly name = "No Adjacent Shaded";
    propagate(state: YajikazuState): PropagationResult;
    isSatisfied(state: YajikazuState): boolean;
}
/**
 * Constraint: White cells must be connected
 */
export declare class WhiteConnectedConstraint implements Constraint<YajikazuState> {
    readonly type = "white-connected";
    readonly name = "White Connected";
    propagate(_state: YajikazuState): PropagationResult;
    isSatisfied(state: YajikazuState): boolean;
}
export declare function createYajikazuRunner(): ConstraintRunner<YajikazuState>;
/**
 * Check if state has unknown cells
 */
export declare function hasUnknownCells(state: YajikazuState): boolean;
/**
 * Get unknown cells for branching
 */
export declare function getUnknownCells(state: YajikazuState): Position[];
/**
 * Clone state
 */
export declare function cloneState(state: YajikazuState): YajikazuState;
/**
 * Simple solver using plugin constraints
 */
export declare function solveYajikazu(state: YajikazuState): YajikazuState | null;
/**
 * Create initial state from puzzle
 */
export declare function createYajikazuState(height: number, width: number, clues: Array<{
    row: number;
    col: number;
    direction: Direction;
    count: number;
}>): YajikazuState;
//# sourceMappingURL=yajikazu-plugin.d.ts.map