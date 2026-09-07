/**
 * Tapa Solver
 *
 * Rules:
 * 1. Paint some cells black
 * 2. Numbers indicate how many black cells surround them (in 8 neighbors)
 *    and how they are grouped (multiple numbers = separated groups of black cells)
 * 3. Black cells must form a single connected group
 * 4. No 2x2 area can be entirely black (no "pools")
 */
import { CellState, DIRECTIONS, adjacent, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Tapa Field State
// ============================================
export class TapaField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    cells;
    /** Numbers in each cell (null = no clue, array of numbers = clue) */
    numbers;
    /** Candidate patterns for each clue cell */
    candidates;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.numbers = new Grid(height, width, () => null);
        this.candidates = new Grid(height, width, () => null);
    }
    /** Set a number clue (also marks cell as white) */
    setNumber(row, col, nums) {
        this.numbers.set(row, col, nums);
        this.cells.set(row, col, CellState.WHITE);
        // Generate candidates
        this.candidates.set(row, col, this.generateCandidates(nums));
    }
    /** Generate all valid patterns for a given clue */
    generateCandidates(nums) {
        const result = new Set();
        this.generateCandidatesRecursive(nums, result, '');
        return result;
    }
    generateCandidatesRecursive(nums, result, current) {
        if (current.length === 8) {
            // Validate the pattern against the clue
            const groups = this.getGroups(current);
            if (this.matchesClue(groups, nums)) {
                result.add(current);
            }
            return;
        }
        this.generateCandidatesRecursive(nums, result, current + 'B'); // Black
        this.generateCandidatesRecursive(nums, result, current + 'W'); // White
    }
    /** Get groups of consecutive black cells from a pattern string */
    getGroups(pattern) {
        const groups = [];
        let count = 0;
        // Pattern is circular (position 0 and 7 are adjacent)
        for (let i = 0; i < 8; i++) {
            if (pattern[i] === 'B') {
                count++;
            }
            else if (count > 0) {
                groups.push(count);
                count = 0;
            }
        }
        // Handle wrap-around
        if (count > 0) {
            if (groups.length > 0 && pattern[0] === 'B') {
                // Merge with first group
                groups[0] += count;
            }
            else {
                groups.push(count);
            }
        }
        // Handle edge case: all blacks (special case for wrap)
        if (groups.length === 0 && count === 0) {
            // All white - groups is empty
        }
        return groups.sort((a, b) => a - b);
    }
    /** Check if groups match the clue numbers */
    matchesClue(groups, clue) {
        // Handle -1 (unknown) in clue
        const sortedClue = [...clue].filter(n => n !== -1).sort((a, b) => a - b);
        const wildcards = clue.filter(n => n === -1).length;
        if (wildcards === 0) {
            if (groups.length !== sortedClue.length)
                return false;
            for (let i = 0; i < groups.length; i++) {
                if (groups[i] !== sortedClue[i])
                    return false;
            }
            return true;
        }
        else {
            // With wildcards, just check sum and count constraints
            if (groups.length !== clue.length)
                return false;
            const groupSum = groups.reduce((a, b) => a + b, 0);
            const knownSum = sortedClue.reduce((a, b) => a + b, 0);
            // Wildcards can be 1-8, so check if it's possible
            return groupSum >= knownSum + wildcards && groupSum <= knownSum + wildcards * 8;
        }
    }
    /** Get number at position */
    getNumber(row, col) {
        return this.numbers.get(row, col);
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell to black */
    setBlack(row, col) {
        if (this.numbers.get(row, col) === null) {
            this.cells.set(row, col, CellState.BLACK);
        }
    }
    /** Set cell to white */
    setWhite(row, col) {
        this.cells.set(row, col, CellState.WHITE);
    }
    // ========== Helper methods ==========
    /** Get the 8 neighbor positions in order (clockwise from top-left) */
    getNeighborPositions(row, col) {
        // Order: TL, T, TR, R, BR, B, BL, L
        return [
            row > 0 && col > 0 ? { row: row - 1, col: col - 1 } : null,
            row > 0 ? { row: row - 1, col } : null,
            row > 0 && col < this.width - 1 ? { row: row - 1, col: col + 1 } : null,
            col < this.width - 1 ? { row, col: col + 1 } : null,
            row < this.height - 1 && col < this.width - 1 ? { row: row + 1, col: col + 1 } : null,
            row < this.height - 1 ? { row: row + 1, col } : null,
            row < this.height - 1 && col > 0 ? { row: row + 1, col: col - 1 } : null,
            col > 0 ? { row, col: col - 1 } : null,
        ];
    }
    /** Get the current pattern string for a clue cell's neighbors */
    getNeighborPattern(row, col) {
        const neighbors = this.getNeighborPositions(row, col);
        let pattern = '';
        for (const pos of neighbors) {
            if (pos === null) {
                pattern += 'W'; // Out of bounds is treated as white
            }
            else {
                const state = this.cells.get(pos);
                if (state === CellState.BLACK) {
                    pattern += 'B';
                }
                else if (state === CellState.WHITE || this.numbers.get(pos) !== null) {
                    pattern += 'W';
                }
                else {
                    pattern += '?'; // Unknown
                }
            }
        }
        return pattern;
    }
    // ========== Constraint checking ==========
    /** Check for 2x2 black pool */
    hasBlackPool() {
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.cells.get(row, col) === CellState.BLACK &&
                    this.cells.get(row + 1, col) === CellState.BLACK &&
                    this.cells.get(row, col + 1) === CellState.BLACK &&
                    this.cells.get(row + 1, col + 1) === CellState.BLACK) {
                    return true;
                }
            }
        }
        return false;
    }
    /** Check if black cells are connected */
    isBlackConnected() {
        const blackCells = [];
        for (const [pos, state] of this.cells.entries()) {
            if (state === CellState.BLACK) {
                blackCells.push(pos);
            }
        }
        if (blackCells.length === 0)
            return true;
        // BFS from first black cell
        const visited = new Set();
        const queue = [blackCells[0]];
        visited.add(posKey(blackCells[0]));
        while (queue.length > 0) {
            const current = queue.shift();
            for (const dir of DIRECTIONS) {
                const next = adjacent(current, dir);
                const key = posKey(next);
                if (this.cells.inBounds(next) &&
                    this.cells.get(next) !== CellState.WHITE &&
                    this.numbers.get(next) === null &&
                    !visited.has(key)) {
                    visited.add(key);
                    queue.push(next);
                }
            }
        }
        // All black cells must be reachable
        for (const pos of blackCells) {
            if (!visited.has(posKey(pos))) {
                return false;
            }
        }
        return true;
    }
    // ========== Solving methods ==========
    /** Solve using clue candidates */
    solveNumberConstraints() {
        let changed = false;
        for (const [pos, nums] of this.numbers.entries()) {
            if (nums === null)
                continue;
            const candidates = this.candidates.get(pos);
            if (!candidates || candidates.size === 0)
                continue;
            const neighbors = this.getNeighborPositions(pos.row, pos.col);
            const currentPattern = this.getNeighborPattern(pos.row, pos.col);
            // Filter candidates based on current state
            const validCandidates = new Set();
            for (const cand of candidates) {
                let valid = true;
                for (let i = 0; i < 8; i++) {
                    if (currentPattern[i] !== '?') {
                        if (currentPattern[i] !== cand[i]) {
                            valid = false;
                            break;
                        }
                    }
                }
                if (valid) {
                    validCandidates.add(cand);
                }
            }
            // Update candidates
            if (validCandidates.size < candidates.size) {
                this.candidates.set(pos, validCandidates);
                changed = true;
            }
            if (validCandidates.size === 0) {
                return false; // No valid candidates - contradiction
            }
            // Find cells that must be the same in all candidates
            for (let i = 0; i < 8; i++) {
                if (currentPattern[i] === '?' && neighbors[i] !== null) {
                    let allBlack = true;
                    let allWhite = true;
                    for (const cand of validCandidates) {
                        if (cand[i] === 'B')
                            allWhite = false;
                        if (cand[i] === 'W')
                            allBlack = false;
                    }
                    const neighborPos = neighbors[i];
                    if (allBlack && this.numbers.get(neighborPos) === null) {
                        this.setBlack(neighborPos.row, neighborPos.col);
                        changed = true;
                    }
                    else if (allWhite) {
                        this.setWhite(neighborPos.row, neighborPos.col);
                        changed = true;
                    }
                }
            }
        }
        return changed;
    }
    /** Prevent 2x2 pool */
    preventPools() {
        let changed = false;
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                const cells = [
                    { r: row, c: col },
                    { r: row + 1, c: col },
                    { r: row, c: col + 1 },
                    { r: row + 1, c: col + 1 },
                ];
                let blackCount = 0;
                let unknownCell = null;
                for (const cell of cells) {
                    const state = this.cells.get(cell.r, cell.c);
                    if (state === CellState.BLACK)
                        blackCount++;
                    else if (state === CellState.UNKNOWN && this.numbers.get(cell.r, cell.c) === null) {
                        unknownCell = cell;
                    }
                }
                if (blackCount === 3 && unknownCell) {
                    this.setWhite(unknownCell.r, unknownCell.c);
                    changed = true;
                }
            }
        }
        return changed;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new TapaField(this.height, this.width);
        for (const [pos, state] of this.cells.entries()) {
            cloned.cells.set(pos, state);
        }
        cloned.numbers = this.numbers; // Shared (immutable)
        // Clone candidates
        for (const [pos, cands] of this.candidates.entries()) {
            if (cands !== null) {
                cloned.candidates.set(pos, new Set(cands));
            }
        }
        return cloned;
    }
    getStateDump() {
        return this.cells.dump();
    }
    isSolved() {
        // All cells must be determined
        for (const [pos, state] of this.cells.entries()) {
            if (state === CellState.UNKNOWN && this.numbers.get(pos) === null) {
                return false;
            }
        }
        // No 2x2 pool
        if (this.hasBlackPool())
            return false;
        // Black cells must be connected
        if (!this.isBlackConnected())
            return false;
        // Check all clue constraints
        for (const [pos, nums] of this.numbers.entries()) {
            if (nums === null)
                continue;
            const cands = this.candidates.get(pos);
            if (!cands || cands.size === 0)
                return false;
        }
        return true;
    }
    solveAndCheck() {
        // Check for immediate contradictions
        if (this.hasBlackPool())
            return false;
        let changed = true;
        while (changed) {
            changed = false;
            const numResult = this.solveNumberConstraints();
            if (numResult === false)
                return false;
            if (numResult === true)
                changed = true;
            if (this.preventPools())
                changed = true;
            // Recheck constraints
            if (this.hasBlackPool())
                return false;
        }
        // Check connectivity
        if (!this.isBlackConnected())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const nums = this.numbers.get(row, col);
                if (nums !== null) {
                    if (nums.length === 1) {
                        line += nums[0] === -1 ? '?' : String(nums[0]);
                    }
                    else {
                        line += '*';
                    }
                }
                else {
                    const state = this.cells.get(row, col);
                    line += state === CellState.BLACK ? '█' : state === CellState.WHITE ? '·' : '?';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get unknown cells for branching */
    getUnknownCells() {
        const unknowns = [];
        for (const [pos, state] of this.cells.entries()) {
            if (state === CellState.UNKNOWN && this.numbers.get(pos) === null) {
                unknowns.push(pos);
            }
        }
        return unknowns;
    }
}
// ============================================
// Tapa Solver
// ============================================
export class TapaSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from puzzle data
     * @param height Grid height
     * @param width Grid width
     * @param clues Map of positions to clue arrays
     */
    static fromClues(height, width, clues) {
        const field = new TapaField(height, width);
        for (const [key, nums] of clues) {
            const [row, col] = key.split(',').map(Number);
            field.setNumber(row, col, nums);
        }
        return new TapaSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownCells();
        if (unknowns.length === 0)
            return [];
        const pos = unknowns[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setBlack(pos.row, pos.col);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to BLACK`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setWhite(pos.row, pos.col);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to WHITE`,
            },
        ];
    }
}
//# sourceMappingURL=tapa.js.map