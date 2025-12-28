/**
 * Easy as ABC Solver
 *
 * Rules:
 * 1. Fill the grid with letters A to N (where N is specified) and empty cells
 * 2. Each letter appears exactly once in each row and column
 * 3. Clues on the edge indicate the first letter seen from that direction
 */
import { BaseSolver } from '../core/solver.js';
// ============================================
// EasyasABC Field State
// ============================================
export class EasyasABCField {
    height;
    width;
    /** Number of different letters (e.g., 3 means A, B, C) */
    kind;
    /** Row candidates: lineCands[row] = list of possible row patterns */
    lineCands;
    /** Column candidates: columnCands[col] = list of possible column patterns */
    columnCands;
    /** Hints from top edge */
    upHints;
    /** Hints from bottom edge */
    downHints;
    /** Hints from left edge */
    leftHints;
    /** Hints from right edge */
    rightHints;
    constructor(height, width, kind) {
        this.height = height;
        this.width = width;
        this.kind = kind;
        this.lineCands = [];
        this.columnCands = [];
        this.upHints = new Array(width).fill(null);
        this.downHints = new Array(width).fill(null);
        this.leftHints = new Array(height).fill(null);
        this.rightHints = new Array(height).fill(null);
    }
    /** Set hints and initialize candidates */
    setHints(upHints, downHints, leftHints, rightHints) {
        this.upHints = upHints;
        this.downHints = downHints;
        this.leftHints = leftHints;
        this.rightHints = rightHints;
        this.makeCandidates();
    }
    /** Generate all valid candidates for rows and columns */
    makeCandidates() {
        // Generate row candidates
        for (let y = 0; y < this.height; y++) {
            const oneCands = [];
            this.makeCombo(oneCands, [], this.width, this.leftHints[y], this.rightHints[y]);
            this.lineCands[y] = oneCands;
        }
        // Generate column candidates
        for (let x = 0; x < this.width; x++) {
            const oneCands = [];
            this.makeCombo(oneCands, [], this.height, this.upHints[x], this.downHints[x]);
            this.columnCands[x] = oneCands;
        }
    }
    /** Generate all permutations that match hints */
    makeCombo(result, wk, size, posiHint, negaHint) {
        for (let i = 1; i <= size; i++) {
            if (!wk.includes(i)) {
                wk.push(i);
                if (wk.length === size) {
                    // Convert numbers > kind to 0 (empty)
                    const tmp = wk.map((num) => (num > this.kind ? 0 : num));
                    // Check if this candidate is valid
                    let isOk = !this.containsCand(result, tmp);
                    // Check positive hint (first non-empty from start)
                    if (isOk && posiHint !== null) {
                        for (const oneNum of tmp) {
                            if (oneNum !== 0) {
                                if (posiHint !== oneNum) {
                                    isOk = false;
                                }
                                break;
                            }
                        }
                    }
                    // Check negative hint (first non-empty from end)
                    if (isOk && negaHint !== null) {
                        const wkRev = [...tmp].reverse();
                        for (const oneNum of wkRev) {
                            if (oneNum !== 0) {
                                if (negaHint !== oneNum) {
                                    isOk = false;
                                }
                                break;
                            }
                        }
                    }
                    if (isOk) {
                        result.push([...tmp]);
                    }
                }
                else {
                    this.makeCombo(result, wk, size, posiHint, negaHint);
                }
                wk.pop();
            }
        }
    }
    /** Check if result already contains this candidate */
    containsCand(result, cand) {
        for (const existing of result) {
            if (existing.length === cand.length && existing.every((v, i) => v === cand[i])) {
                return true;
            }
        }
        return false;
    }
    /** Remove candidates that conflict with determined rows/columns */
    hintSolve() {
        // When a row is determined, filter column candidates
        for (let y = 0; y < this.height; y++) {
            if (this.lineCands[y].length === 1) {
                const fixCand = this.lineCands[y][0];
                for (let targetX = 0; targetX < this.width; targetX++) {
                    this.columnCands[targetX] = this.columnCands[targetX].filter((targetCand) => fixCand[targetX] === targetCand[y]);
                    if (this.columnCands[targetX].length === 0) {
                        return false;
                    }
                }
            }
        }
        // When a column is determined, filter row candidates
        for (let x = 0; x < this.width; x++) {
            if (this.columnCands[x].length === 1) {
                const fixCand = this.columnCands[x][0];
                for (let targetY = 0; targetY < this.height; targetY++) {
                    this.lineCands[targetY] = this.lineCands[targetY].filter((targetCand) => fixCand[targetY] === targetCand[x]);
                    if (this.lineCands[targetY].length === 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new EasyasABCField(this.height, this.width, this.kind);
        cloned.lineCands = this.lineCands.map((cands) => cands.map((c) => [...c]));
        cloned.columnCands = this.columnCands.map((cands) => cands.map((c) => [...c]));
        cloned.upHints = [...this.upHints];
        cloned.downHints = [...this.downHints];
        cloned.leftHints = [...this.leftHints];
        cloned.rightHints = [...this.rightHints];
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let y = 0; y < this.height; y++) {
            dump += this.lineCands[y].length + ':';
        }
        for (let x = 0; x < this.width; x++) {
            dump += this.columnCands[x].length + ':';
        }
        return dump;
    }
    isSolved() {
        // All rows and columns must have exactly one candidate
        for (let y = 0; y < this.height; y++) {
            if (this.lineCands[y].length !== 1)
                return false;
        }
        for (let x = 0; x < this.width; x++) {
            if (this.columnCands[x].length !== 1)
                return false;
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const befStr = this.getStateDump();
            if (!this.hintSolve())
                return false;
            changed = this.getStateDump() !== befStr;
        }
        return true;
    }
    toString() {
        const LETTERS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lines = [];
        // Top hints
        let topLine = '  ';
        for (let x = 0; x < this.width; x++) {
            topLine += this.upHints[x] !== null ? LETTERS[this.upHints[x]] : ' ';
        }
        lines.push(topLine);
        // Grid with left/right hints
        for (let y = 0; y < this.height; y++) {
            let line = this.leftHints[y] !== null ? LETTERS[this.leftHints[y]] : ' ';
            line += '|';
            for (let x = 0; x < this.width; x++) {
                const val = this.getCellValue(y, x);
                if (val === null) {
                    line += '?';
                }
                else if (val === 0) {
                    line += '.';
                }
                else {
                    line += LETTERS[val];
                }
            }
            line += '|';
            line += this.rightHints[y] !== null ? LETTERS[this.rightHints[y]] : ' ';
            lines.push(line);
        }
        // Bottom hints
        let bottomLine = '  ';
        for (let x = 0; x < this.width; x++) {
            bottomLine += this.downHints[x] !== null ? LETTERS[this.downHints[x]] : ' ';
        }
        lines.push(bottomLine);
        return lines.join('\n');
    }
    /** Get cell value if determined, null otherwise */
    getCellValue(row, col) {
        // Check if column is determined
        if (this.columnCands[col].length === 1) {
            return this.columnCands[col][0][row];
        }
        // Check if row is determined
        if (this.lineCands[row].length === 1) {
            return this.lineCands[row][0][col];
        }
        // Check if all candidates agree on this cell
        let candNum = -1;
        for (const cc of this.columnCands[col]) {
            if (cc[row] !== candNum) {
                if (candNum === -1) {
                    candNum = cc[row];
                }
                else {
                    return null;
                }
            }
        }
        return candNum === -1 ? null : candNum;
    }
    /** Get branching info for solver */
    getBranchInfo() {
        // Find row/column with fewest candidates > 1
        let minCount = Infinity;
        let bestType = 'row';
        let bestIndex = -1;
        for (let y = 0; y < this.height; y++) {
            const count = this.lineCands[y].length;
            if (count > 1 && count < minCount) {
                minCount = count;
                bestType = 'row';
                bestIndex = y;
            }
        }
        for (let x = 0; x < this.width; x++) {
            const count = this.columnCands[x].length;
            if (count > 1 && count < minCount) {
                minCount = count;
                bestType = 'col';
                bestIndex = x;
            }
        }
        if (bestIndex === -1)
            return null;
        const candidates = bestType === 'row' ? this.lineCands[bestIndex] : this.columnCands[bestIndex];
        return { type: bestType, index: bestIndex, candidates };
    }
    /** Set a specific candidate for a row/column */
    setCandidate(type, index, candidate) {
        if (type === 'row') {
            this.lineCands[index] = [candidate];
        }
        else {
            this.columnCands[index] = [candidate];
        }
    }
}
// ============================================
// EasyasABC Solver
// ============================================
export class EasyasABCSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzprv3 URL parameter */
    static fromString(height, width, kind, param) {
        const field = new EasyasABCField(height, width, kind);
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        const upHints = new Array(width).fill(null);
        const downHints = new Array(width).fill(null);
        const leftHints = new Array(height).fill(null);
        const rightHints = new Array(height).fill(null);
        let index = 0;
        for (let i = 0; i < param.length; i++) {
            const ch = param[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index = index + interval + 1;
            }
            else {
                if (ch !== '.') {
                    let capacity;
                    if (ch === '-') {
                        capacity = parseInt(param[i + 1] + param[i + 2], 16);
                        i += 2;
                    }
                    else if (ch === '+') {
                        capacity = parseInt(param[i + 1] + param[i + 2] + param[i + 3], 16);
                        i += 3;
                    }
                    else {
                        capacity = parseInt(ch, 16);
                    }
                    if (index < width) {
                        upHints[index] = capacity;
                    }
                    else if (index < width * 2) {
                        downHints[index - width] = capacity;
                    }
                    else if (index < width * 2 + height) {
                        leftHints[index - width * 2] = capacity;
                    }
                    else {
                        rightHints[index - (width * 2 + height)] = capacity;
                    }
                }
                index++;
            }
        }
        field.setHints(upHints, downHints, leftHints, rightHints);
        return new EasyasABCSolver(field);
    }
    getBranchCandidates(state) {
        const branchInfo = state.getBranchInfo();
        if (!branchInfo)
            return [];
        const { type, index, candidates } = branchInfo;
        return candidates.map((cand) => ({
            apply: (s) => {
                const cloned = s.clone();
                cloned.setCandidate(type, index, cand);
                return cloned;
            },
            description: `Set ${type} ${index} to [${cand.join(',')}]`,
        }));
    }
}
//# sourceMappingURL=easyasabc.js.map