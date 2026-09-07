/**
 * Icelom (Ice Path) Solver
 *
 * Rules:
 * 1. Draw a path from start to goal
 * 2. On ice cells, the path must continue straight until hitting a wall or rock
 * 3. On normal cells, the path can turn
 * 4. The path cannot cross itself
 */
import { WallState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare enum IcelomCell {
    NORMAL = 0,
    ICE = 1,
    WALL = 2,
    START = 3,
    GOAL = 4
}
export declare class IcelomField implements FieldState<IcelomField> {
    readonly height: number;
    readonly width: number;
    /** Cell types */
    private cells;
    /** Horizontal edges (path between cells) */
    private yokoEdge;
    /** Vertical edges (path between cells) */
    private tateEdge;
    constructor(height: number, width: number);
    setCell(row: number, col: number, cell: IcelomCell): void;
    getCell(row: number, col: number): IcelomCell;
    getYokoEdge(row: number, col: number): WallState;
    getTateEdge(row: number, col: number): WallState;
    setYokoEdge(row: number, col: number, state: WallState): void;
    setTateEdge(row: number, col: number, state: WallState): void;
    private countEdges;
    private pathSolve;
    clone(): IcelomField;
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
export declare class IcelomSolver extends BaseSolver<IcelomField> {
    constructor(field: IcelomField);
    static fromString(height: number, width: number, param: string): IcelomSolver;
    protected getBranchCandidates(state: IcelomField): BranchCandidate<IcelomField>[];
}
//# sourceMappingURL=icelom.d.ts.map