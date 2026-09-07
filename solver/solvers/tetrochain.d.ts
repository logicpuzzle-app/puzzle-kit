/**
 * Tetrochain Solver
 *
 * Rules:
 * 1. Divide the grid into tetrominoes (4-cell pieces)
 * 2. Tetrominoes of the same shape cannot share an edge
 * 3. All cells must be covered
 * 4. Numbers indicate constraints on adjacent tetrominoes
 */
import { Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
type TetrominoShape = 'I' | 'O' | 'T' | 'S' | 'Z' | 'L' | 'J';
interface Tetromino {
    shape: TetrominoShape;
    cells: Position[];
}
export declare class TetrochainField implements FieldState<TetrochainField> {
    readonly height: number;
    readonly width: number;
    /** Cell to tetromino assignment (-1 = unassigned) */
    private cellAssignment;
    /** List of placed tetrominoes */
    private tetrominoes;
    /** Number clues */
    private clues;
    constructor(height: number, width: number);
    setClue(row: number, col: number, value: number): void;
    /** Get all possible tetromino placements starting from a cell */
    private getTetrominoCandidates;
    /** Check if two tetrominoes of same shape are adjacent */
    private sameShapeAdjacent;
    placeTetromino(tetromino: Tetromino): void;
    clone(): TetrochainField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get first unassigned cell */
    getFirstUnassignedCell(): Position | null;
    getCandidatesForCell(row: number, col: number): Tetromino[];
}
export declare class TetrochainSolver extends BaseSolver<TetrochainField> {
    constructor(field: TetrochainField);
    static fromString(height: number, width: number, param: string): TetrochainSolver;
    protected getBranchCandidates(state: TetrochainField): BranchCandidate<TetrochainField>[];
}
export {};
//# sourceMappingURL=tetrochain.d.ts.map