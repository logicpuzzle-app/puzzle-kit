/**
 * Whitelink (White Link) Solver
 *
 * Rules:
 * 1. Divide the grid into rooms by drawing walls
 * 2. White cells have exactly 2 connections (paths without walls)
 * 3. Black cells have exactly 4 connections (all sides open)
 * 4. Black cells cannot be adjacent to each other
 * 5. All white cells must form a single connected region
 */
import { posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Cell and Wall States
// ============================================
export var WhitelinkCellState;
(function (WhitelinkCellState) {
    /** Unknown */
    WhitelinkCellState["UNKNOWN"] = "unknown";
    /** White cell (2 connections) */
    WhitelinkCellState["WHITE"] = "white";
    /** Black cell (4 connections) */
    WhitelinkCellState["BLACK"] = "black";
})(WhitelinkCellState || (WhitelinkCellState = {}));
var WallState;
(function (WallState) {
    /** Unknown */
    WallState["UNKNOWN"] = "unknown";
    /** No wall */
    WallState["NO_WALL"] = "no_wall";
    /** Wall exists */
    WallState["WALL"] = "wall";
})(WallState || (WallState = {}));
// ============================================
// Whitelink Field State
// ============================================
export class WhitelinkField {
    height;
    width;
    /** Cell states (white/black/unknown) */
    cells;
    /** Horizontal walls */
    yokoWall;
    /** Vertical walls */
    tateWall;
    /** Initial hint positions (cells with known pipe shapes) */
    firstPosSet;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, WhitelinkCellState.UNKNOWN);
        this.yokoWall = new Grid(height, width - 1, WallState.UNKNOWN);
        this.tateWall = new Grid(height - 1, width, WallState.UNKNOWN);
        this.firstPosSet = new Set();
    }
    /** Add initial hint position */
    addFirstPos(row, col) {
        this.firstPosSet.add(posKey({ row, col }));
    }
    /** Connection count constraint: white cells have 2 connections, black have 4 */
    nextSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                let wallCount = 0;
                let noWallCount = 0;
                const walls = [
                    y === 0 ? WallState.WALL : this.tateWall.get(y - 1, x),
                    x === this.width - 1 ? WallState.WALL : this.yokoWall.get(y, x),
                    y === this.height - 1 ? WallState.WALL : this.tateWall.get(y, x),
                    x === 0 ? WallState.WALL : this.yokoWall.get(y, x - 1),
                ];
                for (const wall of walls) {
                    if (wall === WallState.WALL)
                        wallCount++;
                    if (wall === WallState.NO_WALL)
                        noWallCount++;
                }
                const cell = this.cells.get(y, x);
                if (cell === WhitelinkCellState.UNKNOWN) {
                    // Determine cell type from wall pattern
                    if ((wallCount === 3 && noWallCount === 1) || noWallCount > 2) {
                        return false;
                    }
                    if (wallCount > 2) {
                        this.cells.set(y, x, WhitelinkCellState.BLACK);
                    }
                    else if (noWallCount !== 0) {
                        this.cells.set(y, x, WhitelinkCellState.WHITE);
                    }
                }
                if (cell === WhitelinkCellState.BLACK) {
                    // Black cells have 4 walls (isolated)
                    if (noWallCount > 0)
                        return false;
                    if (y > 0)
                        this.tateWall.set(y - 1, x, WallState.WALL);
                    if (x < this.width - 1)
                        this.yokoWall.set(y, x, WallState.WALL);
                    if (y < this.height - 1)
                        this.tateWall.set(y, x, WallState.WALL);
                    if (x > 0)
                        this.yokoWall.set(y, x - 1, WallState.WALL);
                }
                else if (cell === WhitelinkCellState.WHITE) {
                    // White cells have exactly 2 connections
                    if (wallCount > 2 || noWallCount > 2)
                        return false;
                    if (noWallCount === 2) {
                        // Close remaining walls
                        if (y > 0 && this.tateWall.get(y - 1, x) === WallState.UNKNOWN) {
                            this.tateWall.set(y - 1, x, WallState.WALL);
                        }
                        if (x < this.width - 1 && this.yokoWall.get(y, x) === WallState.UNKNOWN) {
                            this.yokoWall.set(y, x, WallState.WALL);
                        }
                        if (y < this.height - 1 && this.tateWall.get(y, x) === WallState.UNKNOWN) {
                            this.tateWall.set(y, x, WallState.WALL);
                        }
                        if (x > 0 && this.yokoWall.get(y, x - 1) === WallState.UNKNOWN) {
                            this.yokoWall.set(y, x - 1, WallState.WALL);
                        }
                    }
                    else if (wallCount === 2) {
                        // Open remaining connections
                        if (y > 0 && this.tateWall.get(y - 1, x) === WallState.UNKNOWN) {
                            this.tateWall.set(y - 1, x, WallState.NO_WALL);
                        }
                        if (x < this.width - 1 && this.yokoWall.get(y, x) === WallState.UNKNOWN) {
                            this.yokoWall.set(y, x, WallState.NO_WALL);
                        }
                        if (y < this.height - 1 && this.tateWall.get(y, x) === WallState.UNKNOWN) {
                            this.tateWall.set(y, x, WallState.NO_WALL);
                        }
                        if (x > 0 && this.yokoWall.get(y, x - 1) === WallState.UNKNOWN) {
                            this.yokoWall.set(y, x - 1, WallState.NO_WALL);
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Black cells cannot be adjacent */
    blackSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) === WhitelinkCellState.BLACK) {
                    const adjacents = [
                        { row: y - 1, col: x },
                        { row: y, col: x + 1 },
                        { row: y + 1, col: x },
                        { row: y, col: x - 1 },
                    ];
                    for (const adj of adjacents) {
                        if (adj.row >= 0 && adj.row < this.height && adj.col >= 0 && adj.col < this.width) {
                            const adjCell = this.cells.get(adj.row, adj.col);
                            if (adjCell === WhitelinkCellState.BLACK) {
                                return false;
                            }
                            if (adjCell === WhitelinkCellState.UNKNOWN) {
                                this.cells.set(adj.row, adj.col, WhitelinkCellState.WHITE);
                            }
                        }
                    }
                }
            }
        }
        return true;
    }
    /** White cells must be connected */
    connectSolve() {
        const whiteCells = new Set();
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) === WhitelinkCellState.WHITE) {
                    const pos = { row: y, col: x };
                    if (whiteCells.size === 0) {
                        whiteCells.add(posKey(pos));
                        this.collectConnected(pos, whiteCells);
                    }
                    else {
                        if (!whiteCells.has(posKey(pos))) {
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Collect connected white cells */
    collectConnected(pos, connected) {
        const adjacents = [
            { pos: { row: pos.row - 1, col: pos.col }, wall: pos.row > 0 ? this.tateWall.get(pos.row - 1, pos.col) : null },
            { pos: { row: pos.row, col: pos.col + 1 }, wall: pos.col < this.width - 1 ? this.yokoWall.get(pos.row, pos.col) : null },
            { pos: { row: pos.row + 1, col: pos.col }, wall: pos.row < this.height - 1 ? this.tateWall.get(pos.row, pos.col) : null },
            { pos: { row: pos.row, col: pos.col - 1 }, wall: pos.col > 0 ? this.yokoWall.get(pos.row, pos.col - 1) : null },
        ];
        for (const { pos: nextPos, wall } of adjacents) {
            if (wall !== WallState.WALL && nextPos.row >= 0 && nextPos.row < this.height &&
                nextPos.col >= 0 && nextPos.col < this.width) {
                const key = posKey(nextPos);
                if (!connected.has(key)) {
                    connected.add(key);
                    this.collectConnected(nextPos, connected);
                }
            }
        }
    }
    /** Check odd number of non-wall crossings in each row/column */
    oddSolve() {
        // Check horizontal lines
        for (let y = 0; y < this.height - 1; y++) {
            let unknownCount = 0;
            let noWallCount = 0;
            for (let x = 0; x < this.width; x++) {
                if (this.tateWall.get(y, x) === WallState.UNKNOWN) {
                    unknownCount++;
                }
                else if (this.tateWall.get(y, x) === WallState.NO_WALL) {
                    noWallCount++;
                }
            }
            if (unknownCount === 0 && noWallCount % 2 !== 0) {
                return false;
            }
        }
        // Check vertical lines
        for (let x = 0; x < this.width - 1; x++) {
            let unknownCount = 0;
            let noWallCount = 0;
            for (let y = 0; y < this.height; y++) {
                if (this.yokoWall.get(y, x) === WallState.UNKNOWN) {
                    unknownCount++;
                }
                else if (this.yokoWall.get(y, x) === WallState.NO_WALL) {
                    noWallCount++;
                }
            }
            if (unknownCount === 0 && noWallCount % 2 !== 0) {
                return false;
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new WhitelinkField(this.height, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.cells.set(y, x, this.cells.get(y, x));
            }
        }
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                cloned.yokoWall.set(y, x, this.yokoWall.get(y, x));
            }
        }
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.tateWall.set(y, x, this.tateWall.get(y, x));
            }
        }
        cloned.firstPosSet = new Set(this.firstPosSet);
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                dump += this.yokoWall.get(y, x);
            }
        }
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width; x++) {
                dump += this.tateWall.get(y, x);
            }
        }
        return dump;
    }
    isSolved() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                if (this.yokoWall.get(y, x) === WallState.UNKNOWN)
                    return false;
            }
        }
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.tateWall.get(y, x) === WallState.UNKNOWN)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        const before = this.getStateDump();
        if (!this.nextSolve())
            return false;
        if (!this.blackSolve())
            return false;
        if (this.getStateDump() !== before) {
            return this.solveAndCheck();
        }
        if (!this.oddSolve())
            return false;
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
                line += cell === WhitelinkCellState.WHITE ? 'W' :
                    cell === WhitelinkCellState.BLACK ? 'B' : '.';
                if (x < this.width - 1) {
                    const wall = this.yokoWall.get(y, x);
                    line += wall === WallState.WALL ? '|' : wall === WallState.NO_WALL ? ' ' : '?';
                }
            }
            lines.push(line);
            if (y < this.height - 1) {
                let wallLine = '';
                for (let x = 0; x < this.width; x++) {
                    const wall = this.tateWall.get(y, x);
                    wallLine += wall === WallState.WALL ? '-' : wall === WallState.NO_WALL ? ' ' : '?';
                    if (x < this.width - 1)
                        wallLine += ' ';
                }
                lines.push(wallLine);
            }
        }
        return lines.join('\n');
    }
}
// ============================================
// Whitelink Solver
// ============================================
export class WhitelinkSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    getBranchCandidates(state) {
        // Try branching on unknown walls
        for (let y = 0; y < state.height; y++) {
            for (let x = 0; x < state.width - 1; x++) {
                if (state['yokoWall'].get(y, x) === WallState.UNKNOWN) {
                    return [
                        {
                            apply: (s) => {
                                const cloned = s.clone();
                                cloned['yokoWall'].set(y, x, WallState.WALL);
                                return cloned;
                            },
                            description: `Set horizontal wall at (${y}, ${x}) to WALL`,
                        },
                        {
                            apply: (s) => {
                                const cloned = s.clone();
                                cloned['yokoWall'].set(y, x, WallState.NO_WALL);
                                return cloned;
                            },
                            description: `Set horizontal wall at (${y}, ${x}) to NO_WALL`,
                        },
                    ];
                }
            }
        }
        for (let y = 0; y < state.height - 1; y++) {
            for (let x = 0; x < state.width; x++) {
                if (state['tateWall'].get(y, x) === WallState.UNKNOWN) {
                    return [
                        {
                            apply: (s) => {
                                const cloned = s.clone();
                                cloned['tateWall'].set(y, x, WallState.WALL);
                                return cloned;
                            },
                            description: `Set vertical wall at (${y}, ${x}) to WALL`,
                        },
                        {
                            apply: (s) => {
                                const cloned = s.clone();
                                cloned['tateWall'].set(y, x, WallState.NO_WALL);
                                return cloned;
                            },
                            description: `Set vertical wall at (${y}, ${x}) to NO_WALL`,
                        },
                    ];
                }
            }
        }
        return [];
    }
}
//# sourceMappingURL=whitelink.js.map