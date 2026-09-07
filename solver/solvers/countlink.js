/**
 * Countlink Solver
 *
 * Rules:
 * 1. Draw a line through the centers of cells to form a single closed loop
 * 2. The line passes through each cell at most once
 * 3. Numbers indicate how many of the 4 adjacent cells the line passes through
 */
import { posKey, DIRECTIONS, adjacent } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Countlink Types
// ============================================
export var LineState;
(function (LineState) {
    LineState["UNKNOWN"] = "unknown";
    LineState["LINE"] = "line";
    LineState["EMPTY"] = "empty";
})(LineState || (LineState = {}));
// ============================================
// Countlink Field State
// ============================================
export class CountlinkField {
    height;
    width;
    /** Whether each cell has a line passing through */
    cells;
    /** Number clues */
    clues;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => LineState.UNKNOWN);
        this.clues = new Grid(height, width, () => null);
    }
    /** Set a clue */
    setClue(row, col, count) {
        this.clues.set(row, col, count);
    }
    /** Count adjacent cells with lines */
    countAdjacentLines(row, col) {
        let confirmed = 0;
        let possible = 0;
        for (const dir of DIRECTIONS) {
            const adj = adjacent({ row, col }, dir);
            if (adj.row < 0 || adj.row >= this.height || adj.col < 0 || adj.col >= this.width) {
                continue;
            }
            const state = this.cells.get(adj.row, adj.col);
            if (state === LineState.LINE) {
                confirmed++;
                possible++;
            }
            else if (state === LineState.UNKNOWN) {
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
                if (clue === null)
                    continue;
                const { confirmed, possible } = this.countAdjacentLines(y, x);
                // Check constraints
                if (clue < confirmed)
                    return false;
                if (clue > possible)
                    return false;
                // If confirmed equals clue, remaining unknowns must be empty
                if (clue === confirmed) {
                    for (const dir of DIRECTIONS) {
                        const adj = adjacent({ row: y, col: x }, dir);
                        if (adj.row < 0 || adj.row >= this.height || adj.col < 0 || adj.col >= this.width) {
                            continue;
                        }
                        if (this.cells.get(adj.row, adj.col) === LineState.UNKNOWN) {
                            this.cells.set(adj.row, adj.col, LineState.EMPTY);
                        }
                    }
                }
                // If possible equals clue, all unknowns must be line
                if (clue === possible) {
                    for (const dir of DIRECTIONS) {
                        const adj = adjacent({ row: y, col: x }, dir);
                        if (adj.row < 0 || adj.row >= this.height || adj.col < 0 || adj.col >= this.width) {
                            continue;
                        }
                        if (this.cells.get(adj.row, adj.col) === LineState.UNKNOWN) {
                            this.cells.set(adj.row, adj.col, LineState.LINE);
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Loop constraint: each line cell must connect to exactly 2 neighbors */
    loopSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) !== LineState.LINE)
                    continue;
                let lineNeighbors = 0;
                let unknownNeighbors = 0;
                const unknownPositions = [];
                for (const dir of DIRECTIONS) {
                    const adj = adjacent({ row: y, col: x }, dir);
                    if (adj.row < 0 || adj.row >= this.height || adj.col < 0 || adj.col >= this.width) {
                        continue;
                    }
                    const state = this.cells.get(adj.row, adj.col);
                    if (state === LineState.LINE) {
                        lineNeighbors++;
                    }
                    else if (state === LineState.UNKNOWN) {
                        unknownNeighbors++;
                        unknownPositions.push(adj);
                    }
                }
                if (lineNeighbors > 2)
                    return false;
                if (lineNeighbors + unknownNeighbors < 2)
                    return false;
                const needMore = 2 - lineNeighbors;
                if (needMore === 0) {
                    // Close remaining unknowns
                    for (const pos of unknownPositions) {
                        this.cells.set(pos.row, pos.col, LineState.EMPTY);
                    }
                }
                else if (unknownNeighbors === needMore) {
                    // Must connect all unknowns
                    for (const pos of unknownPositions) {
                        this.cells.set(pos.row, pos.col, LineState.LINE);
                    }
                }
            }
        }
        return true;
    }
    /** Connectivity constraint - check no isolated line segments */
    connectSolve() {
        // Find all line cells
        const lineCells = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) === LineState.LINE) {
                    lineCells.push({ row: y, col: x });
                }
            }
        }
        if (lineCells.length === 0)
            return true;
        // Check if all line cells are connected through line/unknown cells
        const visited = new Set();
        const queue = [lineCells[0]];
        while (queue.length > 0) {
            const pos = queue.shift();
            const key = posKey(pos);
            if (visited.has(key))
                continue;
            visited.add(key);
            for (const dir of DIRECTIONS) {
                const adj = adjacent(pos, dir);
                if (adj.row < 0 || adj.row >= this.height || adj.col < 0 || adj.col >= this.width) {
                    continue;
                }
                const state = this.cells.get(adj.row, adj.col);
                if (state !== LineState.EMPTY && !visited.has(posKey(adj))) {
                    queue.push(adj);
                }
            }
        }
        // All line cells must be reachable
        for (const cell of lineCells) {
            if (!visited.has(posKey(cell))) {
                return false;
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new CountlinkField(this.height, this.width);
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
                if (this.cells.get(y, x) === LineState.UNKNOWN)
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
            if (!this.loopSolve())
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
                    line += String(clue);
                }
                else if (cell === LineState.LINE) {
                    line += '*';
                }
                else if (cell === LineState.EMPTY) {
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
                if (this.cells.get(y, x) === LineState.UNKNOWN) {
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
// Countlink Solver
// ============================================
export class CountlinkSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzprv3 URL parameter */
    static fromString(height, width, param) {
        const field = new CountlinkField(height, width);
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
                    const num = parseInt(ch, 16);
                    if (!isNaN(num) && num >= 0 && num <= 4) {
                        field.setClue(row, col, num);
                    }
                }
                index++;
            }
        }
        return new CountlinkSolver(field);
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
                    cloned.setCell(row, col, LineState.LINE);
                    return cloned;
                },
                description: `Set (${row}, ${col}) to LINE`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setCell(row, col, LineState.EMPTY);
                    return cloned;
                },
                description: `Set (${row}, ${col}) to EMPTY`,
            },
        ];
    }
}
//# sourceMappingURL=countlink.js.map