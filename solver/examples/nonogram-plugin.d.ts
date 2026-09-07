/**
 * Nonogram (Picross) Solver using Plugin Architecture
 *
 * Demonstrates how to use line constraint patterns.
 * Rules:
 * - Fill cells according to row/column clues
 * - Each clue shows consecutive filled cell groups in order
 * - Groups must be separated by at least one empty cell
 */
import { CellState, Position } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { Constraint } from '../core/registry.js';
export interface NonogramState {
    height: number;
    width: number;
    cells: Grid<CellState>;
    rowClues: number[][];
    colClues: number[][];
}
/**
 * Constraint: Row must match its clue
 */
export declare class RowClueConstraint implements Constraint<NonogramState> {
    readonly type = "row-clue";
    readonly name = "Row Clue";
    propagate(state: NonogramState): PropagationResult;
    isSatisfied(state: NonogramState): boolean;
}
/**
 * Constraint: Column must match its clue
 */
export declare class ColClueConstraint implements Constraint<NonogramState> {
    readonly type = "col-clue";
    readonly name = "Column Clue";
    propagate(state: NonogramState): PropagationResult;
    isSatisfied(state: NonogramState): boolean;
}
export declare function createNonogramRunner(): ConstraintRunner<NonogramState>;
/**
 * Check if state has unknown cells
 */
export declare function hasUnknownCells(state: NonogramState): boolean;
/**
 * Get unknown cells for branching
 */
export declare function getUnknownCells(state: NonogramState): Position[];
/**
 * Clone state
 */
export declare function cloneState(state: NonogramState): NonogramState;
/**
 * Simple solver using plugin constraints
 */
export declare function solveNonogram(state: NonogramState): NonogramState | null;
/**
 * Create initial state from puzzle
 */
export declare function createNonogramState(height: number, width: number, rowClues: number[][], colClues: number[][]): NonogramState;
//# sourceMappingURL=nonogram-plugin.d.ts.map