/**
 * Masyu Solver
 *
 * Rules:
 * 1. Draw a single continuous loop through all pearl cells
 * 2. White pearls (circles): Loop goes straight through, and turns in at least one adjacent cell
 * 3. Black pearls (filled): Loop turns at the pearl, and goes straight in both directions
 * 4. The loop cannot cross itself or branch
 */
import { EdgeState, Direction, SolveResult } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate, SolverConfig } from '../core/solver.js';
export declare enum PearlType {
    NONE = "none",
    WHITE = "white",// Go straight, turn in adjacent cell
    BLACK = "black"
}
export declare class MasyuField implements FieldState<MasyuField> {
    readonly height: number;
    readonly width: number;
    /** Pearl positions */
    private pearls;
    /** Horizontal edges */
    private hEdges;
    /** Vertical edges */
    private vEdges;
    constructor(height: number, width: number);
    /** Set a pearl */
    setPearl(row: number, col: number, type: PearlType): void;
    /** Get pearl at position */
    getPearl(row: number, col: number): PearlType;
    /** Get edge state */
    getEdge(row: number, col: number, dir: Direction): EdgeState;
    /** Set edge state */
    setEdge(row: number, col: number, dir: Direction, state: EdgeState): void;
    /** Count edges at a cell with specific state */
    countEdges(row: number, col: number, state: EdgeState): number;
    /** Check if cell has a straight path (up-down or left-right) */
    private isStraight;
    /** Check if cell can be straight */
    private canBeStraight;
    /** Check if cell has a turn */
    private isTurn;
    /** Check if cell can turn */
    private canTurn;
    /** Make cell go straight */
    private makeStraight;
    /** Make cell turn */
    private makeTurn;
    /**
     * nextSolve - Extend lines from cells that have exactly one line
     * If a cell has 1 LINE and 2 EMPTY, the remaining UNKNOWN must be LINE
     * Based on sdvx's nextSolve technique
     */
    private nextSolve;
    /**
     * pearlPatternSolve - Apply more sophisticated pearl patterns
     * Based on sdvx's multi-layered pearl solving
     */
    private pearlPatternSolve;
    /**
     * Handle adjacent black pearls
     * When two black pearls are adjacent, they must both turn
     * but cannot share the same line direction between them
     */
    private solveAdjacentBlackPearls;
    /**
     * Handle adjacent white pearls
     * When two white pearls are adjacent, they must both go straight
     * The edge between them is forced to be LINE
     */
    private solveAdjacentWhitePearls;
    /**
     * Solve black pearl patterns
     * Black pearl: must turn, then both adjacent cells go straight
     */
    private solveBlackPearlPattern;
    /**
     * Solve white pearl patterns
     * White pearl: must go straight, then at least one adjacent turns
     */
    private solveWhitePearlPattern;
    /**
     * oddSolve - Each row/column must have an even number of lines crossing it
     * Based on sdvx: ましゅのルール上、各列をふさぐ壁は必ず偶数になる
     * Returns false if contradiction found
     */
    private checkOddParity;
    /**
     * paritySolve - Use parity to determine edges
     * If a row/column boundary has exactly one UNKNOWN edge and the current
     * line count is odd, that edge must be LINE to make it even.
     * If even and one UNKNOWN, it must be EMPTY.
     * Based on sdvx's paritySolve concept
     */
    private paritySolve;
    /**
     * earlyLoopClosurePrevention - Prevent premature loop closure
     * If connecting two cells would close a loop before all pearls are visited,
     * block that edge.
     * Based on sdvx's connectivity-aware solving
     */
    private checkEarlyLoopClosure;
    private getOppositeDir;
    /**
     * Check if loop cells are connected (no isolated segments)
     * Based on sdvx's connectSolve
     *
     * Important: This checks if all LINE segments can potentially be connected
     * via LINE or UNKNOWN edges. We only reject if two LINE segments are
     * definitely disconnected (separated by EMPTY edges only).
     */
    private checkLoopConnectivity;
    /**
     * Solve white pearl adjacent curve constraint
     * White pearl: loop goes straight, and at least one adjacent cell must turn
     */
    private solveWhitePearlAdjacentCurve;
    /**
     * Solve black pearl adjacent straight constraint
     * Black pearl: turns here, adjacent cells in line direction must go straight
     */
    private solveBlackPearlAdjacentStraight;
    clone(): MasyuField;
    getStateDump(): string;
    isSolved(): boolean;
    /** Check that white pearl has at least one adjacent turn */
    private checkWhiteAdjacentTurns;
    /** Check that black pearl has both adjacent cells going straight */
    private checkBlackAdjacentStraight;
    /** Check that there is exactly one loop (connected, all cells with lines form one component) */
    private checkSingleLoop;
    solveAndCheck(): boolean;
    toString(): string;
    /**
     * candSolve - 仮置きして調べる（SDVXスタイル）
     * 各UNKNOWNエッジに対して:
     * - LINEを仮置きして矛盾がないか調べる
     * - EMPTYを仮置きして矛盾がないか調べる
     * - 一方が矛盾する場合、もう一方を確定する
     * - 両方可能な場合、共通の結果を適用する
     * @param recursive 再帰深度（0以上）
     * @returns 矛盾があればfalse
     */
    candSolve(recursive?: number): boolean;
    /**
     * 1つの水平エッジに対する仮置き解法
     */
    private oneCandHorizontalSolve;
    /**
     * 1つの垂直エッジに対する仮置き解法
     */
    private oneCandVerticalSolve;
    /**
     * 他のフィールドからエッジ状態をコピー
     */
    private copyEdgesFrom;
    /**
     * 2つの仮想フィールドで共通の結果を現在のフィールドに適用
     * 「どちらにしても」理論
     */
    private applyCommonEdges;
    /** Get unknown edges for branching, sorted by priority */
    getUnknownEdges(): Array<{
        row: number;
        col: number;
        dir: Direction;
    }>;
    /**
     * Calculate priority for an edge
     * Higher priority = more constrained = should try first
     * Based on sdvx's candSolve heuristics
     */
    private calculateEdgePriority;
}
export declare class MasyuSolver extends BaseSolver<MasyuField> {
    private candCount;
    private backtrackCount;
    private candSolveCalls;
    constructor(field: MasyuField);
    /** Get solver statistics */
    getStats(): {
        branchCount: number;
        backtrackCount: number;
        candSolveCalls: number;
    };
    /** Create solver from puzzle string */
    static fromString(height: number, width: number, puzzle: string[]): MasyuSolver;
    /**
     * SDVXスタイルのソルバー
     * パターン: 手筋ループ → 変化なし → candSolve → 変化なし → 分岐 → 再度手筋
     */
    solve(config?: SolverConfig): SolveResult<MasyuField>;
    protected getBranchCandidates(state: MasyuField): BranchCandidate<MasyuField>[];
}
//# sourceMappingURL=masyu.d.ts.map