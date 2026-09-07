/**
 * LITS Solver
 *
 * Rules:
 * 1. Paint exactly 4 cells black in each room to form one of the LITS tetrominoes (L, I, T, S)
 * 2. All black cells must form a single connected group
 * 3. No 2x2 area can be entirely black (no "pools")
 * 4. Identical tetrominoes cannot be adjacent (touching orthogonally)
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export interface LitsRoom {
    /** Positions in this room */
    members: Position[];
}
export declare class LitsField implements FieldState<LitsField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Room ID for each cell */
    private roomIds;
    /** List of rooms */
    private rooms;
    /** Horizontal walls */
    private horizontalWalls;
    /** Vertical walls */
    private verticalWalls;
    static readonly BLACK_COUNT = 4;
    constructor(height: number, width: number);
    /** Set room configuration */
    setRooms(rooms: LitsRoom[]): void;
    /** Set wall data */
    setWalls(horizontalWalls: boolean[][], verticalWalls: boolean[][]): void;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white */
    setWhite(row: number, col: number): void;
    /** Get room ID for a cell */
    getRoomId(row: number, col: number): number;
    /** Get room by ID */
    getRoom(roomId: number): LitsRoom | undefined;
    /** Check for 2x2 black pool */
    private hasBlackPool;
    /** Check if black cells are connected */
    private isBlackConnected;
    /** Get black cells in a room */
    private getRoomBlackCells;
    /** Check if two tetrominoes of same type are adjacent */
    private hasSameTypeAdjacent;
    /** Check room constraints validity */
    private checkRoomConstraints;
    /** Room constraint: each room needs exactly 4 black cells */
    private solveRoomConstraints;
    /** Prevent 2x2 pool */
    private preventPools;
    clone(): LitsField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class LitsSolver extends BaseSolver<LitsField> {
    constructor(field: LitsField);
    /**
     * Create solver from room data
     */
    static fromRooms(height: number, width: number, rooms: LitsRoom[], horizontalWalls?: boolean[][], verticalWalls?: boolean[][]): LitsSolver;
    /**
     * Create solver from wall data
     */
    static fromWalls(height: number, width: number, horizontalWalls: boolean[][], verticalWalls: boolean[][]): LitsSolver;
    protected getBranchCandidates(state: LitsField): BranchCandidate<LitsField>[];
}
//# sourceMappingURL=lits.d.ts.map