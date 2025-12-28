/**
 * Canal Solver
 *
 * Rules:
 * 1. Paint some cells black to form a single connected black region (the canal)
 * 2. Numbers indicate the total count of black cells in the four directions (up, right, down, left)
 * 3. No 2x2 area can be entirely black (no "pools")
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class CanalField implements FieldState<CanalField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Number clues (null = no number, -1 = white cell with no specific count) */
    private numbers;
    constructor(height: number, width: number);
    /** Set a number clue (also marks as white) */
    setNumber(row: number, col: number, num: number): void;
    /** Get number at position */
    getNumber(row: number, col: number): number | null;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white */
    setWhite(row: number, col: number): void;
    /** Count black cells in a direction from position until hitting white */
    private countBlackInDirection;
    /** Count space (black or unknown) in a direction until hitting white */
    private countSpaceInDirection;
    /** Get connected region using BFS */
    private getConnectedRegion;
    /** Check for 2x2 black pool */
    private hasBlackPool;
    /** Prevent 2x2 pool by marking cells white */
    private preventPools;
    /** Solve number constraints */
    private countSolve;
    /** Check if black cells are connected */
    private connectSolve;
    clone(): CanalField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class CanalSolver extends BaseSolver<CanalField> {
    constructor(field: CanalField);
    /**
     * Create solver from puzzle string format
     * Each row is a string where:
     * - '.' or space = empty cell (no number)
     * - '0'-'9' = number clue
     * - 'a'-'z' = numbers 10-35 (a=10, b=11, etc.)
     */
    static fromString(height: number, width: number, puzzle: string[]): CanalSolver;
    /**
     * Create solver from compact encoding (SDVX format)
     * Format: height,width,param where param uses run-length encoding
     * g-z = skip 1-20 cells
     * 0-9,a-f = number clue (hex)
     * . = white cell with no number
     * - = 2-digit hex number (16-255)
     * + = 3-digit hex number (256-999)
     */
    static fromCompact(height: number, width: number, param: string): CanalSolver;
    protected getBranchCandidates(state: CanalField): BranchCandidate<CanalField>[];
}
//# sourceMappingURL=canal.d.ts.map