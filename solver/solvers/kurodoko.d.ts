/**
 * Kurodoko Solver
 *
 * Rules:
 * 1. Paint some cells black
 * 2. Numbers indicate how many cells are visible from that cell (including itself)
 *    in all 4 orthogonal directions (until a black cell blocks the view)
 * 3. Black cells cannot be adjacent orthogonally
 * 4. All white cells must be connected
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class KurodokoField implements FieldState<KurodokoField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Numbers in each cell (null = no number, -1 = unknown number) */
    private numbers;
    constructor(height: number, width: number);
    /** Set a number clue (also marks as white) */
    setNumber(row: number, col: number, num: number): void;
    /** Get number at position */
    getNumber(row: number, col: number): number | null;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white */
    setWhite(row: number, col: number): void;
    /** Count visible cells in one direction (non-black cells) */
    private countVisibleInDirection;
    /** Count guaranteed visible cells (white only) in one direction */
    private countWhiteInDirection;
    /** Get total visible cells from a position (including itself) */
    private getTotalVisible;
    /** Get guaranteed visible cells (white only) from a position */
    private getGuaranteedVisible;
    /** Check if any black cells are adjacent */
    private hasAdjacentBlack;
    /** Mark neighbors of black cells as white */
    private markBlackNeighborsWhite;
    /** Check if white cells are connected */
    private isWhiteConnected;
    /** Check number constraints validity */
    private checkNumberConstraints;
    /** Solve number constraints */
    private solveNumberConstraints;
    clone(): KurodokoField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class KurodokoSolver extends BaseSolver<KurodokoField> {
    constructor(field: KurodokoField);
    /** Create solver from puzzle string */
    static fromString(height: number, width: number, puzzle: string[]): KurodokoSolver;
    protected getBranchCandidates(state: KurodokoField): BranchCandidate<KurodokoField>[];
}
//# sourceMappingURL=kurodoko.d.ts.map