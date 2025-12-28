/**
 * Dominion Solver
 *
 * Rules:
 * 1. Divide the grid into white regions and black dominoes (2-cell horizontal/vertical blocks)
 * 2. White cells with the same letter/number belong to the same region
 * 3. Black cells form exactly dominoes (2-cell blocks)
 * 4. Black dominoes cannot form a 2x2 or larger block
 * 5. Black dominoes cannot form L-shapes or T-shapes
 */
import { CellState, posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Dominion Field State
// ============================================
export class DominionField {
    height;
    width;
    /** Cell states */
    cells;
    /** Region identifiers (numbers/letters) at cells */
    numbers;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.numbers = new Grid(height, width, () => null);
    }
    /** Set a region identifier at position */
    setNumber(row, col, num) {
        this.numbers.set(row, col, num);
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
    /** Check black domino constraints */
    roundSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const pivot = this.cells.get(row, col);
                const up = row === 0 ? CellState.WHITE : this.cells.get(row - 1, col);
                const right = col === this.width - 1 ? CellState.WHITE : this.cells.get(row, col + 1);
                const down = row === this.height - 1 ? CellState.WHITE : this.cells.get(row + 1, col);
                const left = col === 0 ? CellState.WHITE : this.cells.get(row, col - 1);
                // No 3-in-a-row vertically
                if (up === CellState.BLACK && pivot === CellState.BLACK && down === CellState.BLACK) {
                    return false;
                }
                // No 3-in-a-row horizontally
                if (left === CellState.BLACK && pivot === CellState.BLACK && right === CellState.BLACK) {
                    return false;
                }
                // Isolated black is not allowed
                if (pivot === CellState.BLACK &&
                    up === CellState.WHITE &&
                    right === CellState.WHITE &&
                    down === CellState.WHITE &&
                    left === CellState.WHITE) {
                    return false;
                }
                // Propagation rules
                if (up === CellState.BLACK && pivot === CellState.UNKNOWN && down === CellState.BLACK) {
                    this.cells.set(row, col, CellState.WHITE);
                }
                if (up === CellState.UNKNOWN && pivot === CellState.BLACK && down === CellState.BLACK) {
                    this.cells.set(row - 1, col, CellState.WHITE);
                }
                if (up === CellState.BLACK && pivot === CellState.BLACK && down === CellState.UNKNOWN) {
                    this.cells.set(row + 1, col, CellState.WHITE);
                }
                if (left === CellState.BLACK && pivot === CellState.UNKNOWN && right === CellState.BLACK) {
                    this.cells.set(row, col, CellState.WHITE);
                }
                if (left === CellState.UNKNOWN && pivot === CellState.BLACK && right === CellState.BLACK) {
                    this.cells.set(row, col - 1, CellState.WHITE);
                }
                if (left === CellState.BLACK && pivot === CellState.BLACK && right === CellState.UNKNOWN) {
                    this.cells.set(row, col + 1, CellState.WHITE);
                }
                // If isolated and unknown, make white
                if (pivot === CellState.UNKNOWN &&
                    up === CellState.WHITE &&
                    right === CellState.WHITE &&
                    down === CellState.WHITE &&
                    left === CellState.WHITE) {
                    this.cells.set(row, col, CellState.WHITE);
                }
                // If black and only one direction is unknown, it must be black
                if (pivot === CellState.BLACK &&
                    up === CellState.UNKNOWN &&
                    right === CellState.WHITE &&
                    down === CellState.WHITE &&
                    left === CellState.WHITE) {
                    this.cells.set(row - 1, col, CellState.BLACK);
                }
                if (pivot === CellState.BLACK &&
                    up === CellState.WHITE &&
                    right === CellState.UNKNOWN &&
                    down === CellState.WHITE &&
                    left === CellState.WHITE) {
                    this.cells.set(row, col + 1, CellState.BLACK);
                }
                if (pivot === CellState.BLACK &&
                    up === CellState.WHITE &&
                    right === CellState.WHITE &&
                    down === CellState.UNKNOWN &&
                    left === CellState.WHITE) {
                    this.cells.set(row + 1, col, CellState.BLACK);
                }
                if (pivot === CellState.BLACK &&
                    up === CellState.WHITE &&
                    right === CellState.WHITE &&
                    down === CellState.WHITE &&
                    left === CellState.UNKNOWN) {
                    this.cells.set(row, col - 1, CellState.BLACK);
                }
            }
        }
        // No 2x2 black or more (no 3+ black in any 2x2)
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                let blackCnt = 0;
                const m1 = this.cells.get(row, col);
                const m2 = this.cells.get(row, col + 1);
                const m3 = this.cells.get(row + 1, col);
                const m4 = this.cells.get(row + 1, col + 1);
                if (m1 === CellState.BLACK)
                    blackCnt++;
                if (m2 === CellState.BLACK)
                    blackCnt++;
                if (m3 === CellState.BLACK)
                    blackCnt++;
                if (m4 === CellState.BLACK)
                    blackCnt++;
                if (blackCnt > 2) {
                    return false;
                }
                if (blackCnt === 2) {
                    if (m1 === CellState.UNKNOWN)
                        this.cells.set(row, col, CellState.WHITE);
                    if (m2 === CellState.UNKNOWN)
                        this.cells.set(row, col + 1, CellState.WHITE);
                    if (m3 === CellState.UNKNOWN)
                        this.cells.set(row + 1, col, CellState.WHITE);
                    if (m4 === CellState.UNKNOWN)
                        this.cells.set(row + 1, col + 1, CellState.WHITE);
                }
            }
        }
        return true;
    }
    /** Get connected white cells */
    getConnectedWhite(start) {
        const region = new Set();
        const queue = [start];
        region.add(posKey(start));
        while (queue.length > 0) {
            const current = queue.shift();
            const { row, col } = current;
            const neighbors = [
                { row: row - 1, col },
                { row: row + 1, col },
                { row, col: col - 1 },
                { row, col: col + 1 },
            ];
            for (const next of neighbors) {
                if (next.row >= 0 &&
                    next.row < this.height &&
                    next.col >= 0 &&
                    next.col < this.width) {
                    const key = posKey(next);
                    if (!region.has(key) && this.cells.get(next) === CellState.WHITE) {
                        region.add(key);
                        queue.push(next);
                    }
                }
            }
        }
        return region;
    }
    /** Get potentially connected cells (white or unknown) */
    getPotentialWhite(start) {
        const region = new Set();
        const queue = [start];
        region.add(posKey(start));
        while (queue.length > 0) {
            const current = queue.shift();
            const { row, col } = current;
            const neighbors = [
                { row: row - 1, col },
                { row: row + 1, col },
                { row, col: col - 1 },
                { row, col: col + 1 },
            ];
            for (const next of neighbors) {
                if (next.row >= 0 &&
                    next.row < this.height &&
                    next.col >= 0 &&
                    next.col < this.width) {
                    const key = posKey(next);
                    const state = this.cells.get(next);
                    if (!region.has(key) && state !== CellState.BLACK) {
                        region.add(key);
                        queue.push(next);
                    }
                }
            }
        }
        return region;
    }
    /** Check number constraints - same numbers must connect, different must not */
    numberSolve() {
        // Different numbers connected = false
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num === null || num === -1)
                    continue;
                const pivot = { row, col };
                const connected = this.getConnectedWhite(pivot);
                for (const key of connected) {
                    const [r, c] = key.split(',').map(Number);
                    const otherNum = this.numbers.get(r, c);
                    if (otherNum !== null && otherNum !== -1 && otherNum !== num) {
                        return false;
                    }
                }
            }
        }
        // Same numbers must be potentially connectable
        const checkedNumbers = new Set();
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num === null || num === -1 || checkedNumbers.has(num))
                    continue;
                const pivot = { row, col };
                const potential = this.getPotentialWhite(pivot);
                // Check all cells with same number are in potential
                for (let r = 0; r < this.height; r++) {
                    for (let c = 0; c < this.width; c++) {
                        if (this.numbers.get(r, c) === num && !potential.has(posKey({ row: r, col: c }))) {
                            return false;
                        }
                    }
                }
                checkedNumbers.add(num);
            }
        }
        return true;
    }
    /** Check white regions without numbers can reach a number */
    notStandAloneSolve() {
        const visited = new Set();
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.numbers.get(row, col) !== null)
                    continue;
                if (this.cells.get(row, col) !== CellState.WHITE)
                    continue;
                const key = posKey({ row, col });
                if (visited.has(key))
                    continue;
                const potential = this.getPotentialWhite({ row, col });
                let hasNumber = false;
                for (const pk of potential) {
                    const [pr, pc] = pk.split(',').map(Number);
                    if (this.numbers.get(pr, pc) !== null) {
                        hasNumber = true;
                        break;
                    }
                }
                if (!hasNumber) {
                    return false;
                }
                for (const pk of potential) {
                    visited.add(pk);
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new DominionField(this.height, this.width);
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
                dump += this.cells.get(row, col);
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
            if (!this.roundSolve())
                return false;
            changed = this.getStateDump() !== beforeDump;
        }
        if (!this.numberSolve())
            return false;
        if (!this.notStandAloneSolve())
            return false;
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
                    if (num === -1) {
                        line += '?';
                    }
                    else if (num <= 26) {
                        line += String.fromCharCode('A'.charCodeAt(0) + num - 1);
                    }
                    else {
                        line += String.fromCharCode('a'.charCodeAt(0) + num - 27);
                    }
                }
                else if (state === CellState.BLACK) {
                    line += '■';
                }
                else if (state === CellState.WHITE) {
                    line += '·';
                }
                else {
                    line += '.';
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
                if (this.cells.get(row, col) === CellState.UNKNOWN) {
                    unknowns.push({ row, col });
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Dominion Solver
// ============================================
export class DominionSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from puzzle string array */
    static fromString(height, width, puzzle) {
        const field = new DominionField(height, width);
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const ch = puzzle[row]?.[col];
                if (ch === '?' || ch === '.') {
                    field.setNumber(row, col, -1);
                }
                else if (ch && ch >= 'A' && ch <= 'Z') {
                    field.setNumber(row, col, ch.charCodeAt(0) - 'A'.charCodeAt(0) + 1);
                }
                else if (ch && ch >= 'a' && ch <= 'z') {
                    field.setNumber(row, col, ch.charCodeAt(0) - 'a'.charCodeAt(0) + 27);
                }
                else if (ch && ch >= '1' && ch <= '9') {
                    field.setNumber(row, col, parseInt(ch));
                }
            }
        }
        return new DominionSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownCells();
        if (unknowns.length === 0)
            return [];
        const pos = unknowns[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setCell(pos.row, pos.col, CellState.BLACK);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to BLACK`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setCell(pos.row, pos.col, CellState.WHITE);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to WHITE`,
            },
        ];
    }
}
//# sourceMappingURL=dominion.js.map