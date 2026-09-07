/**
 * Country Road Solver
 *
 * Rules:
 * 1. Place white cells forming a single loop (each white cell connects to exactly 2 neighbors)
 * 2. Each room has a number indicating how many white cells it contains
 * 3. Black cells cannot be adjacent across room borders
 * 4. Each room's border must be crossed exactly twice by the loop
 * 5. The number of border crossings in each row/column must be even
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class CountryField implements FieldState<CountryField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN=undecided, WHITE=loop, BLACK=not loop) */
    private cells;
    /** Room walls (horizontal) - fixed */
    private readonly yokoRoomWall;
    /** Room walls (vertical) - fixed */
    private readonly tateRoomWall;
    /** Path walls (horizontal) - can be set during solving */
    private yokoWall;
    /** Path walls (vertical) - can be set during solving */
    private tateWall;
    /** Rooms */
    private rooms;
    constructor(height: number, width: number);
    /** Parse puzzle from pzv.jp parameter */
    parseParam(param: string): void;
    /** Build rooms from wall information */
    private buildRooms;
    /** Flood fill to find room members */
    private floodFillRoom;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to white (loop) */
    setWhite(row: number, col: number): void;
    /** Set cell to black (not loop) */
    setBlack(row: number, col: number): void;
    /**
     * Room constraint: count of white cells must match number
     */
    private roomSolve;
    /**
     * Wall and neighbor constraint:
     * - Black cells have walls on all sides
     * - White cells have exactly 2 open walls (loop constraint)
     */
    private nextSolve;
    /**
     * Black cells cannot be adjacent across room borders
     */
    private blackSolve;
    /**
     * Each room's border must be crossed exactly twice
     */
    private countrySolve;
    /**
     * Number of border crossings in each row/column must be even
     */
    private oddSolve;
    /**
     * White cells must form a single connected loop
     */
    private connectSolve;
    clone(): CountryField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class CountrySolver extends BaseSolver<CountryField> {
    constructor(field: CountryField);
    /** Create solver from pzv.jp URL format */
    static fromString(height: number, width: number, param: string): CountrySolver;
    protected getBranchCandidates(state: CountryField): BranchCandidate<CountryField>[];
}
//# sourceMappingURL=country.d.ts.map