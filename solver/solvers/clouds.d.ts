/**
 * Clouds Solver
 *
 * Rules:
 * 1. Shade some cells to form rectangular clouds (at least 2x2)
 * 2. Numbers on the left indicate total black cells in that row
 * 3. Numbers on the top indicate total black cells in that column
 * 4. Clouds cannot touch each other, even diagonally
 * 5. Each cloud must be at least 2 cells wide and 2 cells tall
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class CloudsField implements FieldState<CloudsField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Row hints (left side) */
    private leftHints;
    /** Column hints (top) */
    private upHints;
    constructor(height: number, width: number);
    /** Set row hint */
    setLeftHint(row: number, hint: number): void;
    /** Set column hint */
    setUpHint(col: number, hint: number): void;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white */
    setWhite(row: number, col: number): void;
    /**
     * Cloud shape constraint: clouds must be rectangular (2x2 or larger)
     * Diagonal adjacency propagation
     */
    private cloudsSolve;
    /**
     * Hints constraint: count black cells in rows/columns
     */
    private hintsSolve;
    clone(): CloudsField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class CloudsSolver extends BaseSolver<CloudsField> {
    constructor(field: CloudsField);
    /** Create solver from hints */
    static fromHints(height: number, width: number, leftHints: (number | null)[], upHints: (number | null)[]): CloudsSolver;
    protected getBranchCandidates(state: CloudsField): BranchCandidate<CloudsField>[];
}
//# sourceMappingURL=clouds.d.ts.map