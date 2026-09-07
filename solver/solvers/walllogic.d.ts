/**
 * Walllogic Solver
 *
 * Rules:
 * 1. Each cell contains a number or an arrow (↑→↓←) or is empty
 * 2. Numbers indicate how many cells (including itself) are visible in straight lines
 * 3. Arrows point towards the number they belong to
 * 4. All arrows from different directions must connect to a number
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
type WalllogicArrowDirection = 0 | 1 | 2 | 3 | 4;
export declare class WalllogicField implements FieldState<WalllogicField> {
    readonly height: number;
    readonly width: number;
    /** Fixed numbers */
    private numbers;
    /** Arrow direction candidates for each cell */
    private numbersCand;
    constructor(height: number, width: number);
    /** Set a fixed number */
    setNumber(row: number, col: number, num: number): void;
    /** Number constraint: each number must have correct count of visible cells */
    private numberSolve;
    /** Alone constraint: arrows must lead to numbers */
    private aloneSolve;
    clone(): WalllogicField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get branching info */
    getBranchInfo(): {
        row: number;
        col: number;
        candidates: WalllogicArrowDirection[];
    } | null;
    /** Set cell to specific arrow */
    setArrow(row: number, col: number, arrow: WalllogicArrowDirection): void;
}
export declare class WalllogicSolver extends BaseSolver<WalllogicField> {
    constructor(field: WalllogicField);
    /** Create solver from pzprv3 URL parameter */
    static fromString(height: number, width: number, param: string): WalllogicSolver;
    protected getBranchCandidates(state: WalllogicField): BranchCandidate<WalllogicField>[];
}
export {};
//# sourceMappingURL=walllogic.d.ts.map