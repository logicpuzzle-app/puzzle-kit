/**
 * Simple Loop Solver
 *
 * Rules:
 * 1. Draw a single closed loop through white cells
 * 2. Black cells are obstacles - the loop cannot pass through them
 * 3. The loop passes through each white cell exactly once
 * 4. Each white cell has exactly 2 edges (the loop enters and exits)
 */
import { Direction, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Simple Loop Types
// ============================================
/** Wall state for edges between cells */
export var LoopEdgeState;
(function (LoopEdgeState) {
    /** Unknown/undetermined */
    LoopEdgeState["UNKNOWN"] = "unknown";
    /** Edge is part of the loop */
    LoopEdgeState["LINE"] = "line";
    /** Edge is not part of the loop (alias: WALL) */
    LoopEdgeState["EMPTY"] = "empty";
    /** Alias for EMPTY - edge blocks the loop */
    LoopEdgeState["WALL"] = "empty";
})(LoopEdgeState || (LoopEdgeState = {}));
/** Alias for backward compatibility */
export const LoopWallState = LoopEdgeState;
// ============================================
// Simple Loop Field State
// ============================================
export class SimpleloopField {
    height;
    width;
    /** Black cells (obstacles) - true means black */
    blackCells;
    /** Horizontal edges (between col and col+1) */
    yokoEdge;
    /** Vertical edges (between row and row+1) */
    tateEdge;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.blackCells = new Grid(height, width, () => false);
        // Horizontal edges: height rows, (width-1) edges per row
        this.yokoEdge = new Grid(height, width - 1, () => LoopEdgeState.UNKNOWN);
        // Vertical edges: (height-1) rows, width edges per row
        this.tateEdge = new Grid(height - 1, width, () => LoopEdgeState.UNKNOWN);
    }
    /** Set a cell as black (obstacle) */
    setBlack(row, col) {
        this.blackCells.set(row, col, true);
        // Close edges around black cell
        if (row > 0)
            this.setTateEdge(row - 1, col, LoopEdgeState.EMPTY);
        if (row < this.height - 1)
            this.setTateEdge(row, col, LoopEdgeState.EMPTY);
        if (col > 0)
            this.setYokoEdge(row, col - 1, LoopEdgeState.EMPTY);
        if (col < this.width - 1)
            this.setYokoEdge(row, col, LoopEdgeState.EMPTY);
    }
    /** Check if cell is black */
    isBlack(row, col) {
        return this.blackCells.get(row, col);
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
    /** Each white cell must have exactly 2 edges */
    nextSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.blackCells.get(row, col))
                    continue;
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
                // White cell must have exactly 2 line edges
                if (lineCount > 2 || emptyCount > 2) {
                    return false;
                }
                // If already have 2 lines, rest must be empty
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
                // If already have 2 empty, rest must be lines
                if (emptyCount === 2) {
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
        }
        return true;
    }
    /** Check that white cells are all connected via the loop */
    connectSolve() {
        const whitePosSet = new Set();
        let firstWhite = null;
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (!this.blackCells.get(row, col)) {
                    const pos = { row, col };
                    if (!firstWhite) {
                        firstWhite = pos;
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
        }
        return true;
    }
    /** Flood fill connected positions via non-EMPTY edges */
    setContinuePosSet(pos, continuePosSet, from) {
        const { row, col } = pos;
        // Up
        if (row > 0 && from !== Direction.UP) {
            const nextPos = { row: row - 1, col };
            if (this.getTateEdge(row - 1, col) !== LoopEdgeState.EMPTY && !continuePosSet.has(posKey(nextPos))) {
                continuePosSet.add(posKey(nextPos));
                this.setContinuePosSet(nextPos, continuePosSet, Direction.DOWN);
            }
        }
        // Right
        if (col < this.width - 1 && from !== Direction.RIGHT) {
            const nextPos = { row, col: col + 1 };
            if (this.getYokoEdge(row, col) !== LoopEdgeState.EMPTY && !continuePosSet.has(posKey(nextPos))) {
                continuePosSet.add(posKey(nextPos));
                this.setContinuePosSet(nextPos, continuePosSet, Direction.LEFT);
            }
        }
        // Down
        if (row < this.height - 1 && from !== Direction.DOWN) {
            const nextPos = { row: row + 1, col };
            if (this.getTateEdge(row, col) !== LoopEdgeState.EMPTY && !continuePosSet.has(posKey(nextPos))) {
                continuePosSet.add(posKey(nextPos));
                this.setContinuePosSet(nextPos, continuePosSet, Direction.UP);
            }
        }
        // Left
        if (col > 0 && from !== Direction.LEFT) {
            const nextPos = { row, col: col - 1 };
            if (this.getYokoEdge(row, col - 1) !== LoopEdgeState.EMPTY && !continuePosSet.has(posKey(nextPos))) {
                continuePosSet.add(posKey(nextPos));
                this.setContinuePosSet(nextPos, continuePosSet, Direction.RIGHT);
            }
        }
    }
    /** Loop rule: edges crossing a line must be even in number */
    oddSolve() {
        // Check horizontal lines
        for (let row = 0; row < this.height - 1; row++) {
            let lineCount = 0;
            let hasUnknown = false;
            for (let col = 0; col < this.width; col++) {
                const edge = this.getTateEdge(row, col);
                if (edge === LoopEdgeState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                else if (edge === LoopEdgeState.LINE) {
                    lineCount++;
                }
            }
            if (!hasUnknown && lineCount % 2 !== 0) {
                return false;
            }
        }
        // Check vertical lines
        for (let col = 0; col < this.width - 1; col++) {
            let lineCount = 0;
            let hasUnknown = false;
            for (let row = 0; row < this.height; row++) {
                const edge = this.getYokoEdge(row, col);
                if (edge === LoopEdgeState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                else if (edge === LoopEdgeState.LINE) {
                    lineCount++;
                }
            }
            if (!hasUnknown && lineCount % 2 !== 0) {
                return false;
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new SimpleloopField(this.height, this.width);
        for (const [pos, val] of this.blackCells.entries()) {
            cloned.blackCells.set(pos, val);
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
        // All edges must be determined
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
        // Top border
        lines.push('┌' + '─'.repeat(this.width * 2 - 1) + '┐');
        for (let row = 0; row < this.height; row++) {
            let cellLine = '│';
            for (let col = 0; col < this.width; col++) {
                cellLine += this.blackCells.get(row, col) ? '■' : '·';
                if (col < this.width - 1) {
                    const edge = this.yokoEdge.get(row, col);
                    cellLine += edge === LoopEdgeState.LINE ? '─' : edge === LoopEdgeState.EMPTY ? ' ' : '?';
                }
            }
            cellLine += '│';
            lines.push(cellLine);
            // Vertical edges
            if (row < this.height - 1) {
                let edgeLine = '│';
                for (let col = 0; col < this.width; col++) {
                    const edge = this.tateEdge.get(row, col);
                    edgeLine += edge === LoopEdgeState.LINE ? '│' : edge === LoopEdgeState.EMPTY ? ' ' : '?';
                    if (col < this.width - 1) {
                        edgeLine += ' ';
                    }
                }
                edgeLine += '│';
                lines.push(edgeLine);
            }
        }
        // Bottom border
        lines.push('└' + '─'.repeat(this.width * 2 - 1) + '┘');
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
// Simple Loop Solver
// ============================================
export class SimpleloopSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from puzzle string array */
    static fromString(height, width, puzzle) {
        const field = new SimpleloopField(height, width);
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const ch = puzzle[row]?.[col];
                if (ch === '#' || ch === '■') {
                    field.setBlack(row, col);
                }
            }
        }
        return new SimpleloopSolver(field);
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
//# sourceMappingURL=simpleloop.js.map