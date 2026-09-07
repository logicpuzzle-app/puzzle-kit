/**
 * Simple Gako Solver
 *
 * Rules:
 * 1. Fill each cell with a number from 1 to (height + width - 1)
 * 2. A number N appears exactly N times in its row and column combined
 * 3. Some numbers are given as clues
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class SimpleGakoField implements FieldState<SimpleGakoField> {
    readonly height: number;
    readonly width: number;
    /** Given numbers */
    private readonly numbers;
    /** Number candidates for each cell */
    private numbersCand;
    constructor(height: number, width: number, param?: string);
    private parseParam;
    clone(): SimpleGakoField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    /** A number N appears exactly N times in its row and column */
    private numberSolve;
    toString(): string;
}
export declare class SimpleGakoSolver extends BaseSolver<SimpleGakoField> {
    constructor(field: SimpleGakoField);
    static fromURL(url: string): SimpleGakoSolver;
    protected getBranchCandidates(state: SimpleGakoField): BranchCandidate<SimpleGakoField>[];
}
//# sourceMappingURL=simplegako.d.ts.map