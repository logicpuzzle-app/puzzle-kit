/**
 * Aquarium Solver
 *
 * Rules:
 * 1. Fill cells with water (BLACK) or leave empty (WHITE)
 * 2. Row and column hints indicate the number of water cells
 * 3. Water flows down - if a cell has water, all cells below it in the same tank must also have water
 * 4. In sameHeight mode, water level is uniform across the entire tank
 * 5. In normal mode, water flows through openings (no wall) to same or lower levels
 */
import { CellState, Direction } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Aquarium Field State
// ============================================
export class AquariumField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE=empty/BLACK=water) */
    cells;
    /** Horizontal walls [row][col] - wall between (row, col) and (row, col+1) */
    yokoWall;
    /** Vertical walls [row][col] - wall between (row, col) and (row+1, col) */
    tateWall;
    /** Rooms (tanks) - each room is a set of position keys */
    rooms;
    /** Column hints (number of water cells per column, null = no hint) */
    verticalHints;
    /** Row hints (number of water cells per row, null = no hint) */
    horizontalHints;
    /** If true, water level must be uniform across the entire tank */
    sameHeight;
    constructor(height, width, sameHeight = true) {
        this.height = height;
        this.width = width;
        this.sameHeight = sameHeight;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.yokoWall = Array.from({ length: height }, () => Array(width - 1).fill(false));
        this.tateWall = Array.from({ length: height - 1 }, () => Array(width).fill(false));
        this.rooms = [];
        this.verticalHints = Array(width).fill(null);
        this.horizontalHints = Array(height).fill(null);
    }
    /** Set horizontal wall between (row, col) and (row, col+1) */
    setYokoWall(row, col, hasWall) {
        if (col < this.width - 1) {
            this.yokoWall[row][col] = hasWall;
        }
    }
    /** Set vertical wall between (row, col) and (row+1, col) */
    setTateWall(row, col, hasWall) {
        if (row < this.height - 1) {
            this.tateWall[row][col] = hasWall;
        }
    }
    /** Get horizontal wall state */
    hasYokoWall(row, col) {
        return col < this.width - 1 && this.yokoWall[row][col];
    }
    /** Get vertical wall state */
    hasTateWall(row, col) {
        return row < this.height - 1 && this.tateWall[row][col];
    }
    /** Set column hint */
    setVerticalHint(col, count) {
        this.verticalHints[col] = count;
    }
    /** Set row hint */
    setHorizontalHint(row, count) {
        this.horizontalHints[row] = count;
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell to water (BLACK) */
    setWater(row, col) {
        this.cells.set(row, col, CellState.BLACK);
    }
    /** Set cell to empty (WHITE) */
    setEmpty(row, col) {
        this.cells.set(row, col, CellState.WHITE);
    }
    /** Build rooms from wall configuration */
    buildRooms() {
        const visited = new Grid(this.height, this.width, () => false);
        this.rooms = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (!visited.get(row, col)) {
                    const room = new Set();
                    this.floodFillRoom(row, col, room, visited);
                    this.rooms.push(room);
                }
            }
        }
    }
    /** Flood fill to find connected cells within a room */
    floodFillRoom(row, col, room, visited) {
        if (row < 0 || row >= this.height || col < 0 || col >= this.width)
            return;
        if (visited.get(row, col))
            return;
        visited.set(row, col, true);
        room.add(`${row},${col}`);
        // Up - check if no wall above
        if (row > 0 && !this.tateWall[row - 1][col]) {
            this.floodFillRoom(row - 1, col, room, visited);
        }
        // Down - check if no wall below
        if (row < this.height - 1 && !this.tateWall[row][col]) {
            this.floodFillRoom(row + 1, col, room, visited);
        }
        // Left - check if no wall to left
        if (col > 0 && !this.yokoWall[row][col - 1]) {
            this.floodFillRoom(row, col - 1, room, visited);
        }
        // Right - check if no wall to right
        if (col < this.width - 1 && !this.yokoWall[row][col]) {
            this.floodFillRoom(row, col + 1, room, visited);
        }
    }
    /** Parse position key */
    parsePos(key) {
        const [row, col] = key.split(',').map(Number);
        return { row, col };
    }
    // ========== Solving methods ==========
    /** Solve based on row/column count hints */
    countSolve() {
        // Check columns
        for (let col = 0; col < this.width; col++) {
            const hint = this.verticalHints[col];
            if (hint === null)
                continue;
            let waterCount = 0;
            let unknownCount = 0;
            const unknownPositions = [];
            for (let row = 0; row < this.height; row++) {
                const state = this.cells.get(row, col);
                if (state === CellState.BLACK)
                    waterCount++;
                else if (state === CellState.UNKNOWN) {
                    unknownCount++;
                    unknownPositions.push({ row, col });
                }
            }
            // Check for contradictions
            if (waterCount > hint)
                return false;
            if (waterCount + unknownCount < hint)
                return false;
            // If water count matches hint, mark remaining as empty
            if (waterCount === hint) {
                for (const pos of unknownPositions) {
                    this.setEmpty(pos.row, pos.col);
                }
            }
            // If all unknowns must be water
            else if (unknownCount === hint - waterCount && unknownCount > 0) {
                for (const pos of unknownPositions) {
                    this.setWater(pos.row, pos.col);
                }
            }
        }
        // Check rows
        for (let row = 0; row < this.height; row++) {
            const hint = this.horizontalHints[row];
            if (hint === null)
                continue;
            let waterCount = 0;
            let unknownCount = 0;
            const unknownPositions = [];
            for (let col = 0; col < this.width; col++) {
                const state = this.cells.get(row, col);
                if (state === CellState.BLACK)
                    waterCount++;
                else if (state === CellState.UNKNOWN) {
                    unknownCount++;
                    unknownPositions.push({ row, col });
                }
            }
            if (waterCount > hint)
                return false;
            if (waterCount + unknownCount < hint)
                return false;
            if (waterCount === hint) {
                for (const pos of unknownPositions) {
                    this.setEmpty(pos.row, pos.col);
                }
            }
            else if (unknownCount === hint - waterCount && unknownCount > 0) {
                for (const pos of unknownPositions) {
                    this.setWater(pos.row, pos.col);
                }
            }
        }
        return true;
    }
    /** Water flow solving - water propagates down and through openings */
    waterSolve() {
        if (this.sameHeight) {
            // In sameHeight mode, all cells at or below the water level in a room must be water
            for (const room of this.rooms) {
                // Find the minimum row (highest position) with water
                let minWaterRow = this.height;
                for (const key of room) {
                    const pos = this.parsePos(key);
                    if (this.cells.get(pos.row, pos.col) === CellState.BLACK) {
                        if (pos.row < minWaterRow) {
                            minWaterRow = pos.row;
                        }
                    }
                }
                // If there's water, all cells at or below minWaterRow must be water
                if (minWaterRow < this.height) {
                    for (const key of room) {
                        const pos = this.parsePos(key);
                        if (pos.row >= minWaterRow) {
                            if (this.cells.get(pos.row, pos.col) === CellState.WHITE) {
                                return false; // Contradiction
                            }
                            this.setWater(pos.row, pos.col);
                        }
                    }
                }
            }
        }
        else {
            // In normal mode, water flows through openings to same or lower levels
            const processed = new Set();
            for (let row = 0; row < this.height; row++) {
                for (let col = 0; col < this.width; col++) {
                    if (this.cells.get(row, col) === CellState.BLACK) {
                        const key = `${row},${col}`;
                        if (!processed.has(key)) {
                            const waterCells = new Set();
                            waterCells.add(key);
                            if (!this.waterFlow({ row, col }, waterCells, row, null)) {
                                return false;
                            }
                            for (const k of waterCells) {
                                processed.add(k);
                            }
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Water flow helper - propagate water through connected cells */
    waterFlow(pos, waterCells, minY, from) {
        // Up - only flow up if we're above minY and there's no wall
        if (pos.row > minY && from !== Direction.UP) {
            if (!this.tateWall[pos.row - 1][pos.col]) {
                const nextKey = `${pos.row - 1},${pos.col}`;
                if (!waterCells.has(nextKey)) {
                    if (this.cells.get(pos.row - 1, pos.col) === CellState.WHITE) {
                        return false;
                    }
                    this.setWater(pos.row - 1, pos.col);
                    waterCells.add(nextKey);
                    if (!this.waterFlow({ row: pos.row - 1, col: pos.col }, waterCells, minY, Direction.DOWN)) {
                        return false;
                    }
                }
            }
        }
        // Right - flow through if no wall
        if (pos.col < this.width - 1 && from !== Direction.RIGHT) {
            if (!this.yokoWall[pos.row][pos.col]) {
                const nextKey = `${pos.row},${pos.col + 1}`;
                if (!waterCells.has(nextKey)) {
                    if (this.cells.get(pos.row, pos.col + 1) === CellState.WHITE) {
                        return false;
                    }
                    this.setWater(pos.row, pos.col + 1);
                    waterCells.add(nextKey);
                    if (!this.waterFlow({ row: pos.row, col: pos.col + 1 }, waterCells, minY, Direction.LEFT)) {
                        return false;
                    }
                }
            }
        }
        // Down - flow down if no wall
        if (pos.row < this.height - 1 && from !== Direction.DOWN) {
            if (!this.tateWall[pos.row][pos.col]) {
                const nextKey = `${pos.row + 1},${pos.col}`;
                if (!waterCells.has(nextKey)) {
                    if (this.cells.get(pos.row + 1, pos.col) === CellState.WHITE) {
                        return false;
                    }
                    this.setWater(pos.row + 1, pos.col);
                    waterCells.add(nextKey);
                    if (!this.waterFlow({ row: pos.row + 1, col: pos.col }, waterCells, minY, Direction.UP)) {
                        return false;
                    }
                }
            }
        }
        // Left - flow through if no wall
        if (pos.col > 0 && from !== Direction.LEFT) {
            if (!this.yokoWall[pos.row][pos.col - 1]) {
                const nextKey = `${pos.row},${pos.col - 1}`;
                if (!waterCells.has(nextKey)) {
                    if (this.cells.get(pos.row, pos.col - 1) === CellState.WHITE) {
                        return false;
                    }
                    this.setWater(pos.row, pos.col - 1);
                    waterCells.add(nextKey);
                    if (!this.waterFlow({ row: pos.row, col: pos.col - 1 }, waterCells, minY, Direction.RIGHT)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new AquariumField(this.height, this.width, this.sameHeight);
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                cloned.cells.set(row, col, this.cells.get(row, col));
            }
        }
        // Share immutable data
        cloned.yokoWall = this.yokoWall;
        cloned.tateWall = this.tateWall;
        cloned.rooms = this.rooms;
        cloned.verticalHints = this.verticalHints;
        cloned.horizontalHints = this.horizontalHints;
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cell = this.cells.get(row, col);
                dump += cell === CellState.BLACK ? '#' : cell === CellState.WHITE ? '.' : '?';
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
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const before = this.getStateDump();
            if (!this.countSolve())
                return false;
            if (!this.waterSolve())
                return false;
            changed = this.getStateDump() !== before;
        }
        return true;
    }
    toString() {
        const lines = [];
        // Top hints
        let topLine = '  ';
        for (let col = 0; col < this.width; col++) {
            const hint = this.verticalHints[col];
            topLine += hint !== null ? String(hint).padStart(2) : '  ';
        }
        lines.push(topLine);
        // Top border
        lines.push('  ' + '' + '  ,'.repeat(this.width - 1) + '  ');
        for (let row = 0; row < this.height; row++) {
            // Row hint
            const hint = this.horizontalHints[row];
            let line = (hint !== null ? String(hint).padStart(2) : '  ') + '';
            for (let col = 0; col < this.width; col++) {
                const cell = this.cells.get(row, col);
                const cellChar = cell === CellState.BLACK ? '��' : cell === CellState.WHITE ? '  ' : '??';
                line += cellChar;
                if (col < this.width - 1) {
                    line += this.yokoWall[row][col] ? '' : ' ';
                }
            }
            line += '';
            lines.push(line);
            // Row separator with walls
            if (row < this.height - 1) {
                let sep = '  ';
                for (let col = 0; col < this.width; col++) {
                    sep += this.tateWall[row][col] ? '  ' : '  ';
                    if (col < this.width - 1) {
                        sep += '<';
                    }
                }
                sep += '$';
                lines.push(sep);
            }
        }
        // Bottom border
        lines.push('  ' + '' + '  4'.repeat(this.width - 1) + '  ');
        return lines.join('\n');
    }
    /** Get unknown cells for branching */
    getUnknownCells() {
        const unknowns = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.UNKNOWN) {
                    unknowns.push({ row, col });
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Aquarium Solver
// ============================================
export class AquariumSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from pzv.jp URL format
     * URL: http://pzv.jp/p.html?aquarium/{width}/{height}/{wallParam}/{hintParam}
     */
    static fromPzvUrl(url, sameHeight = true) {
        const parts = url.split('/');
        const width = parseInt(parts[parts.length - 4]);
        const height = parseInt(parts[parts.length - 3]);
        const wallParam = parts[parts.length - 2];
        const hintParam = parts[parts.length - 1];
        return AquariumSolver.fromString(height, width, wallParam, hintParam, sameHeight);
    }
    /**
     * Create solver from pzv parameter strings
     */
    static fromString(height, width, wallParam, hintParam, sameHeight = true) {
        const field = new AquariumField(height, width, sameHeight);
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        // Parse walls (same format as starbattle)
        let readPos = 0;
        let bit = 0;
        // Parse horizontal walls (yokoWall)
        const yokoWallCount = height * (width - 1);
        for (let cnt = 0; cnt < yokoWallCount; cnt++) {
            const mod = cnt % 5;
            if (mod === 0 && readPos < wallParam.length) {
                bit = parseInt(wallParam.charAt(readPos), 36);
                readPos++;
            }
            if (mod === 4 || cnt === yokoWallCount - 1) {
                for (let m = 0; m <= mod; m++) {
                    const idx = cnt - mod + m;
                    if (idx < yokoWallCount) {
                        const row = Math.floor(idx / (width - 1));
                        const col = idx % (width - 1);
                        const bitPos = 4 - m;
                        field.setYokoWall(row, col, ((bit >> bitPos) & 1) === 1);
                    }
                }
            }
        }
        // Parse vertical walls (tateWall)
        const tateWallCount = (height - 1) * width;
        for (let cnt = 0; cnt < tateWallCount; cnt++) {
            const mod = cnt % 5;
            if (mod === 0 && readPos < wallParam.length) {
                bit = parseInt(wallParam.charAt(readPos), 36);
                readPos++;
            }
            if (mod === 4 || cnt === tateWallCount - 1) {
                for (let m = 0; m <= mod; m++) {
                    const idx = cnt - mod + m;
                    if (idx < tateWallCount) {
                        const row = Math.floor(idx / width);
                        const col = idx % width;
                        const bitPos = 4 - m;
                        field.setTateWall(row, col, ((bit >> bitPos) & 1) === 1);
                    }
                }
            }
        }
        // Parse hints
        let index = 0;
        let i = 0;
        while (i < hintParam.length) {
            const ch = hintParam.charAt(i);
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index += interval + 1;
                i++;
            }
            else if (ch === '.') {
                i++;
            }
            else if (ch === '-') {
                // 16-255 range (2-digit hex)
                const hexStr = hintParam.substring(i + 1, i + 3);
                const capacity = parseInt(hexStr, 16);
                if (index >= width) {
                    field.setHorizontalHint(index - width, capacity);
                }
                else {
                    field.setVerticalHint(index, capacity);
                }
                index++;
                i += 3;
            }
            else if (ch === '+') {
                // 256-999 range (3-digit hex)
                const hexStr = hintParam.substring(i + 1, i + 4);
                const capacity = parseInt(hexStr, 16);
                if (index >= width) {
                    field.setHorizontalHint(index - width, capacity);
                }
                else {
                    field.setVerticalHint(index, capacity);
                }
                index++;
                i += 4;
            }
            else {
                // Single hex digit (0-15)
                const capacity = parseInt(ch, 16);
                if (!isNaN(capacity)) {
                    if (index >= width) {
                        field.setHorizontalHint(index - width, capacity);
                    }
                    else {
                        field.setVerticalHint(index, capacity);
                    }
                }
                index++;
                i++;
            }
        }
        field.buildRooms();
        return new AquariumSolver(field);
    }
    /**
     * Create solver with explicit configuration
     */
    static create(config) {
        const field = new AquariumField(config.height, config.width, config.sameHeight ?? true);
        // Set walls
        for (let row = 0; row < config.height; row++) {
            for (let col = 0; col < config.width - 1; col++) {
                field.setYokoWall(row, col, config.yokoWall[row]?.[col] ?? false);
            }
        }
        for (let row = 0; row < config.height - 1; row++) {
            for (let col = 0; col < config.width; col++) {
                field.setTateWall(row, col, config.tateWall[row]?.[col] ?? false);
            }
        }
        // Set hints
        for (let col = 0; col < config.width; col++) {
            if (config.verticalHints[col] !== null) {
                field.setVerticalHint(col, config.verticalHints[col]);
            }
        }
        for (let row = 0; row < config.height; row++) {
            if (config.horizontalHints[row] !== null) {
                field.setHorizontalHint(row, config.horizontalHints[row]);
            }
        }
        field.buildRooms();
        return new AquariumSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownCells();
        if (unknowns.length === 0)
            return [];
        const cell = unknowns[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setWater(cell.row, cell.col);
                    return cloned;
                },
                description: `Set (${cell.row}, ${cell.col}) to WATER`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setEmpty(cell.row, cell.col);
                    return cloned;
                },
                description: `Set (${cell.row}, ${cell.col}) to EMPTY`,
            },
        ];
    }
}
//# sourceMappingURL=aquarium.js.map