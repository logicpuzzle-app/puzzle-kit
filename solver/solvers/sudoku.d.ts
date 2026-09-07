/**
 * Sudoku Solver
 *
 * Rules:
 * 1. Fill each cell with a number from 1-9 (or 1-N for NxN grid)
 * 2. Each row must contain each number exactly once
 * 3. Each column must contain each number exactly once
 * 4. Each box (3x3 for standard 9x9) must contain each number exactly once
 */
import { Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class SudokuField implements FieldState<SudokuField> {
    readonly height: number;
    readonly width: number;
    readonly boxHeight: number;
    readonly boxWidth: number;
    /** Candidates for each cell */
    private candidates;
    /** Fixed numbers (clues) */
    private fixed;
    constructor(size: number, boxHeight?: number, boxWidth?: number);
    /** Set a fixed number (clue) */
    setNumber(row: number, col: number, num: number): void;
    /** Get the value at position (if determined) */
    getValue(row: number, col: number): number | null;
    /** Get candidates at position */
    getCandidates(row: number, col: number): number[];
    /** Eliminate a candidate */
    eliminate(row: number, col: number, num: number): boolean;
    /** Get box top-left corner */
    private getBoxStart;
    /** Naked single: eliminate determined values from peers */
    private nakedSingleElimination;
    /** Hidden single: if a number can only go in one place in a unit, place it */
    private hiddenSingleElimination;
    clone(): SudokuField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get cells with fewest candidates (for branching) */
    getMinCandidateCells(): Position[];
}
export declare class SudokuSolver extends BaseSolver<SudokuField> {
    constructor(field: SudokuField);
    /** Create solver from puzzle string (81 chars for 9x9, . for empty) */
    static fromString(size: number, puzzle: string): SudokuSolver;
    /** Create standard 9x9 solver from string array */
    static fromStringArray(puzzle: string[]): SudokuSolver;
    protected getBranchCandidates(state: SudokuField): BranchCandidate<SudokuField>[];
}
//# sourceMappingURL=sudoku.d.ts.map