/**
 * Pipelink Solver
 *
 * Rules:
 * 1. Connect all cells with a single closed loop (or multiple loops that pass through every cell)
 * 2. Each cell has either 0, 2, or 4 connections (crossings are allowed)
 * 3. Some cells have predetermined pipe shapes (L, I, T, +)
 * 4. The loop(s) must pass through all cells exactly once or cross
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
import { LoopEdgeState } from './simpleloop.js';
/** Pipe shape types - indicates which directions are connected */
export type PipeShape = 'cross' | 'vertical' | 'horizontal' | 'corner_ne' | 'corner_se' | 'corner_sw' | 'corner_nw';
export declare class PipelinkField implements FieldState<PipelinkField> {
    readonly height: number;
    readonly width: number;
    /** Horizontal edges (between col and col+1) - LINE means loop passes through */
    private yokoEdge;
    /** Vertical edges (between row and row+1) */
    private tateEdge;
    /** Cells with fixed pipe shapes */
    private fixedCells;
    constructor(height: number, width: number);
    /** Set a fixed pipe shape at position */
    setFixedPipe(row: number, col: number, shape: PipeShape): void;
    /** Check if cell has fixed shape */
    isFixed(row: number, col: number): boolean;
    /** Get horizontal edge state */
    getYokoEdge(row: number, col: number): LoopEdgeState;
    /** Get vertical edge state */
    getTateEdge(row: number, col: number): LoopEdgeState;
    /** Set horizontal edge */
    setYokoEdge(row: number, col: number, state: LoopEdgeState): void;
    /** Set vertical edge */
    setTateEdge(row: number, col: number, state: LoopEdgeState): void;
    /** Each cell must have 0, 2, or 4 edges */
    private nextSolve;
    /** Parity check: loop crossings must be even */
    private oddSolve;
    /** Check connectivity - all cells must be part of the loop(s) */
    private connectSolve;
    /** Trace the loop from position, preferring straight lines */
    private traceLoop;
    clone(): PipelinkField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown edges for branching */
    getUnknownEdges(): Array<{
        type: 'h' | 'v';
        row: number;
        col: number;
    }>;
}
export declare class PipelinkSolver extends BaseSolver<PipelinkField> {
    constructor(field: PipelinkField);
    /** Create solver with fixed pipe shapes */
    static create(height: number, width: number, config: {
        pipes?: Array<{
            row: number;
            col: number;
            shape: PipeShape;
        }>;
    }): PipelinkSolver;
    protected getBranchCandidates(state: PipelinkField): BranchCandidate<PipelinkField>[];
}
//# sourceMappingURL=pipelink.d.ts.map