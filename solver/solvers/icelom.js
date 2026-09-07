/**
 * Icelom (Ice Path) Solver
 *
 * Rules:
 * 1. Draw a path from start to goal
 * 2. On ice cells, the path must continue straight until hitting a wall or rock
 * 3. On normal cells, the path can turn
 * 4. The path cannot cross itself
 */
import { WallState } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Icelom Types
// ============================================
export var IcelomCell;
(function (IcelomCell) {
    IcelomCell[IcelomCell["NORMAL"] = 0] = "NORMAL";
    IcelomCell[IcelomCell["ICE"] = 1] = "ICE";
    IcelomCell[IcelomCell["WALL"] = 2] = "WALL";
    IcelomCell[IcelomCell["START"] = 3] = "START";
    IcelomCell[IcelomCell["GOAL"] = 4] = "GOAL";
})(IcelomCell || (IcelomCell = {}));
// ============================================
// Icelom Field State
// ============================================
export class IcelomField {
    height;
    width;
    /** Cell types */
    cells;
    /** Horizontal edges (path between cells) */
    yokoEdge;
    /** Vertical edges (path between cells) */
    tateEdge;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => IcelomCell.NORMAL);
        this.yokoEdge = new Grid(height, width - 1, () => WallState.UNKNOWN);
        this.tateEdge = new Grid(height - 1, width, () => WallState.UNKNOWN);
    }
    setCell(row, col, cell) {
        this.cells.set(row, col, cell);
        if (cell === IcelomCell.WALL) {
            // Wall cells block paths
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
    getCell(row, col) {
        if (row < 0 || row >= this.height || col < 0 || col >= this.width) {
            return IcelomCell.WALL;
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
                if (cell === IcelomCell.WALL)
                    continue;
                const { paths, walls, unknowns } = this.countEdges(row, col);
                const isEndpoint = cell === IcelomCell.START || cell === IcelomCell.GOAL;
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
                    // Path passes through with 0 or 2 edges
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
        const cloned = new IcelomField(this.height, this.width);
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                cloned.cells.set(row, col, this.cells.get(row, col));
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
                switch (cell) {
                    case IcelomCell.ICE:
                        line += '~';
                        break;
                    case IcelomCell.WALL:
                        line += '#';
                        break;
                    case IcelomCell.START:
                        line += 'S';
                        break;
                    case IcelomCell.GOAL:
                        line += 'G';
                        break;
                    default:
                        line += '.';
                        break;
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
// Icelom Solver
// ============================================
export class IcelomSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    static fromString(height, width, param) {
        const field = new IcelomField(height, width);
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
                    field.setCell(row, col, IcelomCell.WALL);
                }
                else if (ch === '~' || ch === 'i') {
                    field.setCell(row, col, IcelomCell.ICE);
                }
                else if (ch === 'S' || ch === 's') {
                    field.setCell(row, col, IcelomCell.START);
                }
                else if (ch === 'G' || ch === 'e') {
                    field.setCell(row, col, IcelomCell.GOAL);
                }
                index++;
            }
        }
        return new IcelomSolver(field);
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
//# sourceMappingURL=icelom.js.map