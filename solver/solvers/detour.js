/**
 * Detour Solver
 *
 * Rules:
 * 1. Draw a single path through all cells that visits each cell exactly once
 * 2. The path cannot cross itself
 * 3. Each cell has exactly 2 walls (2 open passages)
 * 4. Numbers in rooms indicate the number of "curves" (turns) in that room
 * 5. A curve is a cell where the path changes direction (not straight)
 * 6. The path must connect all cells in a single continuous loop/path
 * 7. Each row/column must have an even number of horizontal/vertical passages
 */
import { WallState, posKey, Direction } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Room Definition
// ============================================
class Room {
    /** Number of curves required in this room (-1 if no clue) */
    curveCnt;
    /** Positions that belong to this room */
    members;
    /** Horizontal wall positions that border this room */
    yokoWallPos;
    /** Vertical wall positions that border this room */
    tateWallPos;
    constructor(curveCnt, members, yokoWallPos, tateWallPos) {
        this.curveCnt = curveCnt;
        this.members = new Set(members.map(posKey));
        this.yokoWallPos = new Set(yokoWallPos.map(posKey));
        this.tateWallPos = new Set(tateWallPos.map(posKey));
    }
    /** Get top-left position for display purposes */
    getNumberPos() {
        let minRow = Infinity;
        let minCol = Infinity;
        for (const key of this.members) {
            const [row, col] = key.split(',').map(Number);
            if (col < minCol || (col === minCol && row < minRow)) {
                minRow = row;
                minCol = col;
            }
        }
        return { row: minRow, col: minCol };
    }
}
// ============================================
// Detour Field State
// ============================================
export class DetourField {
    height;
    width;
    /** Horizontal walls between cells (row, col) and (row, col+1) */
    yokoWall;
    /** Vertical walls between cells (row, col) and (row+1, col) */
    tateWall;
    /** Room boundaries - horizontal walls (fixed) */
    yokoRoomWall;
    /** Room boundaries - vertical walls (fixed) */
    tateRoomWall;
    /** Rooms with clues */
    rooms;
    constructor(height, width, yokoRoomWall, tateRoomWall, rooms) {
        this.height = height;
        this.width = width;
        this.rooms = rooms;
        // Initialize wall grids
        this.yokoWall = new Grid(height, width - 1, WallState.UNKNOWN);
        this.tateWall = new Grid(height - 1, width, WallState.UNKNOWN);
        // Copy room walls
        this.yokoRoomWall = new Grid(height, width - 1, false);
        this.tateRoomWall = new Grid(height - 1, width, false);
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width - 1; col++) {
                this.yokoRoomWall.set(row, col, yokoRoomWall[row][col]);
            }
        }
        for (let row = 0; row < height - 1; row++) {
            for (let col = 0; col < width; col++) {
                this.tateRoomWall.set(row, col, tateRoomWall[row][col]);
            }
        }
    }
    /** Get wall state in direction from cell */
    getWall(row, col, dir) {
        if (dir === Direction.UP) {
            return row === 0 ? WallState.WALL : this.tateWall.get(row - 1, col);
        }
        else if (dir === Direction.RIGHT) {
            return col === this.width - 1 ? WallState.WALL : this.yokoWall.get(row, col);
        }
        else if (dir === Direction.DOWN) {
            return row === this.height - 1 ? WallState.WALL : this.tateWall.get(row, col);
        }
        else { // LEFT
            return col === 0 ? WallState.WALL : this.yokoWall.get(row, col - 1);
        }
    }
    /** Set wall state in direction from cell */
    setWall(row, col, dir, state) {
        if (dir === Direction.UP && row > 0) {
            this.tateWall.set(row - 1, col, state);
        }
        else if (dir === Direction.RIGHT && col < this.width - 1) {
            this.yokoWall.set(row, col, state);
        }
        else if (dir === Direction.DOWN && row < this.height - 1) {
            this.tateWall.set(row, col, state);
        }
        else if (dir === Direction.LEFT && col > 0) {
            this.yokoWall.set(row, col - 1, state);
        }
    }
    // ========== FieldState implementation ==========
    clone() {
        const yokoRoomWallArray = [];
        for (let row = 0; row < this.height; row++) {
            yokoRoomWallArray[row] = [];
            for (let col = 0; col < this.width - 1; col++) {
                yokoRoomWallArray[row][col] = this.yokoRoomWall.get(row, col);
            }
        }
        const tateRoomWallArray = [];
        for (let row = 0; row < this.height - 1; row++) {
            tateRoomWallArray[row] = [];
            for (let col = 0; col < this.width; col++) {
                tateRoomWallArray[row][col] = this.tateRoomWall.get(row, col);
            }
        }
        const cloned = new DetourField(this.height, this.width, yokoRoomWallArray, tateRoomWallArray, this.rooms);
        // Copy wall states
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                cloned.yokoWall.set(row, col, this.yokoWall.get(row, col));
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                cloned.tateWall.set(row, col, this.tateWall.get(row, col));
            }
        }
        return cloned;
    }
    getStateDump() {
        return `Y:${this.yokoWall.dump()}|T:${this.tateWall.dump()}`;
    }
    isSolved() {
        // Check all walls are determined
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoWall.get(row, col) === WallState.UNKNOWN) {
                    return false;
                }
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateWall.get(row, col) === WallState.UNKNOWN) {
                    return false;
                }
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const beforeState = this.getStateDump();
            // Rule: Each cell has exactly 2 walls
            if (!this.nextSolve()) {
                return false;
            }
            // Rule: Even number of passages per row/column
            if (!this.oddSolve()) {
                return false;
            }
            // Rule: Room curve count constraints
            if (!this.roomSolve()) {
                return false;
            }
            changed = this.getStateDump() !== beforeState;
        }
        // Check connectivity (all cells form single path)
        if (!this.connectSolve()) {
            return false;
        }
        return true;
    }
    /** Rule: Each cell must have exactly 2 walls (2 open passages) */
    nextSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                let wallCount = 0;
                let noWallCount = 0;
                const dirs = [Direction.UP, Direction.RIGHT, Direction.DOWN, Direction.LEFT];
                for (const dir of dirs) {
                    const wall = this.getWall(row, col, dir);
                    if (wall === WallState.WALL)
                        wallCount++;
                    else if (wall === WallState.NO_WALL)
                        noWallCount++;
                }
                // Too many walls or passages - contradiction
                if (wallCount > 2 || noWallCount > 2) {
                    return false;
                }
                // Dead end with only 1 passage - contradiction
                if (wallCount === 3 && noWallCount === 0) {
                    return false;
                }
                // Exactly 2 walls - mark remaining as passages
                if (wallCount === 2) {
                    for (const dir of dirs) {
                        if (this.getWall(row, col, dir) === WallState.UNKNOWN) {
                            this.setWall(row, col, dir, WallState.NO_WALL);
                        }
                    }
                }
                // Exactly 2 passages - mark remaining as walls
                if (noWallCount === 2) {
                    for (const dir of dirs) {
                        if (this.getWall(row, col, dir) === WallState.UNKNOWN) {
                            this.setWall(row, col, dir, WallState.WALL);
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Rule: Each row/column must have even number of passages */
    oddSolve() {
        // Check horizontal walls (vertical passages through rows)
        for (let row = 0; row < this.height - 1; row++) {
            let noWallCount = 0;
            let hasUnknown = false;
            for (let col = 0; col < this.width; col++) {
                const state = this.tateWall.get(row, col);
                if (state === WallState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                else if (state === WallState.NO_WALL) {
                    noWallCount++;
                }
            }
            if (!hasUnknown && noWallCount % 2 !== 0) {
                return false;
            }
        }
        // Check vertical walls (horizontal passages through columns)
        for (let col = 0; col < this.width - 1; col++) {
            let noWallCount = 0;
            let hasUnknown = false;
            for (let row = 0; row < this.height; row++) {
                const state = this.yokoWall.get(row, col);
                if (state === WallState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                else if (state === WallState.NO_WALL) {
                    noWallCount++;
                }
            }
            if (!hasUnknown && noWallCount % 2 !== 0) {
                return false;
            }
        }
        return true;
    }
    /** Rule: Room curve count constraints */
    roomSolve() {
        for (const room of this.rooms) {
            if (room.curveCnt === -1)
                continue;
            let curveCount = 0;
            let straightCount = 0;
            for (const posStr of room.members) {
                const [row, col] = posStr.split(',').map(Number);
                const wallUp = this.getWall(row, col, Direction.UP);
                const wallRight = this.getWall(row, col, Direction.RIGHT);
                const wallDown = this.getWall(row, col, Direction.DOWN);
                const wallLeft = this.getWall(row, col, Direction.LEFT);
                // Straight patterns (opposite walls or passages)
                const isStraightVertical = (wallUp === WallState.WALL && wallDown === WallState.WALL) ||
                    (wallUp === WallState.NO_WALL && wallDown === WallState.NO_WALL);
                const isStraightHorizontal = (wallRight === WallState.WALL && wallLeft === WallState.WALL) ||
                    (wallRight === WallState.NO_WALL && wallLeft === WallState.NO_WALL);
                if (isStraightVertical || isStraightHorizontal) {
                    straightCount++;
                }
                else {
                    // Curve patterns (L-shaped: two adjacent walls or passages)
                    const isCurve = (wallUp === WallState.WALL && wallRight === WallState.WALL) ||
                        (wallUp === WallState.WALL && wallLeft === WallState.WALL) ||
                        (wallRight === WallState.WALL && wallDown === WallState.WALL) ||
                        (wallDown === WallState.WALL && wallLeft === WallState.WALL) ||
                        (wallUp === WallState.NO_WALL && wallRight === WallState.NO_WALL) ||
                        (wallUp === WallState.NO_WALL && wallLeft === WallState.NO_WALL) ||
                        (wallRight === WallState.NO_WALL && wallDown === WallState.NO_WALL) ||
                        (wallDown === WallState.NO_WALL && wallLeft === WallState.NO_WALL) ||
                        (wallUp === WallState.WALL && wallDown === WallState.NO_WALL) ||
                        (wallDown === WallState.WALL && wallUp === WallState.NO_WALL) ||
                        (wallRight === WallState.WALL && wallLeft === WallState.NO_WALL) ||
                        (wallLeft === WallState.WALL && wallRight === WallState.NO_WALL);
                    if (isCurve) {
                        curveCount++;
                    }
                }
            }
            // Too many curves
            if (curveCount > room.curveCnt) {
                return false;
            }
            // Not enough cells left for required curves
            if (room.members.size - room.curveCnt < straightCount) {
                return false;
            }
        }
        return true;
    }
    /** Check if all cells are connected in a single path */
    connectSolve() {
        const visited = new Set();
        const queue = [{ row: 0, col: 0 }];
        visited.add(posKey({ row: 0, col: 0 }));
        while (queue.length > 0) {
            const pos = queue.shift();
            // Check all 4 directions
            const directions = [
                { dir: Direction.UP, nextRow: pos.row - 1, nextCol: pos.col },
                { dir: Direction.RIGHT, nextRow: pos.row, nextCol: pos.col + 1 },
                { dir: Direction.DOWN, nextRow: pos.row + 1, nextCol: pos.col },
                { dir: Direction.LEFT, nextRow: pos.row, nextCol: pos.col - 1 }
            ];
            for (const { dir, nextRow, nextCol } of directions) {
                if (nextRow < 0 || nextRow >= this.height || nextCol < 0 || nextCol >= this.width) {
                    continue;
                }
                const wall = this.getWall(pos.row, pos.col, dir);
                if (wall !== WallState.WALL) {
                    const nextKey = posKey({ row: nextRow, col: nextCol });
                    if (!visited.has(nextKey)) {
                        visited.add(nextKey);
                        queue.push({ row: nextRow, col: nextCol });
                    }
                }
            }
        }
        return visited.size === this.height * this.width;
    }
    toString() {
        const lines = [];
        // Top border
        lines.push('□'.repeat(this.width * 2 + 1));
        for (let row = 0; row < this.height; row++) {
            // Cell row
            let cellLine = '□';
            for (let col = 0; col < this.width; col++) {
                cellLine += '・';
                if (col < this.width - 1) {
                    const wall = this.yokoWall.get(row, col);
                    const isRoomWall = this.yokoRoomWall.get(row, col);
                    if (wall === WallState.UNKNOWN) {
                        cellLine += isRoomWall ? '？' : '　';
                    }
                    else if (wall === WallState.NO_WALL) {
                        cellLine += isRoomWall ? '＋' : '・';
                    }
                    else {
                        cellLine += isRoomWall ? '□' : '○';
                    }
                }
            }
            cellLine += '□';
            lines.push(cellLine);
            // Horizontal wall row
            if (row < this.height - 1) {
                let wallLine = '□';
                for (let col = 0; col < this.width; col++) {
                    const wall = this.tateWall.get(row, col);
                    const isRoomWall = this.tateRoomWall.get(row, col);
                    if (wall === WallState.UNKNOWN) {
                        wallLine += isRoomWall ? '？' : '　';
                    }
                    else if (wall === WallState.NO_WALL) {
                        wallLine += isRoomWall ? '＋' : '・';
                    }
                    else {
                        wallLine += isRoomWall ? '□' : '○';
                    }
                    if (col < this.width - 1) {
                        wallLine += '□';
                    }
                }
                wallLine += '□';
                lines.push(wallLine);
            }
        }
        // Bottom border
        lines.push('□'.repeat(this.width * 2 + 1));
        return lines.join('\n');
    }
    /** Get all unknown walls for branching */
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
// Detour Solver
// ============================================
export class DetourSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Parse puzzle from puzz.link format */
    static fromString(height, width, param) {
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        // Parse room walls from encoded format
        const yokoRoomWall = Array(height).fill(0).map(() => Array(width - 1).fill(false));
        const tateRoomWall = Array(height - 1).fill(0).map(() => Array(width).fill(false));
        let readPos = 0;
        // Parse horizontal room walls (5 bits per character)
        for (let cnt = 0; cnt < height * (width - 1); cnt += 5) {
            const bit = parseInt(param[readPos], 16);
            readPos++;
            const remaining = height * (width - 1) - cnt;
            const count = Math.min(5, remaining);
            for (let i = 0; i < count; i++) {
                const idx = cnt + i;
                const row = Math.floor(idx / (width - 1));
                const col = idx % (width - 1);
                const bitPos = 4 - i; // 16, 8, 4, 2, 1
                yokoRoomWall[row][col] = ((bit >> bitPos) & 1) === 1;
            }
        }
        // Parse vertical room walls (5 bits per character)
        for (let cnt = 0; cnt < (height - 1) * width; cnt += 5) {
            const bit = parseInt(param[readPos], 16);
            readPos++;
            const remaining = (height - 1) * width - cnt;
            const count = Math.min(5, remaining);
            for (let i = 0; i < count; i++) {
                const idx = cnt + i;
                const row = Math.floor(idx / width);
                const col = idx % width;
                const bitPos = 4 - i;
                tateRoomWall[row][col] = ((bit >> bitPos) & 1) === 1;
            }
        }
        // Parse room numbers
        const roomNumbers = [];
        while (readPos < param.length) {
            const ch = param[readPos];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                // Multiple empty rooms
                for (let i = 0; i <= interval; i++) {
                    roomNumbers.push(-1);
                }
                readPos++;
            }
            else if (ch === '-') {
                // 16-255 (2 hex digits)
                const num = parseInt(param.substring(readPos + 1, readPos + 3), 16);
                roomNumbers.push(num);
                readPos += 3;
            }
            else if (ch === '+') {
                // 256-999 (3 hex digits)
                const num = parseInt(param.substring(readPos + 1, readPos + 4), 16);
                roomNumbers.push(num);
                readPos += 4;
            }
            else {
                // 0-15 (single hex digit)
                const num = parseInt(ch, 16);
                roomNumbers.push(num);
                readPos++;
            }
        }
        // Build rooms
        const rooms = [];
        const assigned = new Set();
        let roomIdx = 0;
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const key = posKey({ row, col });
                if (assigned.has(key))
                    continue;
                // Flood fill to find room members
                const members = [];
                const yokoBorders = [];
                const tateBorders = [];
                const queue = [{ row, col }];
                assigned.add(key);
                while (queue.length > 0) {
                    const pos = queue.shift();
                    members.push(pos);
                    // Check all 4 directions for room boundaries
                    const checks = [
                        { dRow: -1, dCol: 0, isYoko: false, wallRow: pos.row - 1, wallCol: pos.col },
                        { dRow: 0, dCol: 1, isYoko: true, wallRow: pos.row, wallCol: pos.col },
                        { dRow: 1, dCol: 0, isYoko: false, wallRow: pos.row, wallCol: pos.col },
                        { dRow: 0, dCol: -1, isYoko: true, wallRow: pos.row, wallCol: pos.col - 1 }
                    ];
                    for (const check of checks) {
                        const nextRow = pos.row + check.dRow;
                        const nextCol = pos.col + check.dCol;
                        if (nextRow < 0 || nextRow >= height || nextCol < 0 || nextCol >= width) {
                            continue;
                        }
                        const hasRoomWall = check.isYoko
                            ? yokoRoomWall[check.wallRow][check.wallCol]
                            : tateRoomWall[check.wallRow][check.wallCol];
                        if (hasRoomWall) {
                            // Room boundary
                            if (check.isYoko) {
                                yokoBorders.push({ row: check.wallRow, col: check.wallCol });
                            }
                            else {
                                tateBorders.push({ row: check.wallRow, col: check.wallCol });
                            }
                        }
                        else {
                            // Same room, continue flood fill
                            const nextKey = posKey({ row: nextRow, col: nextCol });
                            if (!assigned.has(nextKey)) {
                                assigned.add(nextKey);
                                queue.push({ row: nextRow, col: nextCol });
                            }
                        }
                    }
                }
                const roomNumber = roomNumbers[roomIdx] ?? -1;
                rooms.push(new Room(roomNumber, members, yokoBorders, tateBorders));
                roomIdx++;
            }
        }
        const field = new DetourField(height, width, yokoRoomWall, tateRoomWall, rooms);
        return new DetourSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownWalls();
        if (unknowns.length === 0)
            return [];
        // Pick first unknown wall
        const wall = unknowns[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (wall.type === 'yoko') {
                        cloned['yokoWall'].set(wall.row, wall.col, WallState.WALL);
                    }
                    else {
                        cloned['tateWall'].set(wall.row, wall.col, WallState.WALL);
                    }
                    return cloned;
                },
                description: `Set ${wall.type} wall at (${wall.row}, ${wall.col}) to WALL`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (wall.type === 'yoko') {
                        cloned['yokoWall'].set(wall.row, wall.col, WallState.NO_WALL);
                    }
                    else {
                        cloned['tateWall'].set(wall.row, wall.col, WallState.NO_WALL);
                    }
                    return cloned;
                },
                description: `Set ${wall.type} wall at (${wall.row}, ${wall.col}) to NO_WALL`,
            },
        ];
    }
}
//# sourceMappingURL=detour.js.map