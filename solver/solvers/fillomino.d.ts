/**
 * Fillomino Solver
 *
 * Rules:
 * 1. Divide the grid into polyominoes (connected regions)
 * 2. Each polyomino contains cells with the same number
 * 3. The number indicates the size (cell count) of that polyomino
 * 4. Two polyominoes with the same number cannot touch orthogonally
 * 5. At each vertex, exactly 0, 2, 3, or 4 walls can meet (not exactly 1)
 */
import { WallState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class FillominoField implements FieldState<FillominoField> {
    readonly height: number;
    readonly width: number;
    /** Numbers assigned to cells (null = undetermined) */
    private numbers;
    /** Original clue numbers */
    private originNumbers;
    /** Horizontal walls (between col and col+1) */
    private yokoWall;
    /** Vertical walls (between row and row+1) */
    private tateWall;
    /** Fixed positions for optimization */
    private fixedPosSet;
    constructor(height: number, width: number);
    /** Set a clue number */
    setNumber(row: number, col: number, num: number): void;
    /** Get number at position */
    getNumber(row: number, col: number): number | null;
    /** Get origin number at position */
    getOriginNumber(row: number, col: number): number | null;
    /** Get horizontal wall state */
    getYokoWall(row: number, col: number): WallState;
    /** Get vertical wall state */
    getTateWall(row: number, col: number): WallState;
    /** Set horizontal wall */
    setYokoWall(row: number, col: number, state: WallState): void;
    /** Set vertical wall */
    setTateWall(row: number, col: number, state: WallState): void;
    /** Get connected region via NO_WALL edges */
    private getConnectedWhiteRegion;
    /** Get potential region (non-WALL edges) */
    private getPotentialRegion;
    /** Check if region contains a numbered cell */
    private regionContainsNumber;
    /** Same numbers -> no wall, different numbers -> wall */
    private numberSolve;
    /** Room size constraints */
    private roomSolve;
    /** At each vertex, walls cannot be exactly 1 */
    private pileSolve;
    /** Fill isolated regions with their size */
    private standAloneSolve;
    clone(): FillominoField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    /**
     * Either way solve - Test both wall/no-wall options
     * If both options lead to the same cell values/walls, apply them
     * Based on sdvx: 両方の選択肢を試して共通の結果を適用
     */
    private eitherWaySolve;
    /**
     * Basic solve without either-way (to avoid infinite recursion)
     */
    private basicSolve;
    /**
     * Unique path solve - If a region needs to expand and has only one possible path
     * Based on sdvx: 領域が唯一の拡張パスを持つ場合
     */
    private uniquePathSolve;
    toString(): string;
    /** Get unknown walls for branching */
    getUnknownWalls(): Array<{
        type: 'h' | 'v';
        row: number;
        col: number;
    }>;
}
export declare class FillominoSolver extends BaseSolver<FillominoField> {
    constructor(field: FillominoField);
    /** Create solver from puzzle string array */
    static fromString(height: number, width: number, puzzle: string[]): FillominoSolver;
    protected getBranchCandidates(state: FillominoField): BranchCandidate<FillominoField>[];
}
//# sourceMappingURL=fillomino.d.ts.map