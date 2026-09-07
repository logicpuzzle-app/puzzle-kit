/**
 * Tatamibari Solver
 *
 * Rules:
 * 1. Divide the grid into rectangular regions
 * 2. Each region contains exactly one symbol
 * 3. Symbol types:
 *    - Vertical bar (|): Region must be taller than wide
 *    - Horizontal bar (―): Region must be wider than tall
 *    - Plus (+): Region must be a square
 * 4. Four corners of rectangles cannot meet at a single point
 */
import { Position, Rectangle } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/**
 * Symbol types
 * 1: Vertical bar (|) - taller than wide
 * 2: Horizontal bar (―) - wider than tall
 * 3: Plus (+) - square
 */
export type TatamiSymbol = 1 | 2 | 3 | null;
export declare class TatamibariField implements FieldState<TatamibariField> {
    readonly height: number;
    readonly width: number;
    /** Symbol at each cell */
    private symbols;
    /** Room candidates for each symbol position */
    private roomCand;
    constructor(height: number, width: number);
    /** Set a symbol at position */
    setSymbol(row: number, col: number, symbol: TatamiSymbol): void;
    /** Get symbol at position */
    getSymbol(row: number, col: number): TatamiSymbol;
    /** Initialize room candidates */
    initCandidates(): void;
    /** Get room candidates for a symbol position */
    getRoomCandidates(row: number, col: number): Rectangle[];
    /** Set room candidates for a symbol position */
    setRoomCandidates(row: number, col: number, candidates: Rectangle[]): void;
    /** Check if two rectangles overlap */
    private rectanglesOverlap;
    /** Check if two rectangles create a 4-corner meeting */
    private cornersMeet;
    /** Remove candidates that conflict with fixed rooms */
    private roomSolve;
    /** Check if all cells can be covered by some room */
    private allSolve;
    clone(): TatamibariField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get symbol positions with multiple candidates (for branching) */
    getUnfixedSymbols(): Position[];
}
export declare class TatamibariSolver extends BaseSolver<TatamibariField> {
    constructor(field: TatamibariField);
    /** Create solver from puzzle string array */
    static fromString(height: number, width: number, puzzle: string[]): TatamibariSolver;
    protected getBranchCandidates(state: TatamibariField): BranchCandidate<TatamibariField>[];
}
//# sourceMappingURL=tatamibari.d.ts.map