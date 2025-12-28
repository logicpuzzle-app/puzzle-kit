/**
 * CircleSquare Solver
 *
 * Rules:
 * 1. Each white cell (circle) must be part of exactly one square region
 * 2. Black cells (squares) are outside all square regions
 * 3. Each square region is bordered by black cells
 * 4. No 2x2 area can be entirely black (no pools)
 * 5. All black cells must be connected
 */
import { CellState, DIRECTIONS, adjacent, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
/** Check if a position is inside a square */
function positionInSquare(pos, square) {
    return (pos.row >= square.topLeft.row &&
        pos.row <= square.bottomRight.row &&
        pos.col >= square.topLeft.col &&
        pos.col <= square.bottomRight.col);
}
/** Check if two squares overlap */
function squaresOverlap(s1, s2) {
    return !(s1.bottomRight.row < s2.topLeft.row ||
        s2.bottomRight.row < s1.topLeft.row ||
        s1.bottomRight.col < s2.topLeft.col ||
        s2.bottomRight.col < s1.topLeft.col);
}
/** Get all positions in a square */
function getSquarePositions(square) {
    const positions = [];
    for (let row = square.topLeft.row; row <= square.bottomRight.row; row++) {
        for (let col = square.topLeft.col; col <= square.bottomRight.col; col++) {
            positions.push({ row, col });
        }
    }
    return positions;
}
/** Get edge positions around a square (cells that should be black) */
function getSquareEdgePositions(square, height, width) {
    const edges = [];
    // Top edge
    if (square.topLeft.row > 0) {
        for (let col = square.topLeft.col; col <= square.bottomRight.col; col++) {
            edges.push({ row: square.topLeft.row - 1, col });
        }
    }
    // Bottom edge
    if (square.bottomRight.row < height - 1) {
        for (let col = square.topLeft.col; col <= square.bottomRight.col; col++) {
            edges.push({ row: square.bottomRight.row + 1, col });
        }
    }
    // Left edge
    if (square.topLeft.col > 0) {
        for (let row = square.topLeft.row; row <= square.bottomRight.row; row++) {
            edges.push({ row, col: square.topLeft.col - 1 });
        }
    }
    // Right edge
    if (square.bottomRight.col < width - 1) {
        for (let row = square.topLeft.row; row <= square.bottomRight.row; row++) {
            edges.push({ row, col: square.bottomRight.col + 1 });
        }
    }
    return edges;
}
// ============================================
// CircleSquare Field State
// ============================================
export class CirclesquareField {
    height;
    width;
    /** Cell states */
    cells;
    /** Fixed cells from initial puzzle */
    fixedCells;
    /** Square candidates */
    squareCand;
    /** Fixed (confirmed) squares */
    squareFixed;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.fixedCells = new Set();
        this.squareCand = [];
        this.squareFixed = [];
    }
    /** Initialize square candidates for the puzzle */
    initSquareCandidates() {
        this.squareCand = [];
        this.squareFixed = [];
        const maxSize = Math.min(this.height, this.width);
        for (let size = 1; size <= maxSize; size++) {
            for (let row = 0; row <= this.height - size; row++) {
                for (let col = 0; col <= this.width - size; col++) {
                    this.squareCand.push({
                        topLeft: { row, col },
                        bottomRight: { row: row + size - 1, col: col + size - 1 },
                        size,
                    });
                }
            }
        }
    }
    /** Parse puzzle from pzv.jp format (3 cells per character, base-36 encoding) */
    parseParam(param) {
        let index = 0;
        for (let i = 0; i < param.length; i++) {
            const ch = param.charAt(i);
            const bitInfo = parseInt(ch, 36);
            // Each character encodes 3 cells
            const pos1 = Math.floor(bitInfo / 9) % 3;
            const pos2 = Math.floor(bitInfo / 3) % 3;
            const pos3 = bitInfo % 3;
            const positions = [pos1, pos2, pos3];
            for (const posVal of positions) {
                const row = Math.floor(index / this.width);
                const col = index % this.width;
                if (row < this.height) {
                    if (posVal === 1) {
                        // White/circle
                        this.cells.set(row, col, CellState.WHITE);
                        this.fixedCells.add(posKey({ row, col }));
                    }
                    else if (posVal === 2) {
                        // Black/square
                        this.cells.set(row, col, CellState.BLACK);
                        this.fixedCells.add(posKey({ row, col }));
                    }
                }
                index++;
            }
        }
        this.initSquareCandidates();
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell to black */
    setBlack(row, col) {
        this.cells.set(row, col, CellState.BLACK);
    }
    /** Set cell to white */
    setWhite(row, col) {
        this.cells.set(row, col, CellState.WHITE);
    }
    // ========== Constraint solving ==========
    /**
     * Square constraint solving:
     * - Remove candidates that overlap with black cells
     * - If a white cell has only one candidate square, fix it
     * - Fixed squares make their interior white and edges black
     */
    sikakuSolve() {
        // Check white cells for square candidates
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.WHITE) {
                    const pos = { row, col };
                    // Check if already in a fixed square
                    let isFixed = false;
                    for (const fixed of this.squareFixed) {
                        if (positionInSquare(pos, fixed)) {
                            isFixed = true;
                            break;
                        }
                    }
                    if (isFixed)
                        continue;
                    // Find candidate squares containing this position
                    let pickup = null;
                    let only = true;
                    for (const cand of this.squareCand) {
                        if (positionInSquare(pos, cand)) {
                            if (pickup === null) {
                                pickup = cand;
                            }
                            else {
                                only = false;
                                break;
                            }
                        }
                    }
                    // No candidates means contradiction
                    if (pickup === null) {
                        return false;
                    }
                    // Single candidate means fixed
                    if (only) {
                        this.squareCand = this.squareCand.filter((s) => s !== pickup);
                        this.squareFixed.push(pickup);
                    }
                }
            }
        }
        // Check fixed squares don't overlap
        for (let i = 0; i < this.squareFixed.length; i++) {
            for (let j = i + 1; j < this.squareFixed.length; j++) {
                if (squaresOverlap(this.squareFixed[i], this.squareFixed[j])) {
                    return false;
                }
            }
        }
        // Remove candidates that overlap with fixed squares
        this.squareCand = this.squareCand.filter((cand) => {
            for (const fixed of this.squareFixed) {
                if (squaresOverlap(cand, fixed)) {
                    return false;
                }
            }
            return true;
        });
        // Apply fixed square constraints
        for (const fixed of this.squareFixed) {
            // Interior cells are white
            for (const pos of getSquarePositions(fixed)) {
                if (this.cells.get(pos) === CellState.BLACK) {
                    return false;
                }
                this.cells.set(pos, CellState.WHITE);
            }
            // Edge cells are black
            for (const edgePos of getSquareEdgePositions(fixed, this.height, this.width)) {
                if (this.cells.get(edgePos) === CellState.WHITE) {
                    return false;
                }
                this.cells.set(edgePos, CellState.BLACK);
            }
        }
        // Remove candidates that contain black cells or have white cells in edges
        this.squareCand = this.squareCand.filter((cand) => {
            // Check interior
            for (const pos of getSquarePositions(cand)) {
                if (this.cells.get(pos) === CellState.BLACK) {
                    return false;
                }
            }
            // Check edges
            for (const edgePos of getSquareEdgePositions(cand, this.height, this.width)) {
                if (this.cells.get(edgePos) === CellState.WHITE) {
                    return false;
                }
            }
            return true;
        });
        return true;
    }
    /** Prevent 2x2 black pools */
    pondSolve() {
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                const states = [
                    this.cells.get(row, col),
                    this.cells.get(row, col + 1),
                    this.cells.get(row + 1, col),
                    this.cells.get(row + 1, col + 1),
                ];
                const blackCount = states.filter((s) => s === CellState.BLACK).length;
                // 4 blacks is contradiction
                if (blackCount === 4) {
                    return false;
                }
                // 3 blacks means the unknown must be white
                if (blackCount === 3) {
                    const positions = [
                        { row, col },
                        { row, col: col + 1 },
                        { row: row + 1, col },
                        { row: row + 1, col: col + 1 },
                    ];
                    for (let i = 0; i < 4; i++) {
                        if (states[i] === CellState.UNKNOWN) {
                            this.cells.set(positions[i], CellState.WHITE);
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Check black cell connectivity */
    connectSolve() {
        const blackPositions = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.BLACK) {
                    blackPositions.push({ row, col });
                }
            }
        }
        if (blackPositions.length === 0)
            return true;
        // BFS from first black cell
        const visited = new Set();
        const queue = [blackPositions[0]];
        visited.add(posKey(blackPositions[0]));
        while (queue.length > 0) {
            const current = queue.shift();
            for (const dir of DIRECTIONS) {
                const next = adjacent(current, dir);
                const key = posKey(next);
                if (this.cells.inBounds(next) &&
                    this.cells.get(next) !== CellState.WHITE &&
                    !visited.has(key)) {
                    visited.add(key);
                    queue.push(next);
                }
            }
        }
        // All black cells must be reachable
        for (const pos of blackPositions) {
            if (!visited.has(posKey(pos))) {
                return false;
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new CirclesquareField(this.height, this.width);
        for (const [pos, state] of this.cells.entries()) {
            cloned.cells.set(pos, state);
        }
        cloned.fixedCells = new Set(this.fixedCells);
        cloned.squareCand = [...this.squareCand];
        cloned.squareFixed = [...this.squareFixed];
        return cloned;
    }
    getStateDump() {
        return (this.cells.dump() +
            '|' +
            this.squareCand.length +
            '|' +
            this.squareFixed.length);
    }
    isSolved() {
        for (const [, state] of this.cells.entries()) {
            if (state === CellState.UNKNOWN)
                return false;
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        const beforeState = this.getStateDump();
        if (!this.sikakuSolve())
            return false;
        if (!this.pondSolve())
            return false;
        if (!this.connectSolve())
            return false;
        if (this.getStateDump() !== beforeState) {
            return this.solveAndCheck();
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const state = this.cells.get(row, col);
                if (state === CellState.BLACK) {
                    line += '█';
                }
                else if (state === CellState.WHITE) {
                    line += '○';
                }
                else {
                    line += '?';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get unknown cells for branching */
    getUnknownCells() {
        const unknowns = [];
        for (const [pos, state] of this.cells.entries()) {
            if (state === CellState.UNKNOWN) {
                unknowns.push(pos);
            }
        }
        return unknowns;
    }
}
// ============================================
// CircleSquare Solver
// ============================================
export class CirclesquareSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzv.jp URL format */
    static fromURL(height, width, param) {
        const field = new CirclesquareField(height, width);
        field.parseParam(param);
        return new CirclesquareSolver(field);
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
                    cloned.setWhite(pos.row, pos.col);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to WHITE`,
            },
        ];
    }
}
//# sourceMappingURL=circlesquare.js.map