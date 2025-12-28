/**
 * Cells Solver
 *
 * Rules:
 * 1. Divide the grid into rooms by drawing walls between cells
 * 2. Each room must contain exactly cellSize cells
 * 3. Numbers indicate how many walls surround that cell (0-4)
 * 4. No pillar (intersection of walls) can have exactly 1 wall extending from it
 * 5. Cells marked with 7 are invalid/blocked cells (treated as walls)
 */
import { WallState, Direction, DIRECTIONS, adjacent, posKey, oppositeDirection, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Cells Field State
// ============================================
export class CellsField {
    height;
    width;
    cellSize;
    /** Number clues (null = no number, -1 = invalid cell) */
    numbers;
    /** Horizontal walls (between col and col+1) */
    horizontalWalls;
    /** Vertical walls (between row and row+1) */
    verticalWalls;
    /** Positions that have been fixed (for optimization) */
    fixedPositions;
    constructor(height, width, cellSize) {
        this.height = height;
        this.width = width;
        this.cellSize = cellSize;
        this.numbers = new Grid(height, width, () => null);
        // Horizontal walls: height rows, width-1 columns
        this.horizontalWalls = new Grid(height, width - 1, () => WallState.UNKNOWN);
        // Vertical walls: height-1 rows, width columns
        this.verticalWalls = new Grid(height - 1, width, () => WallState.UNKNOWN);
        this.fixedPositions = new Set();
    }
    /** Set a number clue */
    setNumber(row, col, num) {
        this.numbers.set(row, col, num);
    }
    /** Get number at position */
    getNumber(row, col) {
        return this.numbers.get(row, col);
    }
    /** Get horizontal wall state (between col and col+1) */
    getHorizontalWall(row, col) {
        if (col < 0 || col >= this.width - 1)
            return null;
        return this.horizontalWalls.get(row, col);
    }
    /** Get vertical wall state (between row and row+1) */
    getVerticalWall(row, col) {
        if (row < 0 || row >= this.height - 1)
            return null;
        return this.verticalWalls.get(row, col);
    }
    /** Set horizontal wall */
    setHorizontalWall(row, col, state) {
        if (col >= 0 && col < this.width - 1) {
            this.horizontalWalls.set(row, col, state);
        }
    }
    /** Set vertical wall */
    setVerticalWall(row, col, state) {
        if (row >= 0 && row < this.height - 1) {
            this.verticalWalls.set(row, col, state);
        }
    }
    /** Get wall state in a direction from a position */
    getWall(pos, dir) {
        switch (dir) {
            case Direction.UP:
                return pos.row === 0 ? WallState.WALL : this.verticalWalls.get(pos.row - 1, pos.col);
            case Direction.RIGHT:
                return pos.col === this.width - 1 ? WallState.WALL : this.horizontalWalls.get(pos.row, pos.col);
            case Direction.DOWN:
                return pos.row === this.height - 1 ? WallState.WALL : this.verticalWalls.get(pos.row, pos.col);
            case Direction.LEFT:
                return pos.col === 0 ? WallState.WALL : this.horizontalWalls.get(pos.row, pos.col - 1);
        }
    }
    /** Set wall state in a direction from a position */
    setWall(pos, dir, state) {
        switch (dir) {
            case Direction.UP:
                if (pos.row > 0)
                    this.verticalWalls.set(pos.row - 1, pos.col, state);
                break;
            case Direction.RIGHT:
                if (pos.col < this.width - 1)
                    this.horizontalWalls.set(pos.row, pos.col, state);
                break;
            case Direction.DOWN:
                if (pos.row < this.height - 1)
                    this.verticalWalls.set(pos.row, pos.col, state);
                break;
            case Direction.LEFT:
                if (pos.col > 0)
                    this.horizontalWalls.set(pos.row, pos.col - 1, state);
                break;
        }
    }
    // ========== Helper methods ==========
    /** Check if two positions are connected (not separated by a wall) */
    isConnected(pos1, pos2) {
        const rowDiff = pos2.row - pos1.row;
        const colDiff = pos2.col - pos1.col;
        if (rowDiff === -1 && colDiff === 0) {
            // pos2 is above pos1
            return this.getWall(pos1, Direction.UP) !== WallState.WALL;
        }
        else if (rowDiff === 1 && colDiff === 0) {
            // pos2 is below pos1
            return this.getWall(pos1, Direction.DOWN) !== WallState.WALL;
        }
        else if (rowDiff === 0 && colDiff === -1) {
            // pos2 is left of pos1
            return this.getWall(pos1, Direction.LEFT) !== WallState.WALL;
        }
        else if (rowDiff === 0 && colDiff === 1) {
            // pos2 is right of pos1
            return this.getWall(pos1, Direction.RIGHT) !== WallState.WALL;
        }
        return false;
    }
    /** Get connected region from position (not separated by WALL state) */
    getConnectedRegion(start, from) {
        const region = new Set();
        region.add(posKey(start));
        const explore = (pos, fromDir) => {
            for (const dir of DIRECTIONS) {
                if (fromDir && dir === fromDir)
                    continue;
                const next = adjacent(pos, dir);
                if (!this.isInBounds(next))
                    continue;
                if (region.has(posKey(next)))
                    continue;
                const wallState = this.getWall(pos, dir);
                if (wallState !== WallState.WALL) {
                    region.add(posKey(next));
                    explore(next, oppositeDirection(dir));
                }
            }
        };
        explore(start, from);
        return region;
    }
    /** Get white region with size limit (returns false if size exceeds limit) */
    getWhiteRegionWithLimit(start, limit, from) {
        const region = new Set();
        region.add(posKey(start));
        let valid = true;
        const explore = (pos, fromDir) => {
            if (region.size > limit) {
                valid = false;
                return;
            }
            for (const dir of DIRECTIONS) {
                if (fromDir && dir === fromDir)
                    continue;
                const next = adjacent(pos, dir);
                if (!this.isInBounds(next))
                    continue;
                if (region.has(posKey(next)))
                    continue;
                const wallState = this.getWall(pos, dir);
                if (wallState === WallState.NO_WALL) {
                    region.add(posKey(next));
                    explore(next, oppositeDirection(dir));
                    if (!valid)
                        return;
                }
            }
        };
        explore(start, from);
        return { region, valid };
    }
    isInBounds(pos) {
        return pos.row >= 0 && pos.row < this.height && pos.col >= 0 && pos.col < this.width;
    }
    // ========== Constraint solving ==========
    /**
     * Room size constraint:
     * - Rooms separated by walls must be divisible by cellSize
     * - Rooms that reach cellSize are complete and surrounded by walls
     * - White regions (connected by NO_WALL) cannot exceed cellSize
     */
    roomSolve() {
        const surveyedNotWall = new Set();
        const surveyedWhite = new Set();
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.numbers.get(row, col) === -1)
                    continue; // Skip invalid cells
                const pos = { row, col };
                const key = posKey(pos);
                if (this.fixedPositions.has(key))
                    continue;
                // Check connected region (not separated by walls)
                if (!surveyedNotWall.has(key)) {
                    const region = this.getConnectedRegion(pos);
                    // Region size must be divisible by cellSize
                    if (region.size % this.cellSize !== 0) {
                        return false;
                    }
                    // If region is exactly cellSize, it's complete
                    if (region.size === this.cellSize) {
                        this.fixedPositions.add(key);
                        // Mark internal connections as NO_WALL
                        for (const posKey1 of region) {
                            const [r1, c1] = posKey1.split(',').map(Number);
                            const p1 = { row: r1, col: c1 };
                            for (const dir of DIRECTIONS) {
                                const p2 = adjacent(p1, dir);
                                if (this.isInBounds(p2) && region.has(posKey(p2))) {
                                    this.setWall(p1, dir, WallState.NO_WALL);
                                }
                            }
                        }
                    }
                    for (const k of region) {
                        surveyedNotWall.add(k);
                    }
                }
                // Check white region (connected by NO_WALL)
                if (!surveyedWhite.has(key)) {
                    const { region, valid } = this.getWhiteRegionWithLimit(pos, this.cellSize);
                    if (!valid) {
                        return false; // Size exceeded
                    }
                    // If white region is exactly cellSize, surround it with walls
                    if (region.size === this.cellSize) {
                        for (const posKey1 of region) {
                            const [r1, c1] = posKey1.split(',').map(Number);
                            const p1 = { row: r1, col: c1 };
                            this.fixedPositions.add(posKey1);
                            for (const dir of DIRECTIONS) {
                                const p2 = adjacent(p1, dir);
                                if (!this.isInBounds(p2) || !region.has(posKey(p2))) {
                                    this.setWall(p1, dir, WallState.WALL);
                                }
                            }
                        }
                    }
                    for (const k of region) {
                        surveyedWhite.add(k);
                    }
                }
            }
        }
        return true;
    }
    /**
     * Number constraint:
     * - Each number indicates how many walls surround that cell
     */
    numberSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num === null || num === -1)
                    continue;
                const pos = { row, col };
                let wallCount = 0;
                let noWallCount = 0;
                const unknownDirs = [];
                for (const dir of DIRECTIONS) {
                    const wallState = this.getWall(pos, dir);
                    if (wallState === WallState.WALL) {
                        wallCount++;
                    }
                    else if (wallState === WallState.NO_WALL) {
                        noWallCount++;
                    }
                    else {
                        unknownDirs.push(dir);
                    }
                }
                // Check for contradictions
                if (wallCount > num)
                    return false; // Too many walls
                if (wallCount + unknownDirs.length < num)
                    return false; // Not enough space for walls
                // If wall count matches number, rest are NO_WALL
                if (wallCount === num) {
                    for (const dir of unknownDirs) {
                        this.setWall(pos, dir, WallState.NO_WALL);
                    }
                }
                // If all remaining unknowns must be walls
                if (wallCount + unknownDirs.length === num) {
                    for (const dir of unknownDirs) {
                        this.setWall(pos, dir, WallState.WALL);
                    }
                }
            }
        }
        return true;
    }
    /**
     * Pillar constraint:
     * - At each intersection of walls, the number of walls cannot be exactly 1
     */
    pillarSolve() {
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                // Four walls around pillar at (row, col)
                const walls = [
                    this.verticalWalls.get(row, col), // left
                    this.verticalWalls.get(row, col + 1), // right
                    this.horizontalWalls.get(row, col), // top
                    this.horizontalWalls.get(row + 1, col), // bottom
                ];
                let wallCount = 0;
                let noWallCount = 0;
                for (const wall of walls) {
                    if (wall === WallState.WALL)
                        wallCount++;
                    else if (wall === WallState.NO_WALL)
                        noWallCount++;
                }
                // Cannot have exactly 1 wall
                if (wallCount === 1 && noWallCount === 3) {
                    return false;
                }
                // If 3 are NO_WALL, the last must also be NO_WALL
                if (noWallCount === 3) {
                    if (walls[0] === WallState.UNKNOWN)
                        this.verticalWalls.set(row, col, WallState.NO_WALL);
                    if (walls[1] === WallState.UNKNOWN)
                        this.verticalWalls.set(row, col + 1, WallState.NO_WALL);
                    if (walls[2] === WallState.UNKNOWN)
                        this.horizontalWalls.set(row, col, WallState.NO_WALL);
                    if (walls[3] === WallState.UNKNOWN)
                        this.horizontalWalls.set(row + 1, col, WallState.NO_WALL);
                }
                // If 2 are NO_WALL and 1 is WALL, the last must be WALL
                if (noWallCount === 2 && wallCount === 1) {
                    if (walls[0] === WallState.UNKNOWN)
                        this.verticalWalls.set(row, col, WallState.WALL);
                    if (walls[1] === WallState.UNKNOWN)
                        this.verticalWalls.set(row, col + 1, WallState.WALL);
                    if (walls[2] === WallState.UNKNOWN)
                        this.horizontalWalls.set(row, col, WallState.WALL);
                    if (walls[3] === WallState.UNKNOWN)
                        this.horizontalWalls.set(row + 1, col, WallState.WALL);
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new CellsField(this.height, this.width, this.cellSize);
        for (const [pos, num] of this.numbers.entries()) {
            cloned.numbers.set(pos, num);
        }
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                cloned.horizontalWalls.set(row, col, this.horizontalWalls.get(row, col));
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                cloned.verticalWalls.set(row, col, this.verticalWalls.get(row, col));
            }
        }
        cloned.fixedPositions = new Set(this.fixedPositions);
        return cloned;
    }
    getStateDump() {
        let result = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                result += this.horizontalWalls.get(row, col);
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                result += this.verticalWalls.get(row, col);
            }
        }
        return result;
    }
    isSolved() {
        // All walls must be determined
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.horizontalWalls.get(row, col) === WallState.UNKNOWN) {
                    return false;
                }
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.verticalWalls.get(row, col) === WallState.UNKNOWN) {
                    return false;
                }
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        const prevState = this.getStateDump();
        if (!this.roomSolve())
            return false;
        if (!this.numberSolve())
            return false;
        if (!this.pillarSolve())
            return false;
        // Repeat if state changed
        if (this.getStateDump() !== prevState) {
            return this.solveAndCheck();
        }
        return true;
    }
    toString() {
        const lines = [];
        // Top border
        let line = '□';
        for (let col = 0; col < this.width; col++) {
            line += '□';
            if (col < this.width - 1)
                line += '□';
        }
        lines.push(line);
        for (let row = 0; row < this.height; row++) {
            // Cell row
            line = '□';
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num === -1) {
                    line += '■';
                }
                else if (num !== null) {
                    line += String(num);
                }
                else {
                    line += ' ';
                }
                if (col < this.width - 1) {
                    const wall = this.horizontalWalls.get(row, col);
                    if (wall === WallState.WALL)
                        line += '|';
                    else if (wall === WallState.NO_WALL)
                        line += ' ';
                    else
                        line += '?';
                }
            }
            line += '□';
            lines.push(line);
            // Wall row (if not last)
            if (row < this.height - 1) {
                line = '□';
                for (let col = 0; col < this.width; col++) {
                    const wall = this.verticalWalls.get(row, col);
                    if (wall === WallState.WALL)
                        line += '-';
                    else if (wall === WallState.NO_WALL)
                        line += ' ';
                    else
                        line += '?';
                    if (col < this.width - 1) {
                        line += '□';
                    }
                }
                line += '□';
                lines.push(line);
            }
        }
        // Bottom border
        line = '□';
        for (let col = 0; col < this.width; col++) {
            line += '□';
            if (col < this.width - 1)
                line += '□';
        }
        lines.push(line);
        return lines.join('\n');
    }
}
// ============================================
// Cells Solver
// ============================================
export class CellsSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from URL-style string
     * Format: height/width/cellSize/param
     * Param uses alphabet encoding for gaps and hex for numbers
     */
    static fromString(height, width, cellSize, param) {
        const field = new CellsField(height, width, cellSize);
        const alphabet = 'abcdefghijklmnopqrstuvwxyz';
        let index = 0;
        let i = 0;
        while (i < param.length) {
            const ch = param[i];
            // Check if it's an alphabet character (gap encoding)
            const alphabetIndex = alphabet.indexOf(ch.toLowerCase());
            if (alphabetIndex !== -1) {
                index += alphabetIndex + 1;
                i++;
            }
            else if (ch === '.') {
                // Empty cell
                index++;
                i++;
            }
            else {
                // Number encoding
                let num;
                if (ch === '-') {
                    // 16-255: '-' followed by 2 hex digits
                    num = parseInt(param.substring(i + 1, i + 3), 16);
                    i += 3;
                }
                else if (ch === '+') {
                    // 256-999: '+' followed by 3 hex digits
                    num = parseInt(param.substring(i + 1, i + 4), 16);
                    i += 4;
                }
                else {
                    // 0-15: single hex digit
                    num = parseInt(ch, 16);
                    i++;
                }
                const row = Math.floor(index / width);
                const col = index % width;
                if (num === 7) {
                    // 7 is treated as invalid cell
                    field.setNumber(row, col, -1);
                }
                else {
                    field.setNumber(row, col, num);
                }
                index++;
            }
        }
        // Initialize walls around invalid cells
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                if (field.getNumber(row, col) === -1) {
                    // Set walls around invalid cells
                    const pos = { row, col };
                    for (const dir of DIRECTIONS) {
                        const next = adjacent(pos, dir);
                        if (next.row >= 0 && next.row < height && next.col >= 0 && next.col < width) {
                            const nextNum = field.getNumber(next.row, next.col);
                            if (nextNum === -1) {
                                // Both are invalid - no wall between them
                                field.setWall(pos, dir, WallState.NO_WALL);
                            }
                            else {
                                // Wall between invalid and valid cell
                                field.setWall(pos, dir, WallState.WALL);
                            }
                        }
                    }
                }
            }
        }
        return new CellsSolver(field);
    }
    getBranchCandidates(state) {
        // Find first unknown horizontal wall
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width - 1; col++) {
                if (state.getHorizontalWall(row, col) === WallState.UNKNOWN) {
                    return [
                        {
                            apply: (s) => {
                                const cloned = s.clone();
                                cloned.setHorizontalWall(row, col, WallState.WALL);
                                return cloned;
                            },
                            description: `Set horizontal wall at (${row}, ${col}) to WALL`,
                        },
                        {
                            apply: (s) => {
                                const cloned = s.clone();
                                cloned.setHorizontalWall(row, col, WallState.NO_WALL);
                                return cloned;
                            },
                            description: `Set horizontal wall at (${row}, ${col}) to NO_WALL`,
                        },
                    ];
                }
            }
        }
        // Find first unknown vertical wall
        for (let row = 0; row < state.height - 1; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.getVerticalWall(row, col) === WallState.UNKNOWN) {
                    return [
                        {
                            apply: (s) => {
                                const cloned = s.clone();
                                cloned.setVerticalWall(row, col, WallState.WALL);
                                return cloned;
                            },
                            description: `Set vertical wall at (${row}, ${col}) to WALL`,
                        },
                        {
                            apply: (s) => {
                                const cloned = s.clone();
                                cloned.setVerticalWall(row, col, WallState.NO_WALL);
                                return cloned;
                            },
                            description: `Set vertical wall at (${row}, ${col}) to NO_WALL`,
                        },
                    ];
                }
            }
        }
        return [];
    }
}
//# sourceMappingURL=cells.js.map