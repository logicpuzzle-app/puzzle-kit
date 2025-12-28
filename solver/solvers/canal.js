/**
 * Canal Solver
 *
 * Rules:
 * 1. Paint some cells black to form a single connected black region (the canal)
 * 2. Numbers indicate the total count of black cells in the four directions (up, right, down, left)
 * 3. No 2x2 area can be entirely black (no "pools")
 */
import { CellState, DIRECTIONS, Direction, adjacent, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Canal Field State
// ============================================
export class CanalField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    cells;
    /** Number clues (null = no number, -1 = white cell with no specific count) */
    numbers;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.numbers = new Grid(height, width, () => null);
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
        if (this.numbers.get(row, col) === null) {
            this.cells.set(row, col, CellState.BLACK);
        }
    }
    /** Set cell to white */
    setWhite(row, col) {
        if (this.numbers.get(row, col) === null) {
            this.cells.set(row, col, CellState.WHITE);
        }
    }
    // ========== Helper methods ==========
    /** Count black cells in a direction from position until hitting white */
    countBlackInDirection(row, col, dir) {
        let count = 0;
        let current = adjacent({ row, col }, dir);
        while (this.cells.inBounds(current) && this.cells.get(current) === CellState.BLACK) {
            count++;
            current = adjacent(current, dir);
        }
        return count;
    }
    /** Count space (black or unknown) in a direction until hitting white */
    countSpaceInDirection(row, col, dir) {
        let count = 0;
        let current = adjacent({ row, col }, dir);
        while (this.cells.inBounds(current) && this.cells.get(current) !== CellState.WHITE) {
            count++;
            current = adjacent(current, dir);
        }
        return count;
    }
    /** Get connected region using BFS */
    getConnectedRegion(start, matchFn) {
        const region = new Set();
        const queue = [start];
        region.add(posKey(start));
        while (queue.length > 0) {
            const current = queue.shift();
            for (const dir of DIRECTIONS) {
                const next = adjacent(current, dir);
                const key = posKey(next);
                if (this.cells.inBounds(next) &&
                    matchFn(this.cells.get(next)) &&
                    !region.has(key)) {
                    region.add(key);
                    queue.push(next);
                }
            }
        }
        return region;
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
    /** Prevent 2x2 pool by marking cells white */
    preventPools() {
        let changed = false;
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                const positions = [
                    { row, col },
                    { row: row + 1, col },
                    { row, col: col + 1 },
                    { row: row + 1, col: col + 1 },
                ];
                let blackCount = 0;
                let unknownPos = null;
                for (const pos of positions) {
                    const state = this.cells.get(pos.row, pos.col);
                    if (state === CellState.BLACK) {
                        blackCount++;
                    }
                    else if (state === CellState.UNKNOWN) {
                        unknownPos = pos;
                    }
                }
                // If 3 black and 1 unknown, the unknown must be white
                if (blackCount === 3 && unknownPos) {
                    this.setWhite(unknownPos.row, unknownPos.col);
                    changed = true;
                }
            }
        }
        return changed;
    }
    /** Solve number constraints */
    countSolve() {
        for (const [pos, num] of this.numbers.entries()) {
            if (num === null || num === -1)
                continue;
            // Count space (potential black) in each direction
            const upSpace = this.countSpaceInDirection(pos.row, pos.col, Direction.UP);
            const rightSpace = this.countSpaceInDirection(pos.row, pos.col, Direction.RIGHT);
            const downSpace = this.countSpaceInDirection(pos.row, pos.col, Direction.DOWN);
            const leftSpace = this.countSpaceInDirection(pos.row, pos.col, Direction.LEFT);
            const totalSpace = upSpace + rightSpace + downSpace + leftSpace;
            // Check if we can still satisfy the constraint
            if (totalSpace < num) {
                return false; // Impossible to reach required count
            }
            // Calculate how many cells must be black in each direction
            const fixedBlackUp = num - (rightSpace + downSpace + leftSpace);
            const fixedBlackRight = num - (upSpace + downSpace + leftSpace);
            const fixedBlackDown = num - (upSpace + rightSpace + leftSpace);
            const fixedBlackLeft = num - (upSpace + rightSpace + downSpace);
            // Mark cells that must be black
            if (fixedBlackUp > 0) {
                for (let i = 1; i <= fixedBlackUp; i++) {
                    if (pos.row - i >= 0 && this.cells.get(pos.row - i, pos.col) === CellState.UNKNOWN) {
                        this.setBlack(pos.row - i, pos.col);
                    }
                }
            }
            if (fixedBlackRight > 0) {
                for (let i = 1; i <= fixedBlackRight; i++) {
                    if (pos.col + i < this.width && this.cells.get(pos.row, pos.col + i) === CellState.UNKNOWN) {
                        this.setBlack(pos.row, pos.col + i);
                    }
                }
            }
            if (fixedBlackDown > 0) {
                for (let i = 1; i <= fixedBlackDown; i++) {
                    if (pos.row + i < this.height && this.cells.get(pos.row + i, pos.col) === CellState.UNKNOWN) {
                        this.setBlack(pos.row + i, pos.col);
                    }
                }
            }
            if (fixedBlackLeft > 0) {
                for (let i = 1; i <= fixedBlackLeft; i++) {
                    if (pos.col - i >= 0 && this.cells.get(pos.row, pos.col - i) === CellState.UNKNOWN) {
                        this.setBlack(pos.row, pos.col - i);
                    }
                }
            }
        }
        // Check if constraints are satisfied and mark excess cells white
        for (const [pos, num] of this.numbers.entries()) {
            if (num === null || num === -1)
                continue;
            // Count actual black cells in each direction
            const upBlack = this.countBlackInDirection(pos.row, pos.col, Direction.UP);
            const rightBlack = this.countBlackInDirection(pos.row, pos.col, Direction.RIGHT);
            const downBlack = this.countBlackInDirection(pos.row, pos.col, Direction.DOWN);
            const leftBlack = this.countBlackInDirection(pos.row, pos.col, Direction.LEFT);
            const totalBlack = upBlack + rightBlack + downBlack + leftBlack;
            // Check if count exceeded
            if (totalBlack > num) {
                return false;
            }
            // If count is satisfied, mark cells beyond as white
            if (totalBlack === num) {
                if (pos.row - upBlack - 1 >= 0) {
                    this.setWhite(pos.row - upBlack - 1, pos.col);
                }
                if (pos.col + rightBlack + 1 < this.width) {
                    this.setWhite(pos.row, pos.col + rightBlack + 1);
                }
                if (pos.row + downBlack + 1 < this.height) {
                    this.setWhite(pos.row + downBlack + 1, pos.col);
                }
                if (pos.col - leftBlack - 1 >= 0) {
                    this.setWhite(pos.row, pos.col - leftBlack - 1);
                }
            }
        }
        return true;
    }
    /** Check if black cells are connected */
    connectSolve() {
        const blackPositions = [];
        for (const [pos, state] of this.cells.entries()) {
            if (state === CellState.BLACK) {
                blackPositions.push(pos);
            }
        }
        if (blackPositions.length === 0)
            return true;
        // Get connected region from first black cell
        const connected = this.getConnectedRegion(blackPositions[0], (s) => s !== CellState.WHITE);
        // All black cells must be in the connected region
        for (const pos of blackPositions) {
            if (!connected.has(posKey(pos))) {
                return false;
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new CanalField(this.height, this.width);
        for (const [pos, state] of this.cells.entries()) {
            cloned.cells.set(pos, state);
        }
        for (const [pos, num] of this.numbers.entries()) {
            cloned.numbers.set(pos, num);
        }
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
        // Final validation
        return this.solveAndCheck();
    }
    solveAndCheck() {
        const beforeState = this.getStateDump();
        // Apply count constraints
        if (!this.countSolve()) {
            return false;
        }
        // Prevent pools
        if (!this.preventPools()) {
            return false;
        }
        // Check if we made progress, recurse if so
        if (this.getStateDump() !== beforeState) {
            return this.solveAndCheck();
        }
        // Check connectivity (only after no more changes)
        if (!this.connectSolve()) {
            return false;
        }
        // Check for pools
        if (this.hasBlackPool()) {
            return false;
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num !== null && num !== -1) {
                    // Display number
                    line += num < 10 ? String(num) : '+';
                }
                else {
                    const state = this.cells.get(row, col);
                    if (num === -1) {
                        // White cell with no number
                        line += '·';
                    }
                    else {
                        line += state === CellState.BLACK ? '█' : state === CellState.WHITE ? '·' : '?';
                    }
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
// Canal Solver
// ============================================
export class CanalSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from puzzle string format
     * Each row is a string where:
     * - '.' or space = empty cell (no number)
     * - '0'-'9' = number clue
     * - 'a'-'z' = numbers 10-35 (a=10, b=11, etc.)
     */
    static fromString(height, width, puzzle) {
        const field = new CanalField(height, width);
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const ch = puzzle[row]?.[col];
                if (!ch || ch === '.' || ch === ' ') {
                    // No number
                    continue;
                }
                else if (ch >= '0' && ch <= '9') {
                    field.setNumber(row, col, parseInt(ch));
                }
                else if (ch.toLowerCase() >= 'a' && ch.toLowerCase() <= 'z') {
                    // Letters represent 10+ (a=10, b=11, etc.)
                    field.setNumber(row, col, ch.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0) + 10);
                }
            }
        }
        return new CanalSolver(field);
    }
    /**
     * Create solver from compact encoding (SDVX format)
     * Format: height,width,param where param uses run-length encoding
     * g-z = skip 1-20 cells
     * 0-9,a-f = number clue (hex)
     * . = white cell with no number
     * - = 2-digit hex number (16-255)
     * + = 3-digit hex number (256-999)
     */
    static fromCompact(height, width, param) {
        const field = new CanalField(height, width);
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        for (let i = 0; i < param.length; i++) {
            const ch = param.charAt(i);
            const intervalIdx = ALPHABET_FROM_G.indexOf(ch);
            if (intervalIdx !== -1) {
                // Skip cells
                index += intervalIdx + 1;
            }
            else {
                const row = Math.floor(index / width);
                const col = index % width;
                if (ch === '.') {
                    // White cell with no specific number
                    field.setNumber(row, col, -1);
                }
                else if (ch === '-') {
                    // 2-digit hex
                    const num = parseInt(param.substring(i + 1, i + 3), 16);
                    field.setNumber(row, col, num);
                    i += 2;
                }
                else if (ch === '+') {
                    // 3-digit hex
                    const num = parseInt(param.substring(i + 1, i + 4), 16);
                    field.setNumber(row, col, num);
                    i += 3;
                }
                else {
                    // Single hex digit (0-15)
                    const num = parseInt(ch, 16);
                    if (!isNaN(num)) {
                        field.setNumber(row, col, num);
                    }
                }
                index++;
            }
        }
        return new CanalSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownCells();
        if (unknowns.length === 0)
            return [];
        // Take first unknown cell
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
//# sourceMappingURL=canal.js.map