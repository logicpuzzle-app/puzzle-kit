/**
 * Sudoku Solver
 *
 * Rules:
 * 1. Fill each cell with a number from 1-9 (or 1-N for NxN grid)
 * 2. Each row must contain each number exactly once
 * 3. Each column must contain each number exactly once
 * 4. Each box (3x3 for standard 9x9) must contain each number exactly once
 */
import { Grid, CandidateSet } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Sudoku Field State
// ============================================
export class SudokuField {
    height;
    width;
    boxHeight;
    boxWidth;
    /** Candidates for each cell */
    candidates;
    /** Fixed numbers (clues) */
    fixed;
    constructor(size, boxHeight, boxWidth) {
        this.height = size;
        this.width = size;
        // Default box sizes based on grid size
        if (boxHeight && boxWidth) {
            this.boxHeight = boxHeight;
            this.boxWidth = boxWidth;
        }
        else if (size === 4) {
            this.boxHeight = 2;
            this.boxWidth = 2;
        }
        else if (size === 6) {
            this.boxHeight = 2;
            this.boxWidth = 3;
        }
        else if (size === 9) {
            this.boxHeight = 3;
            this.boxWidth = 3;
        }
        else if (size === 16) {
            this.boxHeight = 4;
            this.boxWidth = 4;
        }
        else {
            this.boxHeight = Math.floor(Math.sqrt(size));
            this.boxWidth = Math.ceil(size / this.boxHeight);
        }
        // Initialize candidates with all possibilities
        const allCandidates = Array.from({ length: size }, (_, i) => i + 1);
        this.candidates = new Grid(size, size, () => new CandidateSet(allCandidates));
        this.fixed = new Grid(size, size, () => null);
    }
    /** Set a fixed number (clue) */
    setNumber(row, col, num) {
        this.fixed.set(row, col, num);
        this.candidates.get(row, col).setTo(num);
    }
    /** Get the value at position (if determined) */
    getValue(row, col) {
        const cand = this.candidates.get(row, col);
        return cand.isDetermined() ? cand.getValue() : null;
    }
    /** Get candidates at position */
    getCandidates(row, col) {
        return this.candidates.get(row, col).getAll();
    }
    /** Eliminate a candidate */
    eliminate(row, col, num) {
        return this.candidates.get(row, col).eliminate(num);
    }
    /** Get box top-left corner */
    getBoxStart(row, col) {
        const boxRow = Math.floor(row / this.boxHeight) * this.boxHeight;
        const boxCol = Math.floor(col / this.boxWidth) * this.boxWidth;
        return { boxRow, boxCol };
    }
    // ========== Solving techniques ==========
    /** Naked single: eliminate determined values from peers */
    nakedSingleElimination() {
        let changed = false;
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cand = this.candidates.get(row, col);
                if (!cand.isDetermined())
                    continue;
                const value = cand.getValue();
                // Eliminate from row
                for (let c = 0; c < this.width; c++) {
                    if (c !== col && this.candidates.get(row, c).eliminate(value)) {
                        changed = true;
                    }
                }
                // Eliminate from column
                for (let r = 0; r < this.height; r++) {
                    if (r !== row && this.candidates.get(r, col).eliminate(value)) {
                        changed = true;
                    }
                }
                // Eliminate from box
                const { boxRow, boxCol } = this.getBoxStart(row, col);
                for (let r = boxRow; r < boxRow + this.boxHeight; r++) {
                    for (let c = boxCol; c < boxCol + this.boxWidth; c++) {
                        if ((r !== row || c !== col) && this.candidates.get(r, c).eliminate(value)) {
                            changed = true;
                        }
                    }
                }
            }
        }
        return changed;
    }
    /** Hidden single: if a number can only go in one place in a unit, place it */
    hiddenSingleElimination() {
        let changed = false;
        // Check rows
        for (let row = 0; row < this.height; row++) {
            for (let num = 1; num <= this.height; num++) {
                const positions = [];
                for (let col = 0; col < this.width; col++) {
                    if (this.candidates.get(row, col).has(num)) {
                        positions.push(col);
                    }
                }
                if (positions.length === 1) {
                    const col = positions[0];
                    if (!this.candidates.get(row, col).isDetermined()) {
                        this.candidates.get(row, col).setTo(num);
                        changed = true;
                    }
                }
            }
        }
        // Check columns
        for (let col = 0; col < this.width; col++) {
            for (let num = 1; num <= this.height; num++) {
                const positions = [];
                for (let row = 0; row < this.height; row++) {
                    if (this.candidates.get(row, col).has(num)) {
                        positions.push(row);
                    }
                }
                if (positions.length === 1) {
                    const row = positions[0];
                    if (!this.candidates.get(row, col).isDetermined()) {
                        this.candidates.get(row, col).setTo(num);
                        changed = true;
                    }
                }
            }
        }
        // Check boxes
        for (let boxRow = 0; boxRow < this.height; boxRow += this.boxHeight) {
            for (let boxCol = 0; boxCol < this.width; boxCol += this.boxWidth) {
                for (let num = 1; num <= this.height; num++) {
                    const positions = [];
                    for (let r = boxRow; r < boxRow + this.boxHeight; r++) {
                        for (let c = boxCol; c < boxCol + this.boxWidth; c++) {
                            if (this.candidates.get(r, c).has(num)) {
                                positions.push({ row: r, col: c });
                            }
                        }
                    }
                    if (positions.length === 1) {
                        const { row, col } = positions[0];
                        if (!this.candidates.get(row, col).isDetermined()) {
                            this.candidates.get(row, col).setTo(num);
                            changed = true;
                        }
                    }
                }
            }
        }
        return changed;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new SudokuField(this.height, this.boxHeight, this.boxWidth);
        for (const [pos, cand] of this.candidates.entries()) {
            cloned.candidates.set(pos, cand.clone());
        }
        for (const [pos, fixed] of this.fixed.entries()) {
            cloned.fixed.set(pos, fixed);
        }
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                dump += this.candidates.get(row, col).size.toString();
            }
        }
        return dump;
    }
    isSolved() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (!this.candidates.get(row, col).isDetermined()) {
                    return false;
                }
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        // Check for contradictions
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.candidates.get(row, col).isContradiction()) {
                    return false;
                }
            }
        }
        let changed = true;
        while (changed) {
            changed = false;
            if (this.nakedSingleElimination())
                changed = true;
            if (this.hiddenSingleElimination())
                changed = true;
            // Check for contradictions after elimination
            for (let row = 0; row < this.height; row++) {
                for (let col = 0; col < this.width; col++) {
                    if (this.candidates.get(row, col).isContradiction()) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const cand = this.candidates.get(row, col);
                if (cand.isDetermined()) {
                    line += cand.getValue().toString(16).toUpperCase();
                }
                else {
                    line += '.';
                }
                if ((col + 1) % this.boxWidth === 0 && col < this.width - 1) {
                    line += '|';
                }
            }
            lines.push(line);
            if ((row + 1) % this.boxHeight === 0 && row < this.height - 1) {
                lines.push('-'.repeat(line.length));
            }
        }
        return lines.join('\n');
    }
    /** Get cells with fewest candidates (for branching) */
    getMinCandidateCells() {
        let minSize = Infinity;
        const cells = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cand = this.candidates.get(row, col);
                if (cand.isDetermined())
                    continue;
                const size = cand.size;
                if (size < minSize) {
                    minSize = size;
                    cells.length = 0;
                    cells.push({ row, col });
                }
                else if (size === minSize) {
                    cells.push({ row, col });
                }
            }
        }
        return cells;
    }
}
// ============================================
// Sudoku Solver
// ============================================
export class SudokuSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from puzzle string (81 chars for 9x9, . for empty) */
    static fromString(size, puzzle) {
        const field = new SudokuField(size);
        for (let i = 0; i < puzzle.length && i < size * size; i++) {
            const ch = puzzle[i];
            const row = Math.floor(i / size);
            const col = i % size;
            if (ch >= '1' && ch <= '9') {
                field.setNumber(row, col, parseInt(ch));
            }
            else if (ch >= 'a' && ch <= 'g') {
                // a=10, b=11, etc. for 16x16
                field.setNumber(row, col, ch.charCodeAt(0) - 'a'.charCodeAt(0) + 10);
            }
            else if (ch >= 'A' && ch <= 'G') {
                field.setNumber(row, col, ch.charCodeAt(0) - 'A'.charCodeAt(0) + 10);
            }
        }
        return new SudokuSolver(field);
    }
    /** Create standard 9x9 solver from string array */
    static fromStringArray(puzzle) {
        const field = new SudokuField(9);
        for (let row = 0; row < 9 && row < puzzle.length; row++) {
            for (let col = 0; col < 9 && col < puzzle[row].length; col++) {
                const ch = puzzle[row][col];
                if (ch >= '1' && ch <= '9') {
                    field.setNumber(row, col, parseInt(ch));
                }
            }
        }
        return new SudokuSolver(field);
    }
    getBranchCandidates(state) {
        const cells = state.getMinCandidateCells();
        if (cells.length === 0)
            return [];
        const pos = cells[0];
        const candidates = state.getCandidates(pos.row, pos.col);
        return candidates.map((num) => ({
            apply: (s) => {
                const cloned = s.clone();
                cloned.setNumber(pos.row, pos.col, num);
                return cloned;
            },
            description: `Set (${pos.row}, ${pos.col}) to ${num}`,
        }));
    }
}
//# sourceMappingURL=sudoku.js.map