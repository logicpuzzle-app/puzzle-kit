/**
 * Box Solver
 *
 * Rules:
 * 1. Paint some cells black
 * 2. Numbers on the top indicate the sum of column indices (1-based) that contain black cells
 * 3. Numbers on the left indicate the sum of row indices (1-based) that contain black cells
 * 4. For example, if a row has black cells in columns 2 and 5, the left hint would be 2+5=7
 * 5. Similarly, if a column has black cells in rows 1, 3, and 4, the top hint would be 1+3+4=8
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class BoxField implements FieldState<BoxField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Top hints (sum of row indices for black cells in each column) */
    private upHints;
    /** Left hints (sum of column indices for black cells in each row) */
    private leftHints;
    constructor(height: number, width: number);
    /** Set top hint for a column */
    setUpHint(col: number, hint: number): void;
    /** Set left hint for a row */
    setLeftHint(row: number, hint: number): void;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white (not black) */
    setWhite(row: number, col: number): void;
    /**
     * Calculate the minimum and maximum possible sum for a row
     * min = sum of column indices (1-based) where cells are definitely black
     * max = sum of column indices where cells could be black (black or unknown)
     */
    private getRowSumRange;
    /**
     * Calculate the minimum and maximum possible sum for a column
     * min = sum of row indices (1-based) where cells are definitely black
     * max = sum of row indices where cells could be black (black or unknown)
     */
    private getColSumRange;
    /**
     * Check if the current state has any contradictions
     * Returns false if contradiction found, true otherwise
     */
    private hintSolve;
    clone(): BoxField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class BoxSolver extends BaseSolver<BoxField> {
    constructor(field: BoxField);
    /**
     * Create solver from URL-style parameter string
     * Format: height/width/hints
     * Hints are encoded using base-32 characters (0-9a-v)
     * First width hints are for columns (top), next height hints are for rows (left)
     * Values > 31 are encoded as -XY where X and Y are base-32 digits
     */
    static fromString(height: number, width: number, param: string): BoxSolver;
    protected getBranchCandidates(state: BoxField): BranchCandidate<BoxField>[];
}
//# sourceMappingURL=box.d.ts.map