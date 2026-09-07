/**
 * Kropki Solver using Plugin Architecture
 *
 * Demonstrates how to use edge constraints with Latin square.
 * Rules:
 * - Fill grid with 1-N (N = grid size), one per row/column (Latin square)
 * - White dot: adjacent cells differ by 1
 * - Black dot: one cell is double the other
 * - No dot between cells: neither condition applies
 */
import { Position } from '../core/types.js';
import { Grid, PropagationResult, CandidateSet } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { Constraint } from '../core/registry.js';
export type DotType = 'white' | 'black' | 'none';
export interface KropkiState {
    size: number;
    candidates: Grid<CandidateSet<number>>;
    hDots: Grid<DotType>;
    vDots: Grid<DotType>;
}
/**
 * Constraint: Latin square - unique in rows
 */
export declare class RowUniquenessConstraint implements Constraint<KropkiState> {
    readonly type = "row-unique";
    readonly name = "Row Uniqueness";
    propagate(state: KropkiState): PropagationResult;
    isSatisfied(state: KropkiState): boolean;
}
/**
 * Constraint: Latin square - unique in columns
 */
export declare class ColUniquenessConstraint implements Constraint<KropkiState> {
    readonly type = "col-unique";
    readonly name = "Column Uniqueness";
    propagate(state: KropkiState): PropagationResult;
    isSatisfied(state: KropkiState): boolean;
}
/**
 * Constraint: Horizontal dots
 */
export declare class HorizontalDotConstraint implements Constraint<KropkiState> {
    readonly type = "h-dot";
    readonly name = "Horizontal Dot";
    propagate(state: KropkiState): PropagationResult;
    isSatisfied(state: KropkiState): boolean;
}
/**
 * Constraint: Vertical dots
 */
export declare class VerticalDotConstraint implements Constraint<KropkiState> {
    readonly type = "v-dot";
    readonly name = "Vertical Dot";
    propagate(state: KropkiState): PropagationResult;
    isSatisfied(state: KropkiState): boolean;
}
export declare function createKropkiRunner(): ConstraintRunner<KropkiState>;
/**
 * Get undetermined cells
 */
export declare function getUndeterminedCells(state: KropkiState): Position[];
/**
 * Clone state
 */
export declare function cloneState(state: KropkiState): KropkiState;
/**
 * Simple solver using plugin constraints
 */
export declare function solveKropki(state: KropkiState): KropkiState | null;
/**
 * Create initial state from puzzle
 */
export declare function createKropkiState(size: number, horizontalDots: Array<{
    row: number;
    col: number;
    type: DotType;
}>, verticalDots: Array<{
    row: number;
    col: number;
    type: DotType;
}>, givens?: Array<{
    row: number;
    col: number;
    value: number;
}>): KropkiState;
//# sourceMappingURL=kropki-plugin.d.ts.map