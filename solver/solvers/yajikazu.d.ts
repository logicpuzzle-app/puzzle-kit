/**
 * Yajikazu Solver
 *
 * Rules:
 * 1. Paint some cells black
 * 2. Arrow clues indicate the number of black cells in that direction
 * 3. Black cells cannot be adjacent orthogonally
 * 4. All white cells must be connected
 * 5. Clue cells are always white
 */
import { CellState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export type YajikazuDirection = 'up' | 'right' | 'down' | 'left';
export interface YajikazuClue {
    direction: YajikazuDirection;
    count: number;
}
export declare class YajikazuField implements FieldState<YajikazuField> {
    readonly height: number;
    readonly width: number;
    /** Cell states */
    private cells;
    /** Clues */
    private clues;
    constructor(height: number, width: number);
    /** Set a clue */
    setClue(row: number, col: number, direction: YajikazuDirection, count: number): void;
    /** Get cells in a direction from a position */
    private getCellsInDirection;
    /** Count black cells in direction */
    private countBlackInDirection;
    /** Clue constraint */
    private clueSolve;
    /** Adjacent black constraint */
    private adjacentSolve;
    /** White connectivity constraint */
    private connectSolve;
    /** Flood fill through non-black cells */
    private floodFillWhite;
    clone(): YajikazuField;
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
export declare class YajikazuSolver extends BaseSolver<YajikazuField> {
    constructor(field: YajikazuField);
    /** Create solver from pzprv3 URL parameter */
    static fromString(height: number, width: number, param: string): YajikazuSolver;
    protected getBranchCandidates(state: YajikazuField): BranchCandidate<YajikazuField>[];
}
//# sourceMappingURL=yajikazu.d.ts.map