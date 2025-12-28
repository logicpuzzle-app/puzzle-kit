/**
 * Invlitso Solver
 *
 * Rules:
 * 1. Mark exactly 4 cells white in each room to form one of the LITS tetrominoes (L, I, T, S)
 * 2. All white cells must form a single connected group
 * 3. No 2x2 area can be entirely black (no "pools")
 * 4. Identical white tetrominoes cannot be adjacent (touching orthogonally)
 *
 * Note: Invlitso is the inverse of LITS - white cells instead of black cells
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export interface InvlitsoRoom {
    /** Positions in this room */
    members: Position[];
}
export declare class InvlitsoField implements FieldState<InvlitsoField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) - WHITE represents the marked cells */
    private cells;
    /** Room ID for each cell */
    private roomIds;
    /** List of rooms */
    private rooms;
    static readonly WHITE_COUNT = 4;
    constructor(height: number, width: number);
    /** Set room configuration */
    setRooms(rooms: InvlitsoRoom[]): void;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white (the marked cells in Invlitso) */
    setWhite(row: number, col: number): void;
    /** Get room ID for a cell */
    getRoomId(row: number, col: number): number;
    /** Get room by ID */
    getRoom(roomId: number): InvlitsoRoom | undefined;
    /** Check for 2x2 black pool */
    private hasBlackPool;
    /** Check if white cells are connected */
    private isWhiteConnected;
    /** Get white cells in a room */
    private getRoomWhiteCells;
    /** Check if two tetrominoes of same type are adjacent */
    private hasSameTypeAdjacent;
    /** Check room constraints validity */
    private checkRoomConstraints;
    /** Room constraint: each room needs exactly 4 white cells */
    private solveRoomConstraints;
    /** Prevent 2x2 pool of black cells */
    private preventPools;
    /**
     * Capacity solve: Mark cells that cannot reach existing white cells within distance 3
     * This ensures white cells can form valid tetrominoes (max distance in tetromino is 3)
     */
    private capacitySolve;
    /**
     * Collect positions reachable from start within given distance, staying in valid cells
     */
    private collectReachablePositions;
    clone(): InvlitsoField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class InvlitsoSolver extends BaseSolver<InvlitsoField> {
    constructor(field: InvlitsoField);
    /**
     * Create solver from room data
     */
    static fromRooms(height: number, width: number, rooms: InvlitsoRoom[]): InvlitsoSolver;
    /**
     * Create solver from wall data
     */
    static fromWalls(height: number, width: number, horizontalWalls: boolean[][], verticalWalls: boolean[][]): InvlitsoSolver;
    protected getBranchCandidates(state: InvlitsoField): BranchCandidate<InvlitsoField>[];
}
//# sourceMappingURL=invlitso.d.ts.map