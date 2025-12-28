/**
 * Nagare (流れ - Flow) Solver
 *
 * Rules:
 * 1. Divide the grid into regions with walls
 * 2. Each white cell has exactly 2 adjacent cells (no walls between them)
 * 3. Each black cell is surrounded by walls on all 4 sides
 * 4. Some cells have arrows showing flow direction
 * 5. White cells must be connected in one continuous region
 * 6. Flow arrows indicate the direction of flow - following flow direction should not enter against flow/wind
 * 7. Wind from black cells with arrows blows in that direction until blocked
 * 8. Walls crossing each row/column must be even in number
 */
import { Direction, WallState, CellState, DIRECTIONS, adjacent, posKey, oppositeDirection, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Nagare Types
// ============================================
// ============================================
// Nagare Field State
// ============================================
export class NagareField {
    height;
    width;
    /** Cell state: unknown, white (not black), or black */
    cells;
    /** Horizontal walls (between columns) */
    horizontalWalls;
    /** Vertical walls (between rows) */
    verticalWalls;
    /** Flow arrows on cells */
    arrows;
    /** Set of initial black cell positions */
    initialBlackCells;
    /** Wind sources (from black cells with arrows) */
    windSources;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        // Horizontal walls: height rows, width-1 positions per row
        this.horizontalWalls = new Grid(height, width - 1, () => WallState.UNKNOWN);
        // Vertical walls: height-1 rows, width positions per row
        this.verticalWalls = new Grid(height - 1, width, () => WallState.UNKNOWN);
        this.arrows = new Grid(height, width, () => null);
        this.initialBlackCells = new Set();
        this.windSources = new Set();
    }
    /** Set arrow direction for a cell */
    setArrow(row, col, direction) {
        this.arrows.set(row, col, direction);
    }
    /** Get arrow at position */
    getArrow(pos) {
        return this.arrows.get(pos);
    }
    /** Set initial black cell */
    setBlackCell(row, col, _hasArrow) {
        this.cells.set(row, col, CellState.BLACK);
        const key = posKey({ row, col });
        this.initialBlackCells.add(key);
        // Set walls around black cell
        if (row > 0)
            this.setVerticalWall(row - 1, col, WallState.WALL);
        if (col < this.width - 1)
            this.setHorizontalWall(row, col, WallState.WALL);
        if (row < this.height - 1)
            this.setVerticalWall(row, col, WallState.WALL);
        if (col > 0)
            this.setHorizontalWall(row, col - 1, WallState.WALL);
    }
    /** Set white cell (not black) with optional arrow */
    setWhiteCell(row, col, direction) {
        this.cells.set(row, col, CellState.WHITE);
        if (direction !== null) {
            this.arrows.set(row, col, direction);
            // Set walls perpendicular to flow direction
            if (direction === Direction.UP || direction === Direction.DOWN) {
                // Vertical flow - horizontal walls
                if (col < this.width - 1)
                    this.setHorizontalWall(row, col, WallState.WALL);
                if (col > 0)
                    this.setHorizontalWall(row, col - 1, WallState.WALL);
            }
            else {
                // Horizontal flow - vertical walls
                if (row > 0)
                    this.setVerticalWall(row - 1, col, WallState.WALL);
                if (row < this.height - 1)
                    this.setVerticalWall(row, col, WallState.WALL);
            }
        }
    }
    /** Initialize wind sources from black cells with arrows */
    initializeWind() {
        this.windSources.clear();
        for (const key of this.initialBlackCells) {
            const pos = this.parsePos(key);
            const arrow = this.arrows.get(pos);
            if (arrow !== null) {
                this.propagateWind(pos, arrow);
            }
        }
    }
    /** Propagate wind from a black cell in given direction */
    propagateWind(from, direction) {
        let current = adjacent(from, direction);
        while (this.isInBounds(current)) {
            if (this.cells.get(current) === CellState.BLACK)
                break;
            this.windSources.add(posKey(current) + ':' + direction);
            current = adjacent(current, direction);
        }
    }
    /** Check if wind affects a cell */
    hasWind(pos, direction) {
        return this.windSources.has(posKey(pos) + ':' + direction);
    }
    /** Set horizontal wall state */
    setHorizontalWall(row, col, state) {
        if (col >= 0 && col < this.width - 1) {
            this.horizontalWalls.set(row, col, state);
        }
    }
    /** Set vertical wall state */
    setVerticalWall(row, col, state) {
        if (row >= 0 && row < this.height - 1) {
            this.verticalWalls.set(row, col, state);
        }
    }
    /** Get wall state between two adjacent cells */
    getWallBetween(p1, p2) {
        if (p1.row === p2.row) {
            // Horizontal wall
            const col = Math.min(p1.col, p2.col);
            if (col >= 0 && col < this.width - 1) {
                return this.horizontalWalls.get(p1.row, col);
            }
        }
        else if (p1.col === p2.col) {
            // Vertical wall
            const row = Math.min(p1.row, p2.row);
            if (row >= 0 && row < this.height - 1) {
                return this.verticalWalls.get(row, p1.col);
            }
        }
        return WallState.WALL; // Boundary
    }
    isInBounds(pos) {
        return pos.row >= 0 && pos.row < this.height && pos.col >= 0 && pos.col < this.width;
    }
    parsePos(key) {
        const [row, col] = key.split(',').map(Number);
        return { row, col };
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new NagareField(this.height, this.width);
        for (const [pos, val] of this.cells.entries()) {
            cloned.cells.set(pos, val);
        }
        for (const [pos, val] of this.horizontalWalls.entries()) {
            cloned.horizontalWalls.set(pos, val);
        }
        for (const [pos, val] of this.verticalWalls.entries()) {
            cloned.verticalWalls.set(pos, val);
        }
        for (const [pos, val] of this.arrows.entries()) {
            cloned.arrows.set(pos, val);
        }
        cloned.initialBlackCells = new Set(this.initialBlackCells);
        cloned.windSources = new Set(this.windSources);
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
        // All cells must be determined
        for (const [_, cell] of this.cells.entries()) {
            if (cell === CellState.UNKNOWN)
                return false;
        }
        // All walls must be determined
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
        if (!this.propagateBasicConstraints())
            return false;
        if (!this.checkWindConstraints())
            return false;
        if (!this.checkOddConstraints())
            return false;
        if (this.getStateDump() !== before) {
            if (!this.checkFlowConstraints())
                return false;
            if (!this.checkConnectivity())
                return false;
            return this.solveAndCheck();
        }
        return true;
    }
    /** Black cells have 4 walls, white cells have exactly 2 walls */
    propagateBasicConstraints() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const pos = { row, col };
                const cell = this.cells.get(pos);
                // Count walls around this cell
                let wallCount = 0;
                let noWallCount = 0;
                const walls = [];
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
                        const adjCell = this.cells.get(adj);
                        if (adjCell === CellState.BLACK)
                            return false;
                        this.cells.set(adj, CellState.WHITE);
                    }
                    walls.push({ pos: adj, state: wallState });
                }
                // Apply constraints based on cell type
                if (cell === CellState.BLACK) {
                    // Must have 4 walls
                    if (noWallCount > 0)
                        return false;
                    // Set remaining unknown to walls
                    for (const w of walls) {
                        if (w.state === WallState.UNKNOWN) {
                            this.setWallState(pos, w.pos, WallState.WALL);
                        }
                    }
                }
                else if (cell === CellState.WHITE) {
                    // Must have exactly 2 walls
                    if (wallCount > 2 || noWallCount > 2)
                        return false;
                    if (noWallCount === 2) {
                        // Set remaining to walls
                        for (const w of walls) {
                            if (w.state === WallState.UNKNOWN) {
                                this.setWallState(pos, w.pos, WallState.WALL);
                            }
                        }
                    }
                    else if (wallCount === 2) {
                        // Set remaining to no wall
                        for (const w of walls) {
                            if (w.state === WallState.UNKNOWN) {
                                this.setWallState(pos, w.pos, WallState.NO_WALL);
                                this.cells.set(w.pos, CellState.WHITE);
                            }
                        }
                    }
                }
                else {
                    // Unknown cell - deduce from wall count
                    if (wallCount > 2) {
                        this.cells.set(pos, CellState.BLACK);
                    }
                    else if (noWallCount > 0) {
                        this.cells.set(pos, CellState.WHITE);
                    }
                }
            }
        }
        return true;
    }
    /** Helper to set wall state between two cells */
    setWallState(p1, p2, state) {
        if (p1.row === p2.row) {
            const col = Math.min(p1.col, p2.col);
            this.setHorizontalWall(p1.row, col, state);
        }
        else if (p1.col === p2.col) {
            const row = Math.min(p1.row, p2.row);
            this.setVerticalWall(row, p1.col, state);
        }
    }
    /** Wind cannot be crossed - perpendicular movement forbidden */
    checkWindConstraints() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const pos = { row, col };
                const hasUpWind = this.hasWind(pos, Direction.UP) || this.hasWind(pos, Direction.DOWN);
                const hasRightWind = this.hasWind(pos, Direction.RIGHT) || this.hasWind(pos, Direction.LEFT);
                if (hasUpWind) {
                    // Cannot move horizontally through vertical wind
                    const leftWall = col > 0 ? this.getWallBetween(pos, { row, col: col - 1 }) : WallState.WALL;
                    const rightWall = col < this.width - 1 ? this.getWallBetween(pos, { row, col: col + 1 }) : WallState.WALL;
                    if (leftWall === WallState.NO_WALL && rightWall === WallState.NO_WALL)
                        return false;
                    if (leftWall === WallState.NO_WALL && rightWall === WallState.UNKNOWN) {
                        this.setHorizontalWall(row, col, WallState.WALL);
                    }
                    if (leftWall === WallState.UNKNOWN && rightWall === WallState.NO_WALL) {
                        this.setHorizontalWall(row, col - 1, WallState.WALL);
                    }
                }
                if (hasRightWind) {
                    // Cannot move vertically through horizontal wind
                    const upWall = row > 0 ? this.getWallBetween(pos, { row: row - 1, col }) : WallState.WALL;
                    const downWall = row < this.height - 1 ? this.getWallBetween(pos, { row: row + 1, col }) : WallState.WALL;
                    if (upWall === WallState.NO_WALL && downWall === WallState.NO_WALL)
                        return false;
                    if (upWall === WallState.NO_WALL && downWall === WallState.UNKNOWN) {
                        this.setVerticalWall(row, col, WallState.WALL);
                    }
                    if (upWall === WallState.UNKNOWN && downWall === WallState.NO_WALL) {
                        this.setVerticalWall(row - 1, col, WallState.WALL);
                    }
                }
            }
        }
        return true;
    }
    /** Number of no-walls crossing each row/column must be even */
    checkOddConstraints() {
        // Check vertical walls (crossing rows)
        for (let row = 0; row < this.height - 1; row++) {
            let noWallCount = 0;
            let unknownCount = 0;
            for (let col = 0; col < this.width; col++) {
                const wall = this.verticalWalls.get(row, col);
                if (wall === WallState.NO_WALL)
                    noWallCount++;
                if (wall === WallState.UNKNOWN) {
                    unknownCount = 0;
                    break;
                }
            }
            if (unknownCount === 0 && noWallCount % 2 !== 0)
                return false;
        }
        // Check horizontal walls (crossing columns)
        for (let col = 0; col < this.width - 1; col++) {
            let noWallCount = 0;
            let unknownCount = 0;
            for (let row = 0; row < this.height; row++) {
                const wall = this.horizontalWalls.get(row, col);
                if (wall === WallState.NO_WALL)
                    noWallCount++;
                if (wall === WallState.UNKNOWN) {
                    unknownCount = 0;
                    break;
                }
            }
            if (unknownCount === 0 && noWallCount % 2 !== 0)
                return false;
        }
        return true;
    }
    /** Check flow constraints */
    checkFlowConstraints() {
        // Following flow should not enter against flow/wind
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const pos = { row, col };
                if (this.cells.get(pos) !== CellState.WHITE)
                    continue;
                const arrow = this.arrows.get(pos);
                if (arrow === null)
                    continue;
                // Trace flow forward
                const visited = new Set();
                if (!this.traceFlow(pos, oppositeDirection(arrow), visited)) {
                    return false;
                }
            }
        }
        return true;
    }
    /** Trace flow from position in given direction */
    traceFlow(pos, from, visited) {
        const key = posKey(pos);
        if (visited.has(key))
            return true;
        visited.add(key);
        const oppositeFrom = oppositeDirection(from);
        // Try each direction except where we came from
        for (const dir of DIRECTIONS) {
            if (dir === from)
                continue;
            const next = adjacent(pos, dir);
            if (!this.isInBounds(next))
                continue;
            if (this.getWallBetween(pos, next) !== WallState.NO_WALL)
                continue;
            const nextArrow = this.arrows.get(next);
            // Check if entering against arrow/wind
            if (nextArrow === oppositeFrom || this.hasWind(next, oppositeFrom)) {
                return false;
            }
            if (!this.traceFlow(next, oppositeDirection(dir), visited)) {
                return false;
            }
        }
        return true;
    }
    /** White cells must form one connected region */
    checkConnectivity() {
        let firstWhite = null;
        for (const [pos, cell] of this.cells.entries()) {
            if (cell === CellState.WHITE) {
                firstWhite = pos;
                break;
            }
        }
        if (firstWhite === null)
            return true;
        const reachable = new Set();
        this.floodFill(firstWhite, reachable);
        // Mark unreachable whites as black
        for (const [pos, cell] of this.cells.entries()) {
            if (cell === CellState.WHITE && !reachable.has(posKey(pos))) {
                return false;
            }
            if (cell === CellState.UNKNOWN && !reachable.has(posKey(pos))) {
                this.cells.set(pos, CellState.BLACK);
            }
        }
        return true;
    }
    /** Flood fill to find connected white cells */
    floodFill(start, visited) {
        const stack = [start];
        visited.add(posKey(start));
        while (stack.length > 0) {
            const pos = stack.pop();
            for (const dir of DIRECTIONS) {
                const next = adjacent(pos, dir);
                if (!this.isInBounds(next))
                    continue;
                if (visited.has(posKey(next)))
                    continue;
                if (this.getWallBetween(pos, next) === WallState.WALL)
                    continue;
                visited.add(posKey(next));
                stack.push(next);
            }
        }
    }
}
// ============================================
// Nagare Solver
// ============================================
export class NagareSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    static fromURL(height, width, param) {
        const field = new NagareField(height, width);
        let index = 0;
        for (let i = 0; i < param.length; i++) {
            const ch = param[i];
            const val = parseInt(ch, 36);
            if (val >= 10 && val <= 35) {
                // Skip cells (a-z)
                index += val - 9;
            }
            else if (val >= 0 && val <= 9) {
                const row = Math.floor(index / width);
                const col = index % width;
                const direction = [Direction.UP, Direction.RIGHT, Direction.DOWN, Direction.LEFT][val % 4];
                if (val >= 5) {
                    // Black cell with arrow
                    field.setBlackCell(row, col, true);
                    field.setArrow(row, col, direction);
                }
                else if (val >= 1) {
                    // White cell with arrow
                    field.setWhiteCell(row, col, direction);
                }
                index++;
            }
        }
        field.initializeWind();
        return new NagareSolver(field);
    }
    getBranchCandidates(state) {
        const candidates = [];
        // Find first unknown horizontal wall
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width - 1; col++) {
                if (state['horizontalWalls'].get(row, col) === WallState.UNKNOWN) {
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
        // Find first unknown vertical wall
        for (let row = 0; row < state.height - 1; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state['verticalWalls'].get(row, col) === WallState.UNKNOWN) {
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
//# sourceMappingURL=nagare.js.map