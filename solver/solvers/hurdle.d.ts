/**
 * Hurdle Solver
 *
 * Rules:
 * 1. Place walls between cells to divide the grid into rooms
 * 2. Each cell has a number indicating the maximum visible range from that cell
 * 3. The number represents the count of consecutive cells (including itself)
 *    visible in at least one direction (up/right/down/left) until hitting a wall or edge
 * 4. Each cell must have exactly 2 walls around it (in the 4 orthogonal directions)
 * 5. All cells must remain connected (no isolated regions)
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare enum HurdleWallState {
    /** Unknown/undetermined */
    UNKNOWN = "unknown",
    /** Wall exists (blocks passage) */
    EXISTS = "exists",
    /** No wall (passage allowed) */
    NOT_EXISTS = "not_exists"
}
export declare class HurdleField implements FieldState<HurdleField> {
    readonly height: number;
    readonly width: number;
    /** Number hints for each cell (null = no hint) */
    private numbers;
    /** Horizontal walls (between columns) - [row][col] is between (row,col) and (row,col+1) */
    private yokoWall;
    /** Vertical walls (between rows) - [row][col] is between (row,col) and (row+1,col) */
    private tateWall;
    constructor(height: number, width: number);
    /** Set number hint for a cell */
    setNumber(row: number, col: number, value: number | null): void;
    /** Get number hint for a cell */
    getNumber(row: number, col: number): number | null;
    /** Get horizontal wall state */
    getYokoWall(row: number, col: number): HurdleWallState;
    /** Set horizontal wall state */
    setYokoWall(row: number, col: number, state: HurdleWallState): void;
    /** Get vertical wall state */
    getTateWall(row: number, col: number): HurdleWallState;
    /** Set vertical wall state */
    setTateWall(row: number, col: number, state: HurdleWallState): void;
    /**
     * Number constraint: The number represents the maximum count of consecutive cells
     * visible in any direction until hitting a wall or edge
     */
    private numberSolve;
    /**
     * Cell constraint: Each cell must have exactly 2 walls around it
     */
    private masuSolve;
    /**
     * Connectivity constraint: All cells must be connected (no walls can isolate regions)
     */
    private connectSolve;
    /**
     * Recursively add connected cells to the set (flood fill)
     */
    private setContinuePosSet;
    clone(): HurdleField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown walls for branching */
    getUnknownWalls(): {
        type: 'yoko' | 'tate';
        row: number;
        col: number;
    }[];
}
export declare class HurdleSolver extends BaseSolver<HurdleField> {
    constructor(field: HurdleField);
    /**
     * Create solver from number grid
     * @param numbers 2D array of numbers (null for no hint)
     */
    static fromNumbers(numbers: (number | null)[][]): HurdleSolver;
    protected getBranchCandidates(state: HurdleField): BranchCandidate<HurdleField>[];
}
//# sourceMappingURL=hurdle.d.ts.map