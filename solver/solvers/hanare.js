/**
 * Hanare Solver
 *
 * Rules:
 * 1. Some cells are divided into rooms by walls
 * 2. Paint exactly one cell black in each room
 * 3. Black cells can be placed at a distance equal to the difference
 *    between their room sizes from each other (in the same row/column)
 *
 * For example, if room sizes are 5 and 3, their black cells must be
 * exactly |5-3| = 2 cells apart in the same row or column.
 */
import { CellState, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Hanare Field State
// ============================================
export class HanareField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    cells;
    /** Horizontal walls (between horizontally adjacent cells) */
    yokoWall;
    /** Vertical walls (between vertically adjacent cells) */
    tateWall;
    /** Room definitions - list of sets of positions */
    rooms;
    /** Fixed black cells from initial puzzle */
    fixedCells;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        // Initialize walls
        // yokoWall[row][col] = wall between (row,col) and (row,col+1)
        this.yokoWall = [];
        for (let row = 0; row < height; row++) {
            this.yokoWall[row] = new Array(width - 1).fill(false);
        }
        // tateWall[row][col] = wall between (row,col) and (row+1,col)
        this.tateWall = [];
        for (let row = 0; row < height - 1; row++) {
            this.tateWall[row] = new Array(width).fill(false);
        }
        this.rooms = [];
        this.fixedCells = new Set();
    }
    /** Initialize from walls and fixed cells */
    initializeFromData(yokoWall, tateWall, fixedPositions) {
        // Copy walls
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                this.yokoWall[row][col] = yokoWall[row][col];
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                this.tateWall[row][col] = tateWall[row][col];
            }
        }
        // Build rooms from walls
        this.buildRooms();
        // Set fixed black cells
        for (const pos of fixedPositions) {
            this.cells.set(pos, CellState.BLACK);
            this.fixedCells.add(posKey(pos));
        }
    }
    /** Build room definitions from wall data */
    buildRooms() {
        const visited = new Set();
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const pos = { row, col };
                const key = posKey(pos);
                if (!visited.has(key)) {
                    const room = new Set();
                    this.buildRoomRecursive(pos, room, visited);
                    this.rooms.push(room);
                }
            }
        }
    }
    /** Recursively build a room by flood-filling without crossing walls */
    buildRoomRecursive(pos, room, visited) {
        const key = posKey(pos);
        if (visited.has(key))
            return;
        visited.add(key);
        room.add(pos);
        // Check up
        if (pos.row > 0 && !this.tateWall[pos.row - 1][pos.col]) {
            this.buildRoomRecursive({ row: pos.row - 1, col: pos.col }, room, visited);
        }
        // Check right
        if (pos.col < this.width - 1 && !this.yokoWall[pos.row][pos.col]) {
            this.buildRoomRecursive({ row: pos.row, col: pos.col + 1 }, room, visited);
        }
        // Check down
        if (pos.row < this.height - 1 && !this.tateWall[pos.row][pos.col]) {
            this.buildRoomRecursive({ row: pos.row + 1, col: pos.col }, room, visited);
        }
        // Check left
        if (pos.col > 0 && !this.yokoWall[pos.row][pos.col - 1]) {
            this.buildRoomRecursive({ row: pos.row, col: pos.col - 1 }, room, visited);
        }
    }
    /** Get room size for a position */
    getRoomSize(pos) {
        for (const room of this.rooms) {
            for (const roomPos of room) {
                if (roomPos.row === pos.row && roomPos.col === pos.col) {
                    return room.size;
                }
            }
        }
        return 0;
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell to black */
    setBlack(row, col) {
        this.cells.set(row, col, CellState.BLACK);
    }
    /** Set cell to white */
    setWhite(row, col) {
        this.cells.set(row, col, CellState.WHITE);
    }
    // ========== Constraint solving methods ==========
    /**
     * Room constraint: Each room must have exactly 1 black cell
     */
    roomSolve() {
        for (const room of this.rooms) {
            let blackCount = 0;
            let unknownCount = 0;
            const unknownPositions = [];
            for (const pos of room) {
                const state = this.cells.get(pos);
                if (state === CellState.BLACK) {
                    blackCount++;
                }
                else if (state === CellState.UNKNOWN) {
                    unknownCount++;
                    unknownPositions.push(pos);
                }
            }
            // Check if we can satisfy the constraint
            if (blackCount + unknownCount < 1) {
                return false; // Not enough cells for required black
            }
            if (blackCount > 1) {
                return false; // Too many black cells
            }
            if (blackCount === 1) {
                // Already have the required black cell, rest must be white
                for (const pos of unknownPositions) {
                    this.setWhite(pos.row, pos.col);
                }
            }
            else if (unknownCount === 1) {
                // Only one unknown cell and need 1 black, so it must be black
                const pos = unknownPositions[0];
                this.setBlack(pos.row, pos.col);
            }
        }
        return true;
    }
    /**
     * Distance constraint: Black cells can only be placed at specific distances
     * based on their room sizes
     */
    aroundSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.BLACK) {
                    const surveyNum = this.getRoomSize({ row, col });
                    // Check all four directions
                    if (!this.checkDirectionConstraint(row, col, surveyNum, -1, 0))
                        return false; // up
                    if (!this.checkDirectionConstraint(row, col, surveyNum, 1, 0))
                        return false; // down
                    if (!this.checkDirectionConstraint(row, col, surveyNum, 0, -1))
                        return false; // left
                    if (!this.checkDirectionConstraint(row, col, surveyNum, 0, 1))
                        return false; // right
                }
            }
        }
        return true;
    }
    /**
     * Check distance constraint in one direction from a black cell
     */
    checkDirectionConstraint(row, col, surveyNum, dRow, dCol) {
        let distance = 0;
        let r = row + dRow;
        let c = col + dCol;
        while (r >= 0 && r < this.height && c >= 0 && c < this.width) {
            const targetSurveyNum = this.getRoomSize({ row: r, col: c });
            const state = this.cells.get(r, c);
            // Check if this position could have a black cell
            const validDistance = Math.abs(surveyNum - targetSurveyNum);
            if (distance !== validDistance) {
                // This position cannot have a black cell
                if (state === CellState.BLACK) {
                    return false; // Contradiction
                }
                this.setWhite(r, c);
            }
            // Stop if we hit a white cell (can't continue checking)
            if (state !== CellState.WHITE) {
                break;
            }
            distance++;
            r += dRow;
            c += dCol;
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new HanareField(this.height, this.width);
        // Copy cells
        for (const [pos, state] of this.cells.entries()) {
            cloned.cells.set(pos, state);
        }
        // Share immutable data
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                cloned.yokoWall[row][col] = this.yokoWall[row][col];
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                cloned.tateWall[row][col] = this.tateWall[row][col];
            }
        }
        // Share room data (immutable)
        cloned.rooms.length = 0;
        for (const room of this.rooms) {
            cloned.rooms.push(room);
        }
        // Share fixed cells
        for (const key of this.fixedCells) {
            cloned.fixedCells.add(key);
        }
        return cloned;
    }
    getStateDump() {
        return this.cells.dump();
    }
    isSolved() {
        // All cells must be determined
        for (const [, state] of this.cells.entries()) {
            if (state === CellState.UNKNOWN)
                return false;
        }
        // Verify all constraints
        if (!this.roomSolve())
            return false;
        if (!this.aroundSolve())
            return false;
        return true;
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const beforeState = this.getStateDump();
            // Apply room constraint
            if (!this.roomSolve()) {
                return false;
            }
            // Apply distance constraint
            if (!this.aroundSolve()) {
                return false;
            }
            changed = this.getStateDump() !== beforeState;
        }
        return true;
    }
    toString() {
        const lines = [];
        // Top border
        let topLine = '□';
        for (let col = 0; col < this.width; col++) {
            topLine += '□';
            if (col < this.width - 1) {
                topLine += '□';
            }
        }
        topLine += '□';
        lines.push(topLine);
        // Each row
        for (let row = 0; row < this.height; row++) {
            // Cell row
            let cellLine = '□';
            for (let col = 0; col < this.width; col++) {
                const state = this.cells.get(row, col);
                if (state === CellState.BLACK) {
                    cellLine += '■';
                }
                else if (state === CellState.WHITE) {
                    cellLine += '　';
                }
                else {
                    cellLine += '・';
                }
                if (col < this.width - 1) {
                    cellLine += this.yokoWall[row][col] ? '□' : '　';
                }
            }
            cellLine += '□';
            lines.push(cellLine);
            // Wall row (except after last row)
            if (row < this.height - 1) {
                let wallLine = '□';
                for (let col = 0; col < this.width; col++) {
                    wallLine += this.tateWall[row][col] ? '□' : '　';
                    if (col < this.width - 1) {
                        wallLine += '□';
                    }
                }
                wallLine += '□';
                lines.push(wallLine);
            }
        }
        // Bottom border
        let bottomLine = '□';
        for (let col = 0; col < this.width; col++) {
            bottomLine += '□';
            if (col < this.width - 1) {
                bottomLine += '□';
            }
        }
        bottomLine += '□';
        lines.push(bottomLine);
        return lines.join('\n');
    }
    /** Get unknown cells for branching */
    getUnknownCells() {
        const unknowns = [];
        for (const [pos, state] of this.cells.entries()) {
            if (state === CellState.UNKNOWN) {
                unknowns.push(pos);
            }
        }
        return unknowns;
    }
}
// ============================================
// Hanare Solver
// ============================================
export class HanareSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Parse puzzle from URL-style parameter string
     * Format: width/height/encoded_data
     *
     * The encoded data contains:
     * 1. Wall data (5 bits per character encoding walls)
     * 2. Fixed black cell positions using hex encoding with intervals
     */
    static fromString(width, height, param) {
        const field = new HanareField(height, width);
        // Parse walls
        const yokoWall = [];
        const tateWall = [];
        for (let row = 0; row < height; row++) {
            yokoWall[row] = new Array(width - 1).fill(false);
        }
        for (let row = 0; row < height - 1; row++) {
            tateWall[row] = new Array(width).fill(false);
        }
        let readPos = 0;
        // Parse horizontal walls (yokoWall)
        const yokoCount = height * (width - 1);
        for (let cnt = 0; cnt < yokoCount; cnt++) {
            const mod = cnt % 5;
            if (mod === 0) {
                // Read next character every 5 walls
            }
            if (mod === 4 || cnt === yokoCount - 1) {
                const bit = parseInt(param.charAt(Math.floor(cnt / 5)), 16);
                // Decode 5 bits from this character
                for (let i = 0; i <= mod; i++) {
                    const wallIndex = cnt - mod + i;
                    const wallRow = Math.floor(wallIndex / (width - 1));
                    const wallCol = wallIndex % (width - 1);
                    const bitShift = 4 - i; // 16, 8, 4, 2, 1
                    yokoWall[wallRow][wallCol] = ((bit >> bitShift) & 1) === 1;
                }
            }
        }
        readPos = Math.ceil(yokoCount / 5);
        // Parse vertical walls (tateWall)
        const tateCount = (height - 1) * width;
        for (let cnt = 0; cnt < tateCount; cnt++) {
            const mod = cnt % 5;
            if (mod === 4 || cnt === tateCount - 1) {
                const bit = parseInt(param.charAt(readPos + Math.floor(cnt / 5)), 16);
                // Decode 5 bits from this character
                for (let i = 0; i <= mod; i++) {
                    const wallIndex = cnt - mod + i;
                    const wallRow = Math.floor(wallIndex / width);
                    const wallCol = wallIndex % width;
                    const bitShift = 4 - i; // 16, 8, 4, 2, 1
                    tateWall[wallRow][wallCol] = ((bit >> bitShift) & 1) === 1;
                }
            }
        }
        readPos += Math.ceil(tateCount / 5);
        // Parse fixed black cells
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        const fixedPositions = [];
        let index = 0;
        for (let i = readPos; i < param.length; i++) {
            const ch = param.charAt(i);
            const intervalIndex = ALPHABET_FROM_G.indexOf(ch);
            if (intervalIndex !== -1) {
                // Letter represents a gap
                index += intervalIndex + 1;
            }
            else if (ch === '.') {
                // Empty cell, just increment
                index++;
            }
            else if (ch === '-') {
                // 16-255 encoded as -XX
                parseInt(param.substring(i + 1, i + 3), 16);
                i += 2;
                const row = Math.floor(index / width);
                const col = index % width;
                fixedPositions.push({ row, col });
                index++;
            }
            else if (ch === '+') {
                // 256-999 encoded as +XXX
                parseInt(param.substring(i + 1, i + 4), 16);
                i += 3;
                const row = Math.floor(index / width);
                const col = index % width;
                fixedPositions.push({ row, col });
                index++;
            }
            else {
                // Single hex digit (0-15)
                parseInt(ch, 16);
                const row = Math.floor(index / width);
                const col = index % width;
                fixedPositions.push({ row, col });
                index++;
            }
        }
        field.initializeFromData(yokoWall, tateWall, fixedPositions);
        return new HanareSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownCells();
        if (unknowns.length === 0)
            return [];
        // Pick first unknown cell
        const pos = unknowns[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setBlack(pos.row, pos.col);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to BLACK`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setWhite(pos.row, pos.col);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to WHITE`,
            },
        ];
    }
}
//# sourceMappingURL=hanare.js.map