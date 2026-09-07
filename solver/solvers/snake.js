/**
 * Snake Solver
 *
 * Rules:
 * 1. Draw a snake (connected path) in the grid
 * 2. The snake doesn't touch itself, even diagonally (no 2x2 black area)
 * 3. Numbers on edges indicate how many cells in that row/column are part of the snake
 * 4. White circles mark cells on the snake's body (exactly 2 neighbors on snake)
 * 5. Black circles mark the snake's head or tail (exactly 1 neighbor on snake)
 */
import { CellState, Direction, posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Snake Field State
// ============================================
export class SnakeField {
    height;
    width;
    /** Cell states (UNKNOWN, BLACK = snake, WHITE = not snake) */
    cells;
    /** Row hints (left side) - number of snake cells in each row */
    leftHints;
    /** Column hints (top side) - number of snake cells in each column */
    upHints;
    /** End positions (snake head/tail) */
    endPosSet;
    /** On-route positions (snake body) */
    onRoutePosSet;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.leftHints = new Array(height).fill(null);
        this.upHints = new Array(width).fill(null);
        this.endPosSet = new Set();
        this.onRoutePosSet = new Set();
    }
    /** Set row hint */
    setLeftHint(row, hint) {
        this.leftHints[row] = hint;
    }
    /** Set column hint */
    setUpHint(col, hint) {
        this.upHints[col] = hint;
    }
    /** Set end position (head/tail) */
    setEndPos(row, col) {
        const key = posKey({ row, col });
        this.endPosSet.add(key);
        this.cells.set(row, col, CellState.BLACK);
    }
    /** Set on-route position (body) */
    setOnRoutePos(row, col) {
        const key = posKey({ row, col });
        this.onRoutePosSet.add(key);
        this.cells.set(row, col, CellState.BLACK);
    }
    /** Check if position is end */
    isEndPos(row, col) {
        return this.endPosSet.has(posKey({ row, col }));
    }
    /** Check if position is on route */
    isOnRoutePos(row, col) {
        return this.onRoutePosSet.has(posKey({ row, col }));
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell state */
    setCell(row, col, state) {
        this.cells.set(row, col, state);
    }
    // ========== Constraint solving ==========
    /** No 2x2 black area (snake can't touch itself diagonally) */
    pondSolve() {
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                const m1 = this.cells.get(row, col);
                const m2 = this.cells.get(row, col + 1);
                const m3 = this.cells.get(row + 1, col);
                const m4 = this.cells.get(row + 1, col + 1);
                // 2x2 black = invalid
                if (m1 === CellState.BLACK && m2 === CellState.BLACK &&
                    m3 === CellState.BLACK && m4 === CellState.BLACK) {
                    return false;
                }
                // Diagonal pattern invalid (checkerboard)
                if (m1 === CellState.WHITE && m2 === CellState.BLACK &&
                    m3 === CellState.BLACK && m4 === CellState.WHITE) {
                    return false;
                }
                if (m1 === CellState.BLACK && m2 === CellState.WHITE &&
                    m3 === CellState.WHITE && m4 === CellState.BLACK) {
                    return false;
                }
                // If 3 are black, 4th must be white
                if (m1 === CellState.BLACK && m2 === CellState.BLACK &&
                    m3 === CellState.BLACK && m4 === CellState.UNKNOWN) {
                    this.cells.set(row + 1, col + 1, CellState.WHITE);
                }
                if (m1 === CellState.BLACK && m2 === CellState.BLACK &&
                    m3 === CellState.UNKNOWN && m4 === CellState.BLACK) {
                    this.cells.set(row + 1, col, CellState.WHITE);
                }
                if (m1 === CellState.BLACK && m2 === CellState.UNKNOWN &&
                    m3 === CellState.BLACK && m4 === CellState.BLACK) {
                    this.cells.set(row, col + 1, CellState.WHITE);
                }
                if (m1 === CellState.UNKNOWN && m2 === CellState.BLACK &&
                    m3 === CellState.BLACK && m4 === CellState.BLACK) {
                    this.cells.set(row, col, CellState.WHITE);
                }
                // Diagonal pattern completion
                if (m1 === CellState.WHITE && m2 === CellState.BLACK &&
                    m3 === CellState.BLACK && m4 === CellState.UNKNOWN) {
                    this.cells.set(row + 1, col + 1, CellState.BLACK);
                }
                if (m1 === CellState.UNKNOWN && m2 === CellState.BLACK &&
                    m3 === CellState.BLACK && m4 === CellState.WHITE) {
                    this.cells.set(row, col, CellState.BLACK);
                }
                if (m1 === CellState.BLACK && m2 === CellState.WHITE &&
                    m3 === CellState.UNKNOWN && m4 === CellState.BLACK) {
                    this.cells.set(row + 1, col, CellState.BLACK);
                }
                if (m1 === CellState.BLACK && m2 === CellState.UNKNOWN &&
                    m3 === CellState.WHITE && m4 === CellState.BLACK) {
                    this.cells.set(row, col + 1, CellState.BLACK);
                }
            }
        }
        return true;
    }
    /** Row/column hints constraint */
    hintSolve() {
        // Row hints
        for (let row = 0; row < this.height; row++) {
            const hint = this.leftHints[row];
            if (hint === null)
                continue;
            let blackCount = 0;
            let unknownCount = 0;
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.BLACK)
                    blackCount++;
                else if (this.cells.get(row, col) === CellState.UNKNOWN)
                    unknownCount++;
            }
            if (blackCount > hint)
                return false;
            if (blackCount + unknownCount < hint)
                return false;
            if (blackCount === hint) {
                // All remaining must be white
                for (let col = 0; col < this.width; col++) {
                    if (this.cells.get(row, col) === CellState.UNKNOWN) {
                        this.cells.set(row, col, CellState.WHITE);
                    }
                }
            }
            if (blackCount + unknownCount === hint) {
                // All remaining must be black
                for (let col = 0; col < this.width; col++) {
                    if (this.cells.get(row, col) === CellState.UNKNOWN) {
                        this.cells.set(row, col, CellState.BLACK);
                    }
                }
            }
        }
        // Column hints
        for (let col = 0; col < this.width; col++) {
            const hint = this.upHints[col];
            if (hint === null)
                continue;
            let blackCount = 0;
            let unknownCount = 0;
            for (let row = 0; row < this.height; row++) {
                if (this.cells.get(row, col) === CellState.BLACK)
                    blackCount++;
                else if (this.cells.get(row, col) === CellState.UNKNOWN)
                    unknownCount++;
            }
            if (blackCount > hint)
                return false;
            if (blackCount + unknownCount < hint)
                return false;
            if (blackCount === hint) {
                for (let row = 0; row < this.height; row++) {
                    if (this.cells.get(row, col) === CellState.UNKNOWN) {
                        this.cells.set(row, col, CellState.WHITE);
                    }
                }
            }
            if (blackCount + unknownCount === hint) {
                for (let row = 0; row < this.height; row++) {
                    if (this.cells.get(row, col) === CellState.UNKNOWN) {
                        this.cells.set(row, col, CellState.BLACK);
                    }
                }
            }
        }
        return true;
    }
    /** Snake segment constraints (body has 2 neighbors, ends have 1) */
    masuSolve() {
        let endPointCount = 0;
        let endPointCandCount = 0;
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                let blackNeighbors = 0;
                let whiteNeighbors = 0;
                const up = row === 0 ? CellState.WHITE : this.cells.get(row - 1, col);
                const right = col === this.width - 1 ? CellState.WHITE : this.cells.get(row, col + 1);
                const down = row === this.height - 1 ? CellState.WHITE : this.cells.get(row + 1, col);
                const left = col === 0 ? CellState.WHITE : this.cells.get(row, col - 1);
                if (up === CellState.BLACK)
                    blackNeighbors++;
                else if (up === CellState.WHITE)
                    whiteNeighbors++;
                if (right === CellState.BLACK)
                    blackNeighbors++;
                else if (right === CellState.WHITE)
                    whiteNeighbors++;
                if (down === CellState.BLACK)
                    blackNeighbors++;
                else if (down === CellState.WHITE)
                    whiteNeighbors++;
                if (left === CellState.BLACK)
                    blackNeighbors++;
                else if (left === CellState.WHITE)
                    whiteNeighbors++;
                const cell = this.cells.get(row, col);
                const isEnd = this.isEndPos(row, col);
                const isOnRoute = this.isOnRoutePos(row, col);
                if (cell === CellState.BLACK) {
                    if (isOnRoute) {
                        // Body: exactly 2 black neighbors
                        if (blackNeighbors > 2 || whiteNeighbors > 2)
                            return false;
                        if (blackNeighbors === 2) {
                            // Close remaining
                            if (up === CellState.UNKNOWN)
                                this.cells.set(row - 1, col, CellState.WHITE);
                            if (right === CellState.UNKNOWN)
                                this.cells.set(row, col + 1, CellState.WHITE);
                            if (down === CellState.UNKNOWN)
                                this.cells.set(row + 1, col, CellState.WHITE);
                            if (left === CellState.UNKNOWN)
                                this.cells.set(row, col - 1, CellState.WHITE);
                        }
                        if (whiteNeighbors === 2) {
                            // Must fill remaining
                            if (up === CellState.UNKNOWN)
                                this.cells.set(row - 1, col, CellState.BLACK);
                            if (right === CellState.UNKNOWN)
                                this.cells.set(row, col + 1, CellState.BLACK);
                            if (down === CellState.UNKNOWN)
                                this.cells.set(row + 1, col, CellState.BLACK);
                            if (left === CellState.UNKNOWN)
                                this.cells.set(row, col - 1, CellState.BLACK);
                        }
                    }
                    else if (isEnd) {
                        // End: exactly 1 black neighbor
                        endPointCount++;
                        if (blackNeighbors > 1 || whiteNeighbors > 3)
                            return false;
                        if (blackNeighbors === 1) {
                            if (up === CellState.UNKNOWN)
                                this.cells.set(row - 1, col, CellState.WHITE);
                            if (right === CellState.UNKNOWN)
                                this.cells.set(row, col + 1, CellState.WHITE);
                            if (down === CellState.UNKNOWN)
                                this.cells.set(row + 1, col, CellState.WHITE);
                            if (left === CellState.UNKNOWN)
                                this.cells.set(row, col - 1, CellState.WHITE);
                        }
                        if (whiteNeighbors === 3) {
                            if (up === CellState.UNKNOWN)
                                this.cells.set(row - 1, col, CellState.BLACK);
                            if (right === CellState.UNKNOWN)
                                this.cells.set(row, col + 1, CellState.BLACK);
                            if (down === CellState.UNKNOWN)
                                this.cells.set(row + 1, col, CellState.BLACK);
                            if (left === CellState.UNKNOWN)
                                this.cells.set(row, col - 1, CellState.BLACK);
                        }
                    }
                    else {
                        // Regular snake cell: 1-2 black neighbors
                        if (blackNeighbors > 2 || whiteNeighbors > 3)
                            return false;
                        if (blackNeighbors === 2) {
                            if (up === CellState.UNKNOWN)
                                this.cells.set(row - 1, col, CellState.WHITE);
                            if (right === CellState.UNKNOWN)
                                this.cells.set(row, col + 1, CellState.WHITE);
                            if (down === CellState.UNKNOWN)
                                this.cells.set(row + 1, col, CellState.WHITE);
                            if (left === CellState.UNKNOWN)
                                this.cells.set(row, col - 1, CellState.WHITE);
                        }
                        if (whiteNeighbors === 3) {
                            endPointCount++;
                            if (up === CellState.UNKNOWN)
                                this.cells.set(row - 1, col, CellState.BLACK);
                            if (right === CellState.UNKNOWN)
                                this.cells.set(row, col + 1, CellState.BLACK);
                            if (down === CellState.UNKNOWN)
                                this.cells.set(row + 1, col, CellState.BLACK);
                            if (left === CellState.UNKNOWN)
                                this.cells.set(row, col - 1, CellState.BLACK);
                        }
                    }
                }
                // Count potential endpoints
                if (cell !== CellState.WHITE && blackNeighbors < 2) {
                    endPointCandCount++;
                }
            }
        }
        // Snake needs exactly 2 endpoints
        if (endPointCount > 2)
            return false;
        if (endPointCandCount < 2)
            return false;
        return true;
    }
    /** Snake must be connected */
    connectBlackSolve() {
        const blackPosSet = new Set();
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.BLACK) {
                    const pos = { row, col };
                    if (blackPosSet.size === 0) {
                        blackPosSet.add(posKey(pos));
                        this.collectConnectedBlack(pos, blackPosSet);
                    }
                    else if (!blackPosSet.has(posKey(pos))) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    collectConnectedBlack(pos, visited) {
        const { row, col } = pos;
        const tryAdd = (r, c, _from) => {
            if (r < 0 || r >= this.height || c < 0 || c >= this.width)
                return;
            const next = { row: r, col: c };
            const key = posKey(next);
            if (!visited.has(key) && this.cells.get(r, c) !== CellState.WHITE) {
                visited.add(key);
                this.collectConnectedBlack(next, visited);
            }
        };
        tryAdd(row - 1, col, Direction.DOWN);
        tryAdd(row + 1, col, Direction.UP);
        tryAdd(row, col - 1, Direction.RIGHT);
        tryAdd(row, col + 1, Direction.LEFT);
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new SnakeField(this.height, this.width);
        for (const [pos, cell] of this.cells.entries()) {
            cloned.cells.set(pos, cell);
        }
        cloned.leftHints = [...this.leftHints];
        cloned.upHints = [...this.upHints];
        cloned.endPosSet = new Set(this.endPosSet);
        cloned.onRoutePosSet = new Set(this.onRoutePosSet);
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                dump += this.cells.get(row, col);
            }
        }
        return dump;
    }
    isSolved() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.UNKNOWN)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const beforeDump = this.getStateDump();
            if (!this.pondSolve())
                return false;
            if (!this.hintSolve())
                return false;
            if (!this.masuSolve())
                return false;
            if (!this.connectBlackSolve())
                return false;
            changed = this.getStateDump() !== beforeDump;
        }
        return true;
    }
    toString() {
        const lines = [];
        // Header with column hints
        let header = '  ';
        for (let col = 0; col < this.width; col++) {
            header += this.upHints[col] !== null ? String(this.upHints[col]).padStart(1) : ' ';
        }
        lines.push(header);
        for (let row = 0; row < this.height; row++) {
            let line = this.leftHints[row] !== null ? String(this.leftHints[row]).padStart(1) : ' ';
            line += ' ';
            for (let col = 0; col < this.width; col++) {
                if (this.isOnRoutePos(row, col)) {
                    line += '○';
                }
                else if (this.isEndPos(row, col)) {
                    line += '●';
                }
                else {
                    const cell = this.cells.get(row, col);
                    line += cell === CellState.BLACK ? '■' : cell === CellState.WHITE ? '·' : '?';
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
                if (this.cells.get(row, col) === CellState.UNKNOWN) {
                    unknowns.push({ row, col });
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Snake Solver
// ============================================
export class SnakeSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from config */
    static create(height, width, config) {
        const field = new SnakeField(height, width);
        if (config.leftHints) {
            config.leftHints.forEach((hint, row) => {
                if (hint !== null)
                    field.setLeftHint(row, hint);
            });
        }
        if (config.upHints) {
            config.upHints.forEach((hint, col) => {
                if (hint !== null)
                    field.setUpHint(col, hint);
            });
        }
        if (config.endPositions) {
            config.endPositions.forEach(pos => field.setEndPos(pos.row, pos.col));
        }
        if (config.onRoutePositions) {
            config.onRoutePositions.forEach(pos => field.setOnRoutePos(pos.row, pos.col));
        }
        return new SnakeSolver(field);
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
                    cloned.setCell(pos.row, pos.col, CellState.BLACK);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to BLACK (snake)`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setCell(pos.row, pos.col, CellState.WHITE);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to WHITE`,
            },
        ];
    }
}
//# sourceMappingURL=snake.js.map