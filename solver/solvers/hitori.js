/**
 * Hitori Solver
 *
 * Rules:
 * 1. Shade some cells black
 * 2. No number may appear more than once in each row/column (among unshaded cells)
 * 3. Black cells cannot be adjacent orthogonally
 * 4. All white cells must be connected
 */
import { CellState, DIRECTIONS, adjacent, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Hitori Field State
// ============================================
export class HitoriField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    cells;
    /** Numbers in each cell */
    numbers;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.numbers = new Grid(height, width, () => 0);
    }
    /** Set a number */
    setNumber(row, col, num) {
        this.numbers.set(row, col, num);
    }
    /** Get number at position */
    getNumber(row, col) {
        return this.numbers.get(row, col);
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell to black */
    setBlack(row, col) {
        this.cells.set(row, col, CellState.BLACK);
    }
    /** Set cell to white */
    setWhite(row, col) {
        this.cells.set(row, col, CellState.WHITE);
    }
    // ========== Helper methods ==========
    /** Check if two black cells are adjacent */
    hasAdjacentBlack() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.BLACK) {
                    for (const dir of DIRECTIONS) {
                        const next = adjacent({ row, col }, dir);
                        if (this.cells.inBounds(next) &&
                            this.cells.get(next) === CellState.BLACK) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
    /** Mark neighbors of black cells as white */
    markBlackNeighborsWhite() {
        let changed = false;
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.BLACK) {
                    for (const dir of DIRECTIONS) {
                        const next = adjacent({ row, col }, dir);
                        if (this.cells.inBounds(next) &&
                            this.cells.get(next) === CellState.UNKNOWN) {
                            this.setWhite(next.row, next.col);
                            changed = true;
                        }
                    }
                }
            }
        }
        return changed;
    }
    /** Check for duplicate numbers in rows/columns (among white cells) */
    hasDuplicateNumbers() {
        // Check rows
        for (let row = 0; row < this.height; row++) {
            const seen = new Set();
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.WHITE) {
                    const num = this.numbers.get(row, col);
                    if (seen.has(num))
                        return true;
                    seen.add(num);
                }
            }
        }
        // Check columns
        for (let col = 0; col < this.width; col++) {
            const seen = new Set();
            for (let row = 0; row < this.height; row++) {
                if (this.cells.get(row, col) === CellState.WHITE) {
                    const num = this.numbers.get(row, col);
                    if (seen.has(num))
                        return true;
                    seen.add(num);
                }
            }
        }
        return false;
    }
    /** Mark duplicates as black when one cell in a duplicate set is white */
    solveNumberConstraints() {
        let changed = false;
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) !== CellState.WHITE)
                    continue;
                const num = this.numbers.get(row, col);
                // Check row for same number
                for (let c = 0; c < this.width; c++) {
                    if (c !== col && this.numbers.get(row, c) === num) {
                        if (this.cells.get(row, c) === CellState.UNKNOWN) {
                            this.setBlack(row, c);
                            changed = true;
                        }
                    }
                }
                // Check column for same number
                for (let r = 0; r < this.height; r++) {
                    if (r !== row && this.numbers.get(r, col) === num) {
                        if (this.cells.get(r, col) === CellState.UNKNOWN) {
                            this.setBlack(r, col);
                            changed = true;
                        }
                    }
                }
            }
        }
        return changed;
    }
    /** Check if white cells are connected */
    isWhiteConnected() {
        // Find all white cells
        const whiteCells = [];
        for (const [pos, state] of this.cells.entries()) {
            if (state === CellState.WHITE) {
                whiteCells.push(pos);
            }
        }
        if (whiteCells.length === 0)
            return true;
        // BFS from first white cell, following non-black cells
        const visited = new Set();
        const queue = [whiteCells[0]];
        visited.add(posKey(whiteCells[0]));
        while (queue.length > 0) {
            const current = queue.shift();
            for (const dir of DIRECTIONS) {
                const next = adjacent(current, dir);
                const key = posKey(next);
                if (this.cells.inBounds(next) &&
                    this.cells.get(next) !== CellState.BLACK &&
                    !visited.has(key)) {
                    visited.add(key);
                    queue.push(next);
                }
            }
        }
        // All white cells must be reachable
        for (const pos of whiteCells) {
            if (!visited.has(posKey(pos))) {
                return false;
            }
        }
        return true;
    }
    /** If a cell is the only one that can be white for a number in row/col */
    solveSingleOption() {
        let changed = false;
        // Check rows
        for (let row = 0; row < this.height; row++) {
            // Group cells by number
            const numToCells = new Map();
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) !== CellState.BLACK) {
                    const num = this.numbers.get(row, col);
                    if (!numToCells.has(num))
                        numToCells.set(num, []);
                    numToCells.get(num).push({ row, col });
                }
            }
            for (const [, cells] of numToCells) {
                if (cells.length >= 2) {
                    // If all but one are known black, the remaining must be white
                    const unknowns = cells.filter((p) => this.cells.get(p.row, p.col) === CellState.UNKNOWN);
                    const whites = cells.filter((p) => this.cells.get(p.row, p.col) === CellState.WHITE);
                    if (whites.length === 0 && unknowns.length === 1) {
                        this.setWhite(unknowns[0].row, unknowns[0].col);
                        changed = true;
                    }
                }
            }
        }
        // Check columns
        for (let col = 0; col < this.width; col++) {
            const numToCells = new Map();
            for (let row = 0; row < this.height; row++) {
                if (this.cells.get(row, col) !== CellState.BLACK) {
                    const num = this.numbers.get(row, col);
                    if (!numToCells.has(num))
                        numToCells.set(num, []);
                    numToCells.get(num).push({ row, col });
                }
            }
            for (const [, cells] of numToCells) {
                if (cells.length >= 2) {
                    const unknowns = cells.filter((p) => this.cells.get(p.row, p.col) === CellState.UNKNOWN);
                    const whites = cells.filter((p) => this.cells.get(p.row, p.col) === CellState.WHITE);
                    if (whites.length === 0 && unknowns.length === 1) {
                        this.setWhite(unknowns[0].row, unknowns[0].col);
                        changed = true;
                    }
                }
            }
        }
        return changed;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new HitoriField(this.height, this.width);
        for (const [pos, state] of this.cells.entries()) {
            cloned.cells.set(pos, state);
        }
        for (const [pos, num] of this.numbers.entries()) {
            cloned.numbers.set(pos, num);
        }
        return cloned;
    }
    getStateDump() {
        return this.cells.dump();
    }
    isSolved() {
        // All cells must be determined
        for (const [, state] of this.cells.entries()) {
            if (state === CellState.UNKNOWN)
                return false;
        }
        // No adjacent black cells
        if (this.hasAdjacentBlack())
            return false;
        // No duplicate numbers in rows/columns
        if (this.hasDuplicateNumbers())
            return false;
        // White cells must be connected
        if (!this.isWhiteConnected())
            return false;
        return true;
    }
    solveAndCheck() {
        // Check for immediate contradictions
        if (this.hasAdjacentBlack())
            return false;
        if (this.hasDuplicateNumbers())
            return false;
        let changed = true;
        while (changed) {
            changed = false;
            // Mark neighbors of black cells as white
            if (this.markBlackNeighborsWhite())
                changed = true;
            // Mark duplicates as black when white is determined
            if (this.solveNumberConstraints())
                changed = true;
            // If only one option for a number, it must be white
            if (this.solveSingleOption())
                changed = true;
            // Check for contradictions
            if (this.hasAdjacentBlack())
                return false;
            if (this.hasDuplicateNumbers())
                return false;
        }
        // Check connectivity (only when no unknowns or as final check)
        if (!this.isWhiteConnected())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const state = this.cells.get(row, col);
                if (state === CellState.BLACK) {
                    line += '█';
                }
                else {
                    const num = this.numbers.get(row, col);
                    line += num < 10 ? String(num) : '+';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get unknown cells for branching */
    getUnknownCells() {
        const unknowns = [];
        for (const [pos, state] of this.cells.entries()) {
            if (state === CellState.UNKNOWN) {
                unknowns.push(pos);
            }
        }
        return unknowns;
    }
}
// ============================================
// Hitori Solver
// ============================================
export class HitoriSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from puzzle string (each row is a string of hex digits) */
    static fromString(height, width, puzzle) {
        const field = new HitoriField(height, width);
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const ch = puzzle[row]?.[col];
                if (ch) {
                    const num = parseInt(ch, 16);
                    if (!isNaN(num)) {
                        field.setNumber(row, col, num);
                    }
                }
            }
        }
        return new HitoriSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownCells();
        if (unknowns.length === 0)
            return [];
        // Pick first unknown cell
        const pos = unknowns[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setBlack(pos.row, pos.col);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to BLACK`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setWhite(pos.row, pos.col);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to WHITE`,
            },
        ];
    }
}
//# sourceMappingURL=hitori.js.map