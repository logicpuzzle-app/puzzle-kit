/**
 * Factors Solver
 *
 * Rules:
 * 1. Fill each cell with a number from 1 to N (grid size)
 * 2. Each row and column contains each number exactly once (Latin square)
 * 3. Numbers outside the grid indicate the product of the first N consecutive
 *    numbers in that row/column (where N varies)
 */
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Factors Field State
// ============================================
export class FactorsField {
    height;
    width;
    /** Number candidates for each cell */
    numbersCand;
    /** Top clues (products from top) */
    topClues;
    /** Bottom clues (products from bottom) */
    bottomClues;
    /** Left clues (products from left) */
    leftClues;
    /** Right clues (products from right) */
    rightClues;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        const size = Math.max(height, width);
        this.numbersCand = new Grid(height, width, () => {
            const cands = [];
            for (let n = 1; n <= size; n++) {
                cands.push(n);
            }
            return cands;
        });
        this.topClues = new Array(width).fill(null);
        this.bottomClues = new Array(width).fill(null);
        this.leftClues = new Array(height).fill(null);
        this.rightClues = new Array(height).fill(null);
    }
    /** Set clues */
    setTopClue(col, product) {
        this.topClues[col] = product;
    }
    setBottomClue(col, product) {
        this.bottomClues[col] = product;
    }
    setLeftClue(row, product) {
        this.leftClues[row] = product;
    }
    setRightClue(row, product) {
        this.rightClues[row] = product;
    }
    /** Set a clue number in cell */
    setClue(row, col, num) {
        this.numbersCand.set(row, col, [num]);
    }
    /** Get all factorizations of a product using numbers 1-N */
    getFactorizations(product, maxNum, maxLen) {
        const results = [];
        const backtrack = (remaining, current, usedNums) => {
            if (remaining === 1) {
                results.push([...current]);
                return;
            }
            if (current.length >= maxLen)
                return;
            for (let n = 1; n <= maxNum; n++) {
                if (usedNums.has(n))
                    continue;
                if (remaining % n !== 0)
                    continue;
                current.push(n);
                usedNums.add(n);
                backtrack(remaining / n, current, usedNums);
                current.pop();
                usedNums.delete(n);
            }
        };
        backtrack(product, [], new Set());
        return results;
    }
    /** Latin square constraint */
    latinSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cands = this.numbersCand.get(y, x);
                if (cands.length === 1) {
                    const val = cands[0];
                    // Eliminate from same row
                    for (let x2 = 0; x2 < this.width; x2++) {
                        if (x2 === x)
                            continue;
                        const otherCands = this.numbersCand.get(y, x2);
                        const filtered = otherCands.filter((c) => c !== val);
                        if (filtered.length === 0)
                            return false;
                        this.numbersCand.set(y, x2, filtered);
                    }
                    // Eliminate from same column
                    for (let y2 = 0; y2 < this.height; y2++) {
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
                        for (let x2 = 0; x2 < this.width; x2++) {
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
                        for (let y2 = 0; y2 < this.height; y2++) {
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
    /** Product clue constraint */
    productSolve() {
        const size = Math.max(this.height, this.width);
        // Top clues - product from top
        for (let x = 0; x < this.width; x++) {
            const product = this.topClues[x];
            if (product === null)
                continue;
            const factorizations = this.getFactorizations(product, size, this.height);
            if (factorizations.length === 0)
                return false;
            // For each position, find valid candidates
            for (let y = 0; y < this.height; y++) {
                const validCands = new Set();
                for (const factors of factorizations) {
                    if (y < factors.length) {
                        // Check if remaining positions can accommodate the factorization
                        let possible = true;
                        for (let i = 0; i < factors.length; i++) {
                            if (!this.numbersCand.get(i, x).includes(factors[i])) {
                                possible = false;
                                break;
                            }
                        }
                        if (possible) {
                            validCands.add(factors[y]);
                        }
                    }
                    else {
                        // Position is after the product sequence - any candidate is valid
                        for (const c of this.numbersCand.get(y, x)) {
                            validCands.add(c);
                        }
                    }
                }
                if (validCands.size === 0)
                    return false;
                const currentCands = this.numbersCand.get(y, x);
                const filtered = currentCands.filter((c) => validCands.has(c));
                if (filtered.length === 0)
                    return false;
                this.numbersCand.set(y, x, filtered);
            }
        }
        // Left clues - product from left
        for (let y = 0; y < this.height; y++) {
            const product = this.leftClues[y];
            if (product === null)
                continue;
            const factorizations = this.getFactorizations(product, size, this.width);
            if (factorizations.length === 0)
                return false;
            for (let x = 0; x < this.width; x++) {
                const validCands = new Set();
                for (const factors of factorizations) {
                    if (x < factors.length) {
                        let possible = true;
                        for (let i = 0; i < factors.length; i++) {
                            if (!this.numbersCand.get(y, i).includes(factors[i])) {
                                possible = false;
                                break;
                            }
                        }
                        if (possible) {
                            validCands.add(factors[x]);
                        }
                    }
                    else {
                        for (const c of this.numbersCand.get(y, x)) {
                            validCands.add(c);
                        }
                    }
                }
                if (validCands.size === 0)
                    return false;
                const currentCands = this.numbersCand.get(y, x);
                const filtered = currentCands.filter((c) => validCands.has(c));
                if (filtered.length === 0)
                    return false;
                this.numbersCand.set(y, x, filtered);
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new FactorsField(this.height, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.numbersCand.set(y, x, [...this.numbersCand.get(y, x)]);
            }
        }
        cloned.topClues = [...this.topClues];
        cloned.bottomClues = [...this.bottomClues];
        cloned.leftClues = [...this.leftClues];
        cloned.rightClues = [...this.rightClues];
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                dump += this.numbersCand.get(y, x).length + ':';
            }
        }
        return dump;
    }
    isSolved() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
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
            if (!this.productSolve())
                return false;
            changed = this.getStateDump() !== befStr;
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let y = 0; y < this.height; y++) {
            let line = '';
            for (let x = 0; x < this.width; x++) {
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
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
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
    /** Set cell to specific value */
    setCell(row, col, value) {
        this.numbersCand.set(row, col, [value]);
    }
}
// ============================================
// Factors Solver
// ============================================
export class FactorsSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzprv3 URL parameter */
    static fromString(height, width, param) {
        const field = new FactorsField(height, width);
        // Parse parameter - format depends on pzprv3 encoding
        // Typically: top clues / bottom clues / left clues / right clues / cell clues
        const parts = param.split('/');
        // Parse top clues
        if (parts[0]) {
            const topPart = parts[0];
            let index = 0;
            for (let i = 0; i < topPart.length && index < width; i++) {
                const ch = topPart[i];
                if (ch >= 'g' && ch <= 'z') {
                    index += ch.charCodeAt(0) - 'f'.charCodeAt(0);
                }
                else if (ch === '-') {
                    const num = parseInt(topPart.substring(i + 1, i + 3), 16);
                    field.setTopClue(index, num);
                    i += 2;
                    index++;
                }
                else {
                    const num = parseInt(ch, 16);
                    if (!isNaN(num)) {
                        field.setTopClue(index, num);
                    }
                    index++;
                }
            }
        }
        return new FactorsSolver(field);
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
//# sourceMappingURL=factors.js.map