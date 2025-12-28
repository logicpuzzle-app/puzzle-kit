/**
 * Loopsp (Loop Special) Solver
 *
 * Rules:
 * 1. Draw loops through the grid using walls between cells
 * 2. Each cell is either:
 *    - A number cell: has exactly 2 walls (part of the loop boundary)
 *    - A non-number cell: has 0 or 2 walls (inside or outside the loop)
 * 3. Cells with the same number must be in the same loop
 * 4. Cells with different numbers must be in different loops
 * 5. Each loop must contain at least one number
 * 6. Each row/column must have an even number of non-walls (loop crossings)
 * 7. Special cells (g-m) define specific wall patterns:
 *    - g: no walls (all 4 directions open)
 *    - h: horizontal walls only (left/right blocked, up/down open)
 *    - i: vertical walls only (up/down blocked, left/right open)
 *    - j: L-shape (left blocked, right open, up open, down blocked)
 *    - k: L-shape (left open, right blocked, up open, down blocked)
 *    - l: L-shape (left open, right blocked, up blocked, down open)
 *    - m: L-shape (left blocked, right open, up blocked, down open)
 */
import { Direction, posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Loopsp Types
// ============================================
/** Wall state between cells */
export var LoopspWallState;
(function (LoopspWallState) {
    /** Unknown/undetermined */
    LoopspWallState["SPACE"] = "space";
    /** Wall exists (blocks passage) */
    LoopspWallState["EXISTS"] = "exists";
    /** No wall (allows passage) */
    LoopspWallState["NOT_EXISTS"] = "not_exists";
})(LoopspWallState || (LoopspWallState = {}));
// ============================================
// Loopsp Field State
// ============================================
export class LoopspField {
    height;
    width;
    /** Number clues - null means no number, -1 means any number (wildcard) */
    numbers;
    /** Horizontal walls (between col and col+1) */
    yokoWall;
    /** Vertical walls (between row and row+1) */
    tateWall;
    /** Cells that had initial constraints (for display) */
    firstPosSet;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.numbers = new Grid(height, width, () => null);
        // Horizontal walls: height rows, (width-1) walls per row
        this.yokoWall = new Grid(height, width - 1, () => LoopspWallState.SPACE);
        // Vertical walls: (height-1) rows, width walls per row
        this.tateWall = new Grid(height - 1, width, () => LoopspWallState.SPACE);
        this.firstPosSet = new Set();
    }
    /** Set a number clue at position */
    setNumber(row, col, num) {
        this.numbers.set(row, col, num);
    }
    /** Get number at position */
    getNumber(row, col) {
        return this.numbers.get(row, col);
    }
    /** Get horizontal wall state */
    getYokoWall(row, col) {
        if (col < 0 || col >= this.width - 1)
            return LoopspWallState.SPACE;
        return this.yokoWall.get(row, col);
    }
    /** Get vertical wall state */
    getTateWall(row, col) {
        if (row < 0 || row >= this.height - 1)
            return LoopspWallState.SPACE;
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
    /** Set special cell pattern */
    setSpecialCell(row, col, pattern) {
        this.firstPosSet.add(posKey({ row, col }));
        switch (pattern) {
            case 'g': // No walls (all open)
                if (col > 0)
                    this.setYokoWall(row, col - 1, LoopspWallState.NOT_EXISTS);
                if (col < this.width - 1)
                    this.setYokoWall(row, col, LoopspWallState.NOT_EXISTS);
                if (row > 0)
                    this.setTateWall(row - 1, col, LoopspWallState.NOT_EXISTS);
                if (row < this.height - 1)
                    this.setTateWall(row, col, LoopspWallState.NOT_EXISTS);
                break;
            case 'h': // Horizontal walls (left/right blocked)
                if (col > 0)
                    this.setYokoWall(row, col - 1, LoopspWallState.EXISTS);
                if (col < this.width - 1)
                    this.setYokoWall(row, col, LoopspWallState.EXISTS);
                if (row > 0)
                    this.setTateWall(row - 1, col, LoopspWallState.NOT_EXISTS);
                if (row < this.height - 1)
                    this.setTateWall(row, col, LoopspWallState.NOT_EXISTS);
                break;
            case 'i': // Vertical walls (up/down blocked)
                if (col > 0)
                    this.setYokoWall(row, col - 1, LoopspWallState.NOT_EXISTS);
                if (col < this.width - 1)
                    this.setYokoWall(row, col, LoopspWallState.NOT_EXISTS);
                if (row > 0)
                    this.setTateWall(row - 1, col, LoopspWallState.EXISTS);
                if (row < this.height - 1)
                    this.setTateWall(row, col, LoopspWallState.EXISTS);
                break;
            case 'j': // L-shape: left blocked, down blocked
                if (col > 0)
                    this.setYokoWall(row, col - 1, LoopspWallState.EXISTS);
                if (col < this.width - 1)
                    this.setYokoWall(row, col, LoopspWallState.NOT_EXISTS);
                if (row > 0)
                    this.setTateWall(row - 1, col, LoopspWallState.NOT_EXISTS);
                if (row < this.height - 1)
                    this.setTateWall(row, col, LoopspWallState.EXISTS);
                break;
            case 'k': // L-shape: right blocked, down blocked
                if (col > 0)
                    this.setYokoWall(row, col - 1, LoopspWallState.NOT_EXISTS);
                if (col < this.width - 1)
                    this.setYokoWall(row, col, LoopspWallState.EXISTS);
                if (row > 0)
                    this.setTateWall(row - 1, col, LoopspWallState.NOT_EXISTS);
                if (row < this.height - 1)
                    this.setTateWall(row, col, LoopspWallState.EXISTS);
                break;
            case 'l': // L-shape: right blocked, up blocked
                if (col > 0)
                    this.setYokoWall(row, col - 1, LoopspWallState.NOT_EXISTS);
                if (col < this.width - 1)
                    this.setYokoWall(row, col, LoopspWallState.EXISTS);
                if (row > 0)
                    this.setTateWall(row - 1, col, LoopspWallState.EXISTS);
                if (row < this.height - 1)
                    this.setTateWall(row, col, LoopspWallState.NOT_EXISTS);
                break;
            case 'm': // L-shape: left blocked, up blocked
                if (col > 0)
                    this.setYokoWall(row, col - 1, LoopspWallState.EXISTS);
                if (col < this.width - 1)
                    this.setYokoWall(row, col, LoopspWallState.NOT_EXISTS);
                if (row > 0)
                    this.setTateWall(row - 1, col, LoopspWallState.EXISTS);
                if (row < this.height - 1)
                    this.setTateWall(row, col, LoopspWallState.NOT_EXISTS);
                break;
        }
    }
    // ========== Constraint solving ==========
    /**
     * Number cells have exactly 2 walls, non-number cells have 0 or 2 walls
     */
    nextSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                let existsCount = 0;
                let notExistsCount = 0;
                const wallUp = row === 0 ? LoopspWallState.EXISTS : this.getTateWall(row - 1, col);
                if (wallUp === LoopspWallState.EXISTS)
                    existsCount++;
                else if (wallUp === LoopspWallState.NOT_EXISTS)
                    notExistsCount++;
                const wallRight = col === this.width - 1 ? LoopspWallState.EXISTS : this.getYokoWall(row, col);
                if (wallRight === LoopspWallState.EXISTS)
                    existsCount++;
                else if (wallRight === LoopspWallState.NOT_EXISTS)
                    notExistsCount++;
                const wallDown = row === this.height - 1 ? LoopspWallState.EXISTS : this.getTateWall(row, col);
                if (wallDown === LoopspWallState.EXISTS)
                    existsCount++;
                else if (wallDown === LoopspWallState.NOT_EXISTS)
                    notExistsCount++;
                const wallLeft = col === 0 ? LoopspWallState.EXISTS : this.getYokoWall(row, col - 1);
                if (wallLeft === LoopspWallState.EXISTS)
                    existsCount++;
                else if (wallLeft === LoopspWallState.NOT_EXISTS)
                    notExistsCount++;
                const isNumberCell = this.numbers.get(row, col) !== null;
                if (isNumberCell) {
                    // Number cells must have exactly 2 walls
                    if (existsCount > 2 || notExistsCount > 2)
                        return false;
                    if (notExistsCount === 2) {
                        // Already have 2 non-walls, rest must be walls
                        if (wallUp === LoopspWallState.SPACE)
                            this.setTateWall(row - 1, col, LoopspWallState.EXISTS);
                        if (wallRight === LoopspWallState.SPACE)
                            this.setYokoWall(row, col, LoopspWallState.EXISTS);
                        if (wallDown === LoopspWallState.SPACE)
                            this.setTateWall(row, col, LoopspWallState.EXISTS);
                        if (wallLeft === LoopspWallState.SPACE)
                            this.setYokoWall(row, col - 1, LoopspWallState.EXISTS);
                    }
                    else if (existsCount === 2) {
                        // Already have 2 walls, rest must be non-walls
                        if (wallUp === LoopspWallState.SPACE)
                            this.setTateWall(row - 1, col, LoopspWallState.NOT_EXISTS);
                        if (wallRight === LoopspWallState.SPACE)
                            this.setYokoWall(row, col, LoopspWallState.NOT_EXISTS);
                        if (wallDown === LoopspWallState.SPACE)
                            this.setTateWall(row, col, LoopspWallState.NOT_EXISTS);
                        if (wallLeft === LoopspWallState.SPACE)
                            this.setYokoWall(row, col - 1, LoopspWallState.NOT_EXISTS);
                    }
                }
                else {
                    // Non-number cells: 0 or 2 walls
                    if (existsCount > 2 || (notExistsCount === 3 && existsCount === 1))
                        return false;
                    if (existsCount === 2) {
                        // Have 2 walls, rest must be non-walls
                        if (wallUp === LoopspWallState.SPACE)
                            this.setTateWall(row - 1, col, LoopspWallState.NOT_EXISTS);
                        if (wallRight === LoopspWallState.SPACE)
                            this.setYokoWall(row, col, LoopspWallState.NOT_EXISTS);
                        if (wallDown === LoopspWallState.SPACE)
                            this.setTateWall(row, col, LoopspWallState.NOT_EXISTS);
                        if (wallLeft === LoopspWallState.SPACE)
                            this.setYokoWall(row, col - 1, LoopspWallState.NOT_EXISTS);
                    }
                    else if (existsCount === 1 && notExistsCount === 2) {
                        // Have 1 wall and 2 non-walls, last must be wall
                        if (wallUp === LoopspWallState.SPACE)
                            this.setTateWall(row - 1, col, LoopspWallState.EXISTS);
                        if (wallRight === LoopspWallState.SPACE)
                            this.setYokoWall(row, col, LoopspWallState.EXISTS);
                        if (wallDown === LoopspWallState.SPACE)
                            this.setTateWall(row, col, LoopspWallState.EXISTS);
                        if (wallLeft === LoopspWallState.SPACE)
                            this.setYokoWall(row, col - 1, LoopspWallState.EXISTS);
                    }
                    else if (notExistsCount === 3) {
                        // Have 3 non-walls, last must be non-wall
                        if (wallUp === LoopspWallState.SPACE)
                            this.setTateWall(row - 1, col, LoopspWallState.NOT_EXISTS);
                        if (wallRight === LoopspWallState.SPACE)
                            this.setYokoWall(row, col, LoopspWallState.NOT_EXISTS);
                        if (wallDown === LoopspWallState.SPACE)
                            this.setTateWall(row, col, LoopspWallState.NOT_EXISTS);
                        if (wallLeft === LoopspWallState.SPACE)
                            this.setYokoWall(row, col - 1, LoopspWallState.NOT_EXISTS);
                    }
                }
            }
        }
        return true;
    }
    /**
     * Same numbers must be in same loop, different numbers in different loops
     * Returns false if: different numbers in same loop, same numbers in different loops, or loop has no numbers
     */
    connectSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const originPos = { row, col };
                // Skip cells that can't be loop starting points (no walls determined yet)
                let existsCount = 0;
                const wallUp = row === 0 ? LoopspWallState.EXISTS : this.getTateWall(row - 1, col);
                if (wallUp === LoopspWallState.EXISTS)
                    existsCount++;
                const wallRight = col === this.width - 1 ? LoopspWallState.EXISTS : this.getYokoWall(row, col);
                if (wallRight === LoopspWallState.EXISTS)
                    existsCount++;
                const wallDown = row === this.height - 1 ? LoopspWallState.EXISTS : this.getTateWall(row, col);
                if (wallDown === LoopspWallState.EXISTS)
                    existsCount++;
                const wallLeft = col === 0 ? LoopspWallState.EXISTS : this.getYokoWall(row, col - 1);
                if (wallLeft === LoopspWallState.EXISTS)
                    existsCount++;
                if (existsCount === 0)
                    continue;
                const number = this.numbers.get(row, col) ?? 0;
                const continuePosSet = new Set();
                continuePosSet.add(posKey(originPos));
                if (!this.setContinuePosSet(number, originPos, originPos, continuePosSet, null)) {
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * Trace path from pos, following non-walls, checking number consistency
     */
    setContinuePosSet(number, originPos, pos, continuePosSet, from) {
        const { row, col } = pos;
        // Try to continue in straight line first (prioritize straight paths)
        if (row > 0 && from === Direction.DOWN && this.getTateWall(row - 1, col) === LoopspWallState.NOT_EXISTS) {
            return this.moveToNext(number, originPos, { row: row - 1, col }, continuePosSet, Direction.DOWN);
        }
        else if (col < this.width - 1 &&
            from === Direction.LEFT &&
            this.getYokoWall(row, col) === LoopspWallState.NOT_EXISTS) {
            return this.moveToNext(number, originPos, { row, col: col + 1 }, continuePosSet, Direction.LEFT);
        }
        else if (row < this.height - 1 &&
            from === Direction.UP &&
            this.getTateWall(row, col) === LoopspWallState.NOT_EXISTS) {
            return this.moveToNext(number, originPos, { row: row + 1, col }, continuePosSet, Direction.UP);
        }
        else if (col > 0 && from === Direction.RIGHT && this.getYokoWall(row, col - 1) === LoopspWallState.NOT_EXISTS) {
            return this.moveToNext(number, originPos, { row, col: col - 1 }, continuePosSet, Direction.RIGHT);
        }
        else {
            // Can't continue straight - check if straight is still possible
            if (row > 0 && from === Direction.DOWN && this.getTateWall(row - 1, col) !== LoopspWallState.EXISTS) {
                return true;
            }
            else if (col < this.width - 1 &&
                from === Direction.LEFT &&
                this.getYokoWall(row, col) !== LoopspWallState.EXISTS) {
                return true;
            }
            else if (row < this.height - 1 &&
                from === Direction.UP &&
                this.getTateWall(row, col) !== LoopspWallState.EXISTS) {
                return true;
            }
            else if (col > 0 && from === Direction.RIGHT && this.getYokoWall(row, col - 1) !== LoopspWallState.EXISTS) {
                return true;
            }
            else {
                // Try curves
                if (row > 0 && from !== Direction.UP && this.getTateWall(row - 1, col) === LoopspWallState.NOT_EXISTS) {
                    return this.moveToNext(number, originPos, { row: row - 1, col }, continuePosSet, Direction.DOWN);
                }
                else if (col < this.width - 1 &&
                    from !== Direction.RIGHT &&
                    this.getYokoWall(row, col) === LoopspWallState.NOT_EXISTS) {
                    return this.moveToNext(number, originPos, { row, col: col + 1 }, continuePosSet, Direction.LEFT);
                }
                else if (row < this.height - 1 &&
                    from !== Direction.DOWN &&
                    this.getTateWall(row, col) === LoopspWallState.NOT_EXISTS) {
                    return this.moveToNext(number, originPos, { row: row + 1, col }, continuePosSet, Direction.UP);
                }
                else if (col > 0 &&
                    from !== Direction.LEFT &&
                    this.getYokoWall(row, col - 1) === LoopspWallState.NOT_EXISTS) {
                    return this.moveToNext(number, originPos, { row, col: col - 1 }, continuePosSet, Direction.RIGHT);
                }
                return true;
            }
        }
    }
    /**
     * Helper to move to next position and check number consistency
     */
    moveToNext(number, originPos, nextPos, continuePosSet, from) {
        const nextNum = this.numbers.get(nextPos.row, nextPos.col);
        // Update current number if we encounter a new one
        let currentNumber = number;
        if (nextNum !== null) {
            if (currentNumber <= 0) {
                currentNumber = nextNum;
            }
            else if (nextNum !== -1 && nextNum !== currentNumber) {
                // Different number encountered - contradiction
                return false;
            }
        }
        // Check if we've returned to origin
        if (originPos.row === nextPos.row && originPos.col === nextPos.col) {
            return this.isAllCollect(currentNumber, continuePosSet);
        }
        continuePosSet.add(posKey(nextPos));
        return this.setContinuePosSet(currentNumber, originPos, nextPos, continuePosSet, from);
    }
    /**
     * Check if all cells with the given number are collected in the loop
     */
    isAllCollect(number, continuePosSet) {
        if (number === 0)
            return false; // Loop must contain at least one number
        if (number !== -1) {
            // Check all cells with this number are in the loop
            for (let targetRow = 0; targetRow < this.height; targetRow++) {
                for (let targetCol = 0; targetCol < this.width; targetCol++) {
                    const cellNum = this.numbers.get(targetRow, targetCol);
                    if (cellNum !== null && cellNum === number) {
                        if (!continuePosSet.has(posKey({ row: targetRow, col: targetCol }))) {
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    }
    /**
     * Each row/column must have even number of non-walls (parity check)
     */
    oddSolve() {
        // Check horizontal walls (vertical crossing count)
        for (let row = 0; row < this.height - 1; row++) {
            let notExistsCount = 0;
            let hasSpace = false;
            for (let col = 0; col < this.width; col++) {
                const wall = this.tateWall.get(row, col);
                if (wall === LoopspWallState.SPACE) {
                    hasSpace = true;
                    break;
                }
                else if (wall === LoopspWallState.NOT_EXISTS) {
                    notExistsCount++;
                }
            }
            if (!hasSpace && notExistsCount % 2 !== 0)
                return false;
        }
        // Check vertical walls (horizontal crossing count)
        for (let col = 0; col < this.width - 1; col++) {
            let notExistsCount = 0;
            let hasSpace = false;
            for (let row = 0; row < this.height; row++) {
                const wall = this.yokoWall.get(row, col);
                if (wall === LoopspWallState.SPACE) {
                    hasSpace = true;
                    break;
                }
                else if (wall === LoopspWallState.NOT_EXISTS) {
                    notExistsCount++;
                }
            }
            if (!hasSpace && notExistsCount % 2 !== 0)
                return false;
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new LoopspField(this.height, this.width);
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                cloned.numbers.set(row, col, this.numbers.get(row, col));
            }
        }
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
        cloned.firstPosSet = new Set(this.firstPosSet);
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
        // All walls must be determined
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoWall.get(row, col) === LoopspWallState.SPACE)
                    return false;
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateWall.get(row, col) === LoopspWallState.SPACE)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        if (!this.nextSolve())
            return false;
        if (!this.oddSolve())
            return false;
        if (!this.connectSolve())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        const halfNums = '0123456789';
        const fullNums = '０１２３４５６７８９';
        // Top border
        for (let col = 0; col < this.width * 2 + 1; col++) {
            lines.push('□');
        }
        lines.push('\n');
        for (let row = 0; row < this.height; row++) {
            lines.push('□');
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num !== null) {
                    if (num > 99) {
                        lines.push('99');
                    }
                    else if (num === -1) {
                        lines.push('？');
                    }
                    else {
                        const numStr = String(num);
                        const index = halfNums.indexOf(numStr);
                        if (index >= 0) {
                            lines.push(fullNums[index]);
                        }
                        else {
                            lines.push(numStr.padStart(2, ' '));
                        }
                    }
                }
                else {
                    lines.push('　');
                }
                if (col < this.width - 1) {
                    const wall = this.yokoWall.get(row, col);
                    lines.push(wall === LoopspWallState.EXISTS ? '□' : wall === LoopspWallState.NOT_EXISTS ? '　' : '・');
                }
            }
            lines.push('□\n');
            if (row < this.height - 1) {
                lines.push('□');
                for (let col = 0; col < this.width; col++) {
                    const wall = this.tateWall.get(row, col);
                    lines.push(wall === LoopspWallState.EXISTS ? '□' : wall === LoopspWallState.NOT_EXISTS ? '　' : '・');
                    if (col < this.width - 1) {
                        lines.push('□');
                    }
                }
                lines.push('□\n');
            }
        }
        // Bottom border
        for (let col = 0; col < this.width * 2 + 1; col++) {
            lines.push('□');
        }
        lines.push('\n');
        return lines.join('');
    }
    /** Get unknown walls for branching */
    getUnknownWalls() {
        const unknowns = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoWall.get(row, col) === LoopspWallState.SPACE) {
                    unknowns.push({ type: 'yoko', row, col });
                }
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateWall.get(row, col) === LoopspWallState.SPACE) {
                    unknowns.push({ type: 'tate', row, col });
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Loopsp Solver
// ============================================
export class LoopspSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from puzzle string
     * Format follows SDVX encoding:
     * - 'n'-'z': skip N cells (n=1, o=2, ..., z=13)
     * - '0'-'9', 'a'-'f': hex digit number (0-15)
     * - '-XX': hex number 16-255
     * - '+XXX': hex number 256-999
     * - '.': wildcard number (-1)
     * - 'g'-'m': special wall patterns
     */
    static fromString(height, width, param) {
        const field = new LoopspField(height, width);
        const alphabetFromN = 'nopqrstuvwxyz';
        let index = 0;
        for (let i = 0; i < param.length; i++) {
            const ch = param[i];
            const interval = alphabetFromN.indexOf(ch);
            if (interval !== -1) {
                // Skip cells
                index += interval + 1;
            }
            else {
                const row = Math.floor(index / width);
                const col = index % width;
                if (ch >= 'g' && ch <= 'm') {
                    // Special cell pattern
                    field.setSpecialCell(row, col, ch);
                }
                else if (ch === '.') {
                    // Wildcard number
                    field.setNumber(row, col, -1);
                }
                else {
                    // Number
                    let capacity;
                    if (ch === '-') {
                        // 16-255: next 2 hex digits
                        capacity = parseInt(param.substring(i + 1, i + 3), 16);
                        i += 2;
                    }
                    else if (ch === '+') {
                        // 256-999: next 3 hex digits
                        capacity = parseInt(param.substring(i + 1, i + 4), 16);
                        i += 3;
                    }
                    else {
                        // 0-15: single hex digit
                        capacity = parseInt(ch, 16);
                    }
                    if (!isNaN(capacity)) {
                        field.setNumber(row, col, capacity);
                    }
                }
                index++;
            }
        }
        return new LoopspSolver(field);
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
                        cloned.setYokoWall(wall.row, wall.col, LoopspWallState.EXISTS);
                    }
                    else {
                        cloned.setTateWall(wall.row, wall.col, LoopspWallState.EXISTS);
                    }
                    return cloned;
                },
                description: `Set ${wall.type} wall at (${wall.row}, ${wall.col}) to EXISTS`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (wall.type === 'yoko') {
                        cloned.setYokoWall(wall.row, wall.col, LoopspWallState.NOT_EXISTS);
                    }
                    else {
                        cloned.setTateWall(wall.row, wall.col, LoopspWallState.NOT_EXISTS);
                    }
                    return cloned;
                },
                description: `Set ${wall.type} wall at (${wall.row}, ${wall.col}) to NOT_EXISTS`,
            },
        ];
    }
}
//# sourceMappingURL=loopsp.js.map