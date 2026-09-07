/**
 * Geradeweg (Straight Loop) Solver
 *
 * Rules:
 * 1. Draw a single closed loop through the grid
 * 2. The loop passes through all white cells exactly once
 * 3. Each numbered circle indicates the length of the straight segment passing through it
 * 4. The loop can only go horizontally or vertically (no diagonals)
 * 5. Black cells are not part of the loop
 */
import { CellState, posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
import { LoopEdgeState } from './simpleloop.js';
// Alias WALL to EMPTY for this puzzle (WALL means loop doesn't pass through)
const LoopWallState = {
    ...LoopEdgeState,
    WALL: LoopEdgeState.EMPTY,
};
// ============================================
// Geradeweg Field State
// ============================================
export class GeradewegField {
    height;
    width;
    /** Cell states (UNKNOWN, WHITE = loop, BLACK = outside loop) */
    cells;
    /** Number clues (null = no clue, -1 = unknown number) */
    numbers;
    /** Horizontal walls (between col and col+1) */
    yokoWall;
    /** Vertical walls (between row and row+1) */
    tateWall;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.numbers = new Grid(height, width, () => null);
        this.yokoWall = new Grid(height, width - 1, () => LoopWallState.UNKNOWN);
        this.tateWall = new Grid(height - 1, width, () => LoopWallState.UNKNOWN);
    }
    /** Set a number clue (cell becomes WHITE automatically) */
    setNumber(row, col, num) {
        this.numbers.set(row, col, num);
        this.cells.set(row, col, CellState.WHITE);
    }
    /** Get number at position */
    getNumber(row, col) {
        return this.numbers.get(row, col);
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell state */
    setCell(row, col, state) {
        this.cells.set(row, col, state);
    }
    /** Get horizontal wall state */
    getYokoWall(row, col) {
        if (col < 0 || col >= this.width - 1)
            return LoopWallState.WALL;
        return this.yokoWall.get(row, col);
    }
    /** Get vertical wall state */
    getTateWall(row, col) {
        if (row < 0 || row >= this.height - 1)
            return LoopWallState.WALL;
        return this.tateWall.get(row, col);
    }
    /** Set horizontal wall */
    setYokoWall(row, col, state) {
        if (col >= 0 && col < this.width - 1) {
            this.yokoWall.set(row, col, state);
        }
    }
    /** Set vertical wall */
    setTateWall(row, col, state) {
        if (row >= 0 && row < this.height - 1) {
            this.tateWall.set(row, col, state);
        }
    }
    // ========== Constraint solving ==========
    /** White cells have 2 lines, black cells have 4 walls */
    nextSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                let wallCount = 0;
                let lineCount = 0;
                const wallUp = row === 0 ? LoopWallState.WALL : this.getTateWall(row - 1, col);
                const wallRight = col === this.width - 1 ? LoopWallState.WALL : this.getYokoWall(row, col);
                const wallDown = row === this.height - 1 ? LoopWallState.WALL : this.getTateWall(row, col);
                const wallLeft = col === 0 ? LoopWallState.WALL : this.getYokoWall(row, col - 1);
                if (wallUp === LoopWallState.WALL)
                    wallCount++;
                else if (wallUp === LoopWallState.LINE)
                    lineCount++;
                if (wallRight === LoopWallState.WALL)
                    wallCount++;
                else if (wallRight === LoopWallState.LINE)
                    lineCount++;
                if (wallDown === LoopWallState.WALL)
                    wallCount++;
                else if (wallDown === LoopWallState.LINE)
                    lineCount++;
                if (wallLeft === LoopWallState.WALL)
                    wallCount++;
                else if (wallLeft === LoopWallState.LINE)
                    lineCount++;
                const cell = this.cells.get(row, col);
                if (cell === CellState.UNKNOWN) {
                    // Unknown cell: can be white (2 lines) or black (4 walls)
                    if ((wallCount === 3 && lineCount === 1) || lineCount > 2) {
                        return false;
                    }
                    if (wallCount > 2) {
                        this.cells.set(row, col, CellState.BLACK);
                    }
                    else if (lineCount > 0) {
                        this.cells.set(row, col, CellState.WHITE);
                    }
                }
                if (this.cells.get(row, col) === CellState.BLACK) {
                    // Black cell: close all walls
                    if (lineCount > 0)
                        return false;
                    if (row > 0)
                        this.setTateWall(row - 1, col, LoopWallState.WALL);
                    if (col < this.width - 1)
                        this.setYokoWall(row, col, LoopWallState.WALL);
                    if (row < this.height - 1)
                        this.setTateWall(row, col, LoopWallState.WALL);
                    if (col > 0)
                        this.setYokoWall(row, col - 1, LoopWallState.WALL);
                }
                else if (this.cells.get(row, col) === CellState.WHITE) {
                    // White cell: exactly 2 lines
                    if (wallCount > 2 || lineCount > 2)
                        return false;
                    if (lineCount === 2) {
                        if (wallUp === LoopWallState.UNKNOWN)
                            this.setTateWall(row - 1, col, LoopWallState.WALL);
                        if (wallRight === LoopWallState.UNKNOWN)
                            this.setYokoWall(row, col, LoopWallState.WALL);
                        if (wallDown === LoopWallState.UNKNOWN)
                            this.setTateWall(row, col, LoopWallState.WALL);
                        if (wallLeft === LoopWallState.UNKNOWN)
                            this.setYokoWall(row, col - 1, LoopWallState.WALL);
                    }
                    else if (wallCount === 2) {
                        if (wallUp === LoopWallState.UNKNOWN)
                            this.setTateWall(row - 1, col, LoopWallState.LINE);
                        if (wallRight === LoopWallState.UNKNOWN)
                            this.setYokoWall(row, col, LoopWallState.LINE);
                        if (wallDown === LoopWallState.UNKNOWN)
                            this.setTateWall(row, col, LoopWallState.LINE);
                        if (wallLeft === LoopWallState.UNKNOWN)
                            this.setYokoWall(row, col - 1, LoopWallState.LINE);
                    }
                }
            }
        }
        return true;
    }
    /** Number constraint: segment length must equal the number */
    limitSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num === null)
                    continue;
                // Count possible segment lengths in each direction
                let upSpace = 0, upWhite = 0;
                let rightSpace = 0, rightWhite = 0;
                let downSpace = 0, downWhite = 0;
                let leftSpace = 0, leftWhite = 0;
                let upCounting = true, rightCounting = true, downCounting = true, leftCounting = true;
                // Up
                for (let r = row - 1; r >= 0; r--) {
                    if (this.getTateWall(r, col) === LoopWallState.WALL)
                        break;
                    if (this.getTateWall(r, col) !== LoopWallState.LINE)
                        upCounting = false;
                    if (upCounting)
                        upWhite++;
                    upSpace++;
                }
                // Right
                for (let c = col + 1; c < this.width; c++) {
                    if (this.getYokoWall(row, c - 1) === LoopWallState.WALL)
                        break;
                    if (this.getYokoWall(row, c - 1) !== LoopWallState.LINE)
                        rightCounting = false;
                    if (rightCounting)
                        rightWhite++;
                    rightSpace++;
                }
                // Down
                for (let r = row + 1; r < this.height; r++) {
                    if (this.getTateWall(r - 1, col) === LoopWallState.WALL)
                        break;
                    if (this.getTateWall(r - 1, col) !== LoopWallState.LINE)
                        downCounting = false;
                    if (downCounting)
                        downWhite++;
                    downSpace++;
                }
                // Left
                for (let c = col - 1; c >= 0; c--) {
                    if (this.getYokoWall(row, c) === LoopWallState.WALL)
                        break;
                    if (this.getYokoWall(row, c) !== LoopWallState.LINE)
                        leftCounting = false;
                    if (leftCounting)
                        leftWhite++;
                    leftSpace++;
                }
                const verticalSpace = upSpace + downSpace;
                const horizontalSpace = rightSpace + leftSpace;
                const verticalWhite = upWhite + downWhite;
                const horizontalWhite = rightWhite + leftWhite;
                const useNumber = num === -1 ?
                    (verticalSpace === verticalWhite ? verticalWhite :
                        horizontalSpace === horizontalWhite ? horizontalWhite : -1) : num;
                if (useNumber === -1)
                    continue;
                // Check if we can reach the number
                if (verticalSpace < useNumber && horizontalSpace < useNumber)
                    return false;
                if (verticalWhite > useNumber || horizontalWhite > useNumber)
                    return false;
                // If only one direction is possible, extend in that direction
                if (horizontalSpace === 0 || verticalWhite > 0) {
                    // Must be vertical
                    const fixedUp = useNumber - downSpace;
                    const fixedDown = useNumber - upSpace;
                    if (fixedUp > 0) {
                        for (let i = 1; i <= fixedUp; i++) {
                            if (row - i < 0 || this.getTateWall(row - i, col) === LoopWallState.WALL)
                                return false;
                            this.setTateWall(row - i, col, LoopWallState.LINE);
                        }
                    }
                    if (fixedDown > 0) {
                        for (let i = 1; i <= fixedDown; i++) {
                            if (row + i >= this.height || this.getTateWall(row + i - 1, col) === LoopWallState.WALL)
                                return false;
                            this.setTateWall(row + i - 1, col, LoopWallState.LINE);
                        }
                    }
                }
                if (verticalSpace === 0 || horizontalWhite > 0) {
                    // Must be horizontal
                    const fixedRight = useNumber - leftSpace;
                    const fixedLeft = useNumber - rightSpace;
                    if (fixedRight > 0) {
                        for (let i = 1; i <= fixedRight; i++) {
                            if (col + i >= this.width || this.getYokoWall(row, col + i - 1) === LoopWallState.WALL)
                                return false;
                            this.setYokoWall(row, col + i - 1, LoopWallState.LINE);
                        }
                    }
                    if (fixedLeft > 0) {
                        for (let i = 1; i <= fixedLeft; i++) {
                            if (col - i < 0 || this.getYokoWall(row, col - i) === LoopWallState.WALL)
                                return false;
                            this.setYokoWall(row, col - i, LoopWallState.LINE);
                        }
                    }
                }
                // If we've reached the limit, close off
                if (verticalWhite === useNumber) {
                    if (row - upWhite > 0)
                        this.setTateWall(row - upWhite - 1, col, LoopWallState.WALL);
                    if (row + downWhite < this.height - 1)
                        this.setTateWall(row + downWhite, col, LoopWallState.WALL);
                }
                if (horizontalWhite === useNumber) {
                    if (col + rightWhite < this.width - 1)
                        this.setYokoWall(row, col + rightWhite, LoopWallState.WALL);
                    if (col - leftWhite > 0)
                        this.setYokoWall(row, col - leftWhite - 1, LoopWallState.WALL);
                }
            }
        }
        return true;
    }
    /** Loop connectivity check */
    connectSolve() {
        const whitePosSet = new Set();
        const blackCandSet = new Set();
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cell = this.cells.get(row, col);
                const pos = { row, col };
                if (cell === CellState.WHITE) {
                    if (whitePosSet.size === 0) {
                        whitePosSet.add(posKey(pos));
                        this.collectConnected(pos, whitePosSet);
                    }
                    else if (!whitePosSet.has(posKey(pos))) {
                        return false;
                    }
                }
                else if (cell === CellState.UNKNOWN) {
                    blackCandSet.add(posKey(pos));
                }
            }
        }
        // Cells not reachable from white must be black
        for (const key of blackCandSet) {
            if (!whitePosSet.has(key)) {
                const [row, col] = key.split(',').map(Number);
                this.cells.set(row, col, CellState.BLACK);
            }
        }
        return true;
    }
    collectConnected(pos, visited) {
        const { row, col } = pos;
        if (row > 0 && this.getTateWall(row - 1, col) !== LoopWallState.WALL) {
            const next = { row: row - 1, col };
            const key = posKey(next);
            if (!visited.has(key)) {
                visited.add(key);
                this.collectConnected(next, visited);
            }
        }
        if (col < this.width - 1 && this.getYokoWall(row, col) !== LoopWallState.WALL) {
            const next = { row, col: col + 1 };
            const key = posKey(next);
            if (!visited.has(key)) {
                visited.add(key);
                this.collectConnected(next, visited);
            }
        }
        if (row < this.height - 1 && this.getTateWall(row, col) !== LoopWallState.WALL) {
            const next = { row: row + 1, col };
            const key = posKey(next);
            if (!visited.has(key)) {
                visited.add(key);
                this.collectConnected(next, visited);
            }
        }
        if (col > 0 && this.getYokoWall(row, col - 1) !== LoopWallState.WALL) {
            const next = { row, col: col - 1 };
            const key = posKey(next);
            if (!visited.has(key)) {
                visited.add(key);
                this.collectConnected(next, visited);
            }
        }
    }
    /** Parity check for loop crossings */
    oddSolve() {
        for (let row = 0; row < this.height - 1; row++) {
            let lineCount = 0;
            let hasUnknown = false;
            for (let col = 0; col < this.width; col++) {
                if (this.getTateWall(row, col) === LoopWallState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                else if (this.getTateWall(row, col) === LoopWallState.LINE) {
                    lineCount++;
                }
            }
            if (!hasUnknown && lineCount % 2 !== 0)
                return false;
        }
        for (let col = 0; col < this.width - 1; col++) {
            let lineCount = 0;
            let hasUnknown = false;
            for (let row = 0; row < this.height; row++) {
                if (this.getYokoWall(row, col) === LoopWallState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                else if (this.getYokoWall(row, col) === LoopWallState.LINE) {
                    lineCount++;
                }
            }
            if (!hasUnknown && lineCount % 2 !== 0)
                return false;
        }
        return true;
    }
    /** Must have at least one white cell */
    finalSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) !== CellState.BLACK)
                    return true;
            }
        }
        return false;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new GeradewegField(this.height, this.width);
        for (const [pos, cell] of this.cells.entries()) {
            cloned.cells.set(pos, cell);
        }
        for (const [pos, num] of this.numbers.entries()) {
            cloned.numbers.set(pos, num);
        }
        for (const [pos, wall] of this.yokoWall.entries()) {
            cloned.yokoWall.set(pos, wall);
        }
        for (const [pos, wall] of this.tateWall.entries()) {
            cloned.tateWall.set(pos, wall);
        }
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                dump += this.yokoWall.get(row, col);
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                dump += this.tateWall.get(row, col);
            }
        }
        return dump;
    }
    isSolved() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoWall.get(row, col) === LoopWallState.UNKNOWN)
                    return false;
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateWall.get(row, col) === LoopWallState.UNKNOWN)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const beforeDump = this.getStateDump();
            if (!this.nextSolve())
                return false;
            if (!this.limitSolve())
                return false;
            changed = this.getStateDump() !== beforeDump;
        }
        if (!this.oddSolve())
            return false;
        if (!this.connectSolve())
            return false;
        if (!this.finalSolve())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let cellLine = '';
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num !== null) {
                    cellLine += num === -1 ? '?' : (num < 10 ? String(num) : '+');
                }
                else {
                    const cell = this.cells.get(row, col);
                    cellLine += cell === CellState.BLACK ? '■' : cell === CellState.WHITE ? '·' : '?';
                }
                if (col < this.width - 1) {
                    const wall = this.yokoWall.get(row, col);
                    cellLine += wall === LoopWallState.WALL ? ' ' : wall === LoopWallState.LINE ? '─' : '?';
                }
            }
            lines.push(cellLine);
            if (row < this.height - 1) {
                let wallLine = '';
                for (let col = 0; col < this.width; col++) {
                    const wall = this.tateWall.get(row, col);
                    wallLine += wall === LoopWallState.WALL ? ' ' : wall === LoopWallState.LINE ? '│' : '?';
                    if (col < this.width - 1)
                        wallLine += ' ';
                }
                lines.push(wallLine);
            }
        }
        return lines.join('\n');
    }
    /** Get unknown walls for branching */
    getUnknownWalls() {
        const unknowns = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoWall.get(row, col) === LoopWallState.UNKNOWN) {
                    // Prioritize walls near determined cells
                    const leftCell = this.cells.get(row, col);
                    const rightCell = this.cells.get(row, col + 1);
                    if (leftCell !== CellState.UNKNOWN || rightCell !== CellState.UNKNOWN) {
                        unknowns.unshift({ type: 'h', row, col });
                    }
                    else {
                        unknowns.push({ type: 'h', row, col });
                    }
                }
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateWall.get(row, col) === LoopWallState.UNKNOWN) {
                    const upCell = this.cells.get(row, col);
                    const downCell = this.cells.get(row + 1, col);
                    if (upCell !== CellState.UNKNOWN || downCell !== CellState.UNKNOWN) {
                        unknowns.unshift({ type: 'v', row, col });
                    }
                    else {
                        unknowns.push({ type: 'v', row, col });
                    }
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Geradeweg Solver
// ============================================
export class GeradewegSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from puzzle string array */
    static fromString(height, width, puzzle) {
        const field = new GeradewegField(height, width);
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const ch = puzzle[row]?.[col];
                if (ch && ch >= '1' && ch <= '9') {
                    field.setNumber(row, col, parseInt(ch));
                }
                else if (ch && ch.toLowerCase() >= 'a' && ch.toLowerCase() <= 'f') {
                    field.setNumber(row, col, ch.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0) + 10);
                }
                else if (ch === '?') {
                    field.setNumber(row, col, -1);
                }
            }
        }
        return new GeradewegSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownWalls();
        if (unknowns.length === 0)
            return [];
        const wall = unknowns[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (wall.type === 'h') {
                        cloned.setYokoWall(wall.row, wall.col, LoopWallState.WALL);
                    }
                    else {
                        cloned.setTateWall(wall.row, wall.col, LoopWallState.WALL);
                    }
                    return cloned;
                },
                description: `Set wall at (${wall.row}, ${wall.col})`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (wall.type === 'h') {
                        cloned.setYokoWall(wall.row, wall.col, LoopWallState.LINE);
                    }
                    else {
                        cloned.setTateWall(wall.row, wall.col, LoopWallState.LINE);
                    }
                    return cloned;
                },
                description: `Set line at (${wall.row}, ${wall.col})`,
            },
        ];
    }
}
//# sourceMappingURL=geradeweg.js.map