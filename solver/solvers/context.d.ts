/**
 * Context Path Solver
 *
 * Rules:
 * 1. Draw a path connecting all marked cells
 * 2. The path visits each marked cell exactly once
 * 3. Numbers indicate the order of visit
 * 4. The path cannot cross itself
 */
import { Position, WallState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class ContextField implements FieldState<ContextField> {
    readonly height: number;
    readonly width: number;
    /** Number clues (visit order) */
    private clues;
    /** Horizontal edges (path) */
    private yokoEdge;
    /** Vertical edges (path) */
    private tateEdge;
    constructor(height: number, width: number);
    setClue(row: number, col: number, value: number): void;
    getClue(row: number, col: number): number | null;
    getYokoEdge(row: number, col: number): WallState;
    getTateEdge(row: number, col: number): WallState;
    setYokoEdge(row: number, col: number, state: WallState): void;
    setTateEdge(row: number, col: number, state: WallState): void;
    private countEdges;
    /** Get all clue positions sorted by clue value */
    getCluePositions(): Array<{
        pos: Position;
        value: number;
    }>;
    private pathSolve;
    clone(): ContextField;
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
export declare class ContextSolver extends BaseSolver<ContextField> {
    constructor(field: ContextField);
    static fromString(height: number, width: number, param: string): ContextSolver;
    protected getBranchCandidates(state: ContextField): BranchCandidate<ContextField>[];
}
//# sourceMappingURL=context.d.ts.map