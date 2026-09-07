/**
 * Country Road Solver
 *
 * Rules:
 * 1. Place white cells forming a single loop (each white cell connects to exactly 2 neighbors)
 * 2. Each room has a number indicating how many white cells it contains
 * 3. Black cells cannot be adjacent across room borders
 * 4. Each room's border must be crossed exactly twice by the loop
 * 5. The number of border crossings in each row/column must be even
 */
import { CellState, WallState, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Country Road Field State
// ============================================
export class CountryField {
    height;
    width;
    /** Cell states (UNKNOWN=undecided, WHITE=loop, BLACK=not loop) */
    cells;
    /** Room walls (horizontal) - fixed */
    yokoRoomWall;
    /** Room walls (vertical) - fixed */
    tateRoomWall;
    /** Path walls (horizontal) - can be set during solving */
    yokoWall;
    /** Path walls (vertical) - can be set during solving */
    tateWall;
    /** Rooms */
    rooms;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.yokoRoomWall = Array.from({ length: height }, () => Array(width - 1).fill(false));
        this.tateRoomWall = Array.from({ length: height - 1 }, () => Array(width).fill(false));
        this.yokoWall = new Grid(height, width - 1, () => WallState.UNKNOWN);
        this.tateWall = new Grid(height - 1, width, () => WallState.UNKNOWN);
        this.rooms = [];
    }
    /** Parse puzzle from pzv.jp parameter */
    parseParam(param) {
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let readPos = 0;
        // Parse horizontal room walls (5-bit encoding)
        let bit = 0;
        for (let cnt = 0; cnt < this.height * (this.width - 1); cnt++) {
            const mod = cnt % 5;
            if (mod === 0) {
                bit = parseInt(param[readPos], 36);
                readPos++;
            }
            if (mod === 4 || cnt === this.height * (this.width - 1) - 1) {
                const base = cnt - mod;
                for (let i = 0; i <= mod && base + i < this.height * (this.width - 1); i++) {
                    const idx = base + i;
                    const row = Math.floor(idx / (this.width - 1));
                    const col = idx % (this.width - 1);
                    this.yokoRoomWall[row][col] = (bit >> (4 - i)) % 2 === 1;
                }
            }
        }
        // Parse vertical room walls
        for (let cnt = 0; cnt < (this.height - 1) * this.width; cnt++) {
            const mod = cnt % 5;
            if (mod === 0) {
                bit = parseInt(param[readPos], 36);
                readPos++;
            }
            if (mod === 4 || cnt === (this.height - 1) * this.width - 1) {
                const base = cnt - mod;
                for (let i = 0; i <= mod && base + i < (this.height - 1) * this.width; i++) {
                    const idx = base + i;
                    const row = Math.floor(idx / this.width);
                    const col = idx % this.width;
                    this.tateRoomWall[row][col] = (bit >> (4 - i)) % 2 === 1;
                }
            }
        }
        // Parse room numbers
        const roomCounts = [];
        for (; readPos < param.length; readPos++) {
            const ch = param[readPos];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                for (let i = 0; i < interval + 1; i++) {
                    roomCounts.push(-1);
                }
            }
            else if (ch === '-') {
                const value = parseInt(param[readPos + 1] + param[readPos + 2], 16);
                roomCounts.push(value);
                readPos += 2;
            }
            else if (ch === '+') {
                const value = parseInt(param[readPos + 1] + param[readPos + 2] + param[readPos + 3], 16);
                roomCounts.push(value);
                readPos += 3;
            }
            else {
                const value = parseInt(ch, 16);
                if (!isNaN(value)) {
                    roomCounts.push(value);
                }
            }
        }
        // Build rooms from walls
        this.buildRooms(roomCounts);
    }
    /** Build rooms from wall information */
    buildRooms(roomCounts) {
        const visited = new Set();
        let roomIndex = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const key = posKey({ row: y, col: x });
                if (visited.has(key))
                    continue;
                const members = [];
                this.floodFillRoom({ row: y, col: x }, members, visited);
                // Find border walls for this room
                const yokoWallPos = [];
                const tateWallPos = [];
                for (const pos of members) {
                    if (pos.row > 0 && this.tateRoomWall[pos.row - 1][pos.col]) {
                        tateWallPos.push({ row: pos.row - 1, col: pos.col });
                    }
                    if (pos.col < this.width - 1 && this.yokoRoomWall[pos.row][pos.col]) {
                        yokoWallPos.push({ row: pos.row, col: pos.col });
                    }
                    if (pos.row < this.height - 1 && this.tateRoomWall[pos.row][pos.col]) {
                        tateWallPos.push({ row: pos.row, col: pos.col });
                    }
                    if (pos.col > 0 && this.yokoRoomWall[pos.row][pos.col - 1]) {
                        yokoWallPos.push({ row: pos.row, col: pos.col - 1 });
                    }
                }
                const count = roomIndex < roomCounts.length ? roomCounts[roomIndex] : -1;
                this.rooms.push({ whiteCnt: count, members, yokoWallPos, tateWallPos });
                roomIndex++;
            }
        }
    }
    /** Flood fill to find room members */
    floodFillRoom(pos, members, visited) {
        const key = posKey(pos);
        if (visited.has(key))
            return;
        visited.add(key);
        members.push(pos);
        const { row, col } = pos;
        if (row > 0 && !this.tateRoomWall[row - 1][col]) {
            this.floodFillRoom({ row: row - 1, col }, members, visited);
        }
        if (row < this.height - 1 && !this.tateRoomWall[row][col]) {
            this.floodFillRoom({ row: row + 1, col }, members, visited);
        }
        if (col > 0 && !this.yokoRoomWall[row][col - 1]) {
            this.floodFillRoom({ row, col: col - 1 }, members, visited);
        }
        if (col < this.width - 1 && !this.yokoRoomWall[row][col]) {
            this.floodFillRoom({ row, col: col + 1 }, members, visited);
        }
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell to white (loop) */
    setWhite(row, col) {
        this.cells.set(row, col, CellState.WHITE);
    }
    /** Set cell to black (not loop) */
    setBlack(row, col) {
        this.cells.set(row, col, CellState.BLACK);
    }
    // ========== Constraint solving ==========
    /**
     * Room constraint: count of white cells must match number
     */
    roomSolve() {
        for (const room of this.rooms) {
            let whiteCnt = 0;
            let spaceCnt = 0;
            for (const pos of room.members) {
                const state = this.cells.get(pos.row, pos.col);
                if (state === CellState.WHITE)
                    whiteCnt++;
                else if (state === CellState.UNKNOWN)
                    spaceCnt++;
            }
            if (room.whiteCnt === -1) {
                // At least 1 white cell needed
                if (whiteCnt + spaceCnt < 1)
                    return false;
                if (whiteCnt === 0 && spaceCnt === 1) {
                    for (const pos of room.members) {
                        if (this.cells.get(pos.row, pos.col) === CellState.UNKNOWN) {
                            this.cells.set(pos.row, pos.col, CellState.WHITE);
                        }
                    }
                }
            }
            else {
                if (whiteCnt > room.whiteCnt)
                    return false;
                if (whiteCnt + spaceCnt < room.whiteCnt)
                    return false;
                if (whiteCnt === room.whiteCnt) {
                    // Fill rest with black
                    for (const pos of room.members) {
                        if (this.cells.get(pos.row, pos.col) === CellState.UNKNOWN) {
                            this.cells.set(pos.row, pos.col, CellState.BLACK);
                        }
                    }
                }
                else if (spaceCnt === room.whiteCnt - whiteCnt) {
                    // Fill unknown with white
                    for (const pos of room.members) {
                        if (this.cells.get(pos.row, pos.col) === CellState.UNKNOWN) {
                            this.cells.set(pos.row, pos.col, CellState.WHITE);
                        }
                    }
                }
            }
        }
        return true;
    }
    /**
     * Wall and neighbor constraint:
     * - Black cells have walls on all sides
     * - White cells have exactly 2 open walls (loop constraint)
     */
    nextSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.cells.get(y, x);
                if (cell === CellState.BLACK) {
                    // Close all walls around black cell
                    if (y > 0) {
                        if (this.tateWall.get(y - 1, x) === WallState.NO_WALL)
                            return false;
                        this.tateWall.set(y - 1, x, WallState.WALL);
                    }
                    if (x < this.width - 1) {
                        if (this.yokoWall.get(y, x) === WallState.NO_WALL)
                            return false;
                        this.yokoWall.set(y, x, WallState.WALL);
                    }
                    if (y < this.height - 1) {
                        if (this.tateWall.get(y, x) === WallState.NO_WALL)
                            return false;
                        this.tateWall.set(y, x, WallState.WALL);
                    }
                    if (x > 0) {
                        if (this.yokoWall.get(y, x - 1) === WallState.NO_WALL)
                            return false;
                        this.yokoWall.set(y, x - 1, WallState.WALL);
                    }
                }
                else {
                    // Count walls
                    let wallCnt = 0;
                    let noWallCnt = 0;
                    const wallUp = y === 0 ? WallState.WALL : this.tateWall.get(y - 1, x);
                    const wallRight = x === this.width - 1 ? WallState.WALL : this.yokoWall.get(y, x);
                    const wallDown = y === this.height - 1 ? WallState.WALL : this.tateWall.get(y, x);
                    const wallLeft = x === 0 ? WallState.WALL : this.yokoWall.get(y, x - 1);
                    if (wallUp === WallState.WALL)
                        wallCnt++;
                    else if (wallUp === WallState.NO_WALL) {
                        if (this.cells.get(y - 1, x) === CellState.BLACK)
                            return false;
                        this.cells.set(y - 1, x, CellState.WHITE);
                        noWallCnt++;
                    }
                    if (wallRight === WallState.WALL)
                        wallCnt++;
                    else if (wallRight === WallState.NO_WALL) {
                        if (this.cells.get(y, x + 1) === CellState.BLACK)
                            return false;
                        this.cells.set(y, x + 1, CellState.WHITE);
                        noWallCnt++;
                    }
                    if (wallDown === WallState.WALL)
                        wallCnt++;
                    else if (wallDown === WallState.NO_WALL) {
                        if (this.cells.get(y + 1, x) === CellState.BLACK)
                            return false;
                        this.cells.set(y + 1, x, CellState.WHITE);
                        noWallCnt++;
                    }
                    if (wallLeft === WallState.WALL)
                        wallCnt++;
                    else if (wallLeft === WallState.NO_WALL) {
                        if (this.cells.get(y, x - 1) === CellState.BLACK)
                            return false;
                        this.cells.set(y, x - 1, CellState.WHITE);
                        noWallCnt++;
                    }
                    if (cell === CellState.WHITE) {
                        // White cell needs exactly 2 open walls
                        if (wallCnt > 2 || noWallCnt > 2)
                            return false;
                        if (noWallCnt === 2) {
                            // Close remaining walls
                            if (wallUp === WallState.UNKNOWN)
                                this.tateWall.set(y - 1, x, WallState.WALL);
                            if (wallRight === WallState.UNKNOWN)
                                this.yokoWall.set(y, x, WallState.WALL);
                            if (wallDown === WallState.UNKNOWN)
                                this.tateWall.set(y, x, WallState.WALL);
                            if (wallLeft === WallState.UNKNOWN)
                                this.yokoWall.set(y, x - 1, WallState.WALL);
                        }
                        else if (wallCnt === 2) {
                            // Open remaining walls
                            if (wallUp === WallState.UNKNOWN) {
                                if (this.cells.get(y - 1, x) === CellState.BLACK)
                                    return false;
                                this.tateWall.set(y - 1, x, WallState.NO_WALL);
                                this.cells.set(y - 1, x, CellState.WHITE);
                            }
                            if (wallRight === WallState.UNKNOWN) {
                                if (this.cells.get(y, x + 1) === CellState.BLACK)
                                    return false;
                                this.yokoWall.set(y, x, WallState.NO_WALL);
                                this.cells.set(y, x + 1, CellState.WHITE);
                            }
                            if (wallDown === WallState.UNKNOWN) {
                                if (this.cells.get(y + 1, x) === CellState.BLACK)
                                    return false;
                                this.tateWall.set(y, x, WallState.NO_WALL);
                                this.cells.set(y + 1, x, CellState.WHITE);
                            }
                            if (wallLeft === WallState.UNKNOWN) {
                                if (this.cells.get(y, x - 1) === CellState.BLACK)
                                    return false;
                                this.yokoWall.set(y, x - 1, WallState.NO_WALL);
                                this.cells.set(y, x - 1, CellState.WHITE);
                            }
                        }
                    }
                    else {
                        // Unknown cell: walls are 2 or 4
                        if ((wallCnt === 3 && noWallCnt === 1) || noWallCnt > 2)
                            return false;
                        if (wallCnt > 2) {
                            this.cells.set(y, x, CellState.BLACK);
                            if (wallCnt === 3) {
                                if (wallUp === WallState.UNKNOWN)
                                    this.tateWall.set(y - 1, x, WallState.WALL);
                                if (wallRight === WallState.UNKNOWN)
                                    this.yokoWall.set(y, x, WallState.WALL);
                                if (wallDown === WallState.UNKNOWN)
                                    this.tateWall.set(y, x, WallState.WALL);
                                if (wallLeft === WallState.UNKNOWN)
                                    this.yokoWall.set(y, x - 1, WallState.WALL);
                            }
                        }
                        else if (noWallCnt !== 0) {
                            this.cells.set(y, x, CellState.WHITE);
                        }
                    }
                }
            }
        }
        return true;
    }
    /**
     * Black cells cannot be adjacent across room borders
     */
    blackSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.cells.get(y, x);
                if (cell === CellState.BLACK) {
                    // Check room border neighbors
                    if (y > 0 && this.tateRoomWall[y - 1][x]) {
                        if (this.cells.get(y - 1, x) === CellState.BLACK)
                            return false;
                        if (this.cells.get(y - 1, x) === CellState.UNKNOWN) {
                            this.cells.set(y - 1, x, CellState.WHITE);
                        }
                    }
                    if (x < this.width - 1 && this.yokoRoomWall[y][x]) {
                        if (this.cells.get(y, x + 1) === CellState.BLACK)
                            return false;
                        if (this.cells.get(y, x + 1) === CellState.UNKNOWN) {
                            this.cells.set(y, x + 1, CellState.WHITE);
                        }
                    }
                    if (y < this.height - 1 && this.tateRoomWall[y][x]) {
                        if (this.cells.get(y + 1, x) === CellState.BLACK)
                            return false;
                        if (this.cells.get(y + 1, x) === CellState.UNKNOWN) {
                            this.cells.set(y + 1, x, CellState.WHITE);
                        }
                    }
                    if (x > 0 && this.yokoRoomWall[y][x - 1]) {
                        if (this.cells.get(y, x - 1) === CellState.BLACK)
                            return false;
                        if (this.cells.get(y, x - 1) === CellState.UNKNOWN) {
                            this.cells.set(y, x - 1, CellState.WHITE);
                        }
                    }
                }
                else if (cell === CellState.UNKNOWN) {
                    // If black neighbor across border, this must be white
                    if ((y > 0 && this.tateRoomWall[y - 1][x] && this.cells.get(y - 1, x) === CellState.BLACK) ||
                        (x < this.width - 1 && this.yokoRoomWall[y][x] && this.cells.get(y, x + 1) === CellState.BLACK) ||
                        (y < this.height - 1 && this.tateRoomWall[y][x] && this.cells.get(y + 1, x) === CellState.BLACK) ||
                        (x > 0 && this.yokoRoomWall[y][x - 1] && this.cells.get(y, x - 1) === CellState.BLACK)) {
                        this.cells.set(y, x, CellState.WHITE);
                    }
                }
            }
        }
        return true;
    }
    /**
     * Each room's border must be crossed exactly twice
     */
    countrySolve() {
        for (const room of this.rooms) {
            let crossCnt = 0;
            let spaceCnt = 0;
            for (const pos of room.yokoWallPos) {
                const wall = this.yokoWall.get(pos.row, pos.col);
                if (wall === WallState.NO_WALL)
                    crossCnt++;
                else if (wall === WallState.UNKNOWN)
                    spaceCnt++;
            }
            for (const pos of room.tateWallPos) {
                const wall = this.tateWall.get(pos.row, pos.col);
                if (wall === WallState.NO_WALL)
                    crossCnt++;
                else if (wall === WallState.UNKNOWN)
                    spaceCnt++;
            }
            if (crossCnt > 2)
                return false;
            if (crossCnt + spaceCnt < 2)
                return false;
            if (crossCnt === 2) {
                // Close remaining border walls
                for (const pos of room.yokoWallPos) {
                    if (this.yokoWall.get(pos.row, pos.col) === WallState.UNKNOWN) {
                        this.yokoWall.set(pos.row, pos.col, WallState.WALL);
                    }
                }
                for (const pos of room.tateWallPos) {
                    if (this.tateWall.get(pos.row, pos.col) === WallState.UNKNOWN) {
                        this.tateWall.set(pos.row, pos.col, WallState.WALL);
                    }
                }
            }
            else if (spaceCnt === 2 - crossCnt) {
                // Open remaining border walls
                for (const pos of room.yokoWallPos) {
                    if (this.yokoWall.get(pos.row, pos.col) === WallState.UNKNOWN) {
                        this.yokoWall.set(pos.row, pos.col, WallState.NO_WALL);
                    }
                }
                for (const pos of room.tateWallPos) {
                    if (this.tateWall.get(pos.row, pos.col) === WallState.UNKNOWN) {
                        this.tateWall.set(pos.row, pos.col, WallState.NO_WALL);
                    }
                }
            }
        }
        return true;
    }
    /**
     * Number of border crossings in each row/column must be even
     */
    oddSolve() {
        // Check rows
        for (let y = 0; y < this.height - 1; y++) {
            let noWallCnt = 0;
            let hasUnknown = false;
            for (let x = 0; x < this.width; x++) {
                const wall = this.tateWall.get(y, x);
                if (wall === WallState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                else if (wall === WallState.NO_WALL) {
                    noWallCnt++;
                }
            }
            if (!hasUnknown && noWallCnt % 2 !== 0)
                return false;
        }
        // Check columns
        for (let x = 0; x < this.width - 1; x++) {
            let noWallCnt = 0;
            let hasUnknown = false;
            for (let y = 0; y < this.height; y++) {
                const wall = this.yokoWall.get(y, x);
                if (wall === WallState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                else if (wall === WallState.NO_WALL) {
                    noWallCnt++;
                }
            }
            if (!hasUnknown && noWallCnt % 2 !== 0)
                return false;
        }
        return true;
    }
    /**
     * White cells must form a single connected loop
     */
    connectSolve() {
        let firstWhite = null;
        const allPos = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                allPos.push({ row: y, col: x });
                if (this.cells.get(y, x) === CellState.WHITE && !firstWhite) {
                    firstWhite = { row: y, col: x };
                }
            }
        }
        if (!firstWhite)
            return true;
        // BFS from first white cell
        const connected = new Set();
        const queue = [firstWhite];
        connected.add(posKey(firstWhite));
        while (queue.length > 0) {
            const pos = queue.shift();
            const { row, col } = pos;
            // Check neighbors without walls
            if (row > 0 && this.tateWall.get(row - 1, col) !== WallState.WALL) {
                const key = posKey({ row: row - 1, col });
                if (!connected.has(key)) {
                    connected.add(key);
                    queue.push({ row: row - 1, col });
                }
            }
            if (col < this.width - 1 && this.yokoWall.get(row, col) !== WallState.WALL) {
                const key = posKey({ row, col: col + 1 });
                if (!connected.has(key)) {
                    connected.add(key);
                    queue.push({ row, col: col + 1 });
                }
            }
            if (row < this.height - 1 && this.tateWall.get(row, col) !== WallState.WALL) {
                const key = posKey({ row: row + 1, col });
                if (!connected.has(key)) {
                    connected.add(key);
                    queue.push({ row: row + 1, col });
                }
            }
            if (col > 0 && this.yokoWall.get(row, col - 1) !== WallState.WALL) {
                const key = posKey({ row, col: col - 1 });
                if (!connected.has(key)) {
                    connected.add(key);
                    queue.push({ row, col: col - 1 });
                }
            }
        }
        // Cells not connected must be black
        for (const pos of allPos) {
            const key = posKey(pos);
            if (!connected.has(key)) {
                if (this.cells.get(pos.row, pos.col) === CellState.WHITE)
                    return false;
                this.cells.set(pos.row, pos.col, CellState.BLACK);
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new CountryField(this.height, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.cells.set(y, x, this.cells.get(y, x));
            }
        }
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                cloned.yokoWall.set(y, x, this.yokoWall.get(y, x));
                cloned.yokoRoomWall[y][x] = this.yokoRoomWall[y][x];
            }
        }
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.tateWall.set(y, x, this.tateWall.get(y, x));
                cloned.tateRoomWall[y][x] = this.tateRoomWall[y][x];
            }
        }
        cloned.rooms = this.rooms;
        return cloned;
    }
    getStateDump() {
        let dump = this.cells.dump();
        dump += this.yokoWall.dump();
        dump += this.tateWall.dump();
        return dump;
    }
    isSolved() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) === CellState.UNKNOWN)
                    return false;
            }
        }
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
        let str = this.getStateDump();
        if (!this.roomSolve())
            return false;
        if (!this.nextSolve())
            return false;
        if (!this.blackSolve())
            return false;
        if (!this.countrySolve())
            return false;
        if (!this.oddSolve())
            return false;
        if (this.getStateDump() !== str) {
            return this.solveAndCheck();
        }
        if (!this.connectSolve())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const state = this.cells.get(row, col);
                line += state === CellState.WHITE ? '○' : state === CellState.BLACK ? '■' : '?';
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
// Country Road Solver
// ============================================
export class CountrySolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzv.jp URL format */
    static fromString(height, width, param) {
        const field = new CountryField(height, width);
        field.parseParam(param);
        return new CountrySolver(field);
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
                    cloned.setWhite(pos.row, pos.col);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to WHITE`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setBlack(pos.row, pos.col);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to BLACK`,
            },
        ];
    }
}
//# sourceMappingURL=country.js.map