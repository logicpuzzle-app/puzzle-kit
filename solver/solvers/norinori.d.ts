/**
 * Norinori Solver
 *
 * Rules:
 * 1. Paint exactly 2 cells black in each room
 * 2. Each black cell must be adjacent to exactly one other black cell (forming dominoes)
 * 3. No 3 or more black cells in a row/column
 * 4. No 2x2 area can have more than 2 black cells
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class NorinoriField implements FieldState<NorinoriField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Room ID for each cell */
    private roomIds;
    /** List of positions for each room */
    private rooms;
    constructor(height: number, width: number);
    /** Set room configuration from wall data */
    setRooms(rooms: Position[][]): void;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white */
    setWhite(row: number, col: number): void;
    /** Get room ID for a cell */
    getRoomId(row: number, col: number): number;
    /** Get positions in a room */
    getRoom(roomId: number): Position[];
    /** Get number of rooms */
    getRoomCount(): number;
    /** Check for 3+ black cells in a row/column */
    private hasThreeInLine;
    /** Check for 2x2 area with more than 2 black cells */
    private hasTooManyIn2x2;
    /** Check if a black cell is isolated (no adjacent black cells) */
    private hasIsolatedBlack;
    /** Room constraint: each room has exactly 2 black cells */
    private solveRoomConstraints;
    /** Prevent 3-in-a-line and ensure domino formation */
    private solveDominoConstraints;
    /** Prevent 2x2 from having more than 2 blacks */
    private solve2x2Constraint;
    /** Check room constraints validity */
    private checkRoomConstraints;
    clone(): NorinoriField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class NorinoriSolver extends BaseSolver<NorinoriField> {
    constructor(field: NorinoriField);
    /**
     * Create solver from puzzle with room data
     * @param height Grid height
     * @param width Grid width
     * @param rooms Array of rooms, each room is an array of {row, col} positions
     */
    static fromRooms(height: number, width: number, rooms: Position[][]): NorinoriSolver;
    /**
     * Create solver from wall data
     * @param height Grid height
     * @param width Grid width
     * @param horizontalWalls Boolean grid for horizontal walls (height × (width-1))
     * @param verticalWalls Boolean grid for vertical walls ((height-1) × width)
     */
    static fromWalls(height: number, width: number, horizontalWalls: boolean[][], verticalWalls: boolean[][]): NorinoriSolver;
    protected getBranchCandidates(state: NorinoriField): BranchCandidate<NorinoriField>[];
}
//# sourceMappingURL=norinori.d.ts.map