/**
 * Juosan Solver (縦横さん)
 *
 * Rules:
 * 1. Place a horizontal line (─) or vertical line (│) in each cell
 * 2. Numbers indicate how many cells in that room have horizontal OR vertical lines
 * 3. No three consecutive horizontal lines in a column (vertical direction)
 * 4. No three consecutive vertical lines in a row (horizontal direction)
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class JuosanField implements FieldState<JuosanField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN=undecided, WHITE=horizontal─, BLACK=vertical│) */
    private cells;
    /** Horizontal walls */
    private yokoWall;
    /** Vertical walls */
    private tateWall;
    /** Rooms */
    private rooms;
    constructor(height: number, width: number);
    /** Parse puzzle from pzv.jp parameter */
    parseParam(param: string): void;
    /** Build rooms from wall information */
    private buildRooms;
    /** Flood fill to find room members */
    private floodFillRoom;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to horizontal (WHITE) */
    setHorizontal(row: number, col: number): void;
    /** Set cell to vertical (BLACK) */
    setVertical(row: number, col: number): void;
    /**
     * Room constraint: count of horizontal OR vertical must match number
     */
    private roomSolve;
    /**
     * Three-in-a-row constraint:
     * - No three consecutive horizontal lines (WHITE) vertically
     * - No three consecutive vertical lines (BLACK) horizontally
     */
    private nextSolve;
    clone(): JuosanField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class JuosanSolver extends BaseSolver<JuosanField> {
    constructor(field: JuosanField);
    /** Create solver from pzv.jp URL format */
    static fromString(height: number, width: number, param: string): JuosanSolver;
    protected getBranchCandidates(state: JuosanField): BranchCandidate<JuosanField>[];
}
//# sourceMappingURL=juosan.d.ts.map