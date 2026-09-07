/**
 * Domino Field Solver
 *
 * Rules:
 * 1. Place dominoes in the grid
 * 2. Each domino covers exactly 2 cells
 * 3. Numbers indicate constraints about adjacent dominoes
 * 4. All cells must be covered by dominoes
 * 5. Dominoes cannot overlap
 */
import { Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
interface Domino {
    cell1: Position;
    cell2: Position;
}
export declare class DominofieldField implements FieldState<DominofieldField> {
    readonly height: number;
    readonly width: number;
    /** Cell to domino assignment (-1 = unassigned) */
    private cellAssignment;
    /** List of placed dominoes */
    private dominoes;
    /** Number clues */
    private clues;
    constructor(height: number, width: number);
    setClue(row: number, col: number, value: number): void;
    /** Get possible domino placements for a cell */
    getDominoCandidates(row: number, col: number): Domino[];
    placeDomino(domino: Domino): void;
    clone(): DominofieldField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get first unassigned cell */
    getFirstUnassignedCell(): Position | null;
}
export declare class DominofieldSolver extends BaseSolver<DominofieldField> {
    constructor(field: DominofieldField);
    static fromString(height: number, width: number, param: string): DominofieldSolver;
    protected getBranchCandidates(state: DominofieldField): BranchCandidate<DominofieldField>[];
}
export {};
//# sourceMappingURL=dominofield.d.ts.map