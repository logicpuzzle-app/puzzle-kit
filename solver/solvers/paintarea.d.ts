/**
 * Paintarea Solver
 *
 * Rules:
 * 1. Divide the grid into rooms (pre-defined)
 * 2. Each room must be entirely black or entirely white
 * 3. Numbers indicate how many adjacent cells (orthogonally) are black
 * 4. No 2x2 area can be entirely black or entirely white
 * 5. All black cells must be connected
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class PaintareaField implements FieldState<PaintareaField> {
    readonly height: number;
    readonly width: number;
    /** Cell states */
    private cells;
    /** Numbers (null = no number, -1 = question mark) */
    private numbers;
    /** Horizontal walls */
    private yokoWall;
    /** Vertical walls */
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
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white */
    setWhite(row: number, col: number): void;
    /**
     * Room constraint: all cells in a room must be same color
     */
    private roomSolve;
    /**
     * Number constraint: adjacent black cells must match number
     */
    private numberSolve;
    /**
     * Pond constraint: no 2x2 of same color
     */
    private pondSolve;
    /**
     * Connectivity: all black cells must be connected
     */
    private connectSolve;
    /** Flood fill connected black cells (including unknown) */
    private floodFillBlack;
    clone(): PaintareaField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching (one per room) */
    getUnknownRoomCells(): Position[];
}
export declare class PaintareaSolver extends BaseSolver<PaintareaField> {
    constructor(field: PaintareaField);
    /** Create solver from pzv.jp URL format */
    static fromString(height: number, width: number, param: string): PaintareaSolver;
    protected getBranchCandidates(state: PaintareaField): BranchCandidate<PaintareaField>[];
}
//# sourceMappingURL=paintarea.d.ts.map