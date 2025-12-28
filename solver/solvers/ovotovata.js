/**
 * Ovotovata Solver
 *
 * Rules:
 * 1. White cells must have exactly 2 walls around them (curve through)
 * 2. Black cells must have exactly 4 walls around them (isolated)
 * 3. Rooms (defined by fixed borders) may have numbers indicating curve count from border
 * 4. Gray rooms must contain at least one white cell
 * 5. White cells must be connected (single continuous path)
 * 6. Numbers indicate the length of the curve extending from the room border
 */
import { CellState, Direction, posKey, WallState } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Ovotovata Field State
// ============================================
export class OvotovataField {
    height;
    width;
    /** Cell states (BLACK/WHITE/UNKNOWN) */
    masu;
    /** Horizontal walls (between col and col+1) */
    yokoWall;
    /** Vertical walls (between row and row+1) */
    tateWall;
    /** Fixed horizontal room borders */
    yokoRoomWall;
    /** Fixed vertical room borders */
    tateRoomWall;
    /** Room definitions */
    rooms;
    constructor(height, width, param) {
        this.height = height;
        this.width = width;
        this.masu = new Grid(height, width, () => CellState.UNKNOWN);
        this.yokoWall = new Grid(height, width - 1, () => WallState.UNKNOWN);
        this.tateWall = new Grid(height - 1, width, () => WallState.UNKNOWN);
        this.yokoRoomWall = new Grid(height, width - 1, () => false);
        this.tateRoomWall = new Grid(height - 1, width, () => false);
        this.rooms = [];
        if (param) {
            this.parseParam(param);
        }
    }
    /** Parse pzv.jp URL parameter format */
    parseParam(param) {
        let readPos = 0;
        let bit = 0;
        // Parse horizontal room walls (yokoRoomWall)
        const yokoWallCount = this.height * (this.width - 1);
        for (let cnt = 0; cnt < yokoWallCount; cnt++) {
            const mod = cnt % 5;
            if (mod === 0) {
                bit = parseInt(param.charAt(readPos), 16);
                readPos++;
            }
            // Decode when we have 5 bits or at the end
            if (mod === 4 || cnt === yokoWallCount - 1) {
                // Decode up to 5 bits (or fewer at the end)
                if (mod >= 0 && cnt - mod + 0 < yokoWallCount) {
                    const index = cnt - mod + 0;
                    const row = Math.floor(index / (this.width - 1));
                    const col = index % (this.width - 1);
                    this.yokoRoomWall.set(row, col, Math.floor(bit / 16) % 2 === 1);
                }
                if (mod >= 1 && cnt - mod + 1 < yokoWallCount) {
                    const index = cnt - mod + 1;
                    const row = Math.floor(index / (this.width - 1));
                    const col = index % (this.width - 1);
                    this.yokoRoomWall.set(row, col, Math.floor(bit / 8) % 2 === 1);
                }
                if (mod >= 2 && cnt - mod + 2 < yokoWallCount) {
                    const index = cnt - mod + 2;
                    const row = Math.floor(index / (this.width - 1));
                    const col = index % (this.width - 1);
                    this.yokoRoomWall.set(row, col, Math.floor(bit / 4) % 2 === 1);
                }
                if (mod >= 3 && cnt - mod + 3 < yokoWallCount) {
                    const index = cnt - mod + 3;
                    const row = Math.floor(index / (this.width - 1));
                    const col = index % (this.width - 1);
                    this.yokoRoomWall.set(row, col, Math.floor(bit / 2) % 2 === 1);
                }
                if (mod >= 4 && cnt - mod + 4 < yokoWallCount) {
                    const index = cnt - mod + 4;
                    const row = Math.floor(index / (this.width - 1));
                    const col = index % (this.width - 1);
                    this.yokoRoomWall.set(row, col, Math.floor(bit / 1) % 2 === 1);
                }
            }
        }
        // Parse vertical room walls (tateRoomWall)
        const tateWallCount = (this.height - 1) * this.width;
        for (let cnt = 0; cnt < tateWallCount; cnt++) {
            const mod = cnt % 5;
            if (mod === 0) {
                bit = parseInt(param.charAt(readPos), 16);
                readPos++;
            }
            if (mod === 4 || cnt === tateWallCount - 1) {
                if (mod >= 0 && cnt - mod + 0 < tateWallCount) {
                    const index = cnt - mod + 0;
                    const row = Math.floor(index / this.width);
                    const col = index % this.width;
                    this.tateRoomWall.set(row, col, Math.floor(bit / 16) % 2 === 1);
                }
                if (mod >= 1 && cnt - mod + 1 < tateWallCount) {
                    const index = cnt - mod + 1;
                    const row = Math.floor(index / this.width);
                    const col = index % this.width;
                    this.tateRoomWall.set(row, col, Math.floor(bit / 8) % 2 === 1);
                }
                if (mod >= 2 && cnt - mod + 2 < tateWallCount) {
                    const index = cnt - mod + 2;
                    const row = Math.floor(index / this.width);
                    const col = index % this.width;
                    this.tateRoomWall.set(row, col, Math.floor(bit / 4) % 2 === 1);
                }
                if (mod >= 3 && cnt - mod + 3 < tateWallCount) {
                    const index = cnt - mod + 3;
                    const row = Math.floor(index / this.width);
                    const col = index % this.width;
                    this.tateRoomWall.set(row, col, Math.floor(bit / 2) % 2 === 1);
                }
                if (mod >= 4 && cnt - mod + 4 < tateWallCount) {
                    const index = cnt - mod + 4;
                    const row = Math.floor(index / this.width);
                    const col = index % this.width;
                    this.tateRoomWall.set(row, col, Math.floor(bit / 1) % 2 === 1);
                }
            }
        }
        // Parse room numbers
        const blackCntList = [];
        const isGrayList = [];
        while (readPos < param.length) {
            const ch = param.charAt(readPos);
            let wkNum;
            if (ch === '-') {
                // 16-255: encoded as -XX
                wkNum = parseInt(param.substring(readPos + 1, readPos + 3), 16);
                readPos += 3;
            }
            else if (ch === '+') {
                // 256-999: encoded as +XXX
                wkNum = parseInt(param.substring(readPos + 1, readPos + 4), 16);
                readPos += 4;
            }
            else {
                // 0-15: single hex digit
                wkNum = parseInt(ch, 16);
                readPos++;
            }
            // Decode: value = (blackCnt + 1) * 4 + isGray
            blackCntList.push(Math.floor(wkNum / 4) - 1);
            isGrayList.push(wkNum % 2 === 1);
        }
        // Build rooms from wall information
        this.buildRooms(blackCntList, isGrayList);
    }
    /** Build room structures from wall data */
    buildRooms(blackCntList, isGrayList) {
        const globalVisited = new Set();
        let roomIndex = 0;
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const key = posKey({ row, col });
                if (globalVisited.has(key))
                    continue;
                // Find all cells in this room
                const member = new Set();
                const memberKeys = new Set();
                const startPos = { row, col };
                this.collectRoomMembers(startPos, member, memberKeys);
                // Mark all members as visited globally
                for (const key of memberKeys) {
                    globalVisited.add(key);
                }
                // Find border walls
                const upWallPosSet = new Set();
                const rightWallPosSet = new Set();
                const downWallPosSet = new Set();
                const leftWallPosSet = new Set();
                for (const pos of member) {
                    // Check up border
                    if (pos.row > 0 && this.tateRoomWall.get(pos.row - 1, pos.col)) {
                        upWallPosSet.add({ row: pos.row - 1, col: pos.col });
                    }
                    // Check right border
                    if (pos.col < this.width - 1 && this.yokoRoomWall.get(pos.row, pos.col)) {
                        rightWallPosSet.add({ row: pos.row, col: pos.col });
                    }
                    // Check down border
                    if (pos.row < this.height - 1 && this.tateRoomWall.get(pos.row, pos.col)) {
                        downWallPosSet.add({ row: pos.row, col: pos.col });
                    }
                    // Check left border
                    if (pos.col > 0 && this.yokoRoomWall.get(pos.row, pos.col - 1)) {
                        leftWallPosSet.add({ row: pos.row, col: pos.col - 1 });
                    }
                }
                this.rooms.push({
                    curveCnt: roomIndex < blackCntList.length ? blackCntList[roomIndex] : -1,
                    isGray: roomIndex < isGrayList.length ? isGrayList[roomIndex] : false,
                    member,
                    upWallPosSet,
                    rightWallPosSet,
                    downWallPosSet,
                    leftWallPosSet,
                });
                roomIndex++;
            }
        }
    }
    /** Collect all cells in the same room (separated by room walls) */
    collectRoomMembers(pos, member, visited, from) {
        const key = posKey(pos);
        if (visited.has(key))
            return;
        member.add(pos);
        visited.add(key);
        // Try each direction
        if (from !== Direction.UP && pos.row > 0) {
            if (!this.tateRoomWall.get(pos.row - 1, pos.col)) {
                this.collectRoomMembers({ row: pos.row - 1, col: pos.col }, member, visited, Direction.DOWN);
            }
        }
        if (from !== Direction.RIGHT && pos.col < this.width - 1) {
            if (!this.yokoRoomWall.get(pos.row, pos.col)) {
                this.collectRoomMembers({ row: pos.row, col: pos.col + 1 }, member, visited, Direction.LEFT);
            }
        }
        if (from !== Direction.DOWN && pos.row < this.height - 1) {
            if (!this.tateRoomWall.get(pos.row, pos.col)) {
                this.collectRoomMembers({ row: pos.row + 1, col: pos.col }, member, visited, Direction.UP);
            }
        }
        if (from !== Direction.LEFT && pos.col > 0) {
            if (!this.yokoRoomWall.get(pos.row, pos.col - 1)) {
                this.collectRoomMembers({ row: pos.row, col: pos.col - 1 }, member, visited, Direction.RIGHT);
            }
        }
    }
    // ========== Constraint solving ==========
    /** Room constraints: gray rooms need white cells, numbered rooms need curves */
    roomSolve() {
        for (const room of this.rooms) {
            // Gray room must have at least one white cell
            if (room.isGray) {
                let hasWhite = false;
                for (const pos of room.member) {
                    if (this.masu.get(pos) !== CellState.BLACK) {
                        hasWhite = true;
                        break;
                    }
                }
                if (!hasWhite)
                    return false;
            }
            // Check curve count constraints
            if (room.curveCnt !== -1) {
                const curveCnt = room.curveCnt === 0 ? this.findDeterminedCurveCount(room) : room.curveCnt;
                if (curveCnt > 0) {
                    if (!this.wallCheck(curveCnt, room))
                        return false;
                }
            }
        }
        return true;
    }
    /** Find determined curve count for ? rooms */
    findDeterminedCurveCount(room) {
        // Check each border direction for a determined length
        const directions = [
            { wallSet: room.upWallPosSet, isVertical: true, forward: -1 },
            { wallSet: room.rightWallPosSet, isVertical: false, forward: 1 },
            { wallSet: room.downWallPosSet, isVertical: true, forward: 1 },
            { wallSet: room.leftWallPosSet, isVertical: false, forward: -1 },
        ];
        for (const dir of directions) {
            for (const wallPos of dir.wallSet) {
                let count = 0;
                let hasUnknown = false;
                if (dir.isVertical) {
                    // Vertical wall - count along rows
                    for (let i = 0;; i++) {
                        const checkRow = wallPos.row + dir.forward * i;
                        if (checkRow < 0 || checkRow >= this.height - 1)
                            break;
                        const wall = this.tateWall.get(checkRow, wallPos.col);
                        if (wall === WallState.NO_WALL)
                            count++;
                        else if (wall === WallState.WALL)
                            break;
                        else {
                            hasUnknown = true;
                            break;
                        }
                    }
                }
                else {
                    // Horizontal wall - count along columns
                    for (let i = 0;; i++) {
                        const checkCol = wallPos.col + dir.forward * i;
                        if (checkCol < 0 || checkCol >= this.width - 1)
                            break;
                        const wall = this.yokoWall.get(wallPos.row, checkCol);
                        if (wall === WallState.NO_WALL)
                            count++;
                        else if (wall === WallState.WALL)
                            break;
                        else {
                            hasUnknown = true;
                            break;
                        }
                    }
                }
                if (!hasUnknown && count > 0)
                    return count;
            }
        }
        return 0;
    }
    /** Check and propagate wall constraints for numbered rooms */
    wallCheck(curveCnt, room) {
        // Check upward borders
        for (const upWallPos of room.upWallPosSet) {
            if (this.tateWall.get(upWallPos.row, upWallPos.col) === WallState.NO_WALL) {
                // Propagate curve length
                if (upWallPos.row + 1 - curveCnt < 0)
                    return false; // Out of bounds
                for (let i = 0; i < curveCnt - 1; i++) {
                    const checkRow = upWallPos.row - i - 1;
                    if (this.tateWall.get(checkRow, upWallPos.col) === WallState.WALL)
                        return false;
                    this.tateWall.set(checkRow, upWallPos.col, WallState.NO_WALL);
                }
                if (upWallPos.row + 1 - curveCnt > 0) {
                    const endRow = upWallPos.row - curveCnt;
                    if (this.tateWall.get(endRow, upWallPos.col) === WallState.NO_WALL)
                        return false;
                    this.tateWall.set(endRow, upWallPos.col, WallState.WALL);
                }
            }
        }
        // Check right borders
        for (const rightWallPos of room.rightWallPosSet) {
            if (this.yokoWall.get(rightWallPos.row, rightWallPos.col) === WallState.NO_WALL) {
                if (rightWallPos.col + curveCnt + 1 > this.width)
                    return false;
                for (let i = 0; i < curveCnt - 1; i++) {
                    const checkCol = rightWallPos.col + i + 1;
                    if (this.yokoWall.get(rightWallPos.row, checkCol) === WallState.WALL)
                        return false;
                    this.yokoWall.set(rightWallPos.row, checkCol, WallState.NO_WALL);
                }
                if (rightWallPos.col + curveCnt + 1 < this.width) {
                    const endCol = rightWallPos.col + curveCnt;
                    if (this.yokoWall.get(rightWallPos.row, endCol) === WallState.NO_WALL)
                        return false;
                    this.yokoWall.set(rightWallPos.row, endCol, WallState.WALL);
                }
            }
        }
        // Check down borders
        for (const downWallPos of room.downWallPosSet) {
            if (this.tateWall.get(downWallPos.row, downWallPos.col) === WallState.NO_WALL) {
                if (downWallPos.row + curveCnt + 1 > this.height)
                    return false;
                for (let i = 0; i < curveCnt - 1; i++) {
                    const checkRow = downWallPos.row + i + 1;
                    if (this.tateWall.get(checkRow, downWallPos.col) === WallState.WALL)
                        return false;
                    this.tateWall.set(checkRow, downWallPos.col, WallState.NO_WALL);
                }
                if (downWallPos.row + curveCnt + 1 < this.height) {
                    const endRow = downWallPos.row + curveCnt;
                    if (this.tateWall.get(endRow, downWallPos.col) === WallState.NO_WALL)
                        return false;
                    this.tateWall.set(endRow, downWallPos.col, WallState.WALL);
                }
            }
        }
        // Check left borders
        for (const leftWallPos of room.leftWallPosSet) {
            if (this.yokoWall.get(leftWallPos.row, leftWallPos.col) === WallState.NO_WALL) {
                if (leftWallPos.col + 1 - curveCnt < 0)
                    return false;
                for (let i = 0; i < curveCnt - 1; i++) {
                    const checkCol = leftWallPos.col - i - 1;
                    if (this.yokoWall.get(leftWallPos.row, checkCol) === WallState.WALL)
                        return false;
                    this.yokoWall.set(leftWallPos.row, checkCol, WallState.NO_WALL);
                }
                if (leftWallPos.col + 1 - curveCnt > 0) {
                    const endCol = leftWallPos.col - curveCnt;
                    if (this.yokoWall.get(leftWallPos.row, endCol) === WallState.NO_WALL)
                        return false;
                    this.yokoWall.set(leftWallPos.row, endCol, WallState.WALL);
                }
            }
        }
        return true;
    }
    /** White cells have 2 walls, black cells have 4 walls */
    nextSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                let existsCount = 0;
                let notExistsCount = 0;
                // Count walls around this cell
                const wallUp = row === 0 ? WallState.WALL : this.tateWall.get(row - 1, col);
                const wallRight = col === this.width - 1 ? WallState.WALL : this.yokoWall.get(row, col);
                const wallDown = row === this.height - 1 ? WallState.WALL : this.tateWall.get(row, col);
                const wallLeft = col === 0 ? WallState.WALL : this.yokoWall.get(row, col - 1);
                if (wallUp === WallState.WALL)
                    existsCount++;
                else if (wallUp === WallState.NO_WALL)
                    notExistsCount++;
                if (wallRight === WallState.WALL)
                    existsCount++;
                else if (wallRight === WallState.NO_WALL)
                    notExistsCount++;
                if (wallDown === WallState.WALL)
                    existsCount++;
                else if (wallDown === WallState.NO_WALL)
                    notExistsCount++;
                if (wallLeft === WallState.WALL)
                    existsCount++;
                else if (wallLeft === WallState.NO_WALL)
                    notExistsCount++;
                const cell = this.masu.get(row, col);
                if (cell === CellState.UNKNOWN) {
                    // Invalid: 3 walls + 1 no-wall, or >2 no-walls
                    if ((existsCount === 3 && notExistsCount === 1) || notExistsCount > 2) {
                        return false;
                    }
                    if (existsCount > 2) {
                        this.masu.set(row, col, CellState.BLACK);
                    }
                    else if (notExistsCount > 0) {
                        this.masu.set(row, col, CellState.WHITE);
                    }
                }
                else if (cell === CellState.BLACK) {
                    // Black cells must have 4 walls
                    if (notExistsCount > 0)
                        return false;
                    // Close all walls
                    if (wallUp === WallState.UNKNOWN)
                        this.tateWall.set(row - 1, col, WallState.WALL);
                    if (wallRight === WallState.UNKNOWN)
                        this.yokoWall.set(row, col, WallState.WALL);
                    if (wallDown === WallState.UNKNOWN)
                        this.tateWall.set(row, col, WallState.WALL);
                    if (wallLeft === WallState.UNKNOWN)
                        this.yokoWall.set(row, col - 1, WallState.WALL);
                }
                else if (cell === CellState.WHITE) {
                    // White cells must have exactly 2 walls
                    if (existsCount > 2 || notExistsCount > 2)
                        return false;
                    if (notExistsCount === 2) {
                        // Close remaining walls
                        if (wallUp === WallState.UNKNOWN)
                            this.tateWall.set(row - 1, col, WallState.WALL);
                        if (wallRight === WallState.UNKNOWN)
                            this.yokoWall.set(row, col, WallState.WALL);
                        if (wallDown === WallState.UNKNOWN)
                            this.tateWall.set(row, col, WallState.WALL);
                        if (wallLeft === WallState.UNKNOWN)
                            this.yokoWall.set(row, col - 1, WallState.WALL);
                    }
                    else if (existsCount === 2) {
                        // Open remaining walls
                        if (wallUp === WallState.UNKNOWN)
                            this.tateWall.set(row - 1, col, WallState.NO_WALL);
                        if (wallRight === WallState.UNKNOWN)
                            this.yokoWall.set(row, col, WallState.NO_WALL);
                        if (wallDown === WallState.UNKNOWN)
                            this.tateWall.set(row, col, WallState.NO_WALL);
                        if (wallLeft === WallState.UNKNOWN)
                            this.yokoWall.set(row, col - 1, WallState.NO_WALL);
                    }
                }
            }
        }
        return true;
    }
    /** White cells must form a single connected component */
    connectSolve() {
        const whitePosSet = new Set();
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.masu.get(row, col) === CellState.WHITE) {
                    const pos = { row, col };
                    if (whitePosSet.size === 0) {
                        whitePosSet.add(posKey(pos));
                        this.collectConnected(pos, whitePosSet);
                    }
                    else {
                        if (!whitePosSet.has(posKey(pos)))
                            return false;
                    }
                }
            }
        }
        return true;
    }
    /** Collect connected white cells (not separated by walls) */
    collectConnected(pos, visited, from) {
        // Up
        if (from !== Direction.UP && pos.row > 0) {
            const wall = this.tateWall.get(pos.row - 1, pos.col);
            if (wall !== WallState.WALL) {
                const next = { row: pos.row - 1, col: pos.col };
                const key = posKey(next);
                if (!visited.has(key)) {
                    visited.add(key);
                    this.collectConnected(next, visited, Direction.DOWN);
                }
            }
        }
        // Right
        if (from !== Direction.RIGHT && pos.col < this.width - 1) {
            const wall = this.yokoWall.get(pos.row, pos.col);
            if (wall !== WallState.WALL) {
                const next = { row: pos.row, col: pos.col + 1 };
                const key = posKey(next);
                if (!visited.has(key)) {
                    visited.add(key);
                    this.collectConnected(next, visited, Direction.LEFT);
                }
            }
        }
        // Down
        if (from !== Direction.DOWN && pos.row < this.height - 1) {
            const wall = this.tateWall.get(pos.row, pos.col);
            if (wall !== WallState.WALL) {
                const next = { row: pos.row + 1, col: pos.col };
                const key = posKey(next);
                if (!visited.has(key)) {
                    visited.add(key);
                    this.collectConnected(next, visited, Direction.UP);
                }
            }
        }
        // Left
        if (from !== Direction.LEFT && pos.col > 0) {
            const wall = this.yokoWall.get(pos.row, pos.col - 1);
            if (wall !== WallState.WALL) {
                const next = { row: pos.row, col: pos.col - 1 };
                const key = posKey(next);
                if (!visited.has(key)) {
                    visited.add(key);
                    this.collectConnected(next, visited, Direction.RIGHT);
                }
            }
        }
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = Object.create(OvotovataField.prototype);
        cloned.height = this.height;
        cloned.width = this.width;
        cloned.masu = this.masu.clone();
        cloned.yokoWall = this.yokoWall.clone();
        cloned.tateWall = this.tateWall.clone();
        cloned.yokoRoomWall = this.yokoRoomWall;
        cloned.tateRoomWall = this.tateRoomWall;
        cloned.rooms = this.rooms;
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                dump += this.masu.get(row, col);
            }
        }
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                dump += this.yokoWall.get(row, col);
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                dump += this.tateWall.get(row, col);
            }
        }
        return dump;
    }
    isSolved() {
        // All cells must be determined
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.masu.get(row, col) === CellState.UNKNOWN)
                    return false;
            }
        }
        // All walls must be determined
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoWall.get(row, col) === WallState.UNKNOWN)
                    return false;
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateWall.get(row, col) === WallState.UNKNOWN)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const before = this.getStateDump();
            if (!this.nextSolve())
                return false;
            if (!this.roomSolve())
                return false;
            changed = this.getStateDump() !== before;
        }
        if (!this.connectSolve())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        // Top border
        let topLine = '';
        for (let col = 0; col < this.width * 2 + 1; col++) {
            topLine += '□';
        }
        lines.push(topLine);
        for (let row = 0; row < this.height; row++) {
            // Cell row
            let cellLine = '□';
            for (let col = 0; col < this.width; col++) {
                const cell = this.masu.get(row, col);
                cellLine += cell === CellState.BLACK ? '■' : cell === CellState.WHITE ? '・' : '　';
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
            // Wall row
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
        let bottomLine = '';
        for (let col = 0; col < this.width * 2 + 1; col++) {
            bottomLine += '□';
        }
        lines.push(bottomLine);
        return lines.join('\n');
    }
}
// ============================================
// Ovotovata Solver
// ============================================
export class OvotovataSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzv.jp URL */
    static fromString(height, width, param) {
        const field = new OvotovataField(height, width, param);
        return new OvotovataSolver(field);
    }
    /** Create solver from URL */
    static fromURL(url) {
        const parts = url.split('/');
        const height = parseInt(parts[parts.length - 2]);
        const width = parseInt(parts[parts.length - 3]);
        const param = parts[parts.length - 1];
        return OvotovataSolver.fromString(height, width, param);
    }
    getBranchCandidates(state) {
        const candidates = [];
        // Try branching on horizontal walls first
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width - 1; col++) {
                if (state['yokoWall'].get(row, col) === WallState.UNKNOWN) {
                    candidates.push({
                        apply: (s) => {
                            const cloned = s.clone();
                            cloned['yokoWall'].set(row, col, WallState.WALL);
                            return cloned;
                        },
                        description: `Set yokoWall[${row},${col}] to WALL`,
                    }, {
                        apply: (s) => {
                            const cloned = s.clone();
                            cloned['yokoWall'].set(row, col, WallState.NO_WALL);
                            return cloned;
                        },
                        description: `Set yokoWall[${row},${col}] to NO_WALL`,
                    });
                    return candidates;
                }
            }
        }
        // Try branching on vertical walls
        for (let row = 0; row < state.height - 1; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state['tateWall'].get(row, col) === WallState.UNKNOWN) {
                    candidates.push({
                        apply: (s) => {
                            const cloned = s.clone();
                            cloned['tateWall'].set(row, col, WallState.WALL);
                            return cloned;
                        },
                        description: `Set tateWall[${row},${col}] to WALL`,
                    }, {
                        apply: (s) => {
                            const cloned = s.clone();
                            cloned['tateWall'].set(row, col, WallState.NO_WALL);
                            return cloned;
                        },
                        description: `Set tateWall[${row},${col}] to NO_WALL`,
                    });
                    return candidates;
                }
            }
        }
        return candidates;
    }
}
//# sourceMappingURL=ovotovata.js.map