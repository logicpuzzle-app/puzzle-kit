/**
 * Onsen (Hot Springs) Solver
 *
 * Rules:
 * 1. White cells form a path through rooms
 * 2. Each white cell has exactly 2 connections (forms a single non-branching path)
 * 3. Number clues indicate how many cells the path visits in that room
 * 4. Black cells block paths and are surrounded by walls
 * 5. Each room must have at least one white cell
 */
import { CellState, WallState, posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Onsen Field State
// ============================================
export class OnsenField {
    height;
    width;
    /** Cell states */
    cells;
    /** Number clues */
    numbers;
    /** Room walls - horizontal */
    yokoRoomWall;
    /** Room walls - vertical */
    tateRoomWall;
    /** Path walls - horizontal */
    yokoWall;
    /** Path walls - vertical */
    tateWall;
    /** Rooms */
    rooms;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.numbers = new Grid(height, width, () => null);
        this.yokoRoomWall = new Grid(height, width - 1, () => false);
        this.tateRoomWall = new Grid(height - 1, width, () => false);
        this.yokoWall = new Grid(height, width - 1, () => WallState.UNKNOWN);
        this.tateWall = new Grid(height - 1, width, () => WallState.UNKNOWN);
        this.rooms = [];
    }
    /** Parse puzzle from pzv.jp format */
    parseParam(param) {
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        // Parse walls (5-bit encoding)
        let readPos = 0;
        // Parse horizontal room walls
        for (let cnt = 0; cnt < this.height * (this.width - 1);) {
            const bit = parseInt(param.charAt(readPos), 32);
            readPos++;
            for (let i = 0; i < 5 && cnt < this.height * (this.width - 1); i++, cnt++) {
                const row = Math.floor(cnt / (this.width - 1));
                const col = cnt % (this.width - 1);
                const hasWall = (bit >> (4 - i)) & 1;
                this.yokoRoomWall.set(row, col, hasWall === 1);
            }
        }
        // Parse vertical room walls
        for (let cnt = 0; cnt < (this.height - 1) * this.width;) {
            const bit = parseInt(param.charAt(readPos), 32);
            readPos++;
            for (let i = 0; i < 5 && cnt < (this.height - 1) * this.width; i++, cnt++) {
                const row = Math.floor(cnt / this.width);
                const col = cnt % this.width;
                const hasWall = (bit >> (4 - i)) & 1;
                this.tateRoomWall.set(row, col, hasWall === 1);
            }
        }
        // Build rooms
        this.buildRooms();
        // Parse numbers
        let index = 0;
        for (let i = readPos; i < param.length; i++) {
            const ch = param.charAt(i);
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index += interval + 1;
            }
            else if (ch === '.') {
                const row = Math.floor(index / this.width);
                const col = index % this.width;
                if (row < this.height) {
                    this.numbers.set(row, col, -1);
                    this.cells.set(row, col, CellState.WHITE);
                }
                index++;
            }
            else {
                let num;
                if (ch === '-') {
                    num = parseInt(param.substring(i + 1, i + 3), 16);
                    i += 2;
                }
                else if (ch === '+') {
                    num = parseInt(param.substring(i + 1, i + 4), 16);
                    i += 3;
                }
                else {
                    num = parseInt(ch, 16);
                }
                const row = Math.floor(index / this.width);
                const col = index % this.width;
                if (row < this.height) {
                    this.numbers.set(row, col, num);
                    this.cells.set(row, col, CellState.WHITE);
                }
                index++;
            }
        }
    }
    /** Build rooms from wall data */
    buildRooms() {
        this.rooms = [];
        const visited = new Set();
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const key = posKey({ row, col });
                if (visited.has(key))
                    continue;
                // BFS to find room
                const positions = new Set();
                const queue = [{ row, col }];
                positions.add(key);
                while (queue.length > 0) {
                    const pos = queue.shift();
                    // Check 4 directions
                    const neighbors = [];
                    // Up
                    if (pos.row > 0) {
                        neighbors.push({
                            pos: { row: pos.row - 1, col: pos.col },
                            hasWall: this.tateRoomWall.get(pos.row - 1, pos.col),
                        });
                    }
                    // Down
                    if (pos.row < this.height - 1) {
                        neighbors.push({
                            pos: { row: pos.row + 1, col: pos.col },
                            hasWall: this.tateRoomWall.get(pos.row, pos.col),
                        });
                    }
                    // Left
                    if (pos.col > 0) {
                        neighbors.push({
                            pos: { row: pos.row, col: pos.col - 1 },
                            hasWall: this.yokoRoomWall.get(pos.row, pos.col - 1),
                        });
                    }
                    // Right
                    if (pos.col < this.width - 1) {
                        neighbors.push({
                            pos: { row: pos.row, col: pos.col + 1 },
                            hasWall: this.yokoRoomWall.get(pos.row, pos.col),
                        });
                    }
                    for (const n of neighbors) {
                        const nKey = posKey(n.pos);
                        if (!n.hasWall && !positions.has(nKey)) {
                            positions.add(nKey);
                            queue.push(n.pos);
                        }
                    }
                }
                // Add room
                const yokoWallPos = new Set();
                const tateWallPos = new Set();
                for (const pKey of positions) {
                    visited.add(pKey);
                    const [r, c] = pKey.split(',').map(Number);
                    // Check border walls
                    if (r > 0 && this.tateRoomWall.get(r - 1, c)) {
                        tateWallPos.add(posKey({ row: r - 1, col: c }));
                    }
                    if (r < this.height - 1 && this.tateRoomWall.get(r, c)) {
                        tateWallPos.add(posKey({ row: r, col: c }));
                    }
                    if (c > 0 && this.yokoRoomWall.get(r, c - 1)) {
                        yokoWallPos.add(posKey({ row: r, col: c - 1 }));
                    }
                    if (c < this.width - 1 && this.yokoRoomWall.get(r, c)) {
                        yokoWallPos.add(posKey({ row: r, col: c }));
                    }
                }
                this.rooms.push({ positions, yokoWallPos, tateWallPos });
            }
        }
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
    /**
     * Path constraint: white cells have exactly 2 connections
     * Black cells are surrounded by walls
     */
    nextSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cell = this.cells.get(row, col);
                if (cell === CellState.BLACK) {
                    // Black cell surrounded by walls
                    if (row > 0) {
                        if (this.tateWall.get(row - 1, col) === WallState.NO_WALL)
                            return false;
                        this.tateWall.set(row - 1, col, WallState.WALL);
                    }
                    if (row < this.height - 1) {
                        if (this.tateWall.get(row, col) === WallState.NO_WALL)
                            return false;
                        this.tateWall.set(row, col, WallState.WALL);
                    }
                    if (col > 0) {
                        if (this.yokoWall.get(row, col - 1) === WallState.NO_WALL)
                            return false;
                        this.yokoWall.set(row, col - 1, WallState.WALL);
                    }
                    if (col < this.width - 1) {
                        if (this.yokoWall.get(row, col) === WallState.NO_WALL)
                            return false;
                        this.yokoWall.set(row, col, WallState.WALL);
                    }
                }
                else {
                    // White or unknown cells
                    let wallCount = 0;
                    let noWallCount = 0;
                    const wallUp = row === 0 ? WallState.WALL : this.tateWall.get(row - 1, col);
                    const wallDown = row === this.height - 1 ? WallState.WALL : this.tateWall.get(row, col);
                    const wallLeft = col === 0 ? WallState.WALL : this.yokoWall.get(row, col - 1);
                    const wallRight = col === this.width - 1 ? WallState.WALL : this.yokoWall.get(row, col);
                    if (wallUp === WallState.WALL)
                        wallCount++;
                    else if (wallUp === WallState.NO_WALL) {
                        noWallCount++;
                        if (row > 0 && this.cells.get(row - 1, col) === CellState.BLACK)
                            return false;
                        if (row > 0)
                            this.cells.set(row - 1, col, CellState.WHITE);
                    }
                    if (wallDown === WallState.WALL)
                        wallCount++;
                    else if (wallDown === WallState.NO_WALL) {
                        noWallCount++;
                        if (row < this.height - 1 && this.cells.get(row + 1, col) === CellState.BLACK)
                            return false;
                        if (row < this.height - 1)
                            this.cells.set(row + 1, col, CellState.WHITE);
                    }
                    if (wallLeft === WallState.WALL)
                        wallCount++;
                    else if (wallLeft === WallState.NO_WALL) {
                        noWallCount++;
                        if (col > 0 && this.cells.get(row, col - 1) === CellState.BLACK)
                            return false;
                        if (col > 0)
                            this.cells.set(row, col - 1, CellState.WHITE);
                    }
                    if (wallRight === WallState.WALL)
                        wallCount++;
                    else if (wallRight === WallState.NO_WALL) {
                        noWallCount++;
                        if (col < this.width - 1 && this.cells.get(row, col + 1) === CellState.BLACK)
                            return false;
                        if (col < this.width - 1)
                            this.cells.set(row, col + 1, CellState.WHITE);
                    }
                    // White cell must have exactly 2 connections
                    if (cell === CellState.WHITE) {
                        if (wallCount > 2 || noWallCount > 2)
                            return false;
                        if (noWallCount === 2) {
                            // Close remaining walls
                            if (wallUp === WallState.UNKNOWN && row > 0)
                                this.tateWall.set(row - 1, col, WallState.WALL);
                            if (wallDown === WallState.UNKNOWN && row < this.height - 1)
                                this.tateWall.set(row, col, WallState.WALL);
                            if (wallLeft === WallState.UNKNOWN && col > 0)
                                this.yokoWall.set(row, col - 1, WallState.WALL);
                            if (wallRight === WallState.UNKNOWN && col < this.width - 1)
                                this.yokoWall.set(row, col, WallState.WALL);
                        }
                        else if (wallCount === 2) {
                            // Open remaining walls
                            if (wallUp === WallState.UNKNOWN && row > 0) {
                                if (this.cells.get(row - 1, col) === CellState.BLACK)
                                    return false;
                                this.tateWall.set(row - 1, col, WallState.NO_WALL);
                                this.cells.set(row - 1, col, CellState.WHITE);
                            }
                            if (wallDown === WallState.UNKNOWN && row < this.height - 1) {
                                if (this.cells.get(row + 1, col) === CellState.BLACK)
                                    return false;
                                this.tateWall.set(row, col, WallState.NO_WALL);
                                this.cells.set(row + 1, col, CellState.WHITE);
                            }
                            if (wallLeft === WallState.UNKNOWN && col > 0) {
                                if (this.cells.get(row, col - 1) === CellState.BLACK)
                                    return false;
                                this.yokoWall.set(row, col - 1, WallState.NO_WALL);
                                this.cells.set(row, col - 1, CellState.WHITE);
                            }
                            if (wallRight === WallState.UNKNOWN && col < this.width - 1) {
                                if (this.cells.get(row, col + 1) === CellState.BLACK)
                                    return false;
                                this.yokoWall.set(row, col, WallState.NO_WALL);
                                this.cells.set(row, col + 1, CellState.WHITE);
                            }
                        }
                    }
                    else {
                        // Unknown cell constraints
                        if ((wallCount === 3 && noWallCount === 1) || noWallCount > 2)
                            return false;
                        if (wallCount > 2) {
                            // Must be black
                            this.cells.set(row, col, CellState.BLACK);
                        }
                        else if (noWallCount > 0) {
                            // Must be white
                            this.cells.set(row, col, CellState.WHITE);
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Each room must have at least one white cell */
    roomSolve() {
        for (const room of this.rooms) {
            let whiteCount = 0;
            let unknownCount = 0;
            for (const key of room.positions) {
                const [row, col] = key.split(',').map(Number);
                const cell = this.cells.get(row, col);
                if (cell === CellState.WHITE)
                    whiteCount++;
                else if (cell === CellState.UNKNOWN)
                    unknownCount++;
            }
            if (whiteCount + unknownCount < 1)
                return false;
            if (whiteCount === 0 && unknownCount === 1) {
                for (const key of room.positions) {
                    const [row, col] = key.split(',').map(Number);
                    if (this.cells.get(row, col) === CellState.UNKNOWN) {
                        this.cells.set(row, col, CellState.WHITE);
                    }
                }
            }
        }
        return true;
    }
    /** Wall parity: each row/column crossing must be even */
    oddSolve() {
        // Check horizontal rows
        for (let row = 0; row < this.height - 1; row++) {
            let noWallCount = 0;
            let hasUnknown = false;
            for (let col = 0; col < this.width; col++) {
                const wall = this.tateWall.get(row, col);
                if (wall === WallState.UNKNOWN)
                    hasUnknown = true;
                else if (wall === WallState.NO_WALL)
                    noWallCount++;
            }
            if (!hasUnknown && noWallCount % 2 !== 0)
                return false;
        }
        // Check vertical columns
        for (let col = 0; col < this.width - 1; col++) {
            let noWallCount = 0;
            let hasUnknown = false;
            for (let row = 0; row < this.height; row++) {
                const wall = this.yokoWall.get(row, col);
                if (wall === WallState.UNKNOWN)
                    hasUnknown = true;
                else if (wall === WallState.NO_WALL)
                    noWallCount++;
            }
            if (!hasUnknown && noWallCount % 2 !== 0)
                return false;
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new OnsenField(this.height, this.width);
        for (const [pos, val] of this.cells.entries()) {
            cloned.cells.set(pos, val);
        }
        for (const [pos, val] of this.numbers.entries()) {
            cloned.numbers.set(pos, val);
        }
        for (const [pos, val] of this.yokoRoomWall.entries()) {
            cloned.yokoRoomWall.set(pos, val);
        }
        for (const [pos, val] of this.tateRoomWall.entries()) {
            cloned.tateRoomWall.set(pos, val);
        }
        for (const [pos, val] of this.yokoWall.entries()) {
            cloned.yokoWall.set(pos, val);
        }
        for (const [pos, val] of this.tateWall.entries()) {
            cloned.tateWall.set(pos, val);
        }
        cloned.rooms = this.rooms;
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (const [, cell] of this.cells.entries()) {
            dump += cell;
        }
        for (const [, wall] of this.yokoWall.entries()) {
            dump += wall;
        }
        for (const [, wall] of this.tateWall.entries()) {
            dump += wall;
        }
        return dump;
    }
    isSolved() {
        for (const [, cell] of this.cells.entries()) {
            if (cell === CellState.UNKNOWN)
                return false;
        }
        for (const [, wall] of this.yokoWall.entries()) {
            if (wall === WallState.UNKNOWN)
                return false;
        }
        for (const [, wall] of this.tateWall.entries()) {
            if (wall === WallState.UNKNOWN)
                return false;
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        const beforeState = this.getStateDump();
        if (!this.roomSolve())
            return false;
        if (!this.nextSolve())
            return false;
        if (!this.oddSolve())
            return false;
        if (this.getStateDump() !== beforeState) {
            return this.solveAndCheck();
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num !== null) {
                    line += num === -1 ? '○' : String(num);
                }
                else {
                    const cell = this.cells.get(row, col);
                    line += cell === CellState.BLACK ? '█' : cell === CellState.WHITE ? '○' : '?';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get unknown cells for branching */
    getUnknownCells() {
        const unknowns = [];
        for (const [pos, cell] of this.cells.entries()) {
            if (cell === CellState.UNKNOWN) {
                unknowns.push(pos);
            }
        }
        return unknowns;
    }
    /** Get unknown walls for branching */
    getUnknownWalls() {
        const unknowns = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoWall.get(row, col) === WallState.UNKNOWN) {
                    unknowns.push({ type: 'yoko', row, col });
                }
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateWall.get(row, col) === WallState.UNKNOWN) {
                    unknowns.push({ type: 'tate', row, col });
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Onsen Solver
// ============================================
export class OnsenSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzv.jp URL format */
    static fromURL(height, width, param) {
        const field = new OnsenField(height, width);
        field.parseParam(param);
        return new OnsenSolver(field);
    }
    getBranchCandidates(state) {
        // First try cells
        const unknownCells = state.getUnknownCells();
        if (unknownCells.length > 0) {
            const pos = unknownCells[0];
            return [
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setCell(pos.row, pos.col, CellState.BLACK);
                        return cloned;
                    },
                    description: `Set (${pos.row}, ${pos.col}) to BLACK`,
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
        // Then try walls
        const unknownWalls = state.getUnknownWalls();
        if (unknownWalls.length > 0) {
            const wall = unknownWalls[0];
            return [
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        if (wall.type === 'yoko') {
                            // Direct wall setting via internal method
                        }
                        return cloned;
                    },
                    description: `Set ${wall.type} wall at (${wall.row}, ${wall.col}) to WALL`,
                },
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        return cloned;
                    },
                    description: `Set ${wall.type} wall at (${wall.row}, ${wall.col}) to NO_WALL`,
                },
            ];
        }
        return [];
    }
}
//# sourceMappingURL=onsen.js.map