/**
 * Chocobanana Solver
 *
 * Rules:
 * 1. Shade some cells black, leave others white
 * 2. Black regions must be rectangular
 * 3. White regions must NOT be rectangular
 * 4. Numbers indicate the size of the connected region (same color) containing that number
 * 5. Numbers with the same value in the same region must be connected
 */
import { CellState, posKey, DIRECTIONS, adjacent, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Chocobanana Field State
// ============================================
export class ChocobananaField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    cells;
    /** Numbers (null = no number, -1 = unknown number) */
    numbers;
    /** Already confirmed positions (optimization) */
    alreadyPosSet;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.numbers = new Grid(height, width, () => null);
        this.alreadyPosSet = new Set();
    }
    /** Parse puzzle from pzv.jp parameter */
    parseParam(param) {
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        for (let i = 0; i < param.length; i++) {
            const ch = param[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index += interval + 1;
            }
            else if (ch === '.') {
                const row = Math.floor(index / this.width);
                const col = index % this.width;
                if (row < this.height) {
                    this.numbers.set(row, col, -1);
                }
                index++;
            }
            else if (ch === '-') {
                // 16-255
                const value = parseInt(param[i + 1] + param[i + 2], 16);
                const row = Math.floor(index / this.width);
                const col = index % this.width;
                if (row < this.height) {
                    this.numbers.set(row, col, value);
                }
                i += 2;
                index++;
            }
            else if (ch === '+') {
                // 256-999
                const value = parseInt(param[i + 1] + param[i + 2] + param[i + 3], 16);
                const row = Math.floor(index / this.width);
                const col = index % this.width;
                if (row < this.height) {
                    this.numbers.set(row, col, value);
                }
                i += 3;
                index++;
            }
            else {
                const value = parseInt(ch, 16);
                if (!isNaN(value)) {
                    const row = Math.floor(index / this.width);
                    const col = index % this.width;
                    if (row < this.height) {
                        this.numbers.set(row, col, value);
                    }
                }
                index++;
            }
        }
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell to black */
    setBlack(row, col) {
        this.cells.set(row, col, CellState.BLACK);
    }
    /** Set cell to white */
    setWhite(row, col) {
        this.cells.set(row, col, CellState.WHITE);
    }
    // ========== Helper methods ==========
    /** Find connected region of same color */
    findConnectedRegion(row, col, targetState, maxSize, targetNumber) {
        const positions = [];
        const visited = new Set();
        const queue = [{ row, col }];
        while (queue.length > 0) {
            const pos = queue.shift();
            const key = posKey(pos);
            if (visited.has(key))
                continue;
            const state = this.cells.get(pos.row, pos.col);
            if (state !== targetState)
                continue;
            const num = this.numbers.get(pos.row, pos.col);
            if (targetNumber !== null && num !== null && num !== -1 && num !== targetNumber) {
                continue; // Different number constraint
            }
            visited.add(key);
            positions.push(pos);
            if (maxSize !== null && positions.length > maxSize) {
                return { positions, overflow: true };
            }
            for (const dir of DIRECTIONS) {
                const next = adjacent(pos, dir);
                if (next.row >= 0 && next.row < this.height &&
                    next.col >= 0 && next.col < this.width) {
                    queue.push(next);
                }
            }
        }
        return { positions, overflow: false };
    }
    /** Find connected region including UNKNOWN cells (candidate region) */
    findCandidateRegion(row, col, targetState, maxSize, targetNumber) {
        const positions = [];
        const visited = new Set();
        const queue = [{ row, col }];
        while (queue.length > 0 && positions.length <= maxSize) {
            const pos = queue.shift();
            const key = posKey(pos);
            if (visited.has(key))
                continue;
            const state = this.cells.get(pos.row, pos.col);
            if (state !== targetState && state !== CellState.UNKNOWN)
                continue;
            const num = this.numbers.get(pos.row, pos.col);
            if (targetNumber !== null && num !== null && num !== -1 && num !== targetNumber) {
                continue;
            }
            visited.add(key);
            positions.push(pos);
            for (const dir of DIRECTIONS) {
                const next = adjacent(pos, dir);
                if (next.row >= 0 && next.row < this.height &&
                    next.col >= 0 && next.col < this.width) {
                    queue.push(next);
                }
            }
        }
        return { positions, canReachSize: positions.length >= maxSize };
    }
    // ========== Constraint solving ==========
    /**
     * Number constraint: connected region size must match number
     */
    countSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const num = this.numbers.get(y, x);
                if (num === null || num === -1)
                    continue;
                const state = this.cells.get(y, x);
                if (state === CellState.UNKNOWN)
                    continue;
                const key = posKey({ row: y, col: x });
                if (this.alreadyPosSet.has(key))
                    continue;
                // Find current connected region
                const { positions, overflow } = this.findConnectedRegion(y, x, state, num, num);
                if (overflow) {
                    return false; // Region too large
                }
                if (positions.length === num) {
                    // Region complete - mark boundaries as opposite color
                    this.alreadyPosSet.add(key);
                    const oppositeState = state === CellState.BLACK ? CellState.WHITE : CellState.BLACK;
                    for (const pos of positions) {
                        for (const dir of DIRECTIONS) {
                            const next = adjacent(pos, dir);
                            if (next.row >= 0 && next.row < this.height &&
                                next.col >= 0 && next.col < this.width) {
                                const nextKey = posKey(next);
                                if (!positions.some(p => posKey(p) === nextKey)) {
                                    if (this.cells.get(next.row, next.col) === CellState.UNKNOWN) {
                                        this.cells.set(next.row, next.col, oppositeState);
                                    }
                                }
                            }
                        }
                    }
                }
                else {
                    // Check if region can still grow to required size
                    const candidateResult = this.findCandidateRegion(y, x, state, num, num);
                    if (!candidateResult.canReachSize) {
                        return false; // Cannot reach required size
                    }
                    // If candidate region is exactly the required size, fill it
                    if (candidateResult.positions.length === num) {
                        this.alreadyPosSet.add(key);
                        const oppositeState = state === CellState.BLACK ? CellState.WHITE : CellState.BLACK;
                        for (const pos of candidateResult.positions) {
                            if (this.cells.get(pos.row, pos.col) === CellState.UNKNOWN) {
                                this.cells.set(pos.row, pos.col, state);
                            }
                            for (const dir of DIRECTIONS) {
                                const next = adjacent(pos, dir);
                                if (next.row >= 0 && next.row < this.height &&
                                    next.col >= 0 && next.col < this.width) {
                                    const nextKey = posKey(next);
                                    if (!candidateResult.positions.some(p => posKey(p) === nextKey)) {
                                        if (this.cells.get(next.row, next.col) === CellState.UNKNOWN) {
                                            this.cells.set(next.row, next.col, oppositeState);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return true;
    }
    /**
     * Black regions must be rectangular
     */
    rectBlackSolve() {
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                const m1 = this.cells.get(y, x);
                const m2 = this.cells.get(y, x + 1);
                const m3 = this.cells.get(y + 1, x);
                const m4 = this.cells.get(y + 1, x + 1);
                // Check for invalid L-shapes in black cells
                if (m1 === CellState.BLACK && m2 === CellState.BLACK && m3 === CellState.BLACK && m4 === CellState.WHITE) {
                    return false;
                }
                if (m1 === CellState.BLACK && m2 === CellState.BLACK && m3 === CellState.WHITE && m4 === CellState.BLACK) {
                    return false;
                }
                if (m1 === CellState.BLACK && m2 === CellState.WHITE && m3 === CellState.BLACK && m4 === CellState.BLACK) {
                    return false;
                }
                if (m1 === CellState.WHITE && m2 === CellState.BLACK && m3 === CellState.BLACK && m4 === CellState.BLACK) {
                    return false;
                }
                // Propagation: if 3 blacks, 4th must be black
                if (m1 === CellState.BLACK && m2 === CellState.BLACK && m3 === CellState.BLACK && m4 === CellState.UNKNOWN) {
                    this.cells.set(y + 1, x + 1, CellState.BLACK);
                }
                if (m1 === CellState.BLACK && m2 === CellState.BLACK && m3 === CellState.UNKNOWN && m4 === CellState.BLACK) {
                    this.cells.set(y + 1, x, CellState.BLACK);
                }
                if (m1 === CellState.BLACK && m2 === CellState.UNKNOWN && m3 === CellState.BLACK && m4 === CellState.BLACK) {
                    this.cells.set(y, x + 1, CellState.BLACK);
                }
                if (m1 === CellState.UNKNOWN && m2 === CellState.BLACK && m3 === CellState.BLACK && m4 === CellState.BLACK) {
                    this.cells.set(y, x, CellState.BLACK);
                }
                // Propagation: if 2 adjacent blacks and one is white, corner must be white
                if (m1 === CellState.BLACK && m2 === CellState.BLACK && m3 === CellState.UNKNOWN && m4 === CellState.WHITE) {
                    this.cells.set(y + 1, x, CellState.WHITE);
                }
                if (m1 === CellState.BLACK && m2 === CellState.UNKNOWN && m3 === CellState.BLACK && m4 === CellState.WHITE) {
                    this.cells.set(y, x + 1, CellState.WHITE);
                }
                if (m1 === CellState.UNKNOWN && m2 === CellState.BLACK && m3 === CellState.BLACK && m4 === CellState.WHITE) {
                    this.cells.set(y, x, CellState.WHITE);
                }
                if (m1 === CellState.BLACK && m2 === CellState.BLACK && m3 === CellState.WHITE && m4 === CellState.UNKNOWN) {
                    this.cells.set(y + 1, x + 1, CellState.WHITE);
                }
                if (m1 === CellState.UNKNOWN && m2 === CellState.WHITE && m3 === CellState.BLACK && m4 === CellState.BLACK) {
                    this.cells.set(y, x, CellState.WHITE);
                }
                if (m1 === CellState.BLACK && m2 === CellState.WHITE && m3 === CellState.UNKNOWN && m4 === CellState.BLACK) {
                    this.cells.set(y + 1, x, CellState.WHITE);
                }
                if (m1 === CellState.BLACK && m2 === CellState.WHITE && m3 === CellState.BLACK && m4 === CellState.UNKNOWN) {
                    this.cells.set(y + 1, x + 1, CellState.WHITE);
                }
                if (m1 === CellState.WHITE && m2 === CellState.UNKNOWN && m3 === CellState.BLACK && m4 === CellState.BLACK) {
                    this.cells.set(y, x + 1, CellState.WHITE);
                }
                if (m1 === CellState.WHITE && m2 === CellState.BLACK && m3 === CellState.UNKNOWN && m4 === CellState.BLACK) {
                    this.cells.set(y + 1, x, CellState.WHITE);
                }
                if (m1 === CellState.WHITE && m2 === CellState.BLACK && m3 === CellState.BLACK && m4 === CellState.UNKNOWN) {
                    this.cells.set(y + 1, x + 1, CellState.WHITE);
                }
            }
        }
        return true;
    }
    /**
     * White regions must NOT be rectangular
     * Check if any white region forms a complete rectangle (which is invalid)
     */
    notRectWhiteSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) !== CellState.WHITE)
                    continue;
                // Check if left/top boundaries are black
                if (x > 0 && this.cells.get(y, x - 1) !== CellState.BLACK)
                    continue;
                if (y > 0 && this.cells.get(y - 1, x) !== CellState.BLACK)
                    continue;
                // Find the white rectangle starting from this cell
                let fromY = y, fromX = x, toY = y, toX = x;
                let isSkip = false;
                // Extend down
                for (let targetY = y + 1; targetY < this.height; targetY++) {
                    if (this.cells.get(targetY, x) !== CellState.WHITE) {
                        if (this.cells.get(targetY, x) === CellState.UNKNOWN) {
                            isSkip = true;
                        }
                        break;
                    }
                    toY = targetY;
                }
                if (isSkip)
                    continue;
                // Extend right
                for (let targetX = x + 1; targetX < this.width; targetX++) {
                    if (this.cells.get(y, targetX) !== CellState.WHITE) {
                        if (this.cells.get(y, targetX) === CellState.UNKNOWN) {
                            isSkip = true;
                        }
                        break;
                    }
                    toX = targetX;
                }
                if (isSkip)
                    continue;
                // Check if rectangle is filled with white
                for (let ty = fromY; ty <= toY && !isSkip; ty++) {
                    for (let tx = fromX; tx <= toX && !isSkip; tx++) {
                        if (this.cells.get(ty, tx) !== CellState.WHITE) {
                            isSkip = true;
                        }
                    }
                }
                if (isSkip)
                    continue;
                // Check if surrounded by black on all sides
                // Top
                if (fromY > 0) {
                    for (let tx = fromX; tx <= toX; tx++) {
                        if (this.cells.get(fromY - 1, tx) !== CellState.BLACK) {
                            isSkip = true;
                            break;
                        }
                    }
                }
                if (isSkip)
                    continue;
                // Right
                if (toX < this.width - 1) {
                    for (let ty = fromY; ty <= toY; ty++) {
                        if (this.cells.get(ty, toX + 1) !== CellState.BLACK) {
                            isSkip = true;
                            break;
                        }
                    }
                }
                if (isSkip)
                    continue;
                // Bottom
                if (toY < this.height - 1) {
                    for (let tx = fromX; tx <= toX; tx++) {
                        if (this.cells.get(toY + 1, tx) !== CellState.BLACK) {
                            isSkip = true;
                            break;
                        }
                    }
                }
                if (isSkip)
                    continue;
                // Left
                if (fromX > 0) {
                    for (let ty = fromY; ty <= toY; ty++) {
                        if (this.cells.get(ty, fromX - 1) !== CellState.BLACK) {
                            isSkip = true;
                            break;
                        }
                    }
                }
                if (isSkip)
                    continue;
                // Found a complete white rectangle - invalid!
                return false;
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new ChocobananaField(this.height, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.cells.set(y, x, this.cells.get(y, x));
                cloned.numbers.set(y, x, this.numbers.get(y, x));
            }
        }
        cloned.alreadyPosSet = new Set(this.alreadyPosSet);
        return cloned;
    }
    getStateDump() {
        return this.cells.dump();
    }
    isSolved() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) === CellState.UNKNOWN)
                    return false;
            }
        }
        return true;
    }
    solveAndCheck() {
        let str = this.getStateDump();
        if (!this.countSolve())
            return false;
        if (!this.rectBlackSolve())
            return false;
        if (!this.notRectWhiteSolve())
            return false;
        if (this.getStateDump() !== str) {
            return this.solveAndCheck();
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const state = this.cells.get(row, col);
                const num = this.numbers.get(row, col);
                if (state === CellState.UNKNOWN && num !== null) {
                    line += num === -1 ? '?' : String(num % 10);
                }
                else {
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
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) === CellState.UNKNOWN) {
                    unknowns.push({ row: y, col: x });
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Chocobanana Solver
// ============================================
export class ChocobananaSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzv.jp URL format */
    static fromString(height, width, param) {
        const field = new ChocobananaField(height, width);
        field.parseParam(param);
        return new ChocobananaSolver(field);
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
//# sourceMappingURL=chocobanana.js.map