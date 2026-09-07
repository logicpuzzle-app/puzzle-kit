/**
 * Building (Skyscrapers) Solver
 *
 * Rules:
 * 1. Fill each row and column with numbers 1 to N (Latin square)
 * 2. Numbers represent building heights (1 = shortest, N = tallest)
 * 3. Hints on edges show how many buildings are visible from that direction
 * 4. Taller buildings block shorter ones behind them
 *
 * Algorithm:
 * - Pre-generates all valid permutations for each row/column based on visibility hints
 * - Uses constraint propagation to eliminate invalid candidates
 * - When a row/column is determined, filters incompatible column/row candidates
 * - Branches on row/column with fewest candidates when propagation stalls
 *
 * Visibility Counting:
 * From a given direction, count how many buildings are visible. A building is visible
 * if no taller building appears before it. For example:
 * - [1, 2, 3, 4] from left: 4 visible (all ascending)
 * - [4, 3, 2, 1] from left: 1 visible (4 blocks all others)
 * - [2, 1, 4, 3] from left: 2 visible (2 visible, then 4)
 *
 * Example 4x4 puzzle:
 *     2   1 3
 *   +---------+
 * 2 | 3 4 1 2 | 2
 * 1 | 4 3 2 1 | 3
 * 3 | 1 2 4 3 | 1
 * 2 | 2 1 3 4 | ?
 *   +---------+
 *     2 2   1
 */
import { BaseSolver } from '../core/solver.js';
// ============================================
// Building Field State
// ============================================
export class BuildingField {
    height;
    width;
    /** Row candidates: lineCands[row] = list of possible row patterns */
    lineCands;
    /** Column candidates: columnCands[col] = list of possible column patterns */
    columnCands;
    /** Hints from top edge (visible buildings from above) */
    upHints;
    /** Hints from bottom edge (visible buildings from below) */
    downHints;
    /** Hints from left edge (visible buildings from left) */
    leftHints;
    /** Hints from right edge (visible buildings from right) */
    rightHints;
    constructor(height, width) {
        this.height = height;
        this.width = width;
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
    /**
     * Count visible buildings from one direction
     * Taller buildings block shorter ones behind them
     */
    countVisible(line) {
        let max = 0;
        let count = 0;
        for (const height of line) {
            if (height > max) {
                max = height;
                count++;
            }
        }
        return count;
    }
    /** Generate all permutations that match visibility hints */
    makeCombo(result, wk, size, posiHint, negaHint) {
        for (let i = 1; i <= size; i++) {
            if (!wk.includes(i)) {
                wk.push(i);
                if (wk.length === size) {
                    const tmp = [...wk];
                    // Check if this candidate is valid
                    let isOk = !this.containsCand(result, tmp);
                    // Check positive hint (visible from start)
                    if (isOk && posiHint !== null) {
                        if (this.countVisible(tmp) !== posiHint) {
                            isOk = false;
                        }
                    }
                    // Check negative hint (visible from end)
                    if (isOk && negaHint !== null) {
                        const reversed = [...tmp].reverse();
                        if (this.countVisible(reversed) !== negaHint) {
                            isOk = false;
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
        const cloned = new BuildingField(this.height, this.width);
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
        const lines = [];
        // Top hints
        let topLine = '  ';
        for (let x = 0; x < this.width; x++) {
            const hint = this.upHints[x];
            topLine += hint !== null ? hint.toString() : ' ';
            topLine += ' ';
        }
        lines.push(topLine);
        // Grid with left/right hints
        for (let y = 0; y < this.height; y++) {
            let line = '';
            const leftHint = this.leftHints[y];
            line += leftHint !== null ? leftHint.toString() : ' ';
            line += '|';
            for (let x = 0; x < this.width; x++) {
                const val = this.getCellValue(y, x);
                if (val === null) {
                    line += '?';
                }
                else {
                    line += val.toString();
                }
                line += ' ';
            }
            line += '|';
            const rightHint = this.rightHints[y];
            line += rightHint !== null ? rightHint.toString() : ' ';
            lines.push(line);
        }
        // Bottom hints
        let bottomLine = '  ';
        for (let x = 0; x < this.width; x++) {
            const hint = this.downHints[x];
            bottomLine += hint !== null ? hint.toString() : ' ';
            bottomLine += ' ';
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
    /** Get row candidates count for debugging */
    getRowCandidatesCount(row) {
        return this.lineCands[row]?.length ?? 0;
    }
    /** Get column candidates count for debugging */
    getColumnCandidatesCount(col) {
        return this.columnCands[col]?.length ?? 0;
    }
}
// ============================================
// Building Solver
// ============================================
export class BuildingSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from hints arrays */
    static fromHints(size, upHints, downHints, leftHints, rightHints) {
        const field = new BuildingField(size, size);
        field.setHints(upHints, downHints, leftHints, rightHints);
        return new BuildingSolver(field);
    }
    /** Create solver from puzzle string array (pzprv3-style encoding) */
    static fromString(size, param) {
        const field = new BuildingField(size, size);
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        const upHints = new Array(size).fill(null);
        const downHints = new Array(size).fill(null);
        const leftHints = new Array(size).fill(null);
        const rightHints = new Array(size).fill(null);
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
                    if (index < size) {
                        upHints[index] = capacity;
                    }
                    else if (index < size * 2) {
                        downHints[index - size] = capacity;
                    }
                    else if (index < size * 3) {
                        leftHints[index - size * 2] = capacity;
                    }
                    else {
                        rightHints[index - size * 3] = capacity;
                    }
                }
                index++;
            }
        }
        field.setHints(upHints, downHints, leftHints, rightHints);
        return new BuildingSolver(field);
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
//# sourceMappingURL=building.js.map