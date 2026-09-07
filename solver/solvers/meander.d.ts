/**
 * Meander Solver
 *
 * Rules:
 * 1. Place numbers 1 to N in each room of size N (each number exactly once)
 * 2. Same numbers cannot be adjacent horizontally, vertically, or diagonally
 * 3. Numbers in each room must form a connected path (1→2→3→...→N)
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class MeanderField implements FieldState<MeanderField> {
    readonly height: number;
    readonly width: number;
    /** Number candidates for each cell */
    private numbersCand;
    /** Fixed numbers (for display) */
    private numbers;
    /** Horizontal walls */
    private readonly yokoWall;
    /** Vertical walls */
    private readonly tateWall;
    /** Rooms */
    private rooms;
    constructor(height: number, width: number);
    /** Parse puzzle from pzv.jp parameter */
    parseParam(param: string): void;
    /** Build rooms from wall information */
    private buildRooms;
    /** Flood fill to find room members */
    private floodFillRoom;
    /** Get candidates */
    getCandidates(row: number, col: number): number[];
    /** Set a number */
    setNumber(row: number, col: number, num: number): void;
    /**
     * Room constraint: each number appears exactly once in room
     */
    private roomSolve;
    /**
     * Same numbers cannot be adjacent (including diagonally)
     */
    private aroundSolve;
    /**
     * Numbers must form connected path 1→2→3→...→N in each room
     */
    private nextSolve;
    clone(): MeanderField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get cells with multiple candidates for branching */
    getUnknownCells(): Array<{
        row: number;
        col: number;
        cands: number[];
    }>;
}
export declare class MeanderSolver extends BaseSolver<MeanderField> {
    constructor(field: MeanderField);
    /** Create solver from pzv.jp URL format */
    static fromString(height: number, width: number, param: string): MeanderSolver;
    protected getBranchCandidates(state: MeanderField): BranchCandidate<MeanderField>[];
}
//# sourceMappingURL=meander.d.ts.map