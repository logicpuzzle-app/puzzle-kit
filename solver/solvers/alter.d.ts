/**
 * Alter Solver
 *
 * Rules:
 * 1. Fill cells with symbols: 0 (empty/・), 1 (○ circle), 2 (△ triangle), or 3 (□ square)
 * 2. Non-zero symbols (○, △, □) must appear exactly once in each room
 * 3. In rooms of size 3, empty cells (0/・) are not allowed
 * 4. In each row and column, exactly 2 different symbols (from ○, △, □) must appear
 * 5. The same symbol cannot appear consecutively in a row or column
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class AlterField implements FieldState<AlterField> {
    readonly height: number;
    readonly width: number;
    /** Number candidates for each cell (0 = empty/・, 1 = ○, 2 = △, 3 = □) */
    private numbersCand;
    /** Fixed numbers (for display) */
    private numbers;
    /** Horizontal walls: yokoWall[y][x] means wall between (y,x) and (y,x+1) */
    private yokoWall;
    /** Vertical walls: tateWall[y][x] means wall between (y,x) and (y+1,x) */
    private tateWall;
    /** Rooms: each room is a set of position keys */
    private rooms;
    constructor(height: number, width: number);
    /** Set walls and build rooms */
    setWalls(yokoWall: boolean[][], tateWall: boolean[][]): void;
    /** Set a fixed number at position */
    setNumber(row: number, col: number, num: number): void;
    /** Build rooms from walls */
    private buildRooms;
    /** Flood fill to find connected cells in same room */
    private floodFillRoom;
    /** Initialize candidates: 0-3 for all cells, but no 0 in size-3 rooms */
    private initCandidates;
    /**
     * Room constraint: non-zero numbers (1, 2, 3) must appear exactly once in each room
     */
    private roomSolve;
    /**
     * Line constraint:
     * - Same symbol cannot appear consecutively
     * - Exactly 2 different symbols (from 1, 2, 3) must appear in each line
     */
    private lineSolve;
    clone(): AlterField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get branching info */
    getBranchInfo(): {
        row: number;
        col: number;
        candidates: number[];
    } | null;
    /** Set cell to specific value */
    setCell(row: number, col: number, value: number): void;
}
export declare class AlterSolver extends BaseSolver<AlterField> {
    constructor(field: AlterField);
    /** Create solver from puzz.link URL parameter */
    static fromString(height: number, width: number, param: string): AlterSolver;
    protected getBranchCandidates(state: AlterField): BranchCandidate<AlterField>[];
}
//# sourceMappingURL=alter.d.ts.map