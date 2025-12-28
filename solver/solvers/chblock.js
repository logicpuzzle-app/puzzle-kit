/**
 * Chblock (Checkered Block) Solver
 *
 * Rules:
 * 1. Paint some cells black to form connected regions (islands)
 * 2. Each island contains exactly one number, indicating its size
 * 3. Islands of the same shape (considering rotation/reflection) must connect diagonally
 * 4. Numbers with -1 (or ?) represent unknown size
 */
import { CellState, posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Chblock Field State
// ============================================
export class ChblockField {
    height;
    width;
    /** Cell states */
    cells;
    /** Numbers at cells (-1 = unknown size, null = no number) */
    numbers;
    /** Fixed island positions */
    fixedPosSet;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.numbers = new Grid(height, width, () => null);
        this.fixedPosSet = new Set();
    }
    /** Set a number at position */
    setNumber(row, col, num) {
        this.numbers.set(row, col, num);
        this.cells.set(row, col, CellState.BLACK);
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
    /** Get connected black cells from a position */
    getConnectedBlack(start, maxSize) {
        const region = new Set();
        const queue = [start];
        region.add(posKey(start));
        while (queue.length > 0 && region.size <= maxSize) {
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
                    if (!region.has(key) && this.cells.get(next) === CellState.BLACK) {
                        region.add(key);
                        queue.push(next);
                    }
                }
            }
        }
        return region;
    }
    /** Get potentially connected cells (black or unknown) */
    getPotentialBlack(start, maxSize) {
        const region = new Set();
        const queue = [start];
        region.add(posKey(start));
        while (queue.length > 0 && region.size <= maxSize) {
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
                    if (!region.has(key) && state !== CellState.WHITE) {
                        region.add(key);
                        queue.push(next);
                    }
                }
            }
        }
        return region;
    }
    /** Count solve - check number constraints */
    countSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num === null)
                    continue;
                const pivot = { row, col };
                const connected = this.getConnectedBlack(pivot, num === -1 ? this.height * this.width : num);
                // Size exceeded
                if (num !== -1 && connected.size > num) {
                    return false;
                }
                // Size exactly matches - surround with white
                if (num !== -1 && connected.size === num) {
                    this.fixedPosSet.add(posKey(pivot));
                    for (const key of connected) {
                        const [r, c] = key.split(',').map(Number);
                        const neighbors = [
                            { row: r - 1, col: c },
                            { row: r + 1, col: c },
                            { row: r, col: c - 1 },
                            { row: r, col: c + 1 },
                        ];
                        for (const next of neighbors) {
                            if (next.row >= 0 &&
                                next.row < this.height &&
                                next.col >= 0 &&
                                next.col < this.width &&
                                !connected.has(posKey(next))) {
                                this.cells.set(next, CellState.WHITE);
                            }
                        }
                    }
                }
                else {
                    // Check if size can be reached
                    const potential = this.getPotentialBlack(pivot, num === -1 ? this.height * this.width : num);
                    if (num !== -1 && potential.size < num) {
                        return false;
                    }
                    // If potential equals required, fill all
                    if (num !== -1 && potential.size === num) {
                        this.fixedPosSet.add(posKey(pivot));
                        for (const key of potential) {
                            const [r, c] = key.split(',').map(Number);
                            this.cells.set(r, c, CellState.BLACK);
                            const neighbors = [
                                { row: r - 1, col: c },
                                { row: r + 1, col: c },
                                { row: r, col: c - 1 },
                                { row: r, col: c + 1 },
                            ];
                            for (const next of neighbors) {
                                if (next.row >= 0 &&
                                    next.row < this.height &&
                                    next.col >= 0 &&
                                    next.col < this.width &&
                                    !potential.has(posKey(next))) {
                                    this.cells.set(next, CellState.WHITE);
                                }
                            }
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Normalize shape for comparison */
    normalizeShape(positions) {
        const coords = [];
        for (const key of positions) {
            const [r, c] = key.split(',').map(Number);
            coords.push([r, c]);
        }
        // Get all rotations and reflections
        const variants = [];
        for (let rot = 0; rot < 4; rot++) {
            for (const reflect of [false, true]) {
                const transformed = coords.map(([r, c]) => {
                    let nr = r, nc = c;
                    // Rotate
                    for (let i = 0; i < rot; i++) {
                        [nr, nc] = [-nc, nr];
                    }
                    // Reflect
                    if (reflect) {
                        nc = -nc;
                    }
                    return [nr, nc];
                });
                // Normalize to origin
                const minR = Math.min(...transformed.map((p) => p[0]));
                const minC = Math.min(...transformed.map((p) => p[1]));
                const normalized = transformed
                    .map(([r, c]) => `${r - minR},${c - minC}`)
                    .sort()
                    .join('|');
                variants.push(normalized);
            }
        }
        return variants.sort()[0];
    }
    /** Check diagonal connections for same shapes */
    chblockSolve() {
        // Collect all fixed islands
        const islands = [];
        const visited = new Set();
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) !== CellState.BLACK)
                    continue;
                const key = posKey({ row, col });
                if (visited.has(key))
                    continue;
                const island = this.getConnectedBlack({ row, col }, this.height * this.width);
                for (const k of island) {
                    visited.add(k);
                }
                islands.push(island);
            }
        }
        // Check same shape islands must connect diagonally
        for (let i = 0; i < islands.length; i++) {
            const shape1 = this.normalizeShape(islands[i]);
            for (let j = i + 1; j < islands.length; j++) {
                const shape2 = this.normalizeShape(islands[j]);
                if (shape1 === shape2) {
                    // Same shape - must connect diagonally
                    let diagonalConnect = false;
                    for (const key1 of islands[i]) {
                        const [r1, c1] = key1.split(',').map(Number);
                        const diagonals = [
                            posKey({ row: r1 - 1, col: c1 - 1 }),
                            posKey({ row: r1 - 1, col: c1 + 1 }),
                            posKey({ row: r1 + 1, col: c1 - 1 }),
                            posKey({ row: r1 + 1, col: c1 + 1 }),
                        ];
                        for (const diagKey of diagonals) {
                            if (islands[j].has(diagKey)) {
                                diagonalConnect = true;
                                break;
                            }
                        }
                        if (diagonalConnect)
                            break;
                    }
                    if (!diagonalConnect) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    /** Ensure each island has exactly one number */
    notStandAloneSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.numbers.get(row, col) !== null)
                    continue;
                if (this.cells.get(row, col) !== CellState.BLACK)
                    continue;
                const pivot = { row, col };
                const key = posKey(pivot);
                if (this.fixedPosSet.has(key))
                    continue;
                // Check if this black cell can reach a number
                const potential = this.getPotentialBlack(pivot, this.height * this.width);
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
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new ChblockField(this.height, this.width);
        for (const [pos, state] of this.cells.entries()) {
            cloned.cells.set(pos, state);
        }
        for (const [pos, num] of this.numbers.entries()) {
            cloned.numbers.set(pos, num);
        }
        cloned.fixedPosSet = new Set(this.fixedPosSet);
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
            if (!this.countSolve())
                return false;
            changed = this.getStateDump() !== beforeDump;
        }
        if (!this.notStandAloneSolve())
            return false;
        if (!this.chblockSolve())
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
                    line += num === -1 ? '?' : String(num);
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
// Chblock Solver
// ============================================
export class ChblockSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from puzzle string array */
    static fromString(height, width, puzzle) {
        const field = new ChblockField(height, width);
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const ch = puzzle[row]?.[col];
                if (ch === '?' || ch === '.') {
                    field.setNumber(row, col, -1);
                }
                else if (ch && ch >= '1' && ch <= '9') {
                    field.setNumber(row, col, parseInt(ch));
                }
                else if (ch && ch.toLowerCase() >= 'a' && ch.toLowerCase() <= 'z') {
                    field.setNumber(row, col, ch.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0) + 10);
                }
            }
        }
        return new ChblockSolver(field);
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
//# sourceMappingURL=chblock.js.map