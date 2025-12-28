/**
 * Myopia Solver
 *
 * Rules:
 * 1. Draw a single closed loop using horizontal and vertical line segments
 * 2. Arrows in a cell indicate all directions where the loop is closest
 * 3. The loop cannot cross itself or branch
 * 4. All arrows must be satisfied
 */
import { EdgeState } from '../core/types.js';
import { Grid, EdgeGrid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Myopia Types
// ============================================
/** Arrow directions as bit flags */
export var MyopiaArrow;
(function (MyopiaArrow) {
    MyopiaArrow[MyopiaArrow["NONE"] = 0] = "NONE";
    MyopiaArrow[MyopiaArrow["UP"] = 1] = "UP";
    MyopiaArrow[MyopiaArrow["RIGHT"] = 2] = "RIGHT";
    MyopiaArrow[MyopiaArrow["DOWN"] = 4] = "DOWN";
    MyopiaArrow[MyopiaArrow["LEFT"] = 8] = "LEFT";
})(MyopiaArrow || (MyopiaArrow = {}));
// ============================================
// Myopia Field State
// ============================================
export class MyopiaField {
    height;
    width;
    /** Arrow clues (bit flags) */
    arrows;
    /** Edge states */
    edges;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.arrows = new Grid(height, width, () => MyopiaArrow.NONE);
        this.edges = new EdgeGrid(height, width, EdgeState.UNKNOWN);
    }
    /** Set arrow clue */
    setArrow(row, col, arrow) {
        this.arrows.set(row, col, arrow);
    }
    /** Get arrow clue */
    getArrow(row, col) {
        return this.arrows.get(row, col);
    }
    /** Set horizontal edge */
    setHorizontalEdge(row, col, state) {
        this.edges.horizontal.set(row, col, state);
    }
    /** Set vertical edge */
    setVerticalEdge(row, col, state) {
        this.edges.vertical.set(row, col, state);
    }
    /** Get horizontal edge */
    getHorizontalEdge(row, col) {
        if (row < 0 || row > this.height || col < 0 || col >= this.width) {
            return EdgeState.EMPTY;
        }
        return this.edges.horizontal.get(row, col);
    }
    /** Get vertical edge */
    getVerticalEdge(row, col) {
        if (row < 0 || row >= this.height || col < 0 || col > this.width) {
            return EdgeState.EMPTY;
        }
        return this.edges.vertical.get(row, col);
    }
    /** Count edges at a vertex */
    countEdgesAtVertex(row, col, state) {
        let count = 0;
        // Up
        if (row > 0 && this.getHorizontalEdge(row, col) === state)
            count++;
        // Down
        if (row < this.height && this.getHorizontalEdge(row + 1, col) === state)
            count++;
        // Left
        if (col > 0 && this.getVerticalEdge(row, col) === state)
            count++;
        // Right
        if (col < this.width && this.getVerticalEdge(row, col + 1) === state)
            count++;
        return count;
    }
    /** Find closest loop distance in a direction from a cell */
    findClosestLoopDistance(row, col, dir) {
        let dist = 0;
        let r = row;
        let c = col;
        while (true) {
            // Check edge in direction
            let edgeState;
            if (dir === MyopiaArrow.UP) {
                if (r <= 0)
                    return null;
                edgeState = this.getHorizontalEdge(r, c);
                if (edgeState === EdgeState.LINE)
                    return dist;
                if (edgeState === EdgeState.UNKNOWN)
                    return -1; // Unknown
                r--;
                dist++;
            }
            else if (dir === MyopiaArrow.DOWN) {
                if (r >= this.height)
                    return null;
                edgeState = this.getHorizontalEdge(r + 1, c);
                if (edgeState === EdgeState.LINE)
                    return dist;
                if (edgeState === EdgeState.UNKNOWN)
                    return -1;
                r++;
                dist++;
            }
            else if (dir === MyopiaArrow.LEFT) {
                if (c <= 0)
                    return null;
                edgeState = this.getVerticalEdge(r, c);
                if (edgeState === EdgeState.LINE)
                    return dist;
                if (edgeState === EdgeState.UNKNOWN)
                    return -1;
                c--;
                dist++;
            }
            else if (dir === MyopiaArrow.RIGHT) {
                if (c >= this.width)
                    return null;
                edgeState = this.getVerticalEdge(r, c + 1);
                if (edgeState === EdgeState.LINE)
                    return dist;
                if (edgeState === EdgeState.UNKNOWN)
                    return -1;
                c++;
                dist++;
            }
            else {
                return null;
            }
        }
    }
    clone() {
        const cloned = new MyopiaField(this.height, this.width);
        for (const [pos, val] of this.arrows.entries()) {
            cloned.arrows.set(pos, val);
        }
        for (const [pos, val] of this.edges.horizontal.entries()) {
            cloned.edges.horizontal.set(pos, val);
        }
        for (const [pos, val] of this.edges.vertical.entries()) {
            cloned.edges.vertical.set(pos, val);
        }
        return cloned;
    }
    getStateDump() {
        return `H:${this.edges.horizontal.dump()}|V:${this.edges.vertical.dump()}`;
    }
    isSolved() {
        // Check no unknown edges
        for (const [, state] of this.edges.horizontal.entries()) {
            if (state === EdgeState.UNKNOWN)
                return false;
        }
        for (const [, state] of this.edges.vertical.entries()) {
            if (state === EdgeState.UNKNOWN)
                return false;
        }
        // Check all vertices have 0 or 2 edges
        for (let row = 0; row <= this.height; row++) {
            for (let col = 0; col <= this.width; col++) {
                const count = this.countEdgesAtVertex(row, col, EdgeState.LINE);
                if (count !== 0 && count !== 2)
                    return false;
            }
        }
        // Check arrow constraints
        for (const [pos, arrow] of this.arrows.entries()) {
            if (arrow === MyopiaArrow.NONE)
                continue;
            if (!this.checkArrowConstraint(pos.row, pos.col, arrow))
                return false;
        }
        // Check at least one edge exists
        let hasEdge = false;
        for (const [, state] of this.edges.horizontal.entries()) {
            if (state === EdgeState.LINE) {
                hasEdge = true;
                break;
            }
        }
        if (!hasEdge) {
            for (const [, state] of this.edges.vertical.entries()) {
                if (state === EdgeState.LINE) {
                    hasEdge = true;
                    break;
                }
            }
        }
        return hasEdge;
    }
    /** Check if arrow constraint is satisfied */
    checkArrowConstraint(row, col, arrow) {
        const dirs = [MyopiaArrow.UP, MyopiaArrow.RIGHT, MyopiaArrow.DOWN, MyopiaArrow.LEFT];
        const distances = [];
        for (const dir of dirs) {
            distances.push(this.findClosestLoopDistance(row, col, dir));
        }
        // Find minimum distance (ignore null = no loop in that direction)
        let minDist = Infinity;
        for (const d of distances) {
            if (d !== null && d >= 0 && d < minDist) {
                minDist = d;
            }
        }
        if (minDist === Infinity)
            return false;
        // Check that arrows point to all directions with minimum distance
        for (let i = 0; i < dirs.length; i++) {
            const hasArrow = (arrow & dirs[i]) !== 0;
            const dist = distances[i];
            if (dist !== null && dist >= 0 && dist === minDist) {
                if (!hasArrow)
                    return false;
            }
            else if (dist !== null && dist >= 0 && hasArrow) {
                return false;
            }
        }
        return true;
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            changed = false;
            // Vertex constraints
            for (let row = 0; row <= this.height; row++) {
                for (let col = 0; col <= this.width; col++) {
                    const lineCount = this.countEdgesAtVertex(row, col, EdgeState.LINE);
                    const unknownCount = this.countEdgesAtVertex(row, col, EdgeState.UNKNOWN);
                    if (lineCount > 2)
                        return false;
                    if (lineCount === 1 && unknownCount === 0)
                        return false;
                    if (lineCount === 2 && unknownCount > 0) {
                        changed = this.markVertexEdges(row, col, EdgeState.UNKNOWN, EdgeState.EMPTY) || changed;
                    }
                    if (lineCount === 1 && unknownCount === 1) {
                        changed = this.markVertexEdges(row, col, EdgeState.UNKNOWN, EdgeState.LINE) || changed;
                    }
                    if (lineCount === 0 && unknownCount === 1) {
                        changed = this.markVertexEdges(row, col, EdgeState.UNKNOWN, EdgeState.EMPTY) || changed;
                    }
                }
            }
            // Arrow constraints (basic)
            for (const [pos, arrow] of this.arrows.entries()) {
                if (arrow === MyopiaArrow.NONE)
                    continue;
                const dirs = [MyopiaArrow.UP, MyopiaArrow.RIGHT, MyopiaArrow.DOWN, MyopiaArrow.LEFT];
                const distances = [];
                for (const dir of dirs) {
                    distances.push(this.findClosestLoopDistance(pos.row, pos.col, dir));
                }
                // If any direction with arrow has no loop possible, contradiction
                for (let i = 0; i < dirs.length; i++) {
                    if ((arrow & dirs[i]) !== 0 && distances[i] === null) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    markVertexEdges(row, col, fromState, toState) {
        let changed = false;
        // Up
        if (row > 0 && this.getHorizontalEdge(row, col) === fromState) {
            this.edges.horizontal.set(row, col, toState);
            changed = true;
        }
        // Down
        if (row < this.height && this.getHorizontalEdge(row + 1, col) === fromState) {
            this.edges.horizontal.set(row + 1, col, toState);
            changed = true;
        }
        // Left
        if (col > 0 && this.getVerticalEdge(row, col) === fromState) {
            this.edges.vertical.set(row, col, toState);
            changed = true;
        }
        // Right
        if (col < this.width && this.getVerticalEdge(row, col + 1) === fromState) {
            this.edges.vertical.set(row, col + 1, toState);
            changed = true;
        }
        return changed;
    }
    toString() {
        const lines = [];
        for (let row = 0; row <= this.height; row++) {
            let vertexLine = '';
            for (let col = 0; col <= this.width; col++) {
                vertexLine += '·';
                if (col < this.width) {
                    const h = this.getHorizontalEdge(row, col);
                    vertexLine += h === EdgeState.LINE ? '─' : h === EdgeState.EMPTY ? ' ' : '?';
                }
            }
            lines.push(vertexLine);
            if (row < this.height) {
                let cellLine = '';
                for (let col = 0; col <= this.width; col++) {
                    const v = this.getVerticalEdge(row, col);
                    cellLine += v === EdgeState.LINE ? '│' : v === EdgeState.EMPTY ? ' ' : '?';
                    if (col < this.width) {
                        const arrow = this.arrows.get(row, col);
                        cellLine += this.arrowToChar(arrow);
                    }
                }
                lines.push(cellLine);
            }
        }
        return lines.join('\n');
    }
    arrowToChar(arrow) {
        if (arrow === MyopiaArrow.NONE)
            return ' ';
        if (arrow === MyopiaArrow.UP)
            return '↑';
        if (arrow === MyopiaArrow.DOWN)
            return '↓';
        if (arrow === MyopiaArrow.LEFT)
            return '←';
        if (arrow === MyopiaArrow.RIGHT)
            return '→';
        if (arrow === (MyopiaArrow.UP | MyopiaArrow.DOWN))
            return '↕';
        if (arrow === (MyopiaArrow.LEFT | MyopiaArrow.RIGHT))
            return '↔';
        return '+';
    }
    getUnknownEdges() {
        const unknowns = [];
        for (const [pos, state] of this.edges.horizontal.entries()) {
            if (state === EdgeState.UNKNOWN) {
                unknowns.push({ type: 'h', row: pos.row, col: pos.col });
            }
        }
        for (const [pos, state] of this.edges.vertical.entries()) {
            if (state === EdgeState.UNKNOWN) {
                unknowns.push({ type: 'v', row: pos.row, col: pos.col });
            }
        }
        return unknowns;
    }
}
// ============================================
// Myopia Solver
// ============================================
export class MyopiaSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from pzprv3 URL parameter
     * Format: height x width grid with arrow codes
     * Arrow codes: 1=up, 2=right, 3=down, 4=left
     * Combined arrows use hex: 5=up+down, 6=left+right, etc.
     */
    static fromString(height, width, param) {
        const field = new MyopiaField(height, width);
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
                // Parse arrow direction
                let arrow = MyopiaArrow.NONE;
                if (ch === '1')
                    arrow = MyopiaArrow.UP;
                else if (ch === '2')
                    arrow = MyopiaArrow.RIGHT;
                else if (ch === '3')
                    arrow = MyopiaArrow.DOWN;
                else if (ch === '4')
                    arrow = MyopiaArrow.LEFT;
                else if (ch === '5')
                    arrow = MyopiaArrow.UP | MyopiaArrow.RIGHT;
                else if (ch === '6')
                    arrow = MyopiaArrow.RIGHT | MyopiaArrow.DOWN;
                else if (ch === '7')
                    arrow = MyopiaArrow.DOWN | MyopiaArrow.LEFT;
                else if (ch === '8')
                    arrow = MyopiaArrow.LEFT | MyopiaArrow.UP;
                else if (ch === '9')
                    arrow = MyopiaArrow.UP | MyopiaArrow.DOWN;
                else if (ch === 'a')
                    arrow = MyopiaArrow.LEFT | MyopiaArrow.RIGHT;
                else if (ch === 'b')
                    arrow = MyopiaArrow.UP | MyopiaArrow.RIGHT | MyopiaArrow.DOWN;
                else if (ch === 'c')
                    arrow = MyopiaArrow.RIGHT | MyopiaArrow.DOWN | MyopiaArrow.LEFT;
                else if (ch === 'd')
                    arrow = MyopiaArrow.DOWN | MyopiaArrow.LEFT | MyopiaArrow.UP;
                else if (ch === 'e')
                    arrow = MyopiaArrow.LEFT | MyopiaArrow.UP | MyopiaArrow.RIGHT;
                else if (ch === 'f')
                    arrow = MyopiaArrow.UP | MyopiaArrow.RIGHT | MyopiaArrow.DOWN | MyopiaArrow.LEFT;
                if (arrow !== MyopiaArrow.NONE && row < height && col < width) {
                    field.setArrow(row, col, arrow);
                }
                index++;
            }
        }
        return new MyopiaSolver(field);
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
                        cloned.setHorizontalEdge(edge.row, edge.col, EdgeState.LINE);
                    }
                    else {
                        cloned.setVerticalEdge(edge.row, edge.col, EdgeState.LINE);
                    }
                    return cloned;
                },
                description: `Set ${edge.type === 'h' ? 'horizontal' : 'vertical'} edge at (${edge.row}, ${edge.col}) to LINE`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (edge.type === 'h') {
                        cloned.setHorizontalEdge(edge.row, edge.col, EdgeState.EMPTY);
                    }
                    else {
                        cloned.setVerticalEdge(edge.row, edge.col, EdgeState.EMPTY);
                    }
                    return cloned;
                },
                description: `Set ${edge.type === 'h' ? 'horizontal' : 'vertical'} edge at (${edge.row}, ${edge.col}) to EMPTY`,
            },
        ];
    }
}
//# sourceMappingURL=myopia.js.map