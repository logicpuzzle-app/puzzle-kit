/**
 * Minarism Solver
 *
 * Rules:
 * 1. Fill cells with numbers 1 to N (grid size)
 * 2. Each row and column contains each number exactly once (Latin square)
 * 3. Numbers in the grid indicate the minimum of all adjacent (orthogonally) cells
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class MinarismField implements FieldState<MinarismField> {
    readonly size: number;
    readonly height: number;
    readonly width: number;
    /** Number candidates for each cell */
    private numbersCand;
    /** Clue cells (showing minimum of adjacent) */
    private clues;
    constructor(size: number);
    /** Set a clue (minimum indicator) */
    setClue(row: number, col: number, min: number): void;
    /** Set a cell value */
    setCell(row: number, col: number, value: number): void;
    /** Get adjacent positions */
    private getAdjacent;
    /** Latin square constraint */
    private latinSolve;
    /** Minimum clue constraint */
    private minSolve;
    clone(): MinarismField;
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
}
export declare class MinarismSolver extends BaseSolver<MinarismField> {
    constructor(field: MinarismField);
    /** Create solver from pzprv3 URL parameter */
    static fromString(size: number, param: string): MinarismSolver;
    protected getBranchCandidates(state: MinarismField): BranchCandidate<MinarismField>[];
}
//# sourceMappingURL=minarism.d.ts.map