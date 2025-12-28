/**
 * Double Choco Solver (ダブルチョコ)
 *
 * Rules:
 * 1. The grid is divided into black and white cells (pre-determined)
 * 2. Draw walls to divide the grid into regions (blocks)
 * 3. Each block contains cells of only one color
 * 4. Numbers indicate the size of the block containing that number
 * 5. Each block must be adjacent to exactly one block of the opposite color
 *    with the same shape and size
 * 6. At each intersection (pillar), either 0 or 2+ walls must meet (not exactly 1)
 */
import { posKey, DIRECTIONS, adjacent, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Wall State
// ============================================
var WallState;
(function (WallState) {
    WallState[WallState["UNKNOWN"] = 0] = "UNKNOWN";
    WallState[WallState["EXISTS"] = 1] = "EXISTS";
    WallState[WallState["NOT_EXISTS"] = 2] = "NOT_EXISTS";
})(WallState || (WallState = {}));
// Cell color (pre-determined)
var CellColor;
(function (CellColor) {
    CellColor[CellColor["WHITE"] = 0] = "WHITE";
    CellColor[CellColor["BLACK"] = 1] = "BLACK";
})(CellColor || (CellColor = {}));
// ============================================
// Double Choco Field State
// ============================================
export class DbchokoField {
    height;
    width;
    /** Cell colors (pre-determined) */
    colors;
    /** Numbers (null = no number, -1 = unknown number) */
    numbers;
    /** Horizontal walls (between col and col+1) */
    yokoWall;
    /** Vertical walls (between row and row+1) */
    tateWall;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.colors = new Grid(height, width, () => CellColor.WHITE);
        this.numbers = new Grid(height, width, () => null);
        this.yokoWall = Array.from({ length: height }, () => Array(width - 1).fill(WallState.UNKNOWN));
        this.tateWall = Array.from({ length: height - 1 }, () => Array(width).fill(WallState.UNKNOWN));
    }
    /** Parse puzzle from pzv.jp parameter */
    parseParam(param) {
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let readPos = 0;
        // Parse cell colors (5-bit encoding)
        let bit = 0;
        for (let cnt = 0; cnt < this.height * this.width; cnt++) {
            const mod = cnt % 5;
            if (mod === 0) {
                bit = parseInt(param[readPos], 36);
                readPos++;
            }
            if (mod === 4 || cnt === this.height * this.width - 1) {
                const base = cnt - mod;
                for (let i = 0; i <= mod; i++) {
                    const idx = base + i;
                    if (idx < this.height * this.width) {
                        const row = Math.floor(idx / this.width);
                        const col = idx % this.width;
                        const isBlack = (bit >> (4 - i)) % 2 === 1;
                        this.colors.set(row, col, isBlack ? CellColor.BLACK : CellColor.WHITE);
                    }
                }
            }
        }
        // Parse numbers
        let index = 0;
        for (let i = readPos; i < param.length; i++) {
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
    /** Check if there's a wall between two adjacent cells */
    hasWall(row1, col1, row2, col2) {
        if (row1 === row2) {
            // Horizontal wall
            const minCol = Math.min(col1, col2);
            if (minCol >= 0 && minCol < this.width - 1) {
                return this.yokoWall[row1][minCol];
            }
        }
        else if (col1 === col2) {
            // Vertical wall
            const minRow = Math.min(row1, row2);
            if (minRow >= 0 && minRow < this.height - 1) {
                return this.tateWall[minRow][col1];
            }
        }
        return WallState.EXISTS; // Outside boundary
    }
    /** Set wall between two adjacent cells */
    setWall(row1, col1, row2, col2, state) {
        if (row1 === row2) {
            const minCol = Math.min(col1, col2);
            if (minCol >= 0 && minCol < this.width - 1) {
                this.yokoWall[row1][minCol] = state;
            }
        }
        else if (col1 === col2) {
            const minRow = Math.min(row1, row2);
            if (minRow >= 0 && minRow < this.height - 1) {
                this.tateWall[minRow][col1] = state;
            }
        }
    }
    /** Find connected region with same color, respecting wall constraints */
    findRegion(startRow, startCol, wallMustNotExist, maxSize) {
        const color = this.colors.get(startRow, startCol);
        const positions = [];
        const visited = new Set();
        const queue = [{ row: startRow, col: startCol }];
        while (queue.length > 0) {
            const pos = queue.shift();
            const key = posKey(pos);
            if (visited.has(key))
                continue;
            if (this.colors.get(pos.row, pos.col) !== color)
                continue;
            visited.add(key);
            positions.push(pos);
            if (maxSize !== null && positions.length > maxSize) {
                return positions;
            }
            for (const dir of DIRECTIONS) {
                const next = adjacent(pos, dir);
                if (next.row < 0 || next.row >= this.height ||
                    next.col < 0 || next.col >= this.width)
                    continue;
                const wallState = this.hasWall(pos.row, pos.col, next.row, next.col);
                if (wallMustNotExist) {
                    // Only traverse if wall is confirmed NOT_EXISTS
                    if (wallState !== WallState.NOT_EXISTS)
                        continue;
                }
                else {
                    // Traverse if wall is not confirmed EXISTS
                    if (wallState === WallState.EXISTS)
                        continue;
                }
                queue.push(next);
            }
        }
        return positions;
    }
    // ========== Constraint solving ==========
    /**
     * Number constraint: region size must match number
     */
    roomSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const num = this.numbers.get(y, x);
                if (num === null || num === -1)
                    continue;
                // Find region with confirmed no-walls
                const confirmedRegion = this.findRegion(y, x, true, num);
                if (confirmedRegion.length > num) {
                    return false; // Too large
                }
                // Find potential region (including unknowns)
                const potentialRegion = this.findRegion(y, x, false, num);
                if (potentialRegion.length < num) {
                    return false; // Cannot reach required size
                }
                // If confirmed region equals required size, add walls around it
                if (confirmedRegion.length === num) {
                    const regionSet = new Set(confirmedRegion.map(p => posKey(p)));
                    for (const pos of confirmedRegion) {
                        for (const dir of DIRECTIONS) {
                            const next = adjacent(pos, dir);
                            if (next.row < 0 || next.row >= this.height ||
                                next.col < 0 || next.col >= this.width)
                                continue;
                            if (regionSet.has(posKey(next))) {
                                // Same region - confirm no wall
                                this.setWall(pos.row, pos.col, next.row, next.col, WallState.NOT_EXISTS);
                            }
                            else {
                                // Different region - add wall
                                this.setWall(pos.row, pos.col, next.row, next.col, WallState.EXISTS);
                            }
                        }
                    }
                }
                // If potential region equals required size, confirm all cells belong to same region
                if (potentialRegion.length === num) {
                    const regionSet = new Set(potentialRegion.map(p => posKey(p)));
                    for (const pos of potentialRegion) {
                        for (const dir of DIRECTIONS) {
                            const next = adjacent(pos, dir);
                            if (next.row < 0 || next.row >= this.height ||
                                next.col < 0 || next.col >= this.width)
                                continue;
                            if (regionSet.has(posKey(next))) {
                                this.setWall(pos.row, pos.col, next.row, next.col, WallState.NOT_EXISTS);
                            }
                            else {
                                this.setWall(pos.row, pos.col, next.row, next.col, WallState.EXISTS);
                            }
                        }
                    }
                }
            }
        }
        return true;
    }
    /**
     * Pillar constraint: walls meeting at intersection must be 0 or 2+ (not 1)
     */
    pileSolve() {
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                // Check 4 walls around this intersection
                const wall1 = this.tateWall[y][x]; // left vertical
                const wall2 = this.tateWall[y][x + 1]; // right vertical
                const wall3 = this.yokoWall[y][x]; // top horizontal
                const wall4 = this.yokoWall[y + 1][x]; // bottom horizontal
                let exists = 0;
                let notExists = 0;
                for (const w of [wall1, wall2, wall3, wall4]) {
                    if (w === WallState.EXISTS)
                        exists++;
                    else if (w === WallState.NOT_EXISTS)
                        notExists++;
                }
                // Exactly 1 wall is invalid
                if (exists === 1 && notExists === 3) {
                    return false;
                }
                // If 3 walls are NOT_EXISTS, the 4th must also be NOT_EXISTS
                if (notExists === 3) {
                    if (wall1 === WallState.UNKNOWN)
                        this.tateWall[y][x] = WallState.NOT_EXISTS;
                    if (wall2 === WallState.UNKNOWN)
                        this.tateWall[y][x + 1] = WallState.NOT_EXISTS;
                    if (wall3 === WallState.UNKNOWN)
                        this.yokoWall[y][x] = WallState.NOT_EXISTS;
                    if (wall4 === WallState.UNKNOWN)
                        this.yokoWall[y + 1][x] = WallState.NOT_EXISTS;
                }
                // If 1 wall EXISTS and 2 are NOT_EXISTS, the 4th must be EXISTS
                if (exists === 1 && notExists === 2) {
                    if (wall1 === WallState.UNKNOWN)
                        this.tateWall[y][x] = WallState.EXISTS;
                    if (wall2 === WallState.UNKNOWN)
                        this.tateWall[y][x + 1] = WallState.EXISTS;
                    if (wall3 === WallState.UNKNOWN)
                        this.yokoWall[y][x] = WallState.EXISTS;
                    if (wall4 === WallState.UNKNOWN)
                        this.yokoWall[y + 1][x] = WallState.EXISTS;
                }
            }
        }
        return true;
    }
    /**
     * Color boundary: different colors must have a wall between them
     */
    colorBoundarySolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const color = this.colors.get(y, x);
                // Check right neighbor
                if (x < this.width - 1) {
                    const rightColor = this.colors.get(y, x + 1);
                    if (color !== rightColor) {
                        // Different colors must have a wall
                        this.yokoWall[y][x] = WallState.EXISTS;
                    }
                }
                // Check bottom neighbor
                if (y < this.height - 1) {
                    const bottomColor = this.colors.get(y + 1, x);
                    if (color !== bottomColor) {
                        // Different colors must have a wall
                        this.tateWall[y][x] = WallState.EXISTS;
                    }
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new DbchokoField(this.height, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.colors.set(y, x, this.colors.get(y, x));
                cloned.numbers.set(y, x, this.numbers.get(y, x));
            }
        }
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                cloned.yokoWall[y][x] = this.yokoWall[y][x];
            }
        }
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.tateWall[y][x] = this.tateWall[y][x];
            }
        }
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                dump += this.yokoWall[y][x];
            }
        }
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width; x++) {
                dump += this.tateWall[y][x];
            }
        }
        return dump;
    }
    isSolved() {
        // Check all walls are determined
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                if (this.yokoWall[y][x] === WallState.UNKNOWN)
                    return false;
            }
        }
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.tateWall[y][x] === WallState.UNKNOWN)
                    return false;
            }
        }
        return true;
    }
    solveAndCheck() {
        let str = this.getStateDump();
        if (!this.colorBoundarySolve())
            return false;
        if (!this.roomSolve())
            return false;
        if (!this.pileSolve())
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
                const color = this.colors.get(row, col);
                const num = this.numbers.get(row, col);
                if (num !== null) {
                    line += num === -1 ? '?' : String(num % 10);
                }
                else {
                    line += color === CellColor.BLACK ? '█' : '·';
                }
                if (col < this.width - 1) {
                    const wall = this.yokoWall[row][col];
                    line += wall === WallState.EXISTS ? '|' : wall === WallState.NOT_EXISTS ? ' ' : '?';
                }
            }
            lines.push(line);
            if (row < this.height - 1) {
                let wallLine = '';
                for (let col = 0; col < this.width; col++) {
                    const wall = this.tateWall[row][col];
                    wallLine += wall === WallState.EXISTS ? '-' : wall === WallState.NOT_EXISTS ? ' ' : '?';
                    if (col < this.width - 1) {
                        wallLine += '+';
                    }
                }
                lines.push(wallLine);
            }
        }
        return lines.join('\n');
    }
    /** Get unknown walls for branching */
    getUnknownWalls() {
        const unknowns = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                if (this.yokoWall[y][x] === WallState.UNKNOWN) {
                    unknowns.push({ type: 'yoko', row: y, col: x });
                }
            }
        }
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.tateWall[y][x] === WallState.UNKNOWN) {
                    unknowns.push({ type: 'tate', row: y, col: x });
                }
            }
        }
        return unknowns;
    }
    /** Set wall state */
    setWallState(type, row, col, state) {
        if (type === 'yoko') {
            this.yokoWall[row][col] = state;
        }
        else {
            this.tateWall[row][col] = state;
        }
    }
}
// ============================================
// Double Choco Solver
// ============================================
export class DbchokoSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzv.jp URL format */
    static fromString(height, width, param) {
        const field = new DbchokoField(height, width);
        field.parseParam(param);
        return new DbchokoSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownWalls();
        if (unknowns.length === 0)
            return [];
        const wall = unknowns[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setWallState(wall.type, wall.row, wall.col, 1); // EXISTS
                    return cloned;
                },
                description: `Set ${wall.type} wall at (${wall.row}, ${wall.col}) to EXISTS`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setWallState(wall.type, wall.row, wall.col, 2); // NOT_EXISTS
                    return cloned;
                },
                description: `Set ${wall.type} wall at (${wall.row}, ${wall.col}) to NOT_EXISTS`,
            },
        ];
    }
}
//# sourceMappingURL=dbchoko.js.map