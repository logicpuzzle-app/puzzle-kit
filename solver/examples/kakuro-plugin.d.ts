/**
 * Kakuro Solver using Plugin Architecture
 *
 * Demonstrates how to use arithmetic constraint plugins.
 * Uses:
 * - ArithmeticCageConstraint utilities: for sum constraints
 * - getKakuroCombinations: for valid digit combinations
 */
import { Position } from '../core/types.js';
import { Grid, CandidateSet, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { Constraint } from '../core/registry.js';
export interface KakuroGroup {
    sum: number;
    cells: Position[];
}
export interface KakuroState {
    height: number;
    width: number;
    candidates: Grid<CandidateSet<number> | null>;
    groups: KakuroGroup[];
}
/**
 * Constraint: Each group must sum to its clue
 */
export declare class SumConstraint implements Constraint<KakuroState> {
    readonly type = "sum";
    readonly name = "Sum Constraint";
    propagate(state: KakuroState): PropagationResult;
    isSatisfied(state: KakuroState): boolean;
}
/**
 * Constraint: No duplicate digits in each group
 */
export declare class UniquenessConstraint implements Constraint<KakuroState> {
    readonly type = "uniqueness";
    readonly name = "Uniqueness Constraint";
    propagate(state: KakuroState): PropagationResult;
    isSatisfied(state: KakuroState): boolean;
}
/**
 * Constraint: Values must be valid (1-9)
 */
export declare class ValidValuesConstraint implements Constraint<KakuroState> {
    readonly type = "valid-values";
    readonly name = "Valid Values";
    propagate(state: KakuroState): PropagationResult;
    isSatisfied(state: KakuroState): boolean;
}
export declare function createKakuroRunner(): ConstraintRunner<KakuroState>;
/**
 * Check if state is fully determined
 */
export declare function isComplete(state: KakuroState): boolean;
/**
 * Clone state
 */
export declare function cloneState(state: KakuroState): KakuroState;
/**
 * Simple solver using plugin constraints
 */
export declare function solveKakuro(state: KakuroState): KakuroState | null;
/**
 * Create initial state from puzzle data
 */
export declare function createKakuroState(height: number, width: number, whiteCells: Position[], groups: KakuroGroup[]): KakuroState;
//# sourceMappingURL=kakuro-plugin.d.ts.map