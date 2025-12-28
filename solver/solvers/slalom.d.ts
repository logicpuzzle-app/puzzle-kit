/**
 * Slalom Solver
 *
 * Rules:
 * 1. Cells are either black (blocks) or white (path cells)
 * 2. Some cells are gates (marked with +) which the path must pass through
 * 3. Black blocks may have direction+count clues indicating constraints
 * 4. White cells must form a connected region
 * 5. Each white cell (non-gate) has exactly 2 open edges (path through)
 * 6. Walls between cells partition the grid
 * 7. The number of walls crossing each row/column must be even (parity constraint)
 * 8. Black cells are surrounded by walls
 * 9. Start position (○) indicates the starting cell of the path
 */
import { CellState, Position, Direction } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/**
 * Wall state for cell boundaries
 */
export declare enum SlalomWallState {
    /** Unknown/undetermined */
    UNKNOWN = "unknown",
    /** No wall (cells connected) */
    OPEN = "open",
    /** Wall exists (cells separated) */
    WALL = "wall"
}
/**
 * Block with direction and count constraint
 */
export interface Block {
    direction: Direction | null;
    count: number;
}
export declare class SlalomField implements FieldState<SlalomField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN = undetermined, WHITE = path, BLACK = block) */
    private cells;
    /** Gate markers - -1 means gate exists, null means no gate */
    private gates;
    /** Block information - null means no block */
    private blocks;
    /** Start position */
    private start;
    /** Horizontal walls (between col and col+1) */
    private yokoWall;
    /** Vertical walls (between row and row+1) */
    private tateWall;
    constructor(height: number, width: number, start: Position);
    /** Set a block with optional direction/count constraint */
    setBlock(row: number, col: number, direction?: Direction | null, count?: number): void;
    /** Set a gate marker */
    setGate(row: number, col: number, isVertical: boolean): void;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell state */
    setCell(row: number, col: number, state: CellState): void;
    /** Get horizontal wall state */
    getYokoWall(row: number, col: number): SlalomWallState;
    /** Get vertical wall state */
    getTateWall(row: number, col: number): SlalomWallState;
    /** Set horizontal wall */
    setYokoWall(row: number, col: number, state: SlalomWallState): void;
    /** Set vertical wall */
    setTateWall(row: number, col: number, state: SlalomWallState): void;
    /**
     * Black cells: surround with walls, adjacent cells must be white
     * White cells: must have exactly 2 open edges
     */
    private nextSolve;
    /**
     * Parity constraint: each row/column must have an even number of walls
     */
    private oddSolve;
    /**
     * White cells must be connected
     */
    private connectSolve;
    /**
     * Recursively collect cells connected through open walls
     */
    private collectConnected;
    clone(): SlalomField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get branching candidates */
    getBranchingCandidates(): Array<{
        type: 'yokoWall' | 'tateWall';
        row: number;
        col: number;
    }>;
}
export declare class SlalomSolver extends BaseSolver<SlalomField> {
    constructor(field: SlalomField);
    /**
     * Parse puzzle from pzv.jp URL format
     * URL format: slalom/d/HEIGHT/WIDTH/PARAM/STARTPOS
     */
    static fromString(height: number, width: number, param: string, startPos: number): SlalomSolver;
    protected getBranchCandidates(state: SlalomField): BranchCandidate<SlalomField>[];
}
//# sourceMappingURL=slalom.d.ts.map