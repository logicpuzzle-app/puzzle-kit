/**
 * Minesweeper Solver using Plugin Architecture
 *
 * Demonstrates how to use neighbor counting constraints.
 * Rules:
 * - Place mines in some cells
 * - Numbers show how many mines are in the 8 adjacent cells
 * - Number cells cannot contain mines
 */
import { CellState, Position } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { Constraint } from '../core/registry.js';
export interface MinesweeperState {
    height: number;
    width: number;
    cells: Grid<CellState>;
    numbers: Grid<number | null>;
}
/**
 * Constraint: Number cells show adjacent mine count
 */
export declare class MineCountConstraint implements Constraint<MinesweeperState> {
    readonly type = "mine-count";
    readonly name = "Mine Count";
    propagate(state: MinesweeperState): PropagationResult;
    isSatisfied(state: MinesweeperState): boolean;
}
/**
 * Constraint: Number cells cannot be mines
 */
export declare class NumberSafeConstraint implements Constraint<MinesweeperState> {
    readonly type = "number-safe";
    readonly name = "Number Safe";
    propagate(state: MinesweeperState): PropagationResult;
    isSatisfied(state: MinesweeperState): boolean;
}
export declare function createMinesweeperRunner(): ConstraintRunner<MinesweeperState>;
/**
 * Check if state has unknown cells
 */
export declare function hasUnknownCells(state: MinesweeperState): boolean;
/**
 * Get unknown cells for branching
 */
export declare function getUnknownCells(state: MinesweeperState): Position[];
/**
 * Clone state
 */
export declare function cloneState(state: MinesweeperState): MinesweeperState;
/**
 * Simple solver using plugin constraints
 */
export declare function solveMinesweeper(state: MinesweeperState): MinesweeperState | null;
/**
 * Create initial state from puzzle
 */
export declare function createMinesweeperState(height: number, width: number, numbers: Array<{
    row: number;
    col: number;
    value: number;
}>): MinesweeperState;
//# sourceMappingURL=minesweeper-plugin.d.ts.map