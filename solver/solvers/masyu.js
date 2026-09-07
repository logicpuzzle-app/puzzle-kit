/**
 * Masyu Solver
 *
 * Rules:
 * 1. Draw a single continuous loop through all pearl cells
 * 2. White pearls (circles): Loop goes straight through, and turns in at least one adjacent cell
 * 3. Black pearls (filled): Loop turns at the pearl, and goes straight in both directions
 * 4. The loop cannot cross itself or branch
 */
import { EdgeState, DIRECTIONS, Direction, SolveStatus, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Pearl Types
// ============================================
export var PearlType;
(function (PearlType) {
    PearlType["NONE"] = "none";
    PearlType["WHITE"] = "white";
    PearlType["BLACK"] = "black";
})(PearlType || (PearlType = {}));
// ============================================
// Masyu Field State
// ============================================
export class MasyuField {
    height;
    width;
    /** Pearl positions */
    pearls;
    /** Horizontal edges */
    hEdges;
    /** Vertical edges */
    vEdges;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.pearls = new Grid(height, width, () => PearlType.NONE);
        // Horizontal edges: height rows × (width-1) columns
        this.hEdges = new Grid(height, width - 1, () => EdgeState.UNKNOWN);
        // Vertical edges: (height-1) rows × width columns
        this.vEdges = new Grid(height - 1, width, () => EdgeState.UNKNOWN);
    }
    /** Set a pearl */
    setPearl(row, col, type) {
        this.pearls.set(row, col, type);
    }
    /** Get pearl at position */
    getPearl(row, col) {
        return this.pearls.get(row, col);
    }
    /** Get edge state */
    getEdge(row, col, dir) {
        switch (dir) {
            case Direction.UP:
                return row > 0 ? this.vEdges.get(row - 1, col) : EdgeState.EMPTY;
            case Direction.DOWN:
                return row < this.height - 1 ? this.vEdges.get(row, col) : EdgeState.EMPTY;
            case Direction.LEFT:
                return col > 0 ? this.hEdges.get(row, col - 1) : EdgeState.EMPTY;
            case Direction.RIGHT:
                return col < this.width - 1 ? this.hEdges.get(row, col) : EdgeState.EMPTY;
        }
    }
    /** Set edge state */
    setEdge(row, col, dir, state) {
        switch (dir) {
            case Direction.UP:
                if (row > 0)
                    this.vEdges.set(row - 1, col, state);
                break;
            case Direction.DOWN:
                if (row < this.height - 1)
                    this.vEdges.set(row, col, state);
                break;
            case Direction.LEFT:
                if (col > 0)
                    this.hEdges.set(row, col - 1, state);
                break;
            case Direction.RIGHT:
                if (col < this.width - 1)
                    this.hEdges.set(row, col, state);
                break;
        }
    }
    /** Count edges at a cell with specific state */
    countEdges(row, col, state) {
        let count = 0;
        for (const dir of DIRECTIONS) {
            if (this.getEdge(row, col, dir) === state)
                count++;
        }
        return count;
    }
    /** Check if cell has a straight path (up-down or left-right) */
    isStraight(row, col) {
        const up = this.getEdge(row, col, Direction.UP);
        const down = this.getEdge(row, col, Direction.DOWN);
        const left = this.getEdge(row, col, Direction.LEFT);
        const right = this.getEdge(row, col, Direction.RIGHT);
        return (up === EdgeState.LINE && down === EdgeState.LINE) ||
            (left === EdgeState.LINE && right === EdgeState.LINE);
    }
    /** Check if cell can be straight */
    canBeStraight(row, col) {
        const up = this.getEdge(row, col, Direction.UP);
        const down = this.getEdge(row, col, Direction.DOWN);
        const left = this.getEdge(row, col, Direction.LEFT);
        const right = this.getEdge(row, col, Direction.RIGHT);
        // Can be vertical straight
        if (up !== EdgeState.EMPTY && down !== EdgeState.EMPTY &&
            !(left === EdgeState.LINE || right === EdgeState.LINE)) {
            return true;
        }
        // Can be horizontal straight
        if (left !== EdgeState.EMPTY && right !== EdgeState.EMPTY &&
            !(up === EdgeState.LINE || down === EdgeState.LINE)) {
            return true;
        }
        return false;
    }
    /** Check if cell has a turn */
    isTurn(row, col) {
        const up = this.getEdge(row, col, Direction.UP);
        const down = this.getEdge(row, col, Direction.DOWN);
        const left = this.getEdge(row, col, Direction.LEFT);
        const right = this.getEdge(row, col, Direction.RIGHT);
        const vLines = (up === EdgeState.LINE ? 1 : 0) + (down === EdgeState.LINE ? 1 : 0);
        const hLines = (left === EdgeState.LINE ? 1 : 0) + (right === EdgeState.LINE ? 1 : 0);
        return vLines === 1 && hLines === 1;
    }
    /** Check if cell can turn */
    canTurn(row, col) {
        const up = this.getEdge(row, col, Direction.UP);
        const down = this.getEdge(row, col, Direction.DOWN);
        const left = this.getEdge(row, col, Direction.LEFT);
        const right = this.getEdge(row, col, Direction.RIGHT);
        // If both vertical are lines or both horizontal are lines, can't turn
        if ((up === EdgeState.LINE && down === EdgeState.LINE) ||
            (left === EdgeState.LINE && right === EdgeState.LINE)) {
            return false;
        }
        // Need at least one non-empty from each axis
        const vPossible = up !== EdgeState.EMPTY || down !== EdgeState.EMPTY;
        const hPossible = left !== EdgeState.EMPTY || right !== EdgeState.EMPTY;
        return vPossible && hPossible;
    }
    /** Make cell go straight */
    makeStraight(row, col) {
        const up = this.getEdge(row, col, Direction.UP);
        const down = this.getEdge(row, col, Direction.DOWN);
        const left = this.getEdge(row, col, Direction.LEFT);
        const right = this.getEdge(row, col, Direction.RIGHT);
        // If already going one direction, complete it
        if (up === EdgeState.LINE || down === EdgeState.LINE) {
            if (up === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.UP, EdgeState.LINE);
            if (down === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.DOWN, EdgeState.LINE);
            if (left === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.LEFT, EdgeState.EMPTY);
            if (right === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.RIGHT, EdgeState.EMPTY);
        }
        else if (left === EdgeState.LINE || right === EdgeState.LINE) {
            if (left === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.LEFT, EdgeState.LINE);
            if (right === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.RIGHT, EdgeState.LINE);
            if (up === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.UP, EdgeState.EMPTY);
            if (down === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.DOWN, EdgeState.EMPTY);
        }
        else if (up === EdgeState.EMPTY || down === EdgeState.EMPTY) {
            // Must go horizontal (both up and down are blocked)
            if (left === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.LEFT, EdgeState.LINE);
            if (right === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.RIGHT, EdgeState.LINE);
            // Block vertical direction
            if (up === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.UP, EdgeState.EMPTY);
            if (down === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.DOWN, EdgeState.EMPTY);
        }
        else if (left === EdgeState.EMPTY || right === EdgeState.EMPTY) {
            // Must go vertical (both left and right are blocked)
            if (up === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.UP, EdgeState.LINE);
            if (down === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.DOWN, EdgeState.LINE);
            // Block horizontal direction
            if (left === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.LEFT, EdgeState.EMPTY);
            if (right === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.RIGHT, EdgeState.EMPTY);
        }
    }
    /** Make cell turn */
    makeTurn(row, col) {
        const up = this.getEdge(row, col, Direction.UP);
        const down = this.getEdge(row, col, Direction.DOWN);
        const left = this.getEdge(row, col, Direction.LEFT);
        const right = this.getEdge(row, col, Direction.RIGHT);
        // If going one vertical direction, block the other
        if (up === EdgeState.LINE && down === EdgeState.UNKNOWN) {
            this.setEdge(row, col, Direction.DOWN, EdgeState.EMPTY);
        }
        if (down === EdgeState.LINE && up === EdgeState.UNKNOWN) {
            this.setEdge(row, col, Direction.UP, EdgeState.EMPTY);
        }
        if (left === EdgeState.LINE && right === EdgeState.UNKNOWN) {
            this.setEdge(row, col, Direction.RIGHT, EdgeState.EMPTY);
        }
        if (right === EdgeState.LINE && left === EdgeState.UNKNOWN) {
            this.setEdge(row, col, Direction.LEFT, EdgeState.EMPTY);
        }
    }
    /**
     * nextSolve - Extend lines from cells that have exactly one line
     * If a cell has 1 LINE and 2 EMPTY, the remaining UNKNOWN must be LINE
     * Based on sdvx's nextSolve technique
     */
    nextSolve() {
        let changed = false;
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const lines = this.countEdges(row, col, EdgeState.LINE);
                const empty = this.countEdges(row, col, EdgeState.EMPTY);
                const unknown = 4 - lines - empty;
                // If we have exactly 1 line and only 1 unknown, must extend
                if (lines === 1 && unknown === 1) {
                    for (const dir of DIRECTIONS) {
                        if (this.getEdge(row, col, dir) === EdgeState.UNKNOWN) {
                            this.setEdge(row, col, dir, EdgeState.LINE);
                            changed = true;
                        }
                    }
                }
            }
        }
        return changed;
    }
    /**
     * pearlPatternSolve - Apply more sophisticated pearl patterns
     * Based on sdvx's multi-layered pearl solving
     */
    pearlPatternSolve() {
        let changed = false;
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const pearl = this.pearls.get(row, col);
                if (pearl === PearlType.NONE)
                    continue;
                const before = this.getStateDump();
                if (pearl === PearlType.BLACK) {
                    // Black pearl at corner or edge must enter from specific directions
                    this.solveBlackPearlPattern(row, col);
                    // Adjacent black pearls pattern
                    this.solveAdjacentBlackPearls(row, col);
                }
                else if (pearl === PearlType.WHITE) {
                    // White pearl patterns
                    this.solveWhitePearlPattern(row, col);
                    // Adjacent white pearls pattern
                    this.solveAdjacentWhitePearls(row, col);
                }
                if (this.getStateDump() !== before)
                    changed = true;
            }
        }
        return changed;
    }
    /**
     * Handle adjacent black pearls
     * When two black pearls are adjacent, they must both turn
     * but cannot share the same line direction between them
     */
    solveAdjacentBlackPearls(row, col) {
        // Check right neighbor
        if (col < this.width - 1 && this.pearls.get(row, col + 1) === PearlType.BLACK) {
            // Two adjacent black pearls horizontally
            // The edge between them CANNOT be part of the loop
            // (because both need to turn, so the line between them would create straight through one)
            const edgeBetween = this.hEdges.get(row, col);
            if (edgeBetween === EdgeState.UNKNOWN) {
                this.hEdges.set(row, col, EdgeState.EMPTY);
            }
        }
        // Check down neighbor
        if (row < this.height - 1 && this.pearls.get(row + 1, col) === PearlType.BLACK) {
            // Two adjacent black pearls vertically
            const edgeBetween = this.vEdges.get(row, col);
            if (edgeBetween === EdgeState.UNKNOWN) {
                this.vEdges.set(row, col, EdgeState.EMPTY);
            }
        }
        // Check diagonal patterns: black pearls at distance 2 with forced lines
        // If two black pearls are 2 apart in same row/column, they share direction
        // and the cells between them must go straight
        // Black pearl 2 cells to the right
        if (col < this.width - 2 && this.pearls.get(row, col + 2) === PearlType.BLACK) {
            // Both black pearls turn, so middle cell must go straight horizontally
            // Force edges on both sides of middle cell
            if (this.hEdges.get(row, col) === EdgeState.UNKNOWN) {
                this.hEdges.set(row, col, EdgeState.LINE);
            }
            if (this.hEdges.get(row, col + 1) === EdgeState.UNKNOWN) {
                this.hEdges.set(row, col + 1, EdgeState.LINE);
            }
        }
        // Black pearl 2 cells down
        if (row < this.height - 2 && this.pearls.get(row + 2, col) === PearlType.BLACK) {
            // Both black pearls turn, so middle cell must go straight vertically
            if (this.vEdges.get(row, col) === EdgeState.UNKNOWN) {
                this.vEdges.set(row, col, EdgeState.LINE);
            }
            if (this.vEdges.get(row + 1, col) === EdgeState.UNKNOWN) {
                this.vEdges.set(row + 1, col, EdgeState.LINE);
            }
        }
    }
    /**
     * Handle adjacent white pearls
     * When two white pearls are adjacent, they must both go straight
     * The edge between them is forced to be LINE
     */
    solveAdjacentWhitePearls(row, col) {
        // Check right neighbor
        if (col < this.width - 1 && this.pearls.get(row, col + 1) === PearlType.WHITE) {
            // Two adjacent white pearls horizontally - both go straight
            // But they can't both go horizontal (would need curves on both ends)
            // So they must both go vertical? No, they share the horizontal line
            // Actually, if both are white and adjacent horizontally,
            // and both go straight, they MUST both go horizontally through each other
            const edgeBetween = this.hEdges.get(row, col);
            if (edgeBetween === EdgeState.UNKNOWN) {
                this.hEdges.set(row, col, EdgeState.LINE);
            }
        }
        // Check down neighbor
        if (row < this.height - 1 && this.pearls.get(row + 1, col) === PearlType.WHITE) {
            // Two adjacent white pearls vertically - they go straight vertically
            const edgeBetween = this.vEdges.get(row, col);
            if (edgeBetween === EdgeState.UNKNOWN) {
                this.vEdges.set(row, col, EdgeState.LINE);
            }
        }
        // White pearl 2 cells away - check if middle cell is also white
        // Three white pearls in a row force straight through all of them
        if (col < this.width - 2 && this.pearls.get(row, col + 1) === PearlType.WHITE
            && this.pearls.get(row, col + 2) === PearlType.WHITE) {
            // Three horizontal white pearls - all go straight horizontally
            if (this.hEdges.get(row, col) === EdgeState.UNKNOWN) {
                this.hEdges.set(row, col, EdgeState.LINE);
            }
            if (this.hEdges.get(row, col + 1) === EdgeState.UNKNOWN) {
                this.hEdges.set(row, col + 1, EdgeState.LINE);
            }
        }
        if (row < this.height - 2 && this.pearls.get(row + 1, col) === PearlType.WHITE
            && this.pearls.get(row + 2, col) === PearlType.WHITE) {
            // Three vertical white pearls - all go straight vertically
            if (this.vEdges.get(row, col) === EdgeState.UNKNOWN) {
                this.vEdges.set(row, col, EdgeState.LINE);
            }
            if (this.vEdges.get(row + 1, col) === EdgeState.UNKNOWN) {
                this.vEdges.set(row + 1, col, EdgeState.LINE);
            }
        }
    }
    /**
     * Solve black pearl patterns
     * Black pearl: must turn, then both adjacent cells go straight
     */
    solveBlackPearlPattern(row, col) {
        const up = this.getEdge(row, col, Direction.UP);
        const down = this.getEdge(row, col, Direction.DOWN);
        const left = this.getEdge(row, col, Direction.LEFT);
        const right = this.getEdge(row, col, Direction.RIGHT);
        // If near edge, some directions are impossible for straight extension
        // Black pearl needs 2 cells straight after turn, so check distance to edge
        // If only 1 cell from top edge, can't go up (need 2 cells for straight extension)
        if (row === 1 && up === EdgeState.UNKNOWN) {
            this.setEdge(row, col, Direction.UP, EdgeState.EMPTY);
        }
        // If only 1 cell from bottom edge
        if (row === this.height - 2 && down === EdgeState.UNKNOWN) {
            this.setEdge(row, col, Direction.DOWN, EdgeState.EMPTY);
        }
        // If only 1 cell from left edge
        if (col === 1 && left === EdgeState.UNKNOWN) {
            this.setEdge(row, col, Direction.LEFT, EdgeState.EMPTY);
        }
        // If only 1 cell from right edge
        if (col === this.width - 2 && right === EdgeState.UNKNOWN) {
            this.setEdge(row, col, Direction.RIGHT, EdgeState.EMPTY);
        }
        // Black pearl at exact corner - force the only valid turn direction
        // At (0,0): can only turn with right-down
        if (row === 0 && col === 0) {
            if (right === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.RIGHT, EdgeState.LINE);
            if (down === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.DOWN, EdgeState.LINE);
        }
        // At (0, width-1): can only turn with left-down
        if (row === 0 && col === this.width - 1) {
            if (left === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.LEFT, EdgeState.LINE);
            if (down === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.DOWN, EdgeState.LINE);
        }
        // At (height-1, 0): can only turn with right-up
        if (row === this.height - 1 && col === 0) {
            if (right === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.RIGHT, EdgeState.LINE);
            if (up === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.UP, EdgeState.LINE);
        }
        // At (height-1, width-1): can only turn with left-up
        if (row === this.height - 1 && col === this.width - 1) {
            if (left === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.LEFT, EdgeState.LINE);
            if (up === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.UP, EdgeState.LINE);
        }
    }
    /**
     * Solve white pearl patterns
     * White pearl: must go straight, then at least one adjacent turns
     */
    solveWhitePearlPattern(row, col) {
        const up = this.getEdge(row, col, Direction.UP);
        const down = this.getEdge(row, col, Direction.DOWN);
        const left = this.getEdge(row, col, Direction.LEFT);
        const right = this.getEdge(row, col, Direction.RIGHT);
        // White pearl at edge - force straight direction
        // At top row: must go horizontal (can't go straight vertically)
        if (row === 0) {
            if (left === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.LEFT, EdgeState.LINE);
            if (right === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.RIGHT, EdgeState.LINE);
        }
        // At bottom row
        if (row === this.height - 1) {
            if (left === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.LEFT, EdgeState.LINE);
            if (right === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.RIGHT, EdgeState.LINE);
        }
        // At left column
        if (col === 0) {
            if (up === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.UP, EdgeState.LINE);
            if (down === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.DOWN, EdgeState.LINE);
        }
        // At right column
        if (col === this.width - 1) {
            if (up === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.UP, EdgeState.LINE);
            if (down === EdgeState.UNKNOWN)
                this.setEdge(row, col, Direction.DOWN, EdgeState.LINE);
        }
        // White pearl 1 cell from edge - if going toward edge, neighbor can't turn
        // So we need to check if the neighbor at edge can turn or not
        // At row 1: if going up, cell at row 0 must be able to turn
        if (row === 1 && up !== EdgeState.EMPTY) {
            // Check if cell above can turn
            const cellAboveLeft = col > 0 ? this.getEdge(0, col, Direction.LEFT) : EdgeState.EMPTY;
            const cellAboveRight = col < this.width - 1 ? this.getEdge(0, col, Direction.RIGHT) : EdgeState.EMPTY;
            // Cell at edge can only turn horizontally
            if (cellAboveLeft === EdgeState.EMPTY && cellAboveRight === EdgeState.EMPTY) {
                // Can't go up - cell above can't turn
                if (up === EdgeState.UNKNOWN)
                    this.setEdge(row, col, Direction.UP, EdgeState.EMPTY);
            }
        }
    }
    /**
     * oddSolve - Each row/column must have an even number of lines crossing it
     * Based on sdvx: ましゅのルール上、各列をふさぐ壁は必ず偶数になる
     * Returns false if contradiction found
     */
    checkOddParity() {
        // Check each horizontal line between rows
        for (let row = 0; row < this.height - 1; row++) {
            let lineCount = 0;
            let hasUnknown = false;
            for (let col = 0; col < this.width; col++) {
                const edge = this.vEdges.get(row, col);
                if (edge === EdgeState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                else if (edge === EdgeState.LINE) {
                    lineCount++;
                }
            }
            // If all edges are determined, count must be even
            if (!hasUnknown && lineCount % 2 !== 0) {
                return false;
            }
        }
        // Check each vertical line between columns
        for (let col = 0; col < this.width - 1; col++) {
            let lineCount = 0;
            let hasUnknown = false;
            for (let row = 0; row < this.height; row++) {
                const edge = this.hEdges.get(row, col);
                if (edge === EdgeState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                else if (edge === EdgeState.LINE) {
                    lineCount++;
                }
            }
            // If all edges are determined, count must be even
            if (!hasUnknown && lineCount % 2 !== 0) {
                return false;
            }
        }
        return true;
    }
    /**
     * paritySolve - Use parity to determine edges
     * If a row/column boundary has exactly one UNKNOWN edge and the current
     * line count is odd, that edge must be LINE to make it even.
     * If even and one UNKNOWN, it must be EMPTY.
     * Based on sdvx's paritySolve concept
     */
    paritySolve() {
        let changed = false;
        // Check each horizontal boundary between rows
        for (let row = 0; row < this.height - 1; row++) {
            let lineCount = 0;
            let unknownCount = 0;
            let lastUnknownCol = -1;
            for (let col = 0; col < this.width; col++) {
                const edge = this.vEdges.get(row, col);
                if (edge === EdgeState.LINE) {
                    lineCount++;
                }
                else if (edge === EdgeState.UNKNOWN) {
                    unknownCount++;
                    lastUnknownCol = col;
                }
            }
            // If exactly one unknown and odd line count, must be LINE
            if (unknownCount === 1) {
                if (lineCount % 2 === 1) {
                    this.vEdges.set(row, lastUnknownCol, EdgeState.LINE);
                    changed = true;
                }
                else {
                    this.vEdges.set(row, lastUnknownCol, EdgeState.EMPTY);
                    changed = true;
                }
            }
        }
        // Check each vertical boundary between columns
        for (let col = 0; col < this.width - 1; col++) {
            let lineCount = 0;
            let unknownCount = 0;
            let lastUnknownRow = -1;
            for (let row = 0; row < this.height; row++) {
                const edge = this.hEdges.get(row, col);
                if (edge === EdgeState.LINE) {
                    lineCount++;
                }
                else if (edge === EdgeState.UNKNOWN) {
                    unknownCount++;
                    lastUnknownRow = row;
                }
            }
            // If exactly one unknown and odd line count, must be LINE
            if (unknownCount === 1) {
                if (lineCount % 2 === 1) {
                    this.hEdges.set(lastUnknownRow, col, EdgeState.LINE);
                    changed = true;
                }
                else {
                    this.hEdges.set(lastUnknownRow, col, EdgeState.EMPTY);
                    changed = true;
                }
            }
        }
        return changed;
    }
    /**
     * earlyLoopClosurePrevention - Prevent premature loop closure
     * If connecting two cells would close a loop before all pearls are visited,
     * block that edge.
     * Based on sdvx's connectivity-aware solving
     */
    checkEarlyLoopClosure(row, col, dir) {
        // Get the neighbor cell
        let nRow = row, nCol = col;
        switch (dir) {
            case Direction.UP:
                nRow--;
                break;
            case Direction.DOWN:
                nRow++;
                break;
            case Direction.LEFT:
                nCol--;
                break;
            case Direction.RIGHT:
                nCol++;
                break;
        }
        if (nRow < 0 || nRow >= this.height || nCol < 0 || nCol >= this.width) {
            return false;
        }
        // Check if both cells have exactly 1 line already
        const currentLines = this.countEdges(row, col, EdgeState.LINE);
        const neighborLines = this.countEdges(nRow, nCol, EdgeState.LINE);
        if (currentLines !== 1 || neighborLines !== 1) {
            return false; // Not a potential loop closure
        }
        // Check if they're already connected via the existing path
        // If connecting would form a loop, check if all pearls are included
        const visited = new Set();
        const path = [];
        // Trace path from current cell (following existing lines)
        let cur = { row, col };
        let prevDir = null;
        while (true) {
            const key = `${cur.row},${cur.col}`;
            if (visited.has(key))
                break;
            visited.add(key);
            path.push({ ...cur });
            // Find the next direction (line direction that's not where we came from)
            let nextDir = null;
            for (const d of DIRECTIONS) {
                if (this.getEdge(cur.row, cur.col, d) === EdgeState.LINE) {
                    // Skip if this is the direction we came from
                    if (prevDir !== null) {
                        const opposite = this.getOppositeDir(prevDir);
                        if (d === opposite)
                            continue;
                    }
                    nextDir = d;
                    break;
                }
            }
            if (nextDir === null)
                break;
            // Move to next cell
            prevDir = nextDir;
            switch (nextDir) {
                case Direction.UP:
                    cur = { row: cur.row - 1, col: cur.col };
                    break;
                case Direction.DOWN:
                    cur = { row: cur.row + 1, col: cur.col };
                    break;
                case Direction.LEFT:
                    cur = { row: cur.row, col: cur.col - 1 };
                    break;
                case Direction.RIGHT:
                    cur = { row: cur.row, col: cur.col + 1 };
                    break;
            }
        }
        // Check if the path end reaches the neighbor
        if (cur.row === nRow && cur.col === nCol) {
            // Would form a loop - check if all pearls are included
            let totalPearls = 0;
            let visitedPearls = 0;
            for (let r = 0; r < this.height; r++) {
                for (let c = 0; c < this.width; c++) {
                    if (this.pearls.get(r, c) !== PearlType.NONE) {
                        totalPearls++;
                        if (visited.has(`${r},${c}`)) {
                            visitedPearls++;
                        }
                    }
                }
            }
            // If not all pearls are visited, this would be early closure
            if (visitedPearls < totalPearls) {
                return true; // Early closure detected
            }
        }
        return false;
    }
    getOppositeDir(dir) {
        switch (dir) {
            case Direction.UP: return Direction.DOWN;
            case Direction.DOWN: return Direction.UP;
            case Direction.LEFT: return Direction.RIGHT;
            case Direction.RIGHT: return Direction.LEFT;
        }
    }
    /**
     * Check if loop cells are connected (no isolated segments)
     * Based on sdvx's connectSolve
     *
     * Important: This checks if all LINE segments can potentially be connected
     * via LINE or UNKNOWN edges. We only reject if two LINE segments are
     * definitely disconnected (separated by EMPTY edges only).
     */
    checkLoopConnectivity() {
        // Find all cells that are on the loop (have lines)
        const loopCells = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.countEdges(row, col, EdgeState.LINE) > 0) {
                    loopCells.push({ row, col });
                }
            }
        }
        if (loopCells.length === 0)
            return true;
        // BFS from first loop cell, allowing traversal via LINE or UNKNOWN edges
        const visited = new Set();
        const queue = [loopCells[0]];
        visited.add(`${loopCells[0].row},${loopCells[0].col}`);
        while (queue.length > 0) {
            const current = queue.shift();
            // Check all four directions - allow UNKNOWN edges for potential connectivity
            for (const dir of DIRECTIONS) {
                const edgeState = this.getEdge(current.row, current.col, dir);
                // Allow traversal if edge is LINE or UNKNOWN (not EMPTY)
                if (edgeState !== EdgeState.EMPTY) {
                    let nextRow = current.row;
                    let nextCol = current.col;
                    switch (dir) {
                        case Direction.UP:
                            nextRow--;
                            break;
                        case Direction.DOWN:
                            nextRow++;
                            break;
                        case Direction.LEFT:
                            nextCol--;
                            break;
                        case Direction.RIGHT:
                            nextCol++;
                            break;
                    }
                    if (nextRow >= 0 && nextRow < this.height && nextCol >= 0 && nextCol < this.width) {
                        const key = `${nextRow},${nextCol}`;
                        if (!visited.has(key)) {
                            visited.add(key);
                            queue.push({ row: nextRow, col: nextCol });
                        }
                    }
                }
            }
        }
        // All loop cells must be reachable (via LINE or UNKNOWN paths)
        for (const cell of loopCells) {
            if (!visited.has(`${cell.row},${cell.col}`)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Solve white pearl adjacent curve constraint
     * White pearl: loop goes straight, and at least one adjacent cell must turn
     */
    solveWhitePearlAdjacentCurve() {
        let changed = false;
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.pearls.get(row, col) !== PearlType.WHITE)
                    continue;
                const up = this.getEdge(row, col, Direction.UP);
                const down = this.getEdge(row, col, Direction.DOWN);
                const left = this.getEdge(row, col, Direction.LEFT);
                const right = this.getEdge(row, col, Direction.RIGHT);
                // If going vertically (up-down)
                if (up === EdgeState.LINE || down === EdgeState.LINE) {
                    // Adjacent cells (up and down) - at least one must be able to turn
                    const canUpTurn = row > 0 && this.canTurn(row - 1, col);
                    const canDownTurn = row < this.height - 1 && this.canTurn(row + 1, col);
                    if (!canUpTurn && !canDownTurn) {
                        return false; // Contradiction
                    }
                    // If only one can turn, force that one to turn
                    if (!canUpTurn && canDownTurn && row < this.height - 1) {
                        const before = this.getStateDump();
                        this.makeTurn(row + 1, col);
                        if (this.getStateDump() !== before)
                            changed = true;
                    }
                    if (canUpTurn && !canDownTurn && row > 0) {
                        const before = this.getStateDump();
                        this.makeTurn(row - 1, col);
                        if (this.getStateDump() !== before)
                            changed = true;
                    }
                }
                // If going horizontally (left-right)
                if (left === EdgeState.LINE || right === EdgeState.LINE) {
                    // Adjacent cells (left and right) - at least one must be able to turn
                    const canLeftTurn = col > 0 && this.canTurn(row, col - 1);
                    const canRightTurn = col < this.width - 1 && this.canTurn(row, col + 1);
                    if (!canLeftTurn && !canRightTurn) {
                        return false; // Contradiction
                    }
                    // If only one can turn, force that one to turn
                    if (!canLeftTurn && canRightTurn && col < this.width - 1) {
                        const before = this.getStateDump();
                        this.makeTurn(row, col + 1);
                        if (this.getStateDump() !== before)
                            changed = true;
                    }
                    if (canLeftTurn && !canRightTurn && col > 0) {
                        const before = this.getStateDump();
                        this.makeTurn(row, col - 1);
                        if (this.getStateDump() !== before)
                            changed = true;
                    }
                }
            }
        }
        return !changed ? true : changed;
    }
    /**
     * Solve black pearl adjacent straight constraint
     * Black pearl: turns here, adjacent cells in line direction must go straight
     */
    solveBlackPearlAdjacentStraight() {
        let changed = false;
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.pearls.get(row, col) !== PearlType.BLACK)
                    continue;
                const up = this.getEdge(row, col, Direction.UP);
                const down = this.getEdge(row, col, Direction.DOWN);
                const left = this.getEdge(row, col, Direction.LEFT);
                const right = this.getEdge(row, col, Direction.RIGHT);
                // If line goes up, adjacent cell up must go straight
                if (up === EdgeState.LINE && row > 0) {
                    if (!this.canBeStraight(row - 1, col)) {
                        return false;
                    }
                    const before = this.getStateDump();
                    this.makeStraight(row - 1, col);
                    if (this.getStateDump() !== before)
                        changed = true;
                }
                // If line goes down, adjacent cell down must go straight
                if (down === EdgeState.LINE && row < this.height - 1) {
                    if (!this.canBeStraight(row + 1, col)) {
                        return false;
                    }
                    const before = this.getStateDump();
                    this.makeStraight(row + 1, col);
                    if (this.getStateDump() !== before)
                        changed = true;
                }
                // If line goes left, adjacent cell left must go straight
                if (left === EdgeState.LINE && col > 0) {
                    if (!this.canBeStraight(row, col - 1)) {
                        return false;
                    }
                    const before = this.getStateDump();
                    this.makeStraight(row, col - 1);
                    if (this.getStateDump() !== before)
                        changed = true;
                }
                // If line goes right, adjacent cell right must go straight
                if (right === EdgeState.LINE && col < this.width - 1) {
                    if (!this.canBeStraight(row, col + 1)) {
                        return false;
                    }
                    const before = this.getStateDump();
                    this.makeStraight(row, col + 1);
                    if (this.getStateDump() !== before)
                        changed = true;
                }
            }
        }
        return !changed ? true : changed;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new MasyuField(this.height, this.width);
        for (const [pos, pearl] of this.pearls.entries()) {
            cloned.pearls.set(pos, pearl);
        }
        for (const [pos, state] of this.hEdges.entries()) {
            cloned.hEdges.set(pos, state);
        }
        for (const [pos, state] of this.vEdges.entries()) {
            cloned.vEdges.set(pos, state);
        }
        return cloned;
    }
    getStateDump() {
        return `H:${this.hEdges.dump()}|V:${this.vEdges.dump()}`;
    }
    isSolved() {
        // All edges must be determined
        for (const [, state] of this.hEdges.entries()) {
            if (state === EdgeState.UNKNOWN)
                return false;
        }
        for (const [, state] of this.vEdges.entries()) {
            if (state === EdgeState.UNKNOWN)
                return false;
        }
        // All cells must have 0 or 2 edges
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const count = this.countEdges(row, col, EdgeState.LINE);
                if (count !== 0 && count !== 2)
                    return false;
            }
        }
        // Pearl constraints must be satisfied
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const pearl = this.pearls.get(row, col);
                if (pearl === PearlType.WHITE) {
                    if (!this.isStraight(row, col))
                        return false;
                    // White pearl: at least one adjacent cell in line direction must turn
                    if (!this.checkWhiteAdjacentTurns(row, col))
                        return false;
                }
                else if (pearl === PearlType.BLACK) {
                    if (!this.isTurn(row, col))
                        return false;
                    // Black pearl: both adjacent cells in line directions must go straight
                    if (!this.checkBlackAdjacentStraight(row, col))
                        return false;
                }
            }
        }
        // Must form exactly one loop (no isolated segments)
        if (!this.checkSingleLoop())
            return false;
        return true;
    }
    /** Check that white pearl has at least one adjacent turn */
    checkWhiteAdjacentTurns(row, col) {
        const up = this.getEdge(row, col, Direction.UP);
        const down = this.getEdge(row, col, Direction.DOWN);
        const left = this.getEdge(row, col, Direction.LEFT);
        const right = this.getEdge(row, col, Direction.RIGHT);
        // If going vertically (up-down)
        if (up === EdgeState.LINE && down === EdgeState.LINE) {
            // At least one of the cells above or below must turn
            const upTurns = row > 0 && this.isTurn(row - 1, col);
            const downTurns = row < this.height - 1 && this.isTurn(row + 1, col);
            return upTurns || downTurns;
        }
        // If going horizontally (left-right)
        if (left === EdgeState.LINE && right === EdgeState.LINE) {
            // At least one of the cells left or right must turn
            const leftTurns = col > 0 && this.isTurn(row, col - 1);
            const rightTurns = col < this.width - 1 && this.isTurn(row, col + 1);
            return leftTurns || rightTurns;
        }
        return false; // Not straight - invalid
    }
    /** Check that black pearl has both adjacent cells going straight */
    checkBlackAdjacentStraight(row, col) {
        const up = this.getEdge(row, col, Direction.UP);
        const down = this.getEdge(row, col, Direction.DOWN);
        const left = this.getEdge(row, col, Direction.LEFT);
        const right = this.getEdge(row, col, Direction.RIGHT);
        // Find the two line directions (turn = one vertical + one horizontal)
        const hasUp = up === EdgeState.LINE;
        const hasDown = down === EdgeState.LINE;
        const hasLeft = left === EdgeState.LINE;
        const hasRight = right === EdgeState.LINE;
        // If line goes up, cell above must go straight (vertically)
        if (hasUp && row > 0) {
            if (!this.isStraight(row - 1, col))
                return false;
        }
        // If line goes down, cell below must go straight (vertically)
        if (hasDown && row < this.height - 1) {
            if (!this.isStraight(row + 1, col))
                return false;
        }
        // If line goes left, cell to left must go straight (horizontally)
        if (hasLeft && col > 0) {
            if (!this.isStraight(row, col - 1))
                return false;
        }
        // If line goes right, cell to right must go straight (horizontally)
        if (hasRight && col < this.width - 1) {
            if (!this.isStraight(row, col + 1))
                return false;
        }
        return true;
    }
    /** Check that there is exactly one loop (connected, all cells with lines form one component) */
    checkSingleLoop() {
        // Find all cells that have lines
        const loopCells = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.countEdges(row, col, EdgeState.LINE) > 0) {
                    loopCells.push({ row, col });
                }
            }
        }
        if (loopCells.length === 0)
            return false; // No loop at all
        // BFS from first loop cell, following only LINE edges
        const visited = new Set();
        const queue = [loopCells[0]];
        visited.add(`${loopCells[0].row},${loopCells[0].col}`);
        while (queue.length > 0) {
            const current = queue.shift();
            for (const dir of DIRECTIONS) {
                // Only follow LINE edges
                if (this.getEdge(current.row, current.col, dir) === EdgeState.LINE) {
                    let nextRow = current.row;
                    let nextCol = current.col;
                    switch (dir) {
                        case Direction.UP:
                            nextRow--;
                            break;
                        case Direction.DOWN:
                            nextRow++;
                            break;
                        case Direction.LEFT:
                            nextCol--;
                            break;
                        case Direction.RIGHT:
                            nextCol++;
                            break;
                    }
                    if (nextRow >= 0 && nextRow < this.height && nextCol >= 0 && nextCol < this.width) {
                        const key = `${nextRow},${nextCol}`;
                        if (!visited.has(key)) {
                            visited.add(key);
                            queue.push({ row: nextRow, col: nextCol });
                        }
                    }
                }
            }
        }
        // All loop cells must be reachable
        return loopCells.every(cell => visited.has(`${cell.row},${cell.col}`));
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            changed = false;
            // Phase 1: Pearl pattern solving (edge/corner optimizations)
            {
                const before = this.getStateDump();
                this.pearlPatternSolve();
                if (this.getStateDump() !== before)
                    changed = true;
            }
            // Phase 2: Basic pearl constraints
            for (let row = 0; row < this.height; row++) {
                for (let col = 0; col < this.width; col++) {
                    const pearl = this.pearls.get(row, col);
                    if (pearl === PearlType.WHITE) {
                        // White pearl: must go straight
                        if (!this.canBeStraight(row, col))
                            return false;
                        const before = this.getStateDump();
                        this.makeStraight(row, col);
                        if (this.getStateDump() !== before)
                            changed = true;
                    }
                    else if (pearl === PearlType.BLACK) {
                        // Black pearl: must turn, then go straight
                        if (!this.canTurn(row, col))
                            return false;
                        const before = this.getStateDump();
                        this.makeTurn(row, col);
                        if (this.getStateDump() !== before)
                            changed = true;
                    }
                }
            }
            // Phase 3: Loop constraints (each cell has 0 or 2 edges)
            for (let row = 0; row < this.height; row++) {
                for (let col = 0; col < this.width; col++) {
                    const lines = this.countEdges(row, col, EdgeState.LINE);
                    const empty = this.countEdges(row, col, EdgeState.EMPTY);
                    const unknown = 4 - lines - empty;
                    if (lines > 2)
                        return false;
                    if (lines === 1 && unknown === 0)
                        return false;
                    if (lines === 2) {
                        // Mark remaining as empty
                        for (const dir of DIRECTIONS) {
                            if (this.getEdge(row, col, dir) === EdgeState.UNKNOWN) {
                                this.setEdge(row, col, dir, EdgeState.EMPTY);
                                changed = true;
                            }
                        }
                    }
                    if (lines === 1 && unknown === 1) {
                        // Must continue
                        for (const dir of DIRECTIONS) {
                            if (this.getEdge(row, col, dir) === EdgeState.UNKNOWN) {
                                this.setEdge(row, col, dir, EdgeState.LINE);
                                changed = true;
                            }
                        }
                    }
                    // Dead end prevention
                    if (lines === 0 && unknown === 1) {
                        for (const dir of DIRECTIONS) {
                            if (this.getEdge(row, col, dir) === EdgeState.UNKNOWN) {
                                this.setEdge(row, col, dir, EdgeState.EMPTY);
                                changed = true;
                            }
                        }
                    }
                }
            }
            // Phase 4: nextSolve - extend lines from determined cells
            if (this.nextSolve())
                changed = true;
            // Phase 5: White pearl adjacent curve constraint
            {
                const before = this.getStateDump();
                const whitePearlResult = this.solveWhitePearlAdjacentCurve();
                if (whitePearlResult === false)
                    return false;
                if (this.getStateDump() !== before)
                    changed = true;
            }
            // Phase 6: Black pearl adjacent straight constraint
            {
                const before = this.getStateDump();
                const blackPearlResult = this.solveBlackPearlAdjacentStraight();
                if (blackPearlResult === false)
                    return false;
                if (this.getStateDump() !== before)
                    changed = true;
            }
            // Phase 7: paritySolve - use parity to determine remaining edges
            if (this.paritySolve())
                changed = true;
            // Phase 8: Early loop closure prevention
            for (let row = 0; row < this.height; row++) {
                for (let col = 0; col < this.width; col++) {
                    for (const dir of DIRECTIONS) {
                        if (this.getEdge(row, col, dir) === EdgeState.UNKNOWN) {
                            if (this.checkEarlyLoopClosure(row, col, dir)) {
                                this.setEdge(row, col, dir, EdgeState.EMPTY);
                                changed = true;
                            }
                        }
                    }
                }
            }
        }
        // After main loop, check additional constraints
        // oddSolve - parity check (each row/col crossing must have even number of lines)
        if (!this.checkOddParity())
            return false;
        // connectSolve - loop connectivity check (all LINE cells must be potentially connected)
        if (!this.checkLoopConnectivity())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const pearl = this.pearls.get(row, col);
                if (pearl === PearlType.WHITE) {
                    line += '○';
                }
                else if (pearl === PearlType.BLACK) {
                    line += '●';
                }
                else {
                    const edges = this.countEdges(row, col, EdgeState.LINE);
                    line += edges > 0 ? '+' : '·';
                }
                if (col < this.width - 1) {
                    const h = this.hEdges.get(row, col);
                    line += h === EdgeState.LINE ? '─' : ' ';
                }
            }
            lines.push(line);
            if (row < this.height - 1) {
                let vLine = '';
                for (let col = 0; col < this.width; col++) {
                    const v = this.vEdges.get(row, col);
                    vLine += v === EdgeState.LINE ? '│' : ' ';
                    if (col < this.width - 1) {
                        vLine += ' ';
                    }
                }
                lines.push(vLine);
            }
        }
        return lines.join('\n');
    }
    /**
     * candSolve - 仮置きして調べる（SDVXスタイル）
     * 各UNKNOWNエッジに対して:
     * - LINEを仮置きして矛盾がないか調べる
     * - EMPTYを仮置きして矛盾がないか調べる
     * - 一方が矛盾する場合、もう一方を確定する
     * - 両方可能な場合、共通の結果を適用する
     * @param recursive 再帰深度（0以上）
     * @returns 矛盾があればfalse
     */
    candSolve(recursive = 0) {
        const beforeDump = this.getStateDump();
        // 水平エッジを順にスキャン
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.hEdges.get(row, col) !== EdgeState.UNKNOWN)
                    continue;
                if (!this.oneCandHorizontalSolve(row, col, recursive)) {
                    return false;
                }
            }
        }
        // 垂直エッジを順にスキャン
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.vEdges.get(row, col) !== EdgeState.UNKNOWN)
                    continue;
                if (!this.oneCandVerticalSolve(row, col, recursive)) {
                    return false;
                }
            }
        }
        // 状態が変わったら再度candSolve
        if (this.getStateDump() !== beforeDump) {
            return this.candSolve(recursive);
        }
        return true;
    }
    /**
     * 1つの水平エッジに対する仮置き解法
     */
    oneCandHorizontalSolve(row, col, recursive) {
        // LINEを仮置き
        const virtual1 = this.clone();
        virtual1.hEdges.set(row, col, EdgeState.LINE);
        let allowLine = virtual1.solveAndCheck();
        if (allowLine && recursive > 0) {
            allowLine = virtual1.candSolve(recursive - 1);
        }
        // EMPTYを仮置き
        const virtual2 = this.clone();
        virtual2.hEdges.set(row, col, EdgeState.EMPTY);
        let allowEmpty = virtual2.solveAndCheck();
        if (allowEmpty && recursive > 0) {
            allowEmpty = virtual2.candSolve(recursive - 1);
        }
        if (!allowLine && !allowEmpty) {
            return false;
        }
        else if (!allowLine) {
            this.copyEdgesFrom(virtual2);
        }
        else if (!allowEmpty) {
            this.copyEdgesFrom(virtual1);
        }
        else {
            this.applyCommonEdges(virtual1, virtual2);
        }
        return true;
    }
    /**
     * 1つの垂直エッジに対する仮置き解法
     */
    oneCandVerticalSolve(row, col, recursive) {
        // LINEを仮置き
        const virtual1 = this.clone();
        virtual1.vEdges.set(row, col, EdgeState.LINE);
        let allowLine = virtual1.solveAndCheck();
        if (allowLine && recursive > 0) {
            allowLine = virtual1.candSolve(recursive - 1);
        }
        // EMPTYを仮置き
        const virtual2 = this.clone();
        virtual2.vEdges.set(row, col, EdgeState.EMPTY);
        let allowEmpty = virtual2.solveAndCheck();
        if (allowEmpty && recursive > 0) {
            allowEmpty = virtual2.candSolve(recursive - 1);
        }
        if (!allowLine && !allowEmpty) {
            return false;
        }
        else if (!allowLine) {
            this.copyEdgesFrom(virtual2);
        }
        else if (!allowEmpty) {
            this.copyEdgesFrom(virtual1);
        }
        else {
            this.applyCommonEdges(virtual1, virtual2);
        }
        return true;
    }
    /**
     * 他のフィールドからエッジ状態をコピー
     */
    copyEdgesFrom(other) {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                this.hEdges.set(row, col, other.hEdges.get(row, col));
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                this.vEdges.set(row, col, other.vEdges.get(row, col));
            }
        }
    }
    /**
     * 2つの仮想フィールドで共通の結果を現在のフィールドに適用
     * 「どちらにしても」理論
     */
    applyCommonEdges(virtual1, virtual2) {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                const e1 = virtual1.hEdges.get(row, col);
                const e2 = virtual2.hEdges.get(row, col);
                if (e1 === e2 && e1 !== EdgeState.UNKNOWN) {
                    this.hEdges.set(row, col, e1);
                }
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                const e1 = virtual1.vEdges.get(row, col);
                const e2 = virtual2.vEdges.get(row, col);
                if (e1 === e2 && e1 !== EdgeState.UNKNOWN) {
                    this.vEdges.set(row, col, e1);
                }
            }
        }
    }
    /** Get unknown edges for branching, sorted by priority */
    getUnknownEdges() {
        const unknowns = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.hEdges.get(row, col) === EdgeState.UNKNOWN) {
                    const priority = this.calculateEdgePriority(row, col, Direction.RIGHT);
                    unknowns.push({ row, col, dir: Direction.RIGHT, priority });
                }
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.vEdges.get(row, col) === EdgeState.UNKNOWN) {
                    const priority = this.calculateEdgePriority(row, col, Direction.DOWN);
                    unknowns.push({ row, col, dir: Direction.DOWN, priority });
                }
            }
        }
        // Sort by priority (higher = more constrained = should try first)
        unknowns.sort((a, b) => b.priority - a.priority);
        return unknowns.map(({ row, col, dir }) => ({ row, col, dir }));
    }
    /**
     * Calculate priority for an edge
     * Higher priority = more constrained = should try first
     * Based on sdvx's candSolve heuristics
     */
    calculateEdgePriority(row, col, dir) {
        let priority = 0;
        // Get both cells connected by this edge
        let row2 = row, col2 = col;
        if (dir === Direction.RIGHT)
            col2++;
        else if (dir === Direction.DOWN)
            row2++;
        // Priority 1: Adjacent to pearl (most important)
        if (this.pearls.get(row, col) !== PearlType.NONE)
            priority += 100;
        if (row2 < this.height && col2 < this.width && this.pearls.get(row2, col2) !== PearlType.NONE)
            priority += 100;
        // Priority 2: Adjacent to cells with lines (extends existing path)
        const lines1 = this.countEdges(row, col, EdgeState.LINE);
        const lines2 = row2 < this.height && col2 < this.width ? this.countEdges(row2, col2, EdgeState.LINE) : 0;
        priority += lines1 * 20;
        priority += lines2 * 20;
        // Priority 3: Cells with fewer unknowns (more constrained)
        const unknown1 = 4 - this.countEdges(row, col, EdgeState.LINE) - this.countEdges(row, col, EdgeState.EMPTY);
        const unknown2 = row2 < this.height && col2 < this.width
            ? 4 - this.countEdges(row2, col2, EdgeState.LINE) - this.countEdges(row2, col2, EdgeState.EMPTY)
            : 0;
        priority += (4 - unknown1) * 5;
        priority += (4 - unknown2) * 5;
        // Priority 4: Near edges of grid (often more constrained)
        if (row === 0 || row === this.height - 1)
            priority += 3;
        if (col === 0 || col === this.width - 1)
            priority += 3;
        if (row2 === 0 || row2 === this.height - 1)
            priority += 3;
        if (col2 === 0 || col2 === this.width - 1)
            priority += 3;
        return priority;
    }
}
// ============================================
// Masyu Solver
// ============================================
export class MasyuSolver extends BaseSolver {
    candCount = 0;
    backtrackCount = 0;
    candSolveCalls = 0;
    constructor(field) {
        super(field);
    }
    /** Get solver statistics */
    getStats() {
        return {
            branchCount: this.candCount,
            backtrackCount: this.backtrackCount,
            candSolveCalls: this.candSolveCalls,
        };
    }
    /** Create solver from puzzle string */
    static fromString(height, width, puzzle) {
        const field = new MasyuField(height, width);
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const ch = puzzle[row]?.[col]?.toLowerCase();
                if (ch === 'o' || ch === 'w') {
                    field.setPearl(row, col, PearlType.WHITE);
                }
                else if (ch === '*' || ch === 'b') {
                    field.setPearl(row, col, PearlType.BLACK);
                }
            }
        }
        return new MasyuSolver(field);
    }
    /**
     * SDVXスタイルのソルバー
     * パターン: 手筋ループ → 変化なし → candSolve → 変化なし → 分岐 → 再度手筋
     */
    solve(config) {
        const startTime = Date.now();
        const timeout = config?.timeout ?? 60000;
        const maxRecursive = 3;
        this.candCount = 0;
        this.backtrackCount = 0;
        this.candSolveCalls = 0;
        while (!this.field.isSolved()) {
            // タイムアウトチェック
            if (Date.now() - startTime > timeout) {
                return {
                    status: SolveStatus.TIMEOUT,
                    state: this.field,
                    propagationCount: 0,
                    branchCount: this.candCount,
                };
            }
            const beforeDump = this.field.getStateDump();
            // Phase 1: 手筋ループ（solveAndCheck）
            if (!this.field.solveAndCheck()) {
                return {
                    status: SolveStatus.UNSOLVABLE,
                    propagationCount: 0,
                    branchCount: this.candCount,
                };
            }
            // solveAndCheckで進捗があれば、ループの先頭に戻る
            if (this.field.getStateDump() !== beforeDump) {
                continue;
            }
            // Phase 2: candSolve（仮置き解法）を深さを増しながら試す
            let madeProgress = false;
            for (let recursiveLevel = 0; recursiveLevel < maxRecursive; recursiveLevel++) {
                this.candSolveCalls++;
                const beforeCand = this.field.getStateDump();
                if (!this.field.candSolve(recursiveLevel)) {
                    return {
                        status: SolveStatus.UNSOLVABLE,
                        propagationCount: 0,
                        branchCount: this.candCount,
                    };
                }
                // candSolveで進捗があれば、solveAndCheckに戻る
                if (this.field.getStateDump() !== beforeCand) {
                    madeProgress = true;
                    break;
                }
            }
            // candSolveで進捗があれば、ループの先頭に戻る
            if (madeProgress) {
                continue;
            }
            // Phase 3: 分岐（ブランチング）
            const unknowns = this.field.getUnknownEdges();
            if (unknowns.length === 0) {
                // UNKNOWNがないのに解けていない
                return {
                    status: SolveStatus.TIMEOUT,
                    state: this.field,
                    propagationCount: 0,
                    branchCount: this.candCount,
                    error: 'No unknown edges but not solved',
                };
            }
            const edge = unknowns[0];
            this.candCount++;
            // Try LINE first
            const tryLine = this.field.clone();
            tryLine.setEdge(edge.row, edge.col, edge.dir, EdgeState.LINE);
            const lineSolver = new MasyuSolver(tryLine);
            const lineResult = lineSolver.solve({
                timeout: timeout - (Date.now() - startTime),
            });
            // Try EMPTY
            const tryEmpty = this.field.clone();
            tryEmpty.setEdge(edge.row, edge.col, edge.dir, EdgeState.EMPTY);
            const emptySolver = new MasyuSolver(tryEmpty);
            const emptyResult = emptySolver.solve({
                timeout: timeout - (Date.now() - startTime),
            });
            // Check for multiple solutions
            const lineSolved = lineResult.status === SolveStatus.SOLVED;
            const emptySolved = emptyResult.status === SolveStatus.SOLVED;
            const lineMultiple = lineResult.status === SolveStatus.MULTIPLE;
            const emptyMultiple = emptyResult.status === SolveStatus.MULTIPLE;
            // If either branch returned MULTIPLE, propagate it
            if (lineMultiple || emptyMultiple) {
                return {
                    status: SolveStatus.MULTIPLE,
                    state: this.field, // Return current state with confirmed parts
                    propagationCount: 0,
                    branchCount: this.candCount,
                };
            }
            // If both branches found solutions, we have multiple solutions
            if (lineSolved && emptySolved) {
                return {
                    status: SolveStatus.MULTIPLE,
                    state: this.field, // Return current state with confirmed parts
                    propagationCount: 0,
                    branchCount: this.candCount,
                };
            }
            // If only LINE solved
            if (lineSolved) {
                this.backtrackCount += lineSolver.backtrackCount;
                return {
                    status: SolveStatus.SOLVED,
                    state: lineResult.state,
                    propagationCount: 0,
                    branchCount: this.candCount + (lineResult.branchCount ?? 0),
                };
            }
            // If only EMPTY solved
            if (emptySolved) {
                this.backtrackCount += emptySolver.backtrackCount;
                return {
                    status: SolveStatus.SOLVED,
                    state: emptyResult.state,
                    propagationCount: 0,
                    branchCount: this.candCount + (emptyResult.branchCount ?? 0),
                };
            }
            this.backtrackCount += 2;
            // Both failed - unsolvable
            return {
                status: SolveStatus.UNSOLVABLE,
                propagationCount: 0,
                branchCount: this.candCount,
                error: 'Both branches failed',
            };
        }
        // Verify the solution is valid
        if (!this.field.isSolved()) {
            return {
                status: SolveStatus.UNSOLVABLE,
                propagationCount: 0,
                branchCount: this.candCount,
                error: 'Solution verification failed',
            };
        }
        return {
            status: SolveStatus.SOLVED,
            state: this.field,
            propagationCount: 0,
            branchCount: this.candCount,
        };
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownEdges();
        if (unknowns.length === 0)
            return [];
        const edge = unknowns[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setEdge(edge.row, edge.col, edge.dir, EdgeState.LINE);
                    return cloned;
                },
                description: `Set edge at (${edge.row}, ${edge.col}) ${edge.dir} to LINE`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setEdge(edge.row, edge.col, edge.dir, EdgeState.EMPTY);
                    return cloned;
                },
                description: `Set edge at (${edge.row}, ${edge.col}) ${edge.dir} to EMPTY`,
            },
        ];
    }
}
//# sourceMappingURL=masyu.js.map