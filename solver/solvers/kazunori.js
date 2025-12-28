/**
 * Kazunori Solver
 *
 * Rules:
 * 1. The grid is divided into rooms
 * 2. Each room contains numbers from 1 to half the room size, with each number appearing exactly twice
 * 3. Numbers on walls indicate the sum of numbers in the two cells adjacent to that wall
 * 4. Identical numbers in a room must be placed in an "L" or "I" shape (orthogonally adjacent to each other)
 * 5. The same number cannot form a 2x2 block
 */
import { posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Kazunori Field State
// ============================================
export class KazunoriField {
    height;
    width;
    /** Number candidates for each cell */
    numbersCand;
    /** Horizontal walls (between col and col+1) */
    yokoWall;
    /** Vertical walls (between row and row+1) */
    tateWall;
    /** Numbers on horizontal walls */
    yokoWallNum;
    /** Numbers on vertical walls */
    tateWallNum;
    /** Rooms (list of position sets) */
    rooms;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.numbersCand = new Grid(height, width, () => new Set());
        this.yokoWall = new Grid(height, width - 1, () => false);
        this.tateWall = new Grid(height - 1, width, () => false);
        this.yokoWallNum = new Grid(height, width - 1, () => 0);
        this.tateWallNum = new Grid(height - 1, width, () => 0);
        this.rooms = [];
    }
    /** Initialize field from parameter string */
    static fromParam(height, width, param) {
        const field = new KazunoriField(height, width);
        let readPos = 0;
        // Parse horizontal walls
        for (let cnt = 0; cnt < height * (width - 1); cnt++) {
            const mod = cnt % 5;
            let bit;
            if (mod === 0) {
                bit = parseInt(param.charAt(readPos), 36);
                readPos++;
            }
            else {
                bit = parseInt(param.charAt(readPos - 1), 36);
            }
            if (mod === 4 || cnt === height * (width - 1) - 1) {
                const positions = [];
                for (let i = 0; i <= mod; i++) {
                    positions.push(cnt - mod + i);
                }
                for (let i = 0; i < positions.length; i++) {
                    const pos = positions[i];
                    const row = Math.floor(pos / (width - 1));
                    const col = pos % (width - 1);
                    const shift = 4 - i;
                    field.yokoWall.set(row, col, ((bit >> shift) & 1) === 1);
                }
            }
        }
        // Parse vertical walls
        for (let cnt = 0; cnt < (height - 1) * width; cnt++) {
            const mod = cnt % 5;
            let bit;
            if (mod === 0) {
                bit = parseInt(param.charAt(readPos), 36);
                readPos++;
            }
            else {
                bit = parseInt(param.charAt(readPos - 1), 36);
            }
            if (mod === 4 || cnt === (height - 1) * width - 1) {
                const positions = [];
                for (let i = 0; i <= mod; i++) {
                    positions.push(cnt - mod + i);
                }
                for (let i = 0; i < positions.length; i++) {
                    const pos = positions[i];
                    const row = Math.floor(pos / width);
                    const col = pos % width;
                    const shift = 4 - i;
                    field.tateWall.set(row, col, ((bit >> shift) & 1) === 1);
                }
            }
        }
        // Build rooms from walls
        field.buildRooms();
        // Parse wall numbers
        const alphabetFromG = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        for (let i = readPos; i < param.length; i++) {
            const ch = param.charAt(i);
            const interval = alphabetFromG.indexOf(ch);
            if (interval !== -1) {
                index = index + interval + 1;
            }
            else {
                let num = undefined;
                if (ch === '.') {
                    // Empty, just increment index
                }
                else if (ch === '-') {
                    // 16-255: two hex digits
                    num = parseInt(param.substring(i + 1, i + 3), 16);
                    i += 2;
                }
                else if (ch === '+') {
                    // 256-999: three hex digits
                    num = parseInt(param.substring(i + 1, i + 4), 16);
                    i += 3;
                }
                else {
                    // 0-15: single hex digit
                    num = parseInt(ch, 16);
                }
                if (num !== undefined) {
                    if (index < height * (width - 1)) {
                        // Horizontal wall
                        const row = Math.floor(index / (width - 1));
                        const col = index % (width - 1);
                        field.yokoWallNum.set(row, col, num);
                    }
                    else {
                        // Vertical wall
                        const vIndex = index - height * (width - 1);
                        const row = Math.floor(vIndex / width);
                        const col = vIndex % width;
                        field.tateWallNum.set(row, col, num);
                    }
                }
                index++;
            }
        }
        // Initialize number candidates based on room sizes
        for (const room of field.rooms) {
            const roomSize = room.size;
            const maxNum = Math.floor(roomSize / 2);
            for (const posStr of room) {
                const [row, col] = posStr.split(',').map(Number);
                const cands = field.numbersCand.get(row, col);
                for (let num = 1; num <= maxNum; num++) {
                    cands.add(num);
                }
            }
        }
        return field;
    }
    /** Build rooms using flood fill */
    buildRooms() {
        const visited = new Grid(this.height, this.width, () => false);
        this.rooms = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (visited.get(row, col))
                    continue;
                const room = new Set();
                this.floodFillRoom({ row, col }, room, visited);
                this.rooms.push(room);
            }
        }
    }
    /** Flood fill to find connected cells without walls between them */
    floodFillRoom(pos, room, visited) {
        const key = posKey(pos);
        if (room.has(key))
            return;
        room.add(key);
        visited.set(pos.row, pos.col, true);
        const { row, col } = pos;
        // Up
        if (row > 0 && !this.tateWall.get(row - 1, col)) {
            this.floodFillRoom({ row: row - 1, col }, room, visited);
        }
        // Right
        if (col < this.width - 1 && !this.yokoWall.get(row, col)) {
            this.floodFillRoom({ row, col: col + 1 }, room, visited);
        }
        // Down
        if (row < this.height - 1 && !this.tateWall.get(row, col)) {
            this.floodFillRoom({ row: row + 1, col }, room, visited);
        }
        // Left
        if (col > 0 && !this.yokoWall.get(row, col - 1)) {
            this.floodFillRoom({ row, col: col - 1 }, room, visited);
        }
    }
    /** Get number candidates at position */
    getCandidates(row, col) {
        return this.numbersCand.get(row, col);
    }
    /** Check if position has single candidate */
    isSingle(row, col) {
        return this.numbersCand.get(row, col).size === 1;
    }
    /** Get single number value */
    getNumber(row, col) {
        const cands = this.numbersCand.get(row, col);
        return cands.size === 1 ? Array.from(cands)[0] : null;
    }
    /** Set cell to specific number */
    setNumber(row, col, num) {
        const cands = this.numbersCand.get(row, col);
        cands.clear();
        cands.add(num);
    }
    /** Remove candidate from cell */
    removeCandidate(row, col, num) {
        this.numbersCand.get(row, col).delete(num);
    }
    // ========== Constraint solving ==========
    /**
     * Room constraint: Each number appears exactly twice in its room
     */
    roomSolve() {
        for (const room of this.rooms) {
            const roomSize = room.size;
            const maxNum = Math.floor(roomSize / 2);
            for (let candNum = 1; candNum <= maxNum; candNum++) {
                let fixedCount = 0;
                let possibleCount = 0;
                const possiblePositions = [];
                for (const posStr of room) {
                    const [row, col] = posStr.split(',').map(Number);
                    const cands = this.numbersCand.get(row, col);
                    if (cands.has(candNum)) {
                        if (cands.size === 1) {
                            fixedCount++;
                        }
                        else {
                            possibleCount++;
                            possiblePositions.push({ row, col });
                        }
                    }
                }
                // Check validity
                if (fixedCount + possibleCount < 2) {
                    return false; // Not enough cells for this number
                }
                if (fixedCount > 2) {
                    return false; // Too many of this number
                }
                // If already have 2 fixed, remove from other cells
                if (fixedCount === 2) {
                    for (const pos of possiblePositions) {
                        this.removeCandidate(pos.row, pos.col, candNum);
                    }
                }
                // If need exactly as many as available, fix them all
                const needed = 2 - fixedCount;
                if (possibleCount === needed && needed > 0) {
                    for (const pos of possiblePositions) {
                        this.setNumber(pos.row, pos.col, candNum);
                    }
                }
            }
        }
        return true;
    }
    /**
     * Wall number constraint: Adjacent cells must sum to wall number
     */
    wallSumSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                // Check up wall
                if (row > 0) {
                    const wallNum = this.tateWallNum.get(row - 1, col);
                    if (wallNum !== 0) {
                        if (!this.checkWallSum(row, col, row - 1, col, wallNum)) {
                            return false;
                        }
                    }
                }
                // Check right wall
                if (col < this.width - 1) {
                    const wallNum = this.yokoWallNum.get(row, col);
                    if (wallNum !== 0) {
                        if (!this.checkWallSum(row, col, row, col + 1, wallNum)) {
                            return false;
                        }
                    }
                }
                // Check down wall
                if (row < this.height - 1) {
                    const wallNum = this.tateWallNum.get(row, col);
                    if (wallNum !== 0) {
                        if (!this.checkWallSum(row, col, row + 1, col, wallNum)) {
                            return false;
                        }
                    }
                }
                // Check left wall
                if (col > 0) {
                    const wallNum = this.yokoWallNum.get(row, col - 1);
                    if (wallNum !== 0) {
                        if (!this.checkWallSum(row, col, row, col - 1, wallNum)) {
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Check if two cells can sum to target */
    checkWallSum(row1, col1, row2, col2, target) {
        const cands1 = this.numbersCand.get(row1, col1);
        const cands2 = this.numbersCand.get(row2, col2);
        let foundValid = false;
        for (const n1 of cands1) {
            for (const n2 of cands2) {
                if (n1 + n2 === target) {
                    foundValid = true;
                    break;
                }
            }
            if (foundValid)
                break;
        }
        return foundValid;
    }
    /**
     * Nori constraint: Same numbers must be adjacent (form I or L shape)
     */
    noriSolve() {
        for (const room of this.rooms) {
            for (const posStr of room) {
                const [row, col] = posStr.split(',').map(Number);
                const cands = this.numbersCand.get(row, col);
                if (cands.size === 1) {
                    const targetNum = Array.from(cands)[0];
                    let fixedCount = 0;
                    let possibleCount = 0;
                    // Check adjacent cells in same room
                    const adjacents = [
                        { row: row - 1, col },
                        { row, col: col + 1 },
                        { row: row + 1, col },
                        { row, col: col - 1 },
                    ];
                    for (const adj of adjacents) {
                        if (!this.inBounds(adj.row, adj.col))
                            continue;
                        if (!this.inSameRoom(row, col, adj.row, adj.col))
                            continue;
                        const adjCands = this.numbersCand.get(adj.row, adj.col);
                        if (adjCands.has(targetNum)) {
                            if (adjCands.size === 1) {
                                fixedCount++;
                            }
                            else {
                                possibleCount++;
                            }
                        }
                    }
                    // Must have exactly one adjacent same number
                    if (fixedCount > 1) {
                        return false; // Too many adjacent
                    }
                    if (fixedCount === 0 && possibleCount === 0) {
                        return false; // No adjacent possible
                    }
                }
            }
        }
        return true;
    }
    /**
     * Pond constraint: No 2x2 block of same number
     */
    pondSolve() {
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                const cand1 = this.numbersCand.get(row, col);
                const cand2 = this.numbersCand.get(row, col + 1);
                const cand3 = this.numbersCand.get(row + 1, col);
                const cand4 = this.numbersCand.get(row + 1, col + 1);
                if (cand1.size === 1 && cand2.size === 1 && cand3.size === 1 && cand4.size === 1) {
                    const num1 = Array.from(cand1)[0];
                    const num2 = Array.from(cand2)[0];
                    const num3 = Array.from(cand3)[0];
                    const num4 = Array.from(cand4)[0];
                    if (num1 === num2 && num1 === num3 && num1 === num4) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    /** Check if position is in bounds */
    inBounds(row, col) {
        return row >= 0 && row < this.height && col >= 0 && col < this.width;
    }
    /** Check if two positions are in the same room */
    inSameRoom(row1, col1, row2, col2) {
        const key1 = posKey({ row: row1, col: col1 });
        const key2 = posKey({ row: row2, col: col2 });
        for (const room of this.rooms) {
            if (room.has(key1) && room.has(key2)) {
                return true;
            }
        }
        return false;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new KazunoriField(this.height, this.width);
        // Deep copy number candidates
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cands = this.numbersCand.get(row, col);
                cloned.numbersCand.set(row, col, new Set(cands));
            }
        }
        // Shallow copy walls and numbers (immutable)
        cloned.yokoWall = this.yokoWall;
        cloned.tateWall = this.tateWall;
        cloned.yokoWallNum = this.yokoWallNum;
        cloned.tateWallNum = this.tateWallNum;
        cloned.rooms = this.rooms;
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                dump += this.numbersCand.get(row, col).size;
            }
        }
        return dump;
    }
    isSolved() {
        // All cells must have exactly one candidate
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.numbersCand.get(row, col).size !== 1) {
                    return false;
                }
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
            if (!this.wallSumSolve())
                return false;
            if (!this.noriSolve())
                return false;
            if (!this.pondSolve())
                return false;
            changed = this.getStateDump() !== beforeDump;
        }
        return true;
    }
    toString() {
        const lines = [];
        const fullNums = '０１２３４５６７８９';
        // Top border
        for (let i = 0; i < this.width * 2 + 1; i++) {
            lines.push('');
        }
        lines[0] = '□'.repeat(this.width * 2 + 1);
        let lineIdx = 1;
        for (let row = 0; row < this.height; row++) {
            let cellLine = '□';
            for (let col = 0; col < this.width; col++) {
                const cands = this.numbersCand.get(row, col);
                if (cands.size === 0) {
                    cellLine += '×';
                }
                else if (cands.size === 1) {
                    const num = Array.from(cands)[0];
                    if (num === 0) {
                        cellLine += '・';
                    }
                    else if (num < 10) {
                        cellLine += fullNums[num];
                    }
                    else {
                        cellLine += num.toString();
                    }
                }
                else if (cands.size === 2) {
                    const nums = Array.from(cands).sort((a, b) => a - b);
                    cellLine += nums[0].toString() + nums[1].toString();
                }
                else {
                    cellLine += '　';
                }
                if (col < this.width - 1) {
                    const wallNum = this.yokoWallNum.get(row, col);
                    if (wallNum !== 0) {
                        if (wallNum < 10) {
                            cellLine += fullNums[wallNum];
                        }
                        else {
                            cellLine += wallNum.toString();
                        }
                    }
                    else {
                        cellLine += this.yokoWall.get(row, col) ? '□' : '　';
                    }
                }
            }
            cellLine += '□';
            lines[lineIdx++] = cellLine;
            // Horizontal walls between rows
            if (row < this.height - 1) {
                let wallLine = '□';
                for (let col = 0; col < this.width; col++) {
                    const wallNum = this.tateWallNum.get(row, col);
                    if (wallNum !== 0) {
                        if (wallNum < 10) {
                            wallLine += fullNums[wallNum];
                        }
                        else {
                            wallLine += wallNum.toString();
                        }
                    }
                    else {
                        wallLine += this.tateWall.get(row, col) ? '□' : '　';
                    }
                    if (col < this.width - 1) {
                        wallLine += '□';
                    }
                }
                wallLine += '□';
                lines[lineIdx++] = wallLine;
            }
        }
        // Bottom border
        lines[lineIdx] = '□'.repeat(this.width * 2 + 1);
        return lines.join('\n');
    }
    /** Get cells with multiple candidates for branching */
    getMultiCandidateCells() {
        const cells = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cands = this.numbersCand.get(row, col);
                if (cands.size > 1) {
                    cells.push({ row, col, count: cands.size });
                }
            }
        }
        // Sort by candidate count (fewer candidates first)
        cells.sort((a, b) => a.count - b.count);
        return cells;
    }
}
// ============================================
// Kazunori Solver
// ============================================
export class KazunoriSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from parameter string
     * @param height Grid height
     * @param width Grid width
     * @param param Encoded parameter string
     */
    static fromParam(height, width, param) {
        const field = KazunoriField.fromParam(height, width, param);
        return new KazunoriSolver(field);
    }
    getBranchCandidates(state) {
        const cells = state.getMultiCandidateCells();
        if (cells.length === 0)
            return [];
        // Pick cell with fewest candidates
        const cell = cells[0];
        const candidates = Array.from(state.getCandidates(cell.row, cell.col));
        return candidates.map(num => ({
            apply: (s) => {
                const cloned = s.clone();
                cloned.setNumber(cell.row, cell.col, num);
                return cloned;
            },
            description: `Set (${cell.row}, ${cell.col}) to ${num}`,
        }));
    }
}
//# sourceMappingURL=kazunori.js.map