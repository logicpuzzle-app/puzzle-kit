/**
 * Doppelblock Solver
 *
 * Rules:
 * 1. Fill cells with numbers 1 to N or leave them as black blocks
 * 2. Each row and column contains each number 1 to N exactly once
 * 3. Each row and column contains exactly 2 black blocks
 * 4. Numbers outside the grid indicate the sum of numbers between the two black blocks
 *    in that row/column
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export type DoppelblockCell = number | 'black' | 'unknown';
export declare class DoppelblockField implements FieldState<DoppelblockField> {
    readonly size: number;
    readonly height: number;
    readonly width: number;
    /** Cell states: number (1-N), 'black', or 'unknown' */
    private cells;
    /** Candidates for each cell */
    private candidates;
    /** Row clues (sum between blocks) */
    private rowClues;
    /** Column clues (sum between blocks) */
    private colClues;
    constructor(size: number);
    /** Set row clue */
    setRowClue(row: number, sum: number): void;
    /** Set column clue */
    setColClue(col: number, sum: number): void;
    /** Set a cell value */
    setCell(row: number, col: number, value: number | 'black'): void;
    /** Latin square constraint (excluding black cells) */
    private latinSolve;
    /** Black block constraint: exactly 2 per row/column */
    private blockSolve;
    /** Sum clue constraint */
    private sumSolve;
    clone(): DoppelblockField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get branching info */
    getBranchInfo(): {
        row: number;
        col: number;
        candidates: (number | 'black')[];
    } | null;
}
export declare class DoppelblockSolver extends BaseSolver<DoppelblockField> {
    constructor(field: DoppelblockField);
    /** Create solver from pzprv3 URL parameter */
    static fromString(size: number, param: string): DoppelblockSolver;
    protected getBranchCandidates(state: DoppelblockField): BranchCandidate<DoppelblockField>[];
}
//# sourceMappingURL=doppelblock.d.ts.map