/**
 * Mejilink Solver
 *
 * Rules:
 * 1. Draw a single continuous loop using horizontal and vertical line segments between cells
 * 2. The loop divides the grid into "rooms" (regions defined by pre-drawn walls)
 * 3. The number of walls NOT used by the loop on the perimeter of each room must equal the room's area
 * 4. The loop must form exactly one closed loop (no branches, no crossings)
 * 5. Each vertex can have 0 or 2 loop edges (to form a continuous path)
 * 6. Each row and column must have an even number of walls (loop edges)
 */
import { Direction, posKey, } from '../core/types.js';
import { BaseSolver } from '../core/solver.js';
// Wall state enum
var WallState;
(function (WallState) {
    WallState["SPACE"] = "space";
    WallState["NOT_EXISTS"] = "empty";
    WallState["EXISTS"] = "line";
})(WallState || (WallState = {}));
// ============================================
// Mejilink Field State
// ============================================
export class MejilinkField {
    height;
    width;
    /** Horizontal extra walls (loop edges between vertically adjacent cells) - height rows × (width+1) columns */
    yokoExtraWall;
    /** Vertical extra walls (loop edges between horizontally adjacent cells) - (height+1) rows × width columns */
    tateExtraWall;
    /** Horizontal room walls (pre-defined room boundaries) */
    yokoHeyaWall;
    /** Vertical room walls (pre-defined room boundaries) */
    tateHeyaWall;
    /** Room definitions - sets of positions belonging to each room */
    rooms;
    constructor(height, width, param) {
        this.height = height;
        this.width = width;
        // Initialize room walls
        this.yokoHeyaWall = Array(height).fill(0).map(() => Array(width + 1).fill(true));
        this.tateHeyaWall = Array(height + 1).fill(0).map(() => Array(width).fill(true));
        // Initialize extra walls (loop edges)
        this.yokoExtraWall = Array(height).fill(0).map(() => Array(width + 1).fill(WallState.SPACE));
        this.tateExtraWall = Array(height + 1).fill(0).map(() => Array(width).fill(WallState.SPACE));
        // Parse room walls from param string
        this.parseRoomWalls(param);
        // Build rooms based on wall structure
        this.rooms = this.buildRooms();
    }
    /** Parse the room wall structure from puzz.link format */
    parseRoomWalls(param) {
        let indexBase = 0;
        const totalInnerWalls = (this.height * (this.width - 1)) + ((this.height - 1) * this.width);
        const totalOuterWalls = (2 * this.width) + (2 * this.height);
        for (let readPos = 0; readPos < param.length; readPos++) {
            const ch = param.charAt(readPos);
            let bit;
            // Parse base36 character
            if (ch >= '0' && ch <= '9') {
                bit = ch.charCodeAt(0) - '0'.charCodeAt(0);
            }
            else if (ch >= 'a' && ch <= 'z') {
                bit = ch.charCodeAt(0) - 'a'.charCodeAt(0) + 10;
            }
            else if (ch >= 'A' && ch <= 'Z') {
                bit = ch.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
            }
            else {
                continue;
            }
            // Process 5 bits per character
            for (let i = 0; i < 5; i++) {
                if (indexBase >= totalInnerWalls + totalOuterWalls) {
                    break;
                }
                let isTate;
                let yIndex;
                let xIndex;
                if (indexBase >= totalInnerWalls) {
                    // Outer walls
                    const newIndexBase = indexBase - totalInnerWalls;
                    if (newIndexBase >= totalOuterWalls) {
                        break;
                    }
                    isTate = newIndexBase < 2 * this.width;
                    if (isTate) {
                        if (bit >= Math.pow(2, 4 - i)) {
                            bit -= Math.pow(2, 4 - i);
                            yIndex = newIndexBase < this.width ? 0 : this.height;
                            xIndex = newIndexBase % this.width;
                            this.tateHeyaWall[yIndex][xIndex] = false;
                            this.tateExtraWall[yIndex][xIndex] = WallState.NOT_EXISTS;
                        }
                    }
                    else {
                        const adjustedIndex = newIndexBase - (2 * this.width);
                        if (bit >= Math.pow(2, 4 - i)) {
                            bit -= Math.pow(2, 4 - i);
                            yIndex = adjustedIndex % this.height;
                            xIndex = adjustedIndex < this.height ? 0 : this.width;
                            this.yokoHeyaWall[yIndex][xIndex] = false;
                            this.yokoExtraWall[yIndex][xIndex] = WallState.NOT_EXISTS;
                        }
                    }
                }
                else {
                    // Inner walls
                    isTate = indexBase >= this.height * (this.width - 1);
                    yIndex = isTate ? Math.floor((indexBase - (this.height * (this.width - 1))) / this.width)
                        : Math.floor(indexBase / (this.width - 1));
                    xIndex = isTate ? (indexBase - (this.height * (this.width - 1))) % this.width
                        : indexBase % (this.width - 1);
                    if (bit >= Math.pow(2, 4 - i)) {
                        bit -= Math.pow(2, 4 - i);
                        if (isTate) {
                            this.tateHeyaWall[yIndex + 1][xIndex] = false;
                            this.tateExtraWall[yIndex + 1][xIndex] = WallState.NOT_EXISTS;
                        }
                        else {
                            this.yokoHeyaWall[yIndex][xIndex + 1] = false;
                            this.yokoExtraWall[yIndex][xIndex + 1] = WallState.NOT_EXISTS;
                        }
                    }
                }
                indexBase++;
            }
        }
    }
    /** Build room sets based on wall structure */
    buildRooms() {
        const rooms = [];
        const visited = new Set();
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const pos = { row, col };
                const key = posKey(pos);
                if (!visited.has(key)) {
                    const room = new Set();
                    if (this.fillRoom(pos, room)) {
                        rooms.push(room);
                        room.forEach(k => visited.add(k));
                    }
                }
            }
        }
        return rooms;
    }
    /** Recursively fill a room starting from pos */
    fillRoom(pos, room) {
        const key = posKey(pos);
        room.add(key);
        // Check all four directions
        const directions = [
            { dy: -1, dx: 0, wall: () => this.tateHeyaWall[pos.row][pos.col] }, // Up
            { dy: 0, dx: 1, wall: () => this.yokoHeyaWall[pos.row][pos.col + 1] }, // Right
            { dy: 1, dx: 0, wall: () => this.tateHeyaWall[pos.row + 1][pos.col] }, // Down
            { dy: 0, dx: -1, wall: () => this.yokoHeyaWall[pos.row][pos.col] }, // Left
        ];
        for (const dir of directions) {
            if (!dir.wall()) {
                const nextRow = pos.row + dir.dy;
                const nextCol = pos.col + dir.dx;
                const nextKey = posKey({ row: nextRow, col: nextCol });
                // Check bounds
                if (nextRow < 0 || nextRow >= this.height || nextCol < 0 || nextCol >= this.width) {
                    return false; // Room extends outside grid
                }
                if (!room.has(nextKey)) {
                    if (!this.fillRoom({ row: nextRow, col: nextCol }, room)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new MejilinkField(this.height, this.width, '');
        // Copy walls
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width + 1; col++) {
                cloned.yokoExtraWall[row][col] = this.yokoExtraWall[row][col];
                cloned.yokoHeyaWall[row][col] = this.yokoHeyaWall[row][col];
            }
        }
        for (let row = 0; row < this.height + 1; row++) {
            for (let col = 0; col < this.width; col++) {
                cloned.tateExtraWall[row][col] = this.tateExtraWall[row][col];
                cloned.tateHeyaWall[row][col] = this.tateHeyaWall[row][col];
            }
        }
        // Copy rooms
        cloned.rooms.length = 0;
        this.rooms.forEach(room => cloned.rooms.push(new Set(room)));
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width + 1; col++) {
                dump += this.yokoExtraWall[row][col];
            }
        }
        for (let row = 0; row < this.height + 1; row++) {
            for (let col = 0; col < this.width; col++) {
                dump += this.tateExtraWall[row][col];
            }
        }
        return dump;
    }
    isSolved() {
        // Check all walls are determined
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width + 1; col++) {
                if (this.yokoExtraWall[row][col] === WallState.SPACE)
                    return false;
            }
        }
        for (let row = 0; row < this.height + 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateExtraWall[row][col] === WallState.SPACE)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        const beforeState = this.getStateDump();
        if (!this.numberSolve())
            return false;
        if (!this.vertexSolve())
            return false;
        if (!this.evenRowColSolve())
            return false;
        if (this.getStateDump() !== beforeState) {
            return this.solveAndCheck();
        }
        else {
            if (!this.connectivitySolve())
                return false;
        }
        return true;
    }
    /** Each room's perimeter must have exactly (room area) non-loop walls */
    numberSolve() {
        for (const room of this.rooms) {
            // Collect perimeter walls
            const yokoWalls = new Set();
            const tateWalls = new Set();
            for (const key of room) {
                const [row, col] = key.split(',').map(Number);
                if (this.tateHeyaWall[row][col]) {
                    tateWalls.add(`${row},${col}`);
                }
                if (this.yokoHeyaWall[row][col + 1]) {
                    yokoWalls.add(`${row},${col + 1}`);
                }
                if (this.tateHeyaWall[row + 1][col]) {
                    tateWalls.add(`${row + 1},${col}`);
                }
                if (this.yokoHeyaWall[row][col]) {
                    yokoWalls.add(`${row},${col}`);
                }
            }
            let existsCount = 0;
            let notExistsCount = 0;
            for (const key of tateWalls) {
                const [row, col] = key.split(',').map(Number);
                const wall = this.tateExtraWall[row][col];
                if (wall === WallState.EXISTS)
                    existsCount++;
                else if (wall === WallState.NOT_EXISTS)
                    notExistsCount++;
            }
            for (const key of yokoWalls) {
                const [row, col] = key.split(',').map(Number);
                const wall = this.yokoExtraWall[row][col];
                if (wall === WallState.EXISTS)
                    existsCount++;
                else if (wall === WallState.NOT_EXISTS)
                    notExistsCount++;
            }
            const totalWalls = tateWalls.size + yokoWalls.size;
            const roomSize = room.size;
            // Too many non-loop walls or too many loop walls
            if (notExistsCount > roomSize || existsCount > (totalWalls - roomSize)) {
                return false;
            }
            // If we have exactly roomSize non-loop walls, mark rest as loop walls
            if (notExistsCount === roomSize) {
                for (const key of tateWalls) {
                    const [row, col] = key.split(',').map(Number);
                    if (this.tateExtraWall[row][col] === WallState.SPACE) {
                        this.tateExtraWall[row][col] = WallState.EXISTS;
                    }
                }
                for (const key of yokoWalls) {
                    const [row, col] = key.split(',').map(Number);
                    if (this.yokoExtraWall[row][col] === WallState.SPACE) {
                        this.yokoExtraWall[row][col] = WallState.EXISTS;
                    }
                }
            }
            // If we have exactly (totalWalls - roomSize) loop walls, mark rest as non-loop
            if (existsCount === (totalWalls - roomSize)) {
                for (const key of tateWalls) {
                    const [row, col] = key.split(',').map(Number);
                    if (this.tateExtraWall[row][col] === WallState.SPACE) {
                        this.tateExtraWall[row][col] = WallState.NOT_EXISTS;
                    }
                }
                for (const key of yokoWalls) {
                    const [row, col] = key.split(',').map(Number);
                    if (this.yokoExtraWall[row][col] === WallState.SPACE) {
                        this.yokoExtraWall[row][col] = WallState.NOT_EXISTS;
                    }
                }
            }
        }
        return true;
    }
    /** Each vertex must have 0 or 2 loop edges */
    vertexSolve() {
        for (let row = 0; row <= this.height; row++) {
            for (let col = 0; col <= this.width; col++) {
                let existsCount = 0;
                let notExistsCount = 0;
                const walls = [];
                // Up
                if (row > 0 && col < this.width) {
                    const state = this.yokoExtraWall[row - 1][col];
                    walls.push({
                        state,
                        setExists: () => { this.yokoExtraWall[row - 1][col] = WallState.EXISTS; },
                        setNotExists: () => { this.yokoExtraWall[row - 1][col] = WallState.NOT_EXISTS; }
                    });
                }
                else {
                    walls.push({ state: WallState.NOT_EXISTS, setExists: () => { }, setNotExists: () => { } });
                }
                // Down
                if (row < this.height && col < this.width) {
                    const state = this.yokoExtraWall[row][col];
                    walls.push({
                        state,
                        setExists: () => { this.yokoExtraWall[row][col] = WallState.EXISTS; },
                        setNotExists: () => { this.yokoExtraWall[row][col] = WallState.NOT_EXISTS; }
                    });
                }
                else {
                    walls.push({ state: WallState.NOT_EXISTS, setExists: () => { }, setNotExists: () => { } });
                }
                // Right
                if (col < this.width && row < this.height) {
                    const state = this.tateExtraWall[row][col];
                    walls.push({
                        state,
                        setExists: () => { this.tateExtraWall[row][col] = WallState.EXISTS; },
                        setNotExists: () => { this.tateExtraWall[row][col] = WallState.NOT_EXISTS; }
                    });
                }
                else {
                    walls.push({ state: WallState.NOT_EXISTS, setExists: () => { }, setNotExists: () => { } });
                }
                // Left
                if (col > 0 && row < this.height) {
                    const state = this.tateExtraWall[row][col - 1];
                    walls.push({
                        state,
                        setExists: () => { this.tateExtraWall[row][col - 1] = WallState.EXISTS; },
                        setNotExists: () => { this.tateExtraWall[row][col - 1] = WallState.NOT_EXISTS; }
                    });
                }
                else {
                    walls.push({ state: WallState.NOT_EXISTS, setExists: () => { }, setNotExists: () => { } });
                }
                // Count states
                for (const wall of walls) {
                    if (wall.state === WallState.EXISTS)
                        existsCount++;
                    else if (wall.state === WallState.NOT_EXISTS)
                        notExistsCount++;
                }
                // More than 2 edges or exactly 1 edge (dead end)
                if (existsCount > 2 || (existsCount === 1 && notExistsCount === 3)) {
                    return false;
                }
                // If 2 edges exist, mark remaining as non-edges
                if (existsCount === 2) {
                    for (const wall of walls) {
                        if (wall.state === WallState.SPACE) {
                            wall.setNotExists();
                        }
                    }
                }
                // If 3 non-edges, mark remaining as non-edge (0 edges total)
                if (notExistsCount === 3) {
                    for (const wall of walls) {
                        if (wall.state === WallState.SPACE) {
                            wall.setNotExists();
                        }
                    }
                }
                // If 1 edge and 2 non-edges, mark remaining as edge (2 edges total)
                if (existsCount === 1 && notExistsCount === 2) {
                    for (const wall of walls) {
                        if (wall.state === WallState.SPACE) {
                            wall.setExists();
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Each row and column must have an even number of loop edges */
    evenRowColSolve() {
        // Check horizontal walls (yokoExtraWall)
        for (let row = 0; row < this.height; row++) {
            let existsCount = 0;
            let hasSpace = false;
            for (let col = 0; col < this.width + 1; col++) {
                if (this.yokoExtraWall[row][col] === WallState.SPACE) {
                    hasSpace = true;
                    break;
                }
                else if (this.yokoExtraWall[row][col] === WallState.EXISTS) {
                    existsCount++;
                }
            }
            if (!hasSpace && existsCount % 2 !== 0) {
                return false;
            }
        }
        // Check vertical walls (tateExtraWall)
        for (let col = 0; col < this.width; col++) {
            let existsCount = 0;
            let hasSpace = false;
            for (let row = 0; row < this.height + 1; row++) {
                if (this.tateExtraWall[row][col] === WallState.SPACE) {
                    hasSpace = true;
                    break;
                }
                else if (this.tateExtraWall[row][col] === WallState.EXISTS) {
                    existsCount++;
                }
            }
            if (!hasSpace && existsCount % 2 !== 0) {
                return false;
            }
        }
        return true;
    }
    /** Check that all loop walls form a single connected component */
    connectivitySolve() {
        const yokoVisited = new Set();
        const tateVisited = new Set();
        // Find first EXISTS wall
        let startRow = -1;
        let startCol = -1;
        let startIsYoko = false;
        outer: for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width + 1; col++) {
                if (this.yokoExtraWall[row][col] === WallState.EXISTS) {
                    startRow = row;
                    startCol = col;
                    startIsYoko = true;
                    break outer;
                }
            }
        }
        if (startRow === -1) {
            outer2: for (let row = 0; row < this.height + 1; row++) {
                for (let col = 0; col < this.width; col++) {
                    if (this.tateExtraWall[row][col] === WallState.EXISTS) {
                        startRow = row;
                        startCol = col;
                        startIsYoko = false;
                        break outer2;
                    }
                }
            }
        }
        if (startRow === -1) {
            return true; // No EXISTS walls yet, that's okay
        }
        // DFS to mark all connected walls
        this.markConnectedWalls(startRow, startCol, startIsYoko, yokoVisited, tateVisited);
        // Check if all EXISTS walls are connected
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width + 1; col++) {
                if (this.yokoExtraWall[row][col] === WallState.EXISTS) {
                    if (!yokoVisited.has(`${row},${col}`)) {
                        return false;
                    }
                }
            }
        }
        for (let row = 0; row < this.height + 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateExtraWall[row][col] === WallState.EXISTS) {
                    if (!tateVisited.has(`${row},${col}`)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    /** DFS to mark all walls connected to (row, col) */
    markConnectedWalls(row, col, isYoko, yokoVisited, tateVisited) {
        const key = `${row},${col}`;
        if (isYoko) {
            if (yokoVisited.has(key))
                return;
            yokoVisited.add(key);
            // Connect to adjacent walls via vertices
            // A horizontal wall at (row, col) connects vertices at (row, col) and (row+1, col)
            this.connectFromVertex(row, col, Direction.UP, yokoVisited, tateVisited);
            this.connectFromVertex(row + 1, col, Direction.DOWN, yokoVisited, tateVisited);
        }
        else {
            if (tateVisited.has(key))
                return;
            tateVisited.add(key);
            // A vertical wall at (row, col) connects vertices at (row, col) and (row, col+1)
            this.connectFromVertex(row, col, Direction.LEFT, yokoVisited, tateVisited);
            this.connectFromVertex(row, col + 1, Direction.RIGHT, yokoVisited, tateVisited);
        }
    }
    /** Connect from a vertex in all directions */
    connectFromVertex(row, col, from, yokoVisited, tateVisited) {
        // Check all 4 edges at this vertex
        if (from !== Direction.UP && row > 0 && col < this.width) {
            const state = this.yokoExtraWall[row - 1][col];
            if (state !== WallState.NOT_EXISTS && !yokoVisited.has(`${row - 1},${col}`)) {
                this.markConnectedWalls(row - 1, col, true, yokoVisited, tateVisited);
            }
        }
        if (from !== Direction.DOWN && row <= this.height && col < this.width) {
            const state = this.yokoExtraWall[row][col];
            if (state !== WallState.NOT_EXISTS && !yokoVisited.has(`${row},${col}`)) {
                this.markConnectedWalls(row, col, true, yokoVisited, tateVisited);
            }
        }
        if (from !== Direction.RIGHT && col < this.width && row <= this.height) {
            const state = this.tateExtraWall[row][col];
            if (state !== WallState.NOT_EXISTS && !tateVisited.has(`${row},${col}`)) {
                this.markConnectedWalls(row, col, false, yokoVisited, tateVisited);
            }
        }
        if (from !== Direction.LEFT && col > 0 && row <= this.height) {
            const state = this.tateExtraWall[row][col - 1];
            if (state !== WallState.NOT_EXISTS && !tateVisited.has(`${row},${col - 1}`)) {
                this.markConnectedWalls(row, col - 1, false, yokoVisited, tateVisited);
            }
        }
    }
    toString() {
        const lines = [];
        for (let row = 0; row <= this.height; row++) {
            // Vertex line
            let vertexLine = '□';
            for (let col = 0; col < this.width; col++) {
                const tateWall = this.tateExtraWall[row][col];
                if (tateWall === WallState.SPACE) {
                    vertexLine += this.tateHeyaWall[row][col] ? '┼' : ' ';
                }
                else {
                    vertexLine += tateWall === WallState.EXISTS ? '━' : ' ';
                }
                vertexLine += '□';
            }
            lines.push(vertexLine);
            // Cell line
            if (row < this.height) {
                let cellLine = '';
                for (let col = 0; col <= this.width; col++) {
                    const yokoWall = this.yokoExtraWall[row][col];
                    if (yokoWall === WallState.SPACE) {
                        cellLine += this.yokoHeyaWall[row][col] ? '┼' : ' ';
                    }
                    else {
                        cellLine += yokoWall === WallState.EXISTS ? '┃' : ' ';
                    }
                    if (col < this.width) {
                        cellLine += '　';
                    }
                }
                lines.push(cellLine);
            }
        }
        return lines.join('\n');
    }
    /** Get unknown walls for branching */
    getUnknownWalls() {
        const unknowns = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width + 1; col++) {
                if (this.yokoExtraWall[row][col] === WallState.SPACE) {
                    unknowns.push({ type: 'h', row, col });
                }
            }
        }
        for (let row = 0; row < this.height + 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateExtraWall[row][col] === WallState.SPACE) {
                    unknowns.push({ type: 'v', row, col });
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Mejilink Solver
// ============================================
export class MejilinkSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from puzz.link URL parameters */
    static fromString(height, width, param) {
        const field = new MejilinkField(height, width, param);
        return new MejilinkSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownWalls();
        if (unknowns.length === 0)
            return [];
        // Pick first unknown wall
        const wall = unknowns[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (wall.type === 'h') {
                        cloned.yokoExtraWall[wall.row][wall.col] = WallState.EXISTS;
                    }
                    else {
                        cloned.tateExtraWall[wall.row][wall.col] = WallState.EXISTS;
                    }
                    return cloned;
                },
                description: `Set ${wall.type === 'h' ? 'horizontal' : 'vertical'} wall at (${wall.row}, ${wall.col}) to EXISTS`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (wall.type === 'h') {
                        cloned.yokoExtraWall[wall.row][wall.col] = WallState.NOT_EXISTS;
                    }
                    else {
                        cloned.tateExtraWall[wall.row][wall.col] = WallState.NOT_EXISTS;
                    }
                    return cloned;
                },
                description: `Set ${wall.type === 'h' ? 'horizontal' : 'vertical'} wall at (${wall.row}, ${wall.col}) to NOT_EXISTS`,
            },
        ];
    }
}
//# sourceMappingURL=mejilink.js.map