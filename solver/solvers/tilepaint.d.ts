/**
 * Tilepaint Solver
 *
 * Rules:
 * 1. Shade some cells black
 * 2. Cells in the same room must all be the same color
 * 3. Numbers between blocks indicate black cell count in that row/column segment
 * 4. Blocks themselves are white and divide the grid into segments
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class TilepaintField implements FieldState<TilepaintField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Horizontal walls (between (y,x) and (y,x+1)) */
    private yokoWall;
    /** Vertical walls (between (y,x) and (y+1,x)) */
    private tateWall;
    /** Rooms (sets of connected positions) */
    private rooms;
    /** Blocks at positions (including -1 indices for edges) */
    private blocks;
    /** Groups (row/column segments with target black counts) */
    private groups;
    constructor(height: number, width: number);
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white */
    setWhite(row: number, col: number): void;
    /** Parse wall and block data from pzv parameter */
    parseParam(param: string): void;
    /** Build rooms from wall information */
    private buildRooms;
    /** Flood fill to find room members */
    private floodFillRoom;
    /** Build groups from blocks */
    private buildGroups;
    /**
     * Room constraint: cells in same room must have same color
     */
    private roomSolve;
    /**
     * Group constraint: black count in each segment
     */
    private groupSolve;
    clone(): TilepaintField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching (one per room) */
    getUnknownCells(): Position[];
}
export declare class TilepaintSolver extends BaseSolver<TilepaintField> {
    constructor(field: TilepaintField);
    /** Create solver from pzv.jp URL format */
    static fromString(height: number, width: number, param: string): TilepaintSolver;
    protected getBranchCandidates(state: TilepaintField): BranchCandidate<TilepaintField>[];
}
//# sourceMappingURL=tilepaint.d.ts.map