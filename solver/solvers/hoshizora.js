/**
 * Hoshizora Solver
 *
 * Rules:
 * 1. Stars (marked cells) must have exactly one wall edge around them (out of 4 edges)
 * 2. Non-star cells must NOT have exactly one wall edge around them
 * 3. Each cell must have exactly 2 wall edges around it (out of 4 edges)
 * 4. All cells must be connected (no isolated regions)
 * 5. Each row and column must have an even number of walls
 */
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
    /** Wall does not exist */
    Wall["NOT_EXISTS"] = ".";
})(Wall || (Wall = {}));
// ============================================
// Hoshizora Field State
// ============================================
export class HoshizoraField {
    height;
    width;
    /** Star positions (true = star exists at intersection between cells) */
    hoshi;
    /** Horizontal walls (between vertically adjacent cells) */
    yokoWall;
    /** Vertical walls (between horizontally adjacent cells) */
    tateWall;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        // Stars are at intersections, so (height-1) x (width-1)
        this.hoshi = Array(height - 1).fill(null).map(() => Array(width - 1).fill(false));
        // Horizontal walls: height rows x (width-1) columns
        this.yokoWall = Array(height).fill(null).map(() => Array(width - 1).fill(Wall.SPACE));
        // Vertical walls: (height-1) rows x width columns
        this.tateWall = Array(height - 1).fill(null).map(() => Array(width).fill(Wall.SPACE));
    }
    getYLength() {
        return this.yokoWall.length;
    }
    getXLength() {
        return this.tateWall[0].length;
    }
    setHoshi(y, x, value) {
        this.hoshi[y][x] = value;
    }
    getHoshi(y, x) {
        return this.hoshi[y][x];
    }
    setYokoWall(y, x, state) {
        this.yokoWall[y][x] = state;
    }
    getYokoWall(y, x) {
        return this.yokoWall[y][x];
    }
    setTateWall(y, x, state) {
        this.tateWall[y][x] = state;
    }
    getTateWall(y, x) {
        return this.tateWall[y][x];
    }
    clone() {
        const cloned = new HoshizoraField(this.height, this.width);
        for (let y = 0; y < this.getYLength() - 1; y++) {
            for (let x = 0; x < this.getXLength() - 1; x++) {
                cloned.hoshi[y][x] = this.hoshi[y][x];
            }
        }
        for (let y = 0; y < this.getYLength(); y++) {
            for (let x = 0; x < this.getXLength() - 1; x++) {
                cloned.yokoWall[y][x] = this.yokoWall[y][x];
            }
        }
        for (let y = 0; y < this.getYLength() - 1; y++) {
            for (let x = 0; x < this.getXLength(); x++) {
                cloned.tateWall[y][x] = this.tateWall[y][x];
            }
        }
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let y = 0; y < this.getYLength(); y++) {
            for (let x = 0; x < this.getXLength() - 1; x++) {
                dump += this.yokoWall[y][x];
            }
        }
        for (let y = 0; y < this.getYLength() - 1; y++) {
            for (let x = 0; x < this.getXLength(); x++) {
                dump += this.tateWall[y][x];
            }
        }
        return dump;
    }
    isSolved() {
        // Check all walls are determined
        for (let y = 0; y < this.getYLength(); y++) {
            for (let x = 0; x < this.getXLength() - 1; x++) {
                if (this.yokoWall[y][x] === Wall.SPACE)
                    return false;
            }
        }
        for (let y = 0; y < this.getYLength() - 1; y++) {
            for (let x = 0; x < this.getXLength(); x++) {
                if (this.tateWall[y][x] === Wall.SPACE)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    /**
     * Stars must have exactly 1 wall, non-stars must NOT have exactly 1 wall
     */
    hoshiSolve() {
        for (let yIndex = 0; yIndex < this.getYLength() - 1; yIndex++) {
            for (let xIndex = 0; xIndex < this.getXLength() - 1; xIndex++) {
                let existsCount = 0;
                let notExistsCount = 0;
                const wallUp = this.yokoWall[yIndex][xIndex];
                if (wallUp === Wall.EXISTS)
                    existsCount++;
                else if (wallUp === Wall.NOT_EXISTS)
                    notExistsCount++;
                const wallRight = this.tateWall[yIndex][xIndex + 1];
                if (wallRight === Wall.EXISTS)
                    existsCount++;
                else if (wallRight === Wall.NOT_EXISTS)
                    notExistsCount++;
                const wallDown = this.yokoWall[yIndex + 1][xIndex];
                if (wallDown === Wall.EXISTS)
                    existsCount++;
                else if (wallDown === Wall.NOT_EXISTS)
                    notExistsCount++;
                const wallLeft = this.tateWall[yIndex][xIndex];
                if (wallLeft === Wall.EXISTS)
                    existsCount++;
                else if (wallLeft === Wall.NOT_EXISTS)
                    notExistsCount++;
                if (this.hoshi[yIndex][xIndex]) {
                    // Star: must have exactly 1 wall
                    if (existsCount > 1 || notExistsCount > 3)
                        return false;
                    if (notExistsCount === 3) {
                        // Only one edge left, must be wall
                        if (wallUp === Wall.SPACE)
                            this.yokoWall[yIndex][xIndex] = Wall.EXISTS;
                        if (wallRight === Wall.SPACE)
                            this.tateWall[yIndex][xIndex + 1] = Wall.EXISTS;
                        if (wallDown === Wall.SPACE)
                            this.yokoWall[yIndex + 1][xIndex] = Wall.EXISTS;
                        if (wallLeft === Wall.SPACE)
                            this.tateWall[yIndex][xIndex] = Wall.EXISTS;
                    }
                    else if (existsCount === 1) {
                        // Already have 1 wall, rest must be not-wall
                        if (wallUp === Wall.SPACE)
                            this.yokoWall[yIndex][xIndex] = Wall.NOT_EXISTS;
                        if (wallRight === Wall.SPACE)
                            this.tateWall[yIndex][xIndex + 1] = Wall.NOT_EXISTS;
                        if (wallDown === Wall.SPACE)
                            this.yokoWall[yIndex + 1][xIndex] = Wall.NOT_EXISTS;
                        if (wallLeft === Wall.SPACE)
                            this.tateWall[yIndex][xIndex] = Wall.NOT_EXISTS;
                    }
                }
                else {
                    // Not a star: must NOT have exactly 1 wall
                    if (existsCount === 1 && notExistsCount === 3)
                        return false;
                    if (existsCount === 0 && notExistsCount === 3) {
                        // 0 walls and 3 not-walls means last must be not-wall
                        if (wallUp === Wall.SPACE)
                            this.yokoWall[yIndex][xIndex] = Wall.NOT_EXISTS;
                        if (wallRight === Wall.SPACE)
                            this.tateWall[yIndex][xIndex + 1] = Wall.NOT_EXISTS;
                        if (wallDown === Wall.SPACE)
                            this.yokoWall[yIndex + 1][xIndex] = Wall.NOT_EXISTS;
                        if (wallLeft === Wall.SPACE)
                            this.tateWall[yIndex][xIndex] = Wall.NOT_EXISTS;
                    }
                    else if (existsCount === 1 && notExistsCount === 2) {
                        // 1 wall and 2 not-walls, last must be wall (to avoid exactly 1)
                        if (wallUp === Wall.SPACE)
                            this.yokoWall[yIndex][xIndex] = Wall.EXISTS;
                        if (wallRight === Wall.SPACE)
                            this.tateWall[yIndex][xIndex + 1] = Wall.EXISTS;
                        if (wallDown === Wall.SPACE)
                            this.yokoWall[yIndex + 1][xIndex] = Wall.EXISTS;
                        if (wallLeft === Wall.SPACE)
                            this.tateWall[yIndex][xIndex] = Wall.EXISTS;
                    }
                }
            }
        }
        return true;
    }
    /**
     * Each cell must have exactly 2 walls around it
     */
    masuSolve() {
        for (let yIndex = 0; yIndex < this.getYLength(); yIndex++) {
            for (let xIndex = 0; xIndex < this.getXLength(); xIndex++) {
                let existsCount = 0;
                let notExistsCount = 0;
                const wallUp = yIndex === 0 ? Wall.EXISTS : this.tateWall[yIndex - 1][xIndex];
                if (wallUp === Wall.EXISTS)
                    existsCount++;
                else if (wallUp === Wall.NOT_EXISTS)
                    notExistsCount++;
                const wallRight = xIndex === this.getXLength() - 1 ? Wall.EXISTS : this.yokoWall[yIndex][xIndex];
                if (wallRight === Wall.EXISTS)
                    existsCount++;
                else if (wallRight === Wall.NOT_EXISTS)
                    notExistsCount++;
                const wallDown = yIndex === this.getYLength() - 1 ? Wall.EXISTS : this.tateWall[yIndex][xIndex];
                if (wallDown === Wall.EXISTS)
                    existsCount++;
                else if (wallDown === Wall.NOT_EXISTS)
                    notExistsCount++;
                const wallLeft = xIndex === 0 ? Wall.EXISTS : this.yokoWall[yIndex][xIndex - 1];
                if (wallLeft === Wall.EXISTS)
                    existsCount++;
                else if (wallLeft === Wall.NOT_EXISTS)
                    notExistsCount++;
                if (existsCount > 2 || notExistsCount > 2)
                    return false;
                if (notExistsCount === 2) {
                    // Need 2 more walls
                    if (wallUp === Wall.SPACE && yIndex > 0)
                        this.tateWall[yIndex - 1][xIndex] = Wall.EXISTS;
                    if (wallRight === Wall.SPACE && xIndex < this.getXLength() - 1)
                        this.yokoWall[yIndex][xIndex] = Wall.EXISTS;
                    if (wallDown === Wall.SPACE && yIndex < this.getYLength() - 1)
                        this.tateWall[yIndex][xIndex] = Wall.EXISTS;
                    if (wallLeft === Wall.SPACE && xIndex > 0)
                        this.yokoWall[yIndex][xIndex - 1] = Wall.EXISTS;
                }
                else if (existsCount === 2) {
                    // Already have 2 walls
                    if (wallUp === Wall.SPACE && yIndex > 0)
                        this.tateWall[yIndex - 1][xIndex] = Wall.NOT_EXISTS;
                    if (wallRight === Wall.SPACE && xIndex < this.getXLength() - 1)
                        this.yokoWall[yIndex][xIndex] = Wall.NOT_EXISTS;
                    if (wallDown === Wall.SPACE && yIndex < this.getYLength() - 1)
                        this.tateWall[yIndex][xIndex] = Wall.NOT_EXISTS;
                    if (wallLeft === Wall.SPACE && xIndex > 0)
                        this.yokoWall[yIndex][xIndex - 1] = Wall.NOT_EXISTS;
                }
            }
        }
        return true;
    }
    /**
     * Check that all cells are connected (no isolated regions)
     */
    connectSolve() {
        const visited = new Set();
        const start = { y: 0, x: 0 };
        const stack = [{ row: start.y, col: start.x }];
        while (stack.length > 0) {
            const pos = stack.pop();
            const key = `${pos.row},${pos.col}`;
            if (visited.has(key))
                continue;
            visited.add(key);
            const y = pos.row;
            const x = pos.col;
            // Check up
            if (y > 0 && this.tateWall[y - 1][x] !== Wall.EXISTS) {
                const upKey = `${y - 1},${x}`;
                if (!visited.has(upKey))
                    stack.push({ row: y - 1, col: x });
            }
            // Check right
            if (x < this.getXLength() - 1 && this.yokoWall[y][x] !== Wall.EXISTS) {
                const rightKey = `${y},${x + 1}`;
                if (!visited.has(rightKey))
                    stack.push({ row: y, col: x + 1 });
            }
            // Check down
            if (y < this.getYLength() - 1 && this.tateWall[y][x] !== Wall.EXISTS) {
                const downKey = `${y + 1},${x}`;
                if (!visited.has(downKey))
                    stack.push({ row: y + 1, col: x });
            }
            // Check left
            if (x > 0 && this.yokoWall[y][x - 1] !== Wall.EXISTS) {
                const leftKey = `${y},${x - 1}`;
                if (!visited.has(leftKey))
                    stack.push({ row: y, col: x - 1 });
            }
        }
        // All cells should be visited
        return visited.size === this.getYLength() * this.getXLength();
    }
    /**
     * Each row/column must have even number of walls
     */
    oddSolve() {
        // Check horizontal walls in each row
        for (let y = 0; y < this.getYLength() - 1; y++) {
            let notExistsCount = 0;
            let hasSpace = false;
            for (let x = 0; x < this.getXLength(); x++) {
                if (this.tateWall[y][x] === Wall.SPACE) {
                    hasSpace = true;
                    break;
                }
                else if (this.tateWall[y][x] === Wall.NOT_EXISTS) {
                    notExistsCount++;
                }
            }
            if (!hasSpace && notExistsCount % 2 !== 0)
                return false;
        }
        // Check vertical walls in each column
        for (let x = 0; x < this.getXLength() - 1; x++) {
            let notExistsCount = 0;
            let hasSpace = false;
            for (let y = 0; y < this.getYLength(); y++) {
                if (this.yokoWall[y][x] === Wall.SPACE) {
                    hasSpace = true;
                    break;
                }
                else if (this.yokoWall[y][x] === Wall.NOT_EXISTS) {
                    notExistsCount++;
                }
            }
            if (!hasSpace && notExistsCount % 2 !== 0)
                return false;
        }
        return true;
    }
    solveAndCheck() {
        const str = this.getStateDump();
        if (!this.hoshiSolve())
            return false;
        if (!this.masuSolve())
            return false;
        if (this.getStateDump() !== str) {
            return this.solveAndCheck();
        }
        else {
            if (!this.oddSolve())
                return false;
            if (!this.connectSolve())
                return false;
        }
        return true;
    }
    toString() {
        const lines = [];
        // Top border
        let line = '';
        for (let x = 0; x < this.getXLength() * 2 + 1; x++) {
            line += '□';
        }
        lines.push(line);
        for (let y = 0; y < this.getYLength(); y++) {
            // Cell row
            line = '□';
            for (let x = 0; x < this.getXLength(); x++) {
                line += '　';
                if (x !== this.getXLength() - 1) {
                    line += this.yokoWall[y][x];
                }
            }
            line += '□';
            lines.push(line);
            // Wall/star row
            if (y !== this.getYLength() - 1) {
                line = '□';
                for (let x = 0; x < this.getXLength(); x++) {
                    line += this.tateWall[y][x];
                    if (x !== this.getXLength() - 1) {
                        line += this.hoshi[y][x] ? '★' : '□';
                    }
                }
                line += '□';
                lines.push(line);
            }
        }
        // Bottom border
        line = '';
        for (let x = 0; x < this.getXLength() * 2 + 1; x++) {
            line += '□';
        }
        lines.push(line);
        return lines.join('\n');
    }
    getFirstUnknownYokoWall() {
        for (let y = 0; y < this.getYLength(); y++) {
            for (let x = 0; x < this.getXLength() - 1; x++) {
                if (this.yokoWall[y][x] === Wall.SPACE) {
                    return { y, x };
                }
            }
        }
        return null;
    }
    getFirstUnknownTateWall() {
        for (let y = 0; y < this.getYLength() - 1; y++) {
            for (let x = 0; x < this.getXLength(); x++) {
                if (this.tateWall[y][x] === Wall.SPACE) {
                    return { y, x };
                }
            }
        }
        return null;
    }
}
// ============================================
// Hoshizora Solver
// ============================================
export class HoshizoraSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    static fromString(fieldStr) {
        const lines = fieldStr.split('\n');
        const fieldInfo = lines[0].split(',');
        const xLength = parseInt(fieldInfo[1]);
        const yLength = parseInt(fieldInfo[2]);
        const field = new HoshizoraField(yLength, xLength);
        // Parse stars from JSON structure
        if (lines.length > 3) {
            const hintLine = JSON.parse(lines[3]);
            const hintInfo = hintLine.zY || {};
            // Convert indices to positions (simplified parsing)
            // The index mapping would need to match the Java implementation
            for (const [key,] of Object.entries(hintInfo)) {
                const idx = parseInt(key);
                // Index calculation from Java code
                const firstIndex = 31 + (yLength - 1) * 5 + (xLength - 1) * (5 + yLength);
                const relIdx = idx - firstIndex;
                const rowWidth = xLength + 1 + 3;
                const yPos = Math.floor(relIdx / rowWidth);
                const xPos = relIdx % rowWidth;
                if (yPos > 0 && yPos <= yLength && xPos > 0 && xPos <= xLength) {
                    field.setHoshi(yPos - 1, xPos - 1, true);
                }
            }
        }
        return new HoshizoraSolver(field);
    }
    getBranchCandidates(state) {
        // Try yokoWall first
        const yokoUnknown = state.getFirstUnknownYokoWall();
        if (yokoUnknown) {
            return [
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setYokoWall(yokoUnknown.y, yokoUnknown.x, Wall.EXISTS);
                        return cloned;
                    },
                    description: `Set yoko wall at (${yokoUnknown.y}, ${yokoUnknown.x}) to EXISTS`,
                },
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setYokoWall(yokoUnknown.y, yokoUnknown.x, Wall.NOT_EXISTS);
                        return cloned;
                    },
                    description: `Set yoko wall at (${yokoUnknown.y}, ${yokoUnknown.x}) to NOT_EXISTS`,
                },
            ];
        }
        // Try tateWall
        const tateUnknown = state.getFirstUnknownTateWall();
        if (tateUnknown) {
            return [
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setTateWall(tateUnknown.y, tateUnknown.x, Wall.EXISTS);
                        return cloned;
                    },
                    description: `Set tate wall at (${tateUnknown.y}, ${tateUnknown.x}) to EXISTS`,
                },
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setTateWall(tateUnknown.y, tateUnknown.x, Wall.NOT_EXISTS);
                        return cloned;
                    },
                    description: `Set tate wall at (${tateUnknown.y}, ${tateUnknown.x}) to NOT_EXISTS`,
                },
            ];
        }
        return [];
    }
}
//# sourceMappingURL=hoshizora.js.map