/**
 * Sukoro Solver
 *
 * Rules:
 * 1. Fill each white cell with a number 1-4 (or leave empty)
 * 2. Each number N indicates exactly N adjacent cells contain numbers (not empty)
 * 3. Same numbers cannot be orthogonally adjacent
 * 4. All numbered cells must be connected
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export type SukoroCellState = number | 'empty' | 'unknown';
export declare class SukoroField implements FieldState<SukoroField> {
    readonly height: number;
    readonly width: number;
    /** Cell states: number (1-4), 'empty', or 'unknown' */
    private cells;
    /** Candidates for each cell */
    private candidates;
    /** Clue cells (initial numbers) */
    private clues;
    constructor(height: number, width: number);
    /** Set a clue number */
    setClue(row: number, col: number, num: number): void;
    /** Get adjacent cells */
    private getAdjacentCells;
    /** Count adjacent numbered cells (confirmed and possible) */
    private countAdjacentNumbered;
    /** Number constraint: each number N has exactly N adjacent numbered cells */
    private numberSolve;
    /** Adjacent constraint: same numbers cannot be adjacent */
    private adjacentSolve;
    /** Candidate constraint: apply candidate to cell state */
    private candidateSolve;
    /** Connection constraint: all numbered cells must be connected */
    private connectSolve;
    clone(): SukoroField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get branching info */
    getBranchInfo(): {
        row: number;
        col: number;
        candidates: (number | 'empty')[];
    } | null;
    /** Set cell to specific value */
    setCell(row: number, col: number, value: number | 'empty'): void;
}
export declare class SukoroSolver extends BaseSolver<SukoroField> {
    constructor(field: SukoroField);
    /** Create solver from pzprv3 URL parameter */
    static fromString(height: number, width: number, param: string): SukoroSolver;
    protected getBranchCandidates(state: SukoroField): BranchCandidate<SukoroField>[];
}
//# sourceMappingURL=sukoro.d.ts.map