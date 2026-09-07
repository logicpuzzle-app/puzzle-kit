/**
 * Ichimaga Solver
 *
 * Rules:
 * 1. Divide the grid into rooms by drawing walls along grid edges
 * 2. Each cell is either black or white (not black)
 * 3. Black cells are completely surrounded by walls (4 walls)
 * 4. White cells have exactly 2 walls (forming a path through the cell)
 * 5. Numbered cells indicate the exact number of non-walled sides (paths out)
 * 6. White cells form a single connected region
 * 7. In Ichimaga mode: paths from numbered cells cannot turn more than once
 *    (the path between two numbers must be straight or make at most one turn)
 * 8. In Ichimagam mode: additional constraint that same numbers cannot be
 *    on the same straight path (no two cells with same number in one line)
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare enum IchimagaCellState {
    /** Unknown */
    UNKNOWN = "unknown",
    /** White cell (not black) - has exactly 2 walls */
    WHITE = "white",
    /** Black cell - completely surrounded by walls */
    BLACK = "black"
}
export declare class IchimagaField implements FieldState<IchimagaField> {
    readonly height: number;
    readonly width: number;
    private readonly ichimagam;
    /** Cell states (black/white/unknown) */
    private masu;
    /** Numbered cells (null = no number, -1 = non-numbered white cell) */
    private numbers;
    /** Horizontal walls (between cells horizontally) */
    private yokoWall;
    /** Vertical walls (between cells vertically) */
    private tateWall;
    constructor(height: number, width: number, ichimagam?: boolean);
    /** Set number at cell */
    setNumber(row: number, col: number, num: number): void;
    /** Get number at cell */
    getNumber(row: number, col: number): number | null;
    /** Get cell state */
    getCellState(row: number, col: number): IchimagaCellState;
    /** Set cell state */
    setCellState(row: number, col: number, state: IchimagaCellState): void;
    /** Get wall state for direction from cell */
    private getWall;
    /** Set wall state for direction from cell */
    private setWall;
    /** Count walls around cell */
    private countWalls;
    /**
     * Apply basic constraints:
     * - Black cells must have all walls
     * - White cells must have exactly 2 walls
     * - Number cells must match their number
     */
    private nextSolve;
    /**
     * Ichimaga constraint: paths from numbered cells can turn at most once.
     * This means if a non-numbered cell has two opposite non-walls (corner),
     * both directions must lead to a numbered cell.
     */
    private ichimagaSolve;
    /**
     * White cells must form a single connected region
     */
    private connectSolve;
    /**
     * Recursively collect connected white cells (no wall between them)
     */
    private collectConnected;
    clone(): IchimagaField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown walls for branching */
    getUnknownWalls(): Array<{
        type: 'h' | 'v';
        row: number;
        col: number;
    }>;
}
export declare class IchimagaSolver extends BaseSolver<IchimagaField> {
    constructor(field: IchimagaField);
    /**
     * Create solver from pzv.jp URL format
     * Format: encoded numbers with positions
     */
    static fromString(height: number, width: number, param: string, ichimagam?: boolean): IchimagaSolver;
    protected getBranchCandidates(state: IchimagaField): BranchCandidate<IchimagaField>[];
}
//# sourceMappingURL=ichimaga.d.ts.map