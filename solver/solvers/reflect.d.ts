/**
 * Reflect (Reflection Path) Solver
 *
 * Rules:
 * 1. Draw a path from start to goal
 * 2. The path reflects off mirrors at 90 degree angles
 * 3. The path cannot cross itself
 * 4. Numbers indicate path segment lengths
 */
import { WallState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare enum ReflectCell {
    EMPTY = 0,
    MIRROR_NE = 1,// Northeast mirror (/)
    MIRROR_NW = 2,// Northwest mirror (\)
    WALL = 3,
    START = 4,
    GOAL = 5
}
export declare class ReflectField implements FieldState<ReflectField> {
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
    setCell(row: number, col: number, cell: ReflectCell): void;
    setClue(row: number, col: number, value: number): void;
    getCell(row: number, col: number): ReflectCell;
    getYokoEdge(row: number, col: number): WallState;
    getTateEdge(row: number, col: number): WallState;
    setYokoEdge(row: number, col: number, state: WallState): void;
    setTateEdge(row: number, col: number, state: WallState): void;
    private countEdges;
    private pathSolve;
    clone(): ReflectField;
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
export declare class ReflectSolver extends BaseSolver<ReflectField> {
    constructor(field: ReflectField);
    static fromString(height: number, width: number, param: string): ReflectSolver;
    protected getBranchCandidates(state: ReflectField): BranchCandidate<ReflectField>[];
}
//# sourceMappingURL=reflect.d.ts.map