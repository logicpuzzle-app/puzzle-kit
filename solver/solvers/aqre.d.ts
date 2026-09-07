/**
 * Aqre Solver
 *
 * Rules:
 * 1. Paint some cells black
 * 2. Each room has a specified number of black cells (or no constraint if -1)
 * 3. No 4 or more consecutive black cells in a row/column
 * 4. No 4 or more consecutive white cells in a row/column
 * 5. All black cells must be connected
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export interface AqreRoom {
    /** Number of black cells required (-1 = no constraint) */
    blackCount: number;
    /** Positions in this room */
    members: Position[];
}
export declare class AqreField implements FieldState<AqreField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Room ID for each cell */
    private roomIds;
    /** List of rooms */
    private rooms;
    constructor(height: number, width: number);
    /** Set room configuration */
    setRooms(rooms: AqreRoom[]): void;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white */
    setWhite(row: number, col: number): void;
    /** Get room ID for a cell */
    getRoomId(row: number, col: number): number;
    /** Get room by ID */
    getRoom(roomId: number): AqreRoom | undefined;
    /** Get number of rooms */
    getRoomCount(): number;
    /** Check for 4+ consecutive cells of same color */
    private hasFourConsecutive;
    /** Check if black cells are connected */
    private isBlackConnected;
    /** Check room constraints validity */
    private checkRoomConstraints;
    /** Room constraint: each room has specified black count */
    private solveRoomConstraints;
    /** Prevent 4 consecutive same-color cells */
    private solveFourConsecutiveConstraint;
    clone(): AqreField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class AqreSolver extends BaseSolver<AqreField> {
    constructor(field: AqreField);
    /**
     * Create solver from room data
     * @param height Grid height
     * @param width Grid width
     * @param rooms Array of rooms with black count and member positions
     */
    static fromRooms(height: number, width: number, rooms: AqreRoom[]): AqreSolver;
    /**
     * Create solver from wall data
     * @param height Grid height
     * @param width Grid width
     * @param horizontalWalls Boolean grid for horizontal walls
     * @param verticalWalls Boolean grid for vertical walls
     * @param roomBlackCounts Array of black counts per room (-1 for no constraint)
     */
    static fromWalls(height: number, width: number, horizontalWalls: boolean[][], verticalWalls: boolean[][], roomBlackCounts: number[]): AqreSolver;
    protected getBranchCandidates(state: AqreField): BranchCandidate<AqreField>[];
}
//# sourceMappingURL=aqre.d.ts.map