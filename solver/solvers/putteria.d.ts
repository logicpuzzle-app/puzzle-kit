/**
 * Putteria Solver
 *
 * Rules:
 * 1. Paint some cells black
 * 2. Each room contains exactly 1 black cell
 * 3. Black cells cannot be adjacent orthogonally
 * 4. Black cells in rooms of the same size cannot appear in the same row or column
 */
import { CellState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class PutteriaField implements FieldState<PutteriaField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (BLACK = filled, WHITE = not filled, UNKNOWN = undecided) */
    private masu;
    /** Horizontal walls */
    private readonly yokoWall;
    /** Vertical walls */
    private readonly tateWall;
    /** Room assignments */
    private readonly rooms;
    /** Fixed cells (pre-marked X) */
    private fixedMasuSet;
    constructor(height: number, width: number);
    /** Set horizontal wall */
    setYokoWall(row: number, col: number, hasWall: boolean): void;
    /** Set vertical wall */
    setTateWall(row: number, col: number, hasWall: boolean): void;
    /** Mark cell as fixed (either BLACK or WHITE) */
    setFixedMasu(row: number, col: number, state: CellState): void;
    /** Initialize rooms from walls */
    initRooms(): void;
    /** Collect cells in the same room */
    private collectRoom;
    /** Get room size for a position */
    private getRoomSize;
    /** Each room has exactly one BLACK (number) cell */
    private roomSolve;
    /** Numbers cannot be orthogonally adjacent */
    private nextSolve;
    /** Same room size numbers cannot share row or column */
    private onlySolve;
    clone(): PutteriaField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
}
export declare class PutteriaSolver extends BaseSolver<PutteriaField> {
    constructor(field: PutteriaField);
    /** Create solver from pzprv3 URL parameter */
    static fromString(height: number, width: number, param: string): PutteriaSolver;
    protected getBranchCandidates(state: PutteriaField): BranchCandidate<PutteriaField>[];
}
//# sourceMappingURL=putteria.d.ts.map