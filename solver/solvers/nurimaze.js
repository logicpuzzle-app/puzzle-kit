/**
 * Nurimaze Solver
 *
 * Rules:
 * 1. Paint cells black or white to create a maze
 * 2. All cells in a room must be the same color
 * 3. White cells must form a single connected path (no loops)
 * 4. No 2x2 area can be all black or all white
 * 5. Find a path from S (start) to G (goal) through white cells
 * 6. Path must pass through � marks and avoid � marks
 */
import { CellState, Direction } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Nurimaze Types
// ============================================
export var NurimazeMark;
(function (NurimazeMark) {
    NurimazeMark["START"] = "S";
    NurimazeMark["GOAL"] = "G";
    NurimazeMark["OK"] = "O";
    NurimazeMark["NG"] = "X";
})(NurimazeMark || (NurimazeMark = {}));
// ============================================
// Nurimaze Field State
// ============================================
export class NurimazeField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE=path/BLACK=wall) */
    cells;
    /** Route states - which cells are on the path */
    route;
    /** Marks (S, G, �, �) */
    marks;
    /** Horizontal walls [row][col] - wall between (row, col) and (row, col+1) */
    yokoWall;
    /** Vertical walls [row][col] - wall between (row, col) and (row+1, col) */
    tateWall;
    /** Rooms - list of position key sets */
    rooms;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.route = new Grid(height, width, () => CellState.UNKNOWN);
        this.marks = new Grid(height, width, () => null);
        this.yokoWall = Array.from({ length: height }, () => Array(width - 1).fill(false));
        this.tateWall = Array.from({ length: height - 1 }, () => Array(width).fill(false));
        this.rooms = [];
    }
    /** Set walls */
    setYokoWall(row, col, hasWall) {
        if (col < this.width - 1) {
            this.yokoWall[row][col] = hasWall;
        }
    }
    setTateWall(row, col, hasWall) {
        if (row < this.height - 1) {
            this.tateWall[row][col] = hasWall;
        }
    }
    /** Set mark */
    setMark(row, col, mark) {
        this.marks.set(row, col, mark);
        // Marks are always on white cells
        this.cells.set(row, col, CellState.WHITE);
        // S, G, � are on the route
        if (mark === NurimazeMark.START || mark === NurimazeMark.GOAL || mark === NurimazeMark.OK) {
            this.route.set(row, col, CellState.BLACK);
        }
        // � is not on the route
        if (mark === NurimazeMark.NG) {
            this.route.set(row, col, CellState.WHITE);
        }
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Get route state */
    getRoute(row, col) {
        return this.route.get(row, col);
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
    floodFillRoom(row, col, room, visited) {
        if (row < 0 || row >= this.height || col < 0 || col >= this.width)
            return;
        if (visited.get(row, col))
            return;
        visited.set(row, col, true);
        room.add(`${row},${col}`);
        // Up
        if (row > 0 && !this.tateWall[row - 1][col]) {
            this.floodFillRoom(row - 1, col, room, visited);
        }
        // Down
        if (row < this.height - 1 && !this.tateWall[row][col]) {
            this.floodFillRoom(row + 1, col, room, visited);
        }
        // Left
        if (col > 0 && !this.yokoWall[row][col - 1]) {
            this.floodFillRoom(row, col - 1, room, visited);
        }
        // Right
        if (col < this.width - 1 && !this.yokoWall[row][col]) {
            this.floodFillRoom(row, col + 1, room, visited);
        }
    }
    parsePos(key) {
        const [row, col] = key.split(',').map(Number);
        return { row, col };
    }
    // ========== Solving methods ==========
    /** All cells in a room must be the same color */
    roomSolve() {
        for (const room of this.rooms) {
            let hasBlack = false;
            let hasWhite = false;
            for (const key of room) {
                const pos = this.parsePos(key);
                const cell = this.cells.get(pos.row, pos.col);
                if (cell === CellState.BLACK) {
                    if (hasWhite)
                        return false;
                    hasBlack = true;
                }
                else if (cell === CellState.WHITE) {
                    if (hasBlack)
                        return false;
                    hasWhite = true;
                }
            }
            // Propagate to all cells in room
            if (hasBlack || hasWhite) {
                for (const key of room) {
                    const pos = this.parsePos(key);
                    if (hasBlack) {
                        this.cells.set(pos.row, pos.col, CellState.BLACK);
                    }
                    else {
                        this.cells.set(pos.row, pos.col, CellState.WHITE);
                    }
                }
            }
        }
        return true;
    }
    /** No 2x2 area can be all black or all white */
    pondSolve() {
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                const m1 = this.cells.get(row, col);
                const m2 = this.cells.get(row, col + 1);
                const m3 = this.cells.get(row + 1, col);
                const m4 = this.cells.get(row + 1, col + 1);
                // Check for all black
                if (m1 === CellState.BLACK && m2 === CellState.BLACK &&
                    m3 === CellState.BLACK && m4 === CellState.BLACK) {
                    return false;
                }
                // Check for all white
                if (m1 === CellState.WHITE && m2 === CellState.WHITE &&
                    m3 === CellState.WHITE && m4 === CellState.WHITE) {
                    return false;
                }
                // If 3 black, 4th must be white
                const blackCount = [m1, m2, m3, m4].filter(m => m === CellState.BLACK).length;
                const whiteCount = [m1, m2, m3, m4].filter(m => m === CellState.WHITE).length;
                if (blackCount === 3) {
                    if (m1 === CellState.UNKNOWN)
                        this.cells.set(row, col, CellState.WHITE);
                    if (m2 === CellState.UNKNOWN)
                        this.cells.set(row, col + 1, CellState.WHITE);
                    if (m3 === CellState.UNKNOWN)
                        this.cells.set(row + 1, col, CellState.WHITE);
                    if (m4 === CellState.UNKNOWN)
                        this.cells.set(row + 1, col + 1, CellState.WHITE);
                }
                if (whiteCount === 3) {
                    if (m1 === CellState.UNKNOWN)
                        this.cells.set(row, col, CellState.BLACK);
                    if (m2 === CellState.UNKNOWN)
                        this.cells.set(row, col + 1, CellState.BLACK);
                    if (m3 === CellState.UNKNOWN)
                        this.cells.set(row + 1, col, CellState.BLACK);
                    if (m4 === CellState.UNKNOWN)
                        this.cells.set(row + 1, col + 1, CellState.BLACK);
                }
            }
        }
        return true;
    }
    /** White cells must be connected and form no loops */
    connectSolve() {
        // Find all white cells
        const whiteCells = [];
        let typicalWhite = null;
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.WHITE) {
                    whiteCells.push({ row, col });
                    if (!typicalWhite)
                        typicalWhite = { row, col };
                }
            }
        }
        if (!typicalWhite || whiteCells.length === 0)
            return true;
        // Check for loops among white cells
        for (const start of whiteCells) {
            if (!this.loopCheck(start))
                return false;
        }
        // Check connectivity
        const connected = new Set();
        this.floodFillWhite(typicalWhite, connected, null);
        // All white cells must be connected
        for (const pos of whiteCells) {
            if (!connected.has(`${pos.row},${pos.col}`)) {
                return false;
            }
        }
        return true;
    }
    loopCheck(start) {
        const visited = new Set();
        return this.loopCheckDFS(start, visited, null);
    }
    loopCheckDFS(pos, visited, from) {
        const neighbors = [];
        if (pos.row > 0)
            neighbors.push({ pos: { row: pos.row - 1, col: pos.col }, dir: Direction.UP });
        if (pos.col < this.width - 1)
            neighbors.push({ pos: { row: pos.row, col: pos.col + 1 }, dir: Direction.RIGHT });
        if (pos.row < this.height - 1)
            neighbors.push({ pos: { row: pos.row + 1, col: pos.col }, dir: Direction.DOWN });
        if (pos.col > 0)
            neighbors.push({ pos: { row: pos.row, col: pos.col - 1 }, dir: Direction.LEFT });
        for (const { pos: next, dir } of neighbors) {
            // Skip if coming from this direction
            if (from === Direction.UP && dir === Direction.UP)
                continue;
            if (from === Direction.DOWN && dir === Direction.DOWN)
                continue;
            if (from === Direction.LEFT && dir === Direction.LEFT)
                continue;
            if (from === Direction.RIGHT && dir === Direction.RIGHT)
                continue;
            const nextKey = `${next.row},${next.col}`;
            if (this.cells.get(next.row, next.col) !== CellState.WHITE)
                continue;
            if (visited.has(nextKey))
                return false; // Loop detected
            visited.add(nextKey);
            const opposite = dir === Direction.UP ? Direction.DOWN :
                dir === Direction.DOWN ? Direction.UP :
                    dir === Direction.LEFT ? Direction.RIGHT : Direction.LEFT;
            if (!this.loopCheckDFS(next, visited, opposite))
                return false;
        }
        return true;
    }
    floodFillWhite(pos, visited, from) {
        const key = `${pos.row},${pos.col}`;
        if (visited.has(key))
            return;
        visited.add(key);
        const neighbors = [];
        if (pos.row > 0 && from !== Direction.UP) {
            neighbors.push({ pos: { row: pos.row - 1, col: pos.col }, dir: Direction.DOWN });
        }
        if (pos.col < this.width - 1 && from !== Direction.RIGHT) {
            neighbors.push({ pos: { row: pos.row, col: pos.col + 1 }, dir: Direction.LEFT });
        }
        if (pos.row < this.height - 1 && from !== Direction.DOWN) {
            neighbors.push({ pos: { row: pos.row + 1, col: pos.col }, dir: Direction.UP });
        }
        if (pos.col > 0 && from !== Direction.LEFT) {
            neighbors.push({ pos: { row: pos.row, col: pos.col - 1 }, dir: Direction.RIGHT });
        }
        for (const { pos: next, dir } of neighbors) {
            if (this.cells.get(next.row, next.col) !== CellState.BLACK) {
                this.floodFillWhite(next, visited, dir);
            }
        }
    }
    /** Route constraints - path from S to G */
    mazeSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                // Route cells must be white
                if (this.route.get(row, col) === CellState.BLACK) {
                    if (this.cells.get(row, col) === CellState.BLACK)
                        return false;
                    this.cells.set(row, col, CellState.WHITE);
                }
                // Black cells cannot be on route
                if (this.cells.get(row, col) === CellState.BLACK) {
                    if (this.route.get(row, col) === CellState.BLACK)
                        return false;
                    this.route.set(row, col, CellState.WHITE);
                }
                // For white cells, check route constraints
                if (this.cells.get(row, col) === CellState.WHITE) {
                    // Count adjacent route cells
                    let routeCount = 0;
                    let nonRouteCount = 0;
                    const unknownRoutePositions = [];
                    const neighbors = [
                        row > 0 ? { row: row - 1, col } : null,
                        col < this.width - 1 ? { row, col: col + 1 } : null,
                        row < this.height - 1 ? { row: row + 1, col } : null,
                        col > 0 ? { row, col: col - 1 } : null,
                    ].filter(Boolean);
                    for (const n of neighbors) {
                        const r = this.route.get(n.row, n.col);
                        if (r === CellState.BLACK)
                            routeCount++;
                        else if (r === CellState.WHITE)
                            nonRouteCount++;
                        else
                            unknownRoutePositions.push(n);
                    }
                    const mark = this.marks.get(row, col);
                    const isOnRoute = this.route.get(row, col) === CellState.BLACK;
                    if (isOnRoute) {
                        if (mark === NurimazeMark.START || mark === NurimazeMark.GOAL) {
                            // S/G: exactly 1 route neighbor
                            if (routeCount > 1)
                                return false;
                            if (nonRouteCount > 3)
                                return false;
                            if (routeCount === 1) {
                                for (const p of unknownRoutePositions) {
                                    this.route.set(p.row, p.col, CellState.WHITE);
                                }
                            }
                            if (nonRouteCount === 3 && unknownRoutePositions.length === 1) {
                                this.route.set(unknownRoutePositions[0].row, unknownRoutePositions[0].col, CellState.BLACK);
                            }
                        }
                        else {
                            // Regular route cell: exactly 2 route neighbors
                            if (routeCount > 2)
                                return false;
                            if (nonRouteCount > 2)
                                return false;
                            if (routeCount === 2) {
                                for (const p of unknownRoutePositions) {
                                    this.route.set(p.row, p.col, CellState.WHITE);
                                }
                            }
                            if (nonRouteCount === 2 && unknownRoutePositions.length > 0) {
                                for (const p of unknownRoutePositions) {
                                    this.route.set(p.row, p.col, CellState.BLACK);
                                }
                            }
                        }
                    }
                    else if (this.route.get(row, col) === CellState.UNKNOWN) {
                        // If 2 route neighbors, must be on route
                        if (routeCount >= 2) {
                            if (routeCount > 2)
                                return false;
                            this.route.set(row, col, CellState.BLACK);
                        }
                        // If 3+ non-route neighbors, cannot be on route
                        if (nonRouteCount > 2) {
                            this.route.set(row, col, CellState.WHITE);
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Route must be connected */
    connectRouteSolve() {
        let firstRoute = null;
        const routeCells = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.route.get(row, col) === CellState.BLACK) {
                    routeCells.push({ row, col });
                    if (!firstRoute)
                        firstRoute = { row, col };
                }
            }
        }
        if (!firstRoute || routeCells.length === 0)
            return true;
        // Flood fill from first route cell
        const connected = new Set();
        this.floodFillRoute(firstRoute, connected, null);
        // All route cells must be connected
        for (const pos of routeCells) {
            if (!connected.has(`${pos.row},${pos.col}`)) {
                return false;
            }
        }
        return true;
    }
    floodFillRoute(pos, visited, from) {
        const key = `${pos.row},${pos.col}`;
        if (visited.has(key))
            return;
        visited.add(key);
        const neighbors = [];
        if (pos.row > 0 && from !== Direction.UP) {
            neighbors.push({ pos: { row: pos.row - 1, col: pos.col }, dir: Direction.DOWN });
        }
        if (pos.col < this.width - 1 && from !== Direction.RIGHT) {
            neighbors.push({ pos: { row: pos.row, col: pos.col + 1 }, dir: Direction.LEFT });
        }
        if (pos.row < this.height - 1 && from !== Direction.DOWN) {
            neighbors.push({ pos: { row: pos.row + 1, col: pos.col }, dir: Direction.UP });
        }
        if (pos.col > 0 && from !== Direction.LEFT) {
            neighbors.push({ pos: { row: pos.row, col: pos.col - 1 }, dir: Direction.RIGHT });
        }
        for (const { pos: next, dir } of neighbors) {
            if (this.route.get(next.row, next.col) !== CellState.WHITE) {
                this.floodFillRoute(next, visited, dir);
            }
        }
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new NurimazeField(this.height, this.width);
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                cloned.cells.set(row, col, this.cells.get(row, col));
                cloned.route.set(row, col, this.route.get(row, col));
                cloned.marks.set(row, col, this.marks.get(row, col));
            }
        }
        cloned.yokoWall = this.yokoWall;
        cloned.tateWall = this.tateWall;
        cloned.rooms = this.rooms;
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const c = this.cells.get(row, col);
                const r = this.route.get(row, col);
                dump += c === CellState.BLACK ? 'B' : c === CellState.WHITE ? 'W' : '?';
                dump += r === CellState.BLACK ? 'R' : r === CellState.WHITE ? 'N' : '?';
            }
        }
        return dump;
    }
    isSolved() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.UNKNOWN)
                    return false;
                if (this.route.get(row, col) === CellState.UNKNOWN)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const before = this.getStateDump();
            if (!this.roomSolve())
                return false;
            if (!this.pondSolve())
                return false;
            if (!this.mazeSolve())
                return false;
            changed = this.getStateDump() !== before;
        }
        if (!this.connectSolve())
            return false;
        if (!this.connectRouteSolve())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const mark = this.marks.get(row, col);
                if (mark) {
                    line += mark;
                }
                else if (this.route.get(row, col) === CellState.BLACK) {
                    line += 'R';
                }
                else {
                    const c = this.cells.get(row, col);
                    line += c === CellState.BLACK ? '�' : c === CellState.WHITE ? '�' : '?';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get cells for branching - rooms first, then route */
    getBranchInfo() {
        // First check rooms with unknown cells
        for (const room of this.rooms) {
            const firstKey = room.values().next().value;
            if (firstKey === undefined)
                continue;
            const firstPos = this.parsePos(firstKey);
            if (this.cells.get(firstPos.row, firstPos.col) === CellState.UNKNOWN) {
                return { type: 'cell', row: firstPos.row, col: firstPos.col };
            }
        }
        // Then check unknown route cells
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.route.get(row, col) === CellState.UNKNOWN) {
                    return { type: 'route', row, col };
                }
            }
        }
        return null;
    }
    /** Set cell state */
    setCellState(row, col, state) {
        this.cells.set(row, col, state);
    }
    /** Set route state */
    setRouteState(row, col, state) {
        this.route.set(row, col, state);
    }
}
// ============================================
// Nurimaze Solver
// ============================================
export class NurimazeSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from pzv.jp URL format
     */
    static fromPzvUrl(url) {
        const parts = url.split('/');
        const width = parseInt(parts[parts.length - 3]);
        const height = parseInt(parts[parts.length - 2]);
        const param = parts[parts.length - 1];
        return NurimazeSolver.fromString(height, width, param);
    }
    /**
     * Create solver from pzv parameter string
     */
    static fromString(height, width, param) {
        const field = new NurimazeField(height, width);
        const ALPHABET_FROM_5 = '56789abcdefghijklmnopqrstuvwxyz';
        let readPos = 0;
        let bit = 0;
        // Parse horizontal walls
        const yokoWallCount = height * (width - 1);
        for (let cnt = 0; cnt < yokoWallCount; cnt++) {
            const mod = cnt % 5;
            if (mod === 0 && readPos < param.length) {
                bit = parseInt(param.charAt(readPos), 36);
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
        // Parse vertical walls
        const tateWallCount = (height - 1) * width;
        for (let cnt = 0; cnt < tateWallCount; cnt++) {
            const mod = cnt % 5;
            if (mod === 0 && readPos < param.length) {
                bit = parseInt(param.charAt(readPos), 36);
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
        // Parse marks
        let index = 0;
        while (readPos < param.length) {
            const ch = param.charAt(readPos);
            const interval = ALPHABET_FROM_5.indexOf(ch);
            if (interval !== -1) {
                index += interval;
                readPos++;
            }
            else {
                const row = Math.floor(index / width);
                const col = index % width;
                const val = parseInt(ch, 10);
                const marks = [
                    null,
                    NurimazeMark.START,
                    NurimazeMark.GOAL,
                    NurimazeMark.OK,
                    NurimazeMark.NG,
                ];
                if (val >= 1 && val <= 4 && row < height && col < width) {
                    field.setMark(row, col, marks[val]);
                }
                index++;
                readPos++;
            }
        }
        field.buildRooms();
        return new NurimazeSolver(field);
    }
    getBranchCandidates(state) {
        const info = state.getBranchInfo();
        if (!info)
            return [];
        if (info.type === 'cell') {
            return [
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setCellState(info.row, info.col, CellState.BLACK);
                        return cloned;
                    },
                    description: `Set (${info.row}, ${info.col}) to BLACK`,
                },
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setCellState(info.row, info.col, CellState.WHITE);
                        return cloned;
                    },
                    description: `Set (${info.row}, ${info.col}) to WHITE`,
                },
            ];
        }
        else {
            return [
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setRouteState(info.row, info.col, CellState.BLACK);
                        return cloned;
                    },
                    description: `Set route (${info.row}, ${info.col}) to ON`,
                },
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setRouteState(info.row, info.col, CellState.WHITE);
                        return cloned;
                    },
                    description: `Set route (${info.row}, ${info.col}) to OFF`,
                },
            ];
        }
    }
}
//# sourceMappingURL=nurimaze.js.map