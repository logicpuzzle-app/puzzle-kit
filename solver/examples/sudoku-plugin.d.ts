/**
 * Sudoku Solver using Plugin Architecture
 *
 * Demonstrates how to use Latin Square constraint patterns.
 * Uses:
 * - Row uniqueness constraints
 * - Column uniqueness constraints
 * - Box uniqueness constraints
 */
import { Grid, CandidateSet, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { Constraint } from '../core/registry.js';
export interface SudokuState {
    size: number;
    boxHeight: number;
    boxWidth: number;
    candidates: Grid<CandidateSet<number>>;
}
/**
 * Constraint: No duplicate values in any row
 */
export declare class RowUniquenessConstraint implements Constraint<SudokuState> {
    readonly type = "row-uniqueness";
    readonly name = "Row Uniqueness";
    propagate(state: SudokuState): PropagationResult;
    isSatisfied(state: SudokuState): boolean;
}
/**
 * Constraint: No duplicate values in any column
 */
export declare class ColumnUniquenessConstraint implements Constraint<SudokuState> {
    readonly type = "column-uniqueness";
    readonly name = "Column Uniqueness";
    propagate(state: SudokuState): PropagationResult;
    isSatisfied(state: SudokuState): boolean;
}
/**
 * Constraint: No duplicate values in any box
 */
export declare class BoxUniquenessConstraint implements Constraint<SudokuState> {
    readonly type = "box-uniqueness";
    readonly name = "Box Uniqueness";
    propagate(state: SudokuState): PropagationResult;
    isSatisfied(state: SudokuState): boolean;
}
/**
 * Constraint: All cells must have at least one candidate
 */
export declare class ValidCandidatesConstraint implements Constraint<SudokuState> {
    readonly type = "valid-candidates";
    readonly name = "Valid Candidates";
    propagate(state: SudokuState): PropagationResult;
    isSatisfied(state: SudokuState): boolean;
}
export declare function createSudokuRunner(): ConstraintRunner<SudokuState>;
/**
 * Check if state is fully determined
 */
export declare function isComplete(state: SudokuState): boolean;
/**
 * Clone state
 */
export declare function cloneState(state: SudokuState): SudokuState;
/**
 * Simple solver using plugin constraints
 */
export declare function solveSudoku(state: SudokuState): SudokuState | null;
/**
 * Create initial state from puzzle string
 */
export declare function createSudokuState(size: number, puzzle: string, boxHeight?: number, boxWidth?: number): SudokuState;
/**
 * Create state from string array
 */
export declare function createSudokuStateFromArray(puzzle: string[]): SudokuState;
//# sourceMappingURL=sudoku-plugin.d.ts.map