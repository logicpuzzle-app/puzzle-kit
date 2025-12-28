/**
 * Kurotto Solver
 *
 * Rules:
 * 1. Shade some cells black
 * 2. Cells with circled numbers remain white
 * 3. A number indicates the total count of black cells in all connected
 *    black regions orthogonally adjacent to that cell
 * 4. Circled cells without numbers (.) just indicate a white cell
 */
import { CellState, DIRECTIONS, adjacent, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Kurotto Field State
// ============================================
export class KurottoField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    cells;
    /** Numbers on cells (null = no circle, -1 = circle with no number) */
    numbers;
    /** Already satisfied number positions */
    alreadyPosSet;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.numbers = new Grid(height, width, () => null);
        this.alreadyPosSet = new Set();
    }
    /** Set a number clue (marks cell as white) */
    setNumber(row, col, num) {
        this.numbers.set(row, col, num);
        this.cells.set(row, col, CellState.WHITE);
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell to black */
    setBlack(row, col) {
        if (this.numbers.get(row, col) === null) {
            this.cells.set(row, col, CellState.BLACK);
        }
    }
    /** Set cell to white */
    setWhite(row, col) {
        this.cells.set(row, col, CellState.WHITE);
    }
    // ========== Helper methods ==========
    /**
     * Get connected black region from a position
     * Only traverses confirmed BLACK cells
     */
    getConnectedBlackRegion(start, limit) {
        const region = new Set();
        const queue = [start];
        region.add(posKey(start));
        while (queue.length > 0 && region.size <= limit) {
            const current = queue.shift();
            for (const dir of DIRECTIONS) {
                const next = adjacent(current, dir);
                const key = posKey(next);
                if (this.cells.inBounds(next) &&
                    this.cells.get(next) === CellState.BLACK &&
                    !region.has(key)) {
                    region.add(key);
                    queue.push(next);
                }
            }
        }
        return region;
    }
    /**
     * Get potential black region (BLACK or UNKNOWN cells)
     */
    getPotentialBlackRegion(start, limit) {
        const region = new Set();
        const queue = [start];
        region.add(posKey(start));
        while (queue.length > 0 && region.size <= limit) {
            const current = queue.shift();
            for (const dir of DIRECTIONS) {
                const next = adjacent(current, dir);
                const key = posKey(next);
                if (this.cells.inBounds(next) &&
                    this.cells.get(next) !== CellState.WHITE &&
                    !region.has(key)) {
                    region.add(key);
                    queue.push(next);
                }
            }
        }
        return region;
    }
    // ========== Constraint checking ==========
    /**
     * Count constraint: check number constraints
     */
    countSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const num = this.numbers.get(y, x);
                if (num === null || num === -1)
                    continue;
                const pivot = { row: y, col: x };
                const pivotKey = posKey(pivot);
                if (this.alreadyPosSet.has(pivotKey))
                    continue;
                // Count confirmed black cells in adjacent regions
                const confirmedBlackRegions = new Set();
                for (const dir of DIRECTIONS) {
                    const adj = adjacent(pivot, dir);
                    if (this.cells.inBounds(adj) && this.cells.get(adj) === CellState.BLACK) {
                        const region = this.getConnectedBlackRegion(adj, num);
                        for (const key of region) {
                            confirmedBlackRegions.add(key);
                        }
                    }
                }
                // Check for size overflow
                if (confirmedBlackRegions.size > num) {
                    return false;
                }
                // If exact size, mark surrounding cells as white
                if (confirmedBlackRegions.size === num) {
                    this.alreadyPosSet.add(pivotKey);
                    // Mark all adjacent cells not in region as white
                    const fullRegion = new Set(confirmedBlackRegions);
                    fullRegion.add(pivotKey);
                    for (const key of fullRegion) {
                        const [r, c] = key.split(',').map(Number);
                        const pos = { row: r, col: c };
                        for (const dir of DIRECTIONS) {
                            const next = adjacent(pos, dir);
                            if (this.cells.inBounds(next) &&
                                !fullRegion.has(posKey(next)) &&
                                this.cells.get(next) === CellState.UNKNOWN) {
                                this.setWhite(next.row, next.col);
                            }
                        }
                    }
                }
                else {
                    // Check if we can still reach the required size
                    const potentialBlackRegions = new Set();
                    for (const dir of DIRECTIONS) {
                        const adj = adjacent(pivot, dir);
                        if (this.cells.inBounds(adj) && this.cells.get(adj) !== CellState.WHITE) {
                            const region = this.getPotentialBlackRegion(adj, num);
                            for (const key of region) {
                                potentialBlackRegions.add(key);
                            }
                        }
                    }
                    // Check for size underflow
                    if (potentialBlackRegions.size < num) {
                        return false;
                    }
                    // If potential size equals required size, all must be black
                    if (potentialBlackRegions.size === num) {
                        this.alreadyPosSet.add(pivotKey);
                        for (const key of potentialBlackRegions) {
                            const [r, c] = key.split(',').map(Number);
                            if (this.cells.get(r, c) === CellState.UNKNOWN) {
                                this.setBlack(r, c);
                            }
                        }
                    }
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new KurottoField(this.height, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.cells.set(y, x, this.cells.get(y, x));
                cloned.numbers.set(y, x, this.numbers.get(y, x));
            }
        }
        cloned.alreadyPosSet = new Set(this.alreadyPosSet);
        return cloned;
    }
    getStateDump() {
        return this.cells.dump();
    }
    isSolved() {
        // All cells must be determined
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) === CellState.UNKNOWN)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let str = this.getStateDump();
        if (!this.countSolve())
            return false;
        if (this.getStateDump() !== str) {
            return this.solveAndCheck();
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num !== null) {
                    if (num === -1) {
                        line += '�';
                    }
                    else if (num < 10) {
                        line += String(num);
                    }
                    else {
                        line += '+';
                    }
                }
                else {
                    const state = this.cells.get(row, col);
                    line += state === CellState.BLACK ? '�' : state === CellState.WHITE ? '�' : '?';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get unknown cells for branching */
    getUnknownCells() {
        const unknowns = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) === CellState.UNKNOWN) {
                    unknowns.push({ row: y, col: x });
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Kurotto Solver
// ============================================
export class KurottoSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from pzprv3 URL parameter
     */
    static fromString(height, width, param) {
        const field = new KurottoField(height, width);
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        for (let i = 0; i < param.length; i++) {
            const ch = param[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index += interval + 1;
            }
            else {
                const row = Math.floor(index / width);
                const col = index % width;
                if (row < height && col < width) {
                    if (ch === '.') {
                        // Circle without number
                        field.setNumber(row, col, -1);
                    }
                    else if (ch === '-') {
                        // 16-255 range
                        const num = parseInt(param.substring(i + 1, i + 3), 16);
                        field.setNumber(row, col, num);
                        i += 2;
                    }
                    else if (ch === '+') {
                        // 256+ range
                        const num = parseInt(param.substring(i + 1, i + 4), 16);
                        field.setNumber(row, col, num);
                        i += 3;
                    }
                    else {
                        const num = parseInt(ch, 16);
                        if (!isNaN(num)) {
                            field.setNumber(row, col, num);
                        }
                    }
                }
                index++;
            }
        }
        return new KurottoSolver(field);
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
//# sourceMappingURL=kurotto.js.map