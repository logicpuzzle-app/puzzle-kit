/**
 * Hitori Solver
 *
 * Rules:
 * 1. Shade some cells black
 * 2. No number may appear more than once in each row/column (among unshaded cells)
 * 3. Black cells cannot be adjacent orthogonally
 * 4. All white cells must be connected
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class HitoriField implements FieldState<HitoriField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Numbers in each cell */
    private numbers;
    constructor(height: number, width: number);
    /** Set a number */
    setNumber(row: number, col: number, num: number): void;
    /** Get number at position */
    getNumber(row: number, col: number): number;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white */
    setWhite(row: number, col: number): void;
    /** Check if two black cells are adjacent */
    private hasAdjacentBlack;
    /** Mark neighbors of black cells as white */
    private markBlackNeighborsWhite;
    /** Check for duplicate numbers in rows/columns (among white cells) */
    private hasDuplicateNumbers;
    /** Mark duplicates as black when one cell in a duplicate set is white */
    private solveNumberConstraints;
    /** Check if white cells are connected */
    private isWhiteConnected;
    /** If a cell is the only one that can be white for a number in row/col */
    private solveSingleOption;
    clone(): HitoriField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class HitoriSolver extends BaseSolver<HitoriField> {
    constructor(field: HitoriField);
    /** Create solver from puzzle string (each row is a string of hex digits) */
    static fromString(height: number, width: number, puzzle: string[]): HitoriSolver;
    protected getBranchCandidates(state: HitoriField): BranchCandidate<HitoriField>[];
}
//# sourceMappingURL=hitori.d.ts.map