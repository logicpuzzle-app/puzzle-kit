/**
 * Doppelblock Solver
 *
 * Rules:
 * 1. Fill cells with numbers 1 to N or leave them as black blocks
 * 2. Each row and column contains each number 1 to N exactly once
 * 3. Each row and column contains exactly 2 black blocks
 * 4. Numbers outside the grid indicate the sum of numbers between the two black blocks
 *    in that row/column
 */
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Doppelblock Field State
// ============================================
export class DoppelblockField {
    size;
    height;
    width;
    /** Cell states: number (1-N), 'black', or 'unknown' */
    cells;
    /** Candidates for each cell */
    candidates;
    /** Row clues (sum between blocks) */
    rowClues;
    /** Column clues (sum between blocks) */
    colClues;
    constructor(size) {
        this.size = size;
        this.height = size;
        this.width = size;
        this.cells = new Grid(size, size, () => 'unknown');
        this.candidates = new Grid(size, size, () => {
            const cands = ['black'];
            for (let n = 1; n <= size - 2; n++) {
                cands.push(n);
            }
            return cands;
        });
        this.rowClues = new Array(size).fill(null);
        this.colClues = new Array(size).fill(null);
    }
    /** Set row clue */
    setRowClue(row, sum) {
        this.rowClues[row] = sum;
    }
    /** Set column clue */
    setColClue(col, sum) {
        this.colClues[col] = sum;
    }
    /** Set a cell value */
    setCell(row, col, value) {
        this.cells.set(row, col, value);
        this.candidates.set(row, col, [value]);
    }
    /** Latin square constraint (excluding black cells) */
    latinSolve() {
        const maxNum = this.size - 2;
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                const cell = this.cells.get(y, x);
                if (typeof cell !== 'number')
                    continue;
                // Eliminate from same row
                for (let x2 = 0; x2 < this.size; x2++) {
                    if (x2 === x)
                        continue;
                    const cands = this.candidates.get(y, x2);
                    const filtered = cands.filter((c) => c !== cell);
                    if (filtered.length === 0)
                        return false;
                    this.candidates.set(y, x2, filtered);
                    if (filtered.length === 1 && this.cells.get(y, x2) === 'unknown') {
                        this.cells.set(y, x2, filtered[0]);
                    }
                }
                // Eliminate from same column
                for (let y2 = 0; y2 < this.size; y2++) {
                    if (y2 === y)
                        continue;
                    const cands = this.candidates.get(y2, x);
                    const filtered = cands.filter((c) => c !== cell);
                    if (filtered.length === 0)
                        return false;
                    this.candidates.set(y2, x, filtered);
                    if (filtered.length === 1 && this.cells.get(y2, x) === 'unknown') {
                        this.cells.set(y2, x, filtered[0]);
                    }
                }
            }
        }
        // Hidden single for numbers in rows
        for (let y = 0; y < this.size; y++) {
            for (let n = 1; n <= maxNum; n++) {
                const possibleCols = [];
                for (let x = 0; x < this.size; x++) {
                    if (this.candidates.get(y, x).includes(n)) {
                        possibleCols.push(x);
                    }
                }
                if (possibleCols.length === 0)
                    return false;
                if (possibleCols.length === 1 && this.cells.get(y, possibleCols[0]) === 'unknown') {
                    this.cells.set(y, possibleCols[0], n);
                    this.candidates.set(y, possibleCols[0], [n]);
                }
            }
        }
        // Hidden single for numbers in columns
        for (let x = 0; x < this.size; x++) {
            for (let n = 1; n <= maxNum; n++) {
                const possibleRows = [];
                for (let y = 0; y < this.size; y++) {
                    if (this.candidates.get(y, x).includes(n)) {
                        possibleRows.push(y);
                    }
                }
                if (possibleRows.length === 0)
                    return false;
                if (possibleRows.length === 1 && this.cells.get(possibleRows[0], x) === 'unknown') {
                    this.cells.set(possibleRows[0], x, n);
                    this.candidates.set(possibleRows[0], x, [n]);
                }
            }
        }
        return true;
    }
    /** Black block constraint: exactly 2 per row/column */
    blockSolve() {
        // Rows
        for (let y = 0; y < this.size; y++) {
            let blackCount = 0;
            let possibleBlack = 0;
            const unknownPositions = [];
            for (let x = 0; x < this.size; x++) {
                const cell = this.cells.get(y, x);
                if (cell === 'black') {
                    blackCount++;
                }
                else if (cell === 'unknown' && this.candidates.get(y, x).includes('black')) {
                    possibleBlack++;
                    unknownPositions.push(x);
                }
            }
            if (blackCount > 2)
                return false;
            if (blackCount + possibleBlack < 2)
                return false;
            if (blackCount === 2) {
                // Remove black from remaining candidates
                for (const x of unknownPositions) {
                    const cands = this.candidates.get(y, x);
                    const filtered = cands.filter((c) => c !== 'black');
                    if (filtered.length === 0)
                        return false;
                    this.candidates.set(y, x, filtered);
                    if (filtered.length === 1 && this.cells.get(y, x) === 'unknown') {
                        this.cells.set(y, x, filtered[0]);
                    }
                }
            }
            else if (blackCount + possibleBlack === 2) {
                // All unknowns with black candidate must be black
                for (const x of unknownPositions) {
                    this.cells.set(y, x, 'black');
                    this.candidates.set(y, x, ['black']);
                }
            }
        }
        // Columns
        for (let x = 0; x < this.size; x++) {
            let blackCount = 0;
            let possibleBlack = 0;
            const unknownPositions = [];
            for (let y = 0; y < this.size; y++) {
                const cell = this.cells.get(y, x);
                if (cell === 'black') {
                    blackCount++;
                }
                else if (cell === 'unknown' && this.candidates.get(y, x).includes('black')) {
                    possibleBlack++;
                    unknownPositions.push(y);
                }
            }
            if (blackCount > 2)
                return false;
            if (blackCount + possibleBlack < 2)
                return false;
            if (blackCount === 2) {
                for (const y of unknownPositions) {
                    const cands = this.candidates.get(y, x);
                    const filtered = cands.filter((c) => c !== 'black');
                    if (filtered.length === 0)
                        return false;
                    this.candidates.set(y, x, filtered);
                    if (filtered.length === 1 && this.cells.get(y, x) === 'unknown') {
                        this.cells.set(y, x, filtered[0]);
                    }
                }
            }
            else if (blackCount + possibleBlack === 2) {
                for (const y of unknownPositions) {
                    this.cells.set(y, x, 'black');
                    this.candidates.set(y, x, ['black']);
                }
            }
        }
        return true;
    }
    /** Sum clue constraint */
    sumSolve() {
        // Row clues
        for (let y = 0; y < this.size; y++) {
            const clue = this.rowClues[y];
            if (clue === null)
                continue;
            // Find black block positions
            const blackPositions = [];
            const possibleBlackPositions = [];
            for (let x = 0; x < this.size; x++) {
                const cell = this.cells.get(y, x);
                if (cell === 'black') {
                    blackPositions.push(x);
                }
                else if (cell === 'unknown' && this.candidates.get(y, x).includes('black')) {
                    possibleBlackPositions.push(x);
                }
            }
            if (blackPositions.length === 2) {
                // Both blocks are placed - verify sum
                const [left, right] = blackPositions.sort((a, b) => a - b);
                let sum = 0;
                let hasUnknown = false;
                for (let x = left + 1; x < right; x++) {
                    const cell = this.cells.get(y, x);
                    if (typeof cell === 'number') {
                        sum += cell;
                    }
                    else {
                        hasUnknown = true;
                    }
                }
                if (!hasUnknown && sum !== clue)
                    return false;
                if (sum > clue)
                    return false;
            }
        }
        // Column clues
        for (let x = 0; x < this.size; x++) {
            const clue = this.colClues[x];
            if (clue === null)
                continue;
            const blackPositions = [];
            for (let y = 0; y < this.size; y++) {
                if (this.cells.get(y, x) === 'black') {
                    blackPositions.push(y);
                }
            }
            if (blackPositions.length === 2) {
                const [top, bottom] = blackPositions.sort((a, b) => a - b);
                let sum = 0;
                let hasUnknown = false;
                for (let y = top + 1; y < bottom; y++) {
                    const cell = this.cells.get(y, x);
                    if (typeof cell === 'number') {
                        sum += cell;
                    }
                    else {
                        hasUnknown = true;
                    }
                }
                if (!hasUnknown && sum !== clue)
                    return false;
                if (sum > clue)
                    return false;
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new DoppelblockField(this.size);
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                cloned.cells.set(y, x, this.cells.get(y, x));
                cloned.candidates.set(y, x, [...this.candidates.get(y, x)]);
            }
        }
        cloned.rowClues = [...this.rowClues];
        cloned.colClues = [...this.colClues];
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                const cell = this.cells.get(y, x);
                dump += typeof cell === 'number' ? cell : cell === 'black' ? 'B' : '?';
            }
        }
        return dump;
    }
    isSolved() {
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (this.cells.get(y, x) === 'unknown')
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
            if (!this.blockSolve())
                return false;
            if (!this.sumSolve())
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
                const cell = this.cells.get(y, x);
                if (typeof cell === 'number') {
                    line += String(cell);
                }
                else if (cell === 'black') {
                    line += '#';
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
                if (this.cells.get(y, x) !== 'unknown')
                    continue;
                const count = this.candidates.get(y, x).length;
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
            candidates: this.candidates.get(bestPos.row, bestPos.col),
        };
    }
}
// ============================================
// Doppelblock Solver
// ============================================
export class DoppelblockSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzprv3 URL parameter */
    static fromString(size, param) {
        const field = new DoppelblockField(size);
        // Parse clues - format: row clues / column clues
        const parts = param.split('/');
        const rowPart = parts[0] || '';
        const colPart = parts[1] || '';
        // Parse row clues
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        for (let i = 0; i < rowPart.length && index < size; i++) {
            const ch = rowPart[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index += interval + 1;
            }
            else if (ch === '.') {
                index++;
            }
            else {
                let num;
                if (ch === '-') {
                    num = parseInt(rowPart[i + 1] + rowPart[i + 2], 16);
                    i += 2;
                }
                else {
                    num = parseInt(ch, 16);
                }
                if (!isNaN(num)) {
                    field.setRowClue(index, num);
                }
                index++;
            }
        }
        // Parse column clues
        index = 0;
        for (let i = 0; i < colPart.length && index < size; i++) {
            const ch = colPart[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index += interval + 1;
            }
            else if (ch === '.') {
                index++;
            }
            else {
                let num;
                if (ch === '-') {
                    num = parseInt(colPart[i + 1] + colPart[i + 2], 16);
                    i += 2;
                }
                else {
                    num = parseInt(ch, 16);
                }
                if (!isNaN(num)) {
                    field.setColClue(index, num);
                }
                index++;
            }
        }
        return new DoppelblockSolver(field);
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
//# sourceMappingURL=doppelblock.js.map