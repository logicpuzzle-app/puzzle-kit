/**
 * Non-Dango Solver
 *
 * Rules:
 * 1. Shade some cells black
 * 2. Each room (divided by thick borders) must have exactly 1 black cell
 * 3. No 3 or more cells of the same color can be adjacent in a straight line (horizontally, vertically, or diagonally)
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class NonDangoField implements FieldState<NonDangoField> {
    readonly height: number;
    readonly width: number;
    /** Cell states */
    private masu;
    /** Horizontal room walls */
    private readonly yokoWall;
    /** Vertical room walls */
    private readonly tateWall;
    /** Room membership */
    private readonly rooms;
    constructor(height: number, width: number, param: string);
    private exploreRoom;
    clone(): NonDangoField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    /** Each room must have exactly 1 black cell */
    private roomSolve;
    /** No 3+ cells of same color in a line */
    private dangoSolve;
    toString(): string;
}
export declare class NonDangoSolver extends BaseSolver<NonDangoField> {
    constructor(field: NonDangoField);
    static fromURL(url: string): NonDangoSolver;
    protected getBranchCandidates(state: NonDangoField): BranchCandidate<NonDangoField>[];
}
//# sourceMappingURL=nondango.d.ts.map