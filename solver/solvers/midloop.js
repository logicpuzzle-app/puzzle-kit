/**
 * Midloop Solver
 *
 * Rules:
 * 1. Draw a single closed loop through the grid
 * 2. Each circle mark must be at the center of a straight line segment
 * 3. The loop passes through white cells, with exactly 2 edges per cell
 * 4. Black cells are obstacles - loop cannot pass through
 * 5. Circles can be on cells, horizontal edges, or vertical edges
 */
import { CellState, posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
import { LoopEdgeState } from './simpleloop.js';
// ============================================
// Midloop Types
// ============================================
/** Circle position type */
export var CircleType;
(function (CircleType) {
    /** Circle on a cell */
    CircleType["CELL"] = "cell";
    /** Circle on horizontal edge (between two cells) */
    CircleType["HORIZONTAL"] = "horizontal";
    /** Circle on vertical edge (between two cells) */
    CircleType["VERTICAL"] = "vertical";
})(CircleType || (CircleType = {}));
// ============================================
// Midloop Field State
// ============================================
export class MidloopField {
    height;
    width;
    /** Cell states */
    cells;
    /** Circles on cells */
    cellCircles;
    /** Circles on horizontal edges */
    yokoCircles;
    /** Circles on vertical edges */
    tateCircles;
    /** Horizontal edges (between col and col+1) */
    yokoEdge;
    /** Vertical edges (between row and row+1) */
    tateEdge;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.cellCircles = new Grid(height, width, () => false);
        this.yokoCircles = new Grid(height, width - 1, () => false);
        this.tateCircles = new Grid(height - 1, width, () => false);
        this.yokoEdge = new Grid(height, width - 1, () => LoopEdgeState.UNKNOWN);
        this.tateEdge = new Grid(height - 1, width, () => LoopEdgeState.UNKNOWN);
    }
    /** Set a circle on a cell */
    setCellCircle(row, col) {
        this.cellCircles.set(row, col, true);
        this.cells.set(row, col, CellState.WHITE);
    }
    /** Set a circle on horizontal edge */
    setYokoCircle(row, col) {
        if (col >= 0 && col < this.width - 1) {
            this.yokoCircles.set(row, col, true);
            // Both cells must be white (part of loop)
            this.cells.set(row, col, CellState.WHITE);
            this.cells.set(row, col + 1, CellState.WHITE);
            // Edge must be a line
            this.yokoEdge.set(row, col, LoopEdgeState.LINE);
        }
    }
    /** Set a circle on vertical edge */
    setTateCircle(row, col) {
        if (row >= 0 && row < this.height - 1) {
            this.tateCircles.set(row, col, true);
            // Both cells must be white (part of loop)
            this.cells.set(row, col, CellState.WHITE);
            this.cells.set(row + 1, col, CellState.WHITE);
            // Edge must be a line
            this.tateEdge.set(row, col, LoopEdgeState.LINE);
        }
    }
    /** Set black cell (obstacle) */
    setBlack(row, col) {
        this.cells.set(row, col, CellState.BLACK);
        // Close all edges around black cell
        if (row > 0)
            this.setTateEdge(row - 1, col, LoopEdgeState.EMPTY);
        if (row < this.height - 1)
            this.setTateEdge(row, col, LoopEdgeState.EMPTY);
        if (col > 0)
            this.setYokoEdge(row, col - 1, LoopEdgeState.EMPTY);
        if (col < this.width - 1)
            this.setYokoEdge(row, col, LoopEdgeState.EMPTY);
    }
    /** Get horizontal edge state */
    getYokoEdge(row, col) {
        if (col < 0 || col >= this.width - 1)
            return LoopEdgeState.EMPTY;
        return this.yokoEdge.get(row, col);
    }
    /** Get vertical edge state */
    getTateEdge(row, col) {
        if (row < 0 || row >= this.height - 1)
            return LoopEdgeState.EMPTY;
        return this.tateEdge.get(row, col);
    }
    /** Set horizontal edge */
    setYokoEdge(row, col, state) {
        if (col >= 0 && col < this.width - 1) {
            this.yokoEdge.set(row, col, state);
        }
    }
    /** Set vertical edge */
    setTateEdge(row, col, state) {
        if (row >= 0 && row < this.height - 1) {
            this.tateEdge.set(row, col, state);
        }
    }
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    setCell(row, col, state) {
        this.cells.set(row, col, state);
    }
    // ========== Constraint solving ==========
    /** Each white cell must have exactly 2 edges, black cells have 0 */
    nextSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                let lineCount = 0;
                let emptyCount = 0;
                const wallUp = row === 0 ? LoopEdgeState.EMPTY : this.getTateEdge(row - 1, col);
                const wallRight = col === this.width - 1 ? LoopEdgeState.EMPTY : this.getYokoEdge(row, col);
                const wallDown = row === this.height - 1 ? LoopEdgeState.EMPTY : this.getTateEdge(row, col);
                const wallLeft = col === 0 ? LoopEdgeState.EMPTY : this.getYokoEdge(row, col - 1);
                if (wallUp === LoopEdgeState.EMPTY)
                    emptyCount++;
                else if (wallUp === LoopEdgeState.LINE)
                    lineCount++;
                if (wallRight === LoopEdgeState.EMPTY)
                    emptyCount++;
                else if (wallRight === LoopEdgeState.LINE)
                    lineCount++;
                if (wallDown === LoopEdgeState.EMPTY)
                    emptyCount++;
                else if (wallDown === LoopEdgeState.LINE)
                    lineCount++;
                if (wallLeft === LoopEdgeState.EMPTY)
                    emptyCount++;
                else if (wallLeft === LoopEdgeState.LINE)
                    lineCount++;
                const cell = this.cells.get(row, col);
                if (cell === CellState.BLACK) {
                    if (lineCount > 0)
                        return false;
                    // Close all remaining edges
                    if (wallUp === LoopEdgeState.UNKNOWN)
                        this.setTateEdge(row - 1, col, LoopEdgeState.EMPTY);
                    if (wallRight === LoopEdgeState.UNKNOWN)
                        this.setYokoEdge(row, col, LoopEdgeState.EMPTY);
                    if (wallDown === LoopEdgeState.UNKNOWN)
                        this.setTateEdge(row, col, LoopEdgeState.EMPTY);
                    if (wallLeft === LoopEdgeState.UNKNOWN)
                        this.setYokoEdge(row, col - 1, LoopEdgeState.EMPTY);
                }
                else if (cell === CellState.WHITE) {
                    // White cell must have exactly 2 lines
                    if (lineCount > 2 || emptyCount > 2)
                        return false;
                    if (lineCount === 2) {
                        if (wallUp === LoopEdgeState.UNKNOWN)
                            this.setTateEdge(row - 1, col, LoopEdgeState.EMPTY);
                        if (wallRight === LoopEdgeState.UNKNOWN)
                            this.setYokoEdge(row, col, LoopEdgeState.EMPTY);
                        if (wallDown === LoopEdgeState.UNKNOWN)
                            this.setTateEdge(row, col, LoopEdgeState.EMPTY);
                        if (wallLeft === LoopEdgeState.UNKNOWN)
                            this.setYokoEdge(row, col - 1, LoopEdgeState.EMPTY);
                    }
                    else if (emptyCount === 2) {
                        if (wallUp === LoopEdgeState.UNKNOWN)
                            this.setTateEdge(row - 1, col, LoopEdgeState.LINE);
                        if (wallRight === LoopEdgeState.UNKNOWN)
                            this.setYokoEdge(row, col, LoopEdgeState.LINE);
                        if (wallDown === LoopEdgeState.UNKNOWN)
                            this.setTateEdge(row, col, LoopEdgeState.LINE);
                        if (wallLeft === LoopEdgeState.UNKNOWN)
                            this.setYokoEdge(row, col - 1, LoopEdgeState.LINE);
                    }
                }
                else {
                    // Unknown cell
                    if ((emptyCount === 3 && lineCount === 1) || lineCount > 2) {
                        return false;
                    }
                    if (emptyCount > 2) {
                        this.cells.set(row, col, CellState.BLACK);
                    }
                    else if (lineCount > 0) {
                        this.cells.set(row, col, CellState.WHITE);
                    }
                }
            }
        }
        return true;
    }
    /** Circle constraint: must be at the center of a straight segment */
    circleSolve() {
        // Cell circles
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (!this.cellCircles.get(row, col))
                    continue;
                // Count distances in each direction
                let upCount = 0, downCount = 0, leftCount = 0, rightCount = 0;
                let upCounting = true, downCounting = true, leftCounting = true, rightCounting = true;
                for (let r = row - 1; r >= 0 && upCounting; r--) {
                    if (this.getTateEdge(r, col) === LoopEdgeState.EMPTY)
                        break;
                    if (this.getTateEdge(r, col) === LoopEdgeState.LINE)
                        upCount++;
                    else
                        upCounting = false;
                }
                for (let r = row + 1; r < this.height && downCounting; r++) {
                    if (this.getTateEdge(r - 1, col) === LoopEdgeState.EMPTY)
                        break;
                    if (this.getTateEdge(r - 1, col) === LoopEdgeState.LINE)
                        downCount++;
                    else
                        downCounting = false;
                }
                for (let c = col - 1; c >= 0 && leftCounting; c--) {
                    if (this.getYokoEdge(row, c) === LoopEdgeState.EMPTY)
                        break;
                    if (this.getYokoEdge(row, c) === LoopEdgeState.LINE)
                        leftCount++;
                    else
                        leftCounting = false;
                }
                for (let c = col + 1; c < this.width && rightCounting; c++) {
                    if (this.getYokoEdge(row, c - 1) === LoopEdgeState.EMPTY)
                        break;
                    if (this.getYokoEdge(row, c - 1) === LoopEdgeState.LINE)
                        rightCount++;
                    else
                        rightCounting = false;
                }
                // Check if vertical or horizontal line through circle
                const verticalConfirmed = upCount > 0 && downCount > 0;
                const horizontalConfirmed = leftCount > 0 && rightCount > 0;
                if (verticalConfirmed && horizontalConfirmed) {
                    // Both can't be true at once (would need 4 edges)
                    return false;
                }
                if (verticalConfirmed) {
                    // Must be vertical line, close horizontal
                    if (col > 0)
                        this.setYokoEdge(row, col - 1, LoopEdgeState.EMPTY);
                    if (col < this.width - 1)
                        this.setYokoEdge(row, col, LoopEdgeState.EMPTY);
                    // Extend equally in both directions
                    if (upCount === downCount && upCount > 0) {
                        // Close next edges if exists
                        if (row - upCount - 1 >= 0) {
                            this.setTateEdge(row - upCount - 1, col, LoopEdgeState.EMPTY);
                        }
                        if (row + downCount < this.height - 1) {
                            this.setTateEdge(row + downCount, col, LoopEdgeState.EMPTY);
                        }
                    }
                }
                else if (horizontalConfirmed) {
                    // Must be horizontal line, close vertical
                    if (row > 0)
                        this.setTateEdge(row - 1, col, LoopEdgeState.EMPTY);
                    if (row < this.height - 1)
                        this.setTateEdge(row, col, LoopEdgeState.EMPTY);
                    // Extend equally in both directions
                    if (leftCount === rightCount && leftCount > 0) {
                        if (col - leftCount - 1 >= 0) {
                            this.setYokoEdge(row, col - leftCount - 1, LoopEdgeState.EMPTY);
                        }
                        if (col + rightCount < this.width - 1) {
                            this.setYokoEdge(row, col + rightCount, LoopEdgeState.EMPTY);
                        }
                    }
                }
            }
        }
        // Horizontal edge circles - must have equal cells on each side of this edge
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (!this.yokoCircles.get(row, col))
                    continue;
                // Count left side (from col going left)
                let leftCount = 0;
                for (let c = col; c >= 0; c--) {
                    const edge = c === col ? LoopEdgeState.LINE : this.getYokoEdge(row, c);
                    if (edge === LoopEdgeState.EMPTY)
                        break;
                    if (edge === LoopEdgeState.LINE)
                        leftCount++;
                    else
                        break;
                }
                // Count right side (from col+1 going right)
                let rightCount = 0;
                for (let c = col + 1; c < this.width; c++) {
                    const edge = this.getYokoEdge(row, c - 1);
                    if (edge === LoopEdgeState.EMPTY)
                        break;
                    if (edge === LoopEdgeState.LINE)
                        rightCount++;
                    else
                        break;
                }
                if (leftCount === rightCount && leftCount > 0) {
                    // Close edges beyond the segment
                    if (col - leftCount >= 0) {
                        this.setYokoEdge(row, col - leftCount, LoopEdgeState.EMPTY);
                    }
                    if (col + rightCount < this.width - 1) {
                        this.setYokoEdge(row, col + rightCount, LoopEdgeState.EMPTY);
                    }
                }
            }
        }
        // Vertical edge circles
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (!this.tateCircles.get(row, col))
                    continue;
                let upCount = 0;
                for (let r = row; r >= 0; r--) {
                    const edge = r === row ? LoopEdgeState.LINE : this.getTateEdge(r, col);
                    if (edge === LoopEdgeState.EMPTY)
                        break;
                    if (edge === LoopEdgeState.LINE)
                        upCount++;
                    else
                        break;
                }
                let downCount = 0;
                for (let r = row + 1; r < this.height; r++) {
                    const edge = this.getTateEdge(r - 1, col);
                    if (edge === LoopEdgeState.EMPTY)
                        break;
                    if (edge === LoopEdgeState.LINE)
                        downCount++;
                    else
                        break;
                }
                if (upCount === downCount && upCount > 0) {
                    if (row - upCount >= 0) {
                        this.setTateEdge(row - upCount, col, LoopEdgeState.EMPTY);
                    }
                    if (row + downCount < this.height - 1) {
                        this.setTateEdge(row + downCount, col, LoopEdgeState.EMPTY);
                    }
                }
            }
        }
        return true;
    }
    /** Parity check */
    oddSolve() {
        for (let row = 0; row < this.height - 1; row++) {
            let lineCount = 0;
            let hasUnknown = false;
            for (let col = 0; col < this.width; col++) {
                const edge = this.tateEdge.get(row, col);
                if (edge === LoopEdgeState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                else if (edge === LoopEdgeState.LINE) {
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
                const edge = this.yokoEdge.get(row, col);
                if (edge === LoopEdgeState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                else if (edge === LoopEdgeState.LINE) {
                    lineCount++;
                }
            }
            if (!hasUnknown && lineCount % 2 !== 0)
                return false;
        }
        return true;
    }
    /** Connectivity check */
    connectSolve() {
        const whitePosSet = new Set();
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.WHITE) {
                    const pos = { row, col };
                    if (whitePosSet.size === 0) {
                        whitePosSet.add(posKey(pos));
                        this.collectConnected(pos, whitePosSet);
                    }
                    else if (!whitePosSet.has(posKey(pos))) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    collectConnected(pos, visited) {
        const { row, col } = pos;
        if (row > 0 && this.getTateEdge(row - 1, col) !== LoopEdgeState.EMPTY) {
            const next = { row: row - 1, col };
            const key = posKey(next);
            if (!visited.has(key)) {
                visited.add(key);
                this.collectConnected(next, visited);
            }
        }
        if (row < this.height - 1 && this.getTateEdge(row, col) !== LoopEdgeState.EMPTY) {
            const next = { row: row + 1, col };
            const key = posKey(next);
            if (!visited.has(key)) {
                visited.add(key);
                this.collectConnected(next, visited);
            }
        }
        if (col > 0 && this.getYokoEdge(row, col - 1) !== LoopEdgeState.EMPTY) {
            const next = { row, col: col - 1 };
            const key = posKey(next);
            if (!visited.has(key)) {
                visited.add(key);
                this.collectConnected(next, visited);
            }
        }
        if (col < this.width - 1 && this.getYokoEdge(row, col) !== LoopEdgeState.EMPTY) {
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
        const cloned = new MidloopField(this.height, this.width);
        for (const [pos, val] of this.cells.entries()) {
            cloned.cells.set(pos, val);
        }
        for (const [pos, val] of this.cellCircles.entries()) {
            cloned.cellCircles.set(pos, val);
        }
        for (const [pos, val] of this.yokoCircles.entries()) {
            cloned.yokoCircles.set(pos, val);
        }
        for (const [pos, val] of this.tateCircles.entries()) {
            cloned.tateCircles.set(pos, val);
        }
        for (const [pos, val] of this.yokoEdge.entries()) {
            cloned.yokoEdge.set(pos, val);
        }
        for (const [pos, val] of this.tateEdge.entries()) {
            cloned.tateEdge.set(pos, val);
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
                const e = this.yokoEdge.get(row, col);
                dump += e === LoopEdgeState.LINE ? 'L' : e === LoopEdgeState.EMPTY ? 'E' : 'U';
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                const e = this.tateEdge.get(row, col);
                dump += e === LoopEdgeState.LINE ? 'L' : e === LoopEdgeState.EMPTY ? 'E' : 'U';
            }
        }
        return dump;
    }
    isSolved() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.UNKNOWN)
                    return false;
            }
        }
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoEdge.get(row, col) === LoopEdgeState.UNKNOWN)
                    return false;
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateEdge.get(row, col) === LoopEdgeState.UNKNOWN)
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
            if (!this.circleSolve())
                return false;
            changed = this.getStateDump() !== beforeDump;
        }
        if (!this.oddSolve())
            return false;
        if (!this.connectSolve())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let cellLine = '';
            for (let col = 0; col < this.width; col++) {
                if (this.cellCircles.get(row, col)) {
                    cellLine += '●';
                }
                else {
                    const cell = this.cells.get(row, col);
                    cellLine += cell === CellState.BLACK ? '■' : cell === CellState.WHITE ? '·' : '?';
                }
                if (col < this.width - 1) {
                    if (this.yokoCircles.get(row, col)) {
                        cellLine += '●';
                    }
                    else {
                        const edge = this.yokoEdge.get(row, col);
                        cellLine += edge === LoopEdgeState.LINE ? '─' : edge === LoopEdgeState.EMPTY ? ' ' : '?';
                    }
                }
            }
            lines.push(cellLine);
            if (row < this.height - 1) {
                let edgeLine = '';
                for (let col = 0; col < this.width; col++) {
                    if (this.tateCircles.get(row, col)) {
                        edgeLine += '●';
                    }
                    else {
                        const edge = this.tateEdge.get(row, col);
                        edgeLine += edge === LoopEdgeState.LINE ? '│' : edge === LoopEdgeState.EMPTY ? ' ' : '?';
                    }
                    if (col < this.width - 1) {
                        edgeLine += ' ';
                    }
                }
                lines.push(edgeLine);
            }
        }
        return lines.join('\n');
    }
    /** Get unknown edges for branching */
    getUnknownEdges() {
        const unknowns = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoEdge.get(row, col) === LoopEdgeState.UNKNOWN) {
                    unknowns.push({ type: 'h', row, col });
                }
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateEdge.get(row, col) === LoopEdgeState.UNKNOWN) {
                    unknowns.push({ type: 'v', row, col });
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Midloop Solver
// ============================================
export class MidloopSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver with circles */
    static create(height, width, config) {
        const field = new MidloopField(height, width);
        if (config.cellCircles) {
            for (const circle of config.cellCircles) {
                field.setCellCircle(circle.row, circle.col);
            }
        }
        if (config.yokoCircles) {
            for (const circle of config.yokoCircles) {
                field.setYokoCircle(circle.row, circle.col);
            }
        }
        if (config.tateCircles) {
            for (const circle of config.tateCircles) {
                field.setTateCircle(circle.row, circle.col);
            }
        }
        return new MidloopSolver(field);
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
                    if (edge.type === 'h') {
                        cloned.setYokoEdge(edge.row, edge.col, LoopEdgeState.LINE);
                    }
                    else {
                        cloned.setTateEdge(edge.row, edge.col, LoopEdgeState.LINE);
                    }
                    return cloned;
                },
                description: `Set ${edge.type === 'h' ? 'horizontal' : 'vertical'} edge at (${edge.row}, ${edge.col}) to LINE`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (edge.type === 'h') {
                        cloned.setYokoEdge(edge.row, edge.col, LoopEdgeState.EMPTY);
                    }
                    else {
                        cloned.setTateEdge(edge.row, edge.col, LoopEdgeState.EMPTY);
                    }
                    return cloned;
                },
                description: `Set ${edge.type === 'h' ? 'horizontal' : 'vertical'} edge at (${edge.row}, ${edge.col}) to EMPTY`,
            },
        ];
    }
}
//# sourceMappingURL=midloop.js.map