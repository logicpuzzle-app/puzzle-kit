/**
 * Balance Loop Solver
 *
 * Rules:
 * 1. Draw a single closed loop through white cells
 * 2. White cells have exactly 2 edges (loop passes through)
 * 3. Black cells have 4 edges (walls on all sides, isolated)
 * 4. Numbers in circles indicate total length of arms in 4 directions
 * 5. White circles (balanced): opposite arms must be equal length (up=down and left=right)
 * 6. Black circles (unbalanced): at least one pair of opposite arms differs
 */
import { CellState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/** Wall state for edges between cells */
export declare enum BalanceWallState {
    /** Unknown/undetermined */
    UNKNOWN = "unknown",
    /** Wall exists (edge blocked) */
    WALL = "wall",
    /** No wall (edge open for loop) */
    OPEN = "open"
}
export declare class BalanceField implements FieldState<BalanceField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Numbers in cells (null = no circle) */
    private numbers;
    /** Is the circle black (unbalanced)? */
    private blackNum;
    /** Horizontal walls (between col and col+1) */
    private yokoWall;
    /** Vertical walls (between row and row+1) */
    private tateWall;
    constructor(height: number, width: number);
    /** Set a number clue */
    setNumber(row: number, col: number, num: number, isBlack: boolean): void;
    /** Get number at position */
    getNumber(row: number, col: number): number | null;
    /** Is circle black (unbalanced)? */
    isBlackNum(row: number, col: number): boolean;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white */
    setWhite(row: number, col: number): void;
    /** Get horizontal wall state */
    getYokoWall(row: number, col: number): BalanceWallState;
    /** Get vertical wall state */
    getTateWall(row: number, col: number): BalanceWallState;
    /** Set horizontal wall */
    setYokoWall(row: number, col: number, state: BalanceWallState): void;
    /** Set vertical wall */
    setTateWall(row: number, col: number, state: BalanceWallState): void;
    /** White cells have 2 walls, black cells have 4 walls */
    private nextSolve;
    /** Check number constraints (arm lengths) */
    private limitSolve;
    /** Check white cell connectivity */
    private connectSolve;
    /** Flood fill connected cells via open walls */
    private setContinuePosSet;
    /** Loop rule: open edges crossing a line must be even */
    private oddSolve;
    /** At least one white cell required */
    private finalSolve;
    clone(): BalanceField;
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
export declare class BalanceSolver extends BaseSolver<BalanceField> {
    constructor(field: BalanceField);
    /** Create solver from pzv.jp URL format */
    static fromString(height: number, width: number, param: string): BalanceSolver;
    protected getBranchCandidates(state: BalanceField): BranchCandidate<BalanceField>[];
}
//# sourceMappingURL=balance.d.ts.map