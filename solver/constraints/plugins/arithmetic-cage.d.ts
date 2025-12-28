/**
 * Arithmetic Cage Constraint Plugin
 *
 * Handles arithmetic constraints found in puzzles like:
 * - KenKen (addition, subtraction, multiplication, division)
 * - Calcudoku (similar to KenKen)
 * - Kakuro (sum of digits)
 * - Killer Sudoku (cage sums)
 */
import { Position } from '../../core/types.js';
import { PropagationResult } from '../../core/field.js';
import { Constraint, ConstraintParams } from '../../core/registry.js';
/**
 * Arithmetic operation types
 */
export type ArithmeticOperation = 'sum' | 'product' | 'difference' | 'quotient' | 'min' | 'max';
/**
 * A cage definition for arithmetic constraints
 */
export interface Cage {
    /** Positions in this cage */
    positions: Position[];
    /** The operation to apply */
    operation: ArithmeticOperation;
    /** The target result */
    target: number;
    /** Optional: unique values required (no repeats in cage) */
    unique?: boolean;
}
/**
 * Parameters for arithmetic cage constraint
 */
export interface ArithmeticCageParams extends ConstraintParams {
    /** Cages to check */
    cages: Cage[];
    /** Function to get the numeric value from a cell */
    getValue: (row: number, col: number) => number | null;
    /** Function to get possible values for a cell */
    getPossible?: (row: number, col: number) => number[];
}
/**
 * Calculate the result of an operation on values
 */
export declare function calculateOperation(values: number[], operation: ArithmeticOperation): number | null;
/**
 * Check if a cage is satisfied with given values
 */
export declare function isCageSatisfied(values: (number | null)[], cage: Cage): boolean;
/**
 * Check if a cage can still be satisfied (for partial fills)
 */
export declare function canCageBeSatisfied(values: (number | null)[], cage: Cage, possibleValues: number[][]): boolean;
/**
 * Get all valid combinations for a cage
 */
export declare function getCageCombinatations(cage: Cage, valueRange: number[]): number[][];
/**
 * Get possible values for each cell in a cage based on combinations
 */
export declare function getPossibleValuesForCage(cage: Cage, valueRange: number[], currentValues: (number | null)[]): Set<number>[];
/**
 * Kakuro-specific: Get valid combinations for a sum with n cells
 */
export declare function getKakuroCombinations(sum: number, count: number, maxValue?: number): number[][];
/**
 * Generic arithmetic cage constraint
 */
export declare class ArithmeticCageConstraint<TState> implements Constraint<TState> {
    readonly type = "arithmetic-cage";
    readonly name: string;
    private cages;
    private getValue;
    private getPossible;
    constructor(params: ArithmeticCageParams);
    propagate(_state: TState): PropagationResult;
    isSatisfied(_state: TState): boolean;
}
/**
 * Factory for arithmetic cage constraints
 */
export declare function createArithmeticCageConstraint<TState>(params: ArithmeticCageParams): ArithmeticCageConstraint<TState>;
//# sourceMappingURL=arithmetic-cage.d.ts.map