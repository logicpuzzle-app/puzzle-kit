/**
 * BD Block Solver
 *
 * Rules:
 * 1. Divide the grid into regions using walls
 * 2. At vertices marked with a star, exactly 3 or 4 walls must meet
 * 3. At vertices without a star, exactly 0 or 2 walls must meet
 * 4. Cells with the same number must be in the same region
 * 5. Each region must contain at least one number
 * 6. Different numbers cannot be in the same region
 */
import { WallState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class BdblockField implements FieldState<BdblockField> {
    readonly height: number;
    readonly width: number;
    /** Star markers at vertices (height+1 × width+1 grid) */
    private hoshi;
    /** Number clues in cells */
    private numbers;
    /** Horizontal walls (between columns) - height rows × (width-1) walls */
    private yokoWall;
    /** Vertical walls (between rows) - (height-1) rows × width walls */
    private tateWall;
    constructor(height: number, width: number);
    /** Parse puzzle from pzv.jp format */
    parseParam(param: string, hoshiParam: string): void;
    /** Get horizontal wall state */
    getYokoWall(row: number, col: number): WallState;
    /** Get vertical wall state */
    getTateWall(row: number, col: number): WallState;
    /** Set horizontal wall */
    setYokoWall(row: number, col: number, state: WallState): void;
    /** Set vertical wall */
    setTateWall(row: number, col: number, state: WallState): void;
    /**
     * Wall constraint at vertices:
     * - Star vertex: 3 or 4 walls
     * - Non-star vertex: 0 or 2 walls
     */
    private wallSolve;
    /**
     * Region constraint:
     * - Each region must have at least one number
     * - All cells with the same number must be in the same region
     * - Different numbers cannot be in the same region
     */
    private regionSolve;
    clone(): BdblockField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown walls for branching */
    getUnknownWalls(): Array<{
        type: 'yoko' | 'tate';
        row: number;
        col: number;
    }>;
}
export declare class BdblockSolver extends BaseSolver<BdblockField> {
    constructor(field: BdblockField);
    /** Create solver from pzv.jp URL format */
    static fromURL(height: number, width: number, param: string, hoshiParam: string): BdblockSolver;
    protected getBranchCandidates(state: BdblockField): BranchCandidate<BdblockField>[];
}
//# sourceMappingURL=bdblock.d.ts.map