/**
 * Gokigen (Slant) Solver
 *
 * Rules:
 * 1. Fill each cell with a diagonal line (either \ or /)
 * 2. Numbers at vertices indicate how many diagonals touch that vertex
 * 3. No loops of diagonals are allowed
 */
import { Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/** Diagonal direction: \ (backslash) or / (slash) */
export declare enum SlantDirection {
    UNKNOWN = "unknown",
    /** Backslash: connects top-left to bottom-right */
    BACKSLASH = "backslash",
    /** Slash: connects top-right to bottom-left */
    SLASH = "slash"
}
export declare class GokigenField implements FieldState<GokigenField> {
    readonly height: number;
    readonly width: number;
    /** Cell diagonal directions */
    private cells;
    /** Numbers at vertices (null = no clue). Vertices are at (row, col) for row in [0, height] and col in [0, width] */
    private numbers;
    constructor(height: number, width: number);
    /** Set a number clue at vertex */
    setNumber(row: number, col: number, num: number): void;
    /** Get number at vertex */
    getNumber(row: number, col: number): number | null;
    /** Get cell diagonal direction */
    getCell(row: number, col: number): SlantDirection;
    /** Set cell diagonal direction */
    setCell(row: number, col: number, dir: SlantDirection): void;
    /** Count diagonals touching a vertex with specific direction */
    private countDiagonalsAtVertex;
    /** Apply number constraints at vertices */
    private aroundSolve;
    /** Check for loops in the diagonal network */
    private connectSolve;
    /** Check if following diagonals creates a loop */
    private checkNoLoop;
    clone(): GokigenField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class GokigenSolver extends BaseSolver<GokigenField> {
    constructor(field: GokigenField);
    /** Create solver from puzzle string array */
    static fromString(height: number, width: number, puzzle: string[]): GokigenSolver;
    protected getBranchCandidates(state: GokigenField): BranchCandidate<GokigenField>[];
}
//# sourceMappingURL=gokigen.d.ts.map