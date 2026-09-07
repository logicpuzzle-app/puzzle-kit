/**
 * Satogaeri Solver
 *
 * Rules:
 * 1. Move each circled number orthogonally (up/down/left/right)
 * 2. A number indicates how many cells it moves; circles without numbers can move any distance
 * 3. After all moves, each region must contain exactly one circle
 * 4. Movement paths cannot cross each other
 * 5. Circles cannot pass through other circles
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class SatogaeriField implements FieldState<SatogaeriField> {
    readonly height: number;
    readonly width: number;
    /** Numbers (-1 = circle without number, null = empty) */
    private numbers;
    /** Movement candidates: from -> set of possible destinations */
    private candidates;
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
    /** Initialize movement candidates */
    private initCandidates;
    /** Check if two movement paths cross */
    private isCross;
    /** Set a candidate as the only option */
    fixCandidate(fromKey: string, toKey: string): void;
    /**
     * Movement constraint: remove invalid candidates
     */
    private moveSolve;
    clone(): SatogaeriField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get branching info */
    getBranchCandidates(): Array<{
        fromKey: string;
        toKey: string;
    }>;
}
export declare class SatogaeriSolver extends BaseSolver<SatogaeriField> {
    constructor(field: SatogaeriField);
    /** Create solver from pzv.jp URL format */
    static fromString(height: number, width: number, param: string): SatogaeriSolver;
    protected getBranchCandidates(state: SatogaeriField): BranchCandidate<SatogaeriField>[];
}
//# sourceMappingURL=satogaeri.d.ts.map