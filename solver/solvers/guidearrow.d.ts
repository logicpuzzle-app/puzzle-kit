/**
 * Guide Arrow Solver
 *
 * Rules:
 * 1. Draw a path from start to goal
 * 2. Arrows indicate the direction the path must travel through that cell
 * 3. The path cannot cross itself
 * 4. All arrows must be passed through
 */
import { WallState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare enum GuidearrowDirection {
    NONE = 0,
    UP = 1,
    DOWN = 2,
    LEFT = 3,
    RIGHT = 4,
    START = 5,
    GOAL = 6
}
export declare class GuidearrowField implements FieldState<GuidearrowField> {
    readonly height: number;
    readonly width: number;
    /** Arrow directions at cells */
    private arrows;
    /** Horizontal edges (path between cells) */
    private yokoEdge;
    /** Vertical edges (path between cells) */
    private tateEdge;
    constructor(height: number, width: number);
    setArrow(row: number, col: number, dir: GuidearrowDirection): void;
    getYokoEdge(row: number, col: number): WallState;
    getTateEdge(row: number, col: number): WallState;
    setYokoEdge(row: number, col: number, state: WallState): void;
    setTateEdge(row: number, col: number, state: WallState): void;
    private countEdges;
    private pathSolve;
    clone(): GuidearrowField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    getUnknownEdges(): Array<{
        type: 'h' | 'v';
        row: number;
        col: number;
    }>;
}
export declare class GuidearrowSolver extends BaseSolver<GuidearrowField> {
    constructor(field: GuidearrowField);
    static fromString(height: number, width: number, param: string): GuidearrowSolver;
    protected getBranchCandidates(state: GuidearrowField): BranchCandidate<GuidearrowField>[];
}
//# sourceMappingURL=guidearrow.d.ts.map