/**
 * Cells Solver
 *
 * Rules:
 * 1. Divide the grid into rooms by drawing walls between cells
 * 2. Each room must contain exactly cellSize cells
 * 3. Numbers indicate how many walls surround that cell (0-4)
 * 4. No pillar (intersection of walls) can have exactly 1 wall extending from it
 * 5. Cells marked with 7 are invalid/blocked cells (treated as walls)
 */
import { WallState, Position, Direction } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class CellsField implements FieldState<CellsField> {
    readonly height: number;
    readonly width: number;
    readonly cellSize: number;
    /** Number clues (null = no number, -1 = invalid cell) */
    private numbers;
    /** Horizontal walls (between col and col+1) */
    private horizontalWalls;
    /** Vertical walls (between row and row+1) */
    private verticalWalls;
    /** Positions that have been fixed (for optimization) */
    private fixedPositions;
    constructor(height: number, width: number, cellSize: number);
    /** Set a number clue */
    setNumber(row: number, col: number, num: number): void;
    /** Get number at position */
    getNumber(row: number, col: number): number | null;
    /** Get horizontal wall state (between col and col+1) */
    getHorizontalWall(row: number, col: number): WallState | null;
    /** Get vertical wall state (between row and row+1) */
    getVerticalWall(row: number, col: number): WallState | null;
    /** Set horizontal wall */
    setHorizontalWall(row: number, col: number, state: WallState): void;
    /** Set vertical wall */
    setVerticalWall(row: number, col: number, state: WallState): void;
    /** Get wall state in a direction from a position */
    getWall(pos: Position, dir: Direction): WallState;
    /** Set wall state in a direction from a position */
    setWall(pos: Position, dir: Direction, state: WallState): void;
    /** Check if two positions are connected (not separated by a wall) */
    isConnected(pos1: Position, pos2: Position): boolean;
    /** Get connected region from position (not separated by WALL state) */
    private getConnectedRegion;
    /** Get white region with size limit (returns false if size exceeds limit) */
    private getWhiteRegionWithLimit;
    private isInBounds;
    /**
     * Room size constraint:
     * - Rooms separated by walls must be divisible by cellSize
     * - Rooms that reach cellSize are complete and surrounded by walls
     * - White regions (connected by NO_WALL) cannot exceed cellSize
     */
    private roomSolve;
    /**
     * Number constraint:
     * - Each number indicates how many walls surround that cell
     */
    private numberSolve;
    /**
     * Pillar constraint:
     * - At each intersection of walls, the number of walls cannot be exactly 1
     */
    private pillarSolve;
    clone(): CellsField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
}
export declare class CellsSolver extends BaseSolver<CellsField> {
    constructor(field: CellsField);
    /**
     * Create solver from URL-style string
     * Format: height/width/cellSize/param
     * Param uses alphabet encoding for gaps and hex for numbers
     */
    static fromString(height: number, width: number, cellSize: number, param: string): CellsSolver;
    protected getBranchCandidates(state: CellsField): BranchCandidate<CellsField>[];
}
//# sourceMappingURL=cells.d.ts.map