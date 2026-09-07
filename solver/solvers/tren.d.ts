/**
 * Tren (Train) Solver
 *
 * Rules:
 * 1. Move train cars on the grid
 * 2. Numbers indicate how many cells the train moves
 * 3. Trains move in straight lines (horizontal or vertical)
 * 4. Trains cannot overlap after moving
 */
import { Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare enum TrenDirection {
    HORIZONTAL = 0,
    VERTICAL = 1
}
interface Train {
    id: number;
    cells: Position[];
    direction: TrenDirection;
    moveCount: number | null;
    currentOffset: number;
}
export declare class TrenField implements FieldState<TrenField> {
    readonly height: number;
    readonly width: number;
    /** Train definitions */
    private trains;
    /** Cell to train mapping */
    private cellToTrain;
    /** Wall cells */
    private walls;
    constructor(height: number, width: number);
    setWall(row: number, col: number): void;
    addTrain(cells: Position[], direction: TrenDirection, moveCount: number | null): void;
    moveTrain(trainId: number, offset: number): boolean;
    checkNoOverlap(): boolean;
    clone(): TrenField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    getTrains(): Train[];
    getUnmovedTrains(): number[];
}
export declare class TrenSolver extends BaseSolver<TrenField> {
    constructor(field: TrenField);
    static fromString(height: number, width: number, param: string): TrenSolver;
    protected getBranchCandidates(state: TrenField): BranchCandidate<TrenField>[];
}
export {};
//# sourceMappingURL=tren.d.ts.map