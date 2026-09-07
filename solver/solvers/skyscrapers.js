/**
 * Skyscrapers Solver
 *
 * Rules:
 * 1. Fill cells with numbers 1 to N (grid size)
 * 2. Each row and column contains each number exactly once (Latin square)
 * 3. Numbers represent building heights
 * 4. Clues outside the grid indicate how many buildings are visible from that edge
 * 5. A building is visible if all buildings between it and the viewer are shorter
 */
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Skyscrapers Field State
// ============================================
export class SkyscrapersField {
    size;
    height;
    width;
    /** Number candidates for each cell */
    candidates;
    /** Top clues (visibility from top) */
    topClues;
    /** Bottom clues (visibility from bottom) */
    bottomClues;
    /** Left clues (visibility from left) */
    leftClues;
    /** Right clues (visibility from right) */
    rightClues;
    constructor(size) {
        this.size = size;
        this.height = size;
        this.width = size;
        this.candidates = new Grid(size, size, () => {
            const cands = [];
            for (let n = 1; n <= size; n++) {
                cands.push(n);
            }
            return cands;
        });
        this.topClues = new Array(size).fill(null);
        this.bottomClues = new Array(size).fill(null);
        this.leftClues = new Array(size).fill(null);
        this.rightClues = new Array(size).fill(null);
    }
    /** Set clues */
    setTopClue(col, count) {
        this.topClues[col] = count;
    }
    setBottomClue(col, count) {
        this.bottomClues[col] = count;
    }
    setLeftClue(row, count) {
        this.leftClues[row] = count;
    }
    setRightClue(row, count) {
        this.rightClues[row] = count;
    }
    /** Set a cell value */
    setCell(row, col, value) {
        this.candidates.set(row, col, [value]);
    }
    /** Get cell candidates */
    getCandidates(row, col) {
        return this.candidates.get(row, col);
    }
    /** Latin square constraint */
    latinSolve() {
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                const cands = this.candidates.get(y, x);
                if (cands.length === 1) {
                    const val = cands[0];
                    // Eliminate from same row
                    for (let x2 = 0; x2 < this.size; x2++) {
                        if (x2 === x)
                            continue;
                        const otherCands = this.candidates.get(y, x2);
                        const filtered = otherCands.filter((c) => c !== val);
                        if (filtered.length === 0)
                            return false;
                        this.candidates.set(y, x2, filtered);
                    }
                    // Eliminate from same column
                    for (let y2 = 0; y2 < this.size; y2++) {
                        if (y2 === y)
                            continue;
                        const otherCands = this.candidates.get(y2, x);
                        const filtered = otherCands.filter((c) => c !== val);
                        if (filtered.length === 0)
                            return false;
                        this.candidates.set(y2, x, filtered);
                    }
                }
                // Hidden single in row
                if (cands.length > 1) {
                    for (const cand of cands) {
                        let isHiddenSingle = true;
                        for (let x2 = 0; x2 < this.size; x2++) {
                            if (x2 === x)
                                continue;
                            if (this.candidates.get(y, x2).includes(cand)) {
                                isHiddenSingle = false;
                                break;
                            }
                        }
                        if (isHiddenSingle) {
                            this.candidates.set(y, x, [cand]);
                            break;
                        }
                    }
                }
                // Hidden single in column
                const updatedCands = this.candidates.get(y, x);
                if (updatedCands.length > 1) {
                    for (const cand of updatedCands) {
                        let isHiddenSingle = true;
                        for (let y2 = 0; y2 < this.size; y2++) {
                            if (y2 === y)
                                continue;
                            if (this.candidates.get(y2, x).includes(cand)) {
                                isHiddenSingle = false;
                                break;
                            }
                        }
                        if (isHiddenSingle) {
                            this.candidates.set(y, x, [cand]);
                            break;
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Count visible buildings in a line of heights */
    countVisible(heights) {
        let visible = 0;
        let maxHeight = 0;
        for (const h of heights) {
            if (h > maxHeight) {
                visible++;
                maxHeight = h;
            }
        }
        return visible;
    }
    /** Check if a sequence of candidates can satisfy visibility constraint */
    canSatisfyVisibility(candidatesList, targetVisibility) {
        // Generate all possible combinations and check if any satisfies the constraint
        const n = candidatesList.length;
        const usedInCombination = new Set();
        const canSatisfy = (index, currentHeights) => {
            if (index === n) {
                return this.countVisible(currentHeights) === targetVisibility;
            }
            for (const cand of candidatesList[index]) {
                if (usedInCombination.has(cand))
                    continue;
                usedInCombination.add(cand);
                currentHeights.push(cand);
                if (canSatisfy(index + 1, currentHeights)) {
                    usedInCombination.delete(cand);
                    currentHeights.pop();
                    return true;
                }
                usedInCombination.delete(cand);
                currentHeights.pop();
            }
            return false;
        };
        return canSatisfy(0, []);
    }
    /** Visibility constraint solving */
    visibilitySolve() {
        // Top clues (looking down)
        for (let x = 0; x < this.size; x++) {
            const clue = this.topClues[x];
            if (clue === null)
                continue;
            const candidatesList = [];
            for (let y = 0; y < this.size; y++) {
                candidatesList.push(this.candidates.get(y, x));
            }
            // If clue is 1, first cell must be N (tallest)
            if (clue === 1) {
                const firstCands = candidatesList[0];
                if (!firstCands.includes(this.size))
                    return false;
                this.candidates.set(0, x, [this.size]);
            }
            // If clue is N, cells must be 1,2,3,...,N in order
            if (clue === this.size) {
                for (let y = 0; y < this.size; y++) {
                    const cands = this.candidates.get(y, x);
                    if (!cands.includes(y + 1))
                        return false;
                    this.candidates.set(y, x, [y + 1]);
                }
            }
            // General check: verify constraint can still be satisfied
            if (!this.canSatisfyVisibility(candidatesList, clue)) {
                return false;
            }
        }
        // Bottom clues (looking up)
        for (let x = 0; x < this.size; x++) {
            const clue = this.bottomClues[x];
            if (clue === null)
                continue;
            const candidatesList = [];
            for (let y = this.size - 1; y >= 0; y--) {
                candidatesList.push(this.candidates.get(y, x));
            }
            if (clue === 1) {
                const firstCands = candidatesList[0];
                if (!firstCands.includes(this.size))
                    return false;
                this.candidates.set(this.size - 1, x, [this.size]);
            }
            if (clue === this.size) {
                for (let i = 0; i < this.size; i++) {
                    const y = this.size - 1 - i;
                    const cands = this.candidates.get(y, x);
                    if (!cands.includes(i + 1))
                        return false;
                    this.candidates.set(y, x, [i + 1]);
                }
            }
            if (!this.canSatisfyVisibility(candidatesList, clue)) {
                return false;
            }
        }
        // Left clues (looking right)
        for (let y = 0; y < this.size; y++) {
            const clue = this.leftClues[y];
            if (clue === null)
                continue;
            const candidatesList = [];
            for (let x = 0; x < this.size; x++) {
                candidatesList.push(this.candidates.get(y, x));
            }
            if (clue === 1) {
                const firstCands = candidatesList[0];
                if (!firstCands.includes(this.size))
                    return false;
                this.candidates.set(y, 0, [this.size]);
            }
            if (clue === this.size) {
                for (let x = 0; x < this.size; x++) {
                    const cands = this.candidates.get(y, x);
                    if (!cands.includes(x + 1))
                        return false;
                    this.candidates.set(y, x, [x + 1]);
                }
            }
            if (!this.canSatisfyVisibility(candidatesList, clue)) {
                return false;
            }
        }
        // Right clues (looking left)
        for (let y = 0; y < this.size; y++) {
            const clue = this.rightClues[y];
            if (clue === null)
                continue;
            const candidatesList = [];
            for (let x = this.size - 1; x >= 0; x--) {
                candidatesList.push(this.candidates.get(y, x));
            }
            if (clue === 1) {
                const firstCands = candidatesList[0];
                if (!firstCands.includes(this.size))
                    return false;
                this.candidates.set(y, this.size - 1, [this.size]);
            }
            if (clue === this.size) {
                for (let i = 0; i < this.size; i++) {
                    const x = this.size - 1 - i;
                    const cands = this.candidates.get(y, x);
                    if (!cands.includes(i + 1))
                        return false;
                    this.candidates.set(y, x, [i + 1]);
                }
            }
            if (!this.canSatisfyVisibility(candidatesList, clue)) {
                return false;
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new SkyscrapersField(this.size);
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                cloned.candidates.set(y, x, [...this.candidates.get(y, x)]);
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
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                dump += this.candidates.get(y, x).length + ':';
            }
        }
        return dump;
    }
    isSolved() {
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (this.candidates.get(y, x).length !== 1)
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
            if (!this.visibilitySolve())
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
                const cands = this.candidates.get(y, x);
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
// Skyscrapers Solver
// ============================================
export class SkyscrapersSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzprv3 URL parameter */
    static fromString(size, param) {
        const field = new SkyscrapersField(size);
        const parts = param.split('/');
        const parseEdge = (part, setter) => {
            const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
            let index = 0;
            for (let i = 0; i < part.length && index < size; i++) {
                const ch = part[i];
                const interval = ALPHABET_FROM_G.indexOf(ch);
                if (interval !== -1) {
                    index += interval + 1;
                }
                else if (ch === '.') {
                    index++;
                }
                else {
                    const num = parseInt(ch, 16);
                    if (!isNaN(num) && num >= 1) {
                        setter(index, num);
                    }
                    index++;
                }
            }
        };
        if (parts[0])
            parseEdge(parts[0], (i, n) => field.setTopClue(i, n));
        if (parts[1])
            parseEdge(parts[1], (i, n) => field.setBottomClue(i, n));
        if (parts[2])
            parseEdge(parts[2], (i, n) => field.setLeftClue(i, n));
        if (parts[3])
            parseEdge(parts[3], (i, n) => field.setRightClue(i, n));
        return new SkyscrapersSolver(field);
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
//# sourceMappingURL=skyscrapers.js.map