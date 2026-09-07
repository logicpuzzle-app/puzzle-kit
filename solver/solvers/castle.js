/**
 * Castle Wall (Castle) Solver
 *
 * Rules:
 * 1. Draw a single closed loop through the grid
 * 2. Arrow clues indicate the number of cells the loop passes through in that direction
 * 3. Arrow cells are obstacles - the loop cannot pass through them
 * 4. Black/white arrow markers indicate if the arrow is inside or outside the loop
 * 5. Each loop cell has exactly 2 edges
 */
import { CellState, Direction, posKey, DIRECTION_DELTA } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
import { LoopEdgeState } from './simpleloop.js';
// ============================================
// Castle Field State
// ============================================
export class CastleField {
    height;
    width;
    /** Cell states (UNKNOWN = undetermined, WHITE = loop or inside, BLACK = outside) */
    cells;
    /** Arrow clues - null means no clue at this position */
    arrows;
    /** Horizontal edges (between col and col+1) */
    yokoEdge;
    /** Vertical edges (between row and row+1) */
    tateEdge;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.arrows = new Grid(height, width, () => null);
        this.yokoEdge = new Grid(height, width - 1, () => LoopEdgeState.UNKNOWN);
        this.tateEdge = new Grid(height - 1, width, () => LoopEdgeState.UNKNOWN);
    }
    /** Set an arrow clue at position */
    setArrow(row, col, direction, count, marker = 'unknown') {
        this.arrows.set(row, col, { direction, count, marker });
        // Arrow cells are black (obstacles, not part of loop)
        this.cells.set(row, col, CellState.BLACK);
        // Close all edges around arrow
        if (row > 0)
            this.setTateEdge(row - 1, col, LoopEdgeState.EMPTY);
        if (row < this.height - 1)
            this.setTateEdge(row, col, LoopEdgeState.EMPTY);
        if (col > 0)
            this.setYokoEdge(row, col - 1, LoopEdgeState.EMPTY);
        if (col < this.width - 1)
            this.setYokoEdge(row, col, LoopEdgeState.EMPTY);
    }
    /** Get arrow at position */
    getArrow(row, col) {
        return this.arrows.get(row, col);
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell state */
    setCell(row, col, state) {
        this.cells.set(row, col, state);
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
    // ========== Constraint solving ==========
    /** Arrow constraint: count cells the loop passes through in direction */
    arrowSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const arrow = this.arrows.get(row, col);
                if (!arrow || arrow.count === -1)
                    continue;
                let loopCount = 0;
                let unknownCount = 0;
                const positions = [];
                // Collect edges in the arrow direction
                let r = row, c = col;
                const delta = DIRECTION_DELTA[arrow.direction];
                while (true) {
                    r += delta.dy;
                    c += delta.dx;
                    if (r < 0 || r >= this.height || c < 0 || c >= this.width)
                        break;
                    // Check the edge crossed to get here
                    let edgeState;
                    let edgeType;
                    let edgeRow, edgeCol;
                    if (arrow.direction === Direction.UP) {
                        edgeState = this.getTateEdge(r, c);
                        edgeType = 'v';
                        edgeRow = r;
                        edgeCol = c;
                    }
                    else if (arrow.direction === Direction.DOWN) {
                        edgeState = this.getTateEdge(r - 1, c);
                        edgeType = 'v';
                        edgeRow = r - 1;
                        edgeCol = c;
                    }
                    else if (arrow.direction === Direction.LEFT) {
                        edgeState = this.getYokoEdge(r, c);
                        edgeType = 'h';
                        edgeRow = r;
                        edgeCol = c;
                    }
                    else {
                        edgeState = this.getYokoEdge(r, c - 1);
                        edgeType = 'h';
                        edgeRow = r;
                        edgeCol = c - 1;
                    }
                    if (edgeState === LoopEdgeState.LINE) {
                        loopCount++;
                    }
                    else if (edgeState === LoopEdgeState.UNKNOWN) {
                        unknownCount++;
                        positions.push({ row: edgeRow, col: edgeCol, type: edgeType });
                    }
                }
                // Check validity
                if (loopCount > arrow.count)
                    return false;
                if (loopCount + unknownCount < arrow.count)
                    return false;
                // If we've reached the exact count, remaining must be empty
                if (loopCount === arrow.count) {
                    for (const pos of positions) {
                        if (pos.type === 'h') {
                            this.setYokoEdge(pos.row, pos.col, LoopEdgeState.EMPTY);
                        }
                        else {
                            this.setTateEdge(pos.row, pos.col, LoopEdgeState.EMPTY);
                        }
                    }
                }
                // If all unknowns must be lines
                if (loopCount + unknownCount === arrow.count) {
                    for (const pos of positions) {
                        if (pos.type === 'h') {
                            this.setYokoEdge(pos.row, pos.col, LoopEdgeState.LINE);
                        }
                        else {
                            this.setTateEdge(pos.row, pos.col, LoopEdgeState.LINE);
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Each non-obstacle cell on loop must have exactly 2 edges */
    nextSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.arrows.get(row, col) !== null)
                    continue; // Skip arrow cells
                let lineCount = 0;
                let emptyCount = 0;
                const edgeUp = row === 0 ? LoopEdgeState.EMPTY : this.getTateEdge(row - 1, col);
                const edgeDown = row === this.height - 1 ? LoopEdgeState.EMPTY : this.getTateEdge(row, col);
                const edgeLeft = col === 0 ? LoopEdgeState.EMPTY : this.getYokoEdge(row, col - 1);
                const edgeRight = col === this.width - 1 ? LoopEdgeState.EMPTY : this.getYokoEdge(row, col);
                if (edgeUp === LoopEdgeState.EMPTY)
                    emptyCount++;
                else if (edgeUp === LoopEdgeState.LINE)
                    lineCount++;
                if (edgeDown === LoopEdgeState.EMPTY)
                    emptyCount++;
                else if (edgeDown === LoopEdgeState.LINE)
                    lineCount++;
                if (edgeLeft === LoopEdgeState.EMPTY)
                    emptyCount++;
                else if (edgeLeft === LoopEdgeState.LINE)
                    lineCount++;
                if (edgeRight === LoopEdgeState.EMPTY)
                    emptyCount++;
                else if (edgeRight === LoopEdgeState.LINE)
                    lineCount++;
                const cell = this.cells.get(row, col);
                if (cell === CellState.BLACK) {
                    // Black cell (not on loop): no lines allowed
                    if (lineCount > 0)
                        return false;
                    if (edgeUp === LoopEdgeState.UNKNOWN)
                        this.setTateEdge(row - 1, col, LoopEdgeState.EMPTY);
                    if (edgeDown === LoopEdgeState.UNKNOWN)
                        this.setTateEdge(row, col, LoopEdgeState.EMPTY);
                    if (edgeLeft === LoopEdgeState.UNKNOWN)
                        this.setYokoEdge(row, col - 1, LoopEdgeState.EMPTY);
                    if (edgeRight === LoopEdgeState.UNKNOWN)
                        this.setYokoEdge(row, col, LoopEdgeState.EMPTY);
                }
                else if (cell === CellState.WHITE) {
                    // White cell (on loop or inside): must have exactly 2 or 0 lines
                    if (lineCount > 2)
                        return false;
                    if (lineCount === 2) {
                        if (edgeUp === LoopEdgeState.UNKNOWN)
                            this.setTateEdge(row - 1, col, LoopEdgeState.EMPTY);
                        if (edgeDown === LoopEdgeState.UNKNOWN)
                            this.setTateEdge(row, col, LoopEdgeState.EMPTY);
                        if (edgeLeft === LoopEdgeState.UNKNOWN)
                            this.setYokoEdge(row, col - 1, LoopEdgeState.EMPTY);
                        if (edgeRight === LoopEdgeState.UNKNOWN)
                            this.setYokoEdge(row, col, LoopEdgeState.EMPTY);
                    }
                    else if (emptyCount >= 2 && lineCount > 0) {
                        // Force remaining to be lines
                        if (4 - emptyCount <= 2) {
                            if (edgeUp === LoopEdgeState.UNKNOWN)
                                this.setTateEdge(row - 1, col, LoopEdgeState.LINE);
                            if (edgeDown === LoopEdgeState.UNKNOWN)
                                this.setTateEdge(row, col, LoopEdgeState.LINE);
                            if (edgeLeft === LoopEdgeState.UNKNOWN)
                                this.setYokoEdge(row, col - 1, LoopEdgeState.LINE);
                            if (edgeRight === LoopEdgeState.UNKNOWN)
                                this.setYokoEdge(row, col, LoopEdgeState.LINE);
                        }
                    }
                }
                else {
                    // Unknown cell
                    if ((emptyCount === 3 && lineCount === 1) || lineCount > 2) {
                        return false;
                    }
                    if (lineCount > 0) {
                        this.cells.set(row, col, CellState.WHITE);
                    }
                    else if (emptyCount > 2) {
                        this.cells.set(row, col, CellState.BLACK);
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
                if (this.arrows.get(row, col) !== null)
                    continue;
                if (this.cells.get(row, col) === CellState.WHITE) {
                    // Check if it has any lines (is on loop)
                    const hasLine = (row > 0 && this.getTateEdge(row - 1, col) === LoopEdgeState.LINE) ||
                        (row < this.height - 1 && this.getTateEdge(row, col) === LoopEdgeState.LINE) ||
                        (col > 0 && this.getYokoEdge(row, col - 1) === LoopEdgeState.LINE) ||
                        (col < this.width - 1 && this.getYokoEdge(row, col) === LoopEdgeState.LINE);
                    if (hasLine) {
                        const pos = { row, col };
                        if (whitePosSet.size === 0) {
                            whitePosSet.add(posKey(pos));
                            this.collectLoopCells(pos, whitePosSet);
                        }
                        else if (!whitePosSet.has(posKey(pos))) {
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    }
    collectLoopCells(pos, visited) {
        const { row, col } = pos;
        if (row > 0 && this.getTateEdge(row - 1, col) === LoopEdgeState.LINE) {
            const next = { row: row - 1, col };
            const key = posKey(next);
            if (!visited.has(key)) {
                visited.add(key);
                this.collectLoopCells(next, visited);
            }
        }
        if (row < this.height - 1 && this.getTateEdge(row, col) === LoopEdgeState.LINE) {
            const next = { row: row + 1, col };
            const key = posKey(next);
            if (!visited.has(key)) {
                visited.add(key);
                this.collectLoopCells(next, visited);
            }
        }
        if (col > 0 && this.getYokoEdge(row, col - 1) === LoopEdgeState.LINE) {
            const next = { row, col: col - 1 };
            const key = posKey(next);
            if (!visited.has(key)) {
                visited.add(key);
                this.collectLoopCells(next, visited);
            }
        }
        if (col < this.width - 1 && this.getYokoEdge(row, col) === LoopEdgeState.LINE) {
            const next = { row, col: col + 1 };
            const key = posKey(next);
            if (!visited.has(key)) {
                visited.add(key);
                this.collectLoopCells(next, visited);
            }
        }
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new CastleField(this.height, this.width);
        for (const [pos, val] of this.cells.entries()) {
            cloned.cells.set(pos, val);
        }
        for (const [pos, val] of this.arrows.entries()) {
            cloned.arrows.set(pos, val);
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
            if (!this.arrowSolve())
                return false;
            if (!this.nextSolve())
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
                const arrow = this.arrows.get(row, col);
                if (arrow) {
                    const dirChar = arrow.direction === Direction.UP
                        ? '↑'
                        : arrow.direction === Direction.DOWN
                            ? '↓'
                            : arrow.direction === Direction.LEFT
                                ? '←'
                                : '→';
                    cellLine += arrow.count === -1 ? dirChar + '?' : dirChar + arrow.count;
                }
                else {
                    const cell = this.cells.get(row, col);
                    cellLine += cell === CellState.BLACK ? '■■' : cell === CellState.WHITE ? '··' : '??';
                }
                if (col < this.width - 1) {
                    const edge = this.yokoEdge.get(row, col);
                    cellLine += edge === LoopEdgeState.LINE ? '─' : edge === LoopEdgeState.EMPTY ? ' ' : '?';
                }
            }
            lines.push(cellLine);
            if (row < this.height - 1) {
                let edgeLine = '';
                for (let col = 0; col < this.width; col++) {
                    const edge = this.tateEdge.get(row, col);
                    edgeLine += edge === LoopEdgeState.LINE ? ' │ ' : edge === LoopEdgeState.EMPTY ? '   ' : ' ? ';
                    if (col < this.width - 1)
                        edgeLine += ' ';
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
// Castle Solver
// ============================================
export class CastleSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver with arrow clues */
    static create(height, width, config) {
        const field = new CastleField(height, width);
        if (config.arrows) {
            for (const arrow of config.arrows) {
                field.setArrow(arrow.row, arrow.col, arrow.direction, arrow.count, arrow.marker || 'unknown');
            }
        }
        return new CastleSolver(field);
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
//# sourceMappingURL=castle.js.map