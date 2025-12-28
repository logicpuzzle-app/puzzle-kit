/**
 * Linedozen Solver
 *
 * Rules:
 * 1. Divide the grid into rooms (regions)
 * 2. Each room contains cells with the same number (1-9)
 * 3. Cells across a wall (not in the same room) cannot have the same number
 * 4. Lines are drawn through the grid
 * 5. The sum of numbers along each line must equal 12 (a dozen)
 */
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Linedozen Field State
// ============================================
export class LinedozenField {
    height;
    width;
    /** Number candidates for each cell (1-9) */
    numbersCand;
    /** Horizontal walls (between col and col+1) */
    yokoWall;
    /** Vertical walls (between row and row+1) */
    tateWall;
    /** Rooms - groups of cells that must have the same number */
    rooms;
    /** Lines - groups of cells that must sum to 12 */
    lines;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.numbersCand = new Grid(height, width, () => {
            const cands = new Set();
            for (let i = 1; i <= 9; i++) {
                cands.add(i);
            }
            return cands;
        });
        // Horizontal walls: height rows, (width-1) walls per row
        this.yokoWall = new Grid(height, width - 1, () => false);
        // Vertical walls: (height-1) rows, width walls per row
        this.tateWall = new Grid(height - 1, width, () => false);
        this.rooms = [];
        this.lines = [];
    }
    /** Set horizontal wall */
    setYokoWall(row, col, hasWall) {
        if (col >= 0 && col < this.width - 1) {
            this.yokoWall.set(row, col, hasWall);
        }
    }
    /** Set vertical wall */
    setTateWall(row, col, hasWall) {
        if (row >= 0 && row < this.height - 1) {
            this.tateWall.set(row, col, hasWall);
        }
    }
    /** Get horizontal wall */
    getYokoWall(row, col) {
        if (col < 0 || col >= this.width - 1)
            return false;
        return this.yokoWall.get(row, col);
    }
    /** Get vertical wall */
    getTateWall(row, col) {
        if (row < 0 || row >= this.height - 1)
            return false;
        return this.tateWall.get(row, col);
    }
    /** Add a room */
    addRoom(positions) {
        this.rooms.push(new Set(positions));
    }
    /** Add a line */
    addLine(positions) {
        this.lines.push(new Set(positions));
    }
    /** Get number candidates at position */
    getCandidates(row, col) {
        return this.numbersCand.get(row, col);
    }
    /** Set number candidates at position */
    setCandidates(row, col, cands) {
        this.numbersCand.set(row, col, new Set(cands));
    }
    // ========== Constraint solving ==========
    /**
     * Rule: All cells in a room must have the same number
     */
    roomSolve() {
        for (const room of this.rooms) {
            let fixedNum = null;
            // Find if any cell in the room is already determined
            for (const pos of room) {
                const cands = this.numbersCand.get(pos);
                if (cands.size === 1) {
                    fixedNum = Array.from(cands)[0];
                    break;
                }
            }
            if (fixedNum !== null) {
                // Remove all other candidates from all cells in the room
                for (const pos of room) {
                    const cands = this.numbersCand.get(pos);
                    cands.clear();
                    cands.add(fixedNum);
                    if (cands.size === 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    /**
     * Rule: Cells across a wall cannot have the same number
     */
    nextSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cands = this.numbersCand.get(row, col);
                // Check up
                if (row > 0 && this.getTateWall(row - 1, col)) {
                    const upCands = this.numbersCand.get(row - 1, col);
                    if (cands.size === 1) {
                        const num = Array.from(cands)[0];
                        upCands.delete(num);
                        if (upCands.size === 0)
                            return false;
                    }
                    if (upCands.size === 1) {
                        const num = Array.from(upCands)[0];
                        cands.delete(num);
                        if (cands.size === 0)
                            return false;
                    }
                }
                // Check right
                if (col < this.width - 1 && this.getYokoWall(row, col)) {
                    const rightCands = this.numbersCand.get(row, col + 1);
                    if (cands.size === 1) {
                        const num = Array.from(cands)[0];
                        rightCands.delete(num);
                        if (rightCands.size === 0)
                            return false;
                    }
                    if (rightCands.size === 1) {
                        const num = Array.from(rightCands)[0];
                        cands.delete(num);
                        if (cands.size === 0)
                            return false;
                    }
                }
                // Check down
                if (row < this.height - 1 && this.getTateWall(row, col)) {
                    const downCands = this.numbersCand.get(row + 1, col);
                    if (cands.size === 1) {
                        const num = Array.from(cands)[0];
                        downCands.delete(num);
                        if (downCands.size === 0)
                            return false;
                    }
                    if (downCands.size === 1) {
                        const num = Array.from(downCands)[0];
                        cands.delete(num);
                        if (cands.size === 0)
                            return false;
                    }
                }
                // Check left
                if (col > 0 && this.getYokoWall(row, col - 1)) {
                    const leftCands = this.numbersCand.get(row, col - 1);
                    if (cands.size === 1) {
                        const num = Array.from(cands)[0];
                        leftCands.delete(num);
                        if (leftCands.size === 0)
                            return false;
                    }
                    if (leftCands.size === 1) {
                        const num = Array.from(leftCands)[0];
                        cands.delete(num);
                        if (cands.size === 0)
                            return false;
                    }
                }
            }
        }
        return true;
    }
    /**
     * Rule: The sum of numbers along each line must equal 12
     */
    dozenSolve() {
        for (const line of this.lines) {
            const numbersCandList = [];
            for (const pos of line) {
                numbersCandList.push(this.numbersCand.get(pos));
            }
            if (!this.canDozen(numbersCandList, 0, 0)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Check if the candidates can sum to 12
     */
    canDozen(candList, idx, sum) {
        if (idx === candList.length) {
            return sum === 12;
        }
        for (const num of candList[idx]) {
            if (this.canDozen(candList, idx + 1, sum + num)) {
                return true;
            }
        }
        return false;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new LinedozenField(this.height, this.width);
        for (const [pos, cands] of this.numbersCand.entries()) {
            cloned.numbersCand.set(pos, new Set(cands));
        }
        for (const [pos, wall] of this.yokoWall.entries()) {
            cloned.yokoWall.set(pos, wall);
        }
        for (const [pos, wall] of this.tateWall.entries()) {
            cloned.tateWall.set(pos, wall);
        }
        // Copy rooms (shallow copy of sets is fine since positions are immutable)
        cloned.rooms = this.rooms.map(room => new Set(room));
        // Copy lines
        cloned.lines = this.lines.map(line => new Set(line));
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
            if (!this.nextSolve())
                return false;
            if (!this.dozenSolve())
                return false;
            changed = this.getStateDump() !== beforeDump;
        }
        return true;
    }
    toString() {
        const lines = [];
        lines.push(`lines: ${this.lines.length} rooms: ${this.rooms.length}`);
        // Top border
        const topBorder = '□'.repeat(this.width * 2 + 1);
        lines.push(topBorder);
        for (let row = 0; row < this.height; row++) {
            let cellLine = '□';
            for (let col = 0; col < this.width; col++) {
                const cands = this.numbersCand.get(row, col);
                if (cands.size === 0) {
                    cellLine += '×';
                }
                else if (cands.size === 1) {
                    cellLine += Array.from(cands)[0];
                }
                else if (cands.size === 2) {
                    const arr = Array.from(cands).sort();
                    cellLine += `${arr[0]}${arr[1]}`;
                }
                else {
                    cellLine += '　';
                }
                if (col < this.width - 1) {
                    cellLine += this.getYokoWall(row, col) ? '□' : '　';
                }
            }
            cellLine += '□';
            lines.push(cellLine);
            // Horizontal walls
            if (row < this.height - 1) {
                let wallLine = '□';
                for (let col = 0; col < this.width; col++) {
                    wallLine += this.getTateWall(row, col) ? '□' : '　';
                    if (col < this.width - 1) {
                        wallLine += '□';
                    }
                }
                wallLine += '□';
                lines.push(wallLine);
            }
        }
        // Bottom border
        const bottomBorder = '□'.repeat(this.width * 2 + 1);
        lines.push(bottomBorder);
        return lines.join('\n');
    }
    /** Get cells with multiple candidates for branching */
    getUndeterminedCells() {
        const cells = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.numbersCand.get(row, col).size > 1) {
                    cells.push({ row, col });
                }
            }
        }
        return cells;
    }
}
// ============================================
// Linedozen Solver
// ============================================
export class LinedozenSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    getBranchCandidates(state) {
        const undetermined = state.getUndeterminedCells();
        if (undetermined.length === 0)
            return [];
        // Pick the first cell with multiple candidates
        const pos = undetermined[0];
        const cands = state.getCandidates(pos.row, pos.col);
        // Create branch candidates for each possible number
        return Array.from(cands).map(num => ({
            apply: (s) => {
                const cloned = s.clone();
                const newCands = new Set([num]);
                cloned.setCandidates(pos.row, pos.col, newCands);
                return cloned;
            },
            description: `Set (${pos.row}, ${pos.col}) to ${num}`,
        }));
    }
}
//# sourceMappingURL=linedozen.js.map