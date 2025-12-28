/**
 * Rectangle Slider Solver
 *
 * Rules:
 * 1. Move rectangles horizontally or vertically
 * 2. Numbers indicate how many cells the rectangle moves
 * 3. Rectangles cannot overlap after moving
 * 4. Rectangles must stay within the grid
 */
import { Rectangle } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class RectsliderField implements FieldState<RectsliderField> {
    readonly height: number;
    readonly width: number;
    private rectangles;
    constructor(height: number, width: number);
    addRectangle(top: number, left: number, bottom: number, right: number, moveCount: number | null): void;
    private generateCandidates;
    private rectanglesOverlap;
    private filterConflictingCandidates;
    clone(): RectsliderField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    getMostConstrainedRect(): number;
    getRectCandidates(rectIndex: number): Rectangle[];
    setRectPosition(rectIndex: number, position: Rectangle): void;
}
export declare class RectsliderSolver extends BaseSolver<RectsliderField> {
    constructor(field: RectsliderField);
    static fromString(height: number, width: number, param: string): RectsliderSolver;
    protected getBranchCandidates(state: RectsliderField): BranchCandidate<RectsliderField>[];
}
//# sourceMappingURL=rectslider.d.ts.map