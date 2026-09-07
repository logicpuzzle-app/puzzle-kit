/**
 * Ripple Effect Solver
 *
 * Rules:
 * 1. Fill each room with numbers 1 to N (where N is the room size)
 * 2. Each number appears exactly once in each room
 * 3. If two cells contain the same number N in the same row/column,
 *    there must be at least N cells between them
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class RippleField implements FieldState<RippleField> {
    readonly height: number;
    readonly width: number;
    /** Number candidates for each cell */
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
    /** Room constraint: eliminate same number in same room */
    private roomSolve;
    /** Ripple constraint: same number N needs at least N cells between them */
    private aroundSolve;
    clone(): RippleField;
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
export declare class RippleSolver extends BaseSolver<RippleField> {
    constructor(field: RippleField);
    /** Create solver from pzprv3 URL parameter */
    static fromString(height: number, width: number, param: string): RippleSolver;
    protected getBranchCandidates(state: RippleField): BranchCandidate<RippleField>[];
}
//# sourceMappingURL=ripple.d.ts.map