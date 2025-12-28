/**
 * Dotchiloop Solver
 *
 * Rules:
 * 1. Draw a single closed loop through cells
 * 2. The loop passes through cell centers horizontally or vertically
 * 3. Cells with circles must be passed through by the loop
 * 4. Cells with X marks must not be passed through
 * 5. Dotchi cells have two circles and the loop must pass through exactly one of them
 */
import { Grid } from '../core/field.js';
import { WallState } from '../core/types.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Dotchiloop Types
// ============================================
export var DotchiCell;
(function (DotchiCell) {
    DotchiCell["EMPTY"] = "empty";
    DotchiCell["CIRCLE"] = "circle";
    DotchiCell["CROSS"] = "cross";
    DotchiCell["DOTCHI_LEFT"] = "dotchi_left";
    DotchiCell["DOTCHI_RIGHT"] = "dotchi_right";
})(DotchiCell || (DotchiCell = {}));
// ============================================
// Dotchiloop Field State
// ============================================
export class DotchiloopField {
    height;
    width;
    /** Cell types */
    cells;
    /** Horizontal edges */
    yokoEdge;
    /** Vertical edges */
    tateEdge;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => DotchiCell.EMPTY);
        this.yokoEdge = new Grid(height, width - 1, () => WallState.UNKNOWN);
        this.tateEdge = new Grid(height - 1, width, () => WallState.UNKNOWN);
    }
    /** Set cell type */
    setCell(row, col, type) {
        this.cells.set(row, col, type);
    }
    /** Get cell type */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Get horizontal edge state */
    getYokoEdge(row, col) {
        if (col < 0 || col >= this.width - 1)
            return WallState.WALL;
        return this.yokoEdge.get(row, col);
    }
    /** Get vertical edge state */
    getTateEdge(row, col) {
        if (row < 0 || row >= this.height - 1)
            return WallState.WALL;
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
    /** Count line edges around a cell */
    countEdges(row, col) {
        let lines = 0;
        let walls = 0;
        let unknowns = 0;
        const edgeUp = row === 0 ? WallState.WALL : this.getTateEdge(row - 1, col);
        const edgeDown = row === this.height - 1 ? WallState.WALL : this.getTateEdge(row, col);
        const edgeLeft = col === 0 ? WallState.WALL : this.getYokoEdge(row, col - 1);
        const edgeRight = col === this.width - 1 ? WallState.WALL : this.getYokoEdge(row, col);
        for (const edge of [edgeUp, edgeDown, edgeLeft, edgeRight]) {
            if (edge === WallState.NO_WALL)
                lines++;
            else if (edge === WallState.WALL)
                walls++;
            else
                unknowns++;
        }
        return { lines, walls, unknowns };
    }
    /** Loop constraint solving */
    loopSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cellType = this.cells.get(row, col);
                const { lines, walls } = this.countEdges(row, col);
                if (cellType === DotchiCell.CROSS) {
                    // Cross cells must have 0 lines
                    if (lines > 0)
                        return false;
                    // Close all edges
                    if (row > 0)
                        this.setTateEdge(row - 1, col, WallState.WALL);
                    if (row < this.height - 1)
                        this.setTateEdge(row, col, WallState.WALL);
                    if (col > 0)
                        this.setYokoEdge(row, col - 1, WallState.WALL);
                    if (col < this.width - 1)
                        this.setYokoEdge(row, col, WallState.WALL);
                }
                else if (cellType === DotchiCell.CIRCLE) {
                    // Circle cells must have exactly 2 lines
                    if (lines > 2)
                        return false;
                    if (walls > 2)
                        return false;
                    if (lines === 2) {
                        if (row > 0 && this.getTateEdge(row - 1, col) === WallState.UNKNOWN) {
                            this.setTateEdge(row - 1, col, WallState.WALL);
                        }
                        if (row < this.height - 1 && this.getTateEdge(row, col) === WallState.UNKNOWN) {
                            this.setTateEdge(row, col, WallState.WALL);
                        }
                        if (col > 0 && this.getYokoEdge(row, col - 1) === WallState.UNKNOWN) {
                            this.setYokoEdge(row, col - 1, WallState.WALL);
                        }
                        if (col < this.width - 1 && this.getYokoEdge(row, col) === WallState.UNKNOWN) {
                            this.setYokoEdge(row, col, WallState.WALL);
                        }
                    }
                    else if (walls === 2) {
                        if (row > 0 && this.getTateEdge(row - 1, col) === WallState.UNKNOWN) {
                            this.setTateEdge(row - 1, col, WallState.NO_WALL);
                        }
                        if (row < this.height - 1 && this.getTateEdge(row, col) === WallState.UNKNOWN) {
                            this.setTateEdge(row, col, WallState.NO_WALL);
                        }
                        if (col > 0 && this.getYokoEdge(row, col - 1) === WallState.UNKNOWN) {
                            this.setYokoEdge(row, col - 1, WallState.NO_WALL);
                        }
                        if (col < this.width - 1 && this.getYokoEdge(row, col) === WallState.UNKNOWN) {
                            this.setYokoEdge(row, col, WallState.NO_WALL);
                        }
                    }
                }
                else {
                    // Empty and dotchi cells: 0 or 2 lines
                    if (lines > 2)
                        return false;
                    if (lines === 1 && walls === 3)
                        return false;
                    if (lines === 2) {
                        if (row > 0 && this.getTateEdge(row - 1, col) === WallState.UNKNOWN) {
                            this.setTateEdge(row - 1, col, WallState.WALL);
                        }
                        if (row < this.height - 1 && this.getTateEdge(row, col) === WallState.UNKNOWN) {
                            this.setTateEdge(row, col, WallState.WALL);
                        }
                        if (col > 0 && this.getYokoEdge(row, col - 1) === WallState.UNKNOWN) {
                            this.setYokoEdge(row, col - 1, WallState.WALL);
                        }
                        if (col < this.width - 1 && this.getYokoEdge(row, col) === WallState.UNKNOWN) {
                            this.setYokoEdge(row, col, WallState.WALL);
                        }
                    }
                    else if (walls === 2 && lines === 1) {
                        if (row > 0 && this.getTateEdge(row - 1, col) === WallState.UNKNOWN) {
                            this.setTateEdge(row - 1, col, WallState.NO_WALL);
                        }
                        if (row < this.height - 1 && this.getTateEdge(row, col) === WallState.UNKNOWN) {
                            this.setTateEdge(row, col, WallState.NO_WALL);
                        }
                        if (col > 0 && this.getYokoEdge(row, col - 1) === WallState.UNKNOWN) {
                            this.setYokoEdge(row, col - 1, WallState.NO_WALL);
                        }
                        if (col < this.width - 1 && this.getYokoEdge(row, col) === WallState.UNKNOWN) {
                            this.setYokoEdge(row, col, WallState.NO_WALL);
                        }
                    }
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new DotchiloopField(this.height, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.cells.set(y, x, this.cells.get(y, x));
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
                dump += e === WallState.NO_WALL ? 'L' : e === WallState.WALL ? 'W' : 'U';
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                const e = this.tateEdge.get(row, col);
                dump += e === WallState.NO_WALL ? 'L' : e === WallState.WALL ? 'W' : 'U';
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
            if (!this.loopSolve())
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
                if (cell === DotchiCell.CIRCLE)
                    line += 'O';
                else if (cell === DotchiCell.CROSS)
                    line += 'X';
                else if (cell === DotchiCell.DOTCHI_LEFT)
                    line += '<';
                else if (cell === DotchiCell.DOTCHI_RIGHT)
                    line += '>';
                else
                    line += '.';
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get unknown edges for branching */
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
// Dotchiloop Solver
// ============================================
export class DotchiloopSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzprv3 URL parameter */
    static fromString(height, width, param) {
        const field = new DotchiloopField(height, width);
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
                if (row < height && col < width) {
                    if (ch === '1') {
                        field.setCell(row, col, DotchiCell.CIRCLE);
                    }
                    else if (ch === '2') {
                        field.setCell(row, col, DotchiCell.CROSS);
                    }
                    else if (ch === '3') {
                        field.setCell(row, col, DotchiCell.DOTCHI_LEFT);
                    }
                    else if (ch === '4') {
                        field.setCell(row, col, DotchiCell.DOTCHI_RIGHT);
                    }
                }
                index++;
            }
        }
        return new DotchiloopSolver(field);
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
                description: `Set edge at (${edge.row}, ${edge.col}) to LINE`,
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
//# sourceMappingURL=dotchiloop.js.map