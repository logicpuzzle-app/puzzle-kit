/**
 * Yosenabe (Bringing Together) Solver
 *
 * Rules:
 * 1. Move all circles vertically or horizontally into gray areas
 * 2. Arrows show movement - they don't bend and don't cross other circles/arrows
 * 3. The number in a gray area equals the sum of circles entering it
 * 4. Empty gray areas can have any sum but at least one circle must enter
 */
import { Position, Direction } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
interface Circle {
    pos: Position;
    value: number;
}
interface GrayArea {
    cells: Position[];
    targetSum: number | null;
}
interface Arrow {
    from: Position;
    direction: Direction;
    length: number;
}
export declare class YosenabeField implements FieldState<YosenabeField> {
    readonly height: number;
    readonly width: number;
    /** Circle values at positions (0 = no circle) */
    private circles;
    /** Gray area assignments (-1 = not gray) */
    private grayAreas;
    /** Gray area definitions */
    private areas;
    /** Arrow assignments for each circle */
    private arrows;
    constructor(height: number, width: number);
    setCircle(row: number, col: number, value: number): void;
    getCircle(row: number, col: number): number;
    setGrayArea(row: number, col: number, areaId: number): void;
    isGray(row: number, col: number): boolean;
    getGrayAreaId(row: number, col: number): number;
    addArea(cells: Position[], targetSum: number | null): number;
    getArea(areaId: number): GrayArea | null;
    /** Get all circles */
    getCircles(): Circle[];
    /** Set arrow for a circle */
    setArrow(row: number, col: number, arrow: Arrow): void;
    /** Get arrow for a circle */
    getArrow(row: number, col: number): Arrow | null;
    /** Check if arrow path is valid (no crossing) */
    isValidArrowPath(from: Position, dir: Direction, length: number): boolean;
    clone(): YosenabeField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get first circle without arrow */
    getFirstUnassignedCircle(): Circle | null;
}
export declare class YosenabeSolver extends BaseSolver<YosenabeField> {
    constructor(field: YosenabeField);
    static fromString(height: number, width: number, param: string): YosenabeSolver;
    protected getBranchCandidates(state: YosenabeField): BranchCandidate<YosenabeField>[];
}
export {};
//# sourceMappingURL=yosenabe.d.ts.map