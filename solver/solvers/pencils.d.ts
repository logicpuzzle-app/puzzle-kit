/**
 * Pencils Solver
 *
 * Rules:
 * 1. Divide the grid into rooms (regions)
 * 2. Each room represents a pencil with a wooden body (white cells) and lead (black cell)
 * 3. Room size must be odd (3 or larger), or if numbered: exactly number * 2 + 1
 * 4. Each room has exactly one more black cell than white cells
 * 5. White and black cells cannot alternate multiple times within a room
 * 6. Black/white cells each have 2 or 3 walls around them
 * 7. White cells with only 2 walls must go straight (no curves)
 * 8. Numbers indicate the length of the wooden body (white cells in a row/column)
 * 9. Some puzzles have fixed lead positions (芯) shown with directional hints
 */
import { CellState, WallState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class PencilsField implements FieldState<PencilsField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (black/white/unknown) */
    private masu;
    /** Number clues (null = no number) */
    private numbers;
    /** Fixed lead positions (for display) */
    private fixedLeadPos;
    /** Horizontal walls (between col and col+1) */
    private yokoWall;
    /** Vertical walls (between row and row+1) */
    private tateWall;
    constructor(height: number, width: number);
    /** Get cell state */
    getMasu(row: number, col: number): CellState;
    /** Set cell state */
    setMasu(row: number, col: number, state: CellState): void;
    /** Get number clue */
    getNumber(row: number, col: number): number | null;
    /** Set number clue */
    setNumber(row: number, col: number, num: number): void;
    /** Get horizontal wall state */
    getYokoWall(row: number, col: number): WallState;
    /** Set horizontal wall state */
    setYokoWall(row: number, col: number, state: WallState): void;
    /** Get vertical wall state */
    getTateWall(row: number, col: number): WallState;
    /** Set vertical wall state */
    setTateWall(row: number, col: number, state: WallState): void;
    /**
     * Wall constraint:
     * - Each cell (black or white) has exactly 2 or 3 walls
     * - White cells with 2 walls must go straight (no curves)
     */
    private wallSolve;
    /**
     * Length constraint:
     * Numbers indicate the length of white cells in a line
     */
    private lengthSolve;
    /**
     * Room constraint:
     * - Room size must be odd (3+) or exactly number * 2 + 1
     * - Black cells = white cells + 1
     * - Cannot alternate white/black multiple times
     */
    private roomSolve;
    /**
     * Collect positions connected by NO_WALL, checking for alternation
     */
    private checkAndSetContinueWhitePosSet;
    /**
     * Collect positions not separated by confirmed walls
     */
    private checkAndSetContinuePosSet;
    clone(): PencilsField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
}
export declare class PencilsSolver extends BaseSolver<PencilsField> {
    constructor(field: PencilsField);
    /** Create solver from pzv.jp URL format */
    static fromString(height: number, width: number, param: string): PencilsSolver;
    protected getBranchCandidates(state: PencilsField): BranchCandidate<PencilsField>[];
}
//# sourceMappingURL=pencils.d.ts.map