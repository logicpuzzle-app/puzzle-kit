/**
 * Hakoiri (箱入り) Solver
 *
 * Rules:
 * 1. Each cell contains a symbol: ○ (circle/1), △ (triangle/2), □ (square/3), or ・ (empty/0)
 * 2. The same symbol cannot be adjacent orthogonally or diagonally
 * 3. Each room must contain exactly one of each non-empty symbol (○, △, □)
 * 4. All non-empty symbols must form a single connected group
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class HakoiriField implements FieldState<HakoiriField> {
    readonly height: number;
    readonly width: number;
    /** Symbol candidates for each cell (0=empty, 1=○, 2=△, 3=□) */
    private numbersCand;
    /** Fixed numbers (for display) */
    private numbers;
    /** Horizontal walls: yokoWall[y][x] means wall between (y,x) and (y,x+1) */
    private yokoWall;
    /** Vertical walls: tateWall[y][x] means wall between (y,x) and (y+1,x) */
    private tateWall;
    /** Rooms: each room is a set of positions */
    private rooms;
    constructor(height: number, width: number);
    /** Set walls and build rooms */
    setWalls(yokoWall: boolean[][], tateWall: boolean[][]): void;
    /** Set a fixed number at position */
    setNumber(row: number, col: number, num: number): void;
    /** Build rooms from walls */
    private buildRooms;
    /** Flood fill to find connected cells in same room */
    private floodFillRoom;
    /** Initialize candidates based on room size */
    private initCandidates;
    /** Same symbols cannot be adjacent orthogonally or diagonally */
    private numberSolve;
    /** Each room must contain exactly one of each symbol (1, 2, 3) */
    private roomSolve;
    /** All non-empty symbols must be connected */
    private connectSolve;
    /** Flood fill through non-empty cells (orthogonal only) */
    private floodFillSymbols;
    clone(): HakoiriField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get branching info */
    getBranchInfo(): {
        row: number;
        col: number;
        candidates: number[];
    } | null;
    /** Set cell to specific value */
    setCell(row: number, col: number, value: number): void;
}
export declare class HakoiriSolver extends BaseSolver<HakoiriField> {
    constructor(field: HakoiriField);
    /** Create solver from pzprv3 URL parameter */
    static fromString(height: number, width: number, param: string): HakoiriSolver;
    protected getBranchCandidates(state: HakoiriField): BranchCandidate<HakoiriField>[];
}
//# sourceMappingURL=hakoiri.d.ts.map