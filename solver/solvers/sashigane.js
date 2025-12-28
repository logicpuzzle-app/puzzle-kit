/**
 * Sashigane (L-shaped ruler) Solver
 *
 * Rules:
 * 1. Divide the grid into L-shaped regions
 * 2. Each L-shape must have exactly one 90-degree bend
 * 3. Arrows (↑↓←→) indicate the direction of the arm extending from that cell
 * 4. Circles indicate the bend point of the L-shape
 * 5. Numbers in circles indicate the total size of the L-region
 */
import { Direction, WallState } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Sashigane Field State
// ============================================
export class SashiganeField {
    height;
    width;
    /** Arrow directions */
    arrows;
    /** Circle cells */
    circles;
    /** Horizontal walls between (row, col) and (row, col+1) */
    yokoWall;
    /** Vertical walls between (row, col) and (row+1, col) */
    tateWall;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.arrows = new Grid(height, width, () => null);
        this.circles = new Grid(height, width, () => null);
        this.yokoWall = new Grid(height, width - 1, () => WallState.UNKNOWN);
        this.tateWall = new Grid(height - 1, width, () => WallState.UNKNOWN);
    }
    /** Set an arrow at position */
    setArrow(row, col, dir) {
        this.arrows.set(row, col, dir);
    }
    /** Set a circle at position */
    setCircle(row, col, count) {
        this.circles.set(row, col, { count });
    }
    /** Get arrow at position */
    getArrow(row, col) {
        return this.arrows.get(row, col);
    }
    /** Get circle at position */
    getCircle(row, col) {
        return this.circles.get(row, col);
    }
    /** Get horizontal wall */
    getYokoWall(row, col) {
        if (col < 0 || col >= this.width - 1)
            return WallState.WALL;
        return this.yokoWall.get(row, col);
    }
    /** Get vertical wall */
    getTateWall(row, col) {
        if (row < 0 || row >= this.height - 1)
            return WallState.WALL;
        return this.tateWall.get(row, col);
    }
    /** Set horizontal wall */
    setYokoWall(row, col, state) {
        if (col >= 0 && col < this.width - 1) {
            this.yokoWall.set(row, col, state);
        }
    }
    /** Set vertical wall */
    setTateWall(row, col, state) {
        if (row >= 0 && row < this.height - 1) {
            this.tateWall.set(row, col, state);
        }
    }
    /** Initialize walls based on arrows and circles */
    firstSolve() {
        // Set walls based on arrows
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const arrow = this.arrows.get(row, col);
                if (arrow !== null) {
                    // Arrows point to where the L extends - set walls in other directions
                    if (row > 0) {
                        if (arrow !== Direction.UP) {
                            this.setTateWall(row - 1, col, WallState.WALL);
                        }
                        else {
                            this.setTateWall(row - 1, col, WallState.NO_WALL);
                        }
                    }
                    if (col < this.width - 1) {
                        if (arrow !== Direction.RIGHT) {
                            this.setYokoWall(row, col, WallState.WALL);
                        }
                        else {
                            this.setYokoWall(row, col, WallState.NO_WALL);
                        }
                    }
                    if (row < this.height - 1) {
                        if (arrow !== Direction.DOWN) {
                            this.setTateWall(row, col, WallState.WALL);
                        }
                        else {
                            this.setTateWall(row, col, WallState.NO_WALL);
                        }
                    }
                    if (col > 0) {
                        if (arrow !== Direction.LEFT) {
                            this.setYokoWall(row, col - 1, WallState.WALL);
                        }
                        else {
                            this.setYokoWall(row, col - 1, WallState.NO_WALL);
                        }
                    }
                }
            }
        }
        // Adjacent circles must have walls between them
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.circles.get(row, col) !== null && this.circles.get(row, col + 1) !== null) {
                    this.setYokoWall(row, col, WallState.WALL);
                }
                if (this.circles.get(row, col) !== null && this.circles.get(row + 1, col) !== null) {
                    this.setTateWall(row, col, WallState.WALL);
                }
            }
        }
    }
    /** Each cell must have 2 or 3 walls (L-shapes), circles must curve */
    nextSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const wallUp = row === 0 ? WallState.WALL : this.getTateWall(row - 1, col);
                const wallRight = col === this.width - 1 ? WallState.WALL : this.getYokoWall(row, col);
                const wallDown = row === this.height - 1 ? WallState.WALL : this.getTateWall(row, col);
                const wallLeft = col === 0 ? WallState.WALL : this.getYokoWall(row, col - 1);
                let wallCount = 0;
                let noWallCount = 0;
                if (wallUp === WallState.WALL)
                    wallCount++;
                else if (wallUp === WallState.NO_WALL)
                    noWallCount++;
                if (wallRight === WallState.WALL)
                    wallCount++;
                else if (wallRight === WallState.NO_WALL)
                    noWallCount++;
                if (wallDown === WallState.WALL)
                    wallCount++;
                else if (wallDown === WallState.NO_WALL)
                    noWallCount++;
                if (wallLeft === WallState.WALL)
                    wallCount++;
                else if (wallLeft === WallState.NO_WALL)
                    noWallCount++;
                // Circle cells must curve (exactly 2 walls in perpendicular directions)
                if (this.circles.get(row, col) !== null) {
                    // Can't have opposite walls both as no-wall
                    if ((wallUp === WallState.WALL && wallDown === WallState.WALL) ||
                        (wallRight === WallState.WALL && wallLeft === WallState.WALL)) {
                        return false;
                    }
                    if ((wallUp === WallState.NO_WALL && wallDown === WallState.NO_WALL) ||
                        (wallRight === WallState.NO_WALL && wallLeft === WallState.NO_WALL)) {
                        return false;
                    }
                    // Propagate constraints
                    if (wallUp === WallState.WALL && wallDown === WallState.UNKNOWN) {
                        this.setTateWall(row, col, WallState.NO_WALL);
                    }
                    if (wallDown === WallState.WALL && wallUp === WallState.UNKNOWN) {
                        this.setTateWall(row - 1, col, WallState.NO_WALL);
                    }
                    if (wallRight === WallState.WALL && wallLeft === WallState.UNKNOWN) {
                        this.setYokoWall(row, col - 1, WallState.NO_WALL);
                    }
                    if (wallLeft === WallState.WALL && wallRight === WallState.UNKNOWN) {
                        this.setYokoWall(row, col, WallState.NO_WALL);
                    }
                    if (wallUp === WallState.NO_WALL && wallDown === WallState.UNKNOWN) {
                        this.setTateWall(row, col, WallState.WALL);
                    }
                    if (wallDown === WallState.NO_WALL && wallUp === WallState.UNKNOWN) {
                        this.setTateWall(row - 1, col, WallState.WALL);
                    }
                    if (wallRight === WallState.NO_WALL && wallLeft === WallState.UNKNOWN) {
                        this.setYokoWall(row, col - 1, WallState.WALL);
                    }
                    if (wallLeft === WallState.NO_WALL && wallRight === WallState.UNKNOWN) {
                        this.setYokoWall(row, col, WallState.WALL);
                    }
                }
                else {
                    // Non-circle cells: must have 2 or 3 walls
                    if (wallCount > 3 || noWallCount > 2) {
                        return false;
                    }
                    // If 3 walls, remaining must be no-wall
                    if (wallCount === 3 && noWallCount === 0) {
                        if (wallUp === WallState.UNKNOWN)
                            this.setTateWall(row - 1, col, WallState.NO_WALL);
                        if (wallRight === WallState.UNKNOWN)
                            this.setYokoWall(row, col, WallState.NO_WALL);
                        if (wallDown === WallState.UNKNOWN)
                            this.setTateWall(row, col, WallState.NO_WALL);
                        if (wallLeft === WallState.UNKNOWN)
                            this.setYokoWall(row, col - 1, WallState.NO_WALL);
                    }
                    // If 2 no-walls, remaining must be walls
                    if (noWallCount === 2 && wallCount < 2) {
                        if (wallUp === WallState.UNKNOWN)
                            this.setTateWall(row - 1, col, WallState.WALL);
                        if (wallRight === WallState.UNKNOWN)
                            this.setYokoWall(row, col, WallState.WALL);
                        if (wallDown === WallState.UNKNOWN)
                            this.setTateWall(row, col, WallState.WALL);
                        if (wallLeft === WallState.UNKNOWN)
                            this.setYokoWall(row, col - 1, WallState.WALL);
                    }
                }
            }
        }
        return true;
    }
    /** Check number constraints */
    numberSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const circle = this.circles.get(row, col);
                if (circle === null || circle.count === -1)
                    continue;
                // Count reachable cells in each direction
                let upCount = 0, rightCount = 0, downCount = 0, leftCount = 0;
                let upWhite = 0, rightWhite = 0, downWhite = 0, leftWhite = 0;
                let upCounting = true, rightCounting = true, downCounting = true, leftCounting = true;
                // Up
                for (let r = row - 1; r >= 0; r--) {
                    if (this.getTateWall(r, col) === WallState.WALL || this.circles.get(r, col) !== null)
                        break;
                    if (this.getTateWall(r, col) !== WallState.NO_WALL)
                        upCounting = false;
                    if (upCounting)
                        upWhite++;
                    upCount++;
                }
                // Right
                for (let c = col + 1; c < this.width; c++) {
                    if (this.getYokoWall(row, c - 1) === WallState.WALL || this.circles.get(row, c) !== null)
                        break;
                    if (this.getYokoWall(row, c - 1) !== WallState.NO_WALL)
                        rightCounting = false;
                    if (rightCounting)
                        rightWhite++;
                    rightCount++;
                }
                // Down
                for (let r = row + 1; r < this.height; r++) {
                    if (this.getTateWall(r - 1, col) === WallState.WALL || this.circles.get(r, col) !== null)
                        break;
                    if (this.getTateWall(r - 1, col) !== WallState.NO_WALL)
                        downCounting = false;
                    if (downCounting)
                        downWhite++;
                    downCount++;
                }
                // Left
                for (let c = col - 1; c >= 0; c--) {
                    if (this.getYokoWall(row, c) === WallState.WALL || this.circles.get(row, c) !== null)
                        break;
                    if (this.getYokoWall(row, c) !== WallState.NO_WALL)
                        leftCounting = false;
                    if (leftCounting)
                        leftWhite++;
                    leftCount++;
                }
                const totalSpace = 1 + upCount + rightCount + downCount + leftCount;
                const totalWhite = 1 + upWhite + rightWhite + downWhite + leftWhite;
                if (totalSpace < circle.count)
                    return false;
                if (totalWhite > circle.count)
                    return false;
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new SashiganeField(this.height, this.width);
        for (const [pos, arrow] of this.arrows.entries()) {
            cloned.arrows.set(pos, arrow);
        }
        for (const [pos, circle] of this.circles.entries()) {
            cloned.circles.set(pos, circle);
        }
        for (const [pos, wall] of this.yokoWall.entries()) {
            cloned.yokoWall.set(pos, wall);
        }
        for (const [pos, wall] of this.tateWall.entries()) {
            cloned.tateWall.set(pos, wall);
        }
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                dump += this.yokoWall.get(row, col);
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                dump += this.tateWall.get(row, col);
            }
        }
        return dump;
    }
    isSolved() {
        // All walls must be determined
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoWall.get(row, col) === WallState.UNKNOWN)
                    return false;
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateWall.get(row, col) === WallState.UNKNOWN)
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
            if (!this.numberSolve())
                return false;
            changed = this.getStateDump() !== beforeDump;
        }
        return true;
    }
    toString() {
        const lines = [];
        const dirChars = {
            [Direction.UP]: '↑',
            [Direction.RIGHT]: '→',
            [Direction.DOWN]: '↓',
            [Direction.LEFT]: '←',
        };
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const arrow = this.arrows.get(row, col);
                const circle = this.circles.get(row, col);
                if (arrow !== null) {
                    line += dirChars[arrow];
                }
                else if (circle !== null) {
                    line += circle.count === -1 ? '○' : String(circle.count);
                }
                else {
                    line += '.';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get unknown walls for branching */
    getUnknownWalls() {
        const unknowns = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoWall.get(row, col) === WallState.UNKNOWN) {
                    unknowns.push({ type: 'h', row, col });
                }
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateWall.get(row, col) === WallState.UNKNOWN) {
                    unknowns.push({ type: 'v', row, col });
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Sashigane Solver
// ============================================
export class SashiganeSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from puzzle string array */
    static fromString(height, width, puzzle) {
        const field = new SashiganeField(height, width);
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const ch = puzzle[row]?.[col];
                if (ch === '^' || ch === '↑') {
                    field.setArrow(row, col, Direction.UP);
                }
                else if (ch === '>' || ch === '→') {
                    field.setArrow(row, col, Direction.RIGHT);
                }
                else if (ch === 'v' || ch === '↓') {
                    field.setArrow(row, col, Direction.DOWN);
                }
                else if (ch === '<' || ch === '←') {
                    field.setArrow(row, col, Direction.LEFT);
                }
                else if (ch === 'o' || ch === '○') {
                    field.setCircle(row, col, -1);
                }
                else if (ch && ch >= '1' && ch <= '9') {
                    field.setCircle(row, col, parseInt(ch));
                }
            }
        }
        field.firstSolve();
        return new SashiganeSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownWalls();
        if (unknowns.length === 0)
            return [];
        const wall = unknowns[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (wall.type === 'h') {
                        cloned.setYokoWall(wall.row, wall.col, WallState.WALL);
                    }
                    else {
                        cloned.setTateWall(wall.row, wall.col, WallState.WALL);
                    }
                    return cloned;
                },
                description: `Set wall at (${wall.row}, ${wall.col}) to WALL`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (wall.type === 'h') {
                        cloned.setYokoWall(wall.row, wall.col, WallState.NO_WALL);
                    }
                    else {
                        cloned.setTateWall(wall.row, wall.col, WallState.NO_WALL);
                    }
                    return cloned;
                },
                description: `Set wall at (${wall.row}, ${wall.col}) to NO_WALL`,
            },
        ];
    }
}
//# sourceMappingURL=sashigane.js.map