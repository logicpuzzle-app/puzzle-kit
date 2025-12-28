/**
 * Hashikake (Bridges) Solver
 *
 * Rules:
 * 1. Connect islands (numbered cells) with horizontal or vertical bridges
 * 2. Each island's number indicates the total bridges connected to it
 * 3. Bridges can be single (1) or double (2) lines
 * 4. Bridges cannot cross each other
 * 5. All islands must be connected (form a single connected group)
 * 6. Bridges go straight from island to island (no turns)
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/** Bridge state between cells */
export declare enum BridgeState {
    /** Unknown/undetermined */
    UNKNOWN = "unknown",
    /** No bridge */
    NONE = "none",
    /** Single bridge */
    SINGLE = "single",
    /** Double bridge */
    DOUBLE = "double"
}
/** Bridge count (-1 = unknown, 0 = none, 1 = single, 2 = double) */
export type BridgeCount = -1 | 0 | 1 | 2;
export declare class HashikakeField implements FieldState<HashikakeField> {
    readonly height: number;
    readonly width: number;
    /** Cell states */
    private cells;
    /** Island numbers (null = not an island, -1 = unknown count) */
    private numbers;
    /** Horizontal bridge states (between col and col+1) */
    private yokoBridge;
    /** Vertical bridge states (between row and row+1) */
    private tateBridge;
    /** Horizontal bridge counts (-1 = undetermined for island edge) */
    private yokoBridgeCount;
    /** Vertical bridge counts */
    private tateBridgeCount;
    constructor(height: number, width: number);
    /** Set an island with number */
    setIsland(row: number, col: number, num: number): void;
    /** Get island number */
    getNumber(row: number, col: number): number | null;
    /** Get horizontal bridge state */
    getYokoBridge(row: number, col: number): BridgeState;
    /** Get vertical bridge state */
    getTateBridge(row: number, col: number): BridgeState;
    /** Set horizontal bridge state */
    setYokoBridge(row: number, col: number, state: BridgeState): void;
    /** Set vertical bridge state */
    setTateBridge(row: number, col: number, state: BridgeState): void;
    /** Get horizontal bridge count */
    getYokoBridgeCount(row: number, col: number): BridgeCount;
    /** Get vertical bridge count */
    getTateBridgeCount(row: number, col: number): BridgeCount;
    /** Set horizontal bridge count */
    setYokoBridgeCount(row: number, col: number, count: BridgeCount): void;
    /** Set vertical bridge count */
    setTateBridgeCount(row: number, col: number, count: BridgeCount): void;
    /** Sync bridge state with bridge count */
    private gateSolve;
    /** Island constraint: total bridges = number */
    private isleSolve;
    /** Non-island cells: must be either empty or pass-through (straight) */
    private wallSolve;
    /** Bridge count consistency between islands */
    private bridgeSolve;
    /** All islands must be connected */
    private connectSolve;
    private collectConnected;
    clone(): HashikakeField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown bridges for branching */
    getUnknownBridges(): Array<{
        type: 'h' | 'v';
        row: number;
        col: number;
    }>;
}
export declare class HashikakeSolver extends BaseSolver<HashikakeField> {
    constructor(field: HashikakeField);
    /** Create solver with island numbers */
    static create(height: number, width: number, config: {
        islands: Array<{
            row: number;
            col: number;
            num: number;
        }>;
    }): HashikakeSolver;
    protected getBranchCandidates(state: HashikakeField): BranchCandidate<HashikakeField>[];
}
//# sourceMappingURL=hashikake.d.ts.map