/**
 * Pentomino Solver
 *
 * Rules:
 * 1. Place pentominoes (5-cell polyominoes) into the grid
 * 2. Each pentomino shape is used exactly once
 * 3. Pentominoes cannot overlap
 * 4. Some cells may be pre-filled or blocked
 */
import { FieldState } from '../core/field.js';
import { Position } from '../core/types.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/** Standard pentomino shapes (F, I, L, N, P, T, U, V, W, X, Y, Z) */
export declare const PENTOMINO_SHAPES: Record<string, number[][][]>;
export type PentominoName = keyof typeof PENTOMINO_SHAPES;
export declare class PentominoField implements FieldState<PentominoField> {
    readonly height: number;
    readonly width: number;
    /** Cell assignments: pentomino name or null */
    private cells;
    /** Available pentominoes */
    private availablePentominoes;
    constructor(height: number, width: number);
    /** Block a cell */
    blockCell(row: number, col: number): void;
    /** Check if a pentomino can be placed at position */
    canPlace(name: PentominoName, shape: number[][], row: number, col: number): boolean;
    /** Place a pentomino */
    place(name: PentominoName, shape: number[][], row: number, col: number): void;
    /** Find first empty cell */
    findFirstEmpty(): Position | null;
    /** Get all valid placements for a position */
    getValidPlacements(row: number, col: number): Array<{
        name: PentominoName;
        shape: number[][];
        offsetRow: number;
        offsetCol: number;
    }>;
    clone(): PentominoField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get branching info */
    getBranchInfo(): {
        row: number;
        col: number;
        placements: Array<{
            name: PentominoName;
            shape: number[][];
            offsetRow: number;
            offsetCol: number;
        }>;
    } | null;
}
export declare class PentominoSolver extends BaseSolver<PentominoField> {
    constructor(field: PentominoField);
    /** Create solver from pzprv3 URL parameter */
    static fromString(height: number, width: number, param: string): PentominoSolver;
    protected getBranchCandidates(state: PentominoField): BranchCandidate<PentominoField>[];
}
//# sourceMappingURL=pentomino.d.ts.map