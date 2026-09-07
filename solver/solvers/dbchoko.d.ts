/**
 * Double Choco Solver (ダブルチョコ)
 *
 * Rules:
 * 1. The grid is divided into black and white cells (pre-determined)
 * 2. Draw walls to divide the grid into regions (blocks)
 * 3. Each block contains cells of only one color
 * 4. Numbers indicate the size of the block containing that number
 * 5. Each block must be adjacent to exactly one block of the opposite color
 *    with the same shape and size
 * 6. At each intersection (pillar), either 0 or 2+ walls must meet (not exactly 1)
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
declare enum WallState {
    UNKNOWN = 0,
    EXISTS = 1,
    NOT_EXISTS = 2
}
export declare class DbchokoField implements FieldState<DbchokoField> {
    readonly height: number;
    readonly width: number;
    /** Cell colors (pre-determined) */
    private colors;
    /** Numbers (null = no number, -1 = unknown number) */
    private numbers;
    /** Horizontal walls (between col and col+1) */
    private yokoWall;
    /** Vertical walls (between row and row+1) */
    private tateWall;
    constructor(height: number, width: number);
    /** Parse puzzle from pzv.jp parameter */
    parseParam(param: string): void;
    /** Check if there's a wall between two adjacent cells */
    private hasWall;
    /** Set wall between two adjacent cells */
    private setWall;
    /** Find connected region with same color, respecting wall constraints */
    private findRegion;
    /**
     * Number constraint: region size must match number
     */
    private roomSolve;
    /**
     * Pillar constraint: walls meeting at intersection must be 0 or 2+ (not 1)
     */
    private pileSolve;
    /**
     * Color boundary: different colors must have a wall between them
     */
    private colorBoundarySolve;
    clone(): DbchokoField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown walls for branching */
    getUnknownWalls(): Array<{
        type: 'yoko' | 'tate';
        row: number;
        col: number;
    }>;
    /** Set wall state */
    setWallState(type: 'yoko' | 'tate', row: number, col: number, state: WallState): void;
}
export declare class DbchokoSolver extends BaseSolver<DbchokoField> {
    constructor(field: DbchokoField);
    /** Create solver from pzv.jp URL format */
    static fromString(height: number, width: number, param: string): DbchokoSolver;
    protected getBranchCandidates(state: DbchokoField): BranchCandidate<DbchokoField>[];
}
export {};
//# sourceMappingURL=dbchoko.d.ts.map