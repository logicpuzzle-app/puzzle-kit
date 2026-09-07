/**
 * Hebi (Hebi-Ichigo / Snake) Solver
 *
 * Rules:
 * 1. Place numbers 1-5 to form "snakes" - chains of cells connected orthogonally
 * 2. 1 is the head, 5 is the tail
 * 3. Snakes cannot touch other snakes orthogonally (diagonal OK)
 * 4. Snake's eyes look opposite from where body (2) connects to head (1)
 * 5. A snake cannot appear in front of another snake's eyes
 * 6. Black cells with arrows show the nearest number in that direction
 * 7. Black cells with 0 mean no snake in that direction until next obstacle
 */
import { Direction, posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Hebi Field State
// ============================================
export class HebiField {
    height;
    width;
    /** Cell numbers (0 = empty/unknown, 1-5 = snake part, -1 = black cell) */
    cells;
    /** Candidate numbers for each cell */
    candidates;
    /** Arrow clues */
    arrows;
    /** Black cell positions */
    blackCells;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => 0);
        this.candidates = new Grid(height, width, () => new Set([1, 2, 3, 4, 5]));
        this.arrows = [];
        this.blackCells = new Set();
    }
    /** Set black cell */
    setBlack(row, col) {
        this.cells.set(row, col, -1);
        this.candidates.set(row, col, new Set());
        this.blackCells.add(posKey({ row, col }));
    }
    /** Add arrow clue */
    addArrow(row, col, dir, num) {
        this.setBlack(row, col);
        this.arrows.push({ row, col, dir, num });
    }
    /** Get cell value */
    getCell(row, col) {
        if (row < 0 || row >= this.height || col < 0 || col >= this.width) {
            return -1; // Outside = black
        }
        return this.cells.get(row, col);
    }
    /** Set cell value */
    setCell(row, col, num) {
        this.cells.set(row, col, num);
        this.candidates.set(row, col, new Set([num]));
    }
    /** Get candidates */
    getCandidates(row, col) {
        if (row < 0 || row >= this.height || col < 0 || col >= this.width) {
            return new Set();
        }
        return this.candidates.get(row, col);
    }
    /** Remove candidate */
    removeCandidate(row, col, num) {
        this.candidates.get(row, col).delete(num);
    }
    /** Is black cell */
    isBlack(row, col) {
        return this.blackCells.has(posKey({ row, col }));
    }
    // ========== Constraint solving ==========
    /**
     * Arrow constraint: nearest number in direction must match
     */
    arrowSolve() {
        for (const arrow of this.arrows) {
            const { row, col, dir, num } = arrow;
            // Find first non-empty cell in direction
            let r = row, c = col;
            const dr = dir === Direction.UP ? -1 : dir === Direction.DOWN ? 1 : 0;
            const dc = dir === Direction.LEFT ? -1 : dir === Direction.RIGHT ? 1 : 0;
            let foundNum = -1;
            let foundPos = null;
            r += dr;
            c += dc;
            while (r >= 0 && r < this.height && c >= 0 && c < this.width) {
                if (this.isBlack(r, c))
                    break; // Hit another black cell
                const cellNum = this.cells.get(r, c);
                if (cellNum > 0) {
                    foundNum = cellNum;
                    foundPos = { row: r, col: c };
                    break;
                }
                r += dr;
                c += dc;
            }
            if (num === 0) {
                // No snake should be visible
                if (foundNum > 0)
                    return false;
                // All cells in this direction must be empty
                r = row + dr;
                c = col + dc;
                while (r >= 0 && r < this.height && c >= 0 && c < this.width && !this.isBlack(r, c)) {
                    for (let n = 1; n <= 5; n++) {
                        this.removeCandidate(r, c, n);
                    }
                    r += dr;
                    c += dc;
                }
            }
            else {
                // Specific number should be the first snake part seen
                if (foundNum > 0 && foundNum !== num)
                    return false;
                // If found, the number matches
                // If not found yet, constrain intermediate cells
                if (!foundPos) {
                    // First snake part must be 'num'
                    r = row + dr;
                    c = col + dc;
                    while (r >= 0 && r < this.height && c >= 0 && c < this.width && !this.isBlack(r, c)) {
                        const cands = this.candidates.get(r, c);
                        if (cands.size > 0 && !cands.has(num)) {
                            // This cell can't have the required number - all cells before it must be empty
                        }
                        r += dr;
                        c += dc;
                    }
                }
            }
        }
        return true;
    }
    /**
     * Snake connectivity: 1-2-3-4-5 must be connected
     */
    snakeSolve() {
        // For each number N (2-5), it must be adjacent to N-1
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const num = this.cells.get(row, col);
                if (num <= 0)
                    continue;
                if (num > 1) {
                    // Must be adjacent to num-1
                    const hasNeighbor = this.hasAdjacentNumber(row, col, num - 1);
                    if (hasNeighbor === false)
                        return false;
                }
                if (num < 5) {
                    // Must be adjacent to num+1
                    const hasNeighbor = this.hasAdjacentNumber(row, col, num + 1);
                    if (hasNeighbor === false)
                        return false;
                }
            }
        }
        return true;
    }
    hasAdjacentNumber(row, col, target) {
        const neighbors = [
            { row: row - 1, col },
            { row: row + 1, col },
            { row, col: col - 1 },
            { row, col: col + 1 },
        ];
        let hasConfirmed = false;
        let hasPossible = false;
        for (const n of neighbors) {
            if (n.row < 0 || n.row >= this.height || n.col < 0 || n.col >= this.width)
                continue;
            if (this.isBlack(n.row, n.col))
                continue;
            const cellNum = this.cells.get(n.row, n.col);
            if (cellNum === target) {
                hasConfirmed = true;
                break;
            }
            if (cellNum === 0 && this.candidates.get(n.row, n.col).has(target)) {
                hasPossible = true;
            }
        }
        if (hasConfirmed)
            return true;
        if (hasPossible)
            return null; // Unknown
        return false;
    }
    /**
     * No adjacent snakes: different snakes can't touch orthogonally
     */
    noTouchSolve() {
        // This is complex - need to identify separate snakes
        // For now, just check that snake parts are connected properly
        return true;
    }
    /**
     * Single candidate → place number
     */
    uniqueSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) !== 0)
                    continue;
                const cands = this.candidates.get(row, col);
                if (cands.size === 0) {
                    // Cell must be empty (no snake part)
                    continue;
                }
                if (cands.size === 1) {
                    const num = [...cands][0];
                    this.setCell(row, col, num);
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new HebiField(this.height, this.width);
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                cloned.cells.set(row, col, this.cells.get(row, col));
                cloned.candidates.set(row, col, new Set(this.candidates.get(row, col)));
            }
        }
        cloned.arrows = this.arrows;
        cloned.blackCells = this.blackCells;
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                dump += this.cells.get(row, col) + ':' + [...this.candidates.get(row, col)].join('');
            }
        }
        return dump;
    }
    isSolved() {
        // All cells must be determined (either number or empty)
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.isBlack(row, col))
                    continue;
                const num = this.cells.get(row, col);
                if (num === 0) {
                    const cands = this.candidates.get(row, col);
                    if (cands.size > 0)
                        return false;
                }
            }
        }
        return true;
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const beforeDump = this.getStateDump();
            if (!this.arrowSolve())
                return false;
            if (!this.snakeSolve())
                return false;
            if (!this.uniqueSolve())
                return false;
            changed = this.getStateDump() !== beforeDump;
        }
        if (!this.noTouchSolve())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const num = this.cells.get(row, col);
                if (num === -1) {
                    line += '■';
                }
                else if (num > 0) {
                    line += String(num);
                }
                else {
                    line += '·';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get unknown cells for branching */
    getUnknownCells() {
        const unknowns = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.isBlack(row, col))
                    continue;
                if (this.cells.get(row, col) !== 0)
                    continue;
                const cands = [...this.candidates.get(row, col)];
                if (cands.length > 0) {
                    unknowns.push({ row, col, candidates: cands });
                }
            }
        }
        // Sort by fewest candidates
        unknowns.sort((a, b) => a.candidates.length - b.candidates.length);
        return unknowns;
    }
}
// ============================================
// Hebi Solver
// ============================================
export class HebiSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    static fromString(height, width, param) {
        const field = new HebiField(height, width);
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        const totalCells = height * width;
        for (let i = 0; i < param.length && index < totalCells; i++) {
            const ch = param[i];
            const row = Math.floor(index / width);
            const col = index % width;
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index += interval + 1;
            }
            else if (ch >= '0' && ch <= '5') {
                // Number with direction
                const num = parseInt(ch);
                i++;
                if (i < param.length) {
                    const dirCh = param[i];
                    const dirs = [Direction.UP, Direction.RIGHT, Direction.DOWN, Direction.LEFT];
                    const dirIdx = parseInt(dirCh);
                    if (dirIdx >= 0 && dirIdx < 4) {
                        field.addArrow(row, col, dirs[dirIdx], num);
                    }
                }
                index++;
            }
            else if (ch === '.') {
                field.setBlack(row, col);
                index++;
            }
            else {
                index++;
            }
        }
        return new HebiSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownCells();
        if (unknowns.length === 0)
            return [];
        const cell = unknowns[0];
        const candidates = [];
        // Try setting to empty first (remove all candidates)
        candidates.push({
            apply: (s) => {
                const cloned = s.clone();
                for (const n of cell.candidates) {
                    cloned.removeCandidate(cell.row, cell.col, n);
                }
                return cloned;
            },
            description: `Set (${cell.row}, ${cell.col}) to EMPTY`,
        });
        // Try each candidate number
        for (const num of cell.candidates) {
            candidates.push({
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setCell(cell.row, cell.col, num);
                    return cloned;
                },
                description: `Set (${cell.row}, ${cell.col}) to ${num}`,
            });
        }
        return candidates;
    }
}
//# sourceMappingURL=hebi.js.map