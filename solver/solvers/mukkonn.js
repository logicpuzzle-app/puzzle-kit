/**
 * Mukkonn Solver
 *
 * Rules:
 * 1. Divide the grid into regions by placing walls between cells
 * 2. Each cell must have exactly 2 walls on its 4 edges (including grid boundary)
 * 3. Compass clues show how many cells are visible in each direction (up/right/down/left)
 *    - A number indicates exactly that many cells visible in that direction
 *    - No number (-1) means that direction is unknown
 * 4. All regions must be connected (no isolated regions)
 * 5. Each row and column must have an even number of vertical/horizontal passages
 */
import { WallState, Direction, DIRECTIONS, adjacent, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Mukkonn Field State
// ============================================
export class MukokonnField {
    height;
    width;
    /** Compass clues (null = no compass at this position) */
    compasses;
    /** Horizontal walls (between vertically adjacent cells) */
    horizontalWalls; // height-1 x width
    /** Vertical walls (between horizontally adjacent cells) */
    verticalWalls; // height x width-1
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.compasses = new Grid(height, width, () => null);
        // Horizontal walls: between rows, so height-1 rows x width columns
        this.horizontalWalls = new Grid(height - 1, width, () => WallState.UNKNOWN);
        // Vertical walls: between columns, so height rows x width-1 columns
        this.verticalWalls = new Grid(height, width - 1, () => WallState.UNKNOWN);
    }
    /** Set compass at position */
    setCompass(row, col, compass) {
        this.compasses.set(row, col, compass);
    }
    /** Get compass at position */
    getCompass(row, col) {
        return this.compasses.get(row, col);
    }
    /** Get horizontal wall below cell (row, col) */
    getHorizontalWall(row, col) {
        if (row >= this.height - 1)
            return WallState.WALL; // Grid boundary
        return this.horizontalWalls.get(row, col);
    }
    /** Get vertical wall to the right of cell (row, col) */
    getVerticalWall(row, col) {
        if (col >= this.width - 1)
            return WallState.WALL; // Grid boundary
        return this.verticalWalls.get(row, col);
    }
    /** Set horizontal wall below cell (row, col) */
    setHorizontalWall(row, col, state) {
        if (row < this.height - 1) {
            this.horizontalWalls.set(row, col, state);
        }
    }
    /** Set vertical wall to the right of cell (row, col) */
    setVerticalWall(row, col, state) {
        if (col < this.width - 1) {
            this.verticalWalls.set(row, col, state);
        }
    }
    /** Get wall state in a direction from a cell */
    getWallInDirection(row, col, dir) {
        switch (dir) {
            case Direction.UP:
                return row === 0 ? WallState.WALL : this.getHorizontalWall(row - 1, col);
            case Direction.DOWN:
                return this.getHorizontalWall(row, col);
            case Direction.LEFT:
                return col === 0 ? WallState.WALL : this.getVerticalWall(row, col - 1);
            case Direction.RIGHT:
                return this.getVerticalWall(row, col);
        }
    }
    /** Set wall state in a direction from a cell */
    setWallInDirection(row, col, dir, state) {
        switch (dir) {
            case Direction.UP:
                if (row > 0)
                    this.setHorizontalWall(row - 1, col, state);
                break;
            case Direction.DOWN:
                this.setHorizontalWall(row, col, state);
                break;
            case Direction.LEFT:
                if (col > 0)
                    this.setVerticalWall(row, col - 1, state);
                break;
            case Direction.RIGHT:
                this.setVerticalWall(row, col, state);
                break;
        }
    }
    // ========== Constraint checking ==========
    /** Check if each cell has exactly 2 walls */
    checkTwoWallsPerCell() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                let wallCount = 0;
                let noWallCount = 0;
                for (const dir of DIRECTIONS) {
                    const wall = this.getWallInDirection(row, col, dir);
                    if (wall === WallState.WALL)
                        wallCount++;
                    else if (wall === WallState.NO_WALL)
                        noWallCount++;
                }
                // Each cell must have exactly 2 walls
                if (wallCount > 2 || noWallCount > 2)
                    return false;
                // If we have 2 walls, mark remaining as no-wall
                if (wallCount === 2) {
                    for (const dir of DIRECTIONS) {
                        if (this.getWallInDirection(row, col, dir) === WallState.UNKNOWN) {
                            this.setWallInDirection(row, col, dir, WallState.NO_WALL);
                        }
                    }
                }
                // If we have 2 no-walls, mark remaining as wall
                if (noWallCount === 2) {
                    for (const dir of DIRECTIONS) {
                        if (this.getWallInDirection(row, col, dir) === WallState.UNKNOWN) {
                            this.setWallInDirection(row, col, dir, WallState.WALL);
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Apply compass constraint: count visible cells in each direction */
    applyCompassConstraints() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const compass = this.compasses.get(row, col);
                if (!compass)
                    continue;
                // Check each direction with a constraint
                const directions = [
                    { dir: Direction.UP, count: compass.up },
                    { dir: Direction.RIGHT, count: compass.right },
                    { dir: Direction.DOWN, count: compass.down },
                    { dir: Direction.LEFT, count: compass.left },
                ];
                for (const { dir, count } of directions) {
                    if (count === -1)
                        continue; // No constraint
                    const wall = this.getWallInDirection(row, col, dir);
                    // If wall is open (NO_WALL), extend the passage
                    if (wall === WallState.NO_WALL) {
                        if (!this.extendPassage(row, col, dir, count)) {
                            return false;
                        }
                    }
                    // If wall is unknown, check if it can be open
                    else if (wall === WallState.UNKNOWN) {
                        if (!this.canExtendPassage(row, col, dir, count)) {
                            // Cannot extend enough, so this direction must be walled
                            this.setWallInDirection(row, col, dir, WallState.WALL);
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Extend passage from (row, col) in direction for exactly count cells */
    extendPassage(row, col, dir, count) {
        let current = { row, col };
        // Open the required number of walls
        for (let i = 1; i <= count; i++) {
            current = adjacent(current, dir);
            if (!this.inBounds(current)) {
                if (i <= count)
                    return false; // Hit boundary too early
                break;
            }
            // Open wall to this cell
            const prevPos = adjacent(current, this.oppositeDir(dir));
            const wallState = this.getWallBetween(prevPos, current);
            if (wallState === WallState.WALL) {
                return false; // Contradiction
            }
            this.setWallBetween(prevPos, current, WallState.NO_WALL);
        }
        // Close wall after the last cell
        if (this.inBounds(current)) {
            const nextPos = adjacent(current, dir);
            if (this.inBounds(nextPos)) {
                const wallState = this.getWallBetween(current, nextPos);
                if (wallState === WallState.NO_WALL) {
                    return false; // Contradiction
                }
                this.setWallBetween(current, nextPos, WallState.WALL);
            }
        }
        return true;
    }
    /** Check if passage can extend from (row, col) in direction for count cells */
    canExtendPassage(row, col, dir, count) {
        let current = { row, col };
        for (let i = 1; i <= count; i++) {
            current = adjacent(current, dir);
            if (!this.inBounds(current)) {
                return false; // Hit boundary
            }
            const prevPos = adjacent(current, this.oppositeDir(dir));
            const wallState = this.getWallBetween(prevPos, current);
            if (wallState === WallState.WALL) {
                return false; // Hit a wall
            }
        }
        // Check if we can close after count cells
        const nextPos = adjacent(current, dir);
        if (this.inBounds(nextPos)) {
            const wallState = this.getWallBetween(current, nextPos);
            if (wallState === WallState.NO_WALL) {
                return false; // Cannot close
            }
        }
        return true;
    }
    /** Get wall state between two adjacent cells */
    getWallBetween(from, to) {
        if (from.row === to.row) {
            // Horizontal movement - vertical wall
            const col = Math.min(from.col, to.col);
            return this.getVerticalWall(from.row, col);
        }
        else {
            // Vertical movement - horizontal wall
            const row = Math.min(from.row, to.row);
            return this.getHorizontalWall(row, from.col);
        }
    }
    /** Set wall state between two adjacent cells */
    setWallBetween(from, to, state) {
        if (from.row === to.row) {
            const col = Math.min(from.col, to.col);
            this.setVerticalWall(from.row, col, state);
        }
        else {
            const row = Math.min(from.row, to.row);
            this.setHorizontalWall(row, from.col, state);
        }
    }
    /** Get opposite direction */
    oppositeDir(dir) {
        switch (dir) {
            case Direction.UP: return Direction.DOWN;
            case Direction.DOWN: return Direction.UP;
            case Direction.LEFT: return Direction.RIGHT;
            case Direction.RIGHT: return Direction.LEFT;
        }
    }
    /** Check if position is in bounds */
    inBounds(pos) {
        return pos.row >= 0 && pos.row < this.height && pos.col >= 0 && pos.col < this.width;
    }
    /** Check connectivity of all regions */
    checkConnectivity() {
        const visited = new Set();
        let startPos = null;
        // Find first cell
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                startPos = { row, col };
                break;
            }
            if (startPos)
                break;
        }
        if (!startPos)
            return true;
        // BFS to find all connected cells
        const queue = [startPos];
        visited.add(posKey(startPos));
        while (queue.length > 0) {
            const current = queue.shift();
            for (const dir of DIRECTIONS) {
                const next = adjacent(current, dir);
                if (!this.inBounds(next))
                    continue;
                if (visited.has(posKey(next)))
                    continue;
                // Check if there's a wall between current and next
                const wall = this.getWallBetween(current, next);
                if (wall !== WallState.WALL) {
                    visited.add(posKey(next));
                    queue.push(next);
                }
            }
        }
        // All cells should be reachable
        return visited.size === this.height * this.width;
    }
    /** Check even number of passages in each row/column */
    checkEvenPassages() {
        // Check horizontal passages in each row
        for (let row = 0; row < this.height - 1; row++) {
            let noWallCount = 0;
            let hasUnknown = false;
            for (let col = 0; col < this.width; col++) {
                const wall = this.horizontalWalls.get(row, col);
                if (wall === WallState.NO_WALL)
                    noWallCount++;
                else if (wall === WallState.UNKNOWN)
                    hasUnknown = true;
            }
            if (!hasUnknown && noWallCount % 2 !== 0) {
                return false; // Odd number of passages
            }
        }
        // Check vertical passages in each column
        for (let col = 0; col < this.width - 1; col++) {
            let noWallCount = 0;
            let hasUnknown = false;
            for (let row = 0; row < this.height; row++) {
                const wall = this.verticalWalls.get(row, col);
                if (wall === WallState.NO_WALL)
                    noWallCount++;
                else if (wall === WallState.UNKNOWN)
                    hasUnknown = true;
            }
            if (!hasUnknown && noWallCount % 2 !== 0) {
                return false; // Odd number of passages
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new MukokonnField(this.height, this.width);
        // Clone compasses
        for (const [pos, compass] of this.compasses.entries()) {
            if (compass) {
                cloned.compasses.set(pos, { ...compass });
            }
        }
        // Clone walls
        for (const [pos, state] of this.horizontalWalls.entries()) {
            cloned.horizontalWalls.set(pos, state);
        }
        for (const [pos, state] of this.verticalWalls.entries()) {
            cloned.verticalWalls.set(pos, state);
        }
        return cloned;
    }
    getStateDump() {
        return this.horizontalWalls.dump() + '|' + this.verticalWalls.dump();
    }
    isSolved() {
        // All walls must be determined
        for (const [, state] of this.horizontalWalls.entries()) {
            if (state === WallState.UNKNOWN)
                return false;
        }
        for (const [, state] of this.verticalWalls.entries()) {
            if (state === WallState.UNKNOWN)
                return false;
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        const beforeState = this.getStateDump();
        // Apply two-walls-per-cell constraint
        if (!this.checkTwoWallsPerCell())
            return false;
        // Apply compass constraints
        if (!this.applyCompassConstraints())
            return false;
        // Check if state changed, if so recurse
        if (this.getStateDump() !== beforeState) {
            return this.solveAndCheck();
        }
        // Check connectivity and even passages
        if (!this.checkEvenPassages())
            return false;
        if (!this.checkConnectivity())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        // Top border
        lines.push('┌' + '─'.repeat(this.width * 2 - 1) + '┐');
        for (let row = 0; row < this.height; row++) {
            // Cell row
            let cellLine = '│';
            for (let col = 0; col < this.width; col++) {
                const compass = this.compasses.get(row, col);
                cellLine += compass ? '×' : ' ';
                if (col < this.width - 1) {
                    const wall = this.verticalWalls.get(row, col);
                    cellLine += wall === WallState.WALL ? '│' : wall === WallState.NO_WALL ? ' ' : '?';
                }
            }
            cellLine += '│';
            lines.push(cellLine);
            // Wall row
            if (row < this.height - 1) {
                let wallLine = '│';
                for (let col = 0; col < this.width; col++) {
                    const wall = this.horizontalWalls.get(row, col);
                    wallLine += wall === WallState.WALL ? '─' : wall === WallState.NO_WALL ? ' ' : '?';
                    if (col < this.width - 1) {
                        wallLine += ' ';
                    }
                }
                wallLine += '│';
                lines.push(wallLine);
            }
        }
        // Bottom border
        lines.push('└' + '─'.repeat(this.width * 2 - 1) + '┘');
        return lines.join('\n');
    }
    /** Get unknown walls for branching */
    getUnknownWalls() {
        const unknowns = [];
        for (const [pos, state] of this.horizontalWalls.entries()) {
            if (state === WallState.UNKNOWN) {
                unknowns.push({ type: 'horizontal', row: pos.row, col: pos.col });
            }
        }
        for (const [pos, state] of this.verticalWalls.entries()) {
            if (state === WallState.UNKNOWN) {
                unknowns.push({ type: 'vertical', row: pos.row, col: pos.col });
            }
        }
        return unknowns;
    }
}
// ============================================
// Mukkonn Solver
// ============================================
export class MukokonnSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from puzz.link URL format
     * Format: mukkonn/width/height/param
     * Param encoding: compass clues with gaps (g-z = 1-20 empty cells)
     * Each compass: 4 chars for up/down/left/right (. = no constraint, digit = count)
     */
    static fromString(height, width, param) {
        const field = new MukokonnField(height, width);
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let cellIndex = 0;
        let i = 0;
        while (i < param.length && cellIndex < height * width) {
            const ch = param[i];
            const gapIndex = ALPHABET_FROM_G.indexOf(ch);
            if (gapIndex !== -1) {
                // Gap: skip cells
                cellIndex += gapIndex + 1;
                i++;
            }
            else {
                // Parse compass: 4 values for up/down/left/right
                const parseValue = (char) => {
                    if (char === '.')
                        return -1;
                    if (char === '-') {
                        // 16-255: 2 hex digits
                        const hex = param.substring(i + 1, i + 3);
                        i += 2;
                        return parseInt(hex, 16);
                    }
                    if (char === '+') {
                        // 256-999: 3 hex digits
                        const hex = param.substring(i + 1, i + 4);
                        i += 3;
                        return parseInt(hex, 16);
                    }
                    // 0-15: single hex digit
                    return parseInt(char, 16);
                };
                const up = parseValue(param[i++]);
                const down = parseValue(param[i++]);
                const left = parseValue(param[i++]);
                const right = parseValue(param[i++]);
                const row = Math.floor(cellIndex / width);
                const col = cellIndex % width;
                field.setCompass(row, col, { up, right, down, left });
                cellIndex++;
            }
        }
        return new MukokonnSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownWalls();
        if (unknowns.length === 0)
            return [];
        const wall = unknowns[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (wall.type === 'horizontal') {
                        cloned.setHorizontalWall(wall.row, wall.col, WallState.WALL);
                    }
                    else {
                        cloned.setVerticalWall(wall.row, wall.col, WallState.WALL);
                    }
                    return cloned;
                },
                description: `Set ${wall.type} wall at (${wall.row}, ${wall.col}) to WALL`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (wall.type === 'horizontal') {
                        cloned.setHorizontalWall(wall.row, wall.col, WallState.NO_WALL);
                    }
                    else {
                        cloned.setVerticalWall(wall.row, wall.col, WallState.NO_WALL);
                    }
                    return cloned;
                },
                description: `Set ${wall.type} wall at (${wall.row}, ${wall.col}) to NO_WALL`,
            },
        ];
    }
}
//# sourceMappingURL=mukkonn.js.map