/**
 * Simple Gako Solver
 *
 * Rules:
 * 1. Fill each cell with a number from 1 to (height + width - 1)
 * 2. A number N appears exactly N times in its row and column combined
 * 3. Some numbers are given as clues
 */
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Simple Gako Field State
// ============================================
export class SimpleGakoField {
    height;
    width;
    /** Given numbers */
    numbers;
    /** Number candidates for each cell */
    numbersCand;
    constructor(height, width, param) {
        this.height = height;
        this.width = width;
        this.numbers = new Grid(height, width, () => null);
        // Initialize candidates: 1 to height + width - 1
        const maxNum = height + width - 1;
        this.numbersCand = new Grid(height, width, () => {
            const cands = [];
            for (let i = 1; i <= maxNum; i++) {
                cands.push(i);
            }
            return cands;
        });
        if (param) {
            this.parseParam(param);
        }
    }
    parseParam(param) {
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        for (let i = 0; i < param.length && index < this.height * this.width; i++) {
            const ch = param.charAt(i);
            const row = Math.floor(index / this.width);
            const col = index % this.width;
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index += interval + 1;
            }
            else {
                let num;
                if (ch === '-') {
                    num = parseInt(param.substring(i + 1, i + 3), 16);
                    i += 2;
                }
                else if (ch === '+') {
                    num = parseInt(param.substring(i + 1, i + 4), 16);
                    i += 3;
                }
                else {
                    num = parseInt(ch, 16);
                }
                this.numbers.set(row, col, num);
                this.numbersCand.set(row, col, [num]);
                index++;
            }
        }
    }
    clone() {
        const cloned = Object.create(SimpleGakoField.prototype);
        cloned.height = this.height;
        cloned.width = this.width;
        cloned.numbers = this.numbers;
        cloned.numbersCand = new Grid(this.height, this.width, () => []);
        for (const [pos, cands] of this.numbersCand.entries()) {
            cloned.numbersCand.set(pos, [...cands]);
        }
        return cloned;
    }
    getStateDump() {
        return this.numbersCand.dump();
    }
    isSolved() {
        for (const [, cands] of this.numbersCand.entries()) {
            if (cands.length !== 1)
                return false;
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const before = this.getStateDump();
            if (!this.numberSolve())
                return false;
            changed = this.getStateDump() !== before;
        }
        return true;
    }
    /** A number N appears exactly N times in its row and column */
    numberSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cands = this.numbersCand.get(row, col);
                if (cands.length !== 1)
                    continue;
                const number = cands[0];
                let fixedCount = 1;
                let candCount = 1;
                // Count in column
                for (let r = 0; r < this.height; r++) {
                    if (r !== row) {
                        const c = this.numbersCand.get(r, col);
                        if (c.includes(number)) {
                            candCount++;
                            if (c.length === 1)
                                fixedCount++;
                        }
                    }
                }
                // Count in row
                for (let c = 0; c < this.width; c++) {
                    if (c !== col) {
                        const cand = this.numbersCand.get(row, c);
                        if (cand.includes(number)) {
                            candCount++;
                            if (cand.length === 1)
                                fixedCount++;
                        }
                    }
                }
                if (number < fixedCount || number > candCount) {
                    return false;
                }
                // If exactly enough candidates, fix them
                if (number === candCount) {
                    for (let r = 0; r < this.height; r++) {
                        if (r !== row && this.numbersCand.get(r, col).includes(number)) {
                            this.numbersCand.set(r, col, [number]);
                        }
                    }
                    for (let c = 0; c < this.width; c++) {
                        if (c !== col && this.numbersCand.get(row, c).includes(number)) {
                            this.numbersCand.set(row, c, [number]);
                        }
                    }
                }
                // If already have enough, eliminate from others
                if (number === fixedCount) {
                    for (let r = 0; r < this.height; r++) {
                        if (r !== row) {
                            const c = this.numbersCand.get(r, col);
                            if (c.length !== 1 && c.includes(number)) {
                                this.numbersCand.set(r, col, c.filter(n => n !== number));
                            }
                        }
                    }
                    for (let c = 0; c < this.width; c++) {
                        if (c !== col) {
                            const cand = this.numbersCand.get(row, c);
                            if (cand.length !== 1 && cand.includes(number)) {
                                this.numbersCand.set(row, c, cand.filter(n => n !== number));
                            }
                        }
                    }
                }
            }
        }
        return true;
    }
    toString() {
        let result = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cands = this.numbersCand.get(row, col);
                if (cands.length === 0) {
                    result += 'X ';
                }
                else if (cands.length === 1) {
                    result += cands[0].toString().padEnd(2);
                }
                else {
                    result += '. ';
                }
            }
            result += '\n';
        }
        return result;
    }
}
// ============================================
// Simple Gako Solver
// ============================================
export class SimpleGakoSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    static fromURL(url) {
        const parts = url.split('/');
        const height = parseInt(parts[parts.length - 2]);
        const width = parseInt(parts[parts.length - 3]);
        const param = parts[parts.length - 1];
        const field = new SimpleGakoField(height, width, param);
        return new SimpleGakoSolver(field);
    }
    getBranchCandidates(state) {
        const candidates = [];
        // Find cell with smallest number of candidates > 1
        let minCands = Infinity;
        let bestPos = null;
        for (const [pos, cands] of state['numbersCand'].entries()) {
            if (cands.length > 1 && cands.length < minCands) {
                minCands = cands.length;
                bestPos = pos;
            }
        }
        if (bestPos) {
            const cands = state['numbersCand'].get(bestPos);
            for (const num of cands) {
                candidates.push({
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned['numbersCand'].set(bestPos, [num]);
                        return cloned;
                    },
                    description: `Set ${bestPos.row},${bestPos.col} to ${num}`
                });
            }
        }
        return candidates;
    }
}
//# sourceMappingURL=simplegako.js.map