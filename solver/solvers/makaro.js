/**
 * Makaro Solver
 *
 * Rules:
 * 1. Fill cells with numbers from 1 to N (N = room size)
 * 2. Each number appears exactly once in each room
 * 3. Arrow clues point to the largest number among adjacent cells
 * 4. Same numbers cannot be orthogonally adjacent (even across rooms)
 */
import { Grid } from '../core/field.js';
import { posKey, DIRECTIONS, adjacent } from '../core/types.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Makaro Field State
// ============================================
export class MakaroField {
    height;
    width;
    /** Number candidates for each cell */
    numbersCand;
    /** Room ID for each cell */
    roomIds;
    /** Room sizes */
    roomSizes;
    /** Arrow directions (null = no arrow, number clue) */
    arrows;
    /** Clue numbers */
    clues;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.numbersCand = new Grid(height, width, () => []);
        this.roomIds = new Grid(height, width, () => -1);
        this.roomSizes = new Map();
        this.arrows = new Grid(height, width, () => null);
        this.clues = new Grid(height, width, () => null);
    }
    /** Set room structure */
    setRooms(roomIds) {
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
    /** Set an arrow clue */
    setArrow(row, col, direction) {
        this.arrows.set(row, col, direction);
    }
    /** Set a number clue */
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
    /** Get adjacent position in a direction */
    getAdjacentInDirection(row, col, dir) {
        if (!dir)
            return null;
        const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
        const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
        const ny = row + dy;
        const nx = col + dx;
        if (ny < 0 || ny >= this.height || nx < 0 || nx >= this.width)
            return null;
        return { row: ny, col: nx };
    }
    /** Room constraint: each number once per room */
    roomSolve() {
        for (const [roomId] of this.roomSizes) {
            const cells = this.getRoomCells(roomId);
            // Naked single
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
            // Hidden single
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
    /** Arrow constraint: arrow points to the largest adjacent number */
    arrowSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const arrow = this.arrows.get(y, x);
                if (!arrow)
                    continue;
                // Get the cell the arrow points to
                const target = this.getAdjacentInDirection(y, x, arrow);
                if (!target)
                    continue;
                // Get other adjacent cells
                const otherDirs = ['up', 'right', 'down', 'left'].filter((d) => d !== arrow);
                const otherCells = [];
                for (const dir of otherDirs) {
                    const adj = this.getAdjacentInDirection(y, x, dir);
                    if (adj)
                        otherCells.push(adj);
                }
                const targetCands = this.numbersCand.get(target.row, target.col);
                // Target must be strictly larger than all other adjacent cells
                for (const other of otherCells) {
                    const otherCands = this.numbersCand.get(other.row, other.col);
                    // Filter target: must be > at least one valid value of other
                    const minOther = Math.min(...otherCands);
                    const filteredTarget = targetCands.filter((t) => t > minOther);
                    if (filteredTarget.length === 0)
                        return false;
                    this.numbersCand.set(target.row, target.col, filteredTarget);
                    // Filter other: must be < at least one valid value of target
                    const maxTarget = Math.max(...this.numbersCand.get(target.row, target.col));
                    const filteredOther = otherCands.filter((o) => o < maxTarget);
                    if (filteredOther.length === 0)
                        return false;
                    this.numbersCand.set(other.row, other.col, filteredOther);
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new MakaroField(this.height, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.numbersCand.set(y, x, [...this.numbersCand.get(y, x)]);
                cloned.roomIds.set(y, x, this.roomIds.get(y, x));
                cloned.arrows.set(y, x, this.arrows.get(y, x));
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
            if (!this.arrowSolve())
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
                const arrow = this.arrows.get(y, x);
                if (arrow) {
                    line += arrow === 'up' ? '↑' : arrow === 'down' ? '↓' : arrow === 'left' ? '←' : '→';
                }
                else if (cands.length === 0) {
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
                if (this.arrows.get(y, x))
                    continue; // Skip arrow cells
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
// Makaro Solver
// ============================================
export class MakaroSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzprv3 URL parameter */
    static fromString(height, width, param) {
        const field = new MakaroField(height, width);
        // Parse room borders and clues
        const parts = param.split('/');
        const borderPart = parts[0] || '';
        const cluePart = parts[1] || '';
        // Parse borders
        const roomIds = [];
        for (let y = 0; y < height; y++) {
            roomIds[y] = new Array(width).fill(-1);
        }
        const hBorders = [];
        for (let y = 0; y < height - 1; y++) {
            hBorders[y] = new Array(width).fill(false);
        }
        const vBorders = [];
        for (let y = 0; y < height; y++) {
            vBorders[y] = new Array(width - 1).fill(false);
        }
        let borderIndex = 0;
        const totalBorders = height * (width - 1) + (height - 1) * width;
        for (let i = 0; i < borderPart.length && borderIndex < totalBorders; i++) {
            const ch = borderPart[i];
            const code = ch.charCodeAt(0);
            if (code >= 'g'.charCodeAt(0) && code <= 'z'.charCodeAt(0)) {
                borderIndex += code - 'f'.charCodeAt(0);
            }
            else {
                if (borderIndex < height * (width - 1)) {
                    const y = Math.floor(borderIndex / (width - 1));
                    const x = borderIndex % (width - 1);
                    vBorders[y][x] = true;
                }
                else {
                    const idx = borderIndex - height * (width - 1);
                    const y = Math.floor(idx / width);
                    const x = idx % width;
                    hBorders[y][x] = true;
                }
                borderIndex++;
            }
        }
        // Flood fill rooms
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
                        if (pos.row > 0 && !hBorders[pos.row - 1][pos.col]) {
                            queue.push({ row: pos.row - 1, col: pos.col });
                        }
                        if (pos.row < height - 1 && !hBorders[pos.row][pos.col]) {
                            queue.push({ row: pos.row + 1, col: pos.col });
                        }
                        if (pos.col > 0 && !vBorders[pos.row][pos.col - 1]) {
                            queue.push({ row: pos.row, col: pos.col - 1 });
                        }
                        if (pos.col < width - 1 && !vBorders[pos.row][pos.col]) {
                            queue.push({ row: pos.row, col: pos.col + 1 });
                        }
                    }
                    nextRoomId++;
                }
            }
        }
        field.setRooms(roomIds);
        // Parse clues (numbers and arrows)
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let clueIndex = 0;
        for (let i = 0; i < cluePart.length; i++) {
            const ch = cluePart[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                clueIndex += interval + 1;
            }
            else {
                const row = Math.floor(clueIndex / width);
                const col = clueIndex % width;
                if (row < height && col < width) {
                    // Check for arrow codes: 5=up, 6=right, 7=down, 8=left
                    if (ch === '5') {
                        field.setArrow(row, col, 'up');
                    }
                    else if (ch === '6') {
                        field.setArrow(row, col, 'right');
                    }
                    else if (ch === '7') {
                        field.setArrow(row, col, 'down');
                    }
                    else if (ch === '8') {
                        field.setArrow(row, col, 'left');
                    }
                    else {
                        let num;
                        if (ch === '-') {
                            num = parseInt(cluePart[i + 1] + cluePart[i + 2], 16);
                            i += 2;
                        }
                        else if (ch === '+') {
                            num = parseInt(cluePart[i + 1] + cluePart[i + 2] + cluePart[i + 3], 16);
                            i += 3;
                        }
                        else {
                            num = parseInt(ch, 16);
                        }
                        if (!isNaN(num) && num >= 1) {
                            field.setClue(row, col, num);
                        }
                    }
                }
                clueIndex++;
            }
        }
        return new MakaroSolver(field);
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
//# sourceMappingURL=makaro.js.map