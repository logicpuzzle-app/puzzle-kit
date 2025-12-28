/**
 * Heyawake Solver
 *
 * Rules:
 * 1. Paint some cells black
 * 2. Each room has a specified number of black cells (or no constraint if -1)
 * 3. Black cells cannot be adjacent orthogonally
 * 4. All white cells must be connected
 * 5. A horizontal or vertical line of white cells cannot cross more than 2 room borders
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export interface HeyawakeRoom {
    /** Number of black cells required (-1 = no constraint) */
    blackCount: number;
    /** Positions in this room */
    members: Position[];
}
export declare class HeyawakeField implements FieldState<HeyawakeField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Room ID for each cell */
    private roomIds;
    /** List of rooms */
    private rooms;
    /** Horizontal walls (between col and col+1) */
    private horizontalWalls;
    /** Vertical walls (between row and row+1) */
    private verticalWalls;
    /** Pre-computed room candidates (room index -> array of state strings) */
    private roomCandidates;
    /** Whether roomCandidates has been set up */
    private candidatesSetUp;
    constructor(height: number, width: number);
    /** Set room configuration */
    setRooms(rooms: HeyawakeRoom[]): void;
    /** Set wall data */
    setWalls(horizontalWalls: boolean[][], verticalWalls: boolean[][]): void;
    /** Check if there's a horizontal wall between (row, col) and (row, col+1) */
    hasHorizontalWall(row: number, col: number): boolean;
    /** Check if there's a vertical wall between (row, col) and (row+1, col) */
    hasVerticalWall(row: number, col: number): boolean;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white */
    setWhite(row: number, col: number): void;
    /** Get room ID for a cell */
    getRoomId(row: number, col: number): number;
    /** Get room by ID */
    getRoom(roomId: number): HeyawakeRoom | undefined;
    /** Get number of rooms */
    getRoomCount(): number;
    /**
     * Check if a room is rectangular
     */
    private isRoomRectangular;
    /**
     * Set up room candidates - call once at the beginning of solving.
     * Pre-computes valid black cell patterns for rectangular rooms.
     */
    setupRoomCandidates(): void;
    /**
     * Solve using room candidates.
     * Filter candidates based on current state, and deduce cells that are same across all candidates.
     */
    private solveRoomCandidates;
    /**
     * Check if room candidates are exhausted (contradiction)
     */
    private checkRoomCandidatesValid;
    /** Check if any black cells are adjacent */
    private hasAdjacentBlack;
    /** Check if white cells are connected */
    private isWhiteConnected;
    /** Check room constraints validity */
    private checkRoomConstraints;
    /** Check if a line of white cells crosses more than 2 room borders */
    private checkThreeRoomRule;
    /** Room constraint: each room has specified black count */
    private solveRoomConstraints;
    /** Mark neighbors of black cells as white */
    private markBlackNeighborsWhite;
    /** Prevent 3-room crossing by placing black cells */
    private solveContinueRoomConstraint;
    clone(): HeyawakeField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class HeyawakeSolver extends BaseSolver<HeyawakeField> {
    /** Counter for candSolve calls (for difficulty estimation) */
    private candSolveCount;
    constructor(field: HeyawakeField);
    /**
     * Get the number of candSolve calls made during solving.
     * Used for difficulty estimation.
     */
    getCandSolveCount(): number;
    /**
     * SDVX-style candSolve implementation.
     * Tries placing BLACK/WHITE at each unknown cell and checks if either leads to contradiction.
     * If so, the opposite must be true.
     * @param field The field to solve
     * @param recursive Depth of recursive candSolve (0-3)
     * @returns true if no contradiction, false if contradiction found
     */
    private candSolve;
    /**
     * Override solve to use SDVX-style progressive candSolve.
     * First propagates, then tries candSolve at increasing depths (0-3).
     */
    solve(config?: import('../core/solver.js').SolverConfig): import('../core/types.js').SolveResult<HeyawakeField>;
    /**
     * Create solver from room data
     * @param height Grid height
     * @param width Grid width
     * @param rooms Array of rooms with black count and member positions
     * @param horizontalWalls Horizontal wall data
     * @param verticalWalls Vertical wall data
     */
    static fromRooms(height: number, width: number, rooms: HeyawakeRoom[], horizontalWalls: boolean[][], verticalWalls: boolean[][]): HeyawakeSolver;
    /**
     * Create solver from wall data
     * @param height Grid height
     * @param width Grid width
     * @param horizontalWalls Boolean grid for horizontal walls
     * @param verticalWalls Boolean grid for vertical walls
     * @param roomBlackCounts Array of black counts per room (-1 for no constraint)
     */
    static fromWalls(height: number, width: number, horizontalWalls: boolean[][], verticalWalls: boolean[][], roomBlackCounts: number[]): HeyawakeSolver;
    protected getBranchCandidates(state: HeyawakeField): BranchCandidate<HeyawakeField>[];
}
//# sourceMappingURL=heyawake.d.ts.map