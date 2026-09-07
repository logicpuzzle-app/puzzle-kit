/**
 * Nanro Solver
 *
 * Rules:
 * 1. Fill cells with numbers or leave empty (0)
 * 2. Each room contains cells with the same number (or empty)
 * 3. The count of numbered cells in a room equals that number
 * 4. Same numbers cannot be adjacent across a wall (different rooms)
 * 5. All numbered cells must be connected
 * 6. No 2x2 area can be all numbered (at least one must be empty)
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class NanroField implements FieldState<NanroField> {
    readonly height: number;
    readonly width: number;
    /** Number candidates for each cell (0 = empty, n = number) */
    private numbersCand;
    /** Fixed numbers (for display) */
    private numbers;
    /** Horizontal walls: yokoWall[y][x] means wall between (y,x) and (y,x+1) */
    private yokoWall;
    /** Vertical walls: tateWall[y][x] means wall between (y,x) and (y+1,x) */
    private tateWall;
    /** Rooms: each room is a set of positions */
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
    /** Initialize candidates based on room size */
    private initCandidates;
    /** Room constraint: each room has exactly N cells with number N */
    private roomSolve;
    /** Adjacent cells across walls cannot have same non-zero number */
    private nextSolve;
    /** Check connectivity of numbered cells */
    private connectSolve;
    /** Flood fill through non-zero cells */
    private floodFillNumbers;
    /** No 2x2 area can be all numbered */
    private pondSolve;
    clone(): NanroField;
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
export declare class NanroSolver extends BaseSolver<NanroField> {
    constructor(field: NanroField);
    /** Create solver from pzprv3 URL parameter */
    static fromString(height: number, width: number, param: string): NanroSolver;
    protected getBranchCandidates(state: NanroField): BranchCandidate<NanroField>[];
}
//# sourceMappingURL=nanro.d.ts.map