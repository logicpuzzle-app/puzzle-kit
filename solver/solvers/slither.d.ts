/**
 * Slither Link Solver
 *
 * Rules:
 * 1. Draw a single continuous loop using horizontal and vertical line segments
 * 2. Numbers indicate exactly how many of the 4 edges around that cell are part of the loop
 * 3. The loop cannot cross itself or branch
 * 4. All line segments must be connected in a single loop
 */
import { EdgeState, SolveResult } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate, SolverConfig } from '../core/solver.js';
export declare class SlitherField implements FieldState<SlitherField> {
    readonly height: number;
    readonly width: number;
    /** Clue numbers (0-4), null means no clue */
    private numbers;
    /** Edge states */
    private edges;
    constructor(height: number, width: number);
    /** Set a clue number */
    setNumber(row: number, col: number, num: number | null): void;
    /** Get clue number */
    getNumber(row: number, col: number): number | null;
    /** Set horizontal edge (between rows row and row+1 at column col) */
    setHorizontalEdge(row: number, col: number, state: EdgeState): void;
    /** Set vertical edge (between columns col and col+1 at row row) */
    setVerticalEdge(row: number, col: number, state: EdgeState): void;
    /** Get horizontal edge */
    getHorizontalEdge(row: number, col: number): EdgeState;
    /** Get vertical edge */
    getVerticalEdge(row: number, col: number): EdgeState;
    /** Count edges around a cell with specific state */
    countEdgesAround(row: number, col: number, state: EdgeState): number;
    /** Count edges at a vertex with specific state
     * Vertex (row, col) ranges from (0,0) to (height, width)
     * - Up edge: vertical edge going up from vertex, at vertical.get(row-1, col)
     * - Down edge: vertical edge going down from vertex, at vertical.get(row, col)
     * - Left edge: horizontal edge going left from vertex, at horizontal.get(row, col-1)
     * - Right edge: horizontal edge going right from vertex, at horizontal.get(row, col)
     */
    countEdgesAtVertex(row: number, col: number, state: EdgeState): number;
    clone(): SlitherField;
    getStateDump(): string;
    isSolved(): boolean;
    /**
     * Main constraint propagation loop (SDVX style)
     * Calls rule functions repeatedly until no progress
     */
    solveAndCheck(): boolean;
    /**
     * numberSolve - Apply number constraints (SDVX style)
     * Each numbered cell has exactly N edges as LINE
     * Returns { valid: boolean, changed: boolean }
     */
    private numberSolve;
    /**
     * nextSolve - Apply vertex constraints (SDVX style)
     * Each vertex has exactly 0 or 2 LINE edges
     * Returns { valid: boolean, changed: boolean }
     */
    private nextSolve;
    /**
     * oddSolve - Parity check (SDVX style)
     * Each row/column must have even number of lines crossing it
     * Returns false if contradiction found
     */
    private oddSolve;
    /**
     * connectWhiteSolve - Check LINE connectivity (SDVX style)
     * All LINE edges must form a single connected component
     * Traverses via LINE or UNKNOWN edges (not EMPTY)
     * Returns false if disconnected groups found
     */
    private connectWhiteSolve;
    /**
     * finalSolve - Check that at least one edge exists (SDVX style)
     * Returns false if all edges are EMPTY
     */
    private finalSolve;
    /**
     * Verify that the solution is valid (all lines form a single closed loop)
     * Called after solving is complete
     */
    verifySolution(): boolean;
    /** Mark all edges at vertex with fromState to toState
     * Vertex (row, col) ranges from (0,0) to (height, width)
     */
    private markVertexEdges;
    toString(): string;
    /** Get all unknown edges */
    getUnknownEdges(): Array<{
        type: 'h' | 'v';
        row: number;
        col: number;
    }>;
    /**
     * Get unknown edges sorted by priority (higher priority = more constrained)
     * Priority factors:
     * - Adjacent to numbered cells (higher numbers = higher priority)
     * - On grid boundary (corners and edges are more constrained)
     * - Adjacent vertices have more determined edges
     */
    getUnknownEdgesSorted(): Array<{
        type: 'h' | 'v';
        row: number;
        col: number;
    }>;
    private getUnknownEdgesByPriority;
    /**
     * Calculate priority score for an edge
     */
    private calculateEdgePriority;
    /**
     * candSolve - 仮置きして調べる
     * SDVXのcandSolveに相当。各UNKNOWNエッジに対して:
     * - LINEを仮置きして矛盾がないか調べる
     * - EMPTYを仮置きして矛盾がないか調べる
     * - 一方が矛盾する場合、もう一方を確定する
     * - 両方可能な場合、共通の結果を適用する
     * @param recursive 再帰深度（0以上）
     * @returns 矛盾があればfalse
     */
    candSolve(recursive?: number): boolean;
    /**
     * 1つの縦エッジに対する仮置き解法
     */
    private oneCandVerticalSolve;
    /**
     * 1つの横エッジに対する仮置き解法
     */
    private oneCandHorizontalSolve;
    /**
     * 他のフィールドからエッジ状態をコピー
     */
    private copyEdgesFrom;
    /**
     * 2つの仮想フィールドで共通の結果を現在のフィールドに適用
     * 「どちらにしても」理論
     */
    private applyCommonEdges;
}
export declare class SlitherSolver extends BaseSolver<SlitherField> {
    private candCount;
    private backtrackCount;
    private candSolveCalls;
    constructor(field: SlitherField);
    /** Get solver statistics */
    getStats(): {
        branchCount: number;
        backtrackCount: number;
        candSolveCalls: number;
    };
    /** Create solver from puzzle string (numbers grid, . for empty) */
    static fromString(height: number, width: number, puzzle: string[]): SlitherSolver;
    /**
     * SDVXスタイルのソルバー
     * パターン: 手筋ループ → 変化なし → candSolve → 変化なし → 分岐 → 再度手筋
     */
    solve(config?: SolverConfig): SolveResult<SlitherField>;
    protected getBranchCandidates(state: SlitherField): BranchCandidate<SlitherField>[];
}
//# sourceMappingURL=slither.d.ts.map