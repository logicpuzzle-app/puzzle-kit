/**
 * Cojun Solver
 *
 * Rules:
 * 1. Fill cells with numbers from 1 to N (N = room size)
 * 2. Each number appears exactly once in each room
 * 3. Same numbers cannot be orthogonally adjacent (even across rooms)
 * 4. When two cells are adjacent across a room border, the cell in the larger room has the larger number
 */
import { Grid } from '../core/field.js';
import { posKey, DIRECTIONS, adjacent } from '../core/types.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Cojun Field State
// ============================================
export class CojunField {
    height;
    width;
    /** Number candidates for each cell */
    numbersCand;
    /** Room ID for each cell */
    roomIds;
    /** Room sizes */
    roomSizes;
    /** Clue cells (initial numbers) */
    clues;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.numbersCand = new Grid(height, width, () => []);
        this.roomIds = new Grid(height, width, () => -1);
        this.roomSizes = new Map();
        this.clues = new Grid(height, width, () => null);
    }
    /** Set room structure */
    setRooms(roomIds) {
        // Count room sizes
        this.roomSizes.clear();
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const roomId = roomIds[y][x];
                this.roomIds.set(y, x, roomId);
                this.roomSizes.set(roomId, (this.roomSizes.get(roomId) || 0) + 1);
            }
        }
        // Initialize candidates based on room sizes
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const roomId = this.roomIds.get(y, x);
                const size = this.roomSizes.get(roomId) || 1;
                const cands = [];
                for (let n = 1; n <= size; n++) {
                    cands.push(n);
                }
                this.numbersCand.set(y, x, cands);
            }
        }
    }
    /** Set a clue number */
    setClue(row, col, num) {
        this.clues.set(row, col, num);
        this.numbersCand.set(row, col, [num]);
    }
    /** Get cells in the same room */
    getRoomCells(roomId) {
        const cells = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.roomIds.get(y, x) === roomId) {
                    cells.push({ row: y, col: x });
                }
            }
        }
        return cells;
    }
    /** Room constraint: each number once per room */
    roomSolve() {
        for (const [roomId] of this.roomSizes) {
            const cells = this.getRoomCells(roomId);
            // Naked single: eliminate determined numbers from other cells
            for (const cell of cells) {
                const cands = this.numbersCand.get(cell.row, cell.col);
                if (cands.length === 1) {
                    const val = cands[0];
                    for (const other of cells) {
                        if (other.row === cell.row && other.col === cell.col)
                            continue;
                        const otherCands = this.numbersCand.get(other.row, other.col);
                        const filtered = otherCands.filter((c) => c !== val);
                        if (filtered.length === 0)
                            return false;
                        this.numbersCand.set(other.row, other.col, filtered);
                    }
                }
            }
            // Hidden single: if a number can only go in one cell
            const roomSize = this.roomSizes.get(roomId) || 1;
            for (let n = 1; n <= roomSize; n++) {
                const possibleCells = cells.filter((cell) => this.numbersCand.get(cell.row, cell.col).includes(n));
                if (possibleCells.length === 0)
                    return false;
                if (possibleCells.length === 1) {
                    const cell = possibleCells[0];
                    this.numbersCand.set(cell.row, cell.col, [n]);
                }
            }
        }
        return true;
    }
    /** Adjacent constraint: same numbers cannot be adjacent */
    adjacentSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cands = this.numbersCand.get(y, x);
                if (cands.length !== 1)
                    continue;
                const val = cands[0];
                // Eliminate from adjacent cells
                for (const dir of DIRECTIONS) {
                    const adj = adjacent({ row: y, col: x }, dir);
                    if (adj.row < 0 || adj.row >= this.height || adj.col < 0 || adj.col >= this.width) {
                        continue;
                    }
                    const adjCands = this.numbersCand.get(adj.row, adj.col);
                    const filtered = adjCands.filter((c) => c !== val);
                    if (filtered.length === 0)
                        return false;
                    this.numbersCand.set(adj.row, adj.col, filtered);
                }
            }
        }
        return true;
    }
    /** Border constraint: larger room must have larger number */
    borderSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const roomId = this.roomIds.get(y, x);
                const roomSize = this.roomSizes.get(roomId) || 1;
                const cands = this.numbersCand.get(y, x);
                for (const dir of DIRECTIONS) {
                    const adj = adjacent({ row: y, col: x }, dir);
                    if (adj.row < 0 || adj.row >= this.height || adj.col < 0 || adj.col >= this.width) {
                        continue;
                    }
                    const adjRoomId = this.roomIds.get(adj.row, adj.col);
                    if (adjRoomId === roomId)
                        continue; // Same room
                    const adjRoomSize = this.roomSizes.get(adjRoomId) || 1;
                    const adjCands = this.numbersCand.get(adj.row, adj.col);
                    if (roomSize > adjRoomSize) {
                        // This cell must be larger than adjacent cell
                        const minAdj = Math.min(...adjCands);
                        const filtered = cands.filter((c) => c > minAdj);
                        if (filtered.length === 0)
                            return false;
                        this.numbersCand.set(y, x, filtered);
                        // Adjacent cell must be smaller than this cell
                        const maxThis = Math.max(...this.numbersCand.get(y, x));
                        const adjFiltered = adjCands.filter((c) => c < maxThis);
                        if (adjFiltered.length === 0)
                            return false;
                        this.numbersCand.set(adj.row, adj.col, adjFiltered);
                    }
                    else if (roomSize < adjRoomSize) {
                        // This cell must be smaller than adjacent cell
                        const maxAdj = Math.max(...adjCands);
                        const filtered = cands.filter((c) => c < maxAdj);
                        if (filtered.length === 0)
                            return false;
                        this.numbersCand.set(y, x, filtered);
                        // Adjacent cell must be larger than this cell
                        const minThis = Math.min(...this.numbersCand.get(y, x));
                        const adjFiltered = adjCands.filter((c) => c > minThis);
                        if (adjFiltered.length === 0)
                            return false;
                        this.numbersCand.set(adj.row, adj.col, adjFiltered);
                    }
                    // If same size, no constraint (but already handled by adjacent rule)
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new CojunField(this.height, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.numbersCand.set(y, x, [...this.numbersCand.get(y, x)]);
                cloned.roomIds.set(y, x, this.roomIds.get(y, x));
                cloned.clues.set(y, x, this.clues.get(y, x));
            }
        }
        cloned.roomSizes = new Map(this.roomSizes);
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                dump += this.numbersCand.get(y, x).length + ':';
            }
        }
        return dump;
    }
    isSolved() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.numbersCand.get(y, x).length !== 1)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const befStr = this.getStateDump();
            if (!this.roomSolve())
                return false;
            if (!this.adjacentSolve())
                return false;
            if (!this.borderSolve())
                return false;
            changed = this.getStateDump() !== befStr;
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let y = 0; y < this.height; y++) {
            let line = '';
            for (let x = 0; x < this.width; x++) {
                const cands = this.numbersCand.get(y, x);
                if (cands.length === 0) {
                    line += 'X';
                }
                else if (cands.length === 1) {
                    line += String(cands[0]);
                }
                else {
                    line += '?';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get branching info */
    getBranchInfo() {
        let minCount = Infinity;
        let bestPos = null;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const count = this.numbersCand.get(y, x).length;
                if (count > 1 && count < minCount) {
                    minCount = count;
                    bestPos = { row: y, col: x };
                }
            }
        }
        if (!bestPos)
            return null;
        return {
            row: bestPos.row,
            col: bestPos.col,
            candidates: this.numbersCand.get(bestPos.row, bestPos.col),
        };
    }
    /** Set cell to specific value */
    setCell(row, col, value) {
        this.numbersCand.set(row, col, [value]);
    }
}
// ============================================
// Cojun Solver
// ============================================
export class CojunSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzprv3 URL parameter */
    static fromString(height, width, param) {
        const field = new CojunField(height, width);
        // Parse room borders and numbers
        // Format: border info / number info
        const parts = param.split('/');
        const borderPart = parts[0] || '';
        const numberPart = parts[1] || '';
        // Parse borders to create rooms
        const roomIds = [];
        for (let y = 0; y < height; y++) {
            roomIds[y] = new Array(width).fill(-1);
        }
        // Horizontal borders (between rows)
        const hBorders = [];
        for (let y = 0; y < height - 1; y++) {
            hBorders[y] = new Array(width).fill(false);
        }
        // Vertical borders (between columns)
        const vBorders = [];
        for (let y = 0; y < height; y++) {
            vBorders[y] = new Array(width - 1).fill(false);
        }
        // Parse border string
        let borderIndex = 0;
        const totalBorders = height * (width - 1) + (height - 1) * width;
        for (let i = 0; i < borderPart.length && borderIndex < totalBorders; i++) {
            const ch = borderPart[i];
            const code = ch.charCodeAt(0);
            if (code >= 'g'.charCodeAt(0) && code <= 'z'.charCodeAt(0)) {
                // Skip cells
                borderIndex += code - 'f'.charCodeAt(0);
            }
            else {
                // Border present
                if (borderIndex < height * (width - 1)) {
                    // Vertical border
                    const y = Math.floor(borderIndex / (width - 1));
                    const x = borderIndex % (width - 1);
                    vBorders[y][x] = true;
                }
                else {
                    // Horizontal border
                    const idx = borderIndex - height * (width - 1);
                    const y = Math.floor(idx / width);
                    const x = idx % width;
                    hBorders[y][x] = true;
                }
                borderIndex++;
            }
        }
        // Flood fill to assign room IDs
        let nextRoomId = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (roomIds[y][x] === -1) {
                    const queue = [{ row: y, col: x }];
                    const visited = new Set();
                    while (queue.length > 0) {
                        const pos = queue.shift();
                        const key = posKey(pos);
                        if (visited.has(key))
                            continue;
                        visited.add(key);
                        roomIds[pos.row][pos.col] = nextRoomId;
                        // Check adjacent cells
                        // Up
                        if (pos.row > 0 && !hBorders[pos.row - 1][pos.col]) {
                            queue.push({ row: pos.row - 1, col: pos.col });
                        }
                        // Down
                        if (pos.row < height - 1 && !hBorders[pos.row][pos.col]) {
                            queue.push({ row: pos.row + 1, col: pos.col });
                        }
                        // Left
                        if (pos.col > 0 && !vBorders[pos.row][pos.col - 1]) {
                            queue.push({ row: pos.row, col: pos.col - 1 });
                        }
                        // Right
                        if (pos.col < width - 1 && !vBorders[pos.row][pos.col]) {
                            queue.push({ row: pos.row, col: pos.col + 1 });
                        }
                    }
                    nextRoomId++;
                }
            }
        }
        field.setRooms(roomIds);
        // Parse numbers
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let numIndex = 0;
        for (let i = 0; i < numberPart.length; i++) {
            const ch = numberPart[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                numIndex += interval + 1;
            }
            else {
                const row = Math.floor(numIndex / width);
                const col = numIndex % width;
                if (row < height && col < width) {
                    let num;
                    if (ch === '-') {
                        num = parseInt(numberPart[i + 1] + numberPart[i + 2], 16);
                        i += 2;
                    }
                    else if (ch === '+') {
                        num = parseInt(numberPart[i + 1] + numberPart[i + 2] + numberPart[i + 3], 16);
                        i += 3;
                    }
                    else {
                        num = parseInt(ch, 16);
                    }
                    if (!isNaN(num)) {
                        field.setClue(row, col, num);
                    }
                }
                numIndex++;
            }
        }
        return new CojunSolver(field);
    }
    getBranchCandidates(state) {
        const branchInfo = state.getBranchInfo();
        if (!branchInfo)
            return [];
        const { row, col, candidates } = branchInfo;
        return candidates.map((cand) => ({
            apply: (s) => {
                const cloned = s.clone();
                cloned.setCell(row, col, cand);
                return cloned;
            },
            description: `Set (${row}, ${col}) to ${cand}`,
        }));
    }
}
//# sourceMappingURL=cojun.js.map