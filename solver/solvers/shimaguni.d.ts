/**
 * Shimaguni (Islands) Solver
 *
 * Rules:
 * 1. Paint some cells black (islands) in each room
 * 2. Each room has a specified number of black cells (-1 = at least 1)
 * 3. Adjacent rooms cannot have the same number of black cells
 * 4. Black cells from different rooms cannot be orthogonally adjacent
 * 5. Black cells within a room must form a connected region
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export interface ShimaguniRoom {
    /** Number of black cells required (-1 = at least 1) */
    blackCount: number;
    /** Positions in this room */
    members: Position[];
}
export declare class ShimaguniField implements FieldState<ShimaguniField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Room ID for each cell */
    private roomIds;
    /** List of rooms */
    private rooms;
    /** Adjacent rooms for each room */
    private adjacentRooms;
    /** Horizontal walls */
    private yokoWall;
    /** Vertical walls */
    private tateWall;
    constructor(height: number, width: number);
    /** Set room configuration */
    setRooms(rooms: ShimaguniRoom[]): void;
    /** Compute adjacent rooms */
    private computeAdjacentRooms;
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
    getRoom(roomId: number): ShimaguniRoom | undefined;
    /**
     * Get black count candidates for a room considering adjacent rooms
     */
    private getBlackCountCandidates;
    /**
     * Get basic black count candidates for a room (ignoring adjacent rooms)
     */
    private getRoomBlackCountCandidates;
    /**
     * Room constraint: each room has specified black count
     */
    private roomSolve;
    /**
     * Adjacent constraint: different room black cells cannot be adjacent
     */
    private nextSolve;
    /**
     * Check if there's a wall between two adjacent positions
     */
    private hasWall;
    /**
     * Capacity constraint: black cells must be reachable from existing black cells
     */
    private capacitySolve;
    /**
     * Expand from pivot cells by distance, staying within room and non-white cells
     */
    private expandWithDistance;
    clone(): ShimaguniField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class ShimaguniSolver extends BaseSolver<ShimaguniField> {
    constructor(field: ShimaguniField);
    /**
     * Create solver from room data
     * @param height Grid height
     * @param width Grid width
     * @param rooms Array of rooms with black count and member positions
     * @param yokoWall Horizontal wall array
     * @param tateWall Vertical wall array
     */
    static fromRooms(height: number, width: number, rooms: ShimaguniRoom[], yokoWall: boolean[][], tateWall: boolean[][]): ShimaguniSolver;
    protected getBranchCandidates(state: ShimaguniField): BranchCandidate<ShimaguniField>[];
}
//# sourceMappingURL=shimaguni.d.ts.map