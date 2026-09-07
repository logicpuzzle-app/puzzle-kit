/**
 * News Solver
 *
 * Rules:
 * 1. Place N, E, W, S (or arrows pointing those directions) in each cell
 * 2. Each row and column contains each direction exactly once
 * 3. Clues outside the grid indicate which direction is seen first from that edge
 * 4. The direction must "point toward" the viewer to be seen
 */
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// News Field State
// ============================================
export class NewsField {
    size;
    height;
    width;
    /** Direction candidates for each cell */
    candidates;
    /** Top clues (first direction seen from top) */
    topClues;
    /** Bottom clues (first direction seen from bottom) */
    bottomClues;
    /** Left clues (first direction seen from left) */
    leftClues;
    /** Right clues (first direction seen from right) */
    rightClues;
    constructor(size) {
        this.size = size;
        this.height = size;
        this.width = size;
        this.candidates = new Grid(size, size, () => ['N', 'E', 'W', 'S']);
        this.topClues = new Array(size).fill(null);
        this.bottomClues = new Array(size).fill(null);
        this.leftClues = new Array(size).fill(null);
        this.rightClues = new Array(size).fill(null);
    }
    /** Set clues */
    setTopClue(col, dir) {
        this.topClues[col] = dir;
    }
    setBottomClue(col, dir) {
        this.bottomClues[col] = dir;
    }
    setLeftClue(row, dir) {
        this.leftClues[row] = dir;
    }
    setRightClue(row, dir) {
        this.rightClues[row] = dir;
    }
    /** Set a cell value */
    setCell(row, col, dir) {
        this.candidates.set(row, col, [dir]);
    }
    /** Latin square constraint for directions */
    latinSolve() {
        const allDirs = ['N', 'E', 'W', 'S'];
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
                    for (const dir of allDirs) {
                        if (!cands.includes(dir))
                            continue;
                        let isHiddenSingle = true;
                        for (let x2 = 0; x2 < this.size; x2++) {
                            if (x2 === x)
                                continue;
                            if (this.candidates.get(y, x2).includes(dir)) {
                                isHiddenSingle = false;
                                break;
                            }
                        }
                        if (isHiddenSingle) {
                            this.candidates.set(y, x, [dir]);
                            break;
                        }
                    }
                }
                // Hidden single in column
                const updatedCands = this.candidates.get(y, x);
                if (updatedCands.length > 1) {
                    for (const dir of allDirs) {
                        if (!updatedCands.includes(dir))
                            continue;
                        let isHiddenSingle = true;
                        for (let y2 = 0; y2 < this.size; y2++) {
                            if (y2 === y)
                                continue;
                            if (this.candidates.get(y2, x).includes(dir)) {
                                isHiddenSingle = false;
                                break;
                            }
                        }
                        if (isHiddenSingle) {
                            this.candidates.set(y, x, [dir]);
                            break;
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Clue constraint: first visible direction from edge */
    clueSolve() {
        // Top clues - looking down, S is visible (pointing toward viewer)
        for (let x = 0; x < this.size; x++) {
            const clue = this.topClues[x];
            if (clue === null)
                continue;
            // The clue indicates which direction is seen first
            // From top, we see 'S' (south-pointing arrows face us)
            // So the clue must be 'S' for the first cell that has 'S'
            // Find first cell that must have the clue direction
            let firstPossible = -1;
            for (let y = 0; y < this.size; y++) {
                if (this.candidates.get(y, x).includes(clue)) {
                    if (firstPossible === -1)
                        firstPossible = y;
                }
            }
            if (firstPossible === -1)
                return false;
            // Cells before firstPossible cannot have the clue direction
            // if all cells before are determined and none has the clue
            let allDeterminedBefore = true;
            for (let y = 0; y < firstPossible; y++) {
                const cands = this.candidates.get(y, x);
                if (cands.length > 1) {
                    allDeterminedBefore = false;
                    break;
                }
            }
            if (allDeterminedBefore && firstPossible < this.size) {
                // The first cell that can have the clue must have it
                const cands = this.candidates.get(firstPossible, x);
                if (cands.length > 1) {
                    let mustBe = true;
                    for (let y = firstPossible + 1; y < this.size; y++) {
                        if (this.candidates.get(y, x).includes(clue)) {
                            mustBe = false;
                            break;
                        }
                    }
                    if (mustBe) {
                        this.candidates.set(firstPossible, x, [clue]);
                    }
                }
            }
        }
        // Bottom clues - looking up, N is visible
        for (let x = 0; x < this.size; x++) {
            const clue = this.bottomClues[x];
            if (clue === null)
                continue;
            let firstPossible = -1;
            for (let y = this.size - 1; y >= 0; y--) {
                if (this.candidates.get(y, x).includes(clue)) {
                    if (firstPossible === -1)
                        firstPossible = y;
                }
            }
            if (firstPossible === -1)
                return false;
        }
        // Left clues - looking right, E is visible
        for (let y = 0; y < this.size; y++) {
            const clue = this.leftClues[y];
            if (clue === null)
                continue;
            let firstPossible = -1;
            for (let x = 0; x < this.size; x++) {
                if (this.candidates.get(y, x).includes(clue)) {
                    if (firstPossible === -1)
                        firstPossible = x;
                }
            }
            if (firstPossible === -1)
                return false;
            let allDeterminedBefore = true;
            for (let x = 0; x < firstPossible; x++) {
                if (this.candidates.get(y, x).length > 1) {
                    allDeterminedBefore = false;
                    break;
                }
            }
            if (allDeterminedBefore && firstPossible < this.size) {
                const cands = this.candidates.get(y, firstPossible);
                if (cands.length > 1) {
                    let mustBe = true;
                    for (let x = firstPossible + 1; x < this.size; x++) {
                        if (this.candidates.get(y, x).includes(clue)) {
                            mustBe = false;
                            break;
                        }
                    }
                    if (mustBe) {
                        this.candidates.set(y, firstPossible, [clue]);
                    }
                }
            }
        }
        // Right clues - looking left, W is visible
        for (let y = 0; y < this.size; y++) {
            const clue = this.rightClues[y];
            if (clue === null)
                continue;
            let firstPossible = -1;
            for (let x = this.size - 1; x >= 0; x--) {
                if (this.candidates.get(y, x).includes(clue)) {
                    if (firstPossible === -1)
                        firstPossible = x;
                }
            }
            if (firstPossible === -1)
                return false;
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new NewsField(this.size);
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
            if (!this.clueSolve())
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
                    line += cands[0];
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
// News Solver
// ============================================
export class NewsSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzprv3 URL parameter */
    static fromString(size, param) {
        const field = new NewsField(size);
        // Parse clues - format varies
        const dirMap = {
            '1': 'N',
            '2': 'E',
            '3': 'W',
            '4': 'S',
        };
        const parts = param.split('/');
        // Parse each edge's clues
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
                else if (dirMap[ch]) {
                    setter(index, dirMap[ch]);
                    index++;
                }
                else {
                    index++;
                }
            }
        };
        if (parts[0])
            parseEdge(parts[0], (i, d) => field.setTopClue(i, d));
        if (parts[1])
            parseEdge(parts[1], (i, d) => field.setBottomClue(i, d));
        if (parts[2])
            parseEdge(parts[2], (i, d) => field.setLeftClue(i, d));
        if (parts[3])
            parseEdge(parts[3], (i, d) => field.setRightClue(i, d));
        return new NewsSolver(field);
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
//# sourceMappingURL=news.js.map