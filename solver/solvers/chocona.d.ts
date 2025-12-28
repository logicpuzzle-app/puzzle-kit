/**
 * Chocona (Chocolate) Solver
 *
 * Rules:
 * 1. Paint some cells black in each room
 * 2. Each room has a specified number of black cells (or any if -1)
 * 3. All black cells must form rectangular regions
 * 4. Black cells must form rectangles (no L-shapes allowed)
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export interface ChoconaRoom {
    /** Number of black cells required (-1 = any) */
    blackCount: number;
    /** Positions in this room */
    members: Position[];
}
export declare class ChoconaField implements FieldState<ChoconaField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Room ID for each cell */
    private roomIds;
    /** List of rooms */
    private rooms;
    /** Horizontal walls */
    private yokoWall;
    /** Vertical walls */
    private tateWall;
    constructor(height: number, width: number);
    /** Set room configuration */
    setRooms(rooms: ChoconaRoom[]): void;
    /** Set walls */
    setWalls(yokoWall: boolean[][], tateWall: boolean[][]): void;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white */
    setWhite(row: number, col: number): void;
    /** Get room ID for a cell */
    getRoomId(row: number, col: number): number;
    /** Get room by ID */
    getRoom(roomId: number): ChoconaRoom | undefined;
    /**
     * Room constraint: each room has specified black count
     */
    private roomSolve;
    /**
     * Rectangle constraint: black cells must form rectangles (no L-shapes)
     * Check 2x2 patterns and enforce rectangle formation
     */
    private rectSolve;
    clone(): ChoconaField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class ChoconaSolver extends BaseSolver<ChoconaField> {
    constructor(field: ChoconaField);
    /**
     * Create solver from room data
     * @param height Grid height
     * @param width Grid width
     * @param rooms Array of rooms with black count and member positions
     * @param yokoWall Horizontal wall array
     * @param tateWall Vertical wall array
     */
    static fromRooms(height: number, width: number, rooms: ChoconaRoom[], yokoWall: boolean[][], tateWall: boolean[][]): ChoconaSolver;
    protected getBranchCandidates(state: ChoconaField): BranchCandidate<ChoconaField>[];
}
//# sourceMappingURL=chocona.d.ts.map