/**
 * Yajikazu Solver
 *
 * Rules:
 * 1. Paint some cells black
 * 2. Arrow clues indicate the number of black cells in that direction
 * 3. Black cells cannot be adjacent orthogonally
 * 4. All white cells must be connected
 * 5. Clue cells are always white
 */
import { CellState, posKey, DIRECTIONS, adjacent } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Yajikazu Field State
// ============================================
export class YajikazuField {
    height;
    width;
    /** Cell states */
    cells;
    /** Clues */
    clues;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.clues = new Grid(height, width, () => null);
    }
    /** Set a clue */
    setClue(row, col, direction, count) {
        this.clues.set(row, col, { direction, count });
        this.cells.set(row, col, CellState.WHITE); // Clue cells are white
    }
    /** Get cells in a direction from a position */
    getCellsInDirection(row, col, direction) {
        const cells = [];
        const dy = direction === 'up' ? -1 : direction === 'down' ? 1 : 0;
        const dx = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
        let y = row + dy;
        let x = col + dx;
        while (y >= 0 && y < this.height && x >= 0 && x < this.width) {
            cells.push({ row: y, col: x });
            y += dy;
            x += dx;
        }
        return cells;
    }
    /** Count black cells in direction */
    countBlackInDirection(row, col, direction) {
        const cells = this.getCellsInDirection(row, col, direction);
        let confirmed = 0;
        let possible = 0;
        for (const cell of cells) {
            const state = this.cells.get(cell.row, cell.col);
            if (state === CellState.BLACK) {
                confirmed++;
                possible++;
            }
            else if (state === CellState.UNKNOWN) {
                possible++;
            }
        }
        return { confirmed, possible };
    }
    /** Clue constraint */
    clueSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const clue = this.clues.get(y, x);
                if (!clue)
                    continue;
                const { confirmed, possible } = this.countBlackInDirection(y, x, clue.direction);
                // Check constraints
                if (clue.count < confirmed)
                    return false;
                if (clue.count > possible)
                    return false;
                const cells = this.getCellsInDirection(y, x, clue.direction);
                // If confirmed equals count, remaining unknowns must be white
                if (clue.count === confirmed) {
                    for (const cell of cells) {
                        if (this.cells.get(cell.row, cell.col) === CellState.UNKNOWN) {
                            this.cells.set(cell.row, cell.col, CellState.WHITE);
                        }
                    }
                }
                // If possible equals count, all unknowns must be black
                if (clue.count === possible) {
                    for (const cell of cells) {
                        if (this.cells.get(cell.row, cell.col) === CellState.UNKNOWN) {
                            this.cells.set(cell.row, cell.col, CellState.BLACK);
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Adjacent black constraint */
    adjacentSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) !== CellState.BLACK)
                    continue;
                // Black cells cannot be adjacent
                for (const dir of DIRECTIONS) {
                    const adj = adjacent({ row: y, col: x }, dir);
                    if (adj.row < 0 || adj.row >= this.height || adj.col < 0 || adj.col >= this.width) {
                        continue;
                    }
                    const adjState = this.cells.get(adj.row, adj.col);
                    if (adjState === CellState.BLACK)
                        return false;
                    if (adjState === CellState.UNKNOWN) {
                        this.cells.set(adj.row, adj.col, CellState.WHITE);
                    }
                }
            }
        }
        return true;
    }
    /** White connectivity constraint */
    connectSolve() {
        const whitePosSet = new Set();
        let firstWhitePos = null;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) === CellState.WHITE) {
                    const pos = { row: y, col: x };
                    if (!firstWhitePos) {
                        firstWhitePos = pos;
                        this.floodFillWhite(pos, whitePosSet);
                    }
                    else if (!whitePosSet.has(posKey(pos))) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    /** Flood fill through non-black cells */
    floodFillWhite(pos, visited) {
        const key = posKey(pos);
        if (visited.has(key))
            return;
        visited.add(key);
        for (const dir of DIRECTIONS) {
            const next = adjacent(pos, dir);
            if (next.row < 0 || next.row >= this.height || next.col < 0 || next.col >= this.width) {
                continue;
            }
            if (this.cells.get(next.row, next.col) !== CellState.BLACK) {
                this.floodFillWhite(next, visited);
            }
        }
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new YajikazuField(this.height, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.cells.set(y, x, this.cells.get(y, x));
                cloned.clues.set(y, x, this.clues.get(y, x));
            }
        }
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                dump += this.cells.get(y, x);
            }
        }
        return dump;
    }
    isSolved() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) === CellState.UNKNOWN)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const befStr = this.getStateDump();
            if (!this.clueSolve())
                return false;
            if (!this.adjacentSolve())
                return false;
            changed = this.getStateDump() !== befStr;
        }
        if (!this.connectSolve())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        for (let y = 0; y < this.height; y++) {
            let line = '';
            for (let x = 0; x < this.width; x++) {
                const cell = this.cells.get(y, x);
                const clue = this.clues.get(y, x);
                if (clue) {
                    const arrow = clue.direction === 'up'
                        ? '↑'
                        : clue.direction === 'down'
                            ? '↓'
                            : clue.direction === 'left'
                                ? '←'
                                : '→';
                    line += arrow + clue.count;
                }
                else if (cell === CellState.BLACK) {
                    line += '#';
                }
                else if (cell === CellState.WHITE) {
                    line += '.';
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
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) === CellState.UNKNOWN) {
                    return { row: y, col: x };
                }
            }
        }
        return null;
    }
    /** Set cell state */
    setCell(row, col, state) {
        this.cells.set(row, col, state);
    }
}
// ============================================
// Yajikazu Solver
// ============================================
export class YajikazuSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzprv3 URL parameter */
    static fromString(height, width, param) {
        const field = new YajikazuField(height, width);
        // Parse parameter - format varies by pzprv3
        // Common format: direction (1-4) + number encoded together
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        for (let i = 0; i < param.length; i++) {
            const ch = param[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index += interval + 1;
            }
            else {
                const row = Math.floor(index / width);
                const col = index % width;
                if (row < height && col < width) {
                    // Parse direction and count
                    // Format: direction (0-3) * 16 + count, or special encoding
                    const code = parseInt(ch, 36);
                    if (!isNaN(code)) {
                        // Simple format: low 2 bits = direction, rest = count
                        // Direction: 0=up, 1=right, 2=down, 3=left
                        const directions = ['up', 'right', 'down', 'left'];
                        if (ch === '.') {
                            // Empty clue
                        }
                        else if (ch >= '0' && ch <= '9') {
                            // Check next character for direction
                            if (i + 1 < param.length) {
                                const dirCode = parseInt(param[i + 1], 10);
                                if (dirCode >= 1 && dirCode <= 4) {
                                    const count = parseInt(ch, 10);
                                    const direction = directions[dirCode - 1];
                                    field.setClue(row, col, direction, count);
                                    i++;
                                }
                            }
                        }
                    }
                }
                index++;
            }
        }
        return new YajikazuSolver(field);
    }
    getBranchCandidates(state) {
        const branchInfo = state.getBranchInfo();
        if (!branchInfo)
            return [];
        const { row, col } = branchInfo;
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setCell(row, col, CellState.WHITE);
                    return cloned;
                },
                description: `Set (${row}, ${col}) to WHITE`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setCell(row, col, CellState.BLACK);
                    return cloned;
                },
                description: `Set (${row}, ${col}) to BLACK`,
            },
        ];
    }
}
//# sourceMappingURL=yajikazu.js.map