/**
 * Mochikoro Solver
 *
 * Rules:
 * 1. Paint some cells black
 * 2. White cells form rectangular regions (islands)
 * 3. Numbers indicate the size of the white rectangle they belong to
 * 4. Each white rectangle contains exactly one number
 * 5. No 2x2 area can be entirely black
 * 6. All white cells must be connected diagonally (can touch corners)
 */
import { CellState, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Mochikoro Field State
// ============================================
export class MochikoroField {
    height;
    width;
    /** Numbers in each cell (null = no number, positive = size) */
    numbers;
    /** Rectangle candidates */
    squareCand;
    /** Fixed (confirmed) rectangles */
    squareFixed;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.numbers = new Grid(height, width, () => null);
        this.squareCand = [];
        this.squareFixed = [];
    }
    /** Set a number */
    setNumber(row, col, num) {
        this.numbers.set(row, col, num);
    }
    /** Get number at position */
    getNumber(row, col) {
        return this.numbers.get(row, col);
    }
    /** Initialize rectangle candidates */
    initCandidates() {
        this.squareCand = [];
        this.squareFixed = [];
        for (let minY = 0; minY < this.height; minY++) {
            for (let minX = 0; minX < this.width; minX++) {
                for (let maxY = minY; maxY < this.height; maxY++) {
                    for (let maxX = minX; maxX < this.width; maxX++) {
                        const rect = { top: minY, left: minX, bottom: maxY, right: maxX };
                        const size = (maxY - minY + 1) * (maxX - minX + 1);
                        // Check if rectangle is valid
                        let hasNumber = false;
                        let isValid = true;
                        for (let y = minY; y <= maxY && isValid; y++) {
                            for (let x = minX; x <= maxX && isValid; x++) {
                                const num = this.numbers.get(y, x);
                                if (num !== null) {
                                    if (hasNumber || (num !== -1 && num !== size)) {
                                        isValid = false;
                                    }
                                    hasNumber = true;
                                }
                            }
                        }
                        // Check that rectangle doesn't touch number cells on edges
                        if (isValid && minY > 0) {
                            for (let x = minX; x <= maxX; x++) {
                                if (this.numbers.get(minY - 1, x) !== null) {
                                    isValid = false;
                                    break;
                                }
                            }
                        }
                        if (isValid && maxY < this.height - 1) {
                            for (let x = minX; x <= maxX; x++) {
                                if (this.numbers.get(maxY + 1, x) !== null) {
                                    isValid = false;
                                    break;
                                }
                            }
                        }
                        if (isValid && minX > 0) {
                            for (let y = minY; y <= maxY; y++) {
                                if (this.numbers.get(y, minX - 1) !== null) {
                                    isValid = false;
                                    break;
                                }
                            }
                        }
                        if (isValid && maxX < this.width - 1) {
                            for (let y = minY; y <= maxY; y++) {
                                if (this.numbers.get(y, maxX + 1) !== null) {
                                    isValid = false;
                                    break;
                                }
                            }
                        }
                        if (isValid) {
                            this.squareCand.push(rect);
                        }
                    }
                }
            }
        }
    }
    /** Get cell state from candidates */
    getCellState(row, col) {
        // Check if in any fixed rectangle
        for (const fixed of this.squareFixed) {
            if (row >= fixed.top && row <= fixed.bottom && col >= fixed.left && col <= fixed.right) {
                return CellState.WHITE;
            }
        }
        // Check if in any candidate
        for (const cand of this.squareCand) {
            if (row >= cand.top && row <= cand.bottom && col >= cand.left && col <= cand.right) {
                return CellState.UNKNOWN;
            }
        }
        return CellState.BLACK;
    }
    // ========== Helper methods ==========
    rectsDuplicate(a, b) {
        return !(a.right < b.left || b.right < a.left || a.bottom < b.top || b.bottom < a.top);
    }
    // ========== Constraint checking ==========
    /**
     * Remove candidates that conflict with fixed rectangles
     */
    sikakuSolve() {
        for (const fixed of this.squareFixed) {
            const removeRect1 = {
                top: fixed.top - 1,
                left: fixed.left,
                bottom: fixed.bottom + 1,
                right: fixed.right,
            };
            const removeRect2 = {
                top: fixed.top,
                left: fixed.left - 1,
                bottom: fixed.bottom,
                right: fixed.right + 1,
            };
            this.squareCand = this.squareCand.filter(cand => !this.rectsDuplicate(cand, removeRect1) && !this.rectsDuplicate(cand, removeRect2));
        }
        return true;
    }
    /**
     * Check various constraints
     */
    connectSolve() {
        // Number cells cannot be black
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.getCellState(row, col) === CellState.BLACK && this.numbers.get(row, col) !== null) {
                    return false;
                }
            }
        }
        // No 2x2 black
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.getCellState(row, col) === CellState.BLACK &&
                    this.getCellState(row + 1, col) === CellState.BLACK &&
                    this.getCellState(row, col + 1) === CellState.BLACK &&
                    this.getCellState(row + 1, col + 1) === CellState.BLACK) {
                    return false;
                }
            }
        }
        // White cells must be connected diagonally
        const whitePosSet = new Set();
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.getCellState(row, col) === CellState.WHITE) {
                    const pos = { row, col };
                    const key = posKey(pos);
                    if (whitePosSet.size === 0) {
                        whitePosSet.add(key);
                        this.expandDiagonalSet(pos, whitePosSet);
                    }
                    else if (!whitePosSet.has(key)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    /**
     * Expand set to include all diagonally connected non-black cells
     */
    expandDiagonalSet(pos, set) {
        const directions = [
            { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
            { dr: -1, dc: -1 }, { dr: -1, dc: 1 }, { dr: 1, dc: -1 }, { dr: 1, dc: 1 },
        ];
        for (const { dr, dc } of directions) {
            const next = { row: pos.row + dr, col: pos.col + dc };
            if (next.row < 0 || next.row >= this.height || next.col < 0 || next.col >= this.width)
                continue;
            const key = posKey(next);
            if (set.has(key))
                continue;
            if (this.getCellState(next.row, next.col) === CellState.BLACK)
                continue;
            set.add(key);
            this.expandDiagonalSet(next, set);
        }
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new MochikoroField(this.height, this.width);
        cloned.numbers = this.numbers; // Shared (immutable)
        cloned.squareCand = [...this.squareCand];
        cloned.squareFixed = [...this.squareFixed];
        return cloned;
    }
    getStateDump() {
        return `${this.squareFixed.length}:${this.squareCand.length}`;
    }
    isSolved() {
        return this.squareCand.length === 0 && this.solveAndCheck();
    }
    solveAndCheck() {
        if (!this.sikakuSolve())
            return false;
        if (!this.connectSolve())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num !== null) {
                    line += num === -1 ? '?' : (num > 9 ? '*' : String(num));
                }
                else {
                    const state = this.getCellState(row, col);
                    line += state === CellState.BLACK ? '█' : state === CellState.WHITE ? '·' : '?';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get candidates for branching */
    getCandidates() {
        return this.squareCand;
    }
    /** Fix a candidate as a rectangle */
    fixCandidate(cand) {
        this.squareCand = this.squareCand.filter(c => c !== cand);
        this.squareFixed.push(cand);
    }
    /** Remove a candidate */
    removeCandidate(cand) {
        this.squareCand = this.squareCand.filter(c => c !== cand);
    }
}
// ============================================
// Mochikoro Solver
// ============================================
export class MochikoroSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from number data
     * @param height Grid height
     * @param width Grid width
     * @param clues Map of "row,col" to rectangle size (-1 for numberless clue)
     */
    static fromClues(height, width, clues) {
        const field = new MochikoroField(height, width);
        for (const [key, num] of clues) {
            const [row, col] = key.split(',').map(Number);
            field.setNumber(row, col, num);
        }
        field.initCandidates();
        return new MochikoroSolver(field);
    }
    getBranchCandidates(state) {
        const candidates = state.getCandidates();
        if (candidates.length === 0)
            return [];
        const cand = candidates[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.fixCandidate(cand);
                    return cloned;
                },
                description: `Fix rectangle (${cand.top},${cand.left})-(${cand.bottom},${cand.right})`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.removeCandidate(cand);
                    return cloned;
                },
                description: `Remove rectangle candidate (${cand.top},${cand.left})-(${cand.bottom},${cand.right})`,
            },
        ];
    }
}
//# sourceMappingURL=mochikoro.js.map