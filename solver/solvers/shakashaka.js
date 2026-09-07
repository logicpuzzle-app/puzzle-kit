/**
 * Shakashaka Solver
 *
 * Rules:
 * 1. Place triangles in empty cells to form rectangular white regions
 * 2. Cells can be: empty, black (clue), or contain a triangle
 * 3. Triangles can be: upper-left, upper-right, lower-left, lower-right
 * 4. The resulting white area (after triangles) must form rectangles
 * 5. Numbers indicate how many triangular half-cells touch the numbered black cell
 *    (each adjacent cell can contribute 0, 1, or 2 triangle vertices)
 */
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Cell State for Shakashaka
// ============================================
/**
 * Cell state in Shakashaka:
 * - UNKNOWN: Not yet determined
 * - BLACK: Triangle forming black region (treated as full black cell)
 * - WHITE: Empty cell (no triangle) - counts as white
 * Triangles are represented by wall configuration
 */
export var ShakashakaCellState;
(function (ShakashakaCellState) {
    ShakashakaCellState[ShakashakaCellState["UNKNOWN"] = 0] = "UNKNOWN";
    ShakashakaCellState[ShakashakaCellState["BLACK"] = 1] = "BLACK";
    ShakashakaCellState[ShakashakaCellState["NOT_BLACK"] = 2] = "NOT_BLACK";
})(ShakashakaCellState || (ShakashakaCellState = {}));
/**
 * Diagonal wall state between cells (internal to shakashaka)
 */
var DiagonalWallState;
(function (DiagonalWallState) {
    DiagonalWallState[DiagonalWallState["UNKNOWN"] = 0] = "UNKNOWN";
    DiagonalWallState[DiagonalWallState["EXISTS"] = 1] = "EXISTS";
    DiagonalWallState[DiagonalWallState["NOT_EXISTS"] = 2] = "NOT_EXISTS";
})(DiagonalWallState || (DiagonalWallState = {}));
// ============================================
// Shakashaka Field State
// ============================================
export class ShakashakaField {
    height;
    width;
    /** Cell states (UNKNOWN/BLACK/NOT_BLACK) */
    cells;
    /** Numbers in each cell (null = no clue, -1 = black without number, 0-4 = clue) */
    numbers;
    /** Horizontal walls (between col and col+1) */
    yokoWall;
    /** Vertical walls (between row and row+1) */
    tateWall;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => ShakashakaCellState.UNKNOWN);
        this.numbers = new Grid(height, width, () => null);
        // Horizontal walls: height rows, width-1 columns
        this.yokoWall = new Grid(height, width - 1, () => DiagonalWallState.UNKNOWN);
        // Vertical walls: height-1 rows, width columns
        this.tateWall = new Grid(height - 1, width, () => DiagonalWallState.UNKNOWN);
    }
    /** Set a number clue (marks cell as clue cell) */
    setNumber(row, col, num) {
        this.numbers.set(row, col, num);
        // Set walls around clue cells
        if (row > 0) {
            this.tateWall.set(row - 1, col, DiagonalWallState.EXISTS);
        }
        if (col < this.width - 1) {
            this.yokoWall.set(row, col, DiagonalWallState.EXISTS);
        }
        if (row < this.height - 1) {
            this.tateWall.set(row, col, DiagonalWallState.EXISTS);
        }
        if (col > 0) {
            this.yokoWall.set(row, col - 1, DiagonalWallState.EXISTS);
        }
    }
    /** Get number at position */
    getNumber(row, col) {
        return this.numbers.get(row, col);
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell to black (full triangle fill) */
    setBlack(row, col) {
        if (this.numbers.get(row, col) === null) {
            this.cells.set(row, col, ShakashakaCellState.BLACK);
        }
    }
    /** Set cell to not black (white/empty) */
    setNotBlack(row, col) {
        if (this.numbers.get(row, col) === null) {
            this.cells.set(row, col, ShakashakaCellState.NOT_BLACK);
        }
    }
    /** Get wall state */
    getYokoWall(row, col) {
        if (col < 0 || col >= this.width - 1)
            return DiagonalWallState.EXISTS;
        return this.yokoWall.get(row, col);
    }
    getTateWall(row, col) {
        if (row < 0 || row >= this.height - 1)
            return DiagonalWallState.EXISTS;
        return this.tateWall.get(row, col);
    }
    setYokoWall(row, col, state) {
        if (col >= 0 && col < this.width - 1) {
            this.yokoWall.set(row, col, state);
        }
    }
    setTateWall(row, col, state) {
        if (row >= 0 && row < this.height - 1) {
            this.tateWall.set(row, col, state);
        }
    }
    // ========== Constraint checking ==========
    /**
     * Black cells must form rectangles (no L-shaped black regions)
     * Returns false if invalid
     */
    rectSolve() {
        let changed = true;
        while (changed) {
            changed = false;
            for (let row = 0; row < this.height - 1; row++) {
                for (let col = 0; col < this.width - 1; col++) {
                    const getMasu = (r, c) => {
                        if (this.numbers.get(r, c) !== null)
                            return ShakashakaCellState.NOT_BLACK;
                        return this.cells.get(r, c);
                    };
                    const masu1 = getMasu(row, col);
                    const masu2 = getMasu(row, col + 1);
                    const masu3 = getMasu(row + 1, col);
                    const masu4 = getMasu(row + 1, col + 1);
                    // Check for L-shaped blacks (invalid)
                    const isBlack = (m) => m === ShakashakaCellState.BLACK;
                    const isNotBlack = (m) => m === ShakashakaCellState.NOT_BLACK;
                    const isUnknown = (m) => m === ShakashakaCellState.UNKNOWN;
                    // 3 blacks + 1 white = invalid
                    if (isBlack(masu1) && isBlack(masu2) && isBlack(masu3) && isNotBlack(masu4))
                        return false;
                    if (isBlack(masu1) && isBlack(masu2) && isNotBlack(masu3) && isBlack(masu4))
                        return false;
                    if (isBlack(masu1) && isNotBlack(masu2) && isBlack(masu3) && isBlack(masu4))
                        return false;
                    if (isNotBlack(masu1) && isBlack(masu2) && isBlack(masu3) && isBlack(masu4))
                        return false;
                    // 3 blacks + 1 unknown -> force the unknown to black
                    if (isBlack(masu1) && isBlack(masu2) && isBlack(masu3) && isUnknown(masu4) && this.numbers.get(row + 1, col + 1) === null) {
                        this.cells.set(row + 1, col + 1, ShakashakaCellState.BLACK);
                        changed = true;
                    }
                    if (isBlack(masu1) && isBlack(masu2) && isUnknown(masu3) && isBlack(masu4) && this.numbers.get(row + 1, col) === null) {
                        this.cells.set(row + 1, col, ShakashakaCellState.BLACK);
                        changed = true;
                    }
                    if (isBlack(masu1) && isUnknown(masu2) && isBlack(masu3) && isBlack(masu4) && this.numbers.get(row, col + 1) === null) {
                        this.cells.set(row, col + 1, ShakashakaCellState.BLACK);
                        changed = true;
                    }
                    if (isUnknown(masu1) && isBlack(masu2) && isBlack(masu3) && isBlack(masu4) && this.numbers.get(row, col) === null) {
                        this.cells.set(row, col, ShakashakaCellState.BLACK);
                        changed = true;
                    }
                }
            }
        }
        return true;
    }
    /**
     * Wall corners can't have exactly 1 wall (must be 0, 2, or 4)
     */
    pondSolve() {
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                let exists = 0;
                let notExists = 0;
                const wall1 = this.tateWall.get(row, col);
                const wall2 = this.tateWall.get(row, col + 1);
                const wall3 = this.yokoWall.get(row, col);
                const wall4 = this.yokoWall.get(row + 1, col);
                if (wall1 === DiagonalWallState.EXISTS)
                    exists++;
                else if (wall1 === DiagonalWallState.NOT_EXISTS)
                    notExists++;
                if (wall2 === DiagonalWallState.EXISTS)
                    exists++;
                else if (wall2 === DiagonalWallState.NOT_EXISTS)
                    notExists++;
                if (wall3 === DiagonalWallState.EXISTS)
                    exists++;
                else if (wall3 === DiagonalWallState.NOT_EXISTS)
                    notExists++;
                if (wall4 === DiagonalWallState.EXISTS)
                    exists++;
                else if (wall4 === DiagonalWallState.NOT_EXISTS)
                    notExists++;
                // Exactly 1 wall at corner is invalid
                if (exists === 1 && notExists === 3) {
                    return false;
                }
                // If 3 are not-exists, the 4th must also be not-exists
                if (notExists === 3) {
                    if (wall1 === DiagonalWallState.UNKNOWN)
                        this.tateWall.set(row, col, DiagonalWallState.NOT_EXISTS);
                    if (wall2 === DiagonalWallState.UNKNOWN)
                        this.tateWall.set(row, col + 1, DiagonalWallState.NOT_EXISTS);
                    if (wall3 === DiagonalWallState.UNKNOWN)
                        this.yokoWall.set(row, col, DiagonalWallState.NOT_EXISTS);
                    if (wall4 === DiagonalWallState.UNKNOWN)
                        this.yokoWall.set(row + 1, col, DiagonalWallState.NOT_EXISTS);
                }
                // If 2 are not-exists and 1 exists, the 4th must exist
                if (notExists === 2 && exists === 1) {
                    if (wall1 === DiagonalWallState.UNKNOWN)
                        this.tateWall.set(row, col, DiagonalWallState.EXISTS);
                    if (wall2 === DiagonalWallState.UNKNOWN)
                        this.tateWall.set(row, col + 1, DiagonalWallState.EXISTS);
                    if (wall3 === DiagonalWallState.UNKNOWN)
                        this.yokoWall.set(row, col, DiagonalWallState.EXISTS);
                    if (wall4 === DiagonalWallState.UNKNOWN)
                        this.yokoWall.set(row + 1, col, DiagonalWallState.EXISTS);
                }
            }
        }
        return true;
    }
    /**
     * Black cells have all 4 walls, white cells have 0 or 2 (non-opposite) walls
     */
    whiteWallSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.numbers.get(row, col) !== null)
                    continue;
                let exists = 0;
                let notExists = 0;
                const wallUp = row === 0 ? DiagonalWallState.EXISTS : this.tateWall.get(row - 1, col);
                const wallRight = col === this.width - 1 ? DiagonalWallState.EXISTS : this.yokoWall.get(row, col);
                const wallDown = row === this.height - 1 ? DiagonalWallState.EXISTS : this.tateWall.get(row, col);
                const wallLeft = col === 0 ? DiagonalWallState.EXISTS : this.yokoWall.get(row, col - 1);
                if (wallUp === DiagonalWallState.EXISTS)
                    exists++;
                else if (wallUp === DiagonalWallState.NOT_EXISTS)
                    notExists++;
                if (wallRight === DiagonalWallState.EXISTS)
                    exists++;
                else if (wallRight === DiagonalWallState.NOT_EXISTS)
                    notExists++;
                if (wallDown === DiagonalWallState.EXISTS)
                    exists++;
                else if (wallDown === DiagonalWallState.NOT_EXISTS)
                    notExists++;
                if (wallLeft === DiagonalWallState.EXISTS)
                    exists++;
                else if (wallLeft === DiagonalWallState.NOT_EXISTS)
                    notExists++;
                // Determine cell state from walls
                if (this.cells.get(row, col) === ShakashakaCellState.UNKNOWN) {
                    if (exists > 2) {
                        this.cells.set(row, col, ShakashakaCellState.BLACK);
                    }
                    else if (notExists > 0) {
                        this.cells.set(row, col, ShakashakaCellState.NOT_BLACK);
                    }
                }
                // White cell constraints
                if (this.cells.get(row, col) === ShakashakaCellState.NOT_BLACK) {
                    // Can't have more than 2 walls or exactly 1 wall
                    if (exists > 2 || (exists === 1 && notExists === 3)) {
                        return false;
                    }
                    // Opposite walls can't both exist
                    if ((wallUp === DiagonalWallState.EXISTS && wallDown === DiagonalWallState.EXISTS) ||
                        (wallRight === DiagonalWallState.EXISTS && wallLeft === DiagonalWallState.EXISTS)) {
                        return false;
                    }
                    // Opposite walls can't both not exist (would mean 0 walls which is valid)
                    // unless we also have existing walls
                    if (exists > 0) {
                        // If one exists, force the opposite to not-exist
                        if (wallUp === DiagonalWallState.EXISTS && wallDown === DiagonalWallState.UNKNOWN && row < this.height - 1) {
                            this.tateWall.set(row, col, DiagonalWallState.NOT_EXISTS);
                        }
                        if (wallRight === DiagonalWallState.EXISTS && wallLeft === DiagonalWallState.UNKNOWN && col > 0) {
                            this.yokoWall.set(row, col - 1, DiagonalWallState.NOT_EXISTS);
                        }
                        if (wallDown === DiagonalWallState.EXISTS && wallUp === DiagonalWallState.UNKNOWN && row > 0) {
                            this.tateWall.set(row - 1, col, DiagonalWallState.NOT_EXISTS);
                        }
                        if (wallLeft === DiagonalWallState.EXISTS && wallRight === DiagonalWallState.UNKNOWN && col < this.width - 1) {
                            this.yokoWall.set(row, col, DiagonalWallState.NOT_EXISTS);
                        }
                        // If one not-exists, force the opposite to exist
                        if (wallUp === DiagonalWallState.NOT_EXISTS && wallDown === DiagonalWallState.UNKNOWN && row < this.height - 1) {
                            this.tateWall.set(row, col, DiagonalWallState.EXISTS);
                        }
                        if (wallRight === DiagonalWallState.NOT_EXISTS && wallLeft === DiagonalWallState.UNKNOWN && col > 0) {
                            this.yokoWall.set(row, col - 1, DiagonalWallState.EXISTS);
                        }
                        if (wallDown === DiagonalWallState.NOT_EXISTS && wallUp === DiagonalWallState.UNKNOWN && row > 0) {
                            this.tateWall.set(row - 1, col, DiagonalWallState.EXISTS);
                        }
                        if (wallLeft === DiagonalWallState.NOT_EXISTS && wallRight === DiagonalWallState.UNKNOWN && col < this.width - 1) {
                            this.yokoWall.set(row, col, DiagonalWallState.EXISTS);
                        }
                    }
                    else if (notExists > 2) {
                        // 0 walls case - force all to not-exist
                        if (wallUp === DiagonalWallState.UNKNOWN && row > 0) {
                            this.tateWall.set(row - 1, col, DiagonalWallState.NOT_EXISTS);
                        }
                        if (wallRight === DiagonalWallState.UNKNOWN && col < this.width - 1) {
                            this.yokoWall.set(row, col, DiagonalWallState.NOT_EXISTS);
                        }
                        if (wallDown === DiagonalWallState.UNKNOWN && row < this.height - 1) {
                            this.tateWall.set(row, col, DiagonalWallState.NOT_EXISTS);
                        }
                        if (wallLeft === DiagonalWallState.UNKNOWN && col > 0) {
                            this.yokoWall.set(row, col - 1, DiagonalWallState.NOT_EXISTS);
                        }
                    }
                }
                // Black cell constraints - all 4 walls must exist
                if (this.cells.get(row, col) === ShakashakaCellState.BLACK) {
                    if (notExists > 0) {
                        return false;
                    }
                    if (wallUp === DiagonalWallState.UNKNOWN && row > 0) {
                        this.tateWall.set(row - 1, col, DiagonalWallState.EXISTS);
                    }
                    if (wallRight === DiagonalWallState.UNKNOWN && col < this.width - 1) {
                        this.yokoWall.set(row, col, DiagonalWallState.EXISTS);
                    }
                    if (wallDown === DiagonalWallState.UNKNOWN && row < this.height - 1) {
                        this.tateWall.set(row, col, DiagonalWallState.EXISTS);
                    }
                    if (wallLeft === DiagonalWallState.UNKNOWN && col > 0) {
                        this.yokoWall.set(row, col - 1, DiagonalWallState.EXISTS);
                    }
                }
            }
        }
        return true;
    }
    /**
     * Number clues indicate adjacent white half-cells (triangle vertices)
     */
    numberSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num === null || num === -1)
                    continue;
                let blackCount = 0;
                let whiteCount = 0;
                const getMasu = (r, c) => {
                    if (r < 0 || r >= this.height || c < 0 || c >= this.width)
                        return ShakashakaCellState.BLACK;
                    if (this.numbers.get(r, c) !== null)
                        return ShakashakaCellState.BLACK;
                    return this.cells.get(r, c);
                };
                const masuUp = getMasu(row - 1, col);
                const masuRight = getMasu(row, col + 1);
                const masuDown = getMasu(row + 1, col);
                const masuLeft = getMasu(row, col - 1);
                if (masuUp === ShakashakaCellState.BLACK)
                    blackCount++;
                else if (masuUp === ShakashakaCellState.NOT_BLACK)
                    whiteCount++;
                if (masuRight === ShakashakaCellState.BLACK)
                    blackCount++;
                else if (masuRight === ShakashakaCellState.NOT_BLACK)
                    whiteCount++;
                if (masuDown === ShakashakaCellState.BLACK)
                    blackCount++;
                else if (masuDown === ShakashakaCellState.NOT_BLACK)
                    whiteCount++;
                if (masuLeft === ShakashakaCellState.BLACK)
                    blackCount++;
                else if (masuLeft === ShakashakaCellState.NOT_BLACK)
                    whiteCount++;
                // Too many white cells
                if (num < whiteCount) {
                    return false;
                }
                // Exact white count - fill rest with black
                if (num === whiteCount) {
                    if (masuUp === ShakashakaCellState.UNKNOWN && this.numbers.get(row - 1, col) === null) {
                        this.cells.set(row - 1, col, ShakashakaCellState.BLACK);
                    }
                    if (masuRight === ShakashakaCellState.UNKNOWN && this.numbers.get(row, col + 1) === null) {
                        this.cells.set(row, col + 1, ShakashakaCellState.BLACK);
                    }
                    if (masuDown === ShakashakaCellState.UNKNOWN && this.numbers.get(row + 1, col) === null) {
                        this.cells.set(row + 1, col, ShakashakaCellState.BLACK);
                    }
                    if (masuLeft === ShakashakaCellState.UNKNOWN && this.numbers.get(row, col - 1) === null) {
                        this.cells.set(row, col - 1, ShakashakaCellState.BLACK);
                    }
                }
                // Not enough cells for required whites
                if (num > 4 - blackCount) {
                    return false;
                }
                // Must fill remaining with white
                if (num === 4 - blackCount) {
                    if (masuUp === ShakashakaCellState.UNKNOWN && this.numbers.get(row - 1, col) === null) {
                        this.cells.set(row - 1, col, ShakashakaCellState.NOT_BLACK);
                    }
                    if (masuRight === ShakashakaCellState.UNKNOWN && this.numbers.get(row, col + 1) === null) {
                        this.cells.set(row, col + 1, ShakashakaCellState.NOT_BLACK);
                    }
                    if (masuDown === ShakashakaCellState.UNKNOWN && this.numbers.get(row + 1, col) === null) {
                        this.cells.set(row + 1, col, ShakashakaCellState.NOT_BLACK);
                    }
                    if (masuLeft === ShakashakaCellState.UNKNOWN && this.numbers.get(row, col - 1) === null) {
                        this.cells.set(row, col - 1, ShakashakaCellState.NOT_BLACK);
                    }
                }
            }
        }
        return true;
    }
    /**
     * There must be at least one white cell
     */
    finalSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) !== ShakashakaCellState.BLACK && this.numbers.get(row, col) === null) {
                    return true;
                }
            }
        }
        return false;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new ShakashakaField(this.height, this.width);
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                cloned.cells.set(row, col, this.cells.get(row, col));
            }
        }
        cloned.numbers = this.numbers; // Shared (immutable)
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                cloned.yokoWall.set(row, col, this.yokoWall.get(row, col));
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                cloned.tateWall.set(row, col, this.tateWall.get(row, col));
            }
        }
        return cloned;
    }
    getStateDump() {
        let result = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                result += this.cells.get(row, col);
            }
        }
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                result += this.yokoWall.get(row, col);
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                result += this.tateWall.get(row, col);
            }
        }
        return result;
    }
    isSolved() {
        // All cells must be determined
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === ShakashakaCellState.UNKNOWN && this.numbers.get(row, col) === null) {
                    return false;
                }
            }
        }
        // All walls must be determined
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoWall.get(row, col) === DiagonalWallState.UNKNOWN) {
                    return false;
                }
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateWall.get(row, col) === DiagonalWallState.UNKNOWN) {
                    return false;
                }
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let str = this.getStateDump();
        if (!this.numberSolve())
            return false;
        if (!this.pondSolve())
            return false;
        if (!this.rectSolve())
            return false;
        if (!this.whiteWallSolve())
            return false;
        if (!this.finalSolve())
            return false;
        if (this.getStateDump() !== str) {
            return this.solveAndCheck();
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num !== null) {
                    line += num === -1 ? '■' : String(num);
                }
                else {
                    const state = this.cells.get(row, col);
                    line += state === ShakashakaCellState.BLACK ? '▲' : state === ShakashakaCellState.NOT_BLACK ? '·' : '?';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get unknown cells for branching */
    getUnknownCells() {
        const unknowns = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === ShakashakaCellState.UNKNOWN && this.numbers.get(row, col) === null) {
                    unknowns.push({ row, col });
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Shakashaka Solver
// ============================================
export class ShakashakaSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from clue data
     * @param height Grid height
     * @param width Grid width
     * @param clues Map of "row,col" to number (0-4, or -1 for numberless black)
     */
    static fromClues(height, width, clues) {
        const field = new ShakashakaField(height, width);
        for (const [key, num] of clues) {
            const [row, col] = key.split(',').map(Number);
            field.setNumber(row, col, num);
        }
        return new ShakashakaSolver(field);
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
                    cloned.setNotBlack(pos.row, pos.col);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to NOT_BLACK`,
            },
        ];
    }
}
//# sourceMappingURL=shakashaka.js.map