/**
 * Herugolf (Golf) Solver
 *
 * Rules:
 * 1. Draw paths from each ball to a hole
 * 2. Numbers on balls indicate the number of moves to reach the hole
 * 3. The ball moves in a straight line until it hits a wall or obstacle
 * 4. Paths cannot cross each other
 */
import { Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare enum HerugolfCell {
    EMPTY = 0,
    WALL = 1,
    HOLE = 2,
    BALL = 3
}
export declare class HerugolfField implements FieldState<HerugolfField> {
    readonly height: number;
    readonly width: number;
    /** Cell types */
    private cells;
    /** Ball hit counts */
    private ballHits;
    /** Path assignments (ball index) */
    private pathAssignment;
    constructor(height: number, width: number);
    setCell(row: number, col: number, cell: HerugolfCell): void;
    setBallHits(row: number, col: number, hits: number): void;
    getCell(row: number, col: number): HerugolfCell;
    getBallHits(row: number, col: number): number | null;
    getPathAssignment(row: number, col: number): number;
    setPathAssignment(row: number, col: number, ballIndex: number): void;
    /** Get all balls */
    getBalls(): Array<{
        pos: Position;
        hits: number;
    }>;
    /** Get all holes */
    getHoles(): Position[];
    clone(): HerugolfField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
}
export declare class HerugolfSolver extends BaseSolver<HerugolfField> {
    constructor(field: HerugolfField);
    static fromString(height: number, width: number, param: string): HerugolfSolver;
    protected getBranchCandidates(state: HerugolfField): BranchCandidate<HerugolfField>[];
}
//# sourceMappingURL=herugolf.d.ts.map