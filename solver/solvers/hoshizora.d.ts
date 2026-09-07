/**
 * Hoshizora Solver
 *
 * Rules:
 * 1. Stars (marked cells) must have exactly one wall edge around them (out of 4 edges)
 * 2. Non-star cells must NOT have exactly one wall edge around them
 * 3. Each cell must have exactly 2 wall edges around it (out of 4 edges)
 * 4. All cells must be connected (no isolated regions)
 * 5. Each row and column must have an even number of walls
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
declare enum Wall {
    /** Unknown/undetermined */
    SPACE = "?",
    /** Wall exists */
    EXISTS = "#",
    /** Wall does not exist */
    NOT_EXISTS = "."
}
export declare class HoshizoraField implements FieldState<HoshizoraField> {
    readonly height: number;
    readonly width: number;
    /** Star positions (true = star exists at intersection between cells) */
    private hoshi;
    /** Horizontal walls (between vertically adjacent cells) */
    private yokoWall;
    /** Vertical walls (between horizontally adjacent cells) */
    private tateWall;
    constructor(height: number, width: number);
    getYLength(): number;
    getXLength(): number;
    setHoshi(y: number, x: number, value: boolean): void;
    getHoshi(y: number, x: number): boolean;
    setYokoWall(y: number, x: number, state: Wall): void;
    getYokoWall(y: number, x: number): Wall;
    setTateWall(y: number, x: number, state: Wall): void;
    getTateWall(y: number, x: number): Wall;
    clone(): HoshizoraField;
    getStateDump(): string;
    isSolved(): boolean;
    /**
     * Stars must have exactly 1 wall, non-stars must NOT have exactly 1 wall
     */
    private hoshiSolve;
    /**
     * Each cell must have exactly 2 walls around it
     */
    private masuSolve;
    /**
     * Check that all cells are connected (no isolated regions)
     */
    private connectSolve;
    /**
     * Each row/column must have even number of walls
     */
    private oddSolve;
    solveAndCheck(): boolean;
    toString(): string;
    getFirstUnknownYokoWall(): {
        y: number;
        x: number;
    } | null;
    getFirstUnknownTateWall(): {
        y: number;
        x: number;
    } | null;
}
export declare class HoshizoraSolver extends BaseSolver<HoshizoraField> {
    constructor(field: HoshizoraField);
    static fromString(fieldStr: string): HoshizoraSolver;
    protected getBranchCandidates(state: HoshizoraField): BranchCandidate<HoshizoraField>[];
}
export {};
//# sourceMappingURL=hoshizora.d.ts.map