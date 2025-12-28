/**
 * Sashikazune Solver
 *
 * Rules:
 * 1. Divide the grid into L-shaped regions
 * 2. Each L-shape contains exactly 2 numbers
 * 3. The numbers indicate the distance from the corner (bend) of the L-shape
 * 4. Each number shows how far that cell is from the corner along the L-shape
 */
import { Position, WallState } from '../core/types.js';
import { FieldState, Grid } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/**
 * Represents an L-shaped region in the grid
 * An L-shape has a corner position and extends in two directions
 */
declare class Lshape {
    /** Map from position to distance from corner */
    private posMap;
    /** Set of horizontal wall positions (right of cell) */
    private yokoWall;
    /** Set of vertical wall positions (below cell) */
    private tateWall;
    /**
     * Create an L-shape
     * @param curvePos - The corner (bend) position
     * @param toY - Target Y coordinate for one arm
     * @param toX - Target X coordinate for other arm
     */
    constructor(curvePos: Position, toY: number, toX: number);
    /** Get position map (position to distance from corner) */
    getPosMap(): Map<string, number>;
    /** Get horizontal wall positions */
    getYokoWall(): Set<string>;
    /** Get vertical wall positions */
    getTateWall(): Set<string>;
    /** Check if this L-shape overlaps with another */
    isDuplicate(other: Lshape): boolean;
    toString(): string;
}
export declare class SashikazuneField implements FieldState<SashikazuneField> {
    readonly height: number;
    readonly width: number;
    /** Number clues */
    private numbers;
    /** Candidate L-shapes */
    lshapeCand: Lshape[];
    /** Fixed L-shapes */
    lshapeFixed: Lshape[];
    constructor(height: number, width: number);
    /** Set number clue */
    setNumber(row: number, col: number, num: number | null): void;
    /** Get number clue */
    getNumber(row: number, col: number): number | null;
    /** Initialize candidates based on number clues */
    initCand(): void;
    /** Generate all valid L-shape candidates */
    private makeLshapeCandBase;
    /**
     * Get horizontal walls based on candidates and fixed L-shapes
     */
    getYokoWall(): Grid<WallState>;
    /**
     * Get vertical walls based on candidates and fixed L-shapes
     */
    getTateWall(): Grid<WallState>;
    /**
     * Remove candidate L-shapes that overlap with fixed ones
     */
    private sikakuSolve;
    /**
     * Check if each unfilled cell has at least one candidate
     * If only one candidate exists for a cell, fix that L-shape
     */
    private countSolve;
    clone(): SashikazuneField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
}
export declare class SashikazuneSolver extends BaseSolver<SashikazuneField> {
    constructor(field: SashikazuneField);
    /**
     * Create solver from puzz.link URL format
     * Format: sashikazune/width/height/param
     * Param encoding: number clues with gaps (g-z = 1-20 empty cells)
     */
    static fromString(height: number, width: number, param: string): SashikazuneSolver;
    protected getBranchCandidates(state: SashikazuneField): BranchCandidate<SashikazuneField>[];
}
export {};
//# sourceMappingURL=sashikazune.d.ts.map