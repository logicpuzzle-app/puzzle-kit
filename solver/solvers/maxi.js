/**
 * Maxi Loop Solver
 *
 * Rules:
 * 1. Draw walls between cells (each cell must have exactly 2 walls around it)
 * 2. All cells form a single connected area
 * 3. Each room with a number must have exactly that many connected white cells
 * 4. Each row/column must have an even number of NOT_EXISTS walls
 */
import { WallState, posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
export class MaxiField {
    height;
    width;
    /** Fixed room boundaries (horizontal) */
    yokoRoomWall;
    /** Fixed room boundaries (vertical) */
    tateRoomWall;
    /** Horizontal walls (between cells vertically) */
    yokoWall;
    /** Vertical walls (between cells horizontally) */
    tateWall;
    /** Room information */
    rooms;
    constructor(height, width, param) {
        this.height = height;
        this.width = width;
        // Initialize walls as UNKNOWN
        this.yokoWall = new Grid(height, width - 1, WallState.UNKNOWN);
        this.tateWall = new Grid(height - 1, width, WallState.UNKNOWN);
        // Parse room boundaries from param
        this.yokoRoomWall = new Grid(height, width - 1, false);
        this.tateRoomWall = new Grid(height - 1, width, false);
        let readPos = 0;
        // Parse horizontal room walls (encoded in base-32 with 5 bits per char)
        for (let cnt = 0; cnt < height * (width - 1); cnt++) {
            const mod = cnt % 5;
            let bit = 0;
            if (mod === 0) {
                bit = parseInt(param.charAt(readPos), 32);
                readPos++;
            }
            if (mod === 4 || cnt === height * (width - 1) - 1) {
                for (let i = 0; i <= mod; i++) {
                    const idx = cnt - mod + i;
                    const row = Math.floor(idx / (width - 1));
                    const col = idx % (width - 1);
                    this.yokoRoomWall.set(row, col, (bit >> (4 - i)) % 2 === 1);
                }
            }
        }
        // Parse vertical room walls
        for (let cnt = 0; cnt < (height - 1) * width; cnt++) {
            const mod = cnt % 5;
            let bit = 0;
            if (mod === 0) {
                bit = parseInt(param.charAt(readPos), 32);
                readPos++;
            }
            if (mod === 4 || cnt === (height - 1) * width - 1) {
                for (let i = 0; i <= mod; i++) {
                    const idx = cnt - mod + i;
                    const row = Math.floor(idx / width);
                    const col = idx % width;
                    this.tateRoomWall.set(row, col, (bit >> (4 - i)) % 2 === 1);
                }
            }
        }
        // Build rooms
        this.rooms = this.buildRooms(param.substring(readPos));
    }
    buildRooms(numberParam) {
        const rooms = [];
        const visited = new Set();
        // First, identify rooms by connectivity
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const posStr = posKey({ row, col });
                if (!visited.has(posStr)) {
                    const member = new Set();
                    this.exploreRoom({ row, col }, member, visited);
                    const yokoWallPos = new Set();
                    const tateWallPos = new Set();
                    for (const memberPosStr of member) {
                        const [r, c] = memberPosStr.split(',').map(Number);
                        if (r > 0 && this.tateRoomWall.get(r - 1, c)) {
                            tateWallPos.add(posKey({ row: r - 1, col: c }));
                        }
                        if (c < this.width - 1 && this.yokoRoomWall.get(r, c)) {
                            yokoWallPos.add(posKey({ row: r, col: c }));
                        }
                        if (r < this.height - 1 && this.tateRoomWall.get(r, c)) {
                            tateWallPos.add(posKey({ row: r, col: c }));
                        }
                        if (c > 0 && this.yokoRoomWall.get(r, c - 1)) {
                            yokoWallPos.add(posKey({ row: r, col: c - 1 }));
                        }
                    }
                    rooms.push({
                        whiteCnt: -1,
                        member,
                        yokoWallPos,
                        tateWallPos
                    });
                }
            }
        }
        // Parse room numbers
        const numbers = this.parseRoomNumbers(numberParam);
        for (let i = 0; i < rooms.length && i < numbers.length; i++) {
            rooms[i].whiteCnt = numbers[i];
        }
        return rooms;
    }
    parseRoomNumbers(param) {
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        const numbers = [];
        let i = 0;
        while (i < param.length) {
            const ch = param.charAt(i);
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                for (let j = 0; j <= interval; j++) {
                    numbers.push(-1);
                }
                i++;
            }
            else if (ch === '-') {
                numbers.push(parseInt(param.substring(i + 1, i + 3), 16));
                i += 3;
            }
            else if (ch === '+') {
                numbers.push(parseInt(param.substring(i + 1, i + 4), 16));
                i += 4;
            }
            else {
                numbers.push(parseInt(ch, 16));
                i++;
            }
        }
        return numbers;
    }
    exploreRoom(pos, member, visited) {
        const posStr = posKey(pos);
        if (visited.has(posStr))
            return;
        visited.add(posStr);
        member.add(posStr);
        const directions = [
            { dr: -1, dc: 0, wallGetter: () => pos.row > 0 && !this.tateRoomWall.get(pos.row - 1, pos.col) },
            { dr: 0, dc: 1, wallGetter: () => pos.col < this.width - 1 && !this.yokoRoomWall.get(pos.row, pos.col) },
            { dr: 1, dc: 0, wallGetter: () => pos.row < this.height - 1 && !this.tateRoomWall.get(pos.row, pos.col) },
            { dr: 0, dc: -1, wallGetter: () => pos.col > 0 && !this.yokoRoomWall.get(pos.row, pos.col - 1) }
        ];
        for (const dir of directions) {
            if (dir.wallGetter()) {
                this.exploreRoom({ row: pos.row + dir.dr, col: pos.col + dir.dc }, member, visited);
            }
        }
    }
    clone() {
        const cloned = Object.create(MaxiField.prototype);
        cloned.height = this.height;
        cloned.width = this.width;
        cloned.yokoRoomWall = this.yokoRoomWall;
        cloned.tateRoomWall = this.tateRoomWall;
        cloned.rooms = this.rooms;
        cloned.yokoWall = this.yokoWall.clone();
        cloned.tateWall = this.tateWall.clone();
        return cloned;
    }
    getStateDump() {
        return this.yokoWall.dump() + '|' + this.tateWall.dump();
    }
    isSolved() {
        // Check all walls are determined
        for (const [, val] of this.yokoWall.entries()) {
            if (val === WallState.UNKNOWN)
                return false;
        }
        for (const [, val] of this.tateWall.entries()) {
            if (val === WallState.UNKNOWN)
                return false;
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const before = this.getStateDump();
            if (!this.nextSolve())
                return false;
            if (!this.oddSolve())
                return false;
            if (this.getStateDump() === before) {
                changed = false;
                if (!this.roomSolve())
                    return false;
                if (!this.connectSolve())
                    return false;
            }
        }
        return true;
    }
    /** Each cell must have exactly 2 walls */
    nextSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                let exists = 0;
                let notExists = 0;
                const wallUp = row === 0 ? WallState.WALL : this.tateWall.get(row - 1, col);
                const wallRight = col === this.width - 1 ? WallState.WALL : this.yokoWall.get(row, col);
                const wallDown = row === this.height - 1 ? WallState.WALL : this.tateWall.get(row, col);
                const wallLeft = col === 0 ? WallState.WALL : this.yokoWall.get(row, col - 1);
                if (wallUp === WallState.WALL)
                    exists++;
                else if (wallUp === WallState.NO_WALL)
                    notExists++;
                if (wallRight === WallState.WALL)
                    exists++;
                else if (wallRight === WallState.NO_WALL)
                    notExists++;
                if (wallDown === WallState.WALL)
                    exists++;
                else if (wallDown === WallState.NO_WALL)
                    notExists++;
                if (wallLeft === WallState.WALL)
                    exists++;
                else if (wallLeft === WallState.NO_WALL)
                    notExists++;
                if (exists > 2 || notExists > 2)
                    return false;
                if (exists === 2) {
                    if (wallUp === WallState.UNKNOWN)
                        this.tateWall.set(row - 1, col, WallState.NO_WALL);
                    if (wallRight === WallState.UNKNOWN)
                        this.yokoWall.set(row, col, WallState.NO_WALL);
                    if (wallDown === WallState.UNKNOWN)
                        this.tateWall.set(row, col, WallState.NO_WALL);
                    if (wallLeft === WallState.UNKNOWN)
                        this.yokoWall.set(row, col - 1, WallState.NO_WALL);
                }
                else if (notExists === 2) {
                    if (wallUp === WallState.UNKNOWN)
                        this.tateWall.set(row - 1, col, WallState.WALL);
                    if (wallRight === WallState.UNKNOWN)
                        this.yokoWall.set(row, col, WallState.WALL);
                    if (wallDown === WallState.UNKNOWN)
                        this.tateWall.set(row, col, WallState.WALL);
                    if (wallLeft === WallState.UNKNOWN)
                        this.yokoWall.set(row, col - 1, WallState.WALL);
                }
            }
        }
        return true;
    }
    /** Each row/column must have even number of NO_WALL */
    oddSolve() {
        for (let row = 0; row < this.height - 1; row++) {
            let notExistsCount = 0;
            let hasUnknown = false;
            for (let col = 0; col < this.width; col++) {
                const wall = this.tateWall.get(row, col);
                if (wall === WallState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                if (wall === WallState.NO_WALL)
                    notExistsCount++;
            }
            if (!hasUnknown && notExistsCount % 2 !== 0)
                return false;
        }
        for (let col = 0; col < this.width - 1; col++) {
            let notExistsCount = 0;
            let hasUnknown = false;
            for (let row = 0; row < this.height; row++) {
                const wall = this.yokoWall.get(row, col);
                if (wall === WallState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                if (wall === WallState.NO_WALL)
                    notExistsCount++;
            }
            if (!hasUnknown && notExistsCount % 2 !== 0)
                return false;
        }
        return true;
    }
    /** Check room constraints */
    roomSolve() {
        for (const room of this.rooms) {
            if (room.whiteCnt === -1)
                continue;
            const regions = [];
            const visited = new Set();
            for (const memberPosStr of room.member) {
                if (!visited.has(memberPosStr)) {
                    const region = new Set();
                    this.exploreWhiteRegion(memberPosStr, region, visited);
                    if (region.size >= room.whiteCnt) {
                        regions.push(region);
                    }
                }
            }
            if (regions.length === 0)
                return false;
            for (const region of regions) {
                if (region.size > room.whiteCnt) {
                    const whiteVisited = new Set();
                    for (const posSt of region) {
                        if (!whiteVisited.has(posSt)) {
                            const whiteRegion = new Set();
                            this.exploreConnectedWhite(posSt, whiteRegion, whiteVisited);
                            if (whiteRegion.size > room.whiteCnt)
                                return false;
                        }
                    }
                }
            }
        }
        return true;
    }
    exploreWhiteRegion(posStr, region, visited) {
        if (visited.has(posStr) || !this.rooms.some(r => r.member.has(posStr)))
            return;
        visited.add(posStr);
        region.add(posStr);
        const [row, col] = posStr.split(',').map(Number);
        const neighbors = [
            { row: row - 1, col, wallCheck: () => row > 0 && this.tateWall.get(row - 1, col) !== WallState.WALL },
            { row, col: col + 1, wallCheck: () => col < this.width - 1 && this.yokoWall.get(row, col) !== WallState.WALL },
            { row: row + 1, col, wallCheck: () => row < this.height - 1 && this.tateWall.get(row, col) !== WallState.WALL },
            { row, col: col - 1, wallCheck: () => col > 0 && this.yokoWall.get(row, col - 1) !== WallState.WALL }
        ];
        for (const n of neighbors) {
            if (n.wallCheck()) {
                this.exploreWhiteRegion(posKey(n), region, visited);
            }
        }
    }
    exploreConnectedWhite(posStr, region, visited) {
        if (visited.has(posStr))
            return;
        visited.add(posStr);
        region.add(posStr);
        const [row, col] = posStr.split(',').map(Number);
        const neighbors = [
            { row: row - 1, col, wallCheck: () => row > 0 && this.tateWall.get(row - 1, col) === WallState.NO_WALL },
            { row, col: col + 1, wallCheck: () => col < this.width - 1 && this.yokoWall.get(row, col) === WallState.NO_WALL },
            { row: row + 1, col, wallCheck: () => row < this.height - 1 && this.tateWall.get(row, col) === WallState.NO_WALL },
            { row, col: col - 1, wallCheck: () => col > 0 && this.yokoWall.get(row, col - 1) === WallState.NO_WALL }
        ];
        for (const n of neighbors) {
            if (n.wallCheck()) {
                this.exploreConnectedWhite(posKey(n), region, visited);
            }
        }
    }
    /** All cells must be connected */
    connectSolve() {
        const visited = new Set();
        this.exploreAllCells(posKey({ row: 0, col: 0 }), visited);
        return visited.size === this.height * this.width;
    }
    exploreAllCells(posStr, visited) {
        if (visited.has(posStr))
            return;
        visited.add(posStr);
        const [row, col] = posStr.split(',').map(Number);
        const neighbors = [
            { row: row - 1, col, wallCheck: () => row > 0 && this.tateWall.get(row - 1, col) !== WallState.WALL },
            { row, col: col + 1, wallCheck: () => col < this.width - 1 && this.yokoWall.get(row, col) !== WallState.WALL },
            { row: row + 1, col, wallCheck: () => row < this.height - 1 && this.tateWall.get(row, col) !== WallState.WALL },
            { row, col: col - 1, wallCheck: () => col > 0 && this.yokoWall.get(row, col - 1) !== WallState.WALL }
        ];
        for (const n of neighbors) {
            if (n.wallCheck()) {
                this.exploreAllCells(posKey(n), visited);
            }
        }
    }
    toString() {
        let result = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                result += '.';
                if (col < this.width - 1) {
                    const wall = this.yokoWall.get(row, col);
                    result += wall === WallState.WALL ? '|' : wall === WallState.NO_WALL ? ' ' : '?';
                }
            }
            result += '\n';
            if (row < this.height - 1) {
                for (let col = 0; col < this.width; col++) {
                    const wall = this.tateWall.get(row, col);
                    result += wall === WallState.WALL ? '-' : wall === WallState.NO_WALL ? ' ' : '?';
                    result += ' ';
                }
                result += '\n';
            }
        }
        return result;
    }
}
// ============================================
// Maxi Loop Solver
// ============================================
export class MaxiSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    static fromURL(url) {
        const parts = url.split('/');
        const height = parseInt(parts[parts.length - 2]);
        const width = parseInt(parts[parts.length - 3]);
        const param = parts[parts.length - 1];
        const field = new MaxiField(height, width, param);
        return new MaxiSolver(field);
    }
    getBranchCandidates(state) {
        const candidates = [];
        // Try branching on unknown yokoWall
        for (const [pos, val] of state['yokoWall'].entries()) {
            if (val === WallState.UNKNOWN) {
                candidates.push({
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned['yokoWall'].set(pos, WallState.WALL);
                        return cloned;
                    },
                    description: `Set yoko wall at ${pos.row},${pos.col} to WALL`
                });
                candidates.push({
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned['yokoWall'].set(pos, WallState.NO_WALL);
                        return cloned;
                    },
                    description: `Set yoko wall at ${pos.row},${pos.col} to NO_WALL`
                });
                return candidates;
            }
        }
        // Try branching on unknown tateWall
        for (const [pos, val] of state['tateWall'].entries()) {
            if (val === WallState.UNKNOWN) {
                candidates.push({
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned['tateWall'].set(pos, WallState.WALL);
                        return cloned;
                    },
                    description: `Set tate wall at ${pos.row},${pos.col} to WALL`
                });
                candidates.push({
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned['tateWall'].set(pos, WallState.NO_WALL);
                        return cloned;
                    },
                    description: `Set tate wall at ${pos.row},${pos.col} to NO_WALL`
                });
                return candidates;
            }
        }
        return candidates;
    }
}
//# sourceMappingURL=maxi.js.map