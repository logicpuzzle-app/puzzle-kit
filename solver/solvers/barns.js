/**
 * Barns Solver
 *
 * Rules:
 * 1. Draw a single closed loop through every cell of the grid
 * 2. The loop cannot cross itself in white/normal areas
 * 3. The loop CAN cross inside gray/shaded areas (barns)
 * 4. The loop cannot turn inside gray areas - must go straight through
 * 5. The loop cannot cross thick border walls between cells
 */
import { Direction, posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Barns Types
// ============================================
/** Cell type */
export var BarnsCellType;
(function (BarnsCellType) {
    /** Normal cell - can turn, cannot cross */
    BarnsCellType[BarnsCellType["NORMAL"] = 0] = "NORMAL";
    /** Barn cell (gray) - cannot turn, can cross */
    BarnsCellType[BarnsCellType["BARN"] = 1] = "BARN";
})(BarnsCellType || (BarnsCellType = {}));
/** Edge state between cells */
export var BarnsEdgeState;
(function (BarnsEdgeState) {
    /** Unknown/undetermined */
    BarnsEdgeState[BarnsEdgeState["UNKNOWN"] = 0] = "UNKNOWN";
    /** No line */
    BarnsEdgeState[BarnsEdgeState["EMPTY"] = 1] = "EMPTY";
    /** Line present */
    BarnsEdgeState[BarnsEdgeState["LINE"] = 2] = "LINE";
    /** Wall - cannot cross */
    BarnsEdgeState[BarnsEdgeState["WALL"] = 3] = "WALL";
})(BarnsEdgeState || (BarnsEdgeState = {}));
// ============================================
// Barns Field State
// ============================================
export class BarnsField {
    height;
    width;
    /** Cell types */
    cellTypes;
    /** Horizontal edges (between col and col+1) */
    yokoEdge;
    /** Vertical edges (between row and row+1) */
    tateEdge;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cellTypes = new Grid(height, width, () => BarnsCellType.NORMAL);
        this.yokoEdge = new Grid(height, width - 1, () => BarnsEdgeState.UNKNOWN);
        this.tateEdge = new Grid(height - 1, width, () => BarnsEdgeState.UNKNOWN);
    }
    /** Set cell type */
    setCellType(row, col, type) {
        this.cellTypes.set(row, col, type);
    }
    /** Get cell type */
    getCellType(row, col) {
        if (row < 0 || row >= this.height || col < 0 || col >= this.width) {
            return BarnsCellType.NORMAL;
        }
        return this.cellTypes.get(row, col);
    }
    /** Set wall between cells */
    setWall(row, col, dir) {
        switch (dir) {
            case Direction.UP:
                if (row > 0)
                    this.tateEdge.set(row - 1, col, BarnsEdgeState.WALL);
                break;
            case Direction.RIGHT:
                if (col < this.width - 1)
                    this.yokoEdge.set(row, col, BarnsEdgeState.WALL);
                break;
            case Direction.DOWN:
                if (row < this.height - 1)
                    this.tateEdge.set(row, col, BarnsEdgeState.WALL);
                break;
            case Direction.LEFT:
                if (col > 0)
                    this.yokoEdge.set(row, col - 1, BarnsEdgeState.WALL);
                break;
        }
    }
    /** Get horizontal edge state */
    getYokoEdge(row, col) {
        if (col < 0 || col >= this.width - 1)
            return BarnsEdgeState.WALL;
        return this.yokoEdge.get(row, col);
    }
    /** Get vertical edge state */
    getTateEdge(row, col) {
        if (row < 0 || row >= this.height - 1)
            return BarnsEdgeState.WALL;
        return this.tateEdge.get(row, col);
    }
    /** Set horizontal edge */
    setYokoEdge(row, col, state) {
        if (col >= 0 && col < this.width - 1) {
            const current = this.yokoEdge.get(row, col);
            if (current !== BarnsEdgeState.WALL) {
                this.yokoEdge.set(row, col, state);
            }
        }
    }
    /** Set vertical edge */
    setTateEdge(row, col, state) {
        if (row >= 0 && row < this.height - 1) {
            const current = this.tateEdge.get(row, col);
            if (current !== BarnsEdgeState.WALL) {
                this.tateEdge.set(row, col, state);
            }
        }
    }
    /** Get edges around a cell */
    getCellEdges(row, col) {
        return {
            up: row === 0 ? BarnsEdgeState.WALL : this.getTateEdge(row - 1, col),
            right: col === this.width - 1 ? BarnsEdgeState.WALL : this.getYokoEdge(row, col),
            down: row === this.height - 1 ? BarnsEdgeState.WALL : this.getTateEdge(row, col),
            left: col === 0 ? BarnsEdgeState.WALL : this.getYokoEdge(row, col - 1),
        };
    }
    /** Count edges at cell */
    countCellEdges(row, col) {
        const edges = this.getCellEdges(row, col);
        let line = 0, empty = 0, unknown = 0, wall = 0;
        for (const state of [edges.up, edges.right, edges.down, edges.left]) {
            if (state === BarnsEdgeState.LINE)
                line++;
            else if (state === BarnsEdgeState.EMPTY)
                empty++;
            else if (state === BarnsEdgeState.WALL)
                wall++;
            else
                unknown++;
        }
        return { line, empty, unknown, wall };
    }
    // ========== Constraint solving ==========
    nextSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cellType = this.cellTypes.get(row, col);
                const { line, unknown } = this.countCellEdges(row, col);
                const edges = this.getCellEdges(row, col);
                if (cellType === BarnsCellType.NORMAL) {
                    if (line > 2)
                        return false;
                    if (line + unknown < 2)
                        return false;
                    if (line === 2) {
                        if (edges.up === BarnsEdgeState.UNKNOWN)
                            this.setTateEdge(row - 1, col, BarnsEdgeState.EMPTY);
                        if (edges.right === BarnsEdgeState.UNKNOWN)
                            this.setYokoEdge(row, col, BarnsEdgeState.EMPTY);
                        if (edges.down === BarnsEdgeState.UNKNOWN)
                            this.setTateEdge(row, col, BarnsEdgeState.EMPTY);
                        if (edges.left === BarnsEdgeState.UNKNOWN)
                            this.setYokoEdge(row, col - 1, BarnsEdgeState.EMPTY);
                    }
                    else if (line + unknown === 2) {
                        if (edges.up === BarnsEdgeState.UNKNOWN)
                            this.setTateEdge(row - 1, col, BarnsEdgeState.LINE);
                        if (edges.right === BarnsEdgeState.UNKNOWN)
                            this.setYokoEdge(row, col, BarnsEdgeState.LINE);
                        if (edges.down === BarnsEdgeState.UNKNOWN)
                            this.setTateEdge(row, col, BarnsEdgeState.LINE);
                        if (edges.left === BarnsEdgeState.UNKNOWN)
                            this.setYokoEdge(row, col - 1, BarnsEdgeState.LINE);
                    }
                }
                else {
                    const hasUp = edges.up === BarnsEdgeState.LINE;
                    const hasDown = edges.down === BarnsEdgeState.LINE;
                    const hasLeft = edges.left === BarnsEdgeState.LINE;
                    const hasRight = edges.right === BarnsEdgeState.LINE;
                    if (hasUp && edges.down !== BarnsEdgeState.WALL) {
                        if (edges.down === BarnsEdgeState.EMPTY)
                            return false;
                        if (edges.down === BarnsEdgeState.UNKNOWN)
                            this.setTateEdge(row, col, BarnsEdgeState.LINE);
                    }
                    if (hasDown && edges.up !== BarnsEdgeState.WALL) {
                        if (edges.up === BarnsEdgeState.EMPTY)
                            return false;
                        if (edges.up === BarnsEdgeState.UNKNOWN)
                            this.setTateEdge(row - 1, col, BarnsEdgeState.LINE);
                    }
                    if (hasLeft && edges.right !== BarnsEdgeState.WALL) {
                        if (edges.right === BarnsEdgeState.EMPTY)
                            return false;
                        if (edges.right === BarnsEdgeState.UNKNOWN)
                            this.setYokoEdge(row, col, BarnsEdgeState.LINE);
                    }
                    if (hasRight && edges.left !== BarnsEdgeState.WALL) {
                        if (edges.left === BarnsEdgeState.EMPTY)
                            return false;
                        if (edges.left === BarnsEdgeState.UNKNOWN)
                            this.setYokoEdge(row, col - 1, BarnsEdgeState.LINE);
                    }
                    if (line === 1 || line === 3) {
                        if (unknown === 0)
                            return false;
                    }
                }
            }
        }
        return true;
    }
    oddSolve() {
        for (let row = 0; row < this.height - 1; row++) {
            let lineCount = 0;
            let hasUnknown = false;
            for (let col = 0; col < this.width; col++) {
                const edge = this.getTateEdge(row, col);
                if (edge === BarnsEdgeState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                else if (edge === BarnsEdgeState.LINE) {
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
                const edge = this.getYokoEdge(row, col);
                if (edge === BarnsEdgeState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                else if (edge === BarnsEdgeState.LINE) {
                    lineCount++;
                }
            }
            if (!hasUnknown && lineCount % 2 !== 0)
                return false;
        }
        return true;
    }
    connectSolve() {
        const visited = new Set();
        let firstCell = null;
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const { line } = this.countCellEdges(row, col);
                if (line > 0) {
                    if (!firstCell) {
                        firstCell = { row, col };
                        visited.add(posKey(firstCell));
                        this.collectConnected(firstCell, visited);
                    }
                    else {
                        if (!visited.has(posKey({ row, col }))) {
                            const { unknown } = this.countCellEdges(row, col);
                            if (unknown === 0)
                                return false;
                        }
                    }
                }
            }
        }
        return true;
    }
    collectConnected(pos, visited) {
        const { row, col } = pos;
        const edges = this.getCellEdges(row, col);
        const tryMove = (nextPos, edgeState) => {
            if (edgeState === BarnsEdgeState.LINE || edgeState === BarnsEdgeState.UNKNOWN) {
                const key = posKey(nextPos);
                if (!visited.has(key) &&
                    nextPos.row >= 0 &&
                    nextPos.row < this.height &&
                    nextPos.col >= 0 &&
                    nextPos.col < this.width) {
                    visited.add(key);
                    this.collectConnected(nextPos, visited);
                }
            }
        };
        tryMove({ row: row - 1, col }, edges.up);
        tryMove({ row, col: col + 1 }, edges.right);
        tryMove({ row: row + 1, col }, edges.down);
        tryMove({ row, col: col - 1 }, edges.left);
    }
    clone() {
        const cloned = new BarnsField(this.height, this.width);
        for (const [pos, val] of this.cellTypes.entries()) {
            cloned.cellTypes.set(pos, val);
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
                dump += this.yokoEdge.get(row, col);
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                dump += this.tateEdge.get(row, col);
            }
        }
        return dump;
    }
    isSolved() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoEdge.get(row, col) === BarnsEdgeState.UNKNOWN)
                    return false;
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateEdge.get(row, col) === BarnsEdgeState.UNKNOWN)
                    return false;
            }
        }
        return true;
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
        for (let row = 0; row < this.height; row++) {
            let cellLine = '';
            for (let col = 0; col < this.width; col++) {
                const cellType = this.cellTypes.get(row, col);
                cellLine += cellType === BarnsCellType.BARN ? '░' : '·';
                if (col < this.width - 1) {
                    const edge = this.yokoEdge.get(row, col);
                    if (edge === BarnsEdgeState.WALL)
                        cellLine += '║';
                    else if (edge === BarnsEdgeState.LINE)
                        cellLine += '─';
                    else if (edge === BarnsEdgeState.EMPTY)
                        cellLine += ' ';
                    else
                        cellLine += '?';
                }
            }
            lines.push(cellLine);
            if (row < this.height - 1) {
                let edgeLine = '';
                for (let col = 0; col < this.width; col++) {
                    const edge = this.tateEdge.get(row, col);
                    if (edge === BarnsEdgeState.WALL)
                        edgeLine += '═';
                    else if (edge === BarnsEdgeState.LINE)
                        edgeLine += '│';
                    else if (edge === BarnsEdgeState.EMPTY)
                        edgeLine += ' ';
                    else
                        edgeLine += '?';
                    if (col < this.width - 1)
                        edgeLine += ' ';
                }
                lines.push(edgeLine);
            }
        }
        return lines.join('\n');
    }
    getUnknownEdges() {
        const unknowns = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoEdge.get(row, col) === BarnsEdgeState.UNKNOWN) {
                    unknowns.push({ type: 'h', row, col });
                }
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateEdge.get(row, col) === BarnsEdgeState.UNKNOWN) {
                    unknowns.push({ type: 'v', row, col });
                }
            }
        }
        return unknowns;
    }
}
export class BarnsSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    static fromString(height, width, param) {
        const field = new BarnsField(height, width);
        const parts = param.split('/');
        const cellParam = parts[0] || '';
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        const totalCells = height * width;
        for (let i = 0; i < cellParam.length && index < totalCells; i++) {
            const ch = cellParam[i];
            const row = Math.floor(index / width);
            const col = index % width;
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index += interval + 1;
            }
            else if (ch === '1') {
                field.setCellType(row, col, BarnsCellType.BARN);
                index++;
            }
            else {
                index++;
            }
        }
        return new BarnsSolver(field);
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
                    if (edge.type === 'h')
                        cloned.setYokoEdge(edge.row, edge.col, BarnsEdgeState.EMPTY);
                    else
                        cloned.setTateEdge(edge.row, edge.col, BarnsEdgeState.EMPTY);
                    return cloned;
                },
                description: `Set edge at (${edge.row}, ${edge.col}) to EMPTY`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (edge.type === 'h')
                        cloned.setYokoEdge(edge.row, edge.col, BarnsEdgeState.LINE);
                    else
                        cloned.setTateEdge(edge.row, edge.col, BarnsEdgeState.LINE);
                    return cloned;
                },
                description: `Set edge at (${edge.row}, ${edge.col}) to LINE`,
            },
        ];
    }
}
//# sourceMappingURL=barns.js.map