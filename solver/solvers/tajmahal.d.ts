/**
 * Taj Mahal Solver
 *
 * Rules:
 * 1. Place diamond-shaped (45-degree rotated square) buildings on the grid
 * 2. Buildings must touch at vertices (corner to corner)
 * 3. Buildings cannot overlap or share edges
 * 4. Numbers indicate how many other buildings touch that building at vertices
 * 5. Grid points can be at cell centers (even coords) or edge midpoints (odd coords)
 */
import { Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/** A diamond-shaped building defined by its center and size parameters */
export declare class Tatemono {
    /** Center position (can be on grid points or edge midpoints) */
    readonly centerPos: Position;
    /** List of edges as line segments */
    readonly myLineList: Line2D[];
    /** Size: sum of x and y distances from center */
    readonly size: number;
    constructor(centerPos: Position, myLineList: Line2D[], size: number);
    /** Check if two buildings overlap or share edges */
    isDuplicate(other: Tatemono): boolean;
    /** Check if two buildings touch at vertices only */
    isCross(other: Tatemono): boolean;
    private getCommonPoint;
    private getOtherPoint;
    private pointIntersectsLine;
}
/** Simple 2D line segment */
declare class Line2D {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    constructor(x1: number, y1: number, x2: number, y2: number);
    intersectsLine(other: Line2D): boolean;
    private direction;
    private onSegment;
}
export declare class TajmahalField implements FieldState<TajmahalField> {
    readonly height: number;
    readonly width: number;
    readonly yLength: number;
    readonly xLength: number;
    /** Number hints - count of touching buildings */
    readonly numbersMap: Map<string, number>;
    /** Candidate buildings that could be placed */
    squareCand: Tatemono[];
    /** Buildings that have been placed */
    squareFixed: Tatemono[];
    constructor(height: number, width: number);
    /** Set a number hint at position */
    setNumber(row: number, col: number, count: number): void;
    /** Initialize building candidates based on number hints */
    initCand(): void;
    clone(): TajmahalField;
    getStateDump(): string;
    solveAndCheck(): boolean;
    private sikakuSolve;
    private allSolve;
    private countSolve;
    private finalSolve;
    private setContinueSikakuSet;
    isSolved(): boolean;
    toString(): string;
}
export declare class TajmahalSolver extends BaseSolver<TajmahalField> {
    /**
     * Create solver from pzv.jp URL format
     * Example: https://pzprxs.vercel.app/p?tajmahal/8/8/3a1...
     */
    static fromURL(url: string): TajmahalSolver;
    /**
     * Create solver from height, width, and param string
     * This is the fromString method for pzv.jp URL parsing
     */
    static fromString(height: number, width: number, param: string): TajmahalSolver;
    protected getBranchCandidates(state: TajmahalField): BranchCandidate<TajmahalField>[];
}
export {};
//# sourceMappingURL=tajmahal.d.ts.map