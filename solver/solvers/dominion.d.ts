/**
 * Dominion Solver
 *
 * Rules:
 * 1. Divide the grid into white regions and black dominoes (2-cell horizontal/vertical blocks)
 * 2. White cells with the same letter/number belong to the same region
 * 3. Black cells form exactly dominoes (2-cell blocks)
 * 4. Black dominoes cannot form a 2x2 or larger block
 * 5. Black dominoes cannot form L-shapes or T-shapes
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class DominionField implements FieldState<DominionField> {
    readonly height: number;
    readonly width: number;
    /** Cell states */
    private cells;
    /** Region identifiers (numbers/letters) at cells */
    private numbers;
    constructor(height: number, width: number);
    /** Set a region identifier at position */
    setNumber(row: number, col: number, num: number): void;
    /** Get number at position */
    getNumber(row: number, col: number): number | null;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell state */
    setCell(row: number, col: number, state: CellState): void;
    /** Check black domino constraints */
    private roundSolve;
    /** Get connected white cells */
    private getConnectedWhite;
    /** Get potentially connected cells (white or unknown) */
    private getPotentialWhite;
    /** Check number constraints - same numbers must connect, different must not */
    private numberSolve;
    /** Check white regions without numbers can reach a number */
    private notStandAloneSolve;
    clone(): DominionField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class DominionSolver extends BaseSolver<DominionField> {
    constructor(field: DominionField);
    /** Create solver from puzzle string array */
    static fromString(height: number, width: number, puzzle: string[]): DominionSolver;
    protected getBranchCandidates(state: DominionField): BranchCandidate<DominionField>[];
}
//# sourceMappingURL=dominion.d.ts.map