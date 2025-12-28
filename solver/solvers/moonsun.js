/**
 * Moon or Sun (Moonsun) Solver
 *
 * Rules:
 * 1. Draw a single closed loop through white cells
 * 2. The loop must enter and exit each region exactly once (cross 2 borders per region)
 *    - Exception: if there's only 1 region, this rule doesn't apply
 * 3. Each region becomes either a "Sun room" or a "Moon room"
 * 4. In a Sun room: Sun cells are white (loop passes), Moon cells are black
 * 5. In a Moon room: Moon cells are white (loop passes), Sun cells are black
 * 6. Adjacent rooms connected by the loop must alternate (Sun→Moon→Sun...)
 */
import { CellState, Direction, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Moonsun Types
// ============================================
/** Wall state for edges between cells */
export var MoonsunEdgeState;
(function (MoonsunEdgeState) {
    /** Unknown/undetermined */
    MoonsunEdgeState["UNKNOWN"] = "unknown";
    /** Edge is part of the loop */
    MoonsunEdgeState["LINE"] = "line";
    /** Edge is not part of the loop */
    MoonsunEdgeState["EMPTY"] = "empty";
})(MoonsunEdgeState || (MoonsunEdgeState = {}));
/** Symbol in cell */
export var MoonsunSymbol;
(function (MoonsunSymbol) {
    MoonsunSymbol[MoonsunSymbol["NONE"] = 0] = "NONE";
    MoonsunSymbol[MoonsunSymbol["SUN"] = 1] = "SUN";
    MoonsunSymbol[MoonsunSymbol["MOON"] = 2] = "MOON";
})(MoonsunSymbol || (MoonsunSymbol = {}));
/** Room type */
export var RoomType;
(function (RoomType) {
    RoomType[RoomType["UNKNOWN"] = 0] = "UNKNOWN";
    RoomType[RoomType["SUN"] = 1] = "SUN";
    RoomType[RoomType["MOON"] = 2] = "MOON";
})(RoomType || (RoomType = {}));
// ============================================
// Moonsun Field State
// ============================================
export class MoonsunField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    cells;
    /** Symbols in cells (NONE/SUN/MOON) */
    symbols;
    /** Room walls (horizontal) - true means wall exists between cells */
    yokoRoomWall;
    /** Room walls (vertical) - true means wall exists between cells */
    tateRoomWall;
    /** Horizontal edges state (loop path) */
    yokoWall;
    /** Vertical edges state (loop path) */
    tateWall;
    /** List of rooms */
    rooms;
    /** Room types (0=unknown, 1=sun, 2=moon) */
    roomTypes;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.symbols = new Grid(height, width, () => MoonsunSymbol.NONE);
        this.yokoRoomWall = new Grid(height, width - 1, () => false);
        this.tateRoomWall = new Grid(height - 1, width, () => false);
        this.yokoWall = new Grid(height, width - 1, () => MoonsunEdgeState.UNKNOWN);
        this.tateWall = new Grid(height - 1, width, () => MoonsunEdgeState.UNKNOWN);
        this.rooms = [];
        this.roomTypes = new Map();
    }
    /** Get horizontal edge state */
    getYokoEdge(row, col) {
        if (col < 0 || col >= this.width - 1)
            return MoonsunEdgeState.EMPTY;
        return this.yokoWall.get(row, col);
    }
    /** Get vertical edge state */
    getTateEdge(row, col) {
        if (row < 0 || row >= this.height - 1)
            return MoonsunEdgeState.EMPTY;
        return this.tateWall.get(row, col);
    }
    /** Set horizontal edge */
    setYokoEdge(row, col, state) {
        if (col >= 0 && col < this.width - 1) {
            this.yokoWall.set(row, col, state);
        }
    }
    /** Set vertical edge */
    setTateEdge(row, col, state) {
        if (row >= 0 && row < this.height - 1) {
            this.tateWall.set(row, col, state);
        }
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell to black */
    setBlack(row, col) {
        this.cells.set(row, col, CellState.BLACK);
        // Close all edges around black cell
        if (row > 0)
            this.setTateEdge(row - 1, col, MoonsunEdgeState.EMPTY);
        if (row < this.height - 1)
            this.setTateEdge(row, col, MoonsunEdgeState.EMPTY);
        if (col > 0)
            this.setYokoEdge(row, col - 1, MoonsunEdgeState.EMPTY);
        if (col < this.width - 1)
            this.setYokoEdge(row, col, MoonsunEdgeState.EMPTY);
    }
    /** Set cell to white */
    setWhite(row, col) {
        this.cells.set(row, col, CellState.WHITE);
    }
    /** Set room wall (horizontal) */
    setYokoRoomWall(row, col, hasWall) {
        if (col >= 0 && col < this.width - 1) {
            this.yokoRoomWall.set(row, col, hasWall);
        }
    }
    /** Set room wall (vertical) */
    setTateRoomWall(row, col, hasWall) {
        if (row >= 0 && row < this.height - 1) {
            this.tateRoomWall.set(row, col, hasWall);
        }
    }
    /** Get room wall (horizontal) */
    getYokoRoomWall(row, col) {
        if (col < 0 || col >= this.width - 1)
            return true;
        return this.yokoRoomWall.get(row, col);
    }
    /** Get room wall (vertical) */
    getTateRoomWall(row, col) {
        if (row < 0 || row >= this.height - 1)
            return true;
        return this.tateRoomWall.get(row, col);
    }
    /** Set symbol */
    setSymbol(row, col, symbol) {
        this.symbols.set(row, col, symbol);
    }
    /** Get symbol */
    getSymbol(row, col) {
        return this.symbols.get(row, col);
    }
    /** Build rooms from room walls */
    buildRooms() {
        this.rooms = [];
        this.roomTypes = new Map();
        const assigned = new Set();
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const key = posKey({ row, col });
                if (assigned.has(key))
                    continue;
                // Start a new room
                const member = new Set();
                member.add(key);
                this.floodFillRoom({ row, col }, member);
                // Find border walls for this room
                const yokoWallPosSet = new Set();
                const tateWallPosSet = new Set();
                for (const memberKey of member) {
                    const [r, c] = memberKey.split(',').map(Number);
                    if (r > 0 && this.getTateRoomWall(r - 1, c)) {
                        tateWallPosSet.add(posKey({ row: r - 1, col: c }));
                    }
                    if (c < this.width - 1 && this.getYokoRoomWall(r, c)) {
                        yokoWallPosSet.add(posKey({ row: r, col: c }));
                    }
                    if (r < this.height - 1 && this.getTateRoomWall(r, c)) {
                        tateWallPosSet.add(posKey({ row: r, col: c }));
                    }
                    if (c > 0 && this.getYokoRoomWall(r, c - 1)) {
                        yokoWallPosSet.add(posKey({ row: r, col: c - 1 }));
                    }
                    assigned.add(memberKey);
                }
                this.rooms.push({ member, yokoWallPosSet, tateWallPosSet });
                this.roomTypes.set(this.rooms.length - 1, RoomType.UNKNOWN);
            }
        }
    }
    /** Flood fill to find connected cells in same room */
    floodFillRoom(pos, member) {
        const { row, col } = pos;
        if (row > 0 && !this.getTateRoomWall(row - 1, col)) {
            const nextKey = posKey({ row: row - 1, col });
            if (!member.has(nextKey)) {
                member.add(nextKey);
                this.floodFillRoom({ row: row - 1, col }, member);
            }
        }
        if (col < this.width - 1 && !this.getYokoRoomWall(row, col)) {
            const nextKey = posKey({ row, col: col + 1 });
            if (!member.has(nextKey)) {
                member.add(nextKey);
                this.floodFillRoom({ row, col: col + 1 }, member);
            }
        }
        if (row < this.height - 1 && !this.getTateRoomWall(row, col)) {
            const nextKey = posKey({ row: row + 1, col });
            if (!member.has(nextKey)) {
                member.add(nextKey);
                this.floodFillRoom({ row: row + 1, col }, member);
            }
        }
        if (col > 0 && !this.getYokoRoomWall(row, col - 1)) {
            const nextKey = posKey({ row, col: col - 1 });
            if (!member.has(nextKey)) {
                member.add(nextKey);
                this.floodFillRoom({ row, col: col - 1 }, member);
            }
        }
    }
    // ========== Constraint solving ==========
    /** Set room to sun type and apply constraints */
    toSunRoom(roomIdx) {
        if (this.roomTypes.get(roomIdx) === RoomType.MOON) {
            return false;
        }
        this.roomTypes.set(roomIdx, RoomType.SUN);
        const room = this.rooms[roomIdx];
        for (const memberKey of room.member) {
            const [r, c] = memberKey.split(',').map(Number);
            const symbol = this.symbols.get(r, c);
            if (symbol === MoonsunSymbol.SUN) {
                if (this.cells.get(r, c) === CellState.BLACK)
                    return false;
                this.setWhite(r, c);
            }
            else if (symbol === MoonsunSymbol.MOON) {
                if (this.cells.get(r, c) === CellState.WHITE)
                    return false;
                this.setBlack(r, c);
            }
        }
        return true;
    }
    /** Set room to moon type and apply constraints */
    toMoonRoom(roomIdx) {
        if (this.roomTypes.get(roomIdx) === RoomType.SUN) {
            return false;
        }
        this.roomTypes.set(roomIdx, RoomType.MOON);
        const room = this.rooms[roomIdx];
        for (const memberKey of room.member) {
            const [r, c] = memberKey.split(',').map(Number);
            const symbol = this.symbols.get(r, c);
            if (symbol === MoonsunSymbol.SUN) {
                if (this.cells.get(r, c) === CellState.WHITE)
                    return false;
                this.setBlack(r, c);
            }
            else if (symbol === MoonsunSymbol.MOON) {
                if (this.cells.get(r, c) === CellState.BLACK)
                    return false;
                this.setWhite(r, c);
            }
        }
        return true;
    }
    /** Room constraint: determine room types based on cell states */
    roomSolve() {
        for (let i = 0; i < this.rooms.length; i++) {
            const room = this.rooms[i];
            let sunRoom = false;
            let moonRoom = false;
            let sunCand = false;
            let moonCand = false;
            let whiteCnt = 0;
            let spaceCnt = 0;
            for (const memberKey of room.member) {
                const [r, c] = memberKey.split(',').map(Number);
                const state = this.cells.get(r, c);
                const symbol = this.symbols.get(r, c);
                if (state === CellState.WHITE) {
                    whiteCnt++;
                    if (symbol === MoonsunSymbol.SUN) {
                        sunRoom = true;
                        sunCand = true;
                    }
                    else if (symbol === MoonsunSymbol.MOON) {
                        moonRoom = true;
                        moonCand = true;
                    }
                }
                else if (state === CellState.UNKNOWN) {
                    spaceCnt++;
                    if (symbol === MoonsunSymbol.SUN) {
                        sunCand = true;
                    }
                    else if (symbol === MoonsunSymbol.MOON) {
                        moonCand = true;
                    }
                }
            }
            if (sunRoom && moonRoom) {
                return false;
            }
            if (!sunCand && !moonCand && (whiteCnt > 0 || spaceCnt > 0)) {
                // Room has no symbols but has white/unknown cells - can be either type
            }
            if (sunRoom || (sunCand && !moonCand)) {
                if (!this.toSunRoom(i))
                    return false;
            }
            if (moonRoom || (moonCand && !sunCand)) {
                if (!this.toMoonRoom(i))
                    return false;
            }
            // Each room needs at least 1 white cell for the loop
            if (whiteCnt + spaceCnt < 1) {
                return false;
            }
            if (whiteCnt === 0 && spaceCnt === 1) {
                for (const memberKey of room.member) {
                    const [r, c] = memberKey.split(',').map(Number);
                    if (this.cells.get(r, c) === CellState.UNKNOWN) {
                        this.setWhite(r, c);
                    }
                }
            }
        }
        return true;
    }
    /** Black cells close walls, white cells need exactly 2 open edges */
    nextSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const state = this.cells.get(row, col);
                if (state === CellState.BLACK) {
                    // Close all edges around black cell
                    if (row > 0) {
                        if (this.getTateEdge(row - 1, col) === MoonsunEdgeState.LINE)
                            return false;
                        this.setTateEdge(row - 1, col, MoonsunEdgeState.EMPTY);
                    }
                    if (col < this.width - 1) {
                        if (this.getYokoEdge(row, col) === MoonsunEdgeState.LINE)
                            return false;
                        this.setYokoEdge(row, col, MoonsunEdgeState.EMPTY);
                    }
                    if (row < this.height - 1) {
                        if (this.getTateEdge(row, col) === MoonsunEdgeState.LINE)
                            return false;
                        this.setTateEdge(row, col, MoonsunEdgeState.EMPTY);
                    }
                    if (col > 0) {
                        if (this.getYokoEdge(row, col - 1) === MoonsunEdgeState.LINE)
                            return false;
                        this.setYokoEdge(row, col - 1, MoonsunEdgeState.EMPTY);
                    }
                }
                else {
                    let lineCount = 0;
                    let emptyCount = 0;
                    const wallUp = row === 0 ? MoonsunEdgeState.EMPTY : this.getTateEdge(row - 1, col);
                    const wallRight = col === this.width - 1 ? MoonsunEdgeState.EMPTY : this.getYokoEdge(row, col);
                    const wallDown = row === this.height - 1 ? MoonsunEdgeState.EMPTY : this.getTateEdge(row, col);
                    const wallLeft = col === 0 ? MoonsunEdgeState.EMPTY : this.getYokoEdge(row, col - 1);
                    if (wallUp === MoonsunEdgeState.LINE) {
                        lineCount++;
                        if (row > 0 && this.cells.get(row - 1, col) === CellState.BLACK)
                            return false;
                        if (row > 0)
                            this.setWhite(row - 1, col);
                    }
                    else if (wallUp === MoonsunEdgeState.EMPTY) {
                        emptyCount++;
                    }
                    if (wallRight === MoonsunEdgeState.LINE) {
                        lineCount++;
                        if (col < this.width - 1 && this.cells.get(row, col + 1) === CellState.BLACK)
                            return false;
                        if (col < this.width - 1)
                            this.setWhite(row, col + 1);
                    }
                    else if (wallRight === MoonsunEdgeState.EMPTY) {
                        emptyCount++;
                    }
                    if (wallDown === MoonsunEdgeState.LINE) {
                        lineCount++;
                        if (row < this.height - 1 && this.cells.get(row + 1, col) === CellState.BLACK)
                            return false;
                        if (row < this.height - 1)
                            this.setWhite(row + 1, col);
                    }
                    else if (wallDown === MoonsunEdgeState.EMPTY) {
                        emptyCount++;
                    }
                    if (wallLeft === MoonsunEdgeState.LINE) {
                        lineCount++;
                        if (col > 0 && this.cells.get(row, col - 1) === CellState.BLACK)
                            return false;
                        if (col > 0)
                            this.setWhite(row, col - 1);
                    }
                    else if (wallLeft === MoonsunEdgeState.EMPTY) {
                        emptyCount++;
                    }
                    if (state === CellState.WHITE) {
                        if (lineCount > 2 || emptyCount > 2)
                            return false;
                        if (lineCount === 2) {
                            if (wallUp === MoonsunEdgeState.UNKNOWN)
                                this.setTateEdge(row - 1, col, MoonsunEdgeState.EMPTY);
                            if (wallRight === MoonsunEdgeState.UNKNOWN)
                                this.setYokoEdge(row, col, MoonsunEdgeState.EMPTY);
                            if (wallDown === MoonsunEdgeState.UNKNOWN)
                                this.setTateEdge(row, col, MoonsunEdgeState.EMPTY);
                            if (wallLeft === MoonsunEdgeState.UNKNOWN)
                                this.setYokoEdge(row, col - 1, MoonsunEdgeState.EMPTY);
                        }
                        else if (emptyCount === 2) {
                            if (wallUp === MoonsunEdgeState.UNKNOWN) {
                                this.setTateEdge(row - 1, col, MoonsunEdgeState.LINE);
                                if (row > 0)
                                    this.setWhite(row - 1, col);
                            }
                            if (wallRight === MoonsunEdgeState.UNKNOWN) {
                                this.setYokoEdge(row, col, MoonsunEdgeState.LINE);
                                if (col < this.width - 1)
                                    this.setWhite(row, col + 1);
                            }
                            if (wallDown === MoonsunEdgeState.UNKNOWN) {
                                this.setTateEdge(row, col, MoonsunEdgeState.LINE);
                                if (row < this.height - 1)
                                    this.setWhite(row + 1, col);
                            }
                            if (wallLeft === MoonsunEdgeState.UNKNOWN) {
                                this.setYokoEdge(row, col - 1, MoonsunEdgeState.LINE);
                                if (col > 0)
                                    this.setWhite(row, col - 1);
                            }
                        }
                    }
                    else if (state === CellState.UNKNOWN) {
                        if ((emptyCount === 3 && lineCount === 1) || emptyCount > 2) {
                            return false;
                        }
                        if (lineCount > 2) {
                            this.setBlack(row, col);
                            if (emptyCount === 3) {
                                if (wallUp === MoonsunEdgeState.UNKNOWN)
                                    this.setTateEdge(row - 1, col, MoonsunEdgeState.EMPTY);
                                if (wallRight === MoonsunEdgeState.UNKNOWN)
                                    this.setYokoEdge(row, col, MoonsunEdgeState.EMPTY);
                                if (wallDown === MoonsunEdgeState.UNKNOWN)
                                    this.setTateEdge(row, col, MoonsunEdgeState.EMPTY);
                                if (wallLeft === MoonsunEdgeState.UNKNOWN)
                                    this.setYokoEdge(row, col - 1, MoonsunEdgeState.EMPTY);
                            }
                        }
                        else if (lineCount > 0) {
                            this.setWhite(row, col);
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Each room must be crossed exactly 2 times (if more than 1 room) */
    countrySolve() {
        if (this.rooms.length === 1)
            return true;
        for (const room of this.rooms) {
            let lineCnt = 0;
            let unknownCnt = 0;
            for (const wallKey of room.yokoWallPosSet) {
                const [r, c] = wallKey.split(',').map(Number);
                const state = this.getYokoEdge(r, c);
                if (state === MoonsunEdgeState.LINE)
                    lineCnt++;
                else if (state === MoonsunEdgeState.UNKNOWN)
                    unknownCnt++;
            }
            for (const wallKey of room.tateWallPosSet) {
                const [r, c] = wallKey.split(',').map(Number);
                const state = this.getTateEdge(r, c);
                if (state === MoonsunEdgeState.LINE)
                    lineCnt++;
                else if (state === MoonsunEdgeState.UNKNOWN)
                    unknownCnt++;
            }
            if (lineCnt + unknownCnt < 2)
                return false;
            if (lineCnt > 2)
                return false;
            const remainingNeeded = 2 - lineCnt;
            if (remainingNeeded === 0) {
                for (const wallKey of room.yokoWallPosSet) {
                    const [r, c] = wallKey.split(',').map(Number);
                    if (this.getYokoEdge(r, c) === MoonsunEdgeState.UNKNOWN) {
                        this.setYokoEdge(r, c, MoonsunEdgeState.EMPTY);
                    }
                }
                for (const wallKey of room.tateWallPosSet) {
                    const [r, c] = wallKey.split(',').map(Number);
                    if (this.getTateEdge(r, c) === MoonsunEdgeState.UNKNOWN) {
                        this.setTateEdge(r, c, MoonsunEdgeState.EMPTY);
                    }
                }
            }
            else if (unknownCnt === remainingNeeded) {
                for (const wallKey of room.yokoWallPosSet) {
                    const [r, c] = wallKey.split(',').map(Number);
                    if (this.getYokoEdge(r, c) === MoonsunEdgeState.UNKNOWN) {
                        this.setYokoEdge(r, c, MoonsunEdgeState.LINE);
                    }
                }
                for (const wallKey of room.tateWallPosSet) {
                    const [r, c] = wallKey.split(',').map(Number);
                    if (this.getTateEdge(r, c) === MoonsunEdgeState.UNKNOWN) {
                        this.setTateEdge(r, c, MoonsunEdgeState.LINE);
                    }
                }
            }
        }
        return true;
    }
    /** Adjacent rooms connected via the loop must alternate (sun→moon→sun) */
    moonSunSolve() {
        for (let i = 0; i < this.rooms.length; i++) {
            const myRoom = this.rooms[i];
            const myRoomType = this.roomTypes.get(i) || RoomType.UNKNOWN;
            // Check horizontal borders
            for (const wallKey of myRoom.yokoWallPosSet) {
                const [r, c] = wallKey.split(',').map(Number);
                if (this.getYokoEdge(r, c) === MoonsunEdgeState.EMPTY)
                    continue;
                // Find the other room
                const connectPos = myRoom.member.has(wallKey)
                    ? { row: r, col: c + 1 }
                    : { row: r, col: c };
                for (let j = 0; j < this.rooms.length; j++) {
                    if (i === j)
                        continue;
                    const otherRoom = this.rooms[j];
                    if (!otherRoom.member.has(posKey(connectPos)))
                        continue;
                    const otherRoomType = this.roomTypes.get(j) || RoomType.UNKNOWN;
                    if (this.getYokoEdge(r, c) === MoonsunEdgeState.LINE) {
                        // Connected - must be different types
                        if (myRoomType === RoomType.UNKNOWN) {
                            if (otherRoomType === RoomType.SUN) {
                                if (!this.toMoonRoom(i))
                                    return false;
                            }
                            else if (otherRoomType === RoomType.MOON) {
                                if (!this.toSunRoom(i))
                                    return false;
                            }
                        }
                        else {
                            if (myRoomType === RoomType.SUN) {
                                if (!this.toMoonRoom(j))
                                    return false;
                            }
                            else if (myRoomType === RoomType.MOON) {
                                if (!this.toSunRoom(j))
                                    return false;
                            }
                        }
                    }
                    else {
                        // Unknown - if same type, must be wall
                        if (myRoomType !== RoomType.UNKNOWN && otherRoomType !== RoomType.UNKNOWN) {
                            if (myRoomType === otherRoomType) {
                                this.setYokoEdge(r, c, MoonsunEdgeState.EMPTY);
                            }
                        }
                    }
                    break;
                }
            }
            // Check vertical borders
            for (const wallKey of myRoom.tateWallPosSet) {
                const [r, c] = wallKey.split(',').map(Number);
                if (this.getTateEdge(r, c) === MoonsunEdgeState.EMPTY)
                    continue;
                const connectPos = myRoom.member.has(wallKey)
                    ? { row: r + 1, col: c }
                    : { row: r, col: c };
                for (let j = 0; j < this.rooms.length; j++) {
                    if (i === j)
                        continue;
                    const otherRoom = this.rooms[j];
                    if (!otherRoom.member.has(posKey(connectPos)))
                        continue;
                    const otherRoomType = this.roomTypes.get(j) || RoomType.UNKNOWN;
                    if (this.getTateEdge(r, c) === MoonsunEdgeState.LINE) {
                        if (myRoomType === RoomType.UNKNOWN) {
                            if (otherRoomType === RoomType.SUN) {
                                if (!this.toMoonRoom(i))
                                    return false;
                            }
                            else if (otherRoomType === RoomType.MOON) {
                                if (!this.toSunRoom(i))
                                    return false;
                            }
                        }
                        else {
                            if (myRoomType === RoomType.SUN) {
                                if (!this.toMoonRoom(j))
                                    return false;
                            }
                            else if (myRoomType === RoomType.MOON) {
                                if (!this.toSunRoom(j))
                                    return false;
                            }
                        }
                    }
                    else {
                        if (myRoomType !== RoomType.UNKNOWN && otherRoomType !== RoomType.UNKNOWN) {
                            if (myRoomType === otherRoomType) {
                                this.setTateEdge(r, c, MoonsunEdgeState.EMPTY);
                            }
                        }
                    }
                    break;
                }
            }
        }
        return true;
    }
    /** Loop rule: edges crossing a line must be even in number */
    oddSolve() {
        for (let row = 0; row < this.height - 1; row++) {
            let lineCount = 0;
            let hasUnknown = false;
            for (let col = 0; col < this.width; col++) {
                const edge = this.getTateEdge(row, col);
                if (edge === MoonsunEdgeState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                else if (edge === MoonsunEdgeState.LINE) {
                    lineCount++;
                }
            }
            if (!hasUnknown && lineCount % 2 !== 0)
                return false;
        }
        for (let col = 0; col < this.width - 1; col++) {
            let lineCount = 0;
            let hasUnknown = false;
            for (let row = 0; row < this.height; row++) {
                const edge = this.getYokoEdge(row, col);
                if (edge === MoonsunEdgeState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                else if (edge === MoonsunEdgeState.LINE) {
                    lineCount++;
                }
            }
            if (!hasUnknown && lineCount % 2 !== 0)
                return false;
        }
        return true;
    }
    /** Check white cell connectivity and mark isolated cells as black */
    connectSolve() {
        let firstWhite = null;
        const continuePosSet = new Set();
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.WHITE) {
                    if (!firstWhite) {
                        firstWhite = { row, col };
                        continuePosSet.add(posKey(firstWhite));
                        this.setContinuePosSetLoop(firstWhite, continuePosSet, null);
                    }
                    break;
                }
            }
            if (firstWhite)
                break;
        }
        if (!firstWhite)
            return true;
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const key = posKey({ row, col });
                if (!continuePosSet.has(key)) {
                    if (this.cells.get(row, col) === CellState.WHITE) {
                        return false;
                    }
                    this.setBlack(row, col);
                }
            }
        }
        return true;
    }
    /** Flood fill connected positions via non-EMPTY edges */
    setContinuePosSetLoop(pos, continuePosSet, from) {
        const { row, col } = pos;
        if (row > 0 && from !== Direction.UP) {
            const nextPos = { row: row - 1, col };
            if (this.getTateEdge(row - 1, col) !== MoonsunEdgeState.EMPTY && !continuePosSet.has(posKey(nextPos))) {
                continuePosSet.add(posKey(nextPos));
                this.setContinuePosSetLoop(nextPos, continuePosSet, Direction.DOWN);
            }
        }
        if (col < this.width - 1 && from !== Direction.RIGHT) {
            const nextPos = { row, col: col + 1 };
            if (this.getYokoEdge(row, col) !== MoonsunEdgeState.EMPTY && !continuePosSet.has(posKey(nextPos))) {
                continuePosSet.add(posKey(nextPos));
                this.setContinuePosSetLoop(nextPos, continuePosSet, Direction.LEFT);
            }
        }
        if (row < this.height - 1 && from !== Direction.DOWN) {
            const nextPos = { row: row + 1, col };
            if (this.getTateEdge(row, col) !== MoonsunEdgeState.EMPTY && !continuePosSet.has(posKey(nextPos))) {
                continuePosSet.add(posKey(nextPos));
                this.setContinuePosSetLoop(nextPos, continuePosSet, Direction.UP);
            }
        }
        if (col > 0 && from !== Direction.LEFT) {
            const nextPos = { row, col: col - 1 };
            if (this.getYokoEdge(row, col - 1) !== MoonsunEdgeState.EMPTY && !continuePosSet.has(posKey(nextPos))) {
                continuePosSet.add(posKey(nextPos));
                this.setContinuePosSetLoop(nextPos, continuePosSet, Direction.RIGHT);
            }
        }
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new MoonsunField(this.height, this.width);
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                cloned.cells.set(row, col, this.cells.get(row, col));
            }
        }
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
        cloned.symbols = this.symbols;
        cloned.yokoRoomWall = this.yokoRoomWall;
        cloned.tateRoomWall = this.tateRoomWall;
        cloned.rooms = this.rooms;
        cloned.roomTypes = new Map(this.roomTypes);
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const s = this.cells.get(row, col);
                dump += s === CellState.WHITE ? 'W' : s === CellState.BLACK ? 'B' : 'U';
            }
        }
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                const e = this.yokoWall.get(row, col);
                dump += e === MoonsunEdgeState.LINE ? 'L' : e === MoonsunEdgeState.EMPTY ? 'E' : 'U';
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                const e = this.tateWall.get(row, col);
                dump += e === MoonsunEdgeState.LINE ? 'L' : e === MoonsunEdgeState.EMPTY ? 'E' : 'U';
            }
        }
        return dump;
    }
    isSolved() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.UNKNOWN)
                    return false;
            }
        }
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoWall.get(row, col) === MoonsunEdgeState.UNKNOWN)
                    return false;
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateWall.get(row, col) === MoonsunEdgeState.UNKNOWN)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const beforeDump = this.getStateDump();
            if (!this.roomSolve())
                return false;
            if (!this.nextSolve())
                return false;
            if (!this.countrySolve())
                return false;
            if (!this.moonSunSolve())
                return false;
            if (!this.oddSolve())
                return false;
            changed = this.getStateDump() !== beforeDump;
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
                const sym = this.symbols.get(row, col);
                if (sym !== MoonsunSymbol.NONE) {
                    line += sym === MoonsunSymbol.SUN ? '☀' : '☽';
                }
                else {
                    const state = this.cells.get(row, col);
                    line += state === CellState.BLACK ? '█' : state === CellState.WHITE ? '·' : '?';
                }
                if (col < this.width - 1) {
                    const edge = this.getYokoEdge(row, col);
                    line += edge === MoonsunEdgeState.LINE ? '─' : edge === MoonsunEdgeState.EMPTY ? ' ' : '?';
                }
            }
            lines.push(line);
            if (row < this.height - 1) {
                let edgeLine = '';
                for (let col = 0; col < this.width; col++) {
                    const edge = this.getTateEdge(row, col);
                    edgeLine += edge === MoonsunEdgeState.LINE ? '│' : edge === MoonsunEdgeState.EMPTY ? ' ' : '?';
                    if (col < this.width - 1) {
                        edgeLine += ' ';
                    }
                }
                lines.push(edgeLine);
            }
        }
        return lines.join('\n');
    }
    /** Get unknown cells and edges for branching */
    getUnknownItems() {
        const unknowns = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.UNKNOWN) {
                    unknowns.push({ type: 'cell', row, col });
                }
            }
        }
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoWall.get(row, col) === MoonsunEdgeState.UNKNOWN) {
                    unknowns.push({ type: 'h', row, col });
                }
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateWall.get(row, col) === MoonsunEdgeState.UNKNOWN) {
                    unknowns.push({ type: 'v', row, col });
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Moonsun Solver
// ============================================
export class MoonsunSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzv.jp URL format */
    static fromString(height, width, param) {
        const field = new MoonsunField(height, width);
        let readPos = 0;
        let bit = 0;
        // Parse horizontal room walls (5 bits per character)
        const yokoWallCount = height * (width - 1);
        for (let cnt = 0; cnt < yokoWallCount; cnt++) {
            const mod = cnt % 5;
            if (mod === 0) {
                bit = parseInt(param[readPos], 36);
                readPos++;
            }
            if (mod === 4 || cnt === yokoWallCount - 1) {
                for (let i = 0; i <= mod; i++) {
                    const r = Math.floor((cnt - mod + i) / (width - 1));
                    const c = (cnt - mod + i) % (width - 1);
                    if ((bit >> (4 - i)) & 1) {
                        field.setYokoRoomWall(r, c, true);
                    }
                }
            }
        }
        // Parse vertical room walls
        const tateWallCount = (height - 1) * width;
        for (let cnt = 0; cnt < tateWallCount; cnt++) {
            const mod = cnt % 5;
            if (mod === 0) {
                bit = parseInt(param[readPos], 36);
                readPos++;
            }
            if (mod === 4 || cnt === tateWallCount - 1) {
                for (let i = 0; i <= mod; i++) {
                    const r = Math.floor((cnt - mod + i) / width);
                    const c = (cnt - mod + i) % width;
                    if ((bit >> (4 - i)) & 1) {
                        field.setTateRoomWall(r, c, true);
                    }
                }
            }
        }
        // Parse moon/sun symbols (3 cells per character)
        let index = 0;
        for (let i = readPos; i < param.length && index < height * width; i++) {
            const ch = param[i];
            const bitInfo = parseInt(ch, 36);
            const pos1 = Math.floor(bitInfo / 9) % 3;
            const pos2 = Math.floor(bitInfo / 3) % 3;
            const pos3 = bitInfo % 3;
            if (index < height * width) {
                const r1 = Math.floor(index / width);
                const c1 = index % width;
                if (pos1 === 1)
                    field.setSymbol(r1, c1, MoonsunSymbol.SUN);
                else if (pos1 === 2)
                    field.setSymbol(r1, c1, MoonsunSymbol.MOON);
            }
            index++;
            if (index < height * width) {
                const r2 = Math.floor(index / width);
                const c2 = index % width;
                if (pos2 === 1)
                    field.setSymbol(r2, c2, MoonsunSymbol.SUN);
                else if (pos2 === 2)
                    field.setSymbol(r2, c2, MoonsunSymbol.MOON);
            }
            index++;
            if (index < height * width) {
                const r3 = Math.floor(index / width);
                const c3 = index % width;
                if (pos3 === 1)
                    field.setSymbol(r3, c3, MoonsunSymbol.SUN);
                else if (pos3 === 2)
                    field.setSymbol(r3, c3, MoonsunSymbol.MOON);
            }
            index++;
        }
        field.buildRooms();
        return new MoonsunSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownItems();
        if (unknowns.length === 0)
            return [];
        const item = unknowns[0];
        if (item.type === 'cell') {
            return [
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setBlack(item.row, item.col);
                        return cloned;
                    },
                    description: `Set (${item.row}, ${item.col}) to BLACK`,
                },
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setWhite(item.row, item.col);
                        return cloned;
                    },
                    description: `Set (${item.row}, ${item.col}) to WHITE`,
                },
            ];
        }
        else {
            const isHorizontal = item.type === 'h';
            return [
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        if (isHorizontal) {
                            cloned.setYokoEdge(item.row, item.col, MoonsunEdgeState.LINE);
                        }
                        else {
                            cloned.setTateEdge(item.row, item.col, MoonsunEdgeState.LINE);
                        }
                        return cloned;
                    },
                    description: `Set ${isHorizontal ? 'horizontal' : 'vertical'} edge at (${item.row}, ${item.col}) to LINE`,
                },
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        if (isHorizontal) {
                            cloned.setYokoEdge(item.row, item.col, MoonsunEdgeState.EMPTY);
                        }
                        else {
                            cloned.setTateEdge(item.row, item.col, MoonsunEdgeState.EMPTY);
                        }
                        return cloned;
                    },
                    description: `Set ${isHorizontal ? 'horizontal' : 'vertical'} edge at (${item.row}, ${item.col}) to EMPTY`,
                },
            ];
        }
    }
}
//# sourceMappingURL=moonsun.js.map