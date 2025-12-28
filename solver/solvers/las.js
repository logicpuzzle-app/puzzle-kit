/**
 * Las Solver
 *
 * Rules:
 * 1. Paint some cells black
 * 2. Numbers indicate the size of the continuous white region (orthogonally connected)
 * 3. Each white region must contain exactly one number
 * 4. Black cells cannot be adjacent orthogonally
 * 5. All white cells must be connected
 */
import { CellState, DIRECTIONS, Direction, adjacent, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Las Field State
// ============================================
export class LasField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    cells;
    /** Numbers in each cell (null = no number, -1 = unknown number) */
    numbers;
    /** Set of positions with numbers that have been confirmed/satisfied */
    alreadyPosSet;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.numbers = new Grid(height, width, () => null);
        this.alreadyPosSet = new Set();
    }
    /** Set a number clue (also marks as white) */
    setNumber(row, col, num) {
        this.numbers.set(row, col, num);
        this.cells.set(row, col, CellState.WHITE);
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
        // Can't make a number cell black
        if (this.numbers.get(row, col) === null) {
            this.cells.set(row, col, CellState.BLACK);
        }
    }
    /** Set cell to white */
    setWhite(row, col) {
        this.cells.set(row, col, CellState.WHITE);
    }
    // ========== Helper methods ==========
    /**
     * Get all connected cells of the same confirmed color from a position
     * Returns false if size exceeds limit
     */
    setContinuePosSet(target, pos, continuePosSet, size, from) {
        if (size !== -1 && continuePosSet.size > size) {
            return false;
        }
        // Check all four directions
        for (const dir of DIRECTIONS) {
            if (from !== null && dir === from)
                continue;
            const next = adjacent(pos, dir);
            if (!this.cells.inBounds(next))
                continue;
            const nextKey = posKey(next);
            const nextState = this.cells.get(next);
            if (nextState === target && !continuePosSet.has(nextKey)) {
                // Can't connect to another number cell
                if (this.numbers.get(next) !== null) {
                    return false;
                }
                continuePosSet.add(nextKey);
                const oppositeDir = this.getOppositeDirection(dir);
                if (!this.setContinuePosSet(target, next, continuePosSet, size, oppositeDir)) {
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * Get all cells that could potentially be the same color (confirmed or unknown)
     * Returns true if size can be reached
     */
    setContinueCandPosSet(target, pos, continuePosSet, size, from) {
        if (size !== -1 && continuePosSet.size > size) {
            return true;
        }
        for (const dir of DIRECTIONS) {
            if (from !== null && dir === from)
                continue;
            const next = adjacent(pos, dir);
            if (!this.cells.inBounds(next))
                continue;
            const nextKey = posKey(next);
            const nextState = this.cells.get(next);
            if ((nextState === target || nextState === CellState.UNKNOWN) &&
                !continuePosSet.has(nextKey) &&
                this.numbers.get(next) === null) {
                continuePosSet.add(nextKey);
                const oppositeDir = this.getOppositeDirection(dir);
                if (this.setContinueCandPosSet(target, next, continuePosSet, size, oppositeDir)) {
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * Check if a region can find a number (for standalone check)
     * Returns true if a number is found
     */
    setContinueCandPosSetForNumber(target, pos, continuePosSet, from) {
        if (this.numbers.get(pos) !== null) {
            return true;
        }
        for (const dir of DIRECTIONS) {
            if (from !== null && dir === from)
                continue;
            const next = adjacent(pos, dir);
            if (!this.cells.inBounds(next))
                continue;
            const nextKey = posKey(next);
            const nextState = this.cells.get(next);
            if (!continuePosSet.has(nextKey) &&
                (nextState === target || nextState === CellState.UNKNOWN)) {
                continuePosSet.add(nextKey);
                const oppositeDir = this.getOppositeDirection(dir);
                if (this.setContinueCandPosSetForNumber(target, next, continuePosSet, oppositeDir)) {
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * Check if a region has multiple numbers (for standalone check)
     * Returns false if 2+ numbers found
     */
    setContinuePosSetForNumber(target, pos, continuePosSet, from, findNumber) {
        if (this.numbers.get(pos) !== null) {
            if (findNumber.size === 0) {
                findNumber.add(posKey(pos));
            }
            else {
                return false; // Found second number
            }
        }
        for (const dir of DIRECTIONS) {
            if (from !== null && dir === from)
                continue;
            const next = adjacent(pos, dir);
            if (!this.cells.inBounds(next))
                continue;
            const nextKey = posKey(next);
            const nextState = this.cells.get(next);
            if (!continuePosSet.has(nextKey) && nextState === target) {
                continuePosSet.add(nextKey);
                const oppositeDir = this.getOppositeDirection(dir);
                if (!this.setContinuePosSetForNumber(target, next, continuePosSet, oppositeDir, findNumber)) {
                    return false;
                }
            }
        }
        return true;
    }
    /** Get opposite direction */
    getOppositeDirection(dir) {
        switch (dir) {
            case Direction.UP:
                return Direction.DOWN;
            case Direction.DOWN:
                return Direction.UP;
            case Direction.LEFT:
                return Direction.RIGHT;
            case Direction.RIGHT:
                return Direction.LEFT;
        }
    }
    // ========== Constraint checking ==========
    /** Check if any black cells are adjacent */
    hasAdjacentBlack() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) !== CellState.BLACK)
                    continue;
                for (const dir of DIRECTIONS) {
                    const next = adjacent({ row, col }, dir);
                    if (this.cells.inBounds(next) && this.cells.get(next) === CellState.BLACK) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    /** Mark neighbors of black cells as white */
    markBlackNeighborsWhite() {
        let changed = false;
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) !== CellState.BLACK)
                    continue;
                for (const dir of DIRECTIONS) {
                    const next = adjacent({ row, col }, dir);
                    if (this.cells.inBounds(next) && this.cells.get(next) === CellState.UNKNOWN) {
                        this.setWhite(next.row, next.col);
                        changed = true;
                    }
                }
            }
        }
        return changed;
    }
    /** Check if white cells are connected */
    isWhiteConnected() {
        const whiteCells = [];
        for (const [pos, state] of this.cells.entries()) {
            if (state === CellState.WHITE) {
                whiteCells.push(pos);
            }
        }
        if (whiteCells.length === 0)
            return true;
        // BFS from first white cell
        const visited = new Set();
        const queue = [whiteCells[0]];
        visited.add(posKey(whiteCells[0]));
        while (queue.length > 0) {
            const current = queue.shift();
            for (const dir of DIRECTIONS) {
                const next = adjacent(current, dir);
                const key = posKey(next);
                if (this.cells.inBounds(next) &&
                    this.cells.get(next) !== CellState.BLACK &&
                    !visited.has(key)) {
                    visited.add(key);
                    queue.push(next);
                }
            }
        }
        // All white cells must be reachable
        for (const pos of whiteCells) {
            if (!visited.has(posKey(pos))) {
                return false;
            }
        }
        return true;
    }
    // ========== Solving methods ==========
    /** Solve number constraints - count-based solving */
    countSolve() {
        for (const [pos, num] of this.numbers.entries()) {
            if (num === null || num === -1)
                continue;
            const pivot = posKey(pos);
            if (this.alreadyPosSet.has(pivot))
                continue;
            // Get confirmed white region
            const continuePosSet = new Set();
            continuePosSet.add(pivot);
            if (!this.setContinuePosSet(this.cells.get(pos), pos, continuePosSet, num, null)) {
                // Size exceeded
                return false;
            }
            if (num === continuePosSet.size) {
                // Size confirmed - mark neighbors as opposite color
                this.alreadyPosSet.add(pivot);
                for (const posStr of continuePosSet) {
                    const [r, c] = posStr.split(',').map(Number);
                    const cellPos = { row: r, col: c };
                    for (const dir of DIRECTIONS) {
                        const next = adjacent(cellPos, dir);
                        if (!this.cells.inBounds(next))
                            continue;
                        const nextKey = posKey(next);
                        if (!continuePosSet.has(nextKey)) {
                            const currentState = this.cells.get(pos);
                            if (currentState === CellState.BLACK) {
                                this.setWhite(next.row, next.col);
                            }
                            else {
                                this.setBlack(next.row, next.col);
                            }
                        }
                    }
                }
            }
            else {
                // Check potential size
                const continueCandPosSet = new Set();
                continueCandPosSet.add(pivot);
                if (!this.setContinueCandPosSet(this.cells.get(pos), pos, continueCandPosSet, num, null)) {
                    if (num === continueCandPosSet.size) {
                        // Size confirmed with candidates - fix all candidates
                        this.alreadyPosSet.add(pivot);
                        for (const posStr of continueCandPosSet) {
                            const [r, c] = posStr.split(',').map(Number);
                            this.cells.set(r, c, this.cells.get(pos));
                            const cellPos = { row: r, col: c };
                            for (const dir of DIRECTIONS) {
                                const next = adjacent(cellPos, dir);
                                if (!this.cells.inBounds(next))
                                    continue;
                                const nextKey = posKey(next);
                                const currentState = this.cells.get(pos);
                                if (continueCandPosSet.has(nextKey)) {
                                    // Inside region
                                    this.cells.set(next, currentState);
                                }
                                else {
                                    // Outside region
                                    if (currentState === CellState.BLACK) {
                                        this.setWhite(next.row, next.col);
                                    }
                                    else {
                                        this.setBlack(next.row, next.col);
                                    }
                                }
                            }
                        }
                    }
                    else {
                        // Cannot reach required size
                        return false;
                    }
                }
            }
        }
        return true;
    }
    /**
     * Check that each region can have a number
     * No region should be unable to contain a number or contain 2+ numbers
     */
    standAloneSolve() {
        const checkPosSet = new Set();
        for (const [pos, state] of this.cells.entries()) {
            if (state !== CellState.UNKNOWN) {
                checkPosSet.add(posKey(pos));
            }
        }
        while (checkPosSet.size > 0) {
            const pivot = Array.from(checkPosSet)[0];
            const [row, col] = pivot.split(',').map(Number);
            const pos = { row, col };
            // Check if region can find a number
            let continuePosSet = new Set();
            continuePosSet.add(pivot);
            if (!this.setContinueCandPosSetForNumber(this.cells.get(pos), pos, continuePosSet, null)) {
                return false;
            }
            // Check if region has only one number
            continuePosSet = new Set();
            continuePosSet.add(pivot);
            if (!this.setContinuePosSetForNumber(this.cells.get(pos), pos, continuePosSet, null, new Set())) {
                return false;
            }
            // Remove checked positions
            for (const p of continuePosSet) {
                checkPosSet.delete(p);
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new LasField(this.height, this.width);
        for (const [pos, state] of this.cells.entries()) {
            cloned.cells.set(pos, state);
        }
        cloned.numbers = this.numbers; // Shared (immutable)
        cloned.alreadyPosSet = new Set(this.alreadyPosSet);
        return cloned;
    }
    getStateDump() {
        return this.cells.dump();
    }
    isSolved() {
        // All cells must be determined
        for (const [, state] of this.cells.entries()) {
            if (state === CellState.UNKNOWN)
                return false;
        }
        // No adjacent blacks
        if (this.hasAdjacentBlack())
            return false;
        // White cells must be connected
        if (!this.isWhiteConnected())
            return false;
        // Check all number constraints
        for (const [pos, num] of this.numbers.entries()) {
            if (num === null || num === -1)
                continue;
            const continuePosSet = new Set();
            continuePosSet.add(posKey(pos));
            this.setContinuePosSet(this.cells.get(pos), pos, continuePosSet, -1, null);
            if (continuePosSet.size !== num)
                return false;
        }
        return true;
    }
    solveAndCheck() {
        // Check for immediate contradictions
        if (this.hasAdjacentBlack())
            return false;
        let changed = true;
        while (changed) {
            changed = false;
            // Mark neighbors of black cells as white
            if (this.markBlackNeighborsWhite())
                changed = true;
            // Solve number constraints
            if (!this.countSolve())
                return false;
            // Check for contradictions
            if (this.hasAdjacentBlack())
                return false;
        }
        // Check standalone constraint (each region needs exactly one number)
        if (!this.standAloneSolve())
            return false;
        // Check connectivity
        if (!this.isWhiteConnected())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num !== null) {
                    if (num === -1) {
                        line += '?';
                    }
                    else {
                        line += num < 10 ? String(num) : '+';
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
            if (state === CellState.UNKNOWN) {
                unknowns.push(pos);
            }
        }
        return unknowns;
    }
}
// ============================================
// Las Solver
// ============================================
export class LasSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from puzzle string */
    static fromString(height, width, puzzle) {
        const field = new LasField(height, width);
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const ch = puzzle[row]?.[col];
                if (ch && ch >= '1' && ch <= '9') {
                    field.setNumber(row, col, parseInt(ch));
                }
                else if (ch && ch.toLowerCase() >= 'a' && ch.toLowerCase() <= 'z') {
                    // Letters represent 10+ (a=10, b=11, etc.)
                    field.setNumber(row, col, ch.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0) + 10);
                }
                else if (ch === '?') {
                    // Unknown number
                    field.setNumber(row, col, -1);
                }
            }
        }
        return new LasSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownCells();
        if (unknowns.length === 0)
            return [];
        // Pick first unknown cell
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
//# sourceMappingURL=las.js.map