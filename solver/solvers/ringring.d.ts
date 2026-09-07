/**
 * Ring Ring Solver
 *
 * Rules:
 * 1. Draw walls to divide the grid into regions
 * 2. Black cells must be completely surrounded by walls
 * 3. Each white cell must have exactly 0 or 2 walls around it (forming rectangles)
 * 4. The white cells with walls form rectangular loops (rings)
 */
import { FieldState } from '../core/field.js';
import { WallState } from '../core/types.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class RingringField implements FieldState<RingringField> {
    readonly height: number;
    readonly width: number;
    /** Black cells (immutable after initialization) */
    private masu;
    /** Horizontal walls (between columns) */
    private yokoWall;
    /** Vertical walls (between rows) */
    private tateWall;
    constructor(height: number, width: number);
    /** Set a cell as black */
    setBlack(row: number, col: number): void;
    /** Check if cell is black */
    isBlack(row: number, col: number): boolean;
    /** Get horizontal wall state */
    getYokoWall(row: number, col: number): WallState;
    /** Get vertical wall state */
    getTateWall(row: number, col: number): WallState;
    /** Set horizontal wall */
    setYokoWall(row: number, col: number, state: WallState): void;
    /** Set vertical wall */
    setTateWall(row: number, col: number, state: WallState): void;
    /**
     * White cells must have exactly 0 or 2 walls.
     * Returns false if constraints are violated.
     */
    private nextSolve;
    /**
     * Check that white cells form valid rectangles.
     * Returns false if rectangle constraint is violated.
     */
    private connectSolve;
    /**
     * Follow the rectangle from a corner, checking validity.
     * Returns false if rectangle doesn't close properly.
     */
    private setContinuePosSet;
    /**
     * Each row/column must be crossed by an even number of no-walls.
     * Returns false if violated.
     */
    private oddSolve;
    clone(): RingringField;
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
export declare class RingringSolver extends BaseSolver<RingringField> {
    constructor(field: RingringField);
    /** Create solver from pzprv3 URL parameter */
    static fromString(height: number, width: number, param: string): RingringSolver;
    protected getBranchCandidates(state: RingringField): BranchCandidate<RingringField>[];
}
//# sourceMappingURL=ringring.d.ts.map