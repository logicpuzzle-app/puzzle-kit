/**
 * Rassi Solver
 *
 * Rules:
 * 1. Divide the grid into rooms using walls
 * 2. Each room must contain exactly 2 black cells
 * 3. Black cells cannot be adjacent horizontally, vertically, or diagonally
 * 4. White cells (non-black cells) must have exactly 2 walls around them
 * 5. Black cells must have exactly 3 walls around them
 * 6. White cells in each room must be connected (form a single region)
 */
import { posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Wall State
// ============================================
var Wall;
(function (Wall) {
    /** Unknown/undetermined */
    Wall["SPACE"] = "?";
    /** Wall exists */
    Wall["EXISTS"] = "#";
    /** Wall does not exist */
    Wall["NOT_EXISTS"] = ".";
})(Wall || (Wall = {}));
/** Cell state for rassi - extends base CellState */
var Masu;
(function (Masu) {
    /** Unknown/undetermined */
    Masu["SPACE"] = "?";
    /** Black cell (3 walls) */
    Masu["BLACK"] = "\u25A0";
    /** White cell (2 walls) */
    Masu["NOT_BLACK"] = "\u25A1";
})(Masu || (Masu = {}));
// ============================================
// Rassi Field State
// ============================================
export class RassiField {
    height;
    width;
    /** Cell states (unknown, black, or white) */
    masu;
    /** Fixed black cells from puzzle definition */
    blackPosSet;
    /** Initial horizontal walls (for display) */
    yokoRoomWallPosSet;
    /** Initial vertical walls (for display) */
    tateRoomWallPosSet;
    /** Horizontal walls (between col and col+1) */
    yokoWall;
    /** Vertical walls (between row and row+1) */
    tateWall;
    /** Room definitions (sets of positions) */
    rooms;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.masu = new Grid(height, width, Masu.SPACE);
        this.blackPosSet = new Set();
        this.yokoRoomWallPosSet = new Set();
        this.tateRoomWallPosSet = new Set();
        // Horizontal walls: height rows x (width-1) columns
        this.yokoWall = new Grid(height, width - 1, Wall.SPACE);
        // Vertical walls: (height-1) rows x width columns
        this.tateWall = new Grid(height - 1, width, Wall.SPACE);
        this.rooms = [];
    }
    getYLength() {
        return this.height;
    }
    getXLength() {
        return this.width;
    }
    /** Initialize from puzzle parameters (walls and black cells) */
    initializeFromParams(yokoWalls, tateWalls, blackCells) {
        // Set initial walls
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                if (yokoWalls[y][x]) {
                    this.yokoWall.set(y, x, Wall.EXISTS);
                    this.yokoRoomWallPosSet.add(posKey({ row: y, col: x }));
                }
            }
        }
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width; x++) {
                if (tateWalls[y][x]) {
                    this.tateWall.set(y, x, Wall.EXISTS);
                    this.tateRoomWallPosSet.add(posKey({ row: y, col: x }));
                }
            }
        }
        // Set black cells
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (blackCells[y][x]) {
                    const pos = posKey({ row: y, col: x });
                    this.blackPosSet.add(pos);
                    // Add walls around black cells
                    if (y > 0) {
                        this.tateWall.set(y - 1, x, Wall.EXISTS);
                        this.tateRoomWallPosSet.add(posKey({ row: y - 1, col: x }));
                    }
                    if (x < this.width - 1) {
                        this.yokoWall.set(y, x, Wall.EXISTS);
                        this.yokoRoomWallPosSet.add(posKey({ row: y, col: x }));
                    }
                    if (y < this.height - 1) {
                        this.tateWall.set(y, x, Wall.EXISTS);
                        this.tateRoomWallPosSet.add(posKey({ row: y, col: x }));
                    }
                    if (x > 0) {
                        this.yokoWall.set(y, x - 1, Wall.EXISTS);
                        this.yokoRoomWallPosSet.add(posKey({ row: y, col: x - 1 }));
                    }
                }
            }
        }
        // Build rooms from walls
        this.buildRooms();
    }
    /** Build room definitions from wall structure */
    buildRooms() {
        this.rooms = [];
        const visited = new Set();
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const pos = { row: y, col: x };
                const key = posKey(pos);
                if (this.blackPosSet.has(key) || visited.has(key)) {
                    continue;
                }
                const room = new Set();
                this.collectRoomCells(pos, room, null);
                this.rooms.push(room);
                for (const cellKey of room) {
                    visited.add(cellKey);
                }
            }
        }
    }
    /** Recursively collect cells in the same room */
    collectRoomCells(pos, room, fromDir) {
        const key = posKey(pos);
        if (room.has(key) || this.blackPosSet.has(key))
            return;
        room.add(key);
        const { row, col } = pos;
        // Try up
        if (row > 0 && fromDir !== 'DOWN') {
            if (this.tateWall.get(row - 1, col) !== Wall.EXISTS) {
                this.collectRoomCells({ row: row - 1, col }, room, 'UP');
            }
        }
        // Try right
        if (col < this.width - 1 && fromDir !== 'LEFT') {
            if (this.yokoWall.get(row, col) !== Wall.EXISTS) {
                this.collectRoomCells({ row, col: col + 1 }, room, 'RIGHT');
            }
        }
        // Try down
        if (row < this.height - 1 && fromDir !== 'UP') {
            if (this.tateWall.get(row, col) !== Wall.EXISTS) {
                this.collectRoomCells({ row: row + 1, col }, room, 'DOWN');
            }
        }
        // Try left
        if (col > 0 && fromDir !== 'RIGHT') {
            if (this.yokoWall.get(row, col - 1) !== Wall.EXISTS) {
                this.collectRoomCells({ row, col: col - 1 }, room, 'LEFT');
            }
        }
    }
    /** Get wall state for edges around a cell */
    getWallCounts(y, x) {
        let exists = 0;
        let notExists = 0;
        // Up
        const wallUp = y === 0 ? Wall.EXISTS : this.tateWall.get(y - 1, x);
        if (wallUp === Wall.EXISTS)
            exists++;
        else if (wallUp === Wall.NOT_EXISTS)
            notExists++;
        // Right
        const wallRight = x === this.width - 1 ? Wall.EXISTS : this.yokoWall.get(y, x);
        if (wallRight === Wall.EXISTS)
            exists++;
        else if (wallRight === Wall.NOT_EXISTS)
            notExists++;
        // Down
        const wallDown = y === this.height - 1 ? Wall.EXISTS : this.tateWall.get(y, x);
        if (wallDown === Wall.EXISTS)
            exists++;
        else if (wallDown === Wall.NOT_EXISTS)
            notExists++;
        // Left
        const wallLeft = x === 0 ? Wall.EXISTS : this.yokoWall.get(y, x - 1);
        if (wallLeft === Wall.EXISTS)
            exists++;
        else if (wallLeft === Wall.NOT_EXISTS)
            notExists++;
        return { exists, notExists };
    }
    /** Apply wall count constraints: white cells have 2 walls, black cells have 3 walls */
    nextSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const key = posKey({ row: y, col: x });
                if (this.blackPosSet.has(key)) {
                    continue;
                }
                const { exists, notExists } = this.getWallCounts(y, x);
                let masu = this.masu.get(y, x);
                if (masu === Masu.SPACE) {
                    // Undetermined cell: walls must be 2 or 3
                    if (exists > 3 || notExists > 2)
                        return false;
                    if (exists === 3) {
                        this.masu.set(y, x, Masu.BLACK);
                        masu = Masu.BLACK; // Update local variable
                    }
                    else if (notExists === 2) {
                        this.masu.set(y, x, Masu.NOT_BLACK);
                        masu = Masu.NOT_BLACK; // Update local variable
                    }
                }
                if (masu === Masu.BLACK) {
                    // Black cell: exactly 3 walls
                    if (exists > 3 || notExists > 1)
                        return false;
                    if (notExists === 1) {
                        // Close remaining walls
                        if (y > 0 && this.tateWall.get(y - 1, x) === Wall.SPACE) {
                            this.tateWall.set(y - 1, x, Wall.EXISTS);
                        }
                        if (x < this.width - 1 && this.yokoWall.get(y, x) === Wall.SPACE) {
                            this.yokoWall.set(y, x, Wall.EXISTS);
                        }
                        if (y < this.height - 1 && this.tateWall.get(y, x) === Wall.SPACE) {
                            this.tateWall.set(y, x, Wall.EXISTS);
                        }
                        if (x > 0 && this.yokoWall.get(y, x - 1) === Wall.SPACE) {
                            this.yokoWall.set(y, x - 1, Wall.EXISTS);
                        }
                    }
                    else if (exists === 3) {
                        // Open remaining wall
                        if (y > 0 && this.tateWall.get(y - 1, x) === Wall.SPACE) {
                            this.tateWall.set(y - 1, x, Wall.NOT_EXISTS);
                        }
                        if (x < this.width - 1 && this.yokoWall.get(y, x) === Wall.SPACE) {
                            this.yokoWall.set(y, x, Wall.NOT_EXISTS);
                        }
                        if (y < this.height - 1 && this.tateWall.get(y, x) === Wall.SPACE) {
                            this.tateWall.set(y, x, Wall.NOT_EXISTS);
                        }
                        if (x > 0 && this.yokoWall.get(y, x - 1) === Wall.SPACE) {
                            this.yokoWall.set(y, x - 1, Wall.NOT_EXISTS);
                        }
                    }
                }
                else if (masu === Masu.NOT_BLACK) {
                    // White cell: exactly 2 walls
                    if (exists > 2 || notExists > 2)
                        return false;
                    if (notExists === 2) {
                        // Close remaining walls
                        if (y > 0 && this.tateWall.get(y - 1, x) === Wall.SPACE) {
                            this.tateWall.set(y - 1, x, Wall.EXISTS);
                        }
                        if (x < this.width - 1 && this.yokoWall.get(y, x) === Wall.SPACE) {
                            this.yokoWall.set(y, x, Wall.EXISTS);
                        }
                        if (y < this.height - 1 && this.tateWall.get(y, x) === Wall.SPACE) {
                            this.tateWall.set(y, x, Wall.EXISTS);
                        }
                        if (x > 0 && this.yokoWall.get(y, x - 1) === Wall.SPACE) {
                            this.yokoWall.set(y, x - 1, Wall.EXISTS);
                        }
                    }
                    else if (exists === 2) {
                        // Open remaining walls
                        if (y > 0 && this.tateWall.get(y - 1, x) === Wall.SPACE) {
                            this.tateWall.set(y - 1, x, Wall.NOT_EXISTS);
                        }
                        if (x < this.width - 1 && this.yokoWall.get(y, x) === Wall.SPACE) {
                            this.yokoWall.set(y, x, Wall.NOT_EXISTS);
                        }
                        if (y < this.height - 1 && this.tateWall.get(y, x) === Wall.SPACE) {
                            this.tateWall.set(y, x, Wall.NOT_EXISTS);
                        }
                        if (x > 0 && this.yokoWall.get(y, x - 1) === Wall.SPACE) {
                            this.yokoWall.set(y, x - 1, Wall.NOT_EXISTS);
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Black cell constraints: no adjacent black cells (including diagonals), exactly 2 per room */
    blackSolve() {
        // Check adjacency and propagate
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const key = posKey({ row: y, col: x });
                if (this.blackPosSet.has(key)) {
                    continue;
                }
                const cell = this.masu.get(y, x);
                if (cell === Masu.BLACK) {
                    // Check all 8 neighbors - none can be black
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dy === 0 && dx === 0)
                                continue;
                            const ny = y + dy;
                            const nx = x + dx;
                            if (ny < 0 || ny >= this.height || nx < 0 || nx >= this.width)
                                continue;
                            const neighborKey = posKey({ row: ny, col: nx });
                            const neighbor = this.masu.get(ny, nx);
                            if (neighbor === Masu.BLACK && !this.blackPosSet.has(neighborKey)) {
                                return false;
                            }
                            if (neighbor === Masu.SPACE && !this.blackPosSet.has(neighborKey)) {
                                this.masu.set(ny, nx, Masu.NOT_BLACK);
                            }
                        }
                    }
                }
            }
        }
        // Room constraints: exactly 2 black cells per room
        for (const room of this.rooms) {
            let blackCount = 0;
            let spaceCount = 0;
            for (const key of room) {
                const pos = this.parseKey(key);
                const cell = this.masu.get(pos.row, pos.col);
                if (cell === Masu.BLACK) {
                    blackCount++;
                }
                else if (cell === Masu.SPACE) {
                    spaceCount++;
                }
            }
            if (blackCount + spaceCount < 2) {
                // Not enough cells for 2 black
                return false;
            }
            const neededBlack = 2 - blackCount;
            if (neededBlack < 0) {
                // Too many black cells
                return false;
            }
            else if (neededBlack === 0) {
                // Already have 2 black cells - rest must be white
                for (const key of room) {
                    const pos = this.parseKey(key);
                    if (this.masu.get(pos.row, pos.col) === Masu.SPACE) {
                        this.masu.set(pos.row, pos.col, Masu.NOT_BLACK);
                    }
                }
            }
            else if (spaceCount === neededBlack) {
                // All remaining spaces must be black
                for (const key of room) {
                    const pos = this.parseKey(key);
                    if (this.masu.get(pos.row, pos.col) === Masu.SPACE) {
                        this.masu.set(pos.row, pos.col, Masu.BLACK);
                    }
                }
            }
        }
        return true;
    }
    /** Check that white cells in each room are connected */
    connectSolve() {
        for (const room of this.rooms) {
            if (room.size === 0)
                continue;
            // Find first cell in room
            const firstKey = Array.from(room)[0];
            const connected = new Set();
            connected.add(firstKey);
            this.collectRoomCells(this.parseKey(firstKey), connected, null);
            if (connected.size !== room.size) {
                return false;
            }
        }
        return true;
    }
    parseKey(key) {
        const [row, col] = key.split(',').map(Number);
        return { row, col };
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new RassiField(this.height, this.width);
        // Clone grids
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.masu.set(y, x, this.masu.get(y, x));
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
        // Clone sets and arrays
        cloned.blackPosSet = new Set(this.blackPosSet);
        cloned.yokoRoomWallPosSet = new Set(this.yokoRoomWallPosSet);
        cloned.tateRoomWallPosSet = new Set(this.tateRoomWallPosSet);
        cloned.rooms = this.rooms.map(room => new Set(room));
        return cloned;
    }
    getStateDump() {
        let dump = '';
        // Masu state
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                dump += this.masu.get(y, x);
            }
        }
        // Yoko walls
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                dump += this.yokoWall.get(y, x);
            }
        }
        // Tate walls
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width; x++) {
                dump += this.tateWall.get(y, x);
            }
        }
        return dump;
    }
    isSolved() {
        // All walls must be determined
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                if (this.yokoWall.get(y, x) === Wall.SPACE)
                    return false;
            }
        }
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.tateWall.get(y, x) === Wall.SPACE)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const beforeDump = this.getStateDump();
            if (!this.nextSolve())
                return false;
            if (!this.blackSolve())
                return false;
            changed = this.getStateDump() !== beforeDump;
        }
        // Only check connectivity if state is stable
        if (!this.connectSolve())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        // Top border
        let topLine = '□';
        for (let x = 0; x < this.width; x++) {
            topLine += '□';
            if (x < this.width - 1)
                topLine += '□';
        }
        topLine += '□';
        lines.push(topLine);
        for (let y = 0; y < this.height; y++) {
            // Cell row
            let cellLine = '□';
            for (let x = 0; x < this.width; x++) {
                const key = posKey({ row: y, col: x });
                if (this.blackPosSet.has(key)) {
                    cellLine += '×';
                }
                else {
                    const masu = this.masu.get(y, x);
                    cellLine += masu;
                }
                if (x < this.width - 1) {
                    const wall = this.yokoWall.get(y, x);
                    cellLine += wall;
                }
            }
            cellLine += '□';
            lines.push(cellLine);
            // Wall row
            if (y < this.height - 1) {
                let wallLine = '□';
                for (let x = 0; x < this.width; x++) {
                    const wall = this.tateWall.get(y, x);
                    wallLine += wall;
                    if (x < this.width - 1) {
                        wallLine += '□';
                    }
                }
                wallLine += '□';
                lines.push(wallLine);
            }
        }
        // Bottom border
        let bottomLine = '□';
        for (let x = 0; x < this.width; x++) {
            bottomLine += '□';
            if (x < this.width - 1)
                bottomLine += '□';
        }
        bottomLine += '□';
        lines.push(bottomLine);
        return lines.join('\n');
    }
    /** Get branching candidates */
    getBranchingCandidates() {
        const candidates = [];
        // Find undetermined walls
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                if (this.yokoWall.get(y, x) === Wall.SPACE) {
                    candidates.push({ type: 'yokoWall', y, x });
                }
            }
        }
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.tateWall.get(y, x) === Wall.SPACE) {
                    candidates.push({ type: 'tateWall', y, x });
                }
            }
        }
        return candidates;
    }
    /** Set yokoWall (for branching) */
    setYokoWall(y, x, state) {
        this.yokoWall.set(y, x, state);
    }
    /** Set tateWall (for branching) */
    setTateWall(y, x, state) {
        this.tateWall.set(y, x, state);
    }
}
// ============================================
// Rassi Solver
// ============================================
export class RassiSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzv.jp URL parameters */
    static fromString(height, width, param) {
        const field = new RassiField(height, width);
        // Initialize arrays
        const yokoWalls = Array(height)
            .fill(null)
            .map(() => Array(width - 1).fill(false));
        const tateWalls = Array(height - 1)
            .fill(null)
            .map(() => Array(width).fill(false));
        const blackCells = Array(height)
            .fill(null)
            .map(() => Array(width).fill(false));
        let readPos = 0;
        // Parse horizontal walls
        for (let cnt = 0; cnt < height * (width - 1); cnt++) {
            const mod = cnt % 5;
            if (mod === 0) {
                if (readPos >= param.length)
                    break;
            }
            if (mod === 4 || cnt === height * (width - 1) - 1) {
                const bit = readPos < param.length ? parseInt(param[readPos], 32) : 0;
                readPos++;
                const startCnt = cnt - mod;
                for (let i = 0; i <= mod && startCnt + i < height * (width - 1); i++) {
                    const idx = startCnt + i;
                    const y = Math.floor(idx / (width - 1));
                    const x = idx % (width - 1);
                    const bitPos = 4 - i;
                    if ((bit >> bitPos) & 1) {
                        yokoWalls[y][x] = true;
                    }
                }
            }
        }
        // Parse vertical walls
        for (let cnt = 0; cnt < (height - 1) * width; cnt++) {
            const mod = cnt % 5;
            if (mod === 0) {
                if (readPos >= param.length)
                    break;
            }
            if (mod === 4 || cnt === (height - 1) * width - 1) {
                const bit = readPos < param.length ? parseInt(param[readPos], 32) : 0;
                readPos++;
                const startCnt = cnt - mod;
                for (let i = 0; i <= mod && startCnt + i < (height - 1) * width; i++) {
                    const idx = startCnt + i;
                    const y = Math.floor(idx / width);
                    const x = idx % width;
                    const bitPos = 4 - i;
                    if ((bit >> bitPos) & 1) {
                        tateWalls[y][x] = true;
                    }
                }
            }
        }
        // Parse black cells
        for (let cnt = 0; cnt < height * width; cnt++) {
            const mod = cnt % 5;
            if (mod === 0) {
                if (readPos >= param.length)
                    break;
            }
            if (mod === 4 || cnt === height * width - 1) {
                const bit = readPos < param.length ? parseInt(param[readPos], 32) : 0;
                readPos++;
                const startCnt = cnt - mod;
                for (let i = 0; i <= mod && startCnt + i < height * width; i++) {
                    const idx = startCnt + i;
                    const y = Math.floor(idx / width);
                    const x = idx % width;
                    const bitPos = 4 - i;
                    if ((bit >> bitPos) & 1) {
                        blackCells[y][x] = true;
                    }
                }
            }
        }
        // Initialize field with parsed data
        field.initializeFromParams(yokoWalls, tateWalls, blackCells);
        return new RassiSolver(field);
    }
    getBranchCandidates(state) {
        const candidates = state.getBranchingCandidates();
        if (candidates.length === 0)
            return [];
        const cand = candidates[0];
        if (cand.type === 'yokoWall') {
            return [
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setYokoWall(cand.y, cand.x, Wall.EXISTS);
                        return cloned;
                    },
                    description: `Set yokoWall[${cand.y}][${cand.x}] to EXISTS`,
                },
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setYokoWall(cand.y, cand.x, Wall.NOT_EXISTS);
                        return cloned;
                    },
                    description: `Set yokoWall[${cand.y}][${cand.x}] to NOT_EXISTS`,
                },
            ];
        }
        else {
            return [
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setTateWall(cand.y, cand.x, Wall.EXISTS);
                        return cloned;
                    },
                    description: `Set tateWall[${cand.y}][${cand.x}] to EXISTS`,
                },
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setTateWall(cand.y, cand.x, Wall.NOT_EXISTS);
                        return cloned;
                    },
                    description: `Set tateWall[${cand.y}][${cand.x}] to NOT_EXISTS`,
                },
            ];
        }
    }
}
//# sourceMappingURL=rassi.js.map