/**
 * View (Viewpoint) Solver
 *
 * Rules:
 * 1. Divide the grid into white and black cells
 * 2. Numbers in white cells indicate the total count of continuous black cells
 *    visible in all 4 directions from that cell
 * 3. All white cells must be connected
 * 4. White cells with the same number cannot be orthogonally adjacent
 */
import { CellState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class ViewField implements FieldState<ViewField> {
    readonly height: number;
    readonly width: number;
    /** Cell states */
    private cells;
    /** Numbers (null = no clue, inferred numbers stored when determined) */
    private numbers;
    /** Fixed positions (clue cells) */
    private fixedPosSet;
    constructor(height: number, width: number);
    /** Set a clue cell */
    setClue(row: number, col: number, num: number | null): void;
    /** Count continuous black cells in a direction */
    private countBlackInDirection;
    /** Count constraint: check/update based on number clues */
    private countSolve;
    /** Stop black extension in a direction (set first UNKNOWN after black to WHITE) */
    private stopBlackExtension;
    /** Extend black cells in a direction */
    private extendBlack;
    /** Adjacent same numbers are not allowed */
    private nextSolve;
    /** White cells must be connected */
    private connectSolve;
    /** Flood fill through non-black cells */
    private floodFillWhite;
    clone(): ViewField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get branching info */
    getBranchInfo(): {
        row: number;
        col: number;
    } | null;
    /** Set cell state */
    setCell(row: number, col: number, state: CellState): void;
}
export declare class ViewSolver extends BaseSolver<ViewField> {
    constructor(field: ViewField);
    /** Create solver from pzprv3 URL parameter */
    static fromString(height: number, width: number, param: string): ViewSolver;
    protected getBranchCandidates(state: ViewField): BranchCandidate<ViewField>[];
}
//# sourceMappingURL=view.d.ts.map