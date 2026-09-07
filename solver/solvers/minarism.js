/**
 * Minarism Solver
 *
 * Rules:
 * 1. Fill cells with numbers 1 to N (grid size)
 * 2. Each row and column contains each number exactly once (Latin square)
 * 3. Numbers in the grid indicate the minimum of all adjacent (orthogonally) cells
 */
import { Grid } from '../core/field.js';
import { DIRECTIONS, adjacent } from '../core/types.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Minarism Field State
// ============================================
export class MinarismField {
    size;
    height;
    width;
    /** Number candidates for each cell */
    numbersCand;
    /** Clue cells (showing minimum of adjacent) */
    clues;
    constructor(size) {
        this.size = size;
        this.height = size;
        this.width = size;
        this.numbersCand = new Grid(size, size, () => {
            const cands = [];
            for (let n = 1; n <= size; n++) {
                cands.push(n);
            }
            return cands;
        });
        this.clues = new Grid(size, size, () => null);
    }
    /** Set a clue (minimum indicator) */
    setClue(row, col, min) {
        this.clues.set(row, col, min);
    }
    /** Set a cell value */
    setCell(row, col, value) {
        this.numbersCand.set(row, col, [value]);
    }
    /** Get adjacent positions */
    getAdjacent(row, col) {
        const result = [];
        for (const dir of DIRECTIONS) {
            const adj = adjacent({ row, col }, dir);
            if (adj.row >= 0 && adj.row < this.size && adj.col >= 0 && adj.col < this.size) {
                result.push(adj);
            }
        }
        return result;
    }
    /** Latin square constraint */
    latinSolve() {
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                const cands = this.numbersCand.get(y, x);
                if (cands.length === 1) {
                    const val = cands[0];
                    // Eliminate from same row
                    for (let x2 = 0; x2 < this.size; x2++) {
                        if (x2 === x)
                            continue;
                        const otherCands = this.numbersCand.get(y, x2);
                        const filtered = otherCands.filter((c) => c !== val);
                        if (filtered.length === 0)
                            return false;
                        this.numbersCand.set(y, x2, filtered);
                    }
                    // Eliminate from same column
                    for (let y2 = 0; y2 < this.size; y2++) {
                        if (y2 === y)
                            continue;
                        const otherCands = this.numbersCand.get(y2, x);
                        const filtered = otherCands.filter((c) => c !== val);
                        if (filtered.length === 0)
                            return false;
                        this.numbersCand.set(y2, x, filtered);
                    }
                }
                // Hidden single in row
                if (cands.length > 1) {
                    for (const cand of cands) {
                        let isHiddenSingle = true;
                        for (let x2 = 0; x2 < this.size; x2++) {
                            if (x2 === x)
                                continue;
                            if (this.numbersCand.get(y, x2).includes(cand)) {
                                isHiddenSingle = false;
                                break;
                            }
                        }
                        if (isHiddenSingle) {
                            this.numbersCand.set(y, x, [cand]);
                            break;
                        }
                    }
                }
                // Hidden single in column
                const updatedCands = this.numbersCand.get(y, x);
                if (updatedCands.length > 1) {
                    for (const cand of updatedCands) {
                        let isHiddenSingle = true;
                        for (let y2 = 0; y2 < this.size; y2++) {
                            if (y2 === y)
                                continue;
                            if (this.numbersCand.get(y2, x).includes(cand)) {
                                isHiddenSingle = false;
                                break;
                            }
                        }
                        if (isHiddenSingle) {
                            this.numbersCand.set(y, x, [cand]);
                            break;
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Minimum clue constraint */
    minSolve() {
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                const clue = this.clues.get(y, x);
                if (clue === null)
                    continue;
                const adjacents = this.getAdjacent(y, x);
                // All adjacent cells must have at least one candidate >= clue
                // And at least one adjacent must be able to have exactly clue
                let hasExactClue = false;
                for (const adj of adjacents) {
                    const adjCands = this.numbersCand.get(adj.row, adj.col);
                    // Filter out candidates less than clue (can't be minimum)
                    // No wait - the clue IS the minimum, so at least one adjacent = clue
                    // and all others >= clue
                    // Check if this adjacent can be the minimum (= clue)
                    if (adjCands.includes(clue)) {
                        hasExactClue = true;
                    }
                    // All adjacents must be >= clue
                    const filtered = adjCands.filter((c) => c >= clue);
                    if (filtered.length === 0)
                        return false;
                    this.numbersCand.set(adj.row, adj.col, filtered);
                }
                if (!hasExactClue)
                    return false;
                // If only one adjacent can have the clue value, it must be that value
                const canBeClue = adjacents.filter((adj) => this.numbersCand.get(adj.row, adj.col).includes(clue));
                if (canBeClue.length === 1) {
                    this.numbersCand.set(canBeClue[0].row, canBeClue[0].col, [clue]);
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new MinarismField(this.size);
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                cloned.numbersCand.set(y, x, [...this.numbersCand.get(y, x)]);
                cloned.clues.set(y, x, this.clues.get(y, x));
            }
        }
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                dump += this.numbersCand.get(y, x).length + ':';
            }
        }
        return dump;
    }
    isSolved() {
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (this.numbersCand.get(y, x).length !== 1)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const befStr = this.getStateDump();
            if (!this.latinSolve())
                return false;
            if (!this.minSolve())
                return false;
            changed = this.getStateDump() !== befStr;
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let y = 0; y < this.size; y++) {
            let line = '';
            for (let x = 0; x < this.size; x++) {
                const cands = this.numbersCand.get(y, x);
                if (cands.length === 0) {
                    line += 'X';
                }
                else if (cands.length === 1) {
                    line += String(cands[0]);
                }
                else {
                    line += '?';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get branching info */
    getBranchInfo() {
        let minCount = Infinity;
        let bestPos = null;
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                const count = this.numbersCand.get(y, x).length;
                if (count > 1 && count < minCount) {
                    minCount = count;
                    bestPos = { row: y, col: x };
                }
            }
        }
        if (!bestPos)
            return null;
        return {
            row: bestPos.row,
            col: bestPos.col,
            candidates: this.numbersCand.get(bestPos.row, bestPos.col),
        };
    }
}
// ============================================
// Minarism Solver
// ============================================
export class MinarismSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzprv3 URL parameter */
    static fromString(size, param) {
        const field = new MinarismField(size);
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        for (let i = 0; i < param.length; i++) {
            const ch = param[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index += interval + 1;
            }
            else {
                const row = Math.floor(index / size);
                const col = index % size;
                if (row < size && col < size) {
                    let num;
                    if (ch === '-') {
                        num = parseInt(param[i + 1] + param[i + 2], 16);
                        i += 2;
                    }
                    else {
                        num = parseInt(ch, 16);
                    }
                    if (!isNaN(num) && num >= 1) {
                        field.setClue(row, col, num);
                    }
                }
                index++;
            }
        }
        return new MinarismSolver(field);
    }
    getBranchCandidates(state) {
        const branchInfo = state.getBranchInfo();
        if (!branchInfo)
            return [];
        const { row, col, candidates } = branchInfo;
        return candidates.map((cand) => ({
            apply: (s) => {
                const cloned = s.clone();
                cloned.setCell(row, col, cand);
                return cloned;
            },
            description: `Set (${row}, ${col}) to ${cand}`,
        }));
    }
}
//# sourceMappingURL=minarism.js.map