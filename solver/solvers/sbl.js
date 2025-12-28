/**
 * SBL (Square Black Loop) Solver
 *
 * Rules:
 * 1. Place square black cells on the grid
 * 2. Draw a single closed loop through all white (non-black) cells
 * 3. Black cells form square shapes (4 walls around them)
 * 4. White cells have exactly 2 edges (loop enters and exits)
 * 5. Row/column hints indicate the number of black cells
 */
import { CellState, posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Wall State
// ============================================
var Wall;
(function (Wall) {
    /** Unknown/undetermined */
    Wall["SPACE"] = "?";
    /** Wall exists */
    Wall["EXISTS"] = "#";
    /** Wall does not exist (loop passes through) */
    Wall["NOT_EXISTS"] = ".";
})(Wall || (Wall = {}));
// ============================================
// SBL Field State
// ============================================
export class SblField {
    height;
    width;
    /** Cell states (BLACK = filled square, WHITE = not black, UNKNOWN = undecided) */
    masu;
    /** Horizontal walls (between col and col+1) */
    yokoWall;
    /** Vertical walls (between row and row+1) */
    tateWall;
    /** Row hints (number of black cells in each row), null = no hint */
    leftHints;
    /** Column hints (number of black cells in each column), null = no hint */
    upHints;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.masu = new Grid(height, width, CellState.UNKNOWN);
        this.yokoWall = new Grid(height, width - 1, Wall.SPACE);
        this.tateWall = new Grid(height - 1, width, Wall.SPACE);
        this.leftHints = Array(height).fill(null);
        this.upHints = Array(width).fill(null);
    }
    /** Set row hint */
    setLeftHint(row, count) {
        this.leftHints[row] = count;
    }
    /** Set column hint */
    setUpHint(col, count) {
        this.upHints[col] = count;
    }
    /** Get cell state */
    getCell(row, col) {
        return this.masu.get(row, col);
    }
    /** Set cell state */
    setCell(row, col, state) {
        this.masu.set(row, col, state);
    }
    /** Hint-based constraint solving */
    hintsSolve() {
        // Row hints
        for (let y = 0; y < this.height; y++) {
            if (this.leftHints[y] === null)
                continue;
            let blackCnt = 0;
            let spaceCnt = 0;
            for (let x = 0; x < this.width; x++) {
                const cell = this.masu.get(y, x);
                if (cell === CellState.BLACK)
                    blackCnt++;
                else if (cell === CellState.UNKNOWN)
                    spaceCnt++;
            }
            // Check validity
            if (blackCnt > this.leftHints[y])
                return false;
            if (blackCnt + spaceCnt < this.leftHints[y])
                return false;
            // If reached exact count
            if (blackCnt === this.leftHints[y]) {
                for (let x = 0; x < this.width; x++) {
                    if (this.masu.get(y, x) === CellState.UNKNOWN) {
                        this.masu.set(y, x, CellState.WHITE);
                    }
                }
            }
            // If all unknowns must be black
            if (blackCnt + spaceCnt === this.leftHints[y]) {
                for (let x = 0; x < this.width; x++) {
                    if (this.masu.get(y, x) === CellState.UNKNOWN) {
                        this.masu.set(y, x, CellState.BLACK);
                    }
                }
            }
        }
        // Column hints
        for (let x = 0; x < this.width; x++) {
            if (this.upHints[x] === null)
                continue;
            let blackCnt = 0;
            let spaceCnt = 0;
            for (let y = 0; y < this.height; y++) {
                const cell = this.masu.get(y, x);
                if (cell === CellState.BLACK)
                    blackCnt++;
                else if (cell === CellState.UNKNOWN)
                    spaceCnt++;
            }
            // Check validity
            if (blackCnt > this.upHints[x])
                return false;
            if (blackCnt + spaceCnt < this.upHints[x])
                return false;
            // If reached exact count
            if (blackCnt === this.upHints[x]) {
                for (let y = 0; y < this.height; y++) {
                    if (this.masu.get(y, x) === CellState.UNKNOWN) {
                        this.masu.set(y, x, CellState.WHITE);
                    }
                }
            }
            // If all unknowns must be black
            if (blackCnt + spaceCnt === this.upHints[x]) {
                for (let y = 0; y < this.height; y++) {
                    if (this.masu.get(y, x) === CellState.UNKNOWN) {
                        this.masu.set(y, x, CellState.BLACK);
                    }
                }
            }
        }
        return true;
    }
    /** Black cells form squares (4 walls), white cells have 2 walls (loop) */
    nextSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                let existsCount = 0;
                let notExistsCount = 0;
                // Count walls around cell
                const wallUp = y === 0 ? Wall.EXISTS : this.tateWall.get(y - 1, x);
                if (wallUp === Wall.EXISTS)
                    existsCount++;
                else if (wallUp === Wall.NOT_EXISTS)
                    notExistsCount++;
                const wallRight = x === this.width - 1 ? Wall.EXISTS : this.yokoWall.get(y, x);
                if (wallRight === Wall.EXISTS)
                    existsCount++;
                else if (wallRight === Wall.NOT_EXISTS)
                    notExistsCount++;
                const wallDown = y === this.height - 1 ? Wall.EXISTS : this.tateWall.get(y, x);
                if (wallDown === Wall.EXISTS)
                    existsCount++;
                else if (wallDown === Wall.NOT_EXISTS)
                    notExistsCount++;
                const wallLeft = x === 0 ? Wall.EXISTS : this.yokoWall.get(y, x - 1);
                if (wallLeft === Wall.EXISTS)
                    existsCount++;
                else if (wallLeft === Wall.NOT_EXISTS)
                    notExistsCount++;
                const cell = this.masu.get(y, x);
                if (cell === CellState.UNKNOWN) {
                    // Undetermined: walls can be 2 (white) or 4 (black)
                    if ((existsCount === 3 && notExistsCount === 1) || notExistsCount > 2) {
                        return false;
                    }
                    if (existsCount > 2) {
                        this.masu.set(y, x, CellState.BLACK);
                    }
                    else if (notExistsCount !== 0) {
                        this.masu.set(y, x, CellState.WHITE);
                    }
                }
                if (cell === CellState.BLACK) {
                    // Black cell: all 4 walls must exist
                    if (notExistsCount > 0)
                        return false;
                    // Close all walls
                    if (y > 0 && this.tateWall.get(y - 1, x) === Wall.SPACE) {
                        this.tateWall.set(y - 1, x, Wall.EXISTS);
                    }
                    if (x < this.width - 1 && this.yokoWall.get(y, x) === Wall.SPACE) {
                        this.yokoWall.set(y, x, Wall.EXISTS);
                    }
                    if (y < this.height - 1 && this.tateWall.get(y, x) === Wall.SPACE) {
                        this.tateWall.set(y, x, Wall.EXISTS);
                    }
                    if (x > 0 && this.yokoWall.get(y, x - 1) === Wall.SPACE) {
                        this.yokoWall.set(y, x - 1, Wall.EXISTS);
                    }
                }
                else if (cell === CellState.WHITE) {
                    // White cell: exactly 2 walls (2 open for loop)
                    if (existsCount > 2 || notExistsCount > 2)
                        return false;
                    if (notExistsCount === 2) {
                        // Close remaining walls
                        if (y > 0 && this.tateWall.get(y - 1, x) === Wall.SPACE) {
                            this.tateWall.set(y - 1, x, Wall.EXISTS);
                        }
                        if (x < this.width - 1 && this.yokoWall.get(y, x) === Wall.SPACE) {
                            this.yokoWall.set(y, x, Wall.EXISTS);
                        }
                        if (y < this.height - 1 && this.tateWall.get(y, x) === Wall.SPACE) {
                            this.tateWall.set(y, x, Wall.EXISTS);
                        }
                        if (x > 0 && this.yokoWall.get(y, x - 1) === Wall.SPACE) {
                            this.yokoWall.set(y, x - 1, Wall.EXISTS);
                        }
                    }
                    else if (existsCount === 2) {
                        // Open remaining walls
                        if (y > 0 && this.tateWall.get(y - 1, x) === Wall.SPACE) {
                            this.tateWall.set(y - 1, x, Wall.NOT_EXISTS);
                        }
                        if (x < this.width - 1 && this.yokoWall.get(y, x) === Wall.SPACE) {
                            this.yokoWall.set(y, x, Wall.NOT_EXISTS);
                        }
                        if (y < this.height - 1 && this.tateWall.get(y, x) === Wall.SPACE) {
                            this.tateWall.set(y, x, Wall.NOT_EXISTS);
                        }
                        if (x > 0 && this.yokoWall.get(y, x - 1) === Wall.SPACE) {
                            this.yokoWall.set(y, x - 1, Wall.NOT_EXISTS);
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Check that black cells form valid squares */
    sikakuSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.masu.get(y, x) !== CellState.BLACK)
                    continue;
                // Find vertical extent
                let fixMinY = y;
                let fixMaxY = y;
                for (let ty = y - 1; ty >= 0; ty--) {
                    if (this.masu.get(ty, x) !== CellState.BLACK)
                        break;
                    fixMinY = ty;
                }
                for (let ty = y + 1; ty < this.height; ty++) {
                    if (this.masu.get(ty, x) !== CellState.BLACK)
                        break;
                    fixMaxY = ty;
                }
                // Find possible horizontal extent
                let candMinX = 0;
                let candMaxX = Number.MAX_SAFE_INTEGER;
                for (let ty = fixMinY; ty <= fixMaxY; ty++) {
                    let wkMinX = x;
                    let wkMaxX = x;
                    for (let tx = x - 1; tx >= 0; tx--) {
                        if (this.masu.get(y, tx) === CellState.WHITE)
                            break;
                        wkMinX = tx;
                    }
                    for (let tx = x + 1; tx < this.width; tx++) {
                        if (this.masu.get(y, tx) === CellState.WHITE)
                            break;
                        wkMaxX = tx;
                    }
                    candMinX = Math.max(candMinX, wkMinX);
                    candMaxX = Math.min(candMaxX, wkMaxX);
                }
                // Check if can form square
                if (fixMaxY - fixMinY > candMaxX - candMinX)
                    return false;
                // Check horizontal extent
                let fixMinX = x;
                let fixMaxX = x;
                for (let tx = x - 1; tx >= 0; tx--) {
                    if (this.masu.get(y, tx) !== CellState.BLACK)
                        break;
                    fixMinX = tx;
                }
                for (let tx = x + 1; tx < this.width; tx++) {
                    if (this.masu.get(y, tx) !== CellState.BLACK)
                        break;
                    fixMaxX = tx;
                }
                // Find possible vertical extent
                let candMinY = 0;
                let candMaxY = Number.MAX_SAFE_INTEGER;
                for (let tx = fixMinX; tx <= fixMaxX; tx++) {
                    let wkMinY = y;
                    let wkMaxY = y;
                    for (let ty = y - 1; ty >= 0; ty--) {
                        if (this.masu.get(ty, x) === CellState.WHITE)
                            break;
                        wkMinY = ty;
                    }
                    for (let ty = y + 1; ty < this.height; ty++) {
                        if (this.masu.get(ty, x) === CellState.WHITE)
                            break;
                        wkMaxY = ty;
                    }
                    candMinY = Math.max(candMinY, wkMinY);
                    candMaxY = Math.min(candMaxY, wkMaxY);
                }
                if (fixMaxX - fixMinX > candMaxY - candMinY)
                    return false;
            }
        }
        return true;
    }
    /** Check white cell connectivity (single loop) */
    connectSolve() {
        const whiteCells = new Set();
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.masu.get(y, x) === CellState.WHITE) {
                    whiteCells.add(posKey({ row: y, col: x }));
                }
            }
        }
        if (whiteCells.size === 0)
            return true;
        // BFS from first white cell
        const firstValue = whiteCells.values().next().value;
        if (!firstValue)
            return true;
        const first = firstValue;
        const [startY, startX] = first.split(',').map(Number);
        const visited = new Set();
        const queue = [{ row: startY, col: startX }];
        visited.add(first);
        while (queue.length > 0) {
            const { row, col } = queue.shift();
            // Check neighbors connected via non-walls
            if (row > 0 && this.tateWall.get(row - 1, col) !== Wall.EXISTS) {
                const key = posKey({ row: row - 1, col });
                if (whiteCells.has(key) && !visited.has(key)) {
                    visited.add(key);
                    queue.push({ row: row - 1, col });
                }
            }
            if (col < this.width - 1 && this.yokoWall.get(row, col) !== Wall.EXISTS) {
                const key = posKey({ row, col: col + 1 });
                if (whiteCells.has(key) && !visited.has(key)) {
                    visited.add(key);
                    queue.push({ row, col: col + 1 });
                }
            }
            if (row < this.height - 1 && this.tateWall.get(row, col) !== Wall.EXISTS) {
                const key = posKey({ row: row + 1, col });
                if (whiteCells.has(key) && !visited.has(key)) {
                    visited.add(key);
                    queue.push({ row: row + 1, col });
                }
            }
            if (col > 0 && this.yokoWall.get(row, col - 1) !== Wall.EXISTS) {
                const key = posKey({ row, col: col - 1 });
                if (whiteCells.has(key) && !visited.has(key)) {
                    visited.add(key);
                    queue.push({ row, col: col - 1 });
                }
            }
        }
        return visited.size === whiteCells.size;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new SblField(this.height, this.width);
        // Clone grids
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.masu.set(y, x, this.masu.get(y, x));
            }
        }
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                cloned.yokoWall.set(y, x, this.yokoWall.get(y, x));
            }
        }
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.tateWall.set(y, x, this.tateWall.get(y, x));
            }
        }
        // Clone hints
        cloned.leftHints = [...this.leftHints];
        cloned.upHints = [...this.upHints];
        return cloned;
    }
    getStateDump() {
        let dump = '';
        // Yoko walls
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                dump += this.yokoWall.get(y, x);
            }
        }
        // Tate walls
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width; x++) {
                dump += this.tateWall.get(y, x);
            }
        }
        return dump;
    }
    isSolved() {
        // All walls must be determined
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                if (this.yokoWall.get(y, x) === Wall.SPACE)
                    return false;
            }
        }
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.tateWall.get(y, x) === Wall.SPACE)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        const startDump = this.getStateDump();
        if (!this.hintsSolve())
            return false;
        if (!this.nextSolve())
            return false;
        if (this.getStateDump() !== startDump) {
            // If changed, recurse to continue propagation
            return this.solveAndCheck();
        }
        // Only check these when stable
        if (!this.sikakuSolve())
            return false;
        if (!this.connectSolve())
            return false;
        return true;
    }
    /** Get branching candidates */
    getBranchingCandidates() {
        const candidates = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                if (this.yokoWall.get(y, x) === Wall.SPACE) {
                    candidates.push({ type: 'yokoWall', y, x });
                }
            }
        }
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.tateWall.get(y, x) === Wall.SPACE) {
                    candidates.push({ type: 'tateWall', y, x });
                }
            }
        }
        return candidates;
    }
    /** Set wall (for branching) */
    setWall(type, y, x, state) {
        if (type === 'yokoWall') {
            this.yokoWall.set(y, x, state);
        }
        else {
            this.tateWall.set(y, x, state);
        }
    }
    toString() {
        let result = '';
        // Top border
        for (let x = 0; x < this.width * 2 + 1; x++) {
            result += '□';
        }
        result += '\n';
        // Each row
        for (let y = 0; y < this.height; y++) {
            result += '□';
            for (let x = 0; x < this.width; x++) {
                // Cell
                const cell = this.masu.get(y, x);
                if (cell === CellState.BLACK) {
                    result += '■';
                }
                else if (cell === CellState.WHITE) {
                    result += '　';
                }
                else {
                    result += '・';
                }
                // Horizontal wall (between this cell and next)
                if (x !== this.width - 1) {
                    const wall = this.yokoWall.get(y, x);
                    if (wall === Wall.EXISTS) {
                        result += '|';
                    }
                    else if (wall === Wall.NOT_EXISTS) {
                        result += ' ';
                    }
                    else {
                        result += '・';
                    }
                }
            }
            result += '□\n';
            // Vertical walls (between this row and next)
            if (y !== this.height - 1) {
                result += '□';
                for (let x = 0; x < this.width; x++) {
                    const wall = this.tateWall.get(y, x);
                    if (wall === Wall.EXISTS) {
                        result += '-';
                    }
                    else if (wall === Wall.NOT_EXISTS) {
                        result += ' ';
                    }
                    else {
                        result += '・';
                    }
                    if (x !== this.width - 1) {
                        result += '□';
                    }
                }
                result += '□\n';
            }
        }
        // Bottom border
        for (let x = 0; x < this.width * 2 + 1; x++) {
            result += '□';
        }
        result += '\n';
        return result;
    }
}
// ============================================
// SBL Solver
// ============================================
export class SblSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from pzv.jp URL format
     * Format: /h{height}/w{width}/{data}
     * Data contains hints and black cells
     */
    static fromString(height, width, puzzle) {
        const field = new SblField(height, width);
        // Parse the puzzle data
        // Row 0 contains column hints (top)
        // Column 0 contains row hints (left)
        // Other cells can be black cells or empty
        for (let row = 0; row < puzzle.length; row++) {
            const line = puzzle[row] || '';
            for (let col = 0; col < line.length; col++) {
                const ch = line[col];
                if (row === 0 && col > 0) {
                    // Column hints (top)
                    if (ch >= '0' && ch <= '9') {
                        field.setUpHint(col - 1, parseInt(ch));
                    }
                    else if (ch >= 'a' && ch <= 'z') {
                        // Letters represent 10+ (a=10, b=11, etc.)
                        field.setUpHint(col - 1, ch.charCodeAt(0) - 'a'.charCodeAt(0) + 10);
                    }
                }
                else if (col === 0 && row > 0) {
                    // Row hints (left)
                    if (ch >= '0' && ch <= '9') {
                        field.setLeftHint(row - 1, parseInt(ch));
                    }
                    else if (ch >= 'a' && ch <= 'z') {
                        field.setLeftHint(row - 1, ch.charCodeAt(0) - 'a'.charCodeAt(0) + 10);
                    }
                }
                else if (row > 0 && col > 0) {
                    // Grid cells
                    if (ch === '#' || ch === '■' || ch === 'B') {
                        field.setCell(row - 1, col - 1, CellState.BLACK);
                    }
                }
            }
        }
        return new SblSolver(field);
    }
    /** Create solver from penpa-edit field string (simplified version) */
    static fromFieldStr(fieldStr) {
        // Parse height and width from first line
        const lines = fieldStr.split('\n');
        const [_, widthStr, heightStr] = lines[0].split(',');
        const width = parseInt(widthStr) - 1; // Minus 1 for hint column
        const height = parseInt(heightStr) - 1; // Minus 1 for hint row
        const field = new SblField(height, width);
        // This is a simplified parser - full penpa-edit parsing would be more complex
        // For now, just create an empty field
        return new SblSolver(field);
    }
    getBranchCandidates(state) {
        const candidates = state.getBranchingCandidates();
        if (candidates.length === 0)
            return [];
        const cand = candidates[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setWall(cand.type, cand.y, cand.x, Wall.EXISTS);
                    return cloned;
                },
                description: `Set ${cand.type}[${cand.y}][${cand.x}] to EXISTS`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setWall(cand.type, cand.y, cand.x, Wall.NOT_EXISTS);
                    return cloned;
                },
                description: `Set ${cand.type}[${cand.y}][${cand.x}] to NOT_EXISTS`,
            },
        ];
    }
}
//# sourceMappingURL=sbl.js.map