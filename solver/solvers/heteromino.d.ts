/**
 * Heteromino Solver
 *
 * Rules:
 * 1. Divide the grid into triominoes (3-cell shapes)
 * 2. Each triomino is either L-shaped or I-shaped (straight)
 * 3. Same shape triominoes cannot share an edge
 * 4. Black cells cannot be part of any triomino
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/**
 * Shape types for triominoes
 * 1: L-shape, bottom-right missing (┘)
 * 2: L-shape, bottom-left missing (└)
 * 3: L-shape, top-right missing (┐)
 * 4: L-shape, top-left missing (┌)
 * 5: I-shape vertical (│)
 * 6: I-shape horizontal (─)
 */
export type ShapeType = 1 | 2 | 3 | 4 | 5 | 6;
export interface Shape {
    type: ShapeType;
    positions: Set<string>;
}
export declare class HeterominoField implements FieldState<HeterominoField> {
    readonly height: number;
    readonly width: number;
    /** Black cells (obstacles) */
    private blackCells;
    /** Candidate shapes */
    private shapeCand;
    /** Fixed (confirmed) shapes */
    private shapeFixed;
    constructor(height: number, width: number);
    /** Mark a cell as black (obstacle) */
    setBlack(row: number, col: number): void;
    /** Check if cell is black */
    isBlack(row: number, col: number): boolean;
    /** Initialize shape candidates */
    initCandidates(): void;
    /** Generate all possible shape candidates */
    private makeShapeCandidates;
    /** Check if a shape is banned by a fixed shape */
    private isBanned;
    /** Remove banned candidates based on fixed shapes */
    private shapeSolve;
    /** Check if all non-black cells can be covered */
    private countSolve;
    clone(): HeterominoField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get shape candidates for branching */
    getShapeCandidates(): Shape[];
    /** Get fixed shapes */
    getFixedShapes(): Shape[];
    /** Fix a shape (move from candidate to fixed) */
    fixShape(shape: Shape): void;
    /** Remove a shape from candidates */
    removeCandidate(shape: Shape): void;
}
export declare class HeterominoSolver extends BaseSolver<HeterominoField> {
    constructor(field: HeterominoField);
    /** Create solver from puzzle string array */
    static fromString(height: number, width: number, puzzle: string[]): HeterominoSolver;
    protected getBranchCandidates(state: HeterominoField): BranchCandidate<HeterominoField>[];
}
//# sourceMappingURL=heteromino.d.ts.map