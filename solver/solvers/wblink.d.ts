/**
 * Wblink Solver
 *
 * Rules:
 * 1. The grid contains white circles (○) and black circles (●)
 * 2. Each white circle must be connected to exactly one black circle by a straight line
 * 3. Lines can only go horizontally or vertically
 * 4. A line from a white circle stops at the first black circle it reaches
 * 5. Lines cannot cross each other
 * 6. All black circles must be connected to by at least one white circle
 */
import { Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class WblinkField implements FieldState<WblinkField> {
    readonly height: number;
    readonly width: number;
    /** White circle positions */
    private readonly white;
    /** Black circle positions */
    private readonly black;
    /** Connection candidates: Map from white circle position to possible black circle positions */
    private candidates;
    constructor(height: number, width: number);
    /** Set white circle at position */
    setWhite(row: number, col: number): void;
    /** Set black circle at position */
    setBlack(row: number, col: number): void;
    /** Check if position has white circle */
    isWhite(row: number, col: number): boolean;
    /** Check if position has black circle */
    isBlack(row: number, col: number): boolean;
    /** Initialize connection candidates for all white circles */
    initializeCandidates(): void;
    /** Get connection candidates for a white circle */
    getCandidates(whitePos: Position): Set<string>;
    /** Set fixed connection (reduce to single candidate) */
    setConnection(whitePos: Position, blackPos: Position): void;
    /** Check if two line segments cross */
    private isCross;
    /** Apply constraint propagation: eliminate crossing candidates */
    private moveSolve;
    /** Parse position from key */
    private parsePosition;
    clone(): WblinkField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get white circles that have multiple candidates (for branching) */
    getUnfixedWhiteCircles(): Position[];
}
export declare class WblinkSolver extends BaseSolver<WblinkField> {
    constructor(field: WblinkField);
    /**
     * Create solver from encoded string
     * Format: height/width/param
     * Each character in param encodes 3 cells using base-27 encoding
     * Each cell: 0=empty, 1=white, 2=black
     */
    static fromString(height: number, width: number, param: string): WblinkSolver;
    protected getBranchCandidates(state: WblinkField): BranchCandidate<WblinkField>[];
}
//# sourceMappingURL=wblink.d.ts.map