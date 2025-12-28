/**
 * Kurochute (Kurodoko variant) Solver
 *
 * Rules:
 * 1. Paint some cells black
 * 2. Numbers indicate the count of black cells that can be seen in a straight line
 *    (horizontally and vertically) from that cell (not including the cell itself)
 * 3. Black cells cannot be adjacent orthogonally
 * 4. All white cells must be connected
 */
import { CellState, posKey, DIRECTIONS, adjacent } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Kurochute Field State
// ============================================
export class KurochuteField {
    height;
    width;
    /** Cell states */
    cells;
    /** Number clues */
    clues;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.clues = new Grid(height, width, () => null);
    }
    /** Set a clue */
    setClue(row, col, count) {
        this.clues.set(row, col, count);
        this.cells.set(row, col, CellState.WHITE); // Clue cells are white
    }
    /** Count visible black cells in all directions */
    countVisibleBlack(row, col) {
        let confirmed = 0;
        let possible = 0;
        const directions = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
        ];
        for (const [dy, dx] of directions) {
            let y = row + dy;
            let x = col + dx;
            while (y >= 0 && y < this.height && x >= 0 && x < this.width) {
                const state = this.cells.get(y, x);
                if (state === CellState.BLACK) {
                    confirmed++;
                    possible++;
                    break; // Stop at first black cell
                }
                else if (state === CellState.UNKNOWN) {
                    possible++;
                    break; // Might be black, stop counting
                }
                // WHITE: continue looking
                y += dy;
                x += dx;
            }
        }
        return { confirmed, possible };
    }
    /** Get first unknown cell in a direction */
    getFirstUnknownInDirection(row, col, dy, dx) {
        let y = row + dy;
        let x = col + dx;
        while (y >= 0 && y < this.height && x >= 0 && x < this.width) {
            const state = this.cells.get(y, x);
            if (state === CellState.BLACK)
                return null;
            if (state === CellState.UNKNOWN)
                return { row: y, col: x };
            y += dy;
            x += dx;
        }
        return null;
    }
    /** Clue constraint */
    clueSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const clue = this.clues.get(y, x);
                if (clue === null)
                    continue;
                const { confirmed, possible } = this.countVisibleBlack(y, x);
                // Check constraints
                if (clue < confirmed)
                    return false;
                if (clue > possible)
                    return false;
                // If confirmed equals clue, all unknowns in line of sight must be white
                if (clue === confirmed) {
                    const directions = [
                        [-1, 0],
                        [1, 0],
                        [0, -1],
                        [0, 1],
                    ];
                    for (const [dy, dx] of directions) {
                        const unknown = this.getFirstUnknownInDirection(y, x, dy, dx);
                        if (unknown) {
                            this.cells.set(unknown.row, unknown.col, CellState.WHITE);
                        }
                    }
                }
                // If possible equals clue, all unknowns must be black
                if (clue === possible && clue > confirmed) {
                    const directions = [
                        [-1, 0],
                        [1, 0],
                        [0, -1],
                        [0, 1],
                    ];
                    for (const [dy, dx] of directions) {
                        const unknown = this.getFirstUnknownInDirection(y, x, dy, dx);
                        if (unknown) {
                            this.cells.set(unknown.row, unknown.col, CellState.BLACK);
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
        const cloned = new KurochuteField(this.height, this.width);
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
                if (clue !== null) {
                    line += String(clue % 10);
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
// Kurochute Solver
// ============================================
export class KurochuteSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzprv3 URL parameter */
    static fromString(height, width, param) {
        const field = new KurochuteField(height, width);
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
                    let num;
                    if (ch === '-') {
                        num = parseInt(param[i + 1] + param[i + 2], 16);
                        i += 2;
                    }
                    else if (ch === '+') {
                        num = parseInt(param[i + 1] + param[i + 2] + param[i + 3], 16);
                        i += 3;
                    }
                    else {
                        num = parseInt(ch, 16);
                    }
                    if (!isNaN(num)) {
                        field.setClue(row, col, num);
                    }
                }
                index++;
            }
        }
        return new KurochuteSolver(field);
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
//# sourceMappingURL=kurochute.js.map