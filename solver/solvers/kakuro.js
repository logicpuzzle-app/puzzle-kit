/**
 * Kakuro Solver
 *
 * Rules:
 * 1. Fill white cells with numbers 1-9
 * 2. Numbers in each horizontal/vertical run must sum to the clue
 * 3. No number may repeat within a run
 */
import { Grid, CandidateSet } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Kakuro Field State
// ============================================
export class KakuroField {
    height;
    width;
    /** Cell candidates (empty for black cells) */
    candidates;
    /** Horizontal clues: (row, col) -> clue for cells to the right */
    horizontalClues;
    /** Vertical clues: (row, col) -> clue for cells below */
    verticalClues;
    /** Groups of cells */
    groups;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.candidates = new Grid(height, width, () => null);
        this.horizontalClues = new Map();
        this.verticalClues = new Map();
        this.groups = [];
    }
    /** Set a cell as white (can have numbers) */
    setWhiteCell(row, col) {
        this.candidates.set(row, col, new CandidateSet([1, 2, 3, 4, 5, 6, 7, 8, 9]));
    }
    /** Set a horizontal clue */
    setHorizontalClue(row, col, sum) {
        this.horizontalClues.set(`${row},${col}`, sum);
    }
    /** Set a vertical clue */
    setVerticalClue(row, col, sum) {
        this.verticalClues.set(`${row},${col}`, sum);
    }
    /** Initialize groups after setting up clues */
    initializeGroups() {
        this.groups = [];
        // Build horizontal groups
        for (let row = 0; row < this.height; row++) {
            let startCol = -1;
            let clue = 0;
            for (let col = 0; col <= this.width; col++) {
                const isWhite = col < this.width && this.candidates.get(row, col) !== null;
                if (isWhite) {
                    if (startCol === -1) {
                        startCol = col;
                        // Find clue from left
                        for (let c = col - 1; c >= 0; c--) {
                            const key = `${row},${c}`;
                            if (this.horizontalClues.has(key)) {
                                clue = this.horizontalClues.get(key);
                                break;
                            }
                            if (this.candidates.get(row, c) !== null)
                                break;
                        }
                    }
                }
                else {
                    if (startCol !== -1) {
                        const cells = [];
                        for (let c = startCol; c < col; c++) {
                            cells.push({ row, col: c });
                        }
                        if (cells.length > 0 && clue > 0) {
                            this.groups.push({ sum: clue, cells });
                        }
                        startCol = -1;
                        clue = 0;
                    }
                }
            }
        }
        // Build vertical groups
        for (let col = 0; col < this.width; col++) {
            let startRow = -1;
            let clue = 0;
            for (let row = 0; row <= this.height; row++) {
                const isWhite = row < this.height && this.candidates.get(row, col) !== null;
                if (isWhite) {
                    if (startRow === -1) {
                        startRow = row;
                        // Find clue from above
                        for (let r = row - 1; r >= 0; r--) {
                            const key = `${r},${col}`;
                            if (this.verticalClues.has(key)) {
                                clue = this.verticalClues.get(key);
                                break;
                            }
                            if (this.candidates.get(r, col) !== null)
                                break;
                        }
                    }
                }
                else {
                    if (startRow !== -1) {
                        const cells = [];
                        for (let r = startRow; r < row; r++) {
                            cells.push({ row: r, col });
                        }
                        if (cells.length > 0 && clue > 0) {
                            this.groups.push({ sum: clue, cells });
                        }
                        startRow = -1;
                        clue = 0;
                    }
                }
            }
        }
    }
    /** Get candidates at position */
    getCandidates(row, col) {
        const cand = this.candidates.get(row, col);
        return cand ? cand.getAll() : [];
    }
    /** Check if a combination can reach the target sum */
    canReachSum(cells, index, currentSum, targetSum, usedNumbers) {
        if (index === cells.length) {
            return currentSum === targetSum;
        }
        const pos = cells[index];
        const cand = this.candidates.get(pos.row, pos.col);
        if (!cand)
            return false;
        for (const num of cand.getAll()) {
            if (usedNumbers.has(num))
                continue;
            if (currentSum + num > targetSum)
                continue;
            usedNumbers.add(num);
            if (this.canReachSum(cells, index + 1, currentSum + num, targetSum, usedNumbers)) {
                usedNumbers.delete(num);
                return true;
            }
            usedNumbers.delete(num);
        }
        return false;
    }
    /** Eliminate candidates that can't be part of valid combinations */
    eliminateInvalidCandidates() {
        let changed = false;
        for (const group of this.groups) {
            for (let i = 0; i < group.cells.length; i++) {
                const pos = group.cells[i];
                const cand = this.candidates.get(pos.row, pos.col);
                if (!cand || cand.isDetermined())
                    continue;
                const otherCells = [...group.cells.slice(0, i), ...group.cells.slice(i + 1)];
                for (const num of [...cand.getAll()]) {
                    const usedNumbers = new Set([num]);
                    if (!this.canReachSum(otherCells, 0, num, group.sum, usedNumbers)) {
                        cand.eliminate(num);
                        changed = true;
                    }
                }
            }
        }
        return changed;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new KakuroField(this.height, this.width);
        for (const [pos, cand] of this.candidates.entries()) {
            cloned.candidates.set(pos, cand ? cand.clone() : null);
        }
        cloned.horizontalClues = new Map(this.horizontalClues);
        cloned.verticalClues = new Map(this.verticalClues);
        cloned.groups = this.groups; // Groups are read-only
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cand = this.candidates.get(row, col);
                dump += cand ? cand.size.toString() : 'X';
            }
        }
        return dump;
    }
    isSolved() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cand = this.candidates.get(row, col);
                if (cand && !cand.isDetermined()) {
                    return false;
                }
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        // Check for contradictions
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cand = this.candidates.get(row, col);
                if (cand && cand.isContradiction()) {
                    return false;
                }
            }
        }
        let changed = true;
        while (changed) {
            changed = false;
            if (this.eliminateInvalidCandidates())
                changed = true;
            // Check for contradictions
            for (let row = 0; row < this.height; row++) {
                for (let col = 0; col < this.width; col++) {
                    const cand = this.candidates.get(row, col);
                    if (cand && cand.isContradiction()) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const cand = this.candidates.get(row, col);
                if (!cand) {
                    const hKey = `${row},${col}`;
                    const vKey = `${row},${col}`;
                    const h = this.horizontalClues.get(hKey);
                    const v = this.verticalClues.get(vKey);
                    if (h || v) {
                        line += `[${v || '-'}\\${h || '-'}]`;
                    }
                    else {
                        line += '███';
                    }
                }
                else if (cand.isDetermined()) {
                    line += ` ${cand.getValue()} `;
                }
                else {
                    line += ' . ';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get cells with fewest candidates */
    getMinCandidateCells() {
        let minSize = Infinity;
        const cells = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cand = this.candidates.get(row, col);
                if (!cand || cand.isDetermined())
                    continue;
                const size = cand.size;
                if (size < minSize) {
                    minSize = size;
                    cells.length = 0;
                    cells.push({ row, col });
                }
                else if (size === minSize) {
                    cells.push({ row, col });
                }
            }
        }
        return cells;
    }
    /** Set number at position */
    setNumber(row, col, num) {
        const cand = this.candidates.get(row, col);
        if (cand) {
            cand.setTo(num);
        }
    }
}
// ============================================
// Kakuro Solver
// ============================================
export class KakuroSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    getBranchCandidates(state) {
        const cells = state.getMinCandidateCells();
        if (cells.length === 0)
            return [];
        const pos = cells[0];
        const candidates = state.getCandidates(pos.row, pos.col);
        return candidates.map((num) => ({
            apply: (s) => {
                const cloned = s.clone();
                cloned.setNumber(pos.row, pos.col, num);
                return cloned;
            },
            description: `Set (${pos.row}, ${pos.col}) to ${num}`,
        }));
    }
}
//# sourceMappingURL=kakuro.js.map