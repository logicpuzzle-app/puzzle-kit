/**
 * Mukkonn Solver
 *
 * Rules:
 * 1. Divide the grid into regions by placing walls between cells
 * 2. Each cell must have exactly 2 walls on its 4 edges (including grid boundary)
 * 3. Compass clues show how many cells are visible in each direction (up/right/down/left)
 *    - A number indicates exactly that many cells visible in that direction
 *    - No number (-1) means that direction is unknown
 * 4. All regions must be connected (no isolated regions)
 * 5. Each row and column must have an even number of vertical/horizontal passages
 */
import { WallState, Direction } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/** Mukkonn compass clue showing visible cells in each direction */
export interface MukokonnCompass {
    /** Cells visible upward (-1 = no constraint) */
    up: number;
    /** Cells visible rightward (-1 = no constraint) */
    right: number;
    /** Cells visible downward (-1 = no constraint) */
    down: number;
    /** Cells visible leftward (-1 = no constraint) */
    left: number;
}
export declare class MukokonnField implements FieldState<MukokonnField> {
    readonly height: number;
    readonly width: number;
    /** Compass clues (null = no compass at this position) */
    private compasses;
    /** Horizontal walls (between vertically adjacent cells) */
    private horizontalWalls;
    /** Vertical walls (between horizontally adjacent cells) */
    private verticalWalls;
    constructor(height: number, width: number);
    /** Set compass at position */
    setCompass(row: number, col: number, compass: MukokonnCompass): void;
    /** Get compass at position */
    getCompass(row: number, col: number): MukokonnCompass | null;
    /** Get horizontal wall below cell (row, col) */
    getHorizontalWall(row: number, col: number): WallState;
    /** Get vertical wall to the right of cell (row, col) */
    getVerticalWall(row: number, col: number): WallState;
    /** Set horizontal wall below cell (row, col) */
    setHorizontalWall(row: number, col: number, state: WallState): void;
    /** Set vertical wall to the right of cell (row, col) */
    setVerticalWall(row: number, col: number, state: WallState): void;
    /** Get wall state in a direction from a cell */
    getWallInDirection(row: number, col: number, dir: Direction): WallState;
    /** Set wall state in a direction from a cell */
    setWallInDirection(row: number, col: number, dir: Direction, state: WallState): void;
    /** Check if each cell has exactly 2 walls */
    private checkTwoWallsPerCell;
    /** Apply compass constraint: count visible cells in each direction */
    private applyCompassConstraints;
    /** Extend passage from (row, col) in direction for exactly count cells */
    private extendPassage;
    /** Check if passage can extend from (row, col) in direction for count cells */
    private canExtendPassage;
    /** Get wall state between two adjacent cells */
    private getWallBetween;
    /** Set wall state between two adjacent cells */
    private setWallBetween;
    /** Get opposite direction */
    private oppositeDir;
    /** Check if position is in bounds */
    private inBounds;
    /** Check connectivity of all regions */
    private checkConnectivity;
    /** Check even number of passages in each row/column */
    private checkEvenPassages;
    clone(): MukokonnField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown walls for branching */
    getUnknownWalls(): Array<{
        type: 'horizontal' | 'vertical';
        row: number;
        col: number;
    }>;
}
export declare class MukokonnSolver extends BaseSolver<MukokonnField> {
    constructor(field: MukokonnField);
    /**
     * Create solver from puzz.link URL format
     * Format: mukkonn/width/height/param
     * Param encoding: compass clues with gaps (g-z = 1-20 empty cells)
     * Each compass: 4 chars for up/down/left/right (. = no constraint, digit = count)
     */
    static fromString(height: number, width: number, param: string): MukokonnSolver;
    protected getBranchCandidates(state: MukokonnField): BranchCandidate<MukokonnField>[];
}
//# sourceMappingURL=mukkonn.d.ts.map