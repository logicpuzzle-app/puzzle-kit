/**
 * Tapa Solver
 *
 * Rules:
 * 1. Paint some cells black
 * 2. Numbers indicate how many black cells surround them (in 8 neighbors)
 *    and how they are grouped (multiple numbers = separated groups of black cells)
 * 3. Black cells must form a single connected group
 * 4. No 2x2 area can be entirely black (no "pools")
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class TapaField implements FieldState<TapaField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Numbers in each cell (null = no clue, array of numbers = clue) */
    private numbers;
    /** Candidate patterns for each clue cell */
    private candidates;
    constructor(height: number, width: number);
    /** Set a number clue (also marks cell as white) */
    setNumber(row: number, col: number, nums: number[]): void;
    /** Generate all valid patterns for a given clue */
    private generateCandidates;
    private generateCandidatesRecursive;
    /** Get groups of consecutive black cells from a pattern string */
    private getGroups;
    /** Check if groups match the clue numbers */
    private matchesClue;
    /** Get number at position */
    getNumber(row: number, col: number): number[] | null;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white */
    setWhite(row: number, col: number): void;
    /** Get the 8 neighbor positions in order (clockwise from top-left) */
    private getNeighborPositions;
    /** Get the current pattern string for a clue cell's neighbors */
    private getNeighborPattern;
    /** Check for 2x2 black pool */
    private hasBlackPool;
    /** Check if black cells are connected */
    private isBlackConnected;
    /** Solve using clue candidates */
    private solveNumberConstraints;
    /** Prevent 2x2 pool */
    private preventPools;
    clone(): TapaField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class TapaSolver extends BaseSolver<TapaField> {
    constructor(field: TapaField);
    /**
     * Create solver from puzzle data
     * @param height Grid height
     * @param width Grid width
     * @param clues Map of positions to clue arrays
     */
    static fromClues(height: number, width: number, clues: Map<string, number[]>): TapaSolver;
    protected getBranchCandidates(state: TapaField): BranchCandidate<TapaField>[];
}
//# sourceMappingURL=tapa.d.ts.map