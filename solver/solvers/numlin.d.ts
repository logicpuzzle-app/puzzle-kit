/**
 * Numberlink (Numlin) Solver
 *
 * Rules:
 * 1. Connect pairs of identical numbers with lines
 * 2. Lines go through cell centers, horizontally or vertically
 * 3. Lines cannot cross, branch, or share cells
 * 4. All cells must be used by exactly one line
 *
 * Implementation:
 * - Uses WallState for edges between cells (WALL = no path, NO_WALL = path exists)
 * - Number cells have exactly 1 path (3 walls, 1 opening)
 * - Non-number cells have exactly 2 paths (2 walls, 2 openings) - straight through
 * - At each internal vertex (intersection of 4 walls), at least 2 walls must exist
 * - Different numbers cannot be connected by paths
 */
import { Position, WallState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class NumlinField implements FieldState<NumlinField> {
    readonly height: number;
    readonly width: number;
    /** Numbers at cells (null = empty cell, -1 = unknown number) */
    private numbers;
    /** Horizontal walls (between col and col+1) - WALL = no path, NO_WALL = path exists */
    private yokoWall;
    /** Vertical walls (between row and row+1) - WALL = no path, NO_WALL = path exists */
    private tateWall;
    constructor(height: number, width: number);
    /** Set a number clue */
    setNumber(row: number, col: number, num: number): void;
    /** Get number at position */
    getNumber(row: number, col: number): number | null;
    /** Get horizontal wall state */
    getYokoWall(row: number, col: number): WallState;
    /** Get vertical wall state */
    getTateWall(row: number, col: number): WallState;
    /** Set horizontal wall */
    setYokoWall(row: number, col: number, state: WallState): void;
    /** Set vertical wall */
    setTateWall(row: number, col: number, state: WallState): void;
    /** Count walls and openings around a cell */
    private countWalls;
    /** Get connected cells via NO_WALL paths */
    private getConnectedPath;
    /** Get potentially connected cells (non-WALL edges) */
    private getPotentialPath;
    /**
     * wallSolve(): Each cell has path constraints
     * - Number cells: exactly 1 path (3 walls, 1 opening)
     * - Non-number cells: exactly 2 paths (2 walls, 2 openings) - straight through
     */
    private wallSolve;
    /**
     * pondSolve(): At each internal vertex (intersection of 4 walls),
     * at least 2 walls must exist (cannot have exactly 1 wall)
     */
    private pondSolve;
    /**
     * connectSolve(): Different numbers cannot be connected by paths
     * Same numbers must be potentially connectable
     */
    private connectSolve;
    clone(): NumlinField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown walls for branching */
    getUnknownWalls(): Array<{
        type: 'h' | 'v';
        row: number;
        col: number;
    }>;
}
export declare class NumlinSolver extends BaseSolver<NumlinField> {
    constructor(field: NumlinField);
    /** Create solver from puzzle string array */
    static fromString(height: number, width: number, puzzle: string[]): NumlinSolver;
    /** Create solver from number pairs */
    static fromPairs(height: number, width: number, pairs: Array<{
        num: number;
        positions: [Position, Position];
    }>): NumlinSolver;
    protected getBranchCandidates(state: NumlinField): BranchCandidate<NumlinField>[];
}
//# sourceMappingURL=numlin.d.ts.map