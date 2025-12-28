/**
 * Water Walk Solver
 *
 * Rules:
 * 1. Draw a path from start to goal
 * 2. Water cells slow down movement
 * 3. Numbers indicate total path length
 * 4. The path cannot cross itself
 */
import { WallState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare enum WaterwalkCell {
    NORMAL = 0,
    WATER = 1,
    WALL = 2,
    START = 3,
    GOAL = 4
}
export declare class WaterwalkField implements FieldState<WaterwalkField> {
    readonly height: number;
    readonly width: number;
    /** Cell types */
    private cells;
    /** Number clues */
    private clues;
    /** Horizontal edges (path) */
    private yokoEdge;
    /** Vertical edges (path) */
    private tateEdge;
    constructor(height: number, width: number);
    setCell(row: number, col: number, cell: WaterwalkCell): void;
    setClue(row: number, col: number, value: number): void;
    getCell(row: number, col: number): WaterwalkCell;
    getYokoEdge(row: number, col: number): WallState;
    getTateEdge(row: number, col: number): WallState;
    setYokoEdge(row: number, col: number, state: WallState): void;
    setTateEdge(row: number, col: number, state: WallState): void;
    private countEdges;
    private pathSolve;
    clone(): WaterwalkField;
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
export declare class WaterwalkSolver extends BaseSolver<WaterwalkField> {
    constructor(field: WaterwalkField);
    static fromString(height: number, width: number, param: string): WaterwalkSolver;
    protected getBranchCandidates(state: WaterwalkField): BranchCandidate<WaterwalkField>[];
}
//# sourceMappingURL=waterwalk.d.ts.map