/**
 * Doubleback Solver
 *
 * Rules:
 * 1. Draw a single closed loop through white cells
 * 2. The loop must enter and exit each region exactly twice (cross 4 borders per region)
 * 3. Black cells are obstacles - the loop cannot pass through them
 * 4. Each white cell has exactly 2 edges (the loop enters and exits)
 */
import { Direction, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Doubleback Types
// ============================================
/** Wall state for edges between cells */
export var DoublebackEdgeState;
(function (DoublebackEdgeState) {
    /** Unknown/undetermined */
    DoublebackEdgeState["UNKNOWN"] = "unknown";
    /** Edge is part of the loop */
    DoublebackEdgeState["LINE"] = "line";
    /** Edge is not part of the loop */
    DoublebackEdgeState["EMPTY"] = "empty";
})(DoublebackEdgeState || (DoublebackEdgeState = {}));
// ============================================
// Doubleback Field State
// ============================================
export class DoublebackField {
    height;
    width;
    /** Black cells (obstacles) */
    blackCells;
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
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.blackCells = new Set();
        // Room walls: define the regions
        this.yokoRoomWall = new Grid(height, width - 1, () => false);
        this.tateRoomWall = new Grid(height - 1, width, () => false);
        // Loop edges: unknown initially
        this.yokoWall = new Grid(height, width - 1, () => DoublebackEdgeState.UNKNOWN);
        this.tateWall = new Grid(height - 1, width, () => DoublebackEdgeState.UNKNOWN);
        this.rooms = [];
    }
    /** Get horizontal edge state */
    getYokoEdge(row, col) {
        if (col < 0 || col >= this.width - 1)
            return DoublebackEdgeState.EMPTY;
        return this.yokoWall.get(row, col);
    }
    /** Get vertical edge state */
    getTateEdge(row, col) {
        if (row < 0 || row >= this.height - 1)
            return DoublebackEdgeState.EMPTY;
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
    /** Check if cell is black */
    isBlack(row, col) {
        return this.blackCells.has(posKey({ row, col }));
    }
    /** Add black cell */
    addBlackCell(row, col) {
        const key = posKey({ row, col });
        this.blackCells.add(key);
        // Close edges around black cell
        if (row > 0)
            this.setTateEdge(row - 1, col, DoublebackEdgeState.EMPTY);
        if (row < this.height - 1)
            this.setTateEdge(row, col, DoublebackEdgeState.EMPTY);
        if (col > 0)
            this.setYokoEdge(row, col - 1, DoublebackEdgeState.EMPTY);
        if (col < this.width - 1)
            this.setYokoEdge(row, col, DoublebackEdgeState.EMPTY);
        // Update room walls
        if (row > 0)
            this.tateRoomWall.set(row - 1, col, true);
        if (row < this.height - 1)
            this.tateRoomWall.set(row, col, true);
        if (col > 0)
            this.yokoRoomWall.set(row, col - 1, true);
        if (col < this.width - 1)
            this.yokoRoomWall.set(row, col, true);
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
            return true; // Border is wall
        return this.yokoRoomWall.get(row, col);
    }
    /** Get room wall (vertical) */
    getTateRoomWall(row, col) {
        if (row < 0 || row >= this.height - 1)
            return true; // Border is wall
        return this.tateRoomWall.get(row, col);
    }
    /** Build rooms from room walls */
    buildRooms() {
        this.rooms = [];
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
                    // Check up
                    if (r > 0 && this.getTateRoomWall(r - 1, c)) {
                        tateWallPosSet.add(posKey({ row: r - 1, col: c }));
                    }
                    // Check right
                    if (c < this.width - 1 && this.getYokoRoomWall(r, c)) {
                        yokoWallPosSet.add(posKey({ row: r, col: c }));
                    }
                    // Check down
                    if (r < this.height - 1 && this.getTateRoomWall(r, c)) {
                        tateWallPosSet.add(posKey({ row: r, col: c }));
                    }
                    // Check left
                    if (c > 0 && this.getYokoRoomWall(r, c - 1)) {
                        yokoWallPosSet.add(posKey({ row: r, col: c - 1 }));
                    }
                    assigned.add(memberKey);
                }
                // Only add room if it has non-black cells
                let hasWhite = false;
                for (const memberKey of member) {
                    if (!this.blackCells.has(memberKey)) {
                        hasWhite = true;
                        break;
                    }
                }
                if (hasWhite) {
                    this.rooms.push({ member, yokoWallPosSet, tateWallPosSet });
                }
            }
        }
    }
    /** Flood fill to find connected cells in same room */
    floodFillRoom(pos, member) {
        const { row, col } = pos;
        // Up
        if (row > 0 && !this.getTateRoomWall(row - 1, col)) {
            const nextKey = posKey({ row: row - 1, col });
            if (!member.has(nextKey)) {
                member.add(nextKey);
                this.floodFillRoom({ row: row - 1, col }, member);
            }
        }
        // Right
        if (col < this.width - 1 && !this.getYokoRoomWall(row, col)) {
            const nextKey = posKey({ row, col: col + 1 });
            if (!member.has(nextKey)) {
                member.add(nextKey);
                this.floodFillRoom({ row, col: col + 1 }, member);
            }
        }
        // Down
        if (row < this.height - 1 && !this.getTateRoomWall(row, col)) {
            const nextKey = posKey({ row: row + 1, col });
            if (!member.has(nextKey)) {
                member.add(nextKey);
                this.floodFillRoom({ row: row + 1, col }, member);
            }
        }
        // Left
        if (col > 0 && !this.getYokoRoomWall(row, col - 1)) {
            const nextKey = posKey({ row, col: col - 1 });
            if (!member.has(nextKey)) {
                member.add(nextKey);
                this.floodFillRoom({ row, col: col - 1 }, member);
            }
        }
    }
    // ========== Constraint solving ==========
    /** Each white cell must have exactly 2 edges */
    nextSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.isBlack(row, col))
                    continue;
                let lineCount = 0;
                let emptyCount = 0;
                const wallUp = row === 0 ? DoublebackEdgeState.EMPTY : this.getTateEdge(row - 1, col);
                const wallRight = col === this.width - 1 ? DoublebackEdgeState.EMPTY : this.getYokoEdge(row, col);
                const wallDown = row === this.height - 1 ? DoublebackEdgeState.EMPTY : this.getTateEdge(row, col);
                const wallLeft = col === 0 ? DoublebackEdgeState.EMPTY : this.getYokoEdge(row, col - 1);
                if (wallUp === DoublebackEdgeState.EMPTY)
                    emptyCount++;
                else if (wallUp === DoublebackEdgeState.LINE)
                    lineCount++;
                if (wallRight === DoublebackEdgeState.EMPTY)
                    emptyCount++;
                else if (wallRight === DoublebackEdgeState.LINE)
                    lineCount++;
                if (wallDown === DoublebackEdgeState.EMPTY)
                    emptyCount++;
                else if (wallDown === DoublebackEdgeState.LINE)
                    lineCount++;
                if (wallLeft === DoublebackEdgeState.EMPTY)
                    emptyCount++;
                else if (wallLeft === DoublebackEdgeState.LINE)
                    lineCount++;
                // White cell must have exactly 2 line edges
                if (lineCount > 2 || emptyCount > 2) {
                    return false;
                }
                // If already have 2 lines, rest must be empty
                if (lineCount === 2) {
                    if (wallUp === DoublebackEdgeState.UNKNOWN)
                        this.setTateEdge(row - 1, col, DoublebackEdgeState.EMPTY);
                    if (wallRight === DoublebackEdgeState.UNKNOWN)
                        this.setYokoEdge(row, col, DoublebackEdgeState.EMPTY);
                    if (wallDown === DoublebackEdgeState.UNKNOWN)
                        this.setTateEdge(row, col, DoublebackEdgeState.EMPTY);
                    if (wallLeft === DoublebackEdgeState.UNKNOWN)
                        this.setYokoEdge(row, col - 1, DoublebackEdgeState.EMPTY);
                }
                // If already have 2 empty, rest must be lines
                if (emptyCount === 2) {
                    if (wallUp === DoublebackEdgeState.UNKNOWN)
                        this.setTateEdge(row - 1, col, DoublebackEdgeState.LINE);
                    if (wallRight === DoublebackEdgeState.UNKNOWN)
                        this.setYokoEdge(row, col, DoublebackEdgeState.LINE);
                    if (wallDown === DoublebackEdgeState.UNKNOWN)
                        this.setTateEdge(row, col, DoublebackEdgeState.LINE);
                    if (wallLeft === DoublebackEdgeState.UNKNOWN)
                        this.setYokoEdge(row, col - 1, DoublebackEdgeState.LINE);
                }
            }
        }
        return true;
    }
    /** Each room must be crossed exactly 4 times (enter+exit twice) */
    countrySolve() {
        for (const room of this.rooms) {
            let lineCnt = 0;
            let unknownCnt = 0;
            // Count horizontal border crossings
            for (const wallKey of room.yokoWallPosSet) {
                const [r, c] = wallKey.split(',').map(Number);
                const state = this.getYokoEdge(r, c);
                if (state === DoublebackEdgeState.LINE) {
                    lineCnt++;
                }
                else if (state === DoublebackEdgeState.UNKNOWN) {
                    unknownCnt++;
                }
            }
            // Count vertical border crossings
            for (const wallKey of room.tateWallPosSet) {
                const [r, c] = wallKey.split(',').map(Number);
                const state = this.getTateEdge(r, c);
                if (state === DoublebackEdgeState.LINE) {
                    lineCnt++;
                }
                else if (state === DoublebackEdgeState.UNKNOWN) {
                    unknownCnt++;
                }
            }
            // Room must have exactly 4 crossings
            if (lineCnt + unknownCnt < 4) {
                return false; // Can't reach 4 crossings
            }
            if (lineCnt > 4) {
                return false; // Too many crossings
            }
            const remainingNeeded = 4 - lineCnt;
            if (remainingNeeded === 0) {
                // Already have 4 crossings, close all unknowns
                for (const wallKey of room.yokoWallPosSet) {
                    const [r, c] = wallKey.split(',').map(Number);
                    if (this.getYokoEdge(r, c) === DoublebackEdgeState.UNKNOWN) {
                        this.setYokoEdge(r, c, DoublebackEdgeState.EMPTY);
                    }
                }
                for (const wallKey of room.tateWallPosSet) {
                    const [r, c] = wallKey.split(',').map(Number);
                    if (this.getTateEdge(r, c) === DoublebackEdgeState.UNKNOWN) {
                        this.setTateEdge(r, c, DoublebackEdgeState.EMPTY);
                    }
                }
            }
            else if (unknownCnt === remainingNeeded) {
                // All unknowns must be lines
                for (const wallKey of room.yokoWallPosSet) {
                    const [r, c] = wallKey.split(',').map(Number);
                    if (this.getYokoEdge(r, c) === DoublebackEdgeState.UNKNOWN) {
                        this.setYokoEdge(r, c, DoublebackEdgeState.LINE);
                    }
                }
                for (const wallKey of room.tateWallPosSet) {
                    const [r, c] = wallKey.split(',').map(Number);
                    if (this.getTateEdge(r, c) === DoublebackEdgeState.UNKNOWN) {
                        this.setTateEdge(r, c, DoublebackEdgeState.LINE);
                    }
                }
            }
        }
        return true;
    }
    /** Check that white cells are all connected via the loop */
    connectSolve() {
        const whitePosSet = new Set();
        let firstWhite = null;
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.isBlack(row, col))
                    continue;
                const pos = { row, col };
                if (!firstWhite) {
                    firstWhite = pos;
                    whitePosSet.add(posKey(pos));
                    this.setContinuePosSet(pos, whitePosSet, null);
                }
                else {
                    if (!whitePosSet.has(posKey(pos))) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    /** Flood fill connected positions via non-EMPTY edges */
    setContinuePosSet(pos, continuePosSet, from) {
        const { row, col } = pos;
        // Up
        if (row > 0 && from !== Direction.UP) {
            const nextPos = { row: row - 1, col };
            if (this.getTateEdge(row - 1, col) !== DoublebackEdgeState.EMPTY && !continuePosSet.has(posKey(nextPos))) {
                continuePosSet.add(posKey(nextPos));
                this.setContinuePosSet(nextPos, continuePosSet, Direction.DOWN);
            }
        }
        // Right
        if (col < this.width - 1 && from !== Direction.RIGHT) {
            const nextPos = { row, col: col + 1 };
            if (this.getYokoEdge(row, col) !== DoublebackEdgeState.EMPTY && !continuePosSet.has(posKey(nextPos))) {
                continuePosSet.add(posKey(nextPos));
                this.setContinuePosSet(nextPos, continuePosSet, Direction.LEFT);
            }
        }
        // Down
        if (row < this.height - 1 && from !== Direction.DOWN) {
            const nextPos = { row: row + 1, col };
            if (this.getTateEdge(row, col) !== DoublebackEdgeState.EMPTY && !continuePosSet.has(posKey(nextPos))) {
                continuePosSet.add(posKey(nextPos));
                this.setContinuePosSet(nextPos, continuePosSet, Direction.UP);
            }
        }
        // Left
        if (col > 0 && from !== Direction.LEFT) {
            const nextPos = { row, col: col - 1 };
            if (this.getYokoEdge(row, col - 1) !== DoublebackEdgeState.EMPTY && !continuePosSet.has(posKey(nextPos))) {
                continuePosSet.add(posKey(nextPos));
                this.setContinuePosSet(nextPos, continuePosSet, Direction.RIGHT);
            }
        }
    }
    /** Loop rule: edges crossing a line must be even in number */
    oddSolve() {
        // Check horizontal lines (tate edges)
        for (let row = 0; row < this.height - 1; row++) {
            let lineCount = 0;
            let hasUnknown = false;
            for (let col = 0; col < this.width; col++) {
                const edge = this.getTateEdge(row, col);
                if (edge === DoublebackEdgeState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                else if (edge === DoublebackEdgeState.LINE) {
                    lineCount++;
                }
            }
            if (!hasUnknown && lineCount % 2 !== 0) {
                return false;
            }
        }
        // Check vertical lines (yoko edges)
        for (let col = 0; col < this.width - 1; col++) {
            let lineCount = 0;
            let hasUnknown = false;
            for (let row = 0; row < this.height; row++) {
                const edge = this.getYokoEdge(row, col);
                if (edge === DoublebackEdgeState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                else if (edge === DoublebackEdgeState.LINE) {
                    lineCount++;
                }
            }
            if (!hasUnknown && lineCount % 2 !== 0) {
                return false;
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new DoublebackField(this.height, this.width);
        cloned.blackCells = new Set(this.blackCells);
        // Room walls are shared (immutable after construction)
        cloned.yokoRoomWall = this.yokoRoomWall;
        cloned.tateRoomWall = this.tateRoomWall;
        cloned.rooms = this.rooms;
        // Copy edge states
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
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                const e = this.yokoWall.get(row, col);
                dump += e === DoublebackEdgeState.LINE ? 'L' : e === DoublebackEdgeState.EMPTY ? 'E' : 'U';
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                const e = this.tateWall.get(row, col);
                dump += e === DoublebackEdgeState.LINE ? 'L' : e === DoublebackEdgeState.EMPTY ? 'E' : 'U';
            }
        }
        return dump;
    }
    isSolved() {
        // All edges must be determined
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoWall.get(row, col) === DoublebackEdgeState.UNKNOWN)
                    return false;
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateWall.get(row, col) === DoublebackEdgeState.UNKNOWN)
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
            if (!this.countrySolve())
                return false;
            changed = this.getStateDump() !== beforeDump;
        }
        if (!this.oddSolve())
            return false;
        if (!this.connectSolve())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let cellLine = '';
            for (let col = 0; col < this.width; col++) {
                if (this.isBlack(row, col)) {
                    cellLine += '■';
                }
                else {
                    cellLine += '·';
                }
                if (col < this.width - 1) {
                    const edge = this.getYokoEdge(row, col);
                    const roomWall = this.getYokoRoomWall(row, col);
                    if (edge === DoublebackEdgeState.LINE) {
                        cellLine += roomWall ? '═' : '─';
                    }
                    else if (edge === DoublebackEdgeState.EMPTY) {
                        cellLine += roomWall ? '│' : ' ';
                    }
                    else {
                        cellLine += roomWall ? '?' : ' ';
                    }
                }
            }
            lines.push(cellLine);
            // Vertical edges
            if (row < this.height - 1) {
                let edgeLine = '';
                for (let col = 0; col < this.width; col++) {
                    const edge = this.getTateEdge(row, col);
                    const roomWall = this.getTateRoomWall(row, col);
                    if (edge === DoublebackEdgeState.LINE) {
                        edgeLine += roomWall ? '║' : '│';
                    }
                    else if (edge === DoublebackEdgeState.EMPTY) {
                        edgeLine += roomWall ? '─' : ' ';
                    }
                    else {
                        edgeLine += roomWall ? '?' : ' ';
                    }
                    if (col < this.width - 1) {
                        edgeLine += ' ';
                    }
                }
                lines.push(edgeLine);
            }
        }
        return lines.join('\n');
    }
    /** Get unknown edges for branching */
    getUnknownEdges() {
        const unknowns = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoWall.get(row, col) === DoublebackEdgeState.UNKNOWN) {
                    unknowns.push({ type: 'h', row, col });
                }
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateWall.get(row, col) === DoublebackEdgeState.UNKNOWN) {
                    unknowns.push({ type: 'v', row, col });
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Doubleback Solver
// ============================================
export class DoublebackSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzv.jp URL format */
    static fromString(height, width, param) {
        const field = new DoublebackField(height, width);
        let readPos = 0;
        let bit = 0;
        // Parse horizontal room walls
        const yokoWallCount = height * (width - 1);
        for (let cnt = 0; cnt < yokoWallCount; cnt++) {
            const mod = cnt % 5;
            if (mod === 0) {
                bit = parseInt(param[readPos], 32);
                readPos++;
            }
            if (mod === 4 || cnt === yokoWallCount - 1) {
                if (mod >= 0) {
                    const r = Math.floor((cnt - mod + 0) / (width - 1));
                    const c = (cnt - mod + 0) % (width - 1);
                    if ((bit >> (4 - 0)) & 1)
                        field.setYokoRoomWall(r, c, true);
                }
                if (mod >= 1) {
                    const r = Math.floor((cnt - mod + 1) / (width - 1));
                    const c = (cnt - mod + 1) % (width - 1);
                    if ((bit >> (4 - 1)) & 1)
                        field.setYokoRoomWall(r, c, true);
                }
                if (mod >= 2) {
                    const r = Math.floor((cnt - mod + 2) / (width - 1));
                    const c = (cnt - mod + 2) % (width - 1);
                    if ((bit >> (4 - 2)) & 1)
                        field.setYokoRoomWall(r, c, true);
                }
                if (mod >= 3) {
                    const r = Math.floor((cnt - mod + 3) / (width - 1));
                    const c = (cnt - mod + 3) % (width - 1);
                    if ((bit >> (4 - 3)) & 1)
                        field.setYokoRoomWall(r, c, true);
                }
                if (mod >= 4) {
                    const r = Math.floor((cnt - mod + 4) / (width - 1));
                    const c = (cnt - mod + 4) % (width - 1);
                    if ((bit >> (4 - 4)) & 1)
                        field.setYokoRoomWall(r, c, true);
                }
            }
        }
        // Parse vertical room walls
        const tateWallCount = (height - 1) * width;
        for (let cnt = 0; cnt < tateWallCount; cnt++) {
            const mod = cnt % 5;
            if (mod === 0) {
                bit = parseInt(param[readPos], 32);
                readPos++;
            }
            if (mod === 4 || cnt === tateWallCount - 1) {
                if (mod >= 0) {
                    const r = Math.floor((cnt - mod + 0) / width);
                    const c = (cnt - mod + 0) % width;
                    if ((bit >> (4 - 0)) & 1)
                        field.setTateRoomWall(r, c, true);
                }
                if (mod >= 1) {
                    const r = Math.floor((cnt - mod + 1) / width);
                    const c = (cnt - mod + 1) % width;
                    if ((bit >> (4 - 1)) & 1)
                        field.setTateRoomWall(r, c, true);
                }
                if (mod >= 2) {
                    const r = Math.floor((cnt - mod + 2) / width);
                    const c = (cnt - mod + 2) % width;
                    if ((bit >> (4 - 2)) & 1)
                        field.setTateRoomWall(r, c, true);
                }
                if (mod >= 3) {
                    const r = Math.floor((cnt - mod + 3) / width);
                    const c = (cnt - mod + 3) % width;
                    if ((bit >> (4 - 3)) & 1)
                        field.setTateRoomWall(r, c, true);
                }
                if (mod >= 4) {
                    const r = Math.floor((cnt - mod + 4) / width);
                    const c = (cnt - mod + 4) % width;
                    if ((bit >> (4 - 4)) & 1)
                        field.setTateRoomWall(r, c, true);
                }
            }
        }
        // Parse black cells (optional)
        if (readPos < param.length) {
            const blackCount = height * width;
            for (let cnt = 0; cnt < blackCount; cnt++) {
                const mod = cnt % 5;
                if (mod === 0) {
                    bit = parseInt(param[readPos], 32);
                    readPos++;
                }
                if (mod === 4 || cnt === blackCount - 1) {
                    for (let i = 0; i <= mod; i++) {
                        const r = Math.floor((cnt - mod + i) / width);
                        const c = (cnt - mod + i) % width;
                        if ((bit >> (4 - i)) & 1) {
                            field.addBlackCell(r, c);
                        }
                    }
                }
            }
        }
        // Build rooms after parsing
        field.buildRooms();
        return new DoublebackSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownEdges();
        if (unknowns.length === 0)
            return [];
        const edge = unknowns[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (edge.type === 'h') {
                        cloned.setYokoEdge(edge.row, edge.col, DoublebackEdgeState.LINE);
                    }
                    else {
                        cloned.setTateEdge(edge.row, edge.col, DoublebackEdgeState.LINE);
                    }
                    return cloned;
                },
                description: `Set ${edge.type === 'h' ? 'horizontal' : 'vertical'} edge at (${edge.row}, ${edge.col}) to LINE`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (edge.type === 'h') {
                        cloned.setYokoEdge(edge.row, edge.col, DoublebackEdgeState.EMPTY);
                    }
                    else {
                        cloned.setTateEdge(edge.row, edge.col, DoublebackEdgeState.EMPTY);
                    }
                    return cloned;
                },
                description: `Set ${edge.type === 'h' ? 'horizontal' : 'vertical'} edge at (${edge.row}, ${edge.col}) to EMPTY`,
            },
        ];
    }
}
//# sourceMappingURL=doubleback.js.map