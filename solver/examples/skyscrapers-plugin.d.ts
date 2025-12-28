/**
 * Skyscrapers Solver using Plugin Architecture
 *
 * Demonstrates how to use visibility and Latin square constraints.
 * Rules:
 * - Fill grid with 1-N (N = grid size), one per row/column (Latin square)
 * - Numbers represent building heights
 * - Clues show how many buildings are visible from that edge
 * - A building is visible if no taller building is between it and the edge
 */
import { Position } from '../core/types.js';
import { Grid, PropagationResult, CandidateSet } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { Constraint } from '../core/registry.js';
export interface SkyscrapersState {
    size: number;
    candidates: Grid<CandidateSet<number>>;
    topClues: (number | null)[];
    bottomClues: (number | null)[];
    leftClues: (number | null)[];
    rightClues: (number | null)[];
}
/**
 * Constraint: Latin square - unique in rows
 */
export declare class RowUniquenessConstraint implements Constraint<SkyscrapersState> {
    readonly type = "row-unique";
    readonly name = "Row Uniqueness";
    propagate(state: SkyscrapersState): PropagationResult;
    isSatisfied(state: SkyscrapersState): boolean;
}
/**
 * Constraint: Latin square - unique in columns
 */
export declare class ColUniquenessConstraint implements Constraint<SkyscrapersState> {
    readonly type = "col-unique";
    readonly name = "Column Uniqueness";
    propagate(state: SkyscrapersState): PropagationResult;
    isSatisfied(state: SkyscrapersState): boolean;
}
/**
 * Constraint: Top clues (visibility from top)
 */
export declare class TopClueConstraint implements Constraint<SkyscrapersState> {
    readonly type = "top-clue";
    readonly name = "Top Clue";
    propagate(state: SkyscrapersState): PropagationResult;
    isSatisfied(state: SkyscrapersState): boolean;
}
/**
 * Constraint: Bottom clues (visibility from bottom)
 */
export declare class BottomClueConstraint implements Constraint<SkyscrapersState> {
    readonly type = "bottom-clue";
    readonly name = "Bottom Clue";
    propagate(state: SkyscrapersState): PropagationResult;
    isSatisfied(state: SkyscrapersState): boolean;
}
/**
 * Constraint: Left clues (visibility from left)
 */
export declare class LeftClueConstraint implements Constraint<SkyscrapersState> {
    readonly type = "left-clue";
    readonly name = "Left Clue";
    propagate(state: SkyscrapersState): PropagationResult;
    isSatisfied(state: SkyscrapersState): boolean;
}
/**
 * Constraint: Right clues (visibility from right)
 */
export declare class RightClueConstraint implements Constraint<SkyscrapersState> {
    readonly type = "right-clue";
    readonly name = "Right Clue";
    propagate(state: SkyscrapersState): PropagationResult;
    isSatisfied(state: SkyscrapersState): boolean;
}
export declare function createSkyscrapersRunner(): ConstraintRunner<SkyscrapersState>;
/**
 * Get undetermined cells
 */
export declare function getUndeterminedCells(state: SkyscrapersState): Position[];
/**
 * Clone state
 */
export declare function cloneState(state: SkyscrapersState): SkyscrapersState;
/**
 * Simple solver using plugin constraints
 */
export declare function solveSkyscrapers(state: SkyscrapersState): SkyscrapersState | null;
/**
 * Create initial state from puzzle
 */
export declare function createSkyscrapersState(size: number, topClues: (number | null)[], bottomClues: (number | null)[], leftClues: (number | null)[], rightClues: (number | null)[], givens?: Array<{
    row: number;
    col: number;
    value: number;
}>): SkyscrapersState;
//# sourceMappingURL=skyscrapers-plugin.d.ts.map