/**
 * Tents Solver
 *
 * Rules:
 * 1. Place tents adjacent (orthogonally) to trees
 * 2. Each tree has exactly one tent, each tent belongs to one tree
 * 3. Tents cannot touch each other (including diagonally)
 * 4. Row/column hints indicate number of tents in that line
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class TentsField implements FieldState<TentsField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE=empty/BLACK=tent) */
    private cells;
    /** Tree positions */
    private trees;
    /** Horizontal walls (tree-tent connections between horizontally adjacent cells) */
    private horizontalWalls;
    /** Vertical walls (tree-tent connections between vertically adjacent cells) */
    private verticalWalls;
    /** Row hints (number of tents per row, null = no hint) */
    private leftHints;
    /** Column hints (number of tents per column, null = no hint) */
    private topHints;
    constructor(height: number, width: number);
    /** Set a tree at position */
    setTree(row: number, col: number): void;
    /** Get if position has a tree */
    hasTree(row: number, col: number): boolean;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to tent (BLACK) */
    setTent(row: number, col: number): void;
    /** Set cell to empty (WHITE) */
    setEmpty(row: number, col: number): void;
    /** Set row hint */
    setRowHint(row: number, count: number): void;
    /** Set column hint */
    setColumnHint(col: number, count: number): void;
    /** Get wall state between two horizontally adjacent cells */
    private getHorizontalWall;
    /** Get wall state between two vertically adjacent cells */
    private getVerticalWall;
    /** Set wall state between horizontally adjacent cells */
    private setHorizontalWall;
    /** Set wall state between vertically adjacent cells */
    private setVerticalWall;
    /** Get wall state between two adjacent cells */
    private getWall;
    /** Set wall state between two adjacent cells */
    private setWall;
    /** Get count of connections for a cell */
    private getConnectionCount;
    /** First solve: mark cells with no adjacent trees as empty */
    private firstSolve;
    /** Trees solve: ensure trees and tents have exactly 1 connection, empties have 0 */
    private treesSolve;
    /** Tents solve: mark all 8 neighbors of a tent as empty */
    private tentsSolve;
    /** Hint solve: enforce row/column tent counts */
    private hintSolve;
    /** Check if all constraints are satisfied */
    private checkConstraints;
    clone(): TentsField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class TentsSolver extends BaseSolver<TentsField> {
    constructor(field: TentsField);
    /**
     * Create solver from puzzle data
     * @param height Grid height
     * @param width Grid width
     * @param trees Array of strings representing tree positions ('T' = tree, '.' = empty)
     * @param rowHints Array of row hints (null = no hint)
     * @param colHints Array of column hints (null = no hint)
     */
    static fromData(height: number, width: number, trees: string[], rowHints: (number | null)[], colHints: (number | null)[]): TentsSolver;
    protected getBranchCandidates(state: TentsField): BranchCandidate<TentsField>[];
}
//# sourceMappingURL=tents.d.ts.map