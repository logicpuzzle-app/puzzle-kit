/**
 * Aquapelago Solver
 *
 * Rules:
 * 1. Shade some cells to form islands (groups of shaded cells connected diagonally)
 * 2. Numbers indicate the size of their island (diagonally connected group)
 * 3. A cell with a number must be shaded
 * 4. Shaded cells cannot be orthogonally adjacent (islands separated by water)
 * 5. Unshaded cells (water) must form a single connected region
 * 6. No 2x2 area can be entirely unshaded (no "pools")
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class AquapelagoField implements FieldState<AquapelagoField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE=water/BLACK=island) */
    private cells;
    /** Island size numbers (null = no number, -1 = island without number) */
    private numbers;
    constructor(height: number, width: number);
    /** Set a number clue (also marks as black/island) */
    setNumber(row: number, col: number, num: number): void;
    /** Set a black cell without number (used during parsing) */
    setBlackNoNumber(row: number, col: number): void;
    /** Get number at position */
    getNumber(row: number, col: number): number | null;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black (island) */
    setBlack(row: number, col: number): void;
    /** Set cell to white (water) */
    setWhite(row: number, col: number): void;
    /** Get diagonally connected region from a position */
    private getDiagonalRegion;
    /** Get diagonally connected region of black cells */
    private getBlackIsland;
    /** Get diagonally connected region of non-white cells (black or unknown) */
    private getPotentialBlackIsland;
    /** Get orthogonally connected white region */
    private getWhiteRegion;
    /** Check if black cells are orthogonally adjacent (forbidden) */
    private nextSolve;
    /** Check for 2x2 white pool and prevent it */
    private pondSolve;
    /** Check if white cells form a single connected region */
    private connectSolve;
    /** Check and solve island size constraints */
    private blackSolve;
    /** Mark diagonal neighbors of a black cell as white */
    private markDiagonalNeighborsWhite;
    clone(): AquapelagoField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class AquapelagoSolver extends BaseSolver<AquapelagoField> {
    constructor(field: AquapelagoField);
    /**
     * Create solver from puzz.link format
     * Format: width/height/puzzle
     * Puzzle encoding: g-z represent gaps (1-20), numbers in hex (0-f, -XX for 16-255, +XXX for 256-999)
     * '.' represents black cell without number
     */
    static fromString(width: number, height: number, puzzle: string): AquapelagoSolver;
    protected getBranchCandidates(state: AquapelagoField): BranchCandidate<AquapelagoField>[];
}
//# sourceMappingURL=aquapelago.d.ts.map