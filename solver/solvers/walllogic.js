/**
 * Walllogic Solver
 *
 * Rules:
 * 1. Each cell contains a number or an arrow (↑→↓←) or is empty
 * 2. Numbers indicate how many cells (including itself) are visible in straight lines
 * 3. Arrows point towards the number they belong to
 * 4. All arrows from different directions must connect to a number
 */
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Walllogic Field State
// ============================================
export class WalllogicField {
    height;
    width;
    /** Fixed numbers */
    numbers;
    /** Arrow direction candidates for each cell */
    numbersCand;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.numbers = new Grid(height, width, () => null);
        this.numbersCand = new Grid(height, width, () => [0, 1, 2, 3, 4]);
    }
    /** Set a fixed number */
    setNumber(row, col, num) {
        this.numbers.set(row, col, num);
        this.numbersCand.set(row, col, [0]);
    }
    /** Number constraint: each number must have correct count of visible cells */
    numberSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const num = this.numbers.get(y, x);
                if (num === null || num === -1)
                    continue;
                let upSpace = 0, rightSpace = 0, downSpace = 0, leftSpace = 0;
                let upWhite = 0, rightWhite = 0, downWhite = 0, leftWhite = 0;
                let upCounting = true, rightCounting = true, downCounting = true, leftCounting = true;
                // Count up
                for (let ty = y - 1; ty >= 0; ty--) {
                    if (!this.numbersCand.get(ty, x).includes(1))
                        break;
                    if (this.numbersCand.get(ty, x).length !== 1)
                        upCounting = false;
                    if (upCounting)
                        upWhite++;
                    upSpace++;
                }
                // Count right
                for (let tx = x + 1; tx < this.width; tx++) {
                    if (!this.numbersCand.get(y, tx).includes(2))
                        break;
                    if (this.numbersCand.get(y, tx).length !== 1)
                        rightCounting = false;
                    if (rightCounting)
                        rightWhite++;
                    rightSpace++;
                }
                // Count down
                for (let ty = y + 1; ty < this.height; ty++) {
                    if (!this.numbersCand.get(ty, x).includes(3))
                        break;
                    if (this.numbersCand.get(ty, x).length !== 1)
                        downCounting = false;
                    if (downCounting)
                        downWhite++;
                    downSpace++;
                }
                // Count left
                for (let tx = x - 1; tx >= 0; tx--) {
                    if (!this.numbersCand.get(y, tx).includes(4))
                        break;
                    if (this.numbersCand.get(y, tx).length !== 1)
                        leftCounting = false;
                    if (leftCounting)
                        leftWhite++;
                    leftSpace++;
                }
                const totalSpace = upSpace + downSpace + rightSpace + leftSpace;
                const totalWhite = upWhite + downWhite + rightWhite + leftWhite;
                if (totalSpace < num)
                    return false;
                if (totalWhite > num)
                    return false;
                // Force arrows in required directions
                const fixedUp = num - (rightSpace + downSpace + leftSpace);
                const fixedRight = num - (upSpace + downSpace + leftSpace);
                const fixedDown = num - (upSpace + rightSpace + leftSpace);
                const fixedLeft = num - (upSpace + rightSpace + downSpace);
                if (fixedUp > 0) {
                    for (let i = 1; i <= fixedUp; i++) {
                        const cands = this.numbersCand.get(y - i, x);
                        const filtered = cands.filter((c) => c === 1);
                        if (filtered.length === 0)
                            return false;
                        this.numbersCand.set(y - i, x, filtered);
                    }
                }
                if (fixedRight > 0) {
                    for (let i = 1; i <= fixedRight; i++) {
                        const cands = this.numbersCand.get(y, x + i);
                        const filtered = cands.filter((c) => c === 2);
                        if (filtered.length === 0)
                            return false;
                        this.numbersCand.set(y, x + i, filtered);
                    }
                }
                if (fixedDown > 0) {
                    for (let i = 1; i <= fixedDown; i++) {
                        const cands = this.numbersCand.get(y + i, x);
                        const filtered = cands.filter((c) => c === 3);
                        if (filtered.length === 0)
                            return false;
                        this.numbersCand.set(y + i, x, filtered);
                    }
                }
                if (fixedLeft > 0) {
                    for (let i = 1; i <= fixedLeft; i++) {
                        const cands = this.numbersCand.get(y, x - i);
                        const filtered = cands.filter((c) => c === 4);
                        if (filtered.length === 0)
                            return false;
                        this.numbersCand.set(y, x - i, filtered);
                    }
                }
                // Stop extending if count is reached
                if (totalWhite === num) {
                    if (y - upWhite - 1 >= 0) {
                        const cands = this.numbersCand.get(y - upWhite - 1, x);
                        const filtered = cands.filter((c) => c !== 1);
                        if (filtered.length === 0)
                            return false;
                        this.numbersCand.set(y - upWhite - 1, x, filtered);
                    }
                    if (x + rightWhite + 1 < this.width) {
                        const cands = this.numbersCand.get(y, x + rightWhite + 1);
                        const filtered = cands.filter((c) => c !== 2);
                        if (filtered.length === 0)
                            return false;
                        this.numbersCand.set(y, x + rightWhite + 1, filtered);
                    }
                    if (y + downWhite + 1 < this.height) {
                        const cands = this.numbersCand.get(y + downWhite + 1, x);
                        const filtered = cands.filter((c) => c !== 3);
                        if (filtered.length === 0)
                            return false;
                        this.numbersCand.set(y + downWhite + 1, x, filtered);
                    }
                    if (x - leftWhite - 1 >= 0) {
                        const cands = this.numbersCand.get(y, x - leftWhite - 1);
                        const filtered = cands.filter((c) => c !== 4);
                        if (filtered.length === 0)
                            return false;
                        this.numbersCand.set(y, x - leftWhite - 1, filtered);
                    }
                }
            }
        }
        return true;
    }
    /** Alone constraint: arrows must lead to numbers */
    aloneSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.numbers.get(y, x) !== null)
                    continue;
                let canUp = false, canRight = false, canDown = false, canLeft = false;
                // Check up
                for (let ty = y - 1; ty >= 0; ty--) {
                    if (this.numbers.get(ty, x) !== null) {
                        canDown = true;
                        break;
                    }
                    if (!this.numbersCand.get(ty, x).includes(3))
                        break;
                }
                // Check right
                for (let tx = x + 1; tx < this.width; tx++) {
                    if (this.numbers.get(y, tx) !== null) {
                        canLeft = true;
                        break;
                    }
                    if (!this.numbersCand.get(y, tx).includes(4))
                        break;
                }
                // Check down
                for (let ty = y + 1; ty < this.height; ty++) {
                    if (this.numbers.get(ty, x) !== null) {
                        canUp = true;
                        break;
                    }
                    if (!this.numbersCand.get(ty, x).includes(1))
                        break;
                }
                // Check left
                for (let tx = x - 1; tx >= 0; tx--) {
                    if (this.numbers.get(y, tx) !== null) {
                        canRight = true;
                        break;
                    }
                    if (!this.numbersCand.get(y, tx).includes(2))
                        break;
                }
                const cands = this.numbersCand.get(y, x);
                const filtered = cands.filter((c) => {
                    if (c === 1)
                        return canUp;
                    if (c === 2)
                        return canRight;
                    if (c === 3)
                        return canDown;
                    if (c === 4)
                        return canLeft;
                    return true;
                });
                if (filtered.length === 0)
                    return false;
                this.numbersCand.set(y, x, filtered);
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new WalllogicField(this.height, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.numbers.set(y, x, this.numbers.get(y, x));
                cloned.numbersCand.set(y, x, [...this.numbersCand.get(y, x)]);
            }
        }
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                dump += this.numbersCand.get(y, x).length;
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
        const before = this.getStateDump();
        if (!this.numberSolve())
            return false;
        if (!this.aloneSolve())
            return false;
        if (this.getStateDump() !== before) {
            return this.solveAndCheck();
        }
        return true;
    }
    toString() {
        const arrows = ['·', '↑', '→', '↓', '←'];
        const lines = [];
        for (let y = 0; y < this.height; y++) {
            let line = '';
            for (let x = 0; x < this.width; x++) {
                const num = this.numbers.get(y, x);
                if (num !== null && num !== -1) {
                    line += num.toString().padStart(2);
                }
                else {
                    const cands = this.numbersCand.get(y, x);
                    if (cands.length === 1) {
                        line += arrows[cands[0]] + ' ';
                    }
                    else {
                        line += '? ';
                    }
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
    /** Set cell to specific arrow */
    setArrow(row, col, arrow) {
        this.numbersCand.set(row, col, [arrow]);
    }
}
// ============================================
// Walllogic Solver
// ============================================
export class WalllogicSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzprv3 URL parameter */
    static fromString(height, width, param) {
        const field = new WalllogicField(height, width);
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        for (let i = 0; i < param.length; i++) {
            const ch = param[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index += interval + 1;
            }
            else {
                let num;
                if (ch === '.') {
                    // Black cell
                    const row = Math.floor(index / width);
                    const col = index % width;
                    field.setNumber(row, col, -1);
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
                const row = Math.floor(index / width);
                const col = index % width;
                if (row < height && col < width) {
                    field.setNumber(row, col, num);
                }
                index++;
            }
        }
        return new WalllogicSolver(field);
    }
    getBranchCandidates(state) {
        const branchInfo = state.getBranchInfo();
        if (!branchInfo)
            return [];
        const { row, col, candidates } = branchInfo;
        return candidates.map((cand) => ({
            apply: (s) => {
                const cloned = s.clone();
                cloned.setArrow(row, col, cand);
                return cloned;
            },
            description: `Set (${row}, ${col}) to ${cand}`,
        }));
    }
}
//# sourceMappingURL=walllogic.js.map