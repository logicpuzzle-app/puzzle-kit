/**
 * Hebi (Hebi-Ichigo / Snake) Solver
 *
 * Rules:
 * 1. Place numbers 1-5 to form "snakes" - chains of cells connected orthogonally
 * 2. 1 is the head, 5 is the tail
 * 3. Snakes cannot touch other snakes orthogonally (diagonal OK)
 * 4. Snake's eyes look opposite from where body (2) connects to head (1)
 * 5. A snake cannot appear in front of another snake's eyes
 * 6. Black cells with arrows show the nearest number in that direction
 * 7. Black cells with 0 mean no snake in that direction until next obstacle
 */
import { Direction } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/** Arrow clue on black cell */
export interface HebiArrow {
    row: number;
    col: number;
    dir: Direction;
    num: number;
}
export declare class HebiField implements FieldState<HebiField> {
    readonly height: number;
    readonly width: number;
    /** Cell numbers (0 = empty/unknown, 1-5 = snake part, -1 = black cell) */
    private cells;
    /** Candidate numbers for each cell */
    private candidates;
    /** Arrow clues */
    private arrows;
    /** Black cell positions */
    private blackCells;
    constructor(height: number, width: number);
    /** Set black cell */
    setBlack(row: number, col: number): void;
    /** Add arrow clue */
    addArrow(row: number, col: number, dir: Direction, num: number): void;
    /** Get cell value */
    getCell(row: number, col: number): number;
    /** Set cell value */
    setCell(row: number, col: number, num: number): void;
    /** Get candidates */
    getCandidates(row: number, col: number): Set<number>;
    /** Remove candidate */
    removeCandidate(row: number, col: number, num: number): void;
    /** Is black cell */
    isBlack(row: number, col: number): boolean;
    /**
     * Arrow constraint: nearest number in direction must match
     */
    private arrowSolve;
    /**
     * Snake connectivity: 1-2-3-4-5 must be connected
     */
    private snakeSolve;
    private hasAdjacentNumber;
    /**
     * No adjacent snakes: different snakes can't touch orthogonally
     */
    private noTouchSolve;
    /**
     * Single candidate → place number
     */
    private uniqueSolve;
    clone(): HebiField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Array<{
        row: number;
        col: number;
        candidates: number[];
    }>;
}
export declare class HebiSolver extends BaseSolver<HebiField> {
    constructor(field: HebiField);
    static fromString(height: number, width: number, param: string): HebiSolver;
    protected getBranchCandidates(state: HebiField): BranchCandidate<HebiField>[];
}
//# sourceMappingURL=hebi.d.ts.map