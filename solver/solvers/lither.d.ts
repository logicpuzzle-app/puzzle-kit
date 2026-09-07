/**
 * Lither Solver
 *
 * Rules:
 * 1. Place extra walls around grid vertices (not on grid edges)
 * 2. Each numbered cell indicates how many of its 4 edges have walls
 * 3. Each vertex must have 1, 3, or 4 walls (not 0 or 2)
 * 4. Walls must not form a closed loop
 * 5. There must be at least 2 trees (disconnected wall components)
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class LitherField implements FieldState<LitherField> {
    readonly height: number;
    readonly width: number;
    /** Number clues (0-4), null means no clue */
    private readonly numbers;
    /** Horizontal extra walls (between columns, height × (width+1)) */
    private yokoExtraWall;
    /** Vertical extra walls (between rows, (height+1) × width) */
    private tateExtraWall;
    constructor(height: number, width: number, param?: string);
    private parseParam;
    clone(): LitherField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    /** Check numbered cells constraints */
    private numberSolve;
    /** Each vertex must have 1, 3, or 4 walls (not 0 or 2) */
    private vertexSolve;
    /** Check for closed loops */
    private connectWhiteSolve;
    private explorePath;
    /** Must have at least one wall */
    private finalSolve;
    /** Must have at least 2 trees */
    private finalSolve2;
    toString(): string;
}
export declare class LitherSolver extends BaseSolver<LitherField> {
    constructor(field: LitherField);
    static fromURL(url: string): LitherSolver;
    protected getBranchCandidates(state: LitherField): BranchCandidate<LitherField>[];
}
//# sourceMappingURL=lither.d.ts.map