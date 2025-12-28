/**
 * League Solver
 *
 * Rules:
 * 1. Fill the grid with numbers representing game results in a tournament league
 * 2. Each cell (i,j) represents the number of points team i earned against team j
 * 3. Diagonal cells (i,i) are always 0 (a team doesn't play itself)
 * 4. The grid must be symmetric: if team i scored N points against team j,
 *    then team j scored (size-1-N) points against team i
 * 5. Each row represents a team's total points against each opponent
 * 6. Valid point values are 0 to size-1, where size is the grid dimension
 */
import { BaseSolver } from '../core/solver.js';
// ============================================
// League Field State
// ============================================
export class LeagueField {
    size;
    height;
    width;
    /** Candidates for each cell - list of possible numbers */
    numbersCand;
    /** Fixed numbers (clues) */
    numbers;
    constructor(size) {
        this.size = size;
        this.height = size;
        this.width = size;
        this.numbers = Array.from({ length: size }, () => Array(size).fill(null));
        this.numbersCand = Array.from({ length: size }, () => Array.from({ length: size }, () => []));
        // Initialize candidates
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (y === x) {
                    // Diagonal is always 0
                    this.numbersCand[y][x] = [0];
                }
                else {
                    // Other cells can be 1 to size-1
                    this.numbersCand[y][x] = Array.from({ length: size - 1 }, (_, i) => i + 1);
                }
            }
        }
    }
    /** Set a fixed number (clue) */
    setNumber(row, col, num) {
        this.numbers[row][col] = num;
        this.numbersCand[row][col] = [num];
    }
    /** Get the value at position (if determined) */
    getValue(row, col) {
        return this.numbersCand[row][col].length === 1 ? this.numbersCand[row][col][0] : null;
    }
    /** Get candidates at position */
    getCandidates(row, col) {
        return [...this.numbersCand[row][col]];
    }
    /** Get number of candidates at position */
    getCandidateCount(row, col) {
        return this.numbersCand[row][col].length;
    }
    /** Line solving: eliminate determined values and ensure symmetric property */
    lineSolve() {
        // Eliminate determined values from the same row
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (this.numbersCand[y][x].length === 1) {
                    const value = this.numbersCand[y][x][0];
                    // Remove this value from other cells in the same row
                    for (let targetX = 0; targetX < this.size; targetX++) {
                        if (x !== targetX) {
                            const index = this.numbersCand[y][targetX].indexOf(value);
                            if (index !== -1) {
                                this.numbersCand[y][targetX].splice(index, 1);
                                if (this.numbersCand[y][targetX].length === 0) {
                                    return false;
                                }
                            }
                        }
                    }
                }
            }
        }
        // Hidden single: if a number can only go in one place in a row
        for (let number = 1; number < this.size; number++) {
            for (let y = 0; y < this.size; y++) {
                let xCand = -1;
                for (let x = 0; x < this.size; x++) {
                    if (this.numbersCand[y][x].includes(number)) {
                        if (xCand === -1) {
                            xCand = x;
                        }
                        else {
                            xCand = -2;
                            break;
                        }
                    }
                }
                if (xCand === -1) {
                    return false;
                }
                if (xCand >= 0) {
                    this.numbersCand[y][xCand] = [number];
                }
            }
        }
        // Enforce symmetry: numbersCand[y][x] and numbersCand[x][y] must be compatible
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                const candidates = [...this.numbersCand[y][x]];
                const changed = this.numbersCand[y][x].filter(candidate => this.numbersCand[x][y].includes(candidate));
                if (changed.length !== candidates.length) {
                    this.numbersCand[y][x] = changed;
                    if (this.numbersCand[y][x].length === 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new LeagueField(this.size);
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                cloned.numbersCand[y][x] = [...this.numbersCand[y][x]];
                cloned.numbers[y][x] = this.numbers[y][x];
            }
        }
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                dump += this.numbersCand[y][x].length.toString();
            }
        }
        return dump;
    }
    isSolved() {
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (this.numbersCand[y][x].length !== 1) {
                    return false;
                }
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        // Check for contradictions
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (this.numbersCand[y][x].length === 0) {
                    return false;
                }
            }
        }
        let changed = true;
        while (changed) {
            const befStr = this.getStateDump();
            if (!this.lineSolve()) {
                return false;
            }
            changed = this.getStateDump() !== befStr;
        }
        return true;
    }
    toString() {
        const HALF_NUMS = '0 1 2 3 4 5 6 7 8 9';
        const FULL_NUMS = '０１２３４５６７８９';
        const lines = [];
        for (let y = 0; y < this.size; y++) {
            let line = '';
            for (let x = 0; x < this.size; x++) {
                if (this.numbersCand[y][x].length === 0) {
                    line += '×';
                }
                else if (this.numbersCand[y][x].length === 1) {
                    const numStr = String(this.numbersCand[y][x][0]);
                    const index = HALF_NUMS.indexOf(numStr);
                    if (index >= 0) {
                        line += FULL_NUMS.substring(index / 2, index / 2 + 1);
                    }
                    else {
                        line += numStr;
                    }
                }
                else {
                    line += '　';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get cells with fewest candidates (for branching) */
    getMinCandidateCells() {
        let minSize = Infinity;
        const cells = [];
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (this.numbersCand[y][x].length === 1)
                    continue;
                const size = this.numbersCand[y][x].length;
                if (size < minSize) {
                    minSize = size;
                    cells.length = 0;
                    cells.push({ row: y, col: x });
                }
                else if (size === minSize) {
                    cells.push({ row: y, col: x });
                }
            }
        }
        return cells;
    }
}
// ============================================
// League Solver
// ============================================
export class LeagueSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzprv3 URL parameter */
    static fromString(height, _width, param) {
        const size = height; // League is always square
        const field = new LeagueField(size);
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        for (let i = 0; i < param.length; i++) {
            const ch = param[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index = index + interval + 1;
            }
            else {
                let num;
                if (ch === '.') {
                    // Empty cell, skip
                    index++;
                    continue;
                }
                else if (ch === '-') {
                    num = parseInt(param[i + 1] + param[i + 2], 16);
                    i += 2;
                }
                else if (ch === '+') {
                    num = parseInt(param[i + 1] + param[i + 2] + param[i + 3], 16);
                    i += 3;
                }
                else {
                    num = parseInt(ch, 16);
                }
                const row = Math.floor(index / size);
                const col = index % size;
                field.setNumber(row, col, num);
                index++;
            }
        }
        return new LeagueSolver(field);
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
//# sourceMappingURL=league.js.map