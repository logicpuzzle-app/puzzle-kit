/**
 * Sashigane (L-shaped ruler) Solver
 *
 * Rules:
 * 1. Divide the grid into L-shaped regions
 * 2. Each L-shape must have exactly one 90-degree bend
 * 3. Arrows (↑↓←→) indicate the direction of the arm extending from that cell
 * 4. Circles indicate the bend point of the L-shape
 * 5. Numbers in circles indicate the total size of the L-region
 */
import { Direction, WallState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/** Circle cell with optional count */
export interface Circle {
    count: number;
}
export declare class SashiganeField implements FieldState<SashiganeField> {
    readonly height: number;
    readonly width: number;
    /** Arrow directions */
    private arrows;
    /** Circle cells */
    private circles;
    /** Horizontal walls between (row, col) and (row, col+1) */
    private yokoWall;
    /** Vertical walls between (row, col) and (row+1, col) */
    private tateWall;
    constructor(height: number, width: number);
    /** Set an arrow at position */
    setArrow(row: number, col: number, dir: Direction): void;
    /** Set a circle at position */
    setCircle(row: number, col: number, count: number): void;
    /** Get arrow at position */
    getArrow(row: number, col: number): Direction | null;
    /** Get circle at position */
    getCircle(row: number, col: number): Circle | null;
    /** Get horizontal wall */
    getYokoWall(row: number, col: number): WallState;
    /** Get vertical wall */
    getTateWall(row: number, col: number): WallState;
    /** Set horizontal wall */
    setYokoWall(row: number, col: number, state: WallState): void;
    /** Set vertical wall */
    setTateWall(row: number, col: number, state: WallState): void;
    /** Initialize walls based on arrows and circles */
    firstSolve(): void;
    /** Each cell must have 2 or 3 walls (L-shapes), circles must curve */
    private nextSolve;
    /** Check number constraints */
    private numberSolve;
    clone(): SashiganeField;
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
export declare class SashiganeSolver extends BaseSolver<SashiganeField> {
    constructor(field: SashiganeField);
    /** Create solver from puzzle string array */
    static fromString(height: number, width: number, puzzle: string[]): SashiganeSolver;
    protected getBranchCandidates(state: SashiganeField): BranchCandidate<SashiganeField>[];
}
//# sourceMappingURL=sashigane.d.ts.map