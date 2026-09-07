/**
 * CircleSquare Solver
 *
 * Rules:
 * 1. Each white cell (circle) must be part of exactly one square region
 * 2. Black cells (squares) are outside all square regions
 * 3. Each square region is bordered by black cells
 * 4. No 2x2 area can be entirely black (no pools)
 * 5. All black cells must be connected
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class CirclesquareField implements FieldState<CirclesquareField> {
    readonly height: number;
    readonly width: number;
    /** Cell states */
    private cells;
    /** Fixed cells from initial puzzle */
    private fixedCells;
    /** Square candidates */
    private squareCand;
    /** Fixed (confirmed) squares */
    private squareFixed;
    constructor(height: number, width: number);
    /** Initialize square candidates for the puzzle */
    private initSquareCandidates;
    /** Parse puzzle from pzv.jp format (3 cells per character, base-36 encoding) */
    parseParam(param: string): void;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white */
    setWhite(row: number, col: number): void;
    /**
     * Square constraint solving:
     * - Remove candidates that overlap with black cells
     * - If a white cell has only one candidate square, fix it
     * - Fixed squares make their interior white and edges black
     */
    private sikakuSolve;
    /** Prevent 2x2 black pools */
    private pondSolve;
    /** Check black cell connectivity */
    private connectSolve;
    clone(): CirclesquareField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class CirclesquareSolver extends BaseSolver<CirclesquareField> {
    constructor(field: CirclesquareField);
    /** Create solver from pzv.jp URL format */
    static fromURL(height: number, width: number, param: string): CirclesquareSolver;
    protected getBranchCandidates(state: CirclesquareField): BranchCandidate<CirclesquareField>[];
}
//# sourceMappingURL=circlesquare.d.ts.map