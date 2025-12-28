/**
 * Kurarin Solver
 *
 * Rules:
 * 1. Divide the grid into regions using walls
 * 2. Each cell is surrounded by 4 walls (some may be on the grid boundary)
 * 3. White cells must have exactly 2 walls around them (forming a corridor)
 * 4. Black cells must have exactly 4 walls around them (completely isolated)
 * 5. All white cells must be connected in a single group
 * 6. Circles indicate the number of black cells in their area:
 *    - Black circle (1): More black cells than white cells
 *    - Gray circle (2): Equal black and white cells
 *    - White circle (3): More white cells than black cells
 * 7. Circle areas can be 1, 2, or 4 cells (single cell, two adjacent cells vertically/horizontally, or 2x2 block)
 * 8. Each row/column must have an even number of internal walls
 */
import { posKey, CellState, WallState } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Kurarin Types
// ============================================
/** Circle hint type for Kurarin puzzle */
export var KurarinCircleType;
(function (KurarinCircleType) {
    KurarinCircleType[KurarinCircleType["NONE"] = 0] = "NONE";
    KurarinCircleType[KurarinCircleType["BLACK"] = 1] = "BLACK";
    KurarinCircleType[KurarinCircleType["GRAY"] = 2] = "GRAY";
    KurarinCircleType[KurarinCircleType["WHITE"] = 3] = "WHITE";
})(KurarinCircleType || (KurarinCircleType = {}));
// ============================================
// Kurarin Field State
// ============================================
export class KurarinField {
    height;
    width;
    /** Cell states (black/white/unknown) */
    cells;
    /** Horizontal walls (between columns, height rows × (width-1) cols) */
    horizontalWalls;
    /** Vertical walls (between rows, (height-1) rows × width cols) */
    verticalWalls;
    /** Circle hints (2*height-1 rows × 2*width-1 cols) */
    circles;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.horizontalWalls = new Grid(height, width - 1, () => WallState.UNKNOWN);
        this.verticalWalls = new Grid(height - 1, width, () => WallState.UNKNOWN);
        this.circles = new Grid(height * 2 - 1, width * 2 - 1, () => KurarinCircleType.NONE);
    }
    /** Set circle hint */
    setCircle(row, col, circleType) {
        this.circles.set(row, col, circleType);
    }
    /** Get cell state */
    getCell(row, col) {
        if (row < 0 || row >= this.height || col < 0 || col >= this.width) {
            return CellState.UNKNOWN;
        }
        return this.cells.get(row, col);
    }
    /** Set cell state */
    setCell(row, col, state) {
        this.cells.set(row, col, state);
    }
    /** Get horizontal wall (between cells at (row, col) and (row, col+1)) */
    getHorizontalWall(row, col) {
        if (row < 0 || row >= this.height || col < 0 || col >= this.width - 1) {
            return WallState.WALL; // Boundary
        }
        return this.horizontalWalls.get(row, col);
    }
    /** Set horizontal wall */
    setHorizontalWall(row, col, state) {
        if (row >= 0 && row < this.height && col >= 0 && col < this.width - 1) {
            this.horizontalWalls.set(row, col, state);
        }
    }
    /** Get vertical wall (between cells at (row, col) and (row+1, col)) */
    getVerticalWall(row, col) {
        if (row < 0 || row >= this.height - 1 || col < 0 || col >= this.width) {
            return WallState.WALL; // Boundary
        }
        return this.verticalWalls.get(row, col);
    }
    /** Set vertical wall */
    setVerticalWall(row, col, state) {
        if (row >= 0 && row < this.height - 1 && col >= 0 && col < this.width) {
            this.verticalWalls.set(row, col, state);
        }
    }
    // ========== Constraint solving ==========
    /**
     * Circle constraint: enforce black/white cell counts in circle areas
     */
    circleSolve() {
        for (let circleRow = 0; circleRow < this.height * 2 - 1; circleRow++) {
            for (let circleCol = 0; circleCol < this.width * 2 - 1; circleCol++) {
                const circleType = this.circles.get(circleRow, circleCol);
                if (circleType === KurarinCircleType.NONE)
                    continue;
                const isVerticalDouble = circleRow % 2 === 1;
                const isHorizontalDouble = circleCol % 2 === 1;
                const cellRow = Math.floor(circleRow / 2);
                const cellCol = Math.floor(circleCol / 2);
                const cells = [];
                cells.push({ row: cellRow, col: cellCol });
                if (isVerticalDouble) {
                    cells.push({ row: cellRow + 1, col: cellCol });
                }
                if (isHorizontalDouble) {
                    cells.push({ row: cellRow, col: cellCol + 1 });
                }
                if (isVerticalDouble && isHorizontalDouble) {
                    cells.push({ row: cellRow + 1, col: cellCol + 1 });
                }
                let blackCount = 0;
                let whiteCount = 0;
                const unknownCells = [];
                for (const cell of cells) {
                    const state = this.cells.get(cell.row, cell.col);
                    if (state === CellState.BLACK) {
                        blackCount++;
                    }
                    else if (state === CellState.WHITE) {
                        whiteCount++;
                    }
                    else {
                        unknownCells.push(cell);
                    }
                }
                // Apply constraints based on circle type
                if (circleType === KurarinCircleType.BLACK) {
                    // Black > White
                    if (whiteCount >= cells.length)
                        return false; // Too many whites
                    if (blackCount <= cells.length - blackCount - whiteCount) {
                        // Not enough blacks yet, set all unknowns to black
                        for (const cell of unknownCells) {
                            this.cells.set(cell.row, cell.col, CellState.BLACK);
                        }
                    }
                }
                else if (circleType === KurarinCircleType.GRAY) {
                    // Black = White
                    const maxWhite = Math.floor(cells.length / 2);
                    const maxBlack = Math.floor(cells.length / 2);
                    if (whiteCount > maxWhite || blackCount > maxBlack)
                        return false;
                    if (whiteCount === maxWhite) {
                        // No more whites allowed
                        for (const cell of unknownCells) {
                            this.cells.set(cell.row, cell.col, CellState.BLACK);
                        }
                    }
                    else if (blackCount === maxBlack) {
                        // No more blacks allowed
                        for (const cell of unknownCells) {
                            this.cells.set(cell.row, cell.col, CellState.WHITE);
                        }
                    }
                }
                else if (circleType === KurarinCircleType.WHITE) {
                    // White > Black
                    if (blackCount >= cells.length)
                        return false; // Too many blacks
                    if (whiteCount <= cells.length - blackCount - whiteCount) {
                        // Not enough whites yet, set all unknowns to white
                        for (const cell of unknownCells) {
                            this.cells.set(cell.row, cell.col, CellState.WHITE);
                        }
                    }
                }
            }
        }
        return true;
    }
    /**
     * Wall count constraint: white cells have 2 walls, black cells have 4 walls
     */
    wallCountSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                let wallCount = 0;
                let noWallCount = 0;
                // Check all 4 sides
                const walls = [
                    { exists: row === 0 || this.verticalWalls.get(row - 1, col), isBoundary: row === 0 },
                    { exists: col === this.width - 1 || this.horizontalWalls.get(row, col), isBoundary: col === this.width - 1 },
                    { exists: row === this.height - 1 || this.verticalWalls.get(row, col), isBoundary: row === this.height - 1 },
                    { exists: col === 0 || this.horizontalWalls.get(row, col - 1), isBoundary: col === 0 },
                ];
                for (const wall of walls) {
                    if (wall.isBoundary || wall.exists === WallState.WALL) {
                        wallCount++;
                    }
                    else if (wall.exists === WallState.NO_WALL) {
                        noWallCount++;
                    }
                }
                const cellState = this.cells.get(row, col);
                // Invalid configurations
                if (cellState === CellState.UNKNOWN) {
                    if ((wallCount === 3 && noWallCount === 1) || noWallCount > 2) {
                        return false;
                    }
                    if (wallCount > 2) {
                        this.cells.set(row, col, CellState.BLACK);
                    }
                    else if (noWallCount > 0) {
                        this.cells.set(row, col, CellState.WHITE);
                    }
                }
                if (cellState === CellState.BLACK) {
                    if (noWallCount > 0)
                        return false;
                    // Set all remaining unknown walls to WALL
                    if (row > 0 && this.verticalWalls.get(row - 1, col) === WallState.UNKNOWN) {
                        this.verticalWalls.set(row - 1, col, WallState.WALL);
                    }
                    if (col < this.width - 1 && this.horizontalWalls.get(row, col) === WallState.UNKNOWN) {
                        this.horizontalWalls.set(row, col, WallState.WALL);
                    }
                    if (row < this.height - 1 && this.verticalWalls.get(row, col) === WallState.UNKNOWN) {
                        this.verticalWalls.set(row, col, WallState.WALL);
                    }
                    if (col > 0 && this.horizontalWalls.get(row, col - 1) === WallState.UNKNOWN) {
                        this.horizontalWalls.set(row, col - 1, WallState.WALL);
                    }
                }
                else if (cellState === CellState.WHITE) {
                    if (wallCount > 2 || noWallCount > 2)
                        return false;
                    if (noWallCount === 2) {
                        // Set remaining unknown walls to WALL
                        if (row > 0 && this.verticalWalls.get(row - 1, col) === WallState.UNKNOWN) {
                            this.verticalWalls.set(row - 1, col, WallState.WALL);
                        }
                        if (col < this.width - 1 && this.horizontalWalls.get(row, col) === WallState.UNKNOWN) {
                            this.horizontalWalls.set(row, col, WallState.WALL);
                        }
                        if (row < this.height - 1 && this.verticalWalls.get(row, col) === WallState.UNKNOWN) {
                            this.verticalWalls.set(row, col, WallState.WALL);
                        }
                        if (col > 0 && this.horizontalWalls.get(row, col - 1) === WallState.UNKNOWN) {
                            this.horizontalWalls.set(row, col - 1, WallState.WALL);
                        }
                    }
                    else if (wallCount === 2) {
                        // Set remaining unknown walls to NO_WALL
                        if (row > 0 && this.verticalWalls.get(row - 1, col) === WallState.UNKNOWN) {
                            this.verticalWalls.set(row - 1, col, WallState.NO_WALL);
                        }
                        if (col < this.width - 1 && this.horizontalWalls.get(row, col) === WallState.UNKNOWN) {
                            this.horizontalWalls.set(row, col, WallState.NO_WALL);
                        }
                        if (row < this.height - 1 && this.verticalWalls.get(row, col) === WallState.UNKNOWN) {
                            this.verticalWalls.set(row, col, WallState.NO_WALL);
                        }
                        if (col > 0 && this.horizontalWalls.get(row, col - 1) === WallState.UNKNOWN) {
                            this.horizontalWalls.set(row, col - 1, WallState.NO_WALL);
                        }
                    }
                }
            }
        }
        return true;
    }
    /**
     * Connectivity constraint: all white cells must be connected
     */
    connectivitySolve() {
        const whitePositions = new Set();
        const unknownPositions = new Set();
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const state = this.cells.get(row, col);
                if (state === CellState.WHITE) {
                    whitePositions.add(posKey({ row, col }));
                }
                else if (state === CellState.UNKNOWN) {
                    unknownPositions.add(posKey({ row, col }));
                }
            }
        }
        if (whitePositions.size === 0)
            return true;
        // Find all white cells reachable from the first white cell
        const firstWhite = Array.from(whitePositions)[0];
        const reachable = new Set();
        const queue = [firstWhite];
        reachable.add(firstWhite);
        while (queue.length > 0) {
            const current = queue.shift();
            const [row, col] = current.split(',').map(Number);
            // Check all 4 directions
            const neighbors = [
                { row: row - 1, col, hasWall: row === 0 || this.verticalWalls.get(row - 1, col) === WallState.WALL },
                { row: row + 1, col, hasWall: row === this.height - 1 || this.verticalWalls.get(row, col) === WallState.WALL },
                { row, col: col - 1, hasWall: col === 0 || this.horizontalWalls.get(row, col - 1) === WallState.WALL },
                { row, col: col + 1, hasWall: col === this.width - 1 || this.horizontalWalls.get(row, col) === WallState.WALL },
            ];
            for (const neighbor of neighbors) {
                if (neighbor.hasWall)
                    continue;
                if (neighbor.row < 0 || neighbor.row >= this.height || neighbor.col < 0 || neighbor.col >= this.width)
                    continue;
                const neighborKey = posKey({ row: neighbor.row, col: neighbor.col });
                if (reachable.has(neighborKey))
                    continue;
                if (!whitePositions.has(neighborKey) && !unknownPositions.has(neighborKey))
                    continue;
                reachable.add(neighborKey);
                queue.push(neighborKey);
            }
        }
        // All white cells must be reachable
        for (const white of whitePositions) {
            if (!reachable.has(white)) {
                return false;
            }
        }
        // Unknown cells not reachable must be black
        for (const unknown of unknownPositions) {
            if (!reachable.has(unknown)) {
                const [row, col] = unknown.split(',').map(Number);
                this.cells.set(row, col, CellState.BLACK);
            }
        }
        return true;
    }
    /**
     * Odd/even wall constraint: each row/column must have even number of internal walls
     */
    oddEvenSolve() {
        // Check vertical walls (walls in each row)
        for (let row = 0; row < this.height - 1; row++) {
            let noWallCount = 0;
            let allDetermined = true;
            for (let col = 0; col < this.width; col++) {
                const wall = this.verticalWalls.get(row, col);
                if (wall === WallState.UNKNOWN) {
                    allDetermined = false;
                    break;
                }
                else if (wall === WallState.NO_WALL) {
                    noWallCount++;
                }
            }
            if (allDetermined && noWallCount % 2 !== 0) {
                return false;
            }
        }
        // Check horizontal walls (walls in each column)
        for (let col = 0; col < this.width - 1; col++) {
            let noWallCount = 0;
            let allDetermined = true;
            for (let row = 0; row < this.height; row++) {
                const wall = this.horizontalWalls.get(row, col);
                if (wall === WallState.UNKNOWN) {
                    allDetermined = false;
                    break;
                }
                else if (wall === WallState.NO_WALL) {
                    noWallCount++;
                }
            }
            if (allDetermined && noWallCount % 2 !== 0) {
                return false;
            }
        }
        return true;
    }
    /**
     * Final check: at least one white cell must exist
     */
    finalSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) !== CellState.BLACK) {
                    return true;
                }
            }
        }
        return false;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new KurarinField(this.height, this.width);
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                cloned.cells.set(row, col, this.cells.get(row, col));
            }
        }
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                cloned.horizontalWalls.set(row, col, this.horizontalWalls.get(row, col));
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                cloned.verticalWalls.set(row, col, this.verticalWalls.get(row, col));
            }
        }
        for (let row = 0; row < this.height * 2 - 1; row++) {
            for (let col = 0; col < this.width * 2 - 1; col++) {
                cloned.circles.set(row, col, this.circles.get(row, col));
            }
        }
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                dump += this.horizontalWalls.get(row, col);
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                dump += this.verticalWalls.get(row, col);
            }
        }
        return dump;
    }
    isSolved() {
        // All walls must be determined
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.horizontalWalls.get(row, col) === WallState.UNKNOWN) {
                    return false;
                }
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.verticalWalls.get(row, col) === WallState.UNKNOWN) {
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
            if (!this.circleSolve())
                return false;
            if (!this.wallCountSolve())
                return false;
            changed = this.getStateDump() !== beforeDump;
        }
        if (!this.oddEvenSolve())
            return false;
        if (!this.connectivitySolve())
            return false;
        if (!this.finalSolve())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        // Top border
        let topLine = '□';
        for (let col = 0; col < this.width * 2 - 1; col++) {
            topLine += '□';
        }
        topLine += '□';
        lines.push(topLine);
        // Grid rows
        for (let circleRow = 0; circleRow < this.height * 2 - 1; circleRow++) {
            let line = '□';
            for (let circleCol = 0; circleCol < this.width * 2 - 1; circleCol++) {
                const circle = this.circles.get(circleRow, circleCol);
                if (circle !== KurarinCircleType.NONE) {
                    // Circle hint
                    line += String(circle);
                }
                else if (circleRow % 2 === 0 && circleCol % 2 === 0) {
                    // Cell
                    const cellRow = Math.floor(circleRow / 2);
                    const cellCol = Math.floor(circleCol / 2);
                    const state = this.cells.get(cellRow, cellCol);
                    if (state === CellState.BLACK) {
                        line += '■';
                    }
                    else if (state === CellState.WHITE) {
                        line += '　';
                    }
                    else {
                        line += '・';
                    }
                }
                else if (circleRow % 2 === 0 && circleCol % 2 === 1) {
                    // Horizontal wall
                    const cellRow = Math.floor(circleRow / 2);
                    const wallCol = Math.floor(circleCol / 2);
                    const wall = this.horizontalWalls.get(cellRow, wallCol);
                    if (wall === WallState.WALL) {
                        line += '｜';
                    }
                    else if (wall === WallState.NO_WALL) {
                        line += '　';
                    }
                    else {
                        line += '·';
                    }
                }
                else if (circleRow % 2 === 1 && circleCol % 2 === 0) {
                    // Vertical wall
                    const wallRow = Math.floor(circleRow / 2);
                    const cellCol = Math.floor(circleCol / 2);
                    const wall = this.verticalWalls.get(wallRow, cellCol);
                    if (wall === WallState.WALL) {
                        line += '－';
                    }
                    else if (wall === WallState.NO_WALL) {
                        line += '　';
                    }
                    else {
                        line += '·';
                    }
                }
                else {
                    // Intersection
                    line += '□';
                }
            }
            line += '□';
            lines.push(line);
        }
        // Bottom border
        let bottomLine = '□';
        for (let col = 0; col < this.width * 2 - 1; col++) {
            bottomLine += '□';
        }
        bottomLine += '□';
        lines.push(bottomLine);
        return lines.join('\n');
    }
}
// ============================================
// Kurarin Solver
// ============================================
export class KurarinSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    static fromString(height, width, param) {
        const field = new KurarinField(height, width);
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        const maxIndex = (height * 2 - 1) * (width * 2 - 1);
        for (let i = 0; i < param.length && index < maxIndex;) {
            const ch = param[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index += (interval + 1) * 2;
                i++;
            }
            else {
                const value1 = parseInt(ch, 16) >> 2;
                const value2 = parseInt(ch, 16) & 3;
                const targetY1 = Math.floor(index / (width * 2 - 1));
                const targetX1 = index % (width * 2 - 1);
                if (value1 > 0) {
                    field.setCircle(targetY1, targetX1, value1);
                }
                index++;
                if (index < maxIndex) {
                    const targetY2 = Math.floor(index / (width * 2 - 1));
                    const targetX2 = index % (width * 2 - 1);
                    if (value2 > 0) {
                        field.setCircle(targetY2, targetX2, value2);
                    }
                }
                index++;
                i++;
            }
        }
        return new KurarinSolver(field);
    }
    getBranchCandidates(state) {
        const candidates = [];
        // Try horizontal walls first
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width - 1; col++) {
                if (state.getHorizontalWall(row, col) === WallState.UNKNOWN) {
                    candidates.push({
                        apply: (s) => {
                            const cloned = s.clone();
                            cloned.setHorizontalWall(row, col, WallState.WALL);
                            return cloned;
                        },
                        description: `Set horizontal wall at (${row}, ${col}) to WALL`,
                    });
                    candidates.push({
                        apply: (s) => {
                            const cloned = s.clone();
                            cloned.setHorizontalWall(row, col, WallState.NO_WALL);
                            return cloned;
                        },
                        description: `Set horizontal wall at (${row}, ${col}) to NO_WALL`,
                    });
                    return candidates; // Return after first unknown wall found
                }
            }
        }
        // Try vertical walls
        for (let row = 0; row < state.height - 1; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.getVerticalWall(row, col) === WallState.UNKNOWN) {
                    candidates.push({
                        apply: (s) => {
                            const cloned = s.clone();
                            cloned.setVerticalWall(row, col, WallState.WALL);
                            return cloned;
                        },
                        description: `Set vertical wall at (${row}, ${col}) to WALL`,
                    });
                    candidates.push({
                        apply: (s) => {
                            const cloned = s.clone();
                            cloned.setVerticalWall(row, col, WallState.NO_WALL);
                            return cloned;
                        },
                        description: `Set vertical wall at (${row}, ${col}) to NO_WALL`,
                    });
                    return candidates; // Return after first unknown wall found
                }
            }
        }
        return candidates;
    }
}
//# sourceMappingURL=kurarin.js.map