/**
 * Kurochute (Kurodoko variant) Solver
 *
 * Rules:
 * 1. Paint some cells black
 * 2. Numbers indicate the count of black cells that can be seen in a straight line
 *    (horizontally and vertically) from that cell (not including the cell itself)
 * 3. Black cells cannot be adjacent orthogonally
 * 4. All white cells must be connected
 */
import { CellState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class KurochuteField implements FieldState<KurochuteField> {
    readonly height: number;
    readonly width: number;
    /** Cell states */
    private cells;
    /** Number clues */
    private clues;
    constructor(height: number, width: number);
    /** Set a clue */
    setClue(row: number, col: number, count: number): void;
    /** Count visible black cells in all directions */
    private countVisibleBlack;
    /** Get first unknown cell in a direction */
    private getFirstUnknownInDirection;
    /** Clue constraint */
    private clueSolve;
    /** Adjacent black constraint */
    private adjacentSolve;
    /** White connectivity constraint */
    private connectSolve;
    /** Flood fill through non-black cells */
    private floodFillWhite;
    clone(): KurochuteField;
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
export declare class KurochuteSolver extends BaseSolver<KurochuteField> {
    constructor(field: KurochuteField);
    /** Create solver from pzprv3 URL parameter */
    static fromString(height: number, width: number, param: string): KurochuteSolver;
    protected getBranchCandidates(state: KurochuteField): BranchCandidate<KurochuteField>[];
}
//# sourceMappingURL=kurochute.d.ts.map