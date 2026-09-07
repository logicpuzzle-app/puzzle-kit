/**
 * Nurikabe Solver
 *
 * Rules:
 * 1. Paint some cells black to form a single connected black region
 * 2. Numbers indicate the size of their white (island) region
 * 3. Each island contains exactly one number
 * 4. Islands cannot touch orthogonally (only diagonally)
 * 5. No 2x2 area can be entirely black (no "pools")
 */
import { CellState, Position, SolveResult } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate, SolverConfig } from '../core/solver.js';
export declare class NurikabeField implements FieldState<NurikabeField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Island size numbers (null = no number) */
    private numbers;
    /** Positions that have been fixed (for optimization) */
    private fixedPositions;
    /** Whether farSolve has been run (initial setup) */
    private farSolveInitialized;
    constructor(height: number, width: number);
    /** Set a number clue (also marks as white) */
    setNumber(row: number, col: number, num: number): void;
    /** Get number at position */
    getNumber(row: number, col: number): number | null;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white */
    setWhite(row: number, col: number): void;
    /** Get connected region of cells with given state */
    private getConnectedRegion;
    /** Get white region containing a numbered cell */
    private getIslandRegion;
    /**
     * Get potential island region (white or unknown)
     * Returns ALL reachable cells, not just the first N
     */
    private getPotentialIslandRegion;
    /**
     * Get potential island region avoiding cells adjacent to other numbers
     * Based on sdvx's setContinueNotBlackPosSet2
     * This version doesn't expand through cells that are adjacent to other numbered cells
     * Returns ALL reachable cells (no early exit)
     */
    private getPotentialIslandRegionStrict;
    /**
     * sdvx setContinueNotBlackPosSet2 相当。
     * 他数字に接しない非黒セルで島を広げ、size を満たせるかを判定。
     * size を超えたら true（余裕あり）、全探索しても size 未満なら false（不足）。
     */
    private expandNotBlackAvoidNumbers;
    /**
     * sdvx setContinueWhitePosSet 相当。
     * 白確定セルのみをたどり、別数字に当たる/サイズ超過で矛盾。
     */
    private expandWhiteRegion;
    /**
     * sdvx setContinueNotBlackPosSet 相当。
     * 非黒をたどり、数字に届けば true。届かなければ false。
     */
    private expandNotBlackUntilNumber;
    /** Check if position can reach any number cell */
    private canReachNumber;
    /** Check for 2x2 black pool */
    private hasBlackPool;
    /** Prevent 2x2 pool by marking cells white */
    private preventPools;
    /** Check if black cells are connected */
    private isBlackConnected;
    /** Check island constraints (サイズ不足/過大/数字衝突を検出) */
    private checkIslandSizes;
    /** sdvx roomSolve 相当: サイズ不足/サイズ確定処理を厳密移植 */
    private roomSolve;
    /**
     * Mark isolated white cells as black
     * Returns: { ok: false } if contradiction, { ok: true, changed: boolean } otherwise
     */
    private solveIsolatedCells;
    /**
     * sdvx の notStandAlone 相当: 白連結が数字に届くか確認。
     * 数字を含まない白連結成分が数字へ到達しない場合は矛盾。
     */
    private checkNotStandAlone;
    /**
     * farSolve - Mark cells as black if they are too far from any number
     * Based on sdvx implementation: cells that cannot be reached by any island are black
     *
     * SDVX's logic: setContinuePosSetUseDistance(..., numbers[y][x] - 1)
     * This means from a number N, we can reach up to N-1 steps away from the number cell.
     * So for number 3, we can reach: the number cell itself (dist 0) + 2 more steps = 3 cells total.
     *
     * Returns: { ok: false } if contradiction, { ok: true, changed: boolean } otherwise
     */
    private farSolve;
    /**
     * whiteCountSolve - sdvx 相当: 数字合計 = 白マス数 を利用した早期確定
     */
    private solveWhiteBlackCount;
    clone(): NurikabeField;
    getStateDump(): string;
    isSolved(): boolean;
    /**
     * SDVX-style solveAndCheck
     * Order: farSolve (once) -> room -> pond -> connect -> notStandAlone -> whiteCount
     */
    solveAndCheck(debug?: boolean): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
    /**
     * Count adjacent unknown cells (for candSolve prioritization)
     * Returns count of UNKNOWN neighbors (out of bounds = 0)
     */
    countUnknownNeighbors(row: number, col: number): number;
    /**
     * Apply masu state from another field (for candSolve logic)
     */
    applyState(other: NurikabeField): void;
}
export declare class NurikabeSolver extends BaseSolver<NurikabeField> {
    /** Count of candSolve calls (for difficulty estimation) */
    private candSolveCount;
    /** Start time for timeout checking */
    private solveStartTime;
    /** Timeout limit in ms */
    private timeoutLimit;
    constructor(field: NurikabeField);
    /** Create solver from puzzle string */
    static fromString(height: number, width: number, puzzle: string[]): NurikabeSolver;
    /** Get candSolve call count */
    getCandSolveCount(): number;
    /** Check if timeout exceeded */
    private isTimedOut;
    /**
     * SDVX-style candSolve - trial and error solving
     * 深さは 0→1→2 のみ。進展しなければ終了（BaseSolverフォールバックなし）。
     * @returns false if contradiction found, true otherwise
     */
    protected candSolve(field: NurikabeField, recursive: number): boolean;
    /**
     * Try both BLACK and WHITE for a single cell
     * @returns false if contradiction (both fail), true otherwise
     */
    private oneCandSolve;
    /**
     * Override solve to use SDVX-style solving with candSolve (深さ0→1→2のみ)
     */
    solve(config?: SolverConfig): SolveResult<NurikabeField>;
    protected getBranchCandidates(state: NurikabeField): BranchCandidate<NurikabeField>[];
}
//# sourceMappingURL=nurikabe.d.ts.map