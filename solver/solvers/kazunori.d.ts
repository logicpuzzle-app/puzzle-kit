/**
 * Kazunori Solver
 *
 * Rules:
 * 1. The grid is divided into rooms
 * 2. Each room contains numbers from 1 to half the room size, with each number appearing exactly twice
 * 3. Numbers on walls indicate the sum of numbers in the two cells adjacent to that wall
 * 4. Identical numbers in a room must be placed in an "L" or "I" shape (orthogonally adjacent to each other)
 * 5. The same number cannot form a 2x2 block
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class KazunoriField implements FieldState<KazunoriField> {
    readonly height: number;
    readonly width: number;
    /** Number candidates for each cell */
    private numbersCand;
    /** Horizontal walls (between col and col+1) */
    private yokoWall;
    /** Vertical walls (between row and row+1) */
    private tateWall;
    /** Numbers on horizontal walls */
    private yokoWallNum;
    /** Numbers on vertical walls */
    private tateWallNum;
    /** Rooms (list of position sets) */
    private rooms;
    constructor(height: number, width: number);
    /** Initialize field from parameter string */
    static fromParam(height: number, width: number, param: string): KazunoriField;
    /** Build rooms using flood fill */
    private buildRooms;
    /** Flood fill to find connected cells without walls between them */
    private floodFillRoom;
    /** Get number candidates at position */
    getCandidates(row: number, col: number): Set<number>;
    /** Check if position has single candidate */
    isSingle(row: number, col: number): boolean;
    /** Get single number value */
    getNumber(row: number, col: number): number | null;
    /** Set cell to specific number */
    setNumber(row: number, col: number, num: number): void;
    /** Remove candidate from cell */
    removeCandidate(row: number, col: number, num: number): void;
    /**
     * Room constraint: Each number appears exactly twice in its room
     */
    private roomSolve;
    /**
     * Wall number constraint: Adjacent cells must sum to wall number
     */
    private wallSumSolve;
    /** Check if two cells can sum to target */
    private checkWallSum;
    /**
     * Nori constraint: Same numbers must be adjacent (form I or L shape)
     */
    private noriSolve;
    /**
     * Pond constraint: No 2x2 block of same number
     */
    private pondSolve;
    /** Check if position is in bounds */
    private inBounds;
    /** Check if two positions are in the same room */
    private inSameRoom;
    clone(): KazunoriField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get cells with multiple candidates for branching */
    getMultiCandidateCells(): Array<{
        row: number;
        col: number;
        count: number;
    }>;
}
export declare class KazunoriSolver extends BaseSolver<KazunoriField> {
    constructor(field: KazunoriField);
    /**
     * Create solver from parameter string
     * @param height Grid height
     * @param width Grid width
     * @param param Encoded parameter string
     */
    static fromParam(height: number, width: number, param: string): KazunoriSolver;
    protected getBranchCandidates(state: KazunoriField): BranchCandidate<KazunoriField>[];
}
//# sourceMappingURL=kazunori.d.ts.map