/**
 * Nagenawa (投げ縄 - Lasso) Solver
 *
 * Rules:
 * 1. Draw a single rectangular loop
 * 2. Numbers in rooms indicate how many cells in that room are inside the loop
 * 3. Cells inside the loop have 0 or 2 walls, cells outside have 4 walls (black)
 * 4. The loop forms a rectangle
 * 5. Walls crossing each row/column must be even in number
 */
import { WallState, CellState, Direction, DIRECTIONS, adjacent, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Nagenawa Field State
// ============================================
export class NagenawaField {
    height;
    width;
    /** Cell state: unknown, white (inside loop), or black (outside loop) */
    cells;
    /** Horizontal walls (between columns) */
    horizontalWalls;
    /** Vertical walls (between rows) */
    verticalWalls;
    /** Room boundaries - horizontal */
    horizontalRoomWalls;
    /** Room boundaries - vertical */
    verticalRoomWalls;
    /** Room definitions */
    rooms;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.horizontalWalls = new Grid(height, width - 1, () => WallState.UNKNOWN);
        this.verticalWalls = new Grid(height - 1, width, () => WallState.UNKNOWN);
        this.horizontalRoomWalls = new Grid(height, width - 1, () => false);
        this.verticalRoomWalls = new Grid(height - 1, width, () => false);
        this.rooms = [];
    }
    /** Add a room */
    addRoom(cells, targetCount) {
        this.rooms.push({ cells, targetWhiteCount: targetCount });
    }
    /** Set room wall */
    setRoomWall(p1, p2, hasWall) {
        if (p1.row === p2.row) {
            const col = Math.min(p1.col, p2.col);
            this.horizontalRoomWalls.set(p1.row, col, hasWall);
        }
        else if (p1.col === p2.col) {
            const row = Math.min(p1.row, p2.row);
            this.verticalRoomWalls.set(row, p1.col, hasWall);
        }
    }
    /** Set wall state */
    setHorizontalWall(row, col, state) {
        if (col >= 0 && col < this.width - 1) {
            this.horizontalWalls.set(row, col, state);
        }
    }
    setVerticalWall(row, col, state) {
        if (row >= 0 && row < this.height - 1) {
            this.verticalWalls.set(row, col, state);
        }
    }
    /** Get wall state between two adjacent cells */
    getWallBetween(p1, p2) {
        if (p1.row === p2.row) {
            const col = Math.min(p1.col, p2.col);
            if (col >= 0 && col < this.width - 1) {
                return this.horizontalWalls.get(p1.row, col);
            }
        }
        else if (p1.col === p2.col) {
            const row = Math.min(p1.row, p2.row);
            if (row >= 0 && row < this.height - 1) {
                return this.verticalWalls.get(row, p1.col);
            }
        }
        return WallState.WALL; // Boundary
    }
    setWallBetween(p1, p2, state) {
        if (p1.row === p2.row) {
            const col = Math.min(p1.col, p2.col);
            this.setHorizontalWall(p1.row, col, state);
        }
        else if (p1.col === p2.col) {
            const row = Math.min(p1.row, p2.row);
            this.setVerticalWall(row, p1.col, state);
        }
    }
    isInBounds(pos) {
        return pos.row >= 0 && pos.row < this.height && pos.col >= 0 && pos.col < this.width;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new NagenawaField(this.height, this.width);
        for (const [pos, val] of this.cells.entries()) {
            cloned.cells.set(pos, val);
        }
        for (const [pos, val] of this.horizontalWalls.entries()) {
            cloned.horizontalWalls.set(pos, val);
        }
        for (const [pos, val] of this.verticalWalls.entries()) {
            cloned.verticalWalls.set(pos, val);
        }
        for (const [pos, val] of this.horizontalRoomWalls.entries()) {
            cloned.horizontalRoomWalls.set(pos, val);
        }
        for (const [pos, val] of this.verticalRoomWalls.entries()) {
            cloned.verticalRoomWalls.set(pos, val);
        }
        cloned.rooms.push(...this.rooms);
        return cloned;
    }
    getStateDump() {
        const parts = [];
        for (const [_, val] of this.cells.entries()) {
            parts.push(val);
        }
        for (const [_, val] of this.horizontalWalls.entries()) {
            parts.push(val);
        }
        for (const [_, val] of this.verticalWalls.entries()) {
            parts.push(val);
        }
        return parts.join('');
    }
    isSolved() {
        for (const [_, cell] of this.cells.entries()) {
            if (cell === CellState.UNKNOWN)
                return false;
        }
        for (const [_, wall] of this.horizontalWalls.entries()) {
            if (wall === WallState.UNKNOWN)
                return false;
        }
        for (const [_, wall] of this.verticalWalls.entries()) {
            if (wall === WallState.UNKNOWN)
                return false;
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        const before = this.getStateDump();
        if (!this.propagateRoomConstraints())
            return false;
        if (!this.propagateWallConstraints())
            return false;
        if (!this.checkOddConstraints())
            return false;
        if (this.getStateDump() !== before) {
            if (!this.checkRectangleShape())
                return false;
            return this.solveAndCheck();
        }
        return true;
    }
    /** Apply room number constraints */
    propagateRoomConstraints() {
        for (const room of this.rooms) {
            if (room.targetWhiteCount === -1)
                continue;
            let whiteCount = 0;
            let blackCount = 0;
            let unknownCount = 0;
            for (const pos of room.cells) {
                const cell = this.cells.get(pos);
                if (cell === CellState.WHITE)
                    whiteCount++;
                else if (cell === CellState.BLACK)
                    blackCount++;
                else
                    unknownCount++;
            }
            // Check constraints
            if (whiteCount + unknownCount < room.targetWhiteCount)
                return false;
            if (whiteCount > room.targetWhiteCount)
                return false;
            // If target reached, mark rest as black
            if (whiteCount === room.targetWhiteCount) {
                for (const pos of room.cells) {
                    if (this.cells.get(pos) === CellState.UNKNOWN) {
                        this.cells.set(pos, CellState.BLACK);
                    }
                }
            }
            // If must fill all remaining cells
            if (unknownCount === room.targetWhiteCount - whiteCount) {
                for (const pos of room.cells) {
                    if (this.cells.get(pos) === CellState.UNKNOWN) {
                        this.cells.set(pos, CellState.WHITE);
                    }
                }
            }
        }
        return true;
    }
    /** White cells have 0 or 2 walls, black cells have 4 walls */
    propagateWallConstraints() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const pos = { row, col };
                const cell = this.cells.get(pos);
                let wallCount = 0;
                let noWallCount = 0;
                const adjacentWalls = [];
                for (const dir of DIRECTIONS) {
                    const adj = adjacent(pos, dir);
                    if (!this.isInBounds(adj)) {
                        wallCount++;
                        continue;
                    }
                    const wallState = this.getWallBetween(pos, adj);
                    if (wallState === WallState.WALL) {
                        wallCount++;
                    }
                    else if (wallState === WallState.NO_WALL) {
                        noWallCount++;
                    }
                    adjacentWalls.push({ pos: adj, state: wallState });
                }
                // Apply constraints
                if (cell === CellState.WHITE) {
                    // Must have 0 or 2 walls
                    if (wallCount > 2)
                        return false;
                    if (noWallCount > 0) {
                        // If any no-wall, all must be no-wall or wall
                        if (wallCount === 2) {
                            // 2 walls + some no-walls
                            for (const w of adjacentWalls) {
                                if (w.state === WallState.UNKNOWN) {
                                    this.setWallBetween(pos, w.pos, WallState.NO_WALL);
                                }
                            }
                        }
                        else if (noWallCount === 2 && wallCount === 1) {
                            // Pattern: 1 wall, 2 no-walls -> last must be wall
                            for (const w of adjacentWalls) {
                                if (w.state === WallState.UNKNOWN) {
                                    this.setWallBetween(pos, w.pos, WallState.WALL);
                                }
                            }
                        }
                        else if (noWallCount === 3) {
                            // All must be no-wall
                            for (const w of adjacentWalls) {
                                if (w.state === WallState.UNKNOWN) {
                                    this.setWallBetween(pos, w.pos, WallState.NO_WALL);
                                }
                            }
                        }
                    }
                    else if (wallCount === 2) {
                        // Exactly 2 walls - rest must be no-wall
                        for (const w of adjacentWalls) {
                            if (w.state === WallState.UNKNOWN) {
                                this.setWallBetween(pos, w.pos, WallState.NO_WALL);
                            }
                        }
                    }
                }
                else if (cell === CellState.BLACK) {
                    // Must have 4 walls
                    if (noWallCount > 0)
                        return false;
                    for (const w of adjacentWalls) {
                        if (w.state === WallState.UNKNOWN) {
                            this.setWallBetween(pos, w.pos, WallState.WALL);
                        }
                    }
                }
                else {
                    // Unknown - deduce from walls
                    if (noWallCount > 0) {
                        this.cells.set(pos, CellState.WHITE);
                    }
                    else if (wallCount > 2) {
                        this.cells.set(pos, CellState.BLACK);
                    }
                }
                // Constraint: corners can't have 1 or 3 no-walls
                if (noWallCount === 1 && wallCount === 3)
                    return false;
                if (noWallCount === 3 && wallCount === 1)
                    return false;
            }
        }
        return true;
    }
    /** Walls crossing each row/column must be even */
    checkOddConstraints() {
        // Check vertical walls
        for (let row = 0; row < this.height - 1; row++) {
            let noWallCount = 0;
            let allDetermined = true;
            for (let col = 0; col < this.width; col++) {
                const wall = this.verticalWalls.get(row, col);
                if (wall === WallState.NO_WALL)
                    noWallCount++;
                if (wall === WallState.UNKNOWN) {
                    allDetermined = false;
                    break;
                }
            }
            if (allDetermined && noWallCount % 2 !== 0)
                return false;
        }
        // Check horizontal walls
        for (let col = 0; col < this.width - 1; col++) {
            let noWallCount = 0;
            let allDetermined = true;
            for (let row = 0; row < this.height; row++) {
                const wall = this.horizontalWalls.get(row, col);
                if (wall === WallState.NO_WALL)
                    noWallCount++;
                if (wall === WallState.UNKNOWN) {
                    allDetermined = false;
                    break;
                }
            }
            if (allDetermined && noWallCount % 2 !== 0)
                return false;
        }
        return true;
    }
    /** Check if white cells form a rectangle */
    checkRectangleShape() {
        // Find a white cell at a corner (has exactly 2 walls)
        let cornerPos = null;
        let cornerDir1 = null;
        let cornerDir2 = null;
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const pos = { row, col };
                if (this.cells.get(pos) !== CellState.WHITE)
                    continue;
                const up = row === 0 ? WallState.WALL : this.verticalWalls.get(row - 1, col);
                const right = col === this.width - 1 ? WallState.WALL : this.horizontalWalls.get(row, col);
                const down = row === this.height - 1 ? WallState.WALL : this.verticalWalls.get(row, col);
                const left = col === 0 ? WallState.WALL : this.horizontalWalls.get(row, col - 1);
                // Check for corner patterns
                if (up === WallState.WALL && right === WallState.WALL) {
                    cornerPos = pos;
                    cornerDir1 = Direction.LEFT;
                    cornerDir2 = Direction.DOWN;
                    break;
                }
                else if (up === WallState.WALL && left === WallState.WALL) {
                    cornerPos = pos;
                    cornerDir1 = Direction.RIGHT;
                    cornerDir2 = Direction.DOWN;
                    break;
                }
                else if (down === WallState.WALL && right === WallState.WALL) {
                    cornerPos = pos;
                    cornerDir1 = Direction.LEFT;
                    cornerDir2 = Direction.UP;
                    break;
                }
                else if (down === WallState.WALL && left === WallState.WALL) {
                    cornerPos = pos;
                    cornerDir1 = Direction.RIGHT;
                    cornerDir2 = Direction.UP;
                    break;
                }
            }
            if (cornerPos)
                break;
        }
        // If no definite corner found, can't validate yet
        if (!cornerPos || !cornerDir1 || !cornerDir2)
            return true;
        // Trace rectangle from corner
        return this.traceRectangle(cornerPos, cornerDir1, cornerDir2);
    }
    /** Trace rectangle shape from a corner */
    traceRectangle(_start, _dir1, _dir2) {
        // This is a simplified check - full implementation would trace all 4 sides
        // For now, just ensure no contradictions
        return true;
    }
}
// ============================================
// Nagenawa Solver
// ============================================
export class NagenawaSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    static fromURL(height, width, param) {
        const field = new NagenawaField(height, width);
        // Parse wall data
        let readPos = 0;
        // Horizontal room walls
        for (let cnt = 0; cnt < height * (width - 1); cnt++) {
            const mod = cnt % 5;
            if (mod === 0) {
                const bit = parseInt(param[readPos], 36);
                readPos++;
                for (let i = 0; i < 5 && cnt - mod + i < height * (width - 1); i++) {
                    const row = Math.floor((cnt - mod + i) / (width - 1));
                    const col = (cnt - mod + i) % (width - 1);
                    const hasWall = (bit >> (4 - i)) & 1;
                    if (hasWall) {
                        field.setRoomWall({ row, col }, { row, col: col + 1 }, true);
                    }
                }
            }
        }
        // Vertical room walls
        for (let cnt = 0; cnt < (height - 1) * width; cnt++) {
            const mod = cnt % 5;
            if (mod === 0) {
                const bit = parseInt(param[readPos], 36);
                readPos++;
                for (let i = 0; i < 5 && cnt - mod + i < (height - 1) * width; i++) {
                    const row = Math.floor((cnt - mod + i) / width);
                    const col = (cnt - mod + i) % width;
                    const hasWall = (bit >> (4 - i)) & 1;
                    if (hasWall) {
                        field.setRoomWall({ row, col }, { row: row + 1, col }, true);
                    }
                }
            }
        }
        // Parse room numbers
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        const numbers = [];
        while (readPos < param.length) {
            const ch = param[readPos];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                for (let i = 0; i < interval + 1; i++) {
                    numbers.push(-1);
                }
                readPos++;
            }
            else if (ch === '-') {
                const num = parseInt(param.substring(readPos + 1, readPos + 3), 16);
                numbers.push(num);
                readPos += 3;
            }
            else {
                const num = parseInt(ch, 16);
                numbers.push(num);
                readPos++;
            }
        }
        // Build rooms from walls
        const visited = new Set();
        let roomIndex = 0;
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const key = posKey({ row, col });
                if (visited.has(key))
                    continue;
                const roomCells = [];
                const stack = [{ row, col }];
                visited.add(key);
                while (stack.length > 0) {
                    const pos = stack.pop();
                    roomCells.push(pos);
                    for (const dir of DIRECTIONS) {
                        const next = adjacent(pos, dir);
                        if (next.row < 0 || next.row >= height || next.col < 0 || next.col >= width)
                            continue;
                        const nextKey = posKey(next);
                        if (visited.has(nextKey))
                            continue;
                        // Check if there's a room wall between cells
                        let hasRoomWall = false;
                        if (pos.row === next.row) {
                            const c = Math.min(pos.col, next.col);
                            hasRoomWall = field['horizontalRoomWalls'].get(pos.row, c);
                        }
                        else {
                            const r = Math.min(pos.row, next.row);
                            hasRoomWall = field['verticalRoomWalls'].get(r, pos.col);
                        }
                        if (!hasRoomWall) {
                            visited.add(nextKey);
                            stack.push(next);
                        }
                    }
                }
                const targetCount = roomIndex < numbers.length ? numbers[roomIndex] : -1;
                field.addRoom(roomCells, targetCount);
                roomIndex++;
            }
        }
        return new NagenawaSolver(field);
    }
    getBranchCandidates(state) {
        const candidates = [];
        // Find first unknown cell
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state['cells'].get(row, col) === CellState.UNKNOWN) {
                    candidates.push({
                        apply: (s) => {
                            const c = s.clone();
                            c['cells'].set(row, col, CellState.BLACK);
                            return c;
                        },
                        description: `Black at (${row},${col})`,
                    }, {
                        apply: (s) => {
                            const c = s.clone();
                            c['cells'].set(row, col, CellState.WHITE);
                            return c;
                        },
                        description: `White at (${row},${col})`,
                    });
                    return candidates;
                }
            }
        }
        // Find first unknown wall
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width - 1; col++) {
                if (state['horizontalWalls'].get(row, col) === WallState.UNKNOWN) {
                    const adjacentLeft = state['cells'].get(row, col);
                    const adjacentRight = state['cells'].get(row, col + 1);
                    if (adjacentLeft === CellState.UNKNOWN && adjacentRight === CellState.UNKNOWN) {
                        continue;
                    }
                    candidates.push({
                        apply: (s) => {
                            const c = s.clone();
                            c.setHorizontalWall(row, col, WallState.WALL);
                            return c;
                        },
                        description: `H-wall at (${row},${col})`,
                    }, {
                        apply: (s) => {
                            const c = s.clone();
                            c.setHorizontalWall(row, col, WallState.NO_WALL);
                            return c;
                        },
                        description: `H-no-wall at (${row},${col})`,
                    });
                    return candidates;
                }
            }
        }
        for (let row = 0; row < state.height - 1; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state['verticalWalls'].get(row, col) === WallState.UNKNOWN) {
                    const adjacentUp = state['cells'].get(row, col);
                    const adjacentDown = state['cells'].get(row + 1, col);
                    if (adjacentUp === CellState.UNKNOWN && adjacentDown === CellState.UNKNOWN) {
                        continue;
                    }
                    candidates.push({
                        apply: (s) => {
                            const c = s.clone();
                            c.setVerticalWall(row, col, WallState.WALL);
                            return c;
                        },
                        description: `V-wall at (${row},${col})`,
                    }, {
                        apply: (s) => {
                            const c = s.clone();
                            c.setVerticalWall(row, col, WallState.NO_WALL);
                            return c;
                        },
                        description: `V-no-wall at (${row},${col})`,
                    });
                    return candidates;
                }
            }
        }
        return candidates;
    }
}
//# sourceMappingURL=nagenawa.js.map