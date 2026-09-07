/**
 * Hurdle Solver
 *
 * Rules:
 * 1. Place walls between cells to divide the grid into rooms
 * 2. Each cell has a number indicating the maximum visible range from that cell
 * 3. The number represents the count of consecutive cells (including itself)
 *    visible in at least one direction (up/right/down/left) until hitting a wall or edge
 * 4. Each cell must have exactly 2 walls around it (in the 4 orthogonal directions)
 * 5. All cells must remain connected (no isolated regions)
 */
import { Direction, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Wall State
// ============================================
export var HurdleWallState;
(function (HurdleWallState) {
    /** Unknown/undetermined */
    HurdleWallState["UNKNOWN"] = "unknown";
    /** Wall exists (blocks passage) */
    HurdleWallState["EXISTS"] = "exists";
    /** No wall (passage allowed) */
    HurdleWallState["NOT_EXISTS"] = "not_exists";
})(HurdleWallState || (HurdleWallState = {}));
// ============================================
// Hurdle Field State
// ============================================
export class HurdleField {
    height;
    width;
    /** Number hints for each cell (null = no hint) */
    numbers;
    /** Horizontal walls (between columns) - [row][col] is between (row,col) and (row,col+1) */
    yokoWall;
    /** Vertical walls (between rows) - [row][col] is between (row,col) and (row+1,col) */
    tateWall;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.numbers = new Grid(height, width, () => null);
        // Horizontal walls: height rows × (width-1) columns
        this.yokoWall = new Grid(height, width - 1, () => HurdleWallState.UNKNOWN);
        // Vertical walls: (height-1) rows × width columns
        this.tateWall = new Grid(height - 1, width, () => HurdleWallState.UNKNOWN);
    }
    /** Set number hint for a cell */
    setNumber(row, col, value) {
        this.numbers.set(row, col, value);
    }
    /** Get number hint for a cell */
    getNumber(row, col) {
        return this.numbers.get(row, col);
    }
    /** Get horizontal wall state */
    getYokoWall(row, col) {
        if (col < 0 || col >= this.width - 1)
            return HurdleWallState.UNKNOWN;
        return this.yokoWall.get(row, col);
    }
    /** Set horizontal wall state */
    setYokoWall(row, col, state) {
        this.yokoWall.set(row, col, state);
    }
    /** Get vertical wall state */
    getTateWall(row, col) {
        if (row < 0 || row >= this.height - 1)
            return HurdleWallState.UNKNOWN;
        return this.tateWall.get(row, col);
    }
    /** Set vertical wall state */
    setTateWall(row, col, state) {
        this.tateWall.set(row, col, state);
    }
    // ========== Constraint checking ==========
    /**
     * Number constraint: The number represents the maximum count of consecutive cells
     * visible in any direction until hitting a wall or edge
     */
    numberSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num === null)
                    continue;
                // Count visible cells in each direction
                let upBlackCnt = 0;
                let upCanSpaceCnt = 0;
                let rightBlackCnt = 0;
                let rightCanSpaceCnt = 0;
                let downBlackCnt = 0;
                let downCanSpaceCnt = 0;
                let leftBlackCnt = 0;
                let leftCanSpaceCnt = 0;
                // Up direction
                let idx = 0;
                while (row - idx >= 0) {
                    if (row - idx === 0) {
                        if (upBlackCnt === upCanSpaceCnt)
                            upBlackCnt++;
                        upCanSpaceCnt++;
                        break;
                    }
                    if (this.tateWall.get(row - 1 - idx, col) === HurdleWallState.NOT_EXISTS) {
                        break;
                    }
                    else {
                        if (this.tateWall.get(row - 1 - idx, col) === HurdleWallState.EXISTS && upBlackCnt === upCanSpaceCnt) {
                            upBlackCnt++;
                        }
                        upCanSpaceCnt++;
                    }
                    idx++;
                }
                // Right direction
                idx = 0;
                while (col + idx <= this.width - 1) {
                    if (col + idx === this.width - 1) {
                        if (rightBlackCnt === rightCanSpaceCnt)
                            rightBlackCnt++;
                        rightCanSpaceCnt++;
                        break;
                    }
                    if (this.yokoWall.get(row, col + idx) === HurdleWallState.NOT_EXISTS) {
                        break;
                    }
                    else {
                        if (this.yokoWall.get(row, col + idx) === HurdleWallState.EXISTS && rightBlackCnt === rightCanSpaceCnt) {
                            rightBlackCnt++;
                        }
                        rightCanSpaceCnt++;
                    }
                    idx++;
                }
                // Down direction
                idx = 0;
                while (row + idx <= this.height - 1) {
                    if (row + idx === this.height - 1) {
                        if (downBlackCnt === downCanSpaceCnt)
                            downBlackCnt++;
                        downCanSpaceCnt++;
                        break;
                    }
                    if (this.tateWall.get(row + idx, col) === HurdleWallState.NOT_EXISTS) {
                        break;
                    }
                    else {
                        if (this.tateWall.get(row + idx, col) === HurdleWallState.EXISTS && downBlackCnt === downCanSpaceCnt) {
                            downBlackCnt++;
                        }
                        downCanSpaceCnt++;
                    }
                    idx++;
                }
                // Left direction
                idx = 0;
                while (col - idx >= 0) {
                    if (col - idx === 0) {
                        if (leftBlackCnt === leftCanSpaceCnt)
                            leftBlackCnt++;
                        leftCanSpaceCnt++;
                        break;
                    }
                    if (this.yokoWall.get(row, col - 1 - idx) === HurdleWallState.NOT_EXISTS) {
                        break;
                    }
                    else {
                        if (this.yokoWall.get(row, col - 1 - idx) === HurdleWallState.EXISTS && leftBlackCnt === leftCanSpaceCnt) {
                            leftBlackCnt++;
                        }
                        leftCanSpaceCnt++;
                    }
                    idx++;
                }
                // Check contradictions
                if (num < upBlackCnt || num < rightBlackCnt || num < downBlackCnt || num < leftBlackCnt) {
                    return false;
                }
                if (num > upCanSpaceCnt && num > rightCanSpaceCnt && num > downCanSpaceCnt && num > leftCanSpaceCnt) {
                    return false;
                }
                // If count matches in a direction, place NOT_EXISTS wall after
                if (num === upBlackCnt) {
                    if (row - 1 - num >= 0) {
                        this.tateWall.set(row - 1 - num, col, HurdleWallState.NOT_EXISTS);
                    }
                }
                if (num === rightBlackCnt) {
                    if (col + num < this.width - 1) {
                        this.yokoWall.set(row, col + num, HurdleWallState.NOT_EXISTS);
                    }
                }
                if (num === downBlackCnt) {
                    if (row + num < this.height - 1) {
                        this.tateWall.set(row + num, col, HurdleWallState.NOT_EXISTS);
                    }
                }
                if (num === leftBlackCnt) {
                    if (col - 1 - num >= 0) {
                        this.yokoWall.set(row, col - 1 - num, HurdleWallState.NOT_EXISTS);
                    }
                }
                // If only one direction can satisfy the number, fill that direction
                idx = 0;
                if (num === upCanSpaceCnt && num > rightCanSpaceCnt && num > downCanSpaceCnt && num > leftCanSpaceCnt) {
                    while (row - 1 - idx >= 0) {
                        if (this.tateWall.get(row - 1 - idx, col) !== HurdleWallState.NOT_EXISTS) {
                            this.tateWall.set(row - 1 - idx, col, HurdleWallState.EXISTS);
                        }
                        else {
                            break;
                        }
                        idx++;
                    }
                }
                else if (num > upCanSpaceCnt && num === rightCanSpaceCnt && num > downCanSpaceCnt && num > leftCanSpaceCnt) {
                    while (col + idx < this.width - 1) {
                        if (this.yokoWall.get(row, col + idx) !== HurdleWallState.NOT_EXISTS) {
                            this.yokoWall.set(row, col + idx, HurdleWallState.EXISTS);
                        }
                        else {
                            break;
                        }
                        idx++;
                    }
                }
                else if (num > upCanSpaceCnt && num > rightCanSpaceCnt && num === downCanSpaceCnt && num > leftCanSpaceCnt) {
                    while (row + idx < this.height - 1) {
                        if (this.tateWall.get(row + idx, col) !== HurdleWallState.NOT_EXISTS) {
                            this.tateWall.set(row + idx, col, HurdleWallState.EXISTS);
                        }
                        else {
                            break;
                        }
                        idx++;
                    }
                }
                else if (num > upCanSpaceCnt && num > rightCanSpaceCnt && num > downCanSpaceCnt && num === leftCanSpaceCnt) {
                    while (col - 1 - idx >= 0) {
                        if (this.yokoWall.get(row, col - 1 - idx) !== HurdleWallState.NOT_EXISTS) {
                            this.yokoWall.set(row, col - 1 - idx, HurdleWallState.EXISTS);
                        }
                        else {
                            break;
                        }
                        idx++;
                    }
                }
            }
        }
        return true;
    }
    /**
     * Cell constraint: Each cell must have exactly 2 walls around it
     */
    masuSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                let existsCount = 0;
                let notExistsCount = 0;
                // Up wall
                const wallUp = row === 0 ? HurdleWallState.EXISTS : this.tateWall.get(row - 1, col);
                if (wallUp === HurdleWallState.EXISTS)
                    existsCount++;
                else if (wallUp === HurdleWallState.NOT_EXISTS)
                    notExistsCount++;
                // Right wall
                const wallRight = col === this.width - 1 ? HurdleWallState.EXISTS : this.yokoWall.get(row, col);
                if (wallRight === HurdleWallState.EXISTS)
                    existsCount++;
                else if (wallRight === HurdleWallState.NOT_EXISTS)
                    notExistsCount++;
                // Down wall
                const wallDown = row === this.height - 1 ? HurdleWallState.EXISTS : this.tateWall.get(row, col);
                if (wallDown === HurdleWallState.EXISTS)
                    existsCount++;
                else if (wallDown === HurdleWallState.NOT_EXISTS)
                    notExistsCount++;
                // Left wall
                const wallLeft = col === 0 ? HurdleWallState.EXISTS : this.yokoWall.get(row, col - 1);
                if (wallLeft === HurdleWallState.EXISTS)
                    existsCount++;
                else if (wallLeft === HurdleWallState.NOT_EXISTS)
                    notExistsCount++;
                // Check contradictions
                if (existsCount > 2 || notExistsCount > 2) {
                    return false;
                }
                // If 2 walls exist, mark remaining as NOT_EXISTS
                if (existsCount === 2) {
                    if (wallUp === HurdleWallState.UNKNOWN) {
                        this.tateWall.set(row - 1, col, HurdleWallState.NOT_EXISTS);
                    }
                    if (wallRight === HurdleWallState.UNKNOWN) {
                        this.yokoWall.set(row, col, HurdleWallState.NOT_EXISTS);
                    }
                    if (wallDown === HurdleWallState.UNKNOWN) {
                        this.tateWall.set(row, col, HurdleWallState.NOT_EXISTS);
                    }
                    if (wallLeft === HurdleWallState.UNKNOWN) {
                        this.yokoWall.set(row, col - 1, HurdleWallState.NOT_EXISTS);
                    }
                }
                // If 2 NOT_EXISTS, mark remaining as EXISTS
                else if (notExistsCount === 2) {
                    if (wallUp === HurdleWallState.UNKNOWN) {
                        this.tateWall.set(row - 1, col, HurdleWallState.EXISTS);
                    }
                    if (wallRight === HurdleWallState.UNKNOWN) {
                        this.yokoWall.set(row, col, HurdleWallState.EXISTS);
                    }
                    if (wallDown === HurdleWallState.UNKNOWN) {
                        this.tateWall.set(row, col, HurdleWallState.EXISTS);
                    }
                    if (wallLeft === HurdleWallState.UNKNOWN) {
                        this.yokoWall.set(row, col - 1, HurdleWallState.EXISTS);
                    }
                }
            }
        }
        return true;
    }
    /**
     * Connectivity constraint: All cells must be connected (no walls can isolate regions)
     */
    connectSolve() {
        const whitePosSet = new Set();
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const pos = { row, col };
                if (whitePosSet.size === 0) {
                    whitePosSet.add(posKey(pos));
                    this.setContinuePosSet(pos, whitePosSet, null);
                }
                else {
                    if (!whitePosSet.has(posKey(pos))) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    /**
     * Recursively add connected cells to the set (flood fill)
     */
    setContinuePosSet(pos, continuePosSet, from) {
        // Up
        if (pos.row !== 0 && from !== Direction.UP) {
            const nextPos = { row: pos.row - 1, col: pos.col };
            if (this.tateWall.get(pos.row - 1, pos.col) !== HurdleWallState.EXISTS && !continuePosSet.has(posKey(nextPos))) {
                continuePosSet.add(posKey(nextPos));
                this.setContinuePosSet(nextPos, continuePosSet, Direction.DOWN);
            }
        }
        // Right
        if (pos.col !== this.width - 1 && from !== Direction.RIGHT) {
            const nextPos = { row: pos.row, col: pos.col + 1 };
            if (this.yokoWall.get(pos.row, pos.col) !== HurdleWallState.EXISTS && !continuePosSet.has(posKey(nextPos))) {
                continuePosSet.add(posKey(nextPos));
                this.setContinuePosSet(nextPos, continuePosSet, Direction.LEFT);
            }
        }
        // Down
        if (pos.row !== this.height - 1 && from !== Direction.DOWN) {
            const nextPos = { row: pos.row + 1, col: pos.col };
            if (this.tateWall.get(pos.row, pos.col) !== HurdleWallState.EXISTS && !continuePosSet.has(posKey(nextPos))) {
                continuePosSet.add(posKey(nextPos));
                this.setContinuePosSet(nextPos, continuePosSet, Direction.UP);
            }
        }
        // Left
        if (pos.col !== 0 && from !== Direction.LEFT) {
            const nextPos = { row: pos.row, col: pos.col - 1 };
            if (this.yokoWall.get(pos.row, pos.col - 1) !== HurdleWallState.EXISTS && !continuePosSet.has(posKey(nextPos))) {
                continuePosSet.add(posKey(nextPos));
                this.setContinuePosSet(nextPos, continuePosSet, Direction.RIGHT);
            }
        }
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new HurdleField(this.height, this.width);
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
        return `Y:${this.yokoWall.dump()}|T:${this.tateWall.dump()}`;
    }
    isSolved() {
        // All walls must be determined
        for (const [, wall] of this.yokoWall.entries()) {
            if (wall === HurdleWallState.UNKNOWN)
                return false;
        }
        for (const [, wall] of this.tateWall.entries()) {
            if (wall === HurdleWallState.UNKNOWN)
                return false;
        }
        // Check all constraints
        return this.solveAndCheck();
    }
    solveAndCheck() {
        const beforeState = this.getStateDump();
        if (!this.numberSolve())
            return false;
        if (!this.masuSolve())
            return false;
        // If state changed, recursively continue
        if (this.getStateDump() !== beforeState) {
            return this.solveAndCheck();
        }
        // Check connectivity
        if (!this.connectSolve())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        // Top border
        let line = '□';
        for (let col = 0; col < this.width * 2 - 1; col++) {
            line += '□';
        }
        lines.push(line);
        for (let row = 0; row < this.height; row++) {
            // Cell row
            line = '□';
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                line += num !== null ? num.toString() : '　';
                if (col < this.width - 1) {
                    const wall = this.yokoWall.get(row, col);
                    line += wall === HurdleWallState.EXISTS ? '|' : wall === HurdleWallState.NOT_EXISTS ? '·' : ' ';
                }
            }
            line += '□';
            lines.push(line);
            // Wall row (if not last row)
            if (row < this.height - 1) {
                line = '□';
                for (let col = 0; col < this.width; col++) {
                    const wall = this.tateWall.get(row, col);
                    line += wall === HurdleWallState.EXISTS ? '-' : wall === HurdleWallState.NOT_EXISTS ? '·' : ' ';
                    if (col < this.width - 1) {
                        line += '□';
                    }
                }
                line += '□';
                lines.push(line);
            }
        }
        // Bottom border
        line = '□';
        for (let col = 0; col < this.width * 2 - 1; col++) {
            line += '□';
        }
        lines.push(line);
        return lines.join('\n');
    }
    /** Get unknown walls for branching */
    getUnknownWalls() {
        const unknowns = [];
        for (const [pos, wall] of this.yokoWall.entries()) {
            if (wall === HurdleWallState.UNKNOWN) {
                unknowns.push({ type: 'yoko', row: pos.row, col: pos.col });
            }
        }
        for (const [pos, wall] of this.tateWall.entries()) {
            if (wall === HurdleWallState.UNKNOWN) {
                unknowns.push({ type: 'tate', row: pos.row, col: pos.col });
            }
        }
        return unknowns;
    }
}
// ============================================
// Hurdle Solver
// ============================================
export class HurdleSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from number grid
     * @param numbers 2D array of numbers (null for no hint)
     */
    static fromNumbers(numbers) {
        const height = numbers.length;
        const width = numbers[0].length;
        const field = new HurdleField(height, width);
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                field.setNumber(row, col, numbers[row][col]);
            }
        }
        return new HurdleSolver(field);
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
                    if (wall.type === 'yoko') {
                        cloned.setYokoWall(wall.row, wall.col, HurdleWallState.EXISTS);
                    }
                    else {
                        cloned.setTateWall(wall.row, wall.col, HurdleWallState.EXISTS);
                    }
                    return cloned;
                },
                description: `Set ${wall.type} wall at (${wall.row}, ${wall.col}) to EXISTS`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (wall.type === 'yoko') {
                        cloned.setYokoWall(wall.row, wall.col, HurdleWallState.NOT_EXISTS);
                    }
                    else {
                        cloned.setTateWall(wall.row, wall.col, HurdleWallState.NOT_EXISTS);
                    }
                    return cloned;
                },
                description: `Set ${wall.type} wall at (${wall.row}, ${wall.col}) to NOT_EXISTS`,
            },
        ];
    }
}
//# sourceMappingURL=hurdle.js.map