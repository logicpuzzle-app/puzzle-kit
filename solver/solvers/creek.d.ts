/**
 * Creek Solver
 *
 * Rules:
 * 1. Paint some cells black
 * 2. Numbers are placed at cell corners (vertices)
 * 3. A number indicates how many of the (up to 4) cells adjacent to that corner are black
 * 4. All white cells must be connected orthogonally
 * 5. At least one cell must be black
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class CreekField implements FieldState<CreekField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Numbers at corners (extraNumbers[y][x] is corner at top-left of cell [y][x]) */
    /** Size is (height+1) x (width+1) to cover all corners */
    private extraNumbers;
    constructor(height: number, width: number);
    /** Set a corner number (null = no hint, -1 = unknown) */
    setCornerNumber(row: number, col: number, num: number | null): void;
    /** Get corner number */
    getCornerNumber(row: number, col: number): number | null;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white */
    setWhite(row: number, col: number): void;
    /**
     * Get the 4 cells adjacent to a corner at (row, col)
     * Corner (row, col) is adjacent to cells:
     * - up-right: (row-1, col)
     * - right-down: (row, col)
     * - down-left: (row, col-1)
     * - left-up: (row-1, col-1)
     */
    private getCornerCells;
    /**
     * Solve corner number constraints
     */
    private aroundSolve;
    /**
     * Check that all white cells are connected
     */
    private connectSolve;
    /**
     * Flood fill connected positions via non-BLACK cells
     */
    private setContinuePosSet;
    /**
     * At least one cell must be black
     */
    private finalSolve;
    clone(): CreekField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class CreekSolver extends BaseSolver<CreekField> {
    constructor(field: CreekField);
    /** Create solver from pzv.jp URL format */
    static fromString(height: number, width: number, param: string): CreekSolver;
    protected getBranchCandidates(state: CreekField): BranchCandidate<CreekField>[];
}
//# sourceMappingURL=creek.d.ts.map