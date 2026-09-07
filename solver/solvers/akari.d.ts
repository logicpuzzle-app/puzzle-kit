/**
 * Akari (Light Up) Solver
 *
 * Rules:
 * 1. Place lights in empty cells
 * 2. Lights illuminate horizontally and vertically until blocked by a wall
 * 3. No two lights can see each other
 * 4. All empty cells must be illuminated
 * 5. Numbers indicate exactly how many lights are adjacent (orthogonally) to that wall
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/** Akari cell value */
export type AkariCell = {
    type: 'empty';
    state: CellState;
    lit: boolean;
} | {
    type: 'wall';
    number: number | null;
} | {
    type: 'light';
};
export declare class AkariField implements FieldState<AkariField> {
    readonly height: number;
    readonly width: number;
    private cells;
    private wallNumbers;
    constructor(height: number, width: number);
    /** Set a wall (optionally with number) */
    setWall(row: number, col: number, number?: number): void;
    /** Get cell at position */
    getCell(pos: Position): AkariCell;
    /** Place a light */
    placeLight(row: number, col: number): boolean;
    /** Mark cell as definitely no light */
    markNoLight(row: number, col: number): boolean;
    /** Update lighting state after placing lights */
    private updateLighting;
    /** Check for contradictions */
    private hasContradiction;
    /** Count adjacent lights to a wall */
    private countAdjacentLights;
    /** Count adjacent empty cells (potential light positions) */
    private countAdjacentEmpty;
    clone(): AkariField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    /**
     * lightSolve - If a cell is not lit and cannot be lit from any direction,
     * it must contain a light itself
     * Based on sdvx: 照らされていないセルが他から照らされる可能性がない場合
     */
    private solveLightForced;
    /**
     * shadowSolve - If placing no-light mark at a cell would make it impossible
     * to light some other cell, then this cell must have a light
     * Based on sdvx: セルにライトを置かないと矛盾が生じる場合
     */
    private solveShadow;
    /** Get possible positions that could light up a cell */
    private getPossibleLightSources;
    toString(): string;
    /** Get all unknown empty cells (for branching) */
    getUnknownCells(): Position[];
}
export declare class AkariSolver extends BaseSolver<AkariField> {
    constructor(field: AkariField);
    /** Create solver from puzzle string */
    static fromString(height: number, width: number, puzzle: string[]): AkariSolver;
    protected getBranchCandidates(state: AkariField): BranchCandidate<AkariField>[];
}
//# sourceMappingURL=akari.d.ts.map