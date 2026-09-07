/**
 * Factors Solver
 *
 * Rules:
 * 1. Fill each cell with a number from 1 to N (grid size)
 * 2. Each row and column contains each number exactly once (Latin square)
 * 3. Numbers outside the grid indicate the product of the first N consecutive
 *    numbers in that row/column (where N varies)
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class FactorsField implements FieldState<FactorsField> {
    readonly height: number;
    readonly width: number;
    /** Number candidates for each cell */
    private numbersCand;
    /** Top clues (products from top) */
    private topClues;
    /** Bottom clues (products from bottom) */
    private bottomClues;
    /** Left clues (products from left) */
    private leftClues;
    /** Right clues (products from right) */
    private rightClues;
    constructor(height: number, width: number);
    /** Set clues */
    setTopClue(col: number, product: number): void;
    setBottomClue(col: number, product: number): void;
    setLeftClue(row: number, product: number): void;
    setRightClue(row: number, product: number): void;
    /** Set a clue number in cell */
    setClue(row: number, col: number, num: number): void;
    /** Get all factorizations of a product using numbers 1-N */
    private getFactorizations;
    /** Latin square constraint */
    private latinSolve;
    /** Product clue constraint */
    private productSolve;
    clone(): FactorsField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get branching info */
    getBranchInfo(): {
        row: number;
        col: number;
        candidates: number[];
    } | null;
    /** Set cell to specific value */
    setCell(row: number, col: number, value: number): void;
}
export declare class FactorsSolver extends BaseSolver<FactorsField> {
    constructor(field: FactorsField);
    /** Create solver from pzprv3 URL parameter */
    static fromString(height: number, width: number, param: string): FactorsSolver;
    protected getBranchCandidates(state: FactorsField): BranchCandidate<FactorsField>[];
}
//# sourceMappingURL=factors.d.ts.map