/**
 * Onsen (Hot Springs) Solver
 *
 * Rules:
 * 1. White cells form a path through rooms
 * 2. Each white cell has exactly 2 connections (forms a single non-branching path)
 * 3. Number clues indicate how many cells the path visits in that room
 * 4. Black cells block paths and are surrounded by walls
 * 5. Each room must have at least one white cell
 */
import { Position, CellState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class OnsenField implements FieldState<OnsenField> {
    readonly height: number;
    readonly width: number;
    /** Cell states */
    private cells;
    /** Number clues */
    private numbers;
    /** Room walls - horizontal */
    private yokoRoomWall;
    /** Room walls - vertical */
    private tateRoomWall;
    /** Path walls - horizontal */
    private yokoWall;
    /** Path walls - vertical */
    private tateWall;
    /** Rooms */
    private rooms;
    constructor(height: number, width: number);
    /** Parse puzzle from pzv.jp format */
    parseParam(param: string): void;
    /** Build rooms from wall data */
    private buildRooms;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell state */
    setCell(row: number, col: number, state: CellState): void;
    /**
     * Path constraint: white cells have exactly 2 connections
     * Black cells are surrounded by walls
     */
    private nextSolve;
    /** Each room must have at least one white cell */
    private roomSolve;
    /** Wall parity: each row/column crossing must be even */
    private oddSolve;
    clone(): OnsenField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
    /** Get unknown walls for branching */
    getUnknownWalls(): Array<{
        type: 'yoko' | 'tate';
        row: number;
        col: number;
    }>;
}
export declare class OnsenSolver extends BaseSolver<OnsenField> {
    constructor(field: OnsenField);
    /** Create solver from pzv.jp URL format */
    static fromURL(height: number, width: number, param: string): OnsenSolver;
    protected getBranchCandidates(state: OnsenField): BranchCandidate<OnsenField>[];
}
//# sourceMappingURL=onsen.d.ts.map