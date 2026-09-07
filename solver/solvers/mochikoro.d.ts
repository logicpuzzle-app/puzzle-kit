/**
 * Mochikoro Solver
 *
 * Rules:
 * 1. Paint some cells black
 * 2. White cells form rectangular regions (islands)
 * 3. Numbers indicate the size of the white rectangle they belong to
 * 4. Each white rectangle contains exactly one number
 * 5. No 2x2 area can be entirely black
 * 6. All white cells must be connected diagonally (can touch corners)
 */
import { CellState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
interface RectCandidate {
    top: number;
    left: number;
    bottom: number;
    right: number;
}
export declare class MochikoroField implements FieldState<MochikoroField> {
    readonly height: number;
    readonly width: number;
    /** Numbers in each cell (null = no number, positive = size) */
    private numbers;
    /** Rectangle candidates */
    private squareCand;
    /** Fixed (confirmed) rectangles */
    private squareFixed;
    constructor(height: number, width: number);
    /** Set a number */
    setNumber(row: number, col: number, num: number): void;
    /** Get number at position */
    getNumber(row: number, col: number): number | null;
    /** Initialize rectangle candidates */
    initCandidates(): void;
    /** Get cell state from candidates */
    getCellState(row: number, col: number): CellState;
    private rectsDuplicate;
    /**
     * Remove candidates that conflict with fixed rectangles
     */
    private sikakuSolve;
    /**
     * Check various constraints
     */
    private connectSolve;
    /**
     * Expand set to include all diagonally connected non-black cells
     */
    private expandDiagonalSet;
    clone(): MochikoroField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get candidates for branching */
    getCandidates(): RectCandidate[];
    /** Fix a candidate as a rectangle */
    fixCandidate(cand: RectCandidate): void;
    /** Remove a candidate */
    removeCandidate(cand: RectCandidate): void;
}
export declare class MochikoroSolver extends BaseSolver<MochikoroField> {
    constructor(field: MochikoroField);
    /**
     * Create solver from number data
     * @param height Grid height
     * @param width Grid width
     * @param clues Map of "row,col" to rectangle size (-1 for numberless clue)
     */
    static fromClues(height: number, width: number, clues: Map<string, number>): MochikoroSolver;
    protected getBranchCandidates(state: MochikoroField): BranchCandidate<MochikoroField>[];
}
export {};
//# sourceMappingURL=mochikoro.d.ts.map