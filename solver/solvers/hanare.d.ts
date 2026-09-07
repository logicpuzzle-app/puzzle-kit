/**
 * Hanare Solver
 *
 * Rules:
 * 1. Some cells are divided into rooms by walls
 * 2. Paint exactly one cell black in each room
 * 3. Black cells can be placed at a distance equal to the difference
 *    between their room sizes from each other (in the same row/column)
 *
 * For example, if room sizes are 5 and 3, their black cells must be
 * exactly |5-3| = 2 cells apart in the same row or column.
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class HanareField implements FieldState<HanareField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Horizontal walls (between horizontally adjacent cells) */
    private readonly yokoWall;
    /** Vertical walls (between vertically adjacent cells) */
    private readonly tateWall;
    /** Room definitions - list of sets of positions */
    private readonly rooms;
    /** Fixed black cells from initial puzzle */
    private readonly fixedCells;
    constructor(height: number, width: number);
    /** Initialize from walls and fixed cells */
    initializeFromData(yokoWall: boolean[][], tateWall: boolean[][], fixedPositions: Position[]): void;
    /** Build room definitions from wall data */
    private buildRooms;
    /** Recursively build a room by flood-filling without crossing walls */
    private buildRoomRecursive;
    /** Get room size for a position */
    private getRoomSize;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white */
    setWhite(row: number, col: number): void;
    /**
     * Room constraint: Each room must have exactly 1 black cell
     */
    private roomSolve;
    /**
     * Distance constraint: Black cells can only be placed at specific distances
     * based on their room sizes
     */
    private aroundSolve;
    /**
     * Check distance constraint in one direction from a black cell
     */
    private checkDirectionConstraint;
    clone(): HanareField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class HanareSolver extends BaseSolver<HanareField> {
    constructor(field: HanareField);
    /**
     * Parse puzzle from URL-style parameter string
     * Format: width/height/encoded_data
     *
     * The encoded data contains:
     * 1. Wall data (5 bits per character encoding walls)
     * 2. Fixed black cell positions using hex encoding with intervals
     */
    static fromString(width: number, height: number, param: string): HanareSolver;
    protected getBranchCandidates(state: HanareField): BranchCandidate<HanareField>[];
}
//# sourceMappingURL=hanare.d.ts.map