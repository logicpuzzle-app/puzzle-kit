/**
 * Nurimisaki Solver
 *
 * Rules:
 * 1. Shade some cells black
 * 2. Cape cells (misaki) are white cells with exactly 3 adjacent black cells
 * 3. Non-cape white cells must have at most 2 adjacent black cells
 * 4. No 2x2 area can be all black or all white
 * 5. All non-cape white cells must be connected
 * 6. A number on a cape indicates the total cells extending in the single
 *    white direction (including the cape itself)
 */
import { CellState, DIRECTIONS, adjacent, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Nurimisaki Field State
// ============================================
export class NurimisakiField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    cells;
    /** Whether the cell is a cape (misaki) */
    misaki;
    /** Numbers on cape cells (null = no number) */
    numbers;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.misaki = new Grid(height, width, () => false);
        this.numbers = new Grid(height, width, () => null);
    }
    /** Set a cape cell with optional number */
    setCape(row, col, num) {
        this.misaki.set(row, col, true);
        this.numbers.set(row, col, num);
        this.cells.set(row, col, CellState.WHITE);
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell to black */
    setBlack(row, col) {
        if (!this.misaki.get(row, col)) {
            this.cells.set(row, col, CellState.BLACK);
        }
    }
    /** Set cell to white */
    setWhite(row, col) {
        this.cells.set(row, col, CellState.WHITE);
    }
    // ========== Helper methods ==========
    /** Count adjacent cells with a specific state (including boundary as black) */
    countAdjacent(row, col, state) {
        let count = 0;
        for (const dir of DIRECTIONS) {
            const adj = adjacent({ row, col }, dir);
            if (!this.cells.inBounds(adj)) {
                if (state === CellState.BLACK)
                    count++;
            }
            else if (this.cells.get(adj) === state) {
                count++;
            }
        }
        return count;
    }
    // ========== Constraint checking ==========
    /**
     * Number constraint: check the line extends from cape
     */
    numberSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const num = this.numbers.get(y, x);
                if (num === null)
                    continue;
                // Count how far we can extend in each direction
                const directions = [
                    { dy: -1, dx: 0 }, // up
                    { dy: 0, dx: 1 }, // right
                    { dy: 1, dx: 0 }, // down
                    { dy: 0, dx: -1 }, // left
                ];
                let totalSpace = 1; // Include the cape itself
                let totalWhite = 1;
                const directionCounts = [];
                for (const { dy, dx } of directions) {
                    let spaceCnt = 0;
                    let whiteCnt = 0;
                    let ty = y + dy;
                    let tx = x + dx;
                    while (ty >= 0 && ty < this.height && tx >= 0 && tx < this.width) {
                        const state = this.cells.get(ty, tx);
                        if (state === CellState.BLACK)
                            break;
                        spaceCnt++;
                        if (state === CellState.WHITE)
                            whiteCnt++;
                        ty += dy;
                        tx += dx;
                    }
                    directionCounts.push({ space: spaceCnt, white: whiteCnt });
                    totalSpace += spaceCnt;
                    totalWhite += whiteCnt;
                }
                // Check if we can still reach the required count
                if (totalSpace < num) {
                    return false;
                }
                // Check if we've exceeded the count
                if (totalWhite > num) {
                    return false;
                }
                // If a direction is the only way to reach target, extend it
                for (let i = 0; i < 4; i++) {
                    const { dy, dx } = directions[i];
                    const otherSpace = 1 +
                        directionCounts.filter((_, j) => j !== i).reduce((a, b) => a + b.space, 0);
                    const fixedWhite = num - otherSpace;
                    if (fixedWhite > 0) {
                        // Must extend this direction by fixedWhite cells
                        let ty = y + dy;
                        let tx = x + dx;
                        for (let cnt = 0; cnt < fixedWhite && ty >= 0 && ty < this.height && tx >= 0 && tx < this.width; cnt++) {
                            if (this.cells.get(ty, tx) === CellState.UNKNOWN) {
                                this.setWhite(ty, tx);
                            }
                            ty += dy;
                            tx += dx;
                        }
                    }
                }
                // If white count equals target, block extensions
                if (totalWhite === num) {
                    for (let i = 0; i < 4; i++) {
                        const { dy, dx } = directions[i];
                        let ty = y + dy;
                        let tx = x + dx;
                        let dist = 0;
                        // Find the end of white sequence
                        while (ty >= 0 && ty < this.height && tx >= 0 && tx < this.width) {
                            const state = this.cells.get(ty, tx);
                            if (state !== CellState.WHITE)
                                break;
                            dist++;
                            ty += dy;
                            tx += dx;
                        }
                        // Block the next cell
                        if (ty >= 0 && ty < this.height && tx >= 0 && tx < this.width) {
                            if (this.cells.get(ty, tx) === CellState.UNKNOWN) {
                                this.setBlack(ty, tx);
                            }
                        }
                    }
                }
            }
        }
        return true;
    }
    /**
     * Cape constraint: capes have exactly 3 black neighbors, non-capes at most 2
     */
    misakiSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const blackCnt = this.countAdjacent(y, x, CellState.BLACK);
                const whiteCnt = this.countAdjacent(y, x, CellState.WHITE);
                if (this.misaki.get(y, x)) {
                    // Cape must have exactly 3 black neighbors
                    if (blackCnt > 3)
                        return false;
                    if (blackCnt === 3) {
                        // Fill remaining with white
                        for (const dir of DIRECTIONS) {
                            const adj = adjacent({ row: y, col: x }, dir);
                            if (this.cells.inBounds(adj) && this.cells.get(adj) === CellState.UNKNOWN) {
                                this.setWhite(adj.row, adj.col);
                            }
                        }
                    }
                    if (4 - whiteCnt < 3)
                        return false;
                    if (4 - whiteCnt === 3) {
                        // Fill remaining with black
                        for (const dir of DIRECTIONS) {
                            const adj = adjacent({ row: y, col: x }, dir);
                            if (this.cells.inBounds(adj) && this.cells.get(adj) === CellState.UNKNOWN) {
                                this.setBlack(adj.row, adj.col);
                            }
                        }
                    }
                }
                else {
                    // Non-cape white cells have at most 2 black neighbors
                    if (this.cells.get(y, x) === CellState.UNKNOWN) {
                        if (blackCnt > 2) {
                            // Must be black
                            this.setBlack(y, x);
                        }
                    }
                    else if (this.cells.get(y, x) === CellState.WHITE) {
                        if (blackCnt > 2)
                            return false;
                        if (blackCnt === 2) {
                            // Fill remaining with white
                            for (const dir of DIRECTIONS) {
                                const adj = adjacent({ row: y, col: x }, dir);
                                if (this.cells.inBounds(adj) && this.cells.get(adj) === CellState.UNKNOWN) {
                                    this.setWhite(adj.row, adj.col);
                                }
                            }
                        }
                    }
                }
            }
        }
        return true;
    }
    /**
     * Pond constraint: no 2x2 same color
     */
    pondSolve() {
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                const m1 = this.cells.get(y, x);
                const m2 = this.cells.get(y, x + 1);
                const m3 = this.cells.get(y + 1, x);
                const m4 = this.cells.get(y + 1, x + 1);
                // No 2x2 all black
                if (m1 === CellState.BLACK &&
                    m2 === CellState.BLACK &&
                    m3 === CellState.BLACK &&
                    m4 === CellState.BLACK) {
                    return false;
                }
                // No 2x2 all white
                if (m1 === CellState.WHITE &&
                    m2 === CellState.WHITE &&
                    m3 === CellState.WHITE &&
                    m4 === CellState.WHITE) {
                    return false;
                }
                // Propagation
                const cells = [
                    { row: y, col: x, state: m1 },
                    { row: y, col: x + 1, state: m2 },
                    { row: y + 1, col: x, state: m3 },
                    { row: y + 1, col: x + 1, state: m4 },
                ];
                let blackCount = 0;
                let whiteCount = 0;
                let unknownCell = null;
                for (const cell of cells) {
                    if (cell.state === CellState.BLACK)
                        blackCount++;
                    else if (cell.state === CellState.WHITE)
                        whiteCount++;
                    else
                        unknownCell = { row: cell.row, col: cell.col };
                }
                if (blackCount === 3 && unknownCell) {
                    this.setWhite(unknownCell.row, unknownCell.col);
                }
                if (whiteCount === 3 && unknownCell) {
                    this.setBlack(unknownCell.row, unknownCell.col);
                }
            }
        }
        return true;
    }
    /**
     * Connectivity: non-cape white cells must be connected
     */
    connectSolve() {
        const whitePosSet = new Set();
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (!this.misaki.get(y, x) && this.cells.get(y, x) === CellState.WHITE) {
                    const pos = { row: y, col: x };
                    const key = posKey(pos);
                    if (whitePosSet.size === 0) {
                        whitePosSet.add(key);
                        this.expandWhiteSet(pos, whitePosSet);
                    }
                    else if (!whitePosSet.has(key)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    /** Expand connected set of non-cape non-black cells */
    expandWhiteSet(pos, set) {
        for (const dir of DIRECTIONS) {
            const next = adjacent(pos, dir);
            if (!this.cells.inBounds(next))
                continue;
            const key = posKey(next);
            if (set.has(key))
                continue;
            if (this.misaki.get(next.row, next.col))
                continue;
            if (this.cells.get(next) === CellState.BLACK)
                continue;
            set.add(key);
            this.expandWhiteSet(next, set);
        }
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new NurimisakiField(this.height, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.cells.set(y, x, this.cells.get(y, x));
                cloned.misaki.set(y, x, this.misaki.get(y, x));
                cloned.numbers.set(y, x, this.numbers.get(y, x));
            }
        }
        return cloned;
    }
    getStateDump() {
        return this.cells.dump();
    }
    isSolved() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) === CellState.UNKNOWN)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let str = this.getStateDump();
        if (!this.numberSolve())
            return false;
        if (!this.misakiSolve())
            return false;
        if (!this.pondSolve())
            return false;
        if (this.getStateDump() !== str) {
            return this.solveAndCheck();
        }
        if (!this.connectSolve())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (this.misaki.get(row, col)) {
                    if (num !== null) {
                        line += num < 10 ? String(num) : '+';
                    }
                    else {
                        line += '�';
                    }
                }
                else {
                    const state = this.cells.get(row, col);
                    line += state === CellState.BLACK ? '�' : state === CellState.WHITE ? '�' : '?';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get unknown cells for branching */
    getUnknownCells() {
        const unknowns = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) === CellState.UNKNOWN) {
                    unknowns.push({ row: y, col: x });
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Nurimisaki Solver
// ============================================
export class NurimisakiSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from pzprv3 URL parameter
     */
    static fromString(height, width, param) {
        const field = new NurimisakiField(height, width);
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        for (let i = 0; i < param.length; i++) {
            const ch = param[i];
            if (ch === '.') {
                // Cape without number
                const row = Math.floor(index / width);
                const col = index % width;
                if (row < height && col < width) {
                    field.setCape(row, col, null);
                }
                index++;
            }
            else {
                const interval = ALPHABET_FROM_G.indexOf(ch);
                if (interval !== -1) {
                    index += interval + 1;
                }
                else {
                    const row = Math.floor(index / width);
                    const col = index % width;
                    if (row < height && col < width) {
                        let num;
                        if (ch === '-') {
                            num = parseInt(param.substring(i + 1, i + 3), 16);
                            i += 2;
                        }
                        else if (ch === '+') {
                            num = parseInt(param.substring(i + 1, i + 4), 16);
                            i += 3;
                        }
                        else {
                            num = parseInt(ch, 16);
                        }
                        if (!isNaN(num)) {
                            field.setCape(row, col, num);
                        }
                    }
                    index++;
                }
            }
        }
        return new NurimisakiSolver(field);
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
//# sourceMappingURL=nurimisaki.js.map