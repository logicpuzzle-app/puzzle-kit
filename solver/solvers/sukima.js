/**
 * Sukima (隙間 - Gap) Solver
 *
 * Rules:
 * 1. Divide the grid into rectangular rooms
 * 2. Each number indicates the count of empty cells (gaps) in that room
 * 3. A room can contain multiple numbers, but all must match
 * 4. Empty cells are those without numbers
 */
import { posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Sukima Field State
// ============================================
export class SukimaField {
    height;
    width;
    /** Numbers in cells */
    numbers;
    /** Candidate rectangles */
    squareCand;
    /** Fixed rectangles */
    squareFixed;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.numbers = new Grid(height, width, () => null);
        this.squareCand = new Set();
        this.squareFixed = new Set();
    }
    /** Set a number */
    setNumber(row, col, num) {
        this.numbers.set(row, col, num);
    }
    /** Initialize rectangle candidates */
    initCandidates() {
        this.squareCand = new Set();
        this.squareFixed = new Set();
        // Generate all possible rectangles
        for (let y1 = 0; y1 < this.height; y1++) {
            for (let x1 = 0; x1 < this.width; x1++) {
                for (let y2 = y1; y2 < this.height; y2++) {
                    for (let x2 = x1; x2 < this.width; x2++) {
                        const rect = { top: y1, left: x1, bottom: y2, right: x2 };
                        // Count gaps and numbers in this rectangle
                        let gapCount = 0;
                        let numberValue = -1;
                        let isValid = true;
                        for (let y = y1; y <= y2; y++) {
                            for (let x = x1; x <= x2; x++) {
                                const num = this.numbers.get(y, x);
                                if (num === null) {
                                    gapCount++;
                                }
                                else {
                                    if (numberValue === -1) {
                                        numberValue = num;
                                    }
                                    else if (numberValue !== num) {
                                        isValid = false;
                                        break;
                                    }
                                }
                            }
                            if (!isValid)
                                break;
                        }
                        // Add rectangle if gap count matches number
                        if (isValid && numberValue !== -1 && gapCount === numberValue) {
                            this.squareCand.add(rect);
                        }
                    }
                }
            }
        }
    }
    /** Remove candidates that overlap with fixed rectangles */
    sikakuSolve() {
        for (const fixed of this.squareFixed) {
            const toRemove = [];
            for (const cand of this.squareCand) {
                if (this.rectanglesOverlap(cand, fixed)) {
                    toRemove.push(cand);
                }
            }
            for (const rect of toRemove) {
                this.squareCand.delete(rect);
            }
        }
        return true;
    }
    /** Check if two rectangles overlap */
    rectanglesOverlap(r1, r2) {
        for (let y = r1.top; y <= r1.bottom; y++) {
            for (let x = r1.left; x <= r1.right; x++) {
                if (y >= r2.top && y <= r2.bottom && x >= r2.left && x <= r2.right) {
                    return true;
                }
            }
        }
        return false;
    }
    /** Check if all cells are covered */
    allSolve() {
        const covered = new Set();
        for (const rect of this.squareFixed) {
            for (let y = rect.top; y <= rect.bottom; y++) {
                for (let x = rect.left; x <= rect.right; x++) {
                    covered.add(posKey({ row: y, col: x }));
                }
            }
        }
        if (covered.size === this.width * this.height) {
            return true;
        }
        // Check if remaining cells can be covered
        for (const rect of this.squareCand) {
            for (let y = rect.top; y <= rect.bottom; y++) {
                for (let x = rect.left; x <= rect.right; x++) {
                    covered.add(posKey({ row: y, col: x }));
                }
            }
        }
        return covered.size === this.width * this.height;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new SukimaField(this.height, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.numbers.set(y, x, this.numbers.get(y, x));
            }
        }
        cloned.squareCand = new Set(this.squareCand);
        cloned.squareFixed = new Set(this.squareFixed);
        return cloned;
    }
    getStateDump() {
        return `${this.squareFixed.size}:${this.squareCand.size}`;
    }
    isSolved() {
        return this.squareCand.size === 0 && this.solveAndCheck();
    }
    solveAndCheck() {
        const before = this.getStateDump();
        if (!this.sikakuSolve())
            return false;
        if (this.getStateDump() !== before) {
            return this.solveAndCheck();
        }
        if (!this.allSolve())
            return false;
        return true;
    }
    toString() {
        const grid = Array(this.height)
            .fill(null)
            .map(() => Array(this.width).fill('.'));
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const num = this.numbers.get(y, x);
                if (num !== null) {
                    grid[y][x] = num.toString();
                }
            }
        }
        return grid.map((row) => row.join(' ')).join('\n');
    }
    /** Get branching info */
    getBranchInfo() {
        if (this.squareCand.size === 0)
            return null;
        return this.squareCand.values().next().value ?? null;
    }
    /** Add rectangle to fixed set */
    addFixed(rect) {
        this.squareFixed.add(rect);
        this.squareCand.delete(rect);
    }
    /** Remove rectangle from candidates */
    removeCandidate(rect) {
        this.squareCand.delete(rect);
    }
}
// ============================================
// Sukima Solver
// ============================================
export class SukimaSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    getBranchCandidates(state) {
        const rect = state.getBranchInfo();
        if (!rect)
            return [];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.addFixed(rect);
                    return cloned;
                },
                description: `Add rectangle (${rect.top},${rect.left})-(${rect.bottom},${rect.right})`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.removeCandidate(rect);
                    return cloned;
                },
                description: `Remove rectangle (${rect.top},${rect.left})-(${rect.bottom},${rect.right})`,
            },
        ];
    }
}
//# sourceMappingURL=sukima.js.map