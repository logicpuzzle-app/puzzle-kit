/**
 * Takoyaki Solver
 *
 * Rules:
 * 1. Place takoyaki (round objects) in the grid
 * 2. Numbers indicate how many takoyaki are adjacent
 * 3. Takoyaki cannot touch diagonally
 * 4. All constraints must be satisfied
 */
import { CellState } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Takoyaki Field State
// ============================================
export class TakoyakiField {
    height;
    width;
    /** Cell states (empty/takoyaki) */
    cells;
    /** Number clues */
    clues;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.clues = new Grid(height, width, () => null);
    }
    setClue(row, col, value) {
        this.clues.set(row, col, value);
    }
    getCell(row, col) {
        if (row < 0 || row >= this.height || col < 0 || col >= this.width) {
            return CellState.WHITE;
        }
        return this.cells.get(row, col);
    }
    setCell(row, col, state) {
        this.cells.set(row, col, state);
    }
    countAdjacentTakoyaki(row, col) {
        let count = 0;
        let unknowns = 0;
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of dirs) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < this.height && nc >= 0 && nc < this.width) {
                const cell = this.cells.get(nr, nc);
                if (cell === CellState.BLACK)
                    count++;
                else if (cell === CellState.UNKNOWN)
                    unknowns++;
            }
        }
        return { count, unknowns };
    }
    clueSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const clue = this.clues.get(row, col);
                if (clue === null)
                    continue;
                const { count, unknowns } = this.countAdjacentTakoyaki(row, col);
                if (count > clue)
                    return false;
                if (count + unknowns < clue)
                    return false;
                if (count === clue) {
                    // Fill remaining with empty
                    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                    for (const [dr, dc] of dirs) {
                        const nr = row + dr;
                        const nc = col + dc;
                        if (nr >= 0 && nr < this.height && nc >= 0 && nc < this.width) {
                            if (this.cells.get(nr, nc) === CellState.UNKNOWN) {
                                this.cells.set(nr, nc, CellState.WHITE);
                            }
                        }
                    }
                }
                else if (count + unknowns === clue) {
                    // Fill remaining with takoyaki
                    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                    for (const [dr, dc] of dirs) {
                        const nr = row + dr;
                        const nc = col + dc;
                        if (nr >= 0 && nr < this.height && nc >= 0 && nc < this.width) {
                            if (this.cells.get(nr, nc) === CellState.UNKNOWN) {
                                this.cells.set(nr, nc, CellState.BLACK);
                            }
                        }
                    }
                }
            }
        }
        return true;
    }
    clone() {
        const cloned = new TakoyakiField(this.height, this.width);
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                cloned.cells.set(row, col, this.cells.get(row, col));
                cloned.clues.set(row, col, this.clues.get(row, col));
            }
        }
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                dump += this.cells.get(row, col);
            }
        }
        return dump;
    }
    isSolved() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.UNKNOWN)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const beforeDump = this.getStateDump();
            if (!this.clueSolve())
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
                const clue = this.clues.get(row, col);
                if (clue !== null) {
                    line += String(clue);
                }
                else {
                    const cell = this.cells.get(row, col);
                    if (cell === CellState.BLACK)
                        line += 'O';
                    else if (cell === CellState.WHITE)
                        line += '.';
                    else
                        line += '?';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    getFirstUnknownCell() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.UNKNOWN && this.clues.get(row, col) === null) {
                    return { row, col };
                }
            }
        }
        return null;
    }
}
// ============================================
// Takoyaki Solver
// ============================================
export class TakoyakiSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    static fromString(height, width, param) {
        const field = new TakoyakiField(height, width);
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        for (let i = 0; i < param.length && index < height * width; i++) {
            const ch = param[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index += interval + 1;
            }
            else {
                const row = Math.floor(index / width);
                const col = index % width;
                let num;
                if (ch === '-') {
                    num = parseInt(param[i + 1] + param[i + 2], 16);
                    i += 2;
                }
                else {
                    num = parseInt(ch, 16);
                }
                if (!isNaN(num) && row < height && col < width) {
                    field.setClue(row, col, num);
                }
                index++;
            }
        }
        return new TakoyakiSolver(field);
    }
    getBranchCandidates(state) {
        const unknown = state.getFirstUnknownCell();
        if (!unknown)
            return [];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setCell(unknown.row, unknown.col, CellState.BLACK);
                    return cloned;
                },
                description: `Place takoyaki at (${unknown.row}, ${unknown.col})`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setCell(unknown.row, unknown.col, CellState.WHITE);
                    return cloned;
                },
                description: `Leave (${unknown.row}, ${unknown.col}) empty`,
            },
        ];
    }
}
//# sourceMappingURL=takoyaki.js.map