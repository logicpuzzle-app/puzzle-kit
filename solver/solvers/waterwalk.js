/**
 * Water Walk Solver
 *
 * Rules:
 * 1. Draw a path from start to goal
 * 2. Water cells slow down movement
 * 3. Numbers indicate total path length
 * 4. The path cannot cross itself
 */
import { WallState } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// WaterWalk Types
// ============================================
export var WaterwalkCell;
(function (WaterwalkCell) {
    WaterwalkCell[WaterwalkCell["NORMAL"] = 0] = "NORMAL";
    WaterwalkCell[WaterwalkCell["WATER"] = 1] = "WATER";
    WaterwalkCell[WaterwalkCell["WALL"] = 2] = "WALL";
    WaterwalkCell[WaterwalkCell["START"] = 3] = "START";
    WaterwalkCell[WaterwalkCell["GOAL"] = 4] = "GOAL";
})(WaterwalkCell || (WaterwalkCell = {}));
// ============================================
// WaterWalk Field State
// ============================================
export class WaterwalkField {
    height;
    width;
    /** Cell types */
    cells;
    /** Number clues */
    clues;
    /** Horizontal edges (path) */
    yokoEdge;
    /** Vertical edges (path) */
    tateEdge;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => WaterwalkCell.NORMAL);
        this.clues = new Grid(height, width, () => null);
        this.yokoEdge = new Grid(height, width - 1, () => WallState.UNKNOWN);
        this.tateEdge = new Grid(height - 1, width, () => WallState.UNKNOWN);
    }
    setCell(row, col, cell) {
        this.cells.set(row, col, cell);
        if (cell === WaterwalkCell.WALL) {
            if (row > 0)
                this.setTateEdge(row - 1, col, WallState.WALL);
            if (row < this.height - 1)
                this.setTateEdge(row, col, WallState.WALL);
            if (col > 0)
                this.setYokoEdge(row, col - 1, WallState.WALL);
            if (col < this.width - 1)
                this.setYokoEdge(row, col, WallState.WALL);
        }
    }
    setClue(row, col, value) {
        this.clues.set(row, col, value);
    }
    getCell(row, col) {
        if (row < 0 || row >= this.height || col < 0 || col >= this.width) {
            return WaterwalkCell.WALL;
        }
        return this.cells.get(row, col);
    }
    getYokoEdge(row, col) {
        if (col < 0 || col >= this.width - 1)
            return WallState.WALL;
        return this.yokoEdge.get(row, col);
    }
    getTateEdge(row, col) {
        if (row < 0 || row >= this.height - 1)
            return WallState.WALL;
        return this.tateEdge.get(row, col);
    }
    setYokoEdge(row, col, state) {
        if (col >= 0 && col < this.width - 1) {
            this.yokoEdge.set(row, col, state);
        }
    }
    setTateEdge(row, col, state) {
        if (row >= 0 && row < this.height - 1) {
            this.tateEdge.set(row, col, state);
        }
    }
    countEdges(row, col) {
        let paths = 0;
        let walls = 0;
        let unknowns = 0;
        const edgeUp = row === 0 ? WallState.WALL : this.getTateEdge(row - 1, col);
        const edgeDown = row === this.height - 1 ? WallState.WALL : this.getTateEdge(row, col);
        const edgeLeft = col === 0 ? WallState.WALL : this.getYokoEdge(row, col - 1);
        const edgeRight = col === this.width - 1 ? WallState.WALL : this.getYokoEdge(row, col);
        for (const edge of [edgeUp, edgeDown, edgeLeft, edgeRight]) {
            if (edge === WallState.NO_WALL)
                paths++;
            else if (edge === WallState.WALL)
                walls++;
            else
                unknowns++;
        }
        return { paths, walls, unknowns };
    }
    pathSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cell = this.cells.get(row, col);
                if (cell === WaterwalkCell.WALL)
                    continue;
                const { paths, walls, unknowns } = this.countEdges(row, col);
                const isEndpoint = cell === WaterwalkCell.START || cell === WaterwalkCell.GOAL;
                if (isEndpoint) {
                    if (paths > 1)
                        return false;
                    if (paths === 1) {
                        if (row > 0 && this.getTateEdge(row - 1, col) === WallState.UNKNOWN)
                            this.setTateEdge(row - 1, col, WallState.WALL);
                        if (row < this.height - 1 && this.getTateEdge(row, col) === WallState.UNKNOWN)
                            this.setTateEdge(row, col, WallState.WALL);
                        if (col > 0 && this.getYokoEdge(row, col - 1) === WallState.UNKNOWN)
                            this.setYokoEdge(row, col - 1, WallState.WALL);
                        if (col < this.width - 1 && this.getYokoEdge(row, col) === WallState.UNKNOWN)
                            this.setYokoEdge(row, col, WallState.WALL);
                    }
                }
                else {
                    if (paths > 2)
                        return false;
                    if (paths === 2) {
                        if (row > 0 && this.getTateEdge(row - 1, col) === WallState.UNKNOWN)
                            this.setTateEdge(row - 1, col, WallState.WALL);
                        if (row < this.height - 1 && this.getTateEdge(row, col) === WallState.UNKNOWN)
                            this.setTateEdge(row, col, WallState.WALL);
                        if (col > 0 && this.getYokoEdge(row, col - 1) === WallState.UNKNOWN)
                            this.setYokoEdge(row, col - 1, WallState.WALL);
                        if (col < this.width - 1 && this.getYokoEdge(row, col) === WallState.UNKNOWN)
                            this.setYokoEdge(row, col, WallState.WALL);
                    }
                    else if (walls >= 2 && paths === 1 && unknowns === 1) {
                        if (row > 0 && this.getTateEdge(row - 1, col) === WallState.UNKNOWN)
                            this.setTateEdge(row - 1, col, WallState.NO_WALL);
                        if (row < this.height - 1 && this.getTateEdge(row, col) === WallState.UNKNOWN)
                            this.setTateEdge(row, col, WallState.NO_WALL);
                        if (col > 0 && this.getYokoEdge(row, col - 1) === WallState.UNKNOWN)
                            this.setYokoEdge(row, col - 1, WallState.NO_WALL);
                        if (col < this.width - 1 && this.getYokoEdge(row, col) === WallState.UNKNOWN)
                            this.setYokoEdge(row, col, WallState.NO_WALL);
                    }
                }
            }
        }
        return true;
    }
    clone() {
        const cloned = new WaterwalkField(this.height, this.width);
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                cloned.cells.set(row, col, this.cells.get(row, col));
                cloned.clues.set(row, col, this.clues.get(row, col));
            }
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
                dump += e === WallState.NO_WALL ? 'P' : e === WallState.WALL ? 'W' : 'U';
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                const e = this.tateEdge.get(row, col);
                dump += e === WallState.NO_WALL ? 'P' : e === WallState.WALL ? 'W' : 'U';
            }
        }
        return dump;
    }
    isSolved() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoEdge.get(row, col) === WallState.UNKNOWN)
                    return false;
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateEdge.get(row, col) === WallState.UNKNOWN)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const beforeDump = this.getStateDump();
            if (!this.pathSolve())
                return false;
            changed = this.getStateDump() !== beforeDump;
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const cell = this.cells.get(row, col);
                const clue = this.clues.get(row, col);
                if (clue !== null) {
                    line += String(clue % 10);
                }
                else {
                    switch (cell) {
                        case WaterwalkCell.WATER:
                            line += '~';
                            break;
                        case WaterwalkCell.WALL:
                            line += '#';
                            break;
                        case WaterwalkCell.START:
                            line += 'S';
                            break;
                        case WaterwalkCell.GOAL:
                            line += 'G';
                            break;
                        default:
                            line += '.';
                            break;
                    }
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    getUnknownEdges() {
        const unknowns = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoEdge.get(row, col) === WallState.UNKNOWN) {
                    unknowns.push({ type: 'h', row, col });
                }
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateEdge.get(row, col) === WallState.UNKNOWN) {
                    unknowns.push({ type: 'v', row, col });
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// WaterWalk Solver
// ============================================
export class WaterwalkSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    static fromString(height, width, param) {
        const field = new WaterwalkField(height, width);
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        for (let i = 0; i < param.length && index < height * width; i++) {
            const ch = param[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index += interval + 1;
            }
            else {
                const row = Math.floor(index / width);
                const col = index % width;
                if (ch === '#' || ch === '+') {
                    field.setCell(row, col, WaterwalkCell.WALL);
                }
                else if (ch === '~' || ch === 'w') {
                    field.setCell(row, col, WaterwalkCell.WATER);
                }
                else if (ch === 'S' || ch === 's') {
                    field.setCell(row, col, WaterwalkCell.START);
                }
                else if (ch === 'G' || ch === 'e') {
                    field.setCell(row, col, WaterwalkCell.GOAL);
                }
                else {
                    let num;
                    if (ch === '-') {
                        num = parseInt(param[i + 1] + param[i + 2], 16);
                        i += 2;
                    }
                    else {
                        num = parseInt(ch, 16);
                    }
                    if (!isNaN(num) && num >= 0) {
                        field.setClue(row, col, num);
                    }
                }
                index++;
            }
        }
        return new WaterwalkSolver(field);
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
                        cloned.setYokoEdge(edge.row, edge.col, WallState.NO_WALL);
                    }
                    else {
                        cloned.setTateEdge(edge.row, edge.col, WallState.NO_WALL);
                    }
                    return cloned;
                },
                description: `Set edge at (${edge.row}, ${edge.col}) to PATH`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (edge.type === 'h') {
                        cloned.setYokoEdge(edge.row, edge.col, WallState.WALL);
                    }
                    else {
                        cloned.setTateEdge(edge.row, edge.col, WallState.WALL);
                    }
                    return cloned;
                },
                description: `Set edge at (${edge.row}, ${edge.col}) to WALL`,
            },
        ];
    }
}
//# sourceMappingURL=waterwalk.js.map