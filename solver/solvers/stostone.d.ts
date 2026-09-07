/**
 * Stostone Solver
 *
 * Rules:
 * 1. Paint some cells black (stones) in each room
 * 2. Each room has a specified number of black cells (or at least 1 if -1)
 * 3. Each column must have exactly half of its cells black
 * 4. Black cells from different rooms cannot be adjacent
 * 5. When stones "fall" (gravity), they must all fit in the bottom half
 * 6. Connected black cells in the same room fall as one unit
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export interface StostoneRoom {
    /** Number of black cells required (-1 = at least 1) */
    blackCount: number;
    /** Positions in this room */
    members: Position[];
}
export declare class StostoneField implements FieldState<StostoneField> {
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
    /** Get half height (target for stones to fit in bottom) */
    get halfHeight(): number;
    /** Set room configuration */
    setRooms(rooms: StostoneRoom[]): void;
    /** Set walls */
    setWalls(yokoWall: boolean[][], tateWall: boolean[][]): void;
    /** Check if there's a wall between two adjacent positions */
    private hasWall;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white */
    setWhite(row: number, col: number): void;
    /** Get room ID for a cell */
    getRoomId(row: number, col: number): number;
    /** Get room by ID */
    getRoom(roomId: number): StostoneRoom | undefined;
    /**
     * Simulate dropping stones and return the resulting grid
     * Stones fall down and connected stones in the same room fall together
     */
    private drop;
    /**
     * Calculate drop distances for all positions
     */
    private makePositionMap;
    /**
     * Find all connected black cells in the same room
     */
    private setBlackGroupPosSet;
    /**
     * Room constraint: each room has specified black count
     */
    private roomSolve;
    /**
     * Column constraint: each column has exactly halfHeight black cells
     */
    private verticalSolve;
    /**
     * Different room black cells cannot be adjacent
     */
    private nextSolve;
    /**
     * Check that dropped stones fit in bottom half
     */
    private dropAndCheck;
    clone(): StostoneField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class StostoneSolver extends BaseSolver<StostoneField> {
    constructor(field: StostoneField);
    /**
     * Create solver from room data
     * @param height Grid height
     * @param width Grid width
     * @param rooms Array of rooms with black count and member positions
     * @param yokoWall Horizontal wall array
     * @param tateWall Vertical wall array
     */
    static fromRooms(height: number, width: number, rooms: StostoneRoom[], yokoWall: boolean[][], tateWall: boolean[][]): StostoneSolver;
    protected getBranchCandidates(state: StostoneField): BranchCandidate<StostoneField>[];
}
//# sourceMappingURL=stostone.d.ts.map