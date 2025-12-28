/**
 * Firefly (Hotaru Beam) Solver
 *
 * Rules:
 * 1. Draw lines along grid edges to connect all fireflies into a single network
 * 2. Each firefly has a number and a direction (indicated by a dot)
 * 3. The line from the firefly's dot direction must turn exactly N times before connecting to another firefly
 * 4. Lines cannot branch or cross (except at firefly positions which can have multiple connections)
 * 5. All fireflies must be connected into one network
 * 6. A 0-circle goes straight until reaching another circle
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/** Edge state between vertices */
export declare enum FireflyEdgeState {
    /** Unknown/undetermined */
    UNKNOWN = 0,
    /** No line */
    EMPTY = 1,
    /** Line present */
    LINE = 2
}
/** Direction for firefly dot */
export declare enum FireflyDirection {
    UP = 0,
    RIGHT = 1,
    DOWN = 2,
    LEFT = 3
}
/** Firefly (circle with number and direction) */
export interface Firefly {
    row: number;
    col: number;
    num: number;
    dir: FireflyDirection;
}
export declare class FireflyField implements FieldState<FireflyField> {
    readonly height: number;
    readonly width: number;
    /** Horizontal edges (between col and col+1 at row) - size: (height+1) x width */
    private yokoEdge;
    /** Vertical edges (between row and row+1 at col) - size: height x (width+1) */
    private tateEdge;
    /** Fireflies indexed by vertex position key */
    private fireflies;
    /** All firefly positions for iteration */
    private fireflyList;
    constructor(height: number, width: number);
    /** Add a firefly at vertex position */
    addFirefly(row: number, col: number, num: number, dir: FireflyDirection): void;
    /** Get firefly at vertex position */
    getFirefly(row: number, col: number): Firefly | undefined;
    /** Get all fireflies */
    getFireflies(): Firefly[];
    /** Get horizontal edge state */
    getYokoEdge(row: number, col: number): FireflyEdgeState;
    /** Get vertical edge state */
    getTateEdge(row: number, col: number): FireflyEdgeState;
    /** Set horizontal edge */
    setYokoEdge(row: number, col: number, state: FireflyEdgeState): void;
    /** Set vertical edge */
    setTateEdge(row: number, col: number, state: FireflyEdgeState): void;
    /** Get edges around a vertex */
    private getVertexEdges;
    /** Count edges at vertex by state */
    private countVertexEdges;
    /**
     * Basic vertex constraints:
     * - Non-firefly vertices: 0 or 2 lines (no branching)
     * - Firefly vertices: can have multiple lines (network hub)
     */
    private nextSolve;
    /**
     * Firefly constraint: line from dot direction turns N times
     */
    private fireflySolve;
    /**
     * Trace a path from firefly with number 0 - must go straight
     */
    private traceZeroPath;
    /**
     * Check network connectivity - all fireflies must be connected
     */
    private connectSolve;
    private collectConnectedVertices;
    /**
     * Validate turn counts for completed paths
     */
    private turnSolve;
    /**
     * Trace path from a firefly in the dot direction
     * Returns: { complete: boolean, turns: number, minTurns: number }
     */
    private tracePath;
    private oppositeDir;
    clone(): FireflyField;
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
export declare class FireflySolver extends BaseSolver<FireflyField> {
    constructor(field: FireflyField);
    /**
     * Create solver from pzv.jp URL format
     * Format: fireflies are encoded with position, number, and direction
     */
    static fromString(height: number, width: number, param: string): FireflySolver;
    protected getBranchCandidates(state: FireflyField): BranchCandidate<FireflyField>[];
}
//# sourceMappingURL=firefly.d.ts.map