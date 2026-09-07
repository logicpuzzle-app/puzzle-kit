/**
 * Yajilin Solver
 *
 * Complete implementation based on SDVX's YajilinSolver.java
 *
 * Rules:
 * 1. Draw a single closed loop through the grid
 * 2. Black cells cannot be adjacent horizontally or vertically
 * 3. Arrow clues indicate the number of black cells in that direction
 * 4. The loop passes through all non-black, non-clue cells exactly once
 * 5. Each loop cell has exactly 2 edges (the loop enters and exits)
 */
import { CellState, Direction } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
import { LoopEdgeState } from './simpleloop.js';
/** Arrow clue indicating direction and count of black cells */
export interface YajilinArrow {
    direction: Direction;
    count: number;
}
export declare class YajilinField implements FieldState<YajilinField> {
    readonly height: number;
    readonly width: number;
    private cells;
    private arrows;
    private yokoEdge;
    private tateEdge;
    private arrowsInfo;
    private readonly outsideMode;
    constructor(height: number, width: number, outsideMode?: boolean);
    /** Set an arrow clue at position */
    setArrow(row: number, col: number, direction: Direction, count: number): void;
    getArrow(row: number, col: number): YajilinArrow | null;
    getCell(row: number, col: number): CellState;
    setCell(row: number, col: number, state: CellState): void;
    getYokoEdge(row: number, col: number): LoopEdgeState;
    getTateEdge(row: number, col: number): LoopEdgeState;
    setYokoEdge(row: number, col: number, state: LoopEdgeState): void;
    setTateEdge(row: number, col: number, state: LoopEdgeState): void;
    private arrowSolve;
    private nextSolve;
    private oddSolve;
    private connectSolve;
    private collectConnected;
    clone(): YajilinField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    /**
     * Identify cells that are definitely outside the loop
     * Cells reachable from the boundary through walls must be outside
     * Based on sdvx: ループの外側のセルを特定
     */
    private outsideSolve;
    /**
     * Try both options for an unknown cell/edge and see if one leads to contradiction
     * Based on sdvx: 仮説テストによる推論
     */
    private hypothesisSolve;
    /**
     * Basic solve without hypothesis (to avoid infinite recursion)
     */
    private basicSolve;
    toString(): string;
    /** Get branching candidates */
    getBranchingCandidates(): Array<{
        type: 'cell' | 'yokoEdge' | 'tateEdge';
        row: number;
        col: number;
    }>;
}
export declare class YajilinSolver extends BaseSolver<YajilinField> {
    constructor(field: YajilinField);
    /** Create solver from puzzle parameters */
    static fromString(height: number, width: number, puzzle: string[], outsideMode?: boolean): YajilinSolver;
    /** Create solver from config object */
    static create(height: number, width: number, config: {
        arrows?: Array<{
            row: number;
            col: number;
            direction: Direction;
            count: number;
        }>;
        outsideMode?: boolean;
    }): YajilinSolver;
    protected getBranchCandidates(state: YajilinField): BranchCandidate<YajilinField>[];
}
//# sourceMappingURL=yajilin.d.ts.map