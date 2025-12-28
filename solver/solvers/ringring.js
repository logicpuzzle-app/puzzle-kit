/**
 * Ring Ring Solver
 *
 * Rules:
 * 1. Draw walls to divide the grid into regions
 * 2. Black cells must be completely surrounded by walls
 * 3. Each white cell must have exactly 0 or 2 walls around it (forming rectangles)
 * 4. The white cells with walls form rectangular loops (rings)
 */
import { Grid } from '../core/field.js';
import { WallState, Direction, posEqual } from '../core/types.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Ring Ring Field State
// ============================================
export class RingringField {
    height;
    width;
    /** Black cells (immutable after initialization) */
    masu;
    /** Horizontal walls (between columns) */
    yokoWall;
    /** Vertical walls (between rows) */
    tateWall;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.masu = new Grid(height, width, () => false);
        this.yokoWall = new Grid(height, width - 1, () => WallState.UNKNOWN);
        this.tateWall = new Grid(height - 1, width, () => WallState.UNKNOWN);
    }
    /** Set a cell as black */
    setBlack(row, col) {
        this.masu.set(row, col, true);
        // Black cells are surrounded by walls
        if (row > 0)
            this.tateWall.set(row - 1, col, WallState.WALL);
        if (row < this.height - 1)
            this.tateWall.set(row, col, WallState.WALL);
        if (col > 0)
            this.yokoWall.set(row, col - 1, WallState.WALL);
        if (col < this.width - 1)
            this.yokoWall.set(row, col, WallState.WALL);
    }
    /** Check if cell is black */
    isBlack(row, col) {
        return this.masu.get(row, col);
    }
    /** Get horizontal wall state */
    getYokoWall(row, col) {
        if (col < 0 || col >= this.width - 1)
            return WallState.WALL;
        return this.yokoWall.get(row, col);
    }
    /** Get vertical wall state */
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
    /**
     * White cells must have exactly 0 or 2 walls.
     * Returns false if constraints are violated.
     */
    nextSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.isBlack(row, col))
                    continue;
                let wallCount = 0;
                let noWallCount = 0;
                const wallUp = row === 0 ? WallState.WALL : this.getTateWall(row - 1, col);
                const wallRight = col === this.width - 1 ? WallState.WALL : this.getYokoWall(row, col);
                const wallDown = row === this.height - 1 ? WallState.WALL : this.getTateWall(row, col);
                const wallLeft = col === 0 ? WallState.WALL : this.getYokoWall(row, col - 1);
                for (const wall of [wallUp, wallRight, wallDown, wallLeft]) {
                    if (wall === WallState.WALL)
                        wallCount++;
                    else if (wall === WallState.NO_WALL)
                        noWallCount++;
                }
                // More than 2 walls is invalid, or exactly 1 wall with 3 no-walls
                if (wallCount > 2 || (noWallCount === 3 && wallCount === 1)) {
                    return false;
                }
                // If we have 2 walls, mark remaining as no-wall
                if (wallCount === 2) {
                    if (wallUp === WallState.UNKNOWN) {
                        this.setTateWall(row - 1, col, WallState.NO_WALL);
                    }
                    if (wallRight === WallState.UNKNOWN) {
                        this.setYokoWall(row, col, WallState.NO_WALL);
                    }
                    if (wallDown === WallState.UNKNOWN) {
                        this.setTateWall(row, col, WallState.NO_WALL);
                    }
                    if (wallLeft === WallState.UNKNOWN) {
                        this.setYokoWall(row, col - 1, WallState.NO_WALL);
                    }
                }
                else if (wallCount === 1 && noWallCount === 2) {
                    // 1 wall and 2 no-walls means the remaining must be a wall
                    if (wallUp === WallState.UNKNOWN) {
                        this.setTateWall(row - 1, col, WallState.WALL);
                    }
                    if (wallRight === WallState.UNKNOWN) {
                        this.setYokoWall(row, col, WallState.WALL);
                    }
                    if (wallDown === WallState.UNKNOWN) {
                        this.setTateWall(row, col, WallState.WALL);
                    }
                    if (wallLeft === WallState.UNKNOWN) {
                        this.setYokoWall(row, col - 1, WallState.WALL);
                    }
                }
                else if (noWallCount === 3) {
                    // 3 no-walls means the remaining must be no-wall (can't have just 1 wall)
                    if (wallUp === WallState.UNKNOWN) {
                        this.setTateWall(row - 1, col, WallState.NO_WALL);
                    }
                    if (wallRight === WallState.UNKNOWN) {
                        this.setYokoWall(row, col, WallState.NO_WALL);
                    }
                    if (wallDown === WallState.UNKNOWN) {
                        this.setTateWall(row, col, WallState.NO_WALL);
                    }
                    if (wallLeft === WallState.UNKNOWN) {
                        this.setYokoWall(row, col - 1, WallState.NO_WALL);
                    }
                }
            }
        }
        return true;
    }
    /**
     * Check that white cells form valid rectangles.
     * Returns false if rectangle constraint is violated.
     */
    connectSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.isBlack(row, col))
                    continue;
                // Find corner cells (cells with exactly 2 walls at a corner)
                const wallUp = row === 0 ? WallState.WALL : this.getTateWall(row - 1, col);
                const wallRight = col === this.width - 1 ? WallState.WALL : this.getYokoWall(row, col);
                const wallDown = row === this.height - 1 ? WallState.WALL : this.getTateWall(row, col);
                const wallLeft = col === 0 ? WallState.WALL : this.getYokoWall(row, col - 1);
                let from = null;
                let canCurveDirection = null;
                if (wallUp === WallState.WALL && wallRight === WallState.WALL) {
                    // Top-right corner: go left and can curve down
                    from = Direction.RIGHT;
                    canCurveDirection = Direction.DOWN;
                }
                else if (wallUp === WallState.WALL && wallLeft === WallState.WALL) {
                    // Top-left corner: go right and can curve down
                    from = Direction.LEFT;
                    canCurveDirection = Direction.DOWN;
                }
                else if (wallRight === WallState.WALL && wallDown === WallState.WALL) {
                    // Bottom-right corner: go left and can curve up
                    from = Direction.RIGHT;
                    canCurveDirection = Direction.UP;
                }
                else if (wallDown === WallState.WALL && wallLeft === WallState.WALL) {
                    // Bottom-left corner: go right and can curve up
                    from = Direction.LEFT;
                    canCurveDirection = Direction.UP;
                }
                else {
                    continue;
                }
                const originPos = { row, col };
                if (!this.setContinuePosSet(originPos, originPos, from, canCurveDirection, 3)) {
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * Follow the rectangle from a corner, checking validity.
     * Returns false if rectangle doesn't close properly.
     */
    setContinuePosSet(originPos, pos, from, canCurveDirection, canCurveCnt) {
        if (canCurveCnt <= 1) {
            // After 2 curves, dimensions are fixed - just go straight back to origin
            if (from === Direction.DOWN) {
                // Go up
                while (pos.row !== originPos.row) {
                    pos = { row: pos.row - 1, col: pos.col };
                    if (posEqual(originPos, pos))
                        return true;
                }
            }
            else if (from === Direction.LEFT) {
                // Go right
                while (pos.col !== originPos.col) {
                    pos = { row: pos.row, col: pos.col + 1 };
                    if (posEqual(originPos, pos))
                        return true;
                }
            }
            else if (from === Direction.UP) {
                // Go down
                while (pos.row !== originPos.row) {
                    pos = { row: pos.row + 1, col: pos.col };
                    if (posEqual(originPos, pos))
                        return true;
                }
            }
            else if (from === Direction.RIGHT) {
                // Go left
                while (pos.col !== originPos.col) {
                    pos = { row: pos.row, col: pos.col - 1 };
                    if (posEqual(originPos, pos))
                        return true;
                }
            }
        }
        else {
            // Follow no-wall path straight
            if (from === Direction.DOWN) {
                // Go up
                while (pos.row > 0 && this.getTateWall(pos.row - 1, pos.col) === WallState.NO_WALL) {
                    pos = { row: pos.row - 1, col: pos.col };
                    if (posEqual(originPos, pos))
                        return true;
                }
            }
            else if (from === Direction.LEFT) {
                // Go right
                while (pos.col < this.width - 1 && this.getYokoWall(pos.row, pos.col) === WallState.NO_WALL) {
                    pos = { row: pos.row, col: pos.col + 1 };
                    if (posEqual(originPos, pos))
                        return true;
                }
            }
            else if (from === Direction.UP) {
                // Go down
                while (pos.row < this.height - 1 && this.getTateWall(pos.row, pos.col) === WallState.NO_WALL) {
                    pos = { row: pos.row + 1, col: pos.col };
                    if (posEqual(originPos, pos))
                        return true;
                }
            }
            else if (from === Direction.RIGHT) {
                // Go left
                while (pos.col > 0 && this.getYokoWall(pos.row, pos.col - 1) === WallState.NO_WALL) {
                    pos = { row: pos.row, col: pos.col - 1 };
                    if (posEqual(originPos, pos))
                        return true;
                }
            }
            // Check if we can continue straight (unknown walls)
            if (pos.row > 0 && from === Direction.DOWN &&
                this.getTateWall(pos.row - 1, pos.col) !== WallState.WALL) {
                return true;
            }
            else if (pos.col < this.width - 1 && from === Direction.LEFT &&
                this.getYokoWall(pos.row, pos.col) !== WallState.WALL) {
                return true;
            }
            else if (pos.row < this.height - 1 && from === Direction.UP &&
                this.getTateWall(pos.row, pos.col) !== WallState.WALL) {
                return true;
            }
            else if (pos.col > 0 && from === Direction.RIGHT &&
                this.getYokoWall(pos.row, pos.col - 1) !== WallState.WALL) {
                return true;
            }
        }
        // Try to curve
        if (pos.row > 0 && from !== Direction.UP &&
            this.getTateWall(pos.row - 1, pos.col) === WallState.NO_WALL) {
            // Curve up
            if (canCurveCnt === 0 || Direction.UP !== canCurveDirection) {
                return false;
            }
            const nextPos = { row: pos.row - 1, col: pos.col };
            if (posEqual(originPos, nextPos))
                return true;
            return this.setContinuePosSet(originPos, nextPos, Direction.DOWN, from, canCurveCnt - 1);
        }
        else if (pos.col < this.width - 1 && from !== Direction.RIGHT &&
            this.getYokoWall(pos.row, pos.col) === WallState.NO_WALL) {
            // Curve right
            if (canCurveCnt === 0 || Direction.RIGHT !== canCurveDirection) {
                return false;
            }
            const nextPos = { row: pos.row, col: pos.col + 1 };
            if (posEqual(originPos, nextPos))
                return true;
            return this.setContinuePosSet(originPos, nextPos, Direction.LEFT, from, canCurveCnt - 1);
        }
        else if (pos.row < this.height - 1 && from !== Direction.DOWN &&
            this.getTateWall(pos.row, pos.col) === WallState.NO_WALL) {
            // Curve down
            if (canCurveCnt === 0 || Direction.DOWN !== canCurveDirection) {
                return false;
            }
            const nextPos = { row: pos.row + 1, col: pos.col };
            if (posEqual(originPos, nextPos))
                return true;
            return this.setContinuePosSet(originPos, nextPos, Direction.UP, from, canCurveCnt - 1);
        }
        else if (pos.col > 0 && from !== Direction.LEFT &&
            this.getYokoWall(pos.row, pos.col - 1) === WallState.NO_WALL) {
            // Curve left
            if (canCurveCnt === 0 || Direction.LEFT !== canCurveDirection) {
                return false;
            }
            const nextPos = { row: pos.row, col: pos.col - 1 };
            if (posEqual(originPos, nextPos))
                return true;
            return this.setContinuePosSet(originPos, nextPos, Direction.RIGHT, from, canCurveCnt - 1);
        }
        return true;
    }
    /**
     * Each row/column must be crossed by an even number of no-walls.
     * Returns false if violated.
     */
    oddSolve() {
        // Check horizontal rows
        for (let row = 0; row < this.height - 1; row++) {
            let noWallCount = 0;
            let hasUnknown = false;
            for (let col = 0; col < this.width; col++) {
                if (this.tateWall.get(row, col) === WallState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                else if (this.tateWall.get(row, col) === WallState.NO_WALL) {
                    noWallCount++;
                }
            }
            if (!hasUnknown && noWallCount % 2 !== 0) {
                return false;
            }
        }
        // Check vertical columns
        for (let col = 0; col < this.width - 1; col++) {
            let noWallCount = 0;
            let hasUnknown = false;
            for (let row = 0; row < this.height; row++) {
                if (this.yokoWall.get(row, col) === WallState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                else if (this.yokoWall.get(row, col) === WallState.NO_WALL) {
                    noWallCount++;
                }
            }
            if (!hasUnknown && noWallCount % 2 !== 0) {
                return false;
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new RingringField(this.height, this.width);
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                cloned.masu.set(row, col, this.masu.get(row, col));
            }
        }
        for (const [pos, val] of this.yokoWall.entries()) {
            cloned.yokoWall.set(pos, val);
        }
        for (const [pos, val] of this.tateWall.entries()) {
            cloned.tateWall.set(pos, val);
        }
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                const wall = this.yokoWall.get(row, col);
                dump += wall === WallState.WALL ? 'W' : wall === WallState.NO_WALL ? 'N' : 'U';
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                const wall = this.tateWall.get(row, col);
                dump += wall === WallState.WALL ? 'W' : wall === WallState.NO_WALL ? 'N' : 'U';
            }
        }
        return dump;
    }
    isSolved() {
        // Check all walls are determined
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
        const beforeDump = this.getStateDump();
        if (!this.nextSolve())
            return false;
        if (this.getStateDump() !== beforeDump) {
            if (!this.oddSolve())
                return false;
            if (!this.connectSolve())
                return false;
            return this.solveAndCheck();
        }
        return true;
    }
    toString() {
        const lines = [];
        // Top border
        let topLine = '□';
        for (let col = 0; col < this.width; col++) {
            topLine += '□';
            if (col < this.width - 1)
                topLine += '□';
        }
        lines.push(topLine);
        for (let row = 0; row < this.height; row++) {
            // Cell row
            let cellLine = '□';
            for (let col = 0; col < this.width; col++) {
                cellLine += this.isBlack(row, col) ? '■' : '　';
                if (col < this.width - 1) {
                    const wall = this.yokoWall.get(row, col);
                    cellLine += wall === WallState.WALL ? '□' : wall === WallState.NO_WALL ? '　' : '?';
                }
            }
            cellLine += '□';
            lines.push(cellLine);
            // Wall row
            if (row < this.height - 1) {
                let wallLine = '□';
                for (let col = 0; col < this.width; col++) {
                    const wall = this.tateWall.get(row, col);
                    wallLine += wall === WallState.WALL ? '□' : wall === WallState.NO_WALL ? '　' : '?';
                    if (col < this.width - 1)
                        wallLine += '□';
                }
                wallLine += '□';
                lines.push(wallLine);
            }
        }
        // Bottom border
        let bottomLine = '□';
        for (let col = 0; col < this.width; col++) {
            bottomLine += '□';
            if (col < this.width - 1)
                bottomLine += '□';
        }
        lines.push(bottomLine);
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
// Ring Ring Solver
// ============================================
export class RingringSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzprv3 URL parameter */
    static fromString(height, width, param) {
        const field = new RingringField(height, width);
        let index = 0;
        for (let i = 0; i < param.length; i++) {
            const ch = param[i];
            const numValue = parseInt(ch, 36);
            if (numValue >= 0 && numValue <= 35) {
                // Skip cells
                index += numValue;
            }
            else {
                // Unknown character - skip 36 cells
                index += 36;
                continue;
            }
            // Next character is a black cell
            const row = Math.floor(index / width);
            const col = index % width;
            if (row < height && col < width) {
                field.setBlack(row, col);
            }
            index++;
        }
        return new RingringSolver(field);
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
                description: `Set ${wall.type === 'h' ? 'horizontal' : 'vertical'} wall at (${wall.row}, ${wall.col}) to WALL`,
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
                description: `Set ${wall.type === 'h' ? 'horizontal' : 'vertical'} wall at (${wall.row}, ${wall.col}) to NO_WALL`,
            },
        ];
    }
}
//# sourceMappingURL=ringring.js.map