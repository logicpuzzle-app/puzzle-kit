/**
 * Heyawake Solver
 *
 * Rules:
 * 1. Paint some cells black
 * 2. Each room has a specified number of black cells (or no constraint if -1)
 * 3. Black cells cannot be adjacent orthogonally
 * 4. All white cells must be connected
 * 5. A horizontal or vertical line of white cells cannot cross more than 2 room borders
 */
import { CellState, DIRECTIONS, adjacent, posKey, SolveStatus, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
/**
 * Generate all valid black cell patterns for a rectangular room.
 * Takes into account:
 * - No adjacent black cells
 * - White cells must be connected (within room + adjacent boundary)
 * - Required number of black cells
 */
function generateRoomCandidates(height, width, blackCount, bounds, limit = 10000) {
    if (blackCount === -1)
        return [];
    const results = [];
    const totalCells = height * width;
    // Extended grid with boundary cells
    const extHeight = height + 2;
    const extWidth = width + 2;
    // Cell states: 0=SPACE, 1=BLACK, 2=WHITE, 3=WALL, 4=NOT_WALL
    const SPACE = 0, BLACK = 1, WHITE = 2, WALL = 3, NOT_WALL = 4;
    // Initialize extended grid
    const initGrid = () => {
        const grid = [];
        for (let r = 0; r < extHeight; r++) {
            grid[r] = [];
            for (let c = 0; c < extWidth; c++) {
                if (r === 0 || r === extHeight - 1 || c === 0 || c === extWidth - 1) {
                    // Boundary
                    if (r === 0 && c === 0)
                        grid[r][c] = (!bounds.isOnTop && !bounds.isOnLeft) ? NOT_WALL : WALL;
                    else if (r === 0 && c === extWidth - 1)
                        grid[r][c] = (!bounds.isOnTop && !bounds.isOnRight) ? NOT_WALL : WALL;
                    else if (r === extHeight - 1 && c === 0)
                        grid[r][c] = (!bounds.isOnBottom && !bounds.isOnLeft) ? NOT_WALL : WALL;
                    else if (r === extHeight - 1 && c === extWidth - 1)
                        grid[r][c] = (!bounds.isOnBottom && !bounds.isOnRight) ? NOT_WALL : WALL;
                    else if (r === 0)
                        grid[r][c] = bounds.isOnTop ? WALL : NOT_WALL;
                    else if (r === extHeight - 1)
                        grid[r][c] = bounds.isOnBottom ? WALL : NOT_WALL;
                    else if (c === 0)
                        grid[r][c] = bounds.isOnLeft ? WALL : NOT_WALL;
                    else if (c === extWidth - 1)
                        grid[r][c] = bounds.isOnRight ? WALL : NOT_WALL;
                    else
                        grid[r][c] = WALL;
                }
                else {
                    grid[r][c] = SPACE;
                }
            }
        }
        return grid;
    };
    // Check if white cells are connected in the grid
    const isWhiteConnected = (grid) => {
        const visited = new Set();
        let firstWhite = null;
        // Find first white/not_wall cell
        for (let r = 0; r < extHeight && !firstWhite; r++) {
            for (let c = 0; c < extWidth && !firstWhite; c++) {
                if (grid[r][c] === WHITE || grid[r][c] === NOT_WALL) {
                    firstWhite = { r, c };
                }
            }
        }
        if (!firstWhite)
            return true;
        // BFS
        const queue = [firstWhite];
        visited.add(`${firstWhite.r},${firstWhite.c}`);
        while (queue.length > 0) {
            const { r, c } = queue.shift();
            const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            for (const [dr, dc] of dirs) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < extHeight && nc >= 0 && nc < extWidth) {
                    const key = `${nr},${nc}`;
                    if (!visited.has(key) && grid[nr][nc] !== BLACK && grid[nr][nc] !== WALL) {
                        visited.add(key);
                        queue.push({ r: nr, c: nc });
                    }
                }
            }
        }
        // Check all white/not_wall cells are visited
        for (let r = 0; r < extHeight; r++) {
            for (let c = 0; c < extWidth; c++) {
                if ((grid[r][c] === WHITE || grid[r][c] === NOT_WALL) && !visited.has(`${r},${c}`)) {
                    return false;
                }
            }
        }
        return true;
    };
    // Check if placing black at (r,c) causes adjacent black
    const hasAdjacentBlack = (grid, r, c) => {
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of dirs) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < extHeight && nc >= 0 && nc < extWidth) {
                if (grid[nr][nc] === BLACK)
                    return true;
            }
        }
        return false;
    };
    // Recursive search
    const search = (grid, index, currentBlacks, remainingSpaces) => {
        if (results.length >= limit)
            return;
        // Check if enough remaining spaces to place required blacks
        // At most ceil(N/2) cells can be black in N spaces (due to no-adjacent rule)
        // e.g., 3 cells -> max 2 blacks (■・■), 4 cells -> max 2 blacks (■・■・)
        if (currentBlacks + Math.ceil(remainingSpaces / 2) < blackCount)
            return;
        if (currentBlacks > blackCount)
            return;
        if (index >= totalCells) {
            if (currentBlacks === blackCount && isWhiteConnected(grid)) {
                // Convert to state string
                let state = '';
                for (let r = 1; r <= height; r++) {
                    for (let c = 1; c <= width; c++) {
                        state += grid[r][c] === BLACK ? '■' : '・';
                    }
                }
                results.push(state);
            }
            return;
        }
        const r = Math.floor(index / width) + 1; // +1 for boundary
        const c = (index % width) + 1;
        // Try BLACK
        if (!hasAdjacentBlack(grid, r, c)) {
            const newGrid = grid.map(row => [...row]);
            newGrid[r][c] = BLACK;
            if (isWhiteConnected(newGrid)) {
                search(newGrid, index + 1, currentBlacks + 1, remainingSpaces - 1);
            }
        }
        // Try WHITE
        const newGrid = grid.map(row => [...row]);
        newGrid[r][c] = WHITE;
        search(newGrid, index + 1, currentBlacks, remainingSpaces - 1);
    };
    const initialGrid = initGrid();
    search(initialGrid, 0, 0, totalCells);
    return results;
}
// ============================================
// Heyawake Field State
// ============================================
export class HeyawakeField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    cells;
    /** Room ID for each cell */
    roomIds;
    /** List of rooms */
    rooms;
    /** Horizontal walls (between col and col+1) */
    horizontalWalls;
    /** Vertical walls (between row and row+1) */
    verticalWalls;
    /** Pre-computed room candidates (room index -> array of state strings) */
    roomCandidates;
    /** Whether roomCandidates has been set up */
    candidatesSetUp = false;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.roomIds = new Grid(height, width, () => -1);
        this.rooms = [];
        this.horizontalWalls = [];
        this.verticalWalls = [];
        this.roomCandidates = new Map();
    }
    /** Set room configuration */
    setRooms(rooms) {
        this.rooms = rooms;
        for (let roomId = 0; roomId < rooms.length; roomId++) {
            for (const pos of rooms[roomId].members) {
                this.roomIds.set(pos.row, pos.col, roomId);
            }
        }
    }
    /** Set wall data */
    setWalls(horizontalWalls, verticalWalls) {
        this.horizontalWalls = horizontalWalls;
        this.verticalWalls = verticalWalls;
    }
    /** Check if there's a horizontal wall between (row, col) and (row, col+1) */
    hasHorizontalWall(row, col) {
        return this.horizontalWalls[row]?.[col] ?? false;
    }
    /** Check if there's a vertical wall between (row, col) and (row+1, col) */
    hasVerticalWall(row, col) {
        return this.verticalWalls[row]?.[col] ?? false;
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
    /** Get room ID for a cell */
    getRoomId(row, col) {
        return this.roomIds.get(row, col);
    }
    /** Get room by ID */
    getRoom(roomId) {
        return this.rooms[roomId];
    }
    /** Get number of rooms */
    getRoomCount() {
        return this.rooms.length;
    }
    // ========== Room candidate methods ==========
    /**
     * Check if a room is rectangular
     */
    isRoomRectangular(room) {
        let minRow = Infinity, maxRow = -Infinity;
        let minCol = Infinity, maxCol = -Infinity;
        for (const pos of room.members) {
            if (pos.row < minRow)
                minRow = pos.row;
            if (pos.row > maxRow)
                maxRow = pos.row;
            if (pos.col < minCol)
                minCol = pos.col;
            if (pos.col > maxCol)
                maxCol = pos.col;
        }
        const expectedSize = (maxRow - minRow + 1) * (maxCol - minCol + 1);
        if (room.members.length !== expectedSize) {
            return { isRect: false, minRow, maxRow, minCol, maxCol };
        }
        // Verify all cells in rectangle are in room
        const memberSet = new Set(room.members.map(p => posKey(p)));
        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                if (!memberSet.has(posKey({ row: r, col: c }))) {
                    return { isRect: false, minRow, maxRow, minCol, maxCol };
                }
            }
        }
        return { isRect: true, minRow, maxRow, minCol, maxCol };
    }
    /**
     * Set up room candidates - call once at the beginning of solving.
     * Pre-computes valid black cell patterns for rectangular rooms.
     */
    setupRoomCandidates() {
        if (this.candidatesSetUp)
            return;
        this.candidatesSetUp = true;
        for (let roomId = 0; roomId < this.rooms.length; roomId++) {
            const room = this.rooms[roomId];
            if (room.blackCount === -1)
                continue;
            const rectInfo = this.isRoomRectangular(room);
            if (!rectInfo.isRect)
                continue;
            const roomHeight = rectInfo.maxRow - rectInfo.minRow + 1;
            const roomWidth = rectInfo.maxCol - rectInfo.minCol + 1;
            // Skip large rooms (too many candidates)
            if (roomHeight * roomWidth > 50)
                continue;
            const bounds = {
                isOnTop: rectInfo.minRow === 0,
                isOnRight: rectInfo.maxCol === this.width - 1,
                isOnBottom: rectInfo.maxRow === this.height - 1,
                isOnLeft: rectInfo.minCol === 0,
            };
            const candidates = generateRoomCandidates(roomHeight, roomWidth, room.blackCount, bounds, 10000);
            if (candidates.length > 0 && candidates.length < 10000) {
                this.roomCandidates.set(roomId, candidates);
            }
        }
    }
    /**
     * Solve using room candidates.
     * Filter candidates based on current state, and deduce cells that are same across all candidates.
     */
    solveRoomCandidates() {
        let changed = false;
        for (const [roomId, candidates] of this.roomCandidates.entries()) {
            const room = this.rooms[roomId];
            const rectInfo = this.isRoomRectangular(room);
            if (!rectInfo.isRect)
                continue;
            const roomWidth = rectInfo.maxCol - rectInfo.minCol + 1;
            // Build current state string for this room
            let currentState = '';
            for (let r = rectInfo.minRow; r <= rectInfo.maxRow; r++) {
                for (let c = rectInfo.minCol; c <= rectInfo.maxCol; c++) {
                    const state = this.cells.get(r, c);
                    currentState += state === CellState.BLACK ? '■' : state === CellState.WHITE ? '・' : '　';
                }
            }
            // Filter candidates that match current state
            const validCandidates = candidates.filter(cand => {
                if (currentState.length !== cand.length)
                    return false;
                for (let i = 0; i < currentState.length; i++) {
                    const a = currentState[i];
                    const b = cand[i];
                    // If current state is determined (BLACK or WHITE), candidate must match
                    if ((a === '■' && b === '・') || (a === '・' && b === '■')) {
                        return false;
                    }
                }
                return true;
            });
            // Update stored candidates
            this.roomCandidates.set(roomId, validCandidates);
            // If no valid candidates, contradiction
            if (validCandidates.length === 0) {
                // Will be caught by caller
                continue;
            }
            // Find cells that are same across all candidates
            if (validCandidates.length > 0) {
                const firstCand = validCandidates[0];
                const fixedState = [...firstCand];
                for (const cand of validCandidates) {
                    for (let i = 0; i < fixedState.length; i++) {
                        if (fixedState[i] !== cand[i]) {
                            fixedState[i] = '　'; // Unknown - varies between candidates
                        }
                    }
                }
                // Apply fixed cells
                for (let i = 0; i < fixedState.length; i++) {
                    const r = rectInfo.minRow + Math.floor(i / roomWidth);
                    const c = rectInfo.minCol + (i % roomWidth);
                    if (this.cells.get(r, c) === CellState.UNKNOWN) {
                        if (fixedState[i] === '■') {
                            this.setBlack(r, c);
                            changed = true;
                        }
                        else if (fixedState[i] === '・') {
                            this.setWhite(r, c);
                            changed = true;
                        }
                    }
                }
            }
        }
        return changed;
    }
    /**
     * Check if room candidates are exhausted (contradiction)
     */
    checkRoomCandidatesValid() {
        for (const [, candidates] of this.roomCandidates.entries()) {
            if (candidates.length === 0) {
                return false;
            }
        }
        return true;
    }
    // ========== Constraint checking ==========
    /** Check if any black cells are adjacent */
    hasAdjacentBlack() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) !== CellState.BLACK)
                    continue;
                for (const dir of DIRECTIONS) {
                    const next = adjacent({ row, col }, dir);
                    if (this.cells.inBounds(next) && this.cells.get(next) === CellState.BLACK) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    /** Check if white cells are connected */
    isWhiteConnected() {
        const whiteCells = [];
        for (const [pos, state] of this.cells.entries()) {
            if (state === CellState.WHITE) {
                whiteCells.push(pos);
            }
        }
        if (whiteCells.length === 0)
            return true;
        // BFS from first white cell
        const visited = new Set();
        const queue = [whiteCells[0]];
        visited.add(posKey(whiteCells[0]));
        while (queue.length > 0) {
            const current = queue.shift();
            for (const dir of DIRECTIONS) {
                const next = adjacent(current, dir);
                const key = posKey(next);
                if (this.cells.inBounds(next) &&
                    this.cells.get(next) !== CellState.BLACK &&
                    !visited.has(key)) {
                    visited.add(key);
                    queue.push(next);
                }
            }
        }
        // All white cells must be reachable
        for (const pos of whiteCells) {
            if (!visited.has(posKey(pos))) {
                return false;
            }
        }
        return true;
    }
    /** Check room constraints validity */
    checkRoomConstraints() {
        for (let roomId = 0; roomId < this.rooms.length; roomId++) {
            const room = this.rooms[roomId];
            if (room.blackCount === -1)
                continue;
            let blackCount = 0;
            let unknownCount = 0;
            for (const pos of room.members) {
                const state = this.cells.get(pos);
                if (state === CellState.BLACK)
                    blackCount++;
                else if (state === CellState.UNKNOWN)
                    unknownCount++;
            }
            // Too many blacks
            if (blackCount > room.blackCount)
                return false;
            // Not enough cells to fill required blacks
            if (blackCount + unknownCount < room.blackCount)
                return false;
        }
        return true;
    }
    /** Check if a line of white cells crosses more than 2 room borders */
    checkThreeRoomRule() {
        // Check each cell as a potential center of a 3-room crossing
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.BLACK)
                    continue;
                // Check upward direction
                let roomCrossings = 0;
                for (let targetRow = row - 1; targetRow >= 0; targetRow--) {
                    if (this.cells.get(targetRow, col) !== CellState.WHITE)
                        break;
                    if (this.hasVerticalWall(targetRow, col)) {
                        roomCrossings++;
                    }
                    if (roomCrossings >= 2) {
                        // Current cell cannot be white
                        if (this.cells.get(row, col) === CellState.WHITE) {
                            return false;
                        }
                    }
                }
                // Check rightward direction
                roomCrossings = 0;
                for (let targetCol = col; targetCol < this.width - 1; targetCol++) {
                    if (this.cells.get(row, targetCol + 1) !== CellState.WHITE)
                        break;
                    if (this.hasHorizontalWall(row, targetCol)) {
                        roomCrossings++;
                    }
                    if (roomCrossings >= 2) {
                        if (this.cells.get(row, col) === CellState.WHITE) {
                            return false;
                        }
                    }
                }
                // Check downward direction
                roomCrossings = 0;
                for (let targetRow = row; targetRow < this.height - 1; targetRow++) {
                    if (this.cells.get(targetRow + 1, col) !== CellState.WHITE)
                        break;
                    if (this.hasVerticalWall(targetRow, col)) {
                        roomCrossings++;
                    }
                    if (roomCrossings >= 2) {
                        if (this.cells.get(row, col) === CellState.WHITE) {
                            return false;
                        }
                    }
                }
                // Check leftward direction
                roomCrossings = 0;
                for (let targetCol = col - 1; targetCol >= 0; targetCol--) {
                    if (this.cells.get(row, targetCol) !== CellState.WHITE)
                        break;
                    if (this.hasHorizontalWall(row, targetCol)) {
                        roomCrossings++;
                    }
                    if (roomCrossings >= 2) {
                        if (this.cells.get(row, col) === CellState.WHITE) {
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    }
    // ========== Solving methods ==========
    /** Room constraint: each room has specified black count */
    solveRoomConstraints() {
        let changed = false;
        for (let roomId = 0; roomId < this.rooms.length; roomId++) {
            const room = this.rooms[roomId];
            if (room.blackCount === -1)
                continue;
            let blackCount = 0;
            let unknownCount = 0;
            const unknownPositions = [];
            for (const pos of room.members) {
                const state = this.cells.get(pos);
                if (state === CellState.BLACK) {
                    blackCount++;
                }
                else if (state === CellState.UNKNOWN) {
                    unknownCount++;
                    unknownPositions.push(pos);
                }
            }
            // If room already has required blacks, mark rest as white
            if (blackCount === room.blackCount) {
                for (const pos of unknownPositions) {
                    this.setWhite(pos.row, pos.col);
                    changed = true;
                }
            }
            // If remaining unknowns = remaining blacks needed, fill all black
            else if (unknownCount === room.blackCount - blackCount && unknownCount > 0) {
                for (const pos of unknownPositions) {
                    this.setBlack(pos.row, pos.col);
                    changed = true;
                }
            }
        }
        return changed;
    }
    /** Mark neighbors of black cells as white */
    markBlackNeighborsWhite() {
        let changed = false;
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) !== CellState.BLACK)
                    continue;
                for (const dir of DIRECTIONS) {
                    const next = adjacent({ row, col }, dir);
                    if (this.cells.inBounds(next) && this.cells.get(next) === CellState.UNKNOWN) {
                        this.setWhite(next.row, next.col);
                        changed = true;
                    }
                }
            }
        }
        return changed;
    }
    /** Prevent 3-room crossing by placing black cells */
    solveContinueRoomConstraint() {
        let changed = false;
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) !== CellState.UNKNOWN)
                    continue;
                // Check if this cell must be black to prevent 3-room crossing
                // Check upward
                let roomCrossings = 0;
                for (let targetRow = row - 1; targetRow >= 0; targetRow--) {
                    if (this.cells.get(targetRow, col) !== CellState.WHITE)
                        break;
                    if (this.hasVerticalWall(targetRow, col)) {
                        roomCrossings++;
                    }
                }
                if (roomCrossings >= 2) {
                    this.setBlack(row, col);
                    changed = true;
                    continue;
                }
                // Check rightward
                roomCrossings = 0;
                for (let targetCol = col; targetCol < this.width - 1; targetCol++) {
                    if (this.cells.get(row, targetCol + 1) !== CellState.WHITE)
                        break;
                    if (this.hasHorizontalWall(row, targetCol)) {
                        roomCrossings++;
                    }
                }
                if (roomCrossings >= 2) {
                    this.setBlack(row, col);
                    changed = true;
                    continue;
                }
                // Check downward
                roomCrossings = 0;
                for (let targetRow = row; targetRow < this.height - 1; targetRow++) {
                    if (this.cells.get(targetRow + 1, col) !== CellState.WHITE)
                        break;
                    if (this.hasVerticalWall(targetRow, col)) {
                        roomCrossings++;
                    }
                }
                if (roomCrossings >= 2) {
                    this.setBlack(row, col);
                    changed = true;
                    continue;
                }
                // Check leftward
                roomCrossings = 0;
                for (let targetCol = col - 1; targetCol >= 0; targetCol--) {
                    if (this.cells.get(row, targetCol) !== CellState.WHITE)
                        break;
                    if (this.hasHorizontalWall(row, targetCol)) {
                        roomCrossings++;
                    }
                }
                if (roomCrossings >= 2) {
                    this.setBlack(row, col);
                    changed = true;
                    continue;
                }
            }
        }
        return changed;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new HeyawakeField(this.height, this.width);
        for (const [pos, state] of this.cells.entries()) {
            cloned.cells.set(pos, state);
        }
        cloned.roomIds = this.roomIds; // Shared (immutable)
        cloned.rooms = this.rooms; // Shared (immutable)
        cloned.horizontalWalls = this.horizontalWalls; // Shared (immutable)
        cloned.verticalWalls = this.verticalWalls; // Shared (immutable)
        // Deep copy room candidates
        cloned.roomCandidates = new Map();
        for (const [roomId, candidates] of this.roomCandidates.entries()) {
            cloned.roomCandidates.set(roomId, [...candidates]);
        }
        cloned.candidatesSetUp = this.candidatesSetUp;
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
        // Check all constraints
        if (this.hasAdjacentBlack())
            return false;
        if (!this.checkRoomConstraints())
            return false;
        if (!this.isWhiteConnected())
            return false;
        if (!this.checkThreeRoomRule())
            return false;
        return true;
    }
    solveAndCheck() {
        // Check for immediate contradictions
        if (this.hasAdjacentBlack())
            return false;
        if (!this.checkRoomConstraints())
            return false;
        let changed = true;
        while (changed) {
            changed = false;
            if (this.solveRoomConstraints())
                changed = true;
            if (this.markBlackNeighborsWhite())
                changed = true;
            if (this.solveContinueRoomConstraint())
                changed = true;
            if (this.solveRoomCandidates())
                changed = true;
            // Recheck constraints after changes
            if (this.hasAdjacentBlack())
                return false;
            if (!this.checkRoomConstraints())
                return false;
            if (!this.checkRoomCandidatesValid())
                return false;
        }
        // Check connectivity
        if (!this.isWhiteConnected())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const state = this.cells.get(row, col);
                line += state === CellState.BLACK ? '█' : state === CellState.WHITE ? '·' : '?';
            }
            lines.push(line);
        }
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
// Heyawake Solver
// ============================================
export class HeyawakeSolver extends BaseSolver {
    /** Counter for candSolve calls (for difficulty estimation) */
    candSolveCount = 0;
    constructor(field) {
        super(field);
        // Set up room candidates at construction time
        field.setupRoomCandidates();
    }
    /**
     * Get the number of candSolve calls made during solving.
     * Used for difficulty estimation.
     */
    getCandSolveCount() {
        return this.candSolveCount;
    }
    /**
     * SDVX-style candSolve implementation.
     * Tries placing BLACK/WHITE at each unknown cell and checks if either leads to contradiction.
     * If so, the opposite must be true.
     * @param field The field to solve
     * @param recursive Depth of recursive candSolve (0-3)
     * @returns true if no contradiction, false if contradiction found
     */
    candSolve(field, recursive) {
        let changed = true;
        while (changed) {
            changed = false;
            const unknowns = field.getUnknownCells();
            for (const pos of unknowns) {
                if (field.getCell(pos.row, pos.col) !== CellState.UNKNOWN)
                    continue;
                this.candSolveCount++;
                // Try BLACK
                const virtualBlack = field.clone();
                virtualBlack.setBlack(pos.row, pos.col);
                let allowBlack = virtualBlack.solveAndCheck();
                if (allowBlack && recursive > 0) {
                    if (!this.candSolve(virtualBlack, recursive - 1)) {
                        allowBlack = false;
                    }
                }
                // Try WHITE
                const virtualWhite = field.clone();
                virtualWhite.setWhite(pos.row, pos.col);
                let allowWhite = virtualWhite.solveAndCheck();
                if (allowWhite && recursive > 0) {
                    if (!this.candSolve(virtualWhite, recursive - 1)) {
                        allowWhite = false;
                    }
                }
                // Determine result
                if (!allowBlack && !allowWhite) {
                    // Both lead to contradiction - puzzle is unsolvable
                    return false;
                }
                else if (!allowBlack) {
                    // BLACK leads to contradiction, so must be WHITE
                    field.setWhite(pos.row, pos.col);
                    field.solveAndCheck();
                    changed = true;
                }
                else if (!allowWhite) {
                    // WHITE leads to contradiction, so must be BLACK
                    field.setBlack(pos.row, pos.col);
                    field.solveAndCheck();
                    changed = true;
                }
            }
        }
        return true;
    }
    /**
     * Override solve to use SDVX-style progressive candSolve.
     * First propagates, then tries candSolve at increasing depths (0-3).
     */
    solve(config) {
        this.candSolveCount = 0;
        const mergedConfig = {
            maxDepth: 50,
            maxBranches: 100000,
            timeout: 60000,
            ...config,
        };
        const startTime = Date.now();
        try {
            // Main solving loop with progressive candSolve
            while (!this.field.isSolved()) {
                // Check timeout
                if (Date.now() - startTime > mergedConfig.timeout) {
                    return {
                        status: SolveStatus.TIMEOUT,
                        state: this.field,
                        propagationCount: 0,
                        branchCount: 0,
                    };
                }
                const beforeState = this.field.getStateDump();
                // Try constraint propagation first
                if (!this.field.solveAndCheck()) {
                    return {
                        status: SolveStatus.UNSOLVABLE,
                        state: this.field,
                        propagationCount: 0,
                        branchCount: 0,
                    };
                }
                // If no progress from propagation, try candSolve at increasing depths
                let recursiveCnt = 0;
                let candSolveFailed = false;
                while (this.field.getStateDump() === beforeState && recursiveCnt < 4) {
                    if (!this.candSolve(this.field, recursiveCnt)) {
                        // candSolve found contradiction - fall back to branching
                        candSolveFailed = true;
                        break;
                    }
                    recursiveCnt++;
                }
                // If candSolve failed or no progress after depth 3, fall back to branching
                if (candSolveFailed || (recursiveCnt === 4 && this.field.getStateDump() === beforeState)) {
                    // Fall back to base solver's branching approach
                    return super.solve(mergedConfig);
                }
            }
            return {
                status: SolveStatus.SOLVED,
                state: this.field,
                propagationCount: 0,
                branchCount: 0,
            };
        }
        catch (error) {
            return {
                status: SolveStatus.ERROR,
                propagationCount: 0,
                branchCount: 0,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    /**
     * Create solver from room data
     * @param height Grid height
     * @param width Grid width
     * @param rooms Array of rooms with black count and member positions
     * @param horizontalWalls Horizontal wall data
     * @param verticalWalls Vertical wall data
     */
    static fromRooms(height, width, rooms, horizontalWalls, verticalWalls) {
        const field = new HeyawakeField(height, width);
        field.setRooms(rooms);
        field.setWalls(horizontalWalls, verticalWalls);
        return new HeyawakeSolver(field);
    }
    /**
     * Create solver from wall data
     * @param height Grid height
     * @param width Grid width
     * @param horizontalWalls Boolean grid for horizontal walls
     * @param verticalWalls Boolean grid for vertical walls
     * @param roomBlackCounts Array of black counts per room (-1 for no constraint)
     */
    static fromWalls(height, width, horizontalWalls, verticalWalls, roomBlackCounts) {
        // Convert walls to rooms using flood fill
        const visited = new Grid(height, width, () => false);
        const rooms = [];
        let roomIndex = 0;
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                if (visited.get(row, col))
                    continue;
                // Flood fill to find room
                const members = [];
                const queue = [{ row, col }];
                visited.set(row, col, true);
                while (queue.length > 0) {
                    const pos = queue.shift();
                    members.push(pos);
                    // Check each direction
                    // Up
                    if (pos.row > 0 && !verticalWalls[pos.row - 1]?.[pos.col] && !visited.get(pos.row - 1, pos.col)) {
                        visited.set(pos.row - 1, pos.col, true);
                        queue.push({ row: pos.row - 1, col: pos.col });
                    }
                    // Down
                    if (pos.row < height - 1 && !verticalWalls[pos.row]?.[pos.col] && !visited.get(pos.row + 1, pos.col)) {
                        visited.set(pos.row + 1, pos.col, true);
                        queue.push({ row: pos.row + 1, col: pos.col });
                    }
                    // Left
                    if (pos.col > 0 && !horizontalWalls[pos.row]?.[pos.col - 1] && !visited.get(pos.row, pos.col - 1)) {
                        visited.set(pos.row, pos.col - 1, true);
                        queue.push({ row: pos.row, col: pos.col - 1 });
                    }
                    // Right
                    if (pos.col < width - 1 && !horizontalWalls[pos.row]?.[pos.col] && !visited.get(pos.row, pos.col + 1)) {
                        visited.set(pos.row, pos.col + 1, true);
                        queue.push({ row: pos.row, col: pos.col + 1 });
                    }
                }
                rooms.push({
                    blackCount: roomBlackCounts[roomIndex] ?? -1,
                    members,
                });
                roomIndex++;
            }
        }
        return HeyawakeSolver.fromRooms(height, width, rooms, horizontalWalls, verticalWalls);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownCells();
        if (unknowns.length === 0)
            return [];
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
//# sourceMappingURL=heyawake.js.map