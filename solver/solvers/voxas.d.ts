/**
 * Voxas Solver
 *
 * Rules:
 * 1. Divide the grid into 2-cell and 3-cell rectangles
 * 2. No two rectangles can overlap or share cells
 * 3. Wall hints: white circle = same size rectangles, gray = different sizes, black = complementary (2+3)
 * 4. Types: 1=vertical 2, 2=horizontal 2, 3=vertical 3, 4=horizontal 3
 */
import { Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/** A 2 or 3 cell rectangle */
export declare class VoxasSikaku {
    /** 1=vert 2, 2=horiz 2, 3=vert 3, 4=horiz 3 */
    readonly type: number;
    readonly leftUp: Position;
    readonly rightDown: Position;
    /** Set of cell positions in this rectangle */
    readonly posSet: Set<string>;
    /** Horizontal walls this rectangle creates */
    readonly yokoWall: Set<string>;
    /** Horizontal walls this rectangle doesn't create (interior) */
    readonly notYokoWall: Set<string>;
    /** Vertical walls this rectangle creates */
    readonly tateWall: Set<string>;
    /** Vertical walls this rectangle doesn't create (interior) */
    readonly notTateWall: Set<string>;
    constructor(type: number, leftUp: Position, rightDown: Position);
    isDuplicate(other: VoxasSikaku): boolean;
}
export declare class VoxasField implements FieldState<VoxasField> {
    readonly height: number;
    readonly width: number;
    /** Initial horizontal wall hints: 1=wall, 2=black, 3=gray, 4=white */
    readonly firstYokoWall: Map<string, number>;
    /** Initial vertical wall hints */
    readonly firstTateWall: Map<string, number>;
    /** Rectangle candidates */
    squareCand: VoxasSikaku[];
    /** Fixed rectangles */
    squareFixed: VoxasSikaku[];
    constructor(height: number, width: number);
    /** Initialize candidates based on wall hints */
    initCand(): void;
    private isValidCandidate;
    clone(): VoxasField;
    getStateDump(): string;
    solveAndCheck(): boolean;
    private sikakuSolve;
    private countSolve;
    private typeSolve;
    isSolved(): boolean;
    toString(): string;
}
export declare class VoxasSolver extends BaseSolver<VoxasField> {
    /**
     * Parse from pzv.jp URL format
     * Format: https://pzprxs.vercel.app/p?voxas/width/height/param
     */
    static fromURL(url: string): VoxasSolver;
    /**
     * Parse from pzv.jp URL parameter string
     * @param height Grid height
     * @param width Grid width
     * @param param Encoded wall hints (see Java implementation for encoding details)
     */
    static fromString(height: number, width: number, param: string): VoxasSolver;
    protected getBranchCandidates(state: VoxasField): BranchCandidate<VoxasField>[];
}
//# sourceMappingURL=voxas.d.ts.map