/**
 * Mines (Minesweeper-like) Solver
 *
 * Rules:
 * 1. Numbers indicate how many mines are in the 8 surrounding cells (including diagonals)
 * 2. Number cells themselves are never mines (they are safe/white)
 * 3. All non-number cells must be determined as mine (black) or safe (white)
 */
import { CellState } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Mines Field State
// ============================================
export class MinesField {
    height;
    width;
    /** Cell states (UNKNOWN, BLACK=mine, WHITE=safe) */
    cells;
    /** Number hints (null = no number, -1 = unknown count) */
    numbers;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.numbers = new Grid(height, width, () => null);
    }
    /** Set a number hint at position */
    setNumber(row, col, num) {
        this.numbers.set(row, col, num);
        // Number cells are always safe (not mines)
        this.cells.set(row, col, CellState.WHITE);
    }
    /** Get number at position */
    getNumber(row, col) {
        return this.numbers.get(row, col);
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell state */
    setCell(row, col, state) {
        this.cells.set(row, col, state);
    }
    /** Get all 8 neighbors (including diagonals) */
    getNeighbors(row, col) {
        const neighbors = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dy === 0 && dx === 0)
                    continue; // Skip self
                const ny = row + dy;
                const nx = col + dx;
                if (ny >= 0 && ny < this.height && nx >= 0 && nx < this.width) {
                    neighbors.push({ row: ny, col: nx });
                }
            }
        }
        return neighbors;
    }
    /** Check number constraints and propagate */
    numberSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                // Skip cells without numbers or with unknown count (-1)
                if (num === null || num === -1)
                    continue;
                const neighbors = this.getNeighbors(row, col);
                let blackCount = 0; // Confirmed mines
                let unknownCount = 0; // Unknown cells
                // Count confirmed mines and unknown cells
                for (const neighbor of neighbors) {
                    const state = this.cells.get(neighbor.row, neighbor.col);
                    if (state === CellState.BLACK) {
                        blackCount++;
                    }
                    else if (state === CellState.UNKNOWN) {
                        unknownCount++;
                    }
                }
                // Check constraints
                // If we have more mines than the number allows, contradiction
                if (blackCount > num) {
                    return false;
                }
                // If we need more mines than possible, contradiction
                if (blackCount + unknownCount < num) {
                    return false;
                }
                // If we have exactly the right number of mines,
                // all remaining unknowns must be safe (WHITE)
                if (blackCount === num) {
                    for (const neighbor of neighbors) {
                        if (this.cells.get(neighbor.row, neighbor.col) === CellState.UNKNOWN) {
                            this.cells.set(neighbor.row, neighbor.col, CellState.WHITE);
                        }
                    }
                }
                // If all available cells must be mines to reach the number,
                // mark all unknowns as mines (BLACK)
                if (blackCount + unknownCount === num) {
                    for (const neighbor of neighbors) {
                        if (this.cells.get(neighbor.row, neighbor.col) === CellState.UNKNOWN) {
                            this.cells.set(neighbor.row, neighbor.col, CellState.BLACK);
                        }
                    }
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new MinesField(this.height, this.width);
        for (const [pos, state] of this.cells.entries()) {
            cloned.cells.set(pos, state);
        }
        for (const [pos, num] of this.numbers.entries()) {
            cloned.numbers.set(pos, num);
        }
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const state = this.cells.get(row, col);
                dump += state === CellState.BLACK ? 'B' :
                    state === CellState.WHITE ? 'W' : 'U';
            }
        }
        return dump;
    }
    isSolved() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.UNKNOWN) {
                    return false;
                }
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const beforeDump = this.getStateDump();
            if (!this.numberSolve())
                return false;
            changed = this.getStateDump() !== beforeDump;
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                const state = this.cells.get(row, col);
                if (num !== null) {
                    // Display number
                    if (num === -1) {
                        line += '?';
                    }
                    else {
                        line += String(num);
                    }
                }
                else if (state === CellState.BLACK) {
                    line += '*'; // Mine
                }
                else if (state === CellState.WHITE) {
                    line += '.'; // Safe
                }
                else {
                    line += ' '; // Unknown
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get unknown cells for branching */
    getUnknownCells() {
        const unknowns = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                // Only branch on non-number cells
                if (this.cells.get(row, col) === CellState.UNKNOWN &&
                    this.numbers.get(row, col) === null) {
                    unknowns.push({ row, col });
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Mines Solver
// ============================================
export class MinesSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from puzz.link URL parameter
     * Format: numbers are encoded with alphabet intervals (g-z for gaps 1-20)
     * Numbers are in hex: 0-f for 0-15, -XX for 16-255, +XXX for 256-999
     * '.' represents unknown count (-1)
     */
    static fromString(height, width, param) {
        const field = new MinesField(height, width);
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        for (let i = 0; i < param.length; i++) {
            const ch = param[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                // Gap character - skip cells
                index += interval + 1;
            }
            else {
                const row = Math.floor(index / width);
                const col = index % width;
                if (row >= height || col >= width) {
                    index++;
                    continue;
                }
                let num;
                if (ch === '.') {
                    // Unknown count
                    num = -1;
                }
                else if (ch === '-') {
                    // 16-255 range
                    num = parseInt(param.substring(i + 1, i + 3), 16);
                    i += 2;
                }
                else if (ch === '+') {
                    // 256-999 range
                    num = parseInt(param.substring(i + 1, i + 4), 16);
                    i += 3;
                }
                else {
                    // 0-15 range (single hex digit)
                    num = parseInt(ch, 16);
                }
                if (!isNaN(num)) {
                    field.setNumber(row, col, num);
                }
                index++;
            }
        }
        return new MinesSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownCells();
        if (unknowns.length === 0)
            return [];
        // Pick the first unknown cell
        const pos = unknowns[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setCell(pos.row, pos.col, CellState.BLACK);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to MINE`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setCell(pos.row, pos.col, CellState.WHITE);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to SAFE`,
            },
        ];
    }
}
//# sourceMappingURL=mines.js.map