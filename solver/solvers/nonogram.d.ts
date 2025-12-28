/**
 * Nonogram (Picross / Paint by Numbers) Solver
 *
 * Rules:
 * 1. Fill in cells to match row and column clues
 * 2. Row clues indicate consecutive runs of filled cells from left to right
 * 3. Column clues indicate consecutive runs of filled cells from top to bottom
 * 4. Each number represents a consecutive group of filled cells
 * 5. Groups must be separated by at least one empty cell
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class NonogramField implements FieldState<NonogramField> {
    readonly height: number;
    readonly width: number;
    /** Cell states */
    private cells;
    /** Row hints (left side) - each row has an array of numbers */
    private rowHints;
    /** Column hints (top) - each column has an array of numbers */
    private colHints;
    /** Row candidates - for each row, list of valid cell patterns */
    private rowCandidates;
    /** Column candidates */
    private colCandidates;
    constructor(height: number, width: number);
    /** Set row hints */
    setRowHints(row: number, hints: number[]): void;
    /** Set column hints */
    setColHints(col: number, hints: number[]): void;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell state */
    setCell(row: number, col: number, state: CellState): void;
    /** Initialize candidates after all hints are set */
    initializeCandidates(): void;
    /** Generate all possible candidate patterns for a line */
    private generateCandidates;
    /** Filter candidates based on current cell states and update cells */
    private candSolve;
    clone(): NonogramField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class NonogramSolver extends BaseSolver<NonogramField> {
    constructor(field: NonogramField);
    /** Create solver with hints */
    static create(height: number, width: number, config: {
        rowHints: number[][];
        colHints: number[][];
    }): NonogramSolver;
    /**
     * Create solver from puzz.link URL format
     * URL format: http://puzz.link/p?nonogram/width/height/hints
     * Example: http://puzz.link/p?nonogram/5/5/3h1j2i2h3
     */
    static fromPuzzLinkUrl(url: string): NonogramSolver;
    /**
     * Create solver from puzz.link parameter string
     * Format uses hex encoding with special characters for spacing
     */
    static fromPuzzLinkParam(height: number, width: number, param: string): NonogramSolver;
    protected getBranchCandidates(state: NonogramField): BranchCandidate<NonogramField>[];
}
//# sourceMappingURL=nonogram.d.ts.map