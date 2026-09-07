/**
 * Slalom Solver
 *
 * Rules:
 * 1. Cells are either black (blocks) or white (path cells)
 * 2. Some cells are gates (marked with +) which the path must pass through
 * 3. Black blocks may have direction+count clues indicating constraints
 * 4. White cells must form a connected region
 * 5. Each white cell (non-gate) has exactly 2 open edges (path through)
 * 6. Walls between cells partition the grid
 * 7. The number of walls crossing each row/column must be even (parity constraint)
 * 8. Black cells are surrounded by walls
 * 9. Start position (○) indicates the starting cell of the path
 */
import { CellState, Direction, posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Slalom Types
// ============================================
/**
 * Wall state for cell boundaries
 */
export var SlalomWallState;
(function (SlalomWallState) {
    /** Unknown/undetermined */
    SlalomWallState["UNKNOWN"] = "unknown";
    /** No wall (cells connected) */
    SlalomWallState["OPEN"] = "open";
    /** Wall exists (cells separated) */
    SlalomWallState["WALL"] = "wall";
})(SlalomWallState || (SlalomWallState = {}));
// ============================================
// Slalom Field State
// ============================================
export class SlalomField {
    height;
    width;
    /** Cell states (UNKNOWN = undetermined, WHITE = path, BLACK = block) */
    cells;
    /** Gate markers - -1 means gate exists, null means no gate */
    gates;
    /** Block information - null means no block */
    blocks;
    /** Start position */
    start;
    /** Horizontal walls (between col and col+1) */
    yokoWall;
    /** Vertical walls (between row and row+1) */
    tateWall;
    constructor(height, width, start) {
        this.height = height;
        this.width = width;
        this.start = start;
        this.cells = new Grid(height, width, CellState.UNKNOWN);
        this.gates = new Grid(height, width, () => null);
        this.blocks = new Grid(height, width, () => null);
        this.yokoWall = new Grid(height, width - 1, SlalomWallState.UNKNOWN);
        this.tateWall = new Grid(height - 1, width, SlalomWallState.UNKNOWN);
        // Start position is white
        this.cells.set(start, CellState.WHITE);
    }
    /** Set a block with optional direction/count constraint */
    setBlock(row, col, direction = null, count = -1) {
        this.cells.set(row, col, CellState.BLACK);
        this.blocks.set(row, col, { direction, count });
        // Close all walls around block
        if (row > 0)
            this.setTateWall(row - 1, col, SlalomWallState.WALL);
        if (row < this.height - 1)
            this.setTateWall(row, col, SlalomWallState.WALL);
        if (col > 0)
            this.setYokoWall(row, col - 1, SlalomWallState.WALL);
        if (col < this.width - 1)
            this.setYokoWall(row, col, SlalomWallState.WALL);
    }
    /** Set a gate marker */
    setGate(row, col, isVertical) {
        this.gates.set(row, col, -1);
        // Close walls perpendicular to gate direction
        if (isVertical) {
            // Vertical gate - close horizontal walls
            if (row > 0)
                this.setTateWall(row - 1, col, SlalomWallState.WALL);
            if (row < this.height - 1)
                this.setTateWall(row, col, SlalomWallState.WALL);
        }
        else {
            // Horizontal gate - close vertical walls
            if (col > 0)
                this.setYokoWall(row, col - 1, SlalomWallState.WALL);
            if (col < this.width - 1)
                this.setYokoWall(row, col, SlalomWallState.WALL);
        }
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
            return SlalomWallState.WALL;
        return this.yokoWall.get(row, col);
    }
    /** Get vertical wall state */
    getTateWall(row, col) {
        if (row < 0 || row >= this.height - 1)
            return SlalomWallState.WALL;
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
    /**
     * Black cells: surround with walls, adjacent cells must be white
     * White cells: must have exactly 2 open edges
     */
    nextSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cell = this.cells.get(row, col);
                if (cell === CellState.BLACK) {
                    // Close all walls around black cell
                    if (row > 0) {
                        if (this.getTateWall(row - 1, col) === SlalomWallState.OPEN)
                            return false;
                        this.setTateWall(row - 1, col, SlalomWallState.WALL);
                    }
                    if (row < this.height - 1) {
                        if (this.getTateWall(row, col) === SlalomWallState.OPEN)
                            return false;
                        this.setTateWall(row, col, SlalomWallState.WALL);
                    }
                    if (col > 0) {
                        if (this.getYokoWall(row, col - 1) === SlalomWallState.OPEN)
                            return false;
                        this.setYokoWall(row, col - 1, SlalomWallState.WALL);
                    }
                    if (col < this.width - 1) {
                        if (this.getYokoWall(row, col) === SlalomWallState.OPEN)
                            return false;
                        this.setYokoWall(row, col, SlalomWallState.WALL);
                    }
                }
                else {
                    // Count wall states around this cell
                    let wallCount = 0;
                    let openCount = 0;
                    const wallUp = row === 0 ? SlalomWallState.WALL : this.getTateWall(row - 1, col);
                    const wallDown = row === this.height - 1 ? SlalomWallState.WALL : this.getTateWall(row, col);
                    const wallLeft = col === 0 ? SlalomWallState.WALL : this.getYokoWall(row, col - 1);
                    const wallRight = col === this.width - 1 ? SlalomWallState.WALL : this.getYokoWall(row, col);
                    if (wallUp === SlalomWallState.WALL)
                        wallCount++;
                    else if (wallUp === SlalomWallState.OPEN) {
                        if (this.cells.get(row - 1, col) === CellState.BLACK)
                            return false;
                        this.cells.set(row - 1, col, CellState.WHITE);
                        openCount++;
                    }
                    if (wallDown === SlalomWallState.WALL)
                        wallCount++;
                    else if (wallDown === SlalomWallState.OPEN) {
                        if (this.cells.get(row + 1, col) === CellState.BLACK)
                            return false;
                        this.cells.set(row + 1, col, CellState.WHITE);
                        openCount++;
                    }
                    if (wallLeft === SlalomWallState.WALL)
                        wallCount++;
                    else if (wallLeft === SlalomWallState.OPEN) {
                        if (this.cells.get(row, col - 1) === CellState.BLACK)
                            return false;
                        this.cells.set(row, col - 1, CellState.WHITE);
                        openCount++;
                    }
                    if (wallRight === SlalomWallState.WALL)
                        wallCount++;
                    else if (wallRight === SlalomWallState.OPEN) {
                        if (this.cells.get(row, col + 1) === CellState.BLACK)
                            return false;
                        this.cells.set(row, col + 1, CellState.WHITE);
                        openCount++;
                    }
                    // White cells (non-gate): exactly 2 open edges
                    if (cell === CellState.WHITE) {
                        if (wallCount > 2 || openCount > 2)
                            return false;
                        if (openCount === 2) {
                            // Close remaining edges
                            if (wallUp === SlalomWallState.UNKNOWN)
                                this.setTateWall(row - 1, col, SlalomWallState.WALL);
                            if (wallDown === SlalomWallState.UNKNOWN)
                                this.setTateWall(row, col, SlalomWallState.WALL);
                            if (wallLeft === SlalomWallState.UNKNOWN)
                                this.setYokoWall(row, col - 1, SlalomWallState.WALL);
                            if (wallRight === SlalomWallState.UNKNOWN)
                                this.setYokoWall(row, col, SlalomWallState.WALL);
                        }
                        else if (wallCount === 2) {
                            // Open remaining edges
                            if (wallUp === SlalomWallState.UNKNOWN) {
                                if (this.cells.get(row - 1, col) === CellState.BLACK)
                                    return false;
                                this.setTateWall(row - 1, col, SlalomWallState.OPEN);
                                this.cells.set(row - 1, col, CellState.WHITE);
                            }
                            if (wallDown === SlalomWallState.UNKNOWN) {
                                if (this.cells.get(row + 1, col) === CellState.BLACK)
                                    return false;
                                this.setTateWall(row, col, SlalomWallState.OPEN);
                                this.cells.set(row + 1, col, CellState.WHITE);
                            }
                            if (wallLeft === SlalomWallState.UNKNOWN) {
                                if (this.cells.get(row, col - 1) === CellState.BLACK)
                                    return false;
                                this.setYokoWall(row, col - 1, SlalomWallState.OPEN);
                                this.cells.set(row, col - 1, CellState.WHITE);
                            }
                            if (wallRight === SlalomWallState.UNKNOWN) {
                                if (this.cells.get(row, col + 1) === CellState.BLACK)
                                    return false;
                                this.setYokoWall(row, col, SlalomWallState.OPEN);
                                this.cells.set(row, col + 1, CellState.WHITE);
                            }
                        }
                    }
                    else if (cell === CellState.UNKNOWN) {
                        // Unknown cell: deduce from wall pattern
                        if ((wallCount === 3 && openCount === 1) || openCount > 2) {
                            return false;
                        }
                        if (wallCount > 2) {
                            // 3 or 4 walls means black cell
                            this.cells.set(row, col, CellState.BLACK);
                            if (wallCount === 3) {
                                // Close the 4th wall
                                if (wallUp === SlalomWallState.UNKNOWN)
                                    this.setTateWall(row - 1, col, SlalomWallState.WALL);
                                if (wallDown === SlalomWallState.UNKNOWN)
                                    this.setTateWall(row, col, SlalomWallState.WALL);
                                if (wallLeft === SlalomWallState.UNKNOWN)
                                    this.setYokoWall(row, col - 1, SlalomWallState.WALL);
                                if (wallRight === SlalomWallState.UNKNOWN)
                                    this.setYokoWall(row, col, SlalomWallState.WALL);
                            }
                        }
                        else if (openCount !== 0) {
                            // Has at least one open edge, must be white
                            this.cells.set(row, col, CellState.WHITE);
                        }
                    }
                }
            }
        }
        return true;
    }
    /**
     * Parity constraint: each row/column must have an even number of walls
     */
    oddSolve() {
        // Check vertical walls (crossing horizontal lines)
        for (let row = 0; row < this.height - 1; row++) {
            let openCount = 0;
            let hasUnknown = false;
            for (let col = 0; col < this.width; col++) {
                const wall = this.tateWall.get(row, col);
                if (wall === SlalomWallState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                else if (wall === SlalomWallState.OPEN) {
                    openCount++;
                }
            }
            // If all determined, count must be even
            if (!hasUnknown && openCount % 2 !== 0)
                return false;
        }
        // Check horizontal walls (crossing vertical lines)
        for (let col = 0; col < this.width - 1; col++) {
            let openCount = 0;
            let hasUnknown = false;
            for (let row = 0; row < this.height; row++) {
                const wall = this.yokoWall.get(row, col);
                if (wall === SlalomWallState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                else if (wall === SlalomWallState.OPEN) {
                    openCount++;
                }
            }
            if (!hasUnknown && openCount % 2 !== 0)
                return false;
        }
        return true;
    }
    /**
     * White cells must be connected
     */
    connectSolve() {
        const whitePosSet = new Set();
        let firstWhite = null;
        // Find all white cells
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.WHITE) {
                    const pos = { row, col };
                    whitePosSet.add(posKey(pos));
                    if (firstWhite === null) {
                        firstWhite = pos;
                    }
                }
            }
        }
        if (firstWhite === null)
            return true;
        // Collect connected white cells from first white cell
        const connectedSet = new Set();
        connectedSet.add(posKey(firstWhite));
        this.collectConnected(firstWhite, connectedSet);
        // Check if all white cells are connected
        for (const key of whitePosSet) {
            if (!connectedSet.has(key)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Recursively collect cells connected through open walls
     */
    collectConnected(pos, visited) {
        const { row, col } = pos;
        // Check up
        if (row > 0 && this.getTateWall(row - 1, col) !== SlalomWallState.WALL) {
            const next = { row: row - 1, col };
            const key = posKey(next);
            if (!visited.has(key)) {
                visited.add(key);
                this.collectConnected(next, visited);
            }
        }
        // Check down
        if (row < this.height - 1 && this.getTateWall(row, col) !== SlalomWallState.WALL) {
            const next = { row: row + 1, col };
            const key = posKey(next);
            if (!visited.has(key)) {
                visited.add(key);
                this.collectConnected(next, visited);
            }
        }
        // Check left
        if (col > 0 && this.getYokoWall(row, col - 1) !== SlalomWallState.WALL) {
            const next = { row, col: col - 1 };
            const key = posKey(next);
            if (!visited.has(key)) {
                visited.add(key);
                this.collectConnected(next, visited);
            }
        }
        // Check right
        if (col < this.width - 1 && this.getYokoWall(row, col) !== SlalomWallState.WALL) {
            const next = { row, col: col + 1 };
            const key = posKey(next);
            if (!visited.has(key)) {
                visited.add(key);
                this.collectConnected(next, visited);
            }
        }
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new SlalomField(this.height, this.width, this.start);
        for (const [pos, cell] of this.cells.entries()) {
            cloned.cells.set(pos, cell);
        }
        for (const [pos, gate] of this.gates.entries()) {
            cloned.gates.set(pos, gate);
        }
        for (const [pos, block] of this.blocks.entries()) {
            cloned.blocks.set(pos, block);
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
            for (let col = 0; col < this.width; col++) {
                dump += this.cells.get(row, col);
            }
        }
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                const w = this.yokoWall.get(row, col);
                dump += w === SlalomWallState.WALL ? 'W' : w === SlalomWallState.OPEN ? 'O' : 'U';
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                const w = this.tateWall.get(row, col);
                dump += w === SlalomWallState.WALL ? 'W' : w === SlalomWallState.OPEN ? 'O' : 'U';
            }
        }
        return dump;
    }
    isSolved() {
        // All cells must be determined
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.UNKNOWN)
                    return false;
            }
        }
        // All walls must be determined
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoWall.get(row, col) === SlalomWallState.UNKNOWN)
                    return false;
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateWall.get(row, col) === SlalomWallState.UNKNOWN)
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
            if (!this.oddSolve())
                return false;
            if (!this.connectSolve())
                return false;
            changed = this.getStateDump() !== beforeDump;
        }
        return true;
    }
    toString() {
        const lines = [];
        // Top border
        let topLine = '□';
        for (let col = 0; col < this.width; col++) {
            topLine += '□□';
        }
        lines.push(topLine);
        for (let row = 0; row < this.height; row++) {
            // Cell line
            let cellLine = '□';
            for (let col = 0; col < this.width; col++) {
                const block = this.blocks.get(row, col);
                const gate = this.gates.get(row, col);
                const isStart = row === this.start.row && col === this.start.col;
                if (block !== null) {
                    // Display block with direction+count
                    if (block.count === -1) {
                        cellLine += '■';
                    }
                    else {
                        const dirChar = block.direction === Direction.UP
                            ? 'u'
                            : block.direction === Direction.DOWN
                                ? 'd'
                                : block.direction === Direction.LEFT
                                    ? 'l'
                                    : block.direction === Direction.RIGHT
                                        ? 'r'
                                        : '?';
                        cellLine += dirChar + block.count;
                    }
                }
                else if (gate !== null) {
                    cellLine += '＋';
                }
                else if (isStart) {
                    cellLine += '○';
                }
                else {
                    const cell = this.cells.get(row, col);
                    cellLine += cell === CellState.BLACK ? '■' : cell === CellState.WHITE ? '・' : '　';
                }
                // Horizontal wall
                if (col < this.width - 1) {
                    const wall = this.yokoWall.get(row, col);
                    cellLine += wall === SlalomWallState.WALL ? '□' : wall === SlalomWallState.OPEN ? '　' : '□';
                }
            }
            cellLine += '□';
            lines.push(cellLine);
            // Vertical wall line
            if (row < this.height - 1) {
                let wallLine = '□';
                for (let col = 0; col < this.width; col++) {
                    const wall = this.tateWall.get(row, col);
                    wallLine += wall === SlalomWallState.WALL ? '□' : wall === SlalomWallState.OPEN ? '　' : '□';
                    if (col < this.width - 1) {
                        wallLine += '□';
                    }
                }
                wallLine += '□';
                lines.push(wallLine);
            }
        }
        // Bottom border
        let bottomLine = '□';
        for (let col = 0; col < this.width; col++) {
            bottomLine += '□□';
        }
        lines.push(bottomLine);
        return lines.join('\n');
    }
    /** Get branching candidates */
    getBranchingCandidates() {
        const candidates = [];
        // Prioritize walls
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoWall.get(row, col) === SlalomWallState.UNKNOWN) {
                    candidates.push({ type: 'yokoWall', row, col });
                }
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateWall.get(row, col) === SlalomWallState.UNKNOWN) {
                    candidates.push({ type: 'tateWall', row, col });
                }
            }
        }
        return candidates;
    }
}
// ============================================
// Slalom Solver
// ============================================
export class SlalomSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Parse puzzle from pzv.jp URL format
     * URL format: slalom/d/HEIGHT/WIDTH/PARAM/STARTPOS
     */
    static fromString(height, width, param, startPos) {
        const field = new SlalomField(height, width, { row: Math.floor(startPos / width), col: startPos % width });
        let index = 0;
        let nextReadPos = 0;
        const blockPosList = [];
        // Parse cell types
        for (let i = 0; i < param.length; i++) {
            const ch = param.charAt(i);
            nextReadPos = i + 1;
            const pos = { row: Math.floor(index / width), col: index % width };
            const val = parseInt(ch, 10);
            if (val >= 4) {
                // Skip cells
                index += val - 3;
            }
            else {
                if (val === 1) {
                    // Block
                    field.setBlock(pos.row, pos.col);
                    blockPosList.push(pos);
                }
                else if (val === 2) {
                    // Vertical gate
                    field.setGate(pos.row, pos.col, true);
                }
                else if (val === 3) {
                    // Horizontal gate
                    field.setGate(pos.row, pos.col, false);
                }
                index++;
            }
            if (index >= height * width) {
                break;
            }
        }
        // Parse block constraints
        let blockIndex = 0;
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        for (let i = nextReadPos; i < param.length && blockIndex < blockPosList.length; i++) {
            const ch = param.charAt(i);
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                // Skip blocks
                blockIndex += interval;
            }
            else {
                const blockPos = blockPosList[blockIndex];
                let direction;
                let count;
                if (ch === '-') {
                    // Extended format: -D###
                    const dirNum = parseInt(param.charAt(i + 1), 10);
                    direction = getDirectionByNum(dirNum);
                    count = parseInt(param.substring(i + 2, i + 5), 16);
                    i += 4;
                }
                else if (parseInt(ch, 10) >= 5) {
                    // Medium format: D##
                    const dirNum = parseInt(ch, 10) - 5;
                    direction = getDirectionByNum(dirNum);
                    count = parseInt(param.substring(i + 1, i + 3), 16);
                    i += 2;
                }
                else {
                    // Short format: D#
                    const dirNum = parseInt(ch, 10);
                    direction = getDirectionByNum(dirNum);
                    count = parseInt(param.charAt(i + 1), 10);
                    i += 1;
                }
                field.setBlock(blockPos.row, blockPos.col, direction, count);
                blockIndex++;
            }
        }
        return new SlalomSolver(field);
    }
    getBranchCandidates(state) {
        const candidates = state.getBranchingCandidates();
        if (candidates.length === 0)
            return [];
        const cand = candidates[0];
        if (cand.type === 'yokoWall') {
            return [
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setYokoWall(cand.row, cand.col, SlalomWallState.WALL);
                        return cloned;
                    },
                    description: `Set yokoWall[${cand.row}][${cand.col}] to WALL`,
                },
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setYokoWall(cand.row, cand.col, SlalomWallState.OPEN);
                        return cloned;
                    },
                    description: `Set yokoWall[${cand.row}][${cand.col}] to OPEN`,
                },
            ];
        }
        else {
            // tateWall
            return [
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setTateWall(cand.row, cand.col, SlalomWallState.WALL);
                        return cloned;
                    },
                    description: `Set tateWall[${cand.row}][${cand.col}] to WALL`,
                },
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setTateWall(cand.row, cand.col, SlalomWallState.OPEN);
                        return cloned;
                    },
                    description: `Set tateWall[${cand.row}][${cand.col}] to OPEN`,
                },
            ];
        }
    }
}
// ============================================
// Helper functions
// ============================================
/**
 * Convert numeric direction code to Direction enum
 * Maps to SDVX Direction.getByNum()
 */
function getDirectionByNum(num) {
    switch (num) {
        case 0:
            return Direction.UP;
        case 1:
            return Direction.RIGHT;
        case 2:
            return Direction.DOWN;
        case 3:
            return Direction.LEFT;
        default:
            throw new Error(`Invalid direction number: ${num}`);
    }
}
//# sourceMappingURL=slalom.js.map