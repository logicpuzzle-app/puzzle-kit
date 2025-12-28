/**
 * Pencils Solver
 *
 * Rules:
 * 1. Divide the grid into rooms (regions)
 * 2. Each room represents a pencil with a wooden body (white cells) and lead (black cell)
 * 3. Room size must be odd (3 or larger), or if numbered: exactly number * 2 + 1
 * 4. Each room has exactly one more black cell than white cells
 * 5. White and black cells cannot alternate multiple times within a room
 * 6. Black/white cells each have 2 or 3 walls around them
 * 7. White cells with only 2 walls must go straight (no curves)
 * 8. Numbers indicate the length of the wooden body (white cells in a row/column)
 * 9. Some puzzles have fixed lead positions (芯) shown with directional hints
 */
import { Direction, CellState, WallState, posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Pencils Field State
// ============================================
export class PencilsField {
    height;
    width;
    /** Cell states (black/white/unknown) */
    masu;
    /** Number clues (null = no number) */
    numbers;
    /** Fixed lead positions (for display) */
    fixedLeadPos;
    /** Horizontal walls (between col and col+1) */
    yokoWall;
    /** Vertical walls (between row and row+1) */
    tateWall;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.masu = new Grid(height, width, CellState.UNKNOWN);
        this.numbers = new Grid(height, width, () => null);
        this.fixedLeadPos = new Set();
        this.yokoWall = new Grid(height, width - 1, WallState.UNKNOWN);
        this.tateWall = new Grid(height - 1, width, WallState.UNKNOWN);
    }
    /** Get cell state */
    getMasu(row, col) {
        return this.masu.get(row, col);
    }
    /** Set cell state */
    setMasu(row, col, state) {
        this.masu.set(row, col, state);
    }
    /** Get number clue */
    getNumber(row, col) {
        return this.numbers.get(row, col);
    }
    /** Set number clue */
    setNumber(row, col, num) {
        this.numbers.set(row, col, num);
    }
    /** Get horizontal wall state */
    getYokoWall(row, col) {
        return this.yokoWall.get(row, col);
    }
    /** Set horizontal wall state */
    setYokoWall(row, col, state) {
        this.yokoWall.set(row, col, state);
    }
    /** Get vertical wall state */
    getTateWall(row, col) {
        return this.tateWall.get(row, col);
    }
    /** Set vertical wall state */
    setTateWall(row, col, state) {
        this.tateWall.set(row, col, state);
    }
    // ========== Constraint solving ==========
    /**
     * Wall constraint:
     * - Each cell (black or white) has exactly 2 or 3 walls
     * - White cells with 2 walls must go straight (no curves)
     */
    wallSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                let existsCount = 0;
                let notExistsCount = 0;
                // Check all 4 walls
                const wallUp = row === 0 ? WallState.WALL : this.tateWall.get(row - 1, col);
                if (wallUp === WallState.WALL)
                    existsCount++;
                else if (wallUp === WallState.NO_WALL)
                    notExistsCount++;
                const wallRight = col === this.width - 1 ? WallState.WALL : this.yokoWall.get(row, col);
                if (wallRight === WallState.WALL)
                    existsCount++;
                else if (wallRight === WallState.NO_WALL)
                    notExistsCount++;
                const wallDown = row === this.height - 1 ? WallState.WALL : this.tateWall.get(row, col);
                if (wallDown === WallState.WALL)
                    existsCount++;
                else if (wallDown === WallState.NO_WALL)
                    notExistsCount++;
                const wallLeft = col === 0 ? WallState.WALL : this.yokoWall.get(row, col - 1);
                if (wallLeft === WallState.WALL)
                    existsCount++;
                else if (wallLeft === WallState.NO_WALL)
                    notExistsCount++;
                // Cannot have more than 2 no-walls or all 4 walls
                if (notExistsCount > 2 || existsCount === 4) {
                    return false;
                }
                // If 3 walls exist, the remaining must be no-wall
                if (existsCount === 3) {
                    if (wallUp === WallState.UNKNOWN)
                        this.tateWall.set(row - 1, col, WallState.NO_WALL);
                    if (wallRight === WallState.UNKNOWN)
                        this.yokoWall.set(row, col, WallState.NO_WALL);
                    if (wallDown === WallState.UNKNOWN)
                        this.tateWall.set(row, col, WallState.NO_WALL);
                    if (wallLeft === WallState.UNKNOWN)
                        this.yokoWall.set(row, col - 1, WallState.NO_WALL);
                }
                // If 2 no-walls exist, the remaining must be walls
                if (notExistsCount === 2) {
                    if (wallUp === WallState.UNKNOWN)
                        this.tateWall.set(row - 1, col, WallState.WALL);
                    if (wallRight === WallState.UNKNOWN)
                        this.yokoWall.set(row, col, WallState.WALL);
                    if (wallDown === WallState.UNKNOWN)
                        this.tateWall.set(row, col, WallState.WALL);
                    if (wallLeft === WallState.UNKNOWN)
                        this.yokoWall.set(row, col - 1, WallState.WALL);
                }
                // If unknown cell has curve (2 perpendicular no-walls), it must be black
                if (this.masu.get(row, col) === CellState.UNKNOWN) {
                    if ((wallUp === WallState.NO_WALL && wallRight === WallState.NO_WALL) ||
                        (wallUp === WallState.NO_WALL && wallLeft === WallState.NO_WALL) ||
                        (wallRight === WallState.NO_WALL && wallDown === WallState.NO_WALL) ||
                        (wallDown === WallState.NO_WALL && wallLeft === WallState.NO_WALL)) {
                        this.masu.set(row, col, CellState.BLACK);
                    }
                }
                // White cells cannot curve
                if (this.masu.get(row, col) === CellState.WHITE) {
                    if ((wallUp === WallState.NO_WALL && wallRight === WallState.NO_WALL) ||
                        (wallUp === WallState.NO_WALL && wallLeft === WallState.NO_WALL) ||
                        (wallRight === WallState.NO_WALL && wallDown === WallState.NO_WALL) ||
                        (wallDown === WallState.NO_WALL && wallLeft === WallState.NO_WALL)) {
                        return false;
                    }
                    // Prevent curves: if horizontal no-wall exists, vertical must be wall
                    if (wallRight === WallState.NO_WALL || wallLeft === WallState.NO_WALL) {
                        if (wallUp === WallState.UNKNOWN)
                            this.tateWall.set(row - 1, col, WallState.WALL);
                        if (wallDown === WallState.UNKNOWN)
                            this.tateWall.set(row, col, WallState.WALL);
                    }
                    if (wallUp === WallState.NO_WALL || wallDown === WallState.NO_WALL) {
                        if (wallRight === WallState.UNKNOWN)
                            this.yokoWall.set(row, col, WallState.WALL);
                        if (wallLeft === WallState.UNKNOWN)
                            this.yokoWall.set(row, col - 1, WallState.WALL);
                    }
                }
            }
        }
        return true;
    }
    /**
     * Length constraint:
     * Numbers indicate the length of white cells in a line
     */
    lengthSolve() {
        // Check extension possibilities
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num === null)
                    continue;
                // Count potential white cells in each direction
                let upSpaceCnt = 0;
                for (let targetY = row - 1; targetY >= 0; targetY--) {
                    const targetNum = this.numbers.get(targetY, col);
                    if ((targetNum !== null && targetNum !== num) ||
                        this.tateWall.get(targetY, col) === WallState.WALL ||
                        this.masu.get(targetY, col) === CellState.BLACK) {
                        break;
                    }
                    upSpaceCnt++;
                }
                let rightSpaceCnt = 0;
                for (let targetX = col + 1; targetX < this.width; targetX++) {
                    const targetNum = this.numbers.get(row, targetX);
                    if ((targetNum !== null && targetNum !== num) ||
                        this.yokoWall.get(row, targetX - 1) === WallState.WALL ||
                        this.masu.get(row, targetX) === CellState.BLACK) {
                        break;
                    }
                    rightSpaceCnt++;
                }
                let downSpaceCnt = 0;
                for (let targetY = row + 1; targetY < this.height; targetY++) {
                    const targetNum = this.numbers.get(targetY, col);
                    if ((targetNum !== null && targetNum !== num) ||
                        this.tateWall.get(targetY - 1, col) === WallState.WALL ||
                        this.masu.get(targetY, col) === CellState.BLACK) {
                        break;
                    }
                    downSpaceCnt++;
                }
                let leftSpaceCnt = 0;
                for (let targetX = col - 1; targetX >= 0; targetX--) {
                    const targetNum = this.numbers.get(row, targetX);
                    if ((targetNum !== null && targetNum !== num) ||
                        this.yokoWall.get(row, targetX) === WallState.WALL ||
                        this.masu.get(row, targetX) === CellState.BLACK) {
                        break;
                    }
                    leftSpaceCnt++;
                }
                const verticalCnt = 1 + upSpaceCnt + downSpaceCnt;
                const horizontalCnt = 1 + rightSpaceCnt + leftSpaceCnt;
                if (verticalCnt < num && horizontalCnt < num) {
                    return false;
                }
                else if (verticalCnt < num) {
                    // Must extend horizontally
                    const fixedWhiteRight = num - (1 + leftSpaceCnt);
                    const fixedWhiteLeft = num - (1 + rightSpaceCnt);
                    if (fixedWhiteRight > 0) {
                        for (let i = 1; i <= fixedWhiteRight; i++) {
                            this.yokoWall.set(row, col + i - 1, WallState.NO_WALL);
                            this.masu.set(row, col + i, CellState.WHITE);
                        }
                    }
                    if (fixedWhiteLeft > 0) {
                        for (let i = 1; i <= fixedWhiteLeft; i++) {
                            this.yokoWall.set(row, col - i, WallState.NO_WALL);
                            this.masu.set(row, col - i, CellState.WHITE);
                        }
                    }
                }
                else if (horizontalCnt < num) {
                    // Must extend vertically
                    const fixedWhiteUp = num - (1 + downSpaceCnt);
                    const fixedWhiteDown = num - (1 + upSpaceCnt);
                    if (fixedWhiteUp > 0) {
                        for (let i = 1; i <= fixedWhiteUp; i++) {
                            this.tateWall.set(row - i, col, WallState.NO_WALL);
                            this.masu.set(row - i, col, CellState.WHITE);
                        }
                    }
                    if (fixedWhiteDown > 0) {
                        for (let i = 1; i <= fixedWhiteDown; i++) {
                            this.tateWall.set(row + i - 1, col, WallState.NO_WALL);
                            this.masu.set(row + i, col, CellState.WHITE);
                        }
                    }
                }
            }
        }
        // Check for completed pencils
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num === null)
                    continue;
                // Count confirmed white cells in each direction
                let upWhiteCnt = 0;
                for (let targetY = row - 1; targetY >= 0; targetY--) {
                    const targetNum = this.numbers.get(targetY, col);
                    if ((targetNum !== null && targetNum !== num) ||
                        this.tateWall.get(targetY, col) !== WallState.NO_WALL ||
                        this.masu.get(targetY, col) !== CellState.WHITE) {
                        break;
                    }
                    upWhiteCnt++;
                }
                let rightWhiteCnt = 0;
                for (let targetX = col + 1; targetX < this.width; targetX++) {
                    const targetNum = this.numbers.get(row, targetX);
                    if ((targetNum !== null && targetNum !== num) ||
                        this.yokoWall.get(row, targetX - 1) !== WallState.NO_WALL ||
                        this.masu.get(row, targetX) !== CellState.WHITE) {
                        break;
                    }
                    rightWhiteCnt++;
                }
                let downWhiteCnt = 0;
                for (let targetY = row + 1; targetY < this.height; targetY++) {
                    const targetNum = this.numbers.get(targetY, col);
                    if ((targetNum !== null && targetNum !== num) ||
                        this.tateWall.get(targetY - 1, col) !== WallState.NO_WALL ||
                        this.masu.get(targetY, col) !== CellState.WHITE) {
                        break;
                    }
                    downWhiteCnt++;
                }
                let leftWhiteCnt = 0;
                for (let targetX = col - 1; targetX >= 0; targetX--) {
                    const targetNum = this.numbers.get(row, targetX);
                    if ((targetNum !== null && targetNum !== num) ||
                        this.yokoWall.get(row, targetX) !== WallState.NO_WALL ||
                        this.masu.get(row, targetX) !== CellState.WHITE) {
                        break;
                    }
                    leftWhiteCnt++;
                }
                const verticalWhiteCnt = 1 + upWhiteCnt + downWhiteCnt;
                const horizontalWhiteCnt = 1 + rightWhiteCnt + leftWhiteCnt;
                if (verticalWhiteCnt > num || horizontalWhiteCnt > num) {
                    return false;
                }
                // If white line is complete, need to place lead (black cell) in one direction
                if (verticalWhiteCnt === num || horizontalWhiteCnt === num) {
                    let canUp = false, canRight = false, canDown = false, canLeft = false;
                    const targetYUp = row - upWhiteCnt - 1;
                    const targetYDown = row + downWhiteCnt + 1;
                    const targetXRight = col + rightWhiteCnt + 1;
                    const targetXLeft = col - leftWhiteCnt - 1;
                    if (verticalWhiteCnt === num) {
                        canUp = targetYUp >= 0 &&
                            this.numbers.get(targetYUp, col) === null &&
                            this.tateWall.get(targetYUp, col) !== WallState.WALL &&
                            this.masu.get(targetYUp, col) !== CellState.WHITE &&
                            (targetYDown >= this.height || this.tateWall.get(targetYDown - 1, col) !== WallState.NO_WALL) &&
                            (targetXLeft < 0 || this.yokoWall.get(row, targetXLeft) !== WallState.NO_WALL) &&
                            (targetXRight >= this.width || this.yokoWall.get(row, targetXRight - 1) !== WallState.NO_WALL);
                        canDown = targetYDown < this.height &&
                            this.numbers.get(targetYDown, col) === null &&
                            this.tateWall.get(targetYDown - 1, col) !== WallState.WALL &&
                            this.masu.get(targetYDown, col) !== CellState.WHITE &&
                            (targetYUp < 0 || this.tateWall.get(targetYUp, col) !== WallState.NO_WALL) &&
                            (targetXLeft < 0 || this.yokoWall.get(row, targetXLeft) !== WallState.NO_WALL) &&
                            (targetXRight >= this.width || this.yokoWall.get(row, targetXRight - 1) !== WallState.NO_WALL);
                    }
                    if (horizontalWhiteCnt === num) {
                        canRight = targetXRight < this.width &&
                            this.numbers.get(row, targetXRight) === null &&
                            this.yokoWall.get(row, targetXRight - 1) !== WallState.WALL &&
                            this.masu.get(row, targetXRight) !== CellState.WHITE &&
                            (targetXLeft < 0 || this.yokoWall.get(row, targetXLeft) !== WallState.NO_WALL) &&
                            (targetYDown >= this.height || this.tateWall.get(targetYDown - 1, col) !== WallState.NO_WALL) &&
                            (targetYUp < 0 || this.tateWall.get(targetYUp, col) !== WallState.NO_WALL);
                        canLeft = targetXLeft >= 0 &&
                            this.numbers.get(row, targetXLeft) === null &&
                            this.yokoWall.get(row, targetXLeft) !== WallState.WALL &&
                            this.masu.get(row, targetXLeft) !== CellState.WHITE &&
                            (targetXRight >= this.width || this.yokoWall.get(row, targetXRight - 1) !== WallState.NO_WALL) &&
                            (targetYDown >= this.height || this.tateWall.get(targetYDown - 1, col) !== WallState.NO_WALL) &&
                            (targetYUp < 0 || this.tateWall.get(targetYUp, col) !== WallState.NO_WALL);
                    }
                    if (!canUp && !canRight && !canDown && !canLeft) {
                        return false;
                    }
                    // If only one direction possible, place lead there
                    if (canUp && !canRight && !canDown && !canLeft) {
                        this.tateWall.set(targetYUp, col, WallState.NO_WALL);
                        this.masu.set(targetYUp, col, CellState.BLACK);
                    }
                    if (!canUp && canRight && !canDown && !canLeft) {
                        this.yokoWall.set(row, targetXRight - 1, WallState.NO_WALL);
                        this.masu.set(row, targetXRight, CellState.BLACK);
                    }
                    if (!canUp && !canRight && canDown && !canLeft) {
                        this.tateWall.set(targetYDown - 1, col, WallState.NO_WALL);
                        this.masu.set(targetYDown, col, CellState.BLACK);
                    }
                    if (!canUp && !canRight && !canDown && canLeft) {
                        this.yokoWall.set(row, targetXLeft, WallState.NO_WALL);
                        this.masu.set(row, targetXLeft, CellState.BLACK);
                    }
                }
            }
        }
        return true;
    }
    /**
     * Room constraint:
     * - Room size must be odd (3+) or exactly number * 2 + 1
     * - Black cells = white cells + 1
     * - Cannot alternate white/black multiple times
     */
    roomSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const pivot = { row, col };
                // Check potential room size (no confirmed walls)
                const continueNotBlackPosSet = new Set();
                continueNotBlackPosSet.add(posKey(pivot));
                this.checkAndSetContinuePosSet(pivot, continueNotBlackPosSet, null);
                const minSize = this.numbers.get(row, col) === null ? 3 : this.numbers.get(row, col) * 2 + 1;
                if (continueNotBlackPosSet.size < minSize) {
                    return false;
                }
                // Check confirmed room (with NO_WALL only)
                const continueWhitePosSet = new Set();
                continueWhitePosSet.add(posKey(pivot));
                const maxSize = this.numbers.get(row, col) === null ? Number.MAX_SAFE_INTEGER : this.numbers.get(row, col) * 2 + 1;
                if (!this.checkAndSetContinueWhitePosSet(pivot, continueWhitePosSet, null, maxSize, this.masu.get(row, col) === CellState.WHITE, this.masu.get(row, col) === CellState.BLACK)) {
                    return false;
                }
                // If room is complete, check constraints
                if (continueNotBlackPosSet.size === continueWhitePosSet.size ||
                    (this.numbers.get(row, col) !== null && this.numbers.get(row, col) * 2 + 1 === continueWhitePosSet.size)) {
                    if (continueWhitePosSet.size % 2 === 0) {
                        return false; // Room size must be odd
                    }
                    // Count black, white, and unknown cells
                    let whiteCnt = 0, blackCnt = 0, spaceCnt = 0;
                    for (const posStr of continueWhitePosSet) {
                        const [r, c] = posStr.split(',').map(Number);
                        const state = this.masu.get(r, c);
                        if (state === CellState.WHITE)
                            whiteCnt++;
                        else if (state === CellState.BLACK)
                            blackCnt++;
                        else if (state === CellState.UNKNOWN)
                            spaceCnt++;
                        // Seal room with walls
                        if (r !== 0 && !continueWhitePosSet.has(posKey({ row: r - 1, col: c }))) {
                            this.tateWall.set(r - 1, c, WallState.WALL);
                        }
                        if (c !== this.width - 1 && !continueWhitePosSet.has(posKey({ row: r, col: c + 1 }))) {
                            this.yokoWall.set(r, c, WallState.WALL);
                        }
                        if (r !== this.height - 1 && !continueWhitePosSet.has(posKey({ row: r + 1, col: c }))) {
                            this.tateWall.set(r, c, WallState.WALL);
                        }
                        if (c !== 0 && !continueWhitePosSet.has(posKey({ row: r, col: c - 1 }))) {
                            this.yokoWall.set(r, c - 1, WallState.WALL);
                        }
                    }
                    // Check black = white + 1
                    if (whiteCnt + 1 > blackCnt + spaceCnt) {
                        return false;
                    }
                    else if (blackCnt > whiteCnt + 1 + spaceCnt) {
                        return false;
                    }
                    else if (whiteCnt + 1 === blackCnt + spaceCnt) {
                        // All unknowns must be black
                        for (const posStr of continueWhitePosSet) {
                            const [r, c] = posStr.split(',').map(Number);
                            if (this.masu.get(r, c) === CellState.UNKNOWN) {
                                this.masu.set(r, c, CellState.BLACK);
                            }
                        }
                    }
                    else if (blackCnt === whiteCnt + 1 + spaceCnt) {
                        // All unknowns must be white
                        for (const posStr of continueWhitePosSet) {
                            const [r, c] = posStr.split(',').map(Number);
                            if (this.masu.get(r, c) === CellState.UNKNOWN) {
                                this.masu.set(r, c, CellState.WHITE);
                            }
                        }
                    }
                }
            }
        }
        return true;
    }
    /**
     * Collect positions connected by NO_WALL, checking for alternation
     */
    checkAndSetContinueWhitePosSet(pos, continuePosSet, from, size, findWhite, findBlack) {
        if (continuePosSet.size > size) {
            return false;
        }
        const directions = [];
        if (pos.row !== 0 && from !== Direction.UP) {
            directions.push({ dir: Direction.DOWN, nextPos: { row: pos.row - 1, col: pos.col } });
        }
        if (pos.col !== this.width - 1 && from !== Direction.RIGHT) {
            directions.push({ dir: Direction.LEFT, nextPos: { row: pos.row, col: pos.col + 1 } });
        }
        if (pos.row !== this.height - 1 && from !== Direction.DOWN) {
            directions.push({ dir: Direction.UP, nextPos: { row: pos.row + 1, col: pos.col } });
        }
        if (pos.col !== 0 && from !== Direction.LEFT) {
            directions.push({ dir: Direction.RIGHT, nextPos: { row: pos.row, col: pos.col - 1 } });
        }
        for (const { dir, nextPos } of directions) {
            const key = posKey(nextPos);
            if (continuePosSet.has(key))
                continue;
            let wallState;
            if (dir === Direction.DOWN)
                wallState = this.tateWall.get(pos.row - 1, pos.col);
            else if (dir === Direction.LEFT)
                wallState = this.yokoWall.get(pos.row, pos.col);
            else if (dir === Direction.UP)
                wallState = this.tateWall.get(pos.row, pos.col);
            else
                wallState = this.yokoWall.get(pos.row, pos.col - 1);
            if (wallState === WallState.NO_WALL) {
                // Check for alternation
                const currentState = this.masu.get(pos.row, pos.col);
                const nextState = this.masu.get(nextPos.row, nextPos.col);
                if (findWhite && currentState === CellState.BLACK && nextState === CellState.WHITE) {
                    return false;
                }
                if (findBlack && currentState === CellState.WHITE && nextState === CellState.BLACK) {
                    return false;
                }
                continuePosSet.add(key);
                if (!this.checkAndSetContinueWhitePosSet(nextPos, continuePosSet, dir, size, findWhite || nextState === CellState.WHITE, findBlack || nextState === CellState.BLACK)) {
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * Collect positions not separated by confirmed walls
     */
    checkAndSetContinuePosSet(pos, continuePosSet, from) {
        const directions = [];
        if (pos.row !== 0 && from !== Direction.UP) {
            directions.push({ dir: Direction.DOWN, nextPos: { row: pos.row - 1, col: pos.col } });
        }
        if (pos.col !== this.width - 1 && from !== Direction.RIGHT) {
            directions.push({ dir: Direction.LEFT, nextPos: { row: pos.row, col: pos.col + 1 } });
        }
        if (pos.row !== this.height - 1 && from !== Direction.DOWN) {
            directions.push({ dir: Direction.UP, nextPos: { row: pos.row + 1, col: pos.col } });
        }
        if (pos.col !== 0 && from !== Direction.LEFT) {
            directions.push({ dir: Direction.RIGHT, nextPos: { row: pos.row, col: pos.col - 1 } });
        }
        for (const { dir, nextPos } of directions) {
            const key = posKey(nextPos);
            if (continuePosSet.has(key))
                continue;
            let wallState;
            if (dir === Direction.DOWN)
                wallState = this.tateWall.get(pos.row - 1, pos.col);
            else if (dir === Direction.LEFT)
                wallState = this.yokoWall.get(pos.row, pos.col);
            else if (dir === Direction.UP)
                wallState = this.tateWall.get(pos.row, pos.col);
            else
                wallState = this.yokoWall.get(pos.row, pos.col - 1);
            if (wallState !== WallState.WALL) {
                continuePosSet.add(key);
                this.checkAndSetContinuePosSet(nextPos, continuePosSet, dir);
            }
        }
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new PencilsField(this.height, this.width);
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                cloned.masu.set(row, col, this.masu.get(row, col));
                cloned.numbers.set(row, col, this.numbers.get(row, col));
            }
        }
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                cloned.yokoWall.set(row, col, this.yokoWall.get(row, col));
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                cloned.tateWall.set(row, col, this.tateWall.get(row, col));
            }
        }
        cloned.fixedLeadPos = new Set(this.fixedLeadPos);
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                dump += this.masu.get(row, col);
            }
        }
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
        // All cells must be determined
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.masu.get(row, col) === CellState.UNKNOWN) {
                    return false;
                }
            }
        }
        // All horizontal walls must be determined
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoWall.get(row, col) === WallState.UNKNOWN) {
                    return false;
                }
            }
        }
        // All vertical walls must be determined
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateWall.get(row, col) === WallState.UNKNOWN) {
                    return false;
                }
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        const str = this.getStateDump();
        if (!this.lengthSolve())
            return false;
        if (!this.roomSolve())
            return false;
        if (!this.wallSolve())
            return false;
        // Repeat if changes were made
        if (this.getStateDump() !== str) {
            return this.solveAndCheck();
        }
        return true;
    }
    toString() {
        const lines = [];
        const HALF_NUMS = '0123456789';
        const FULL_NUMS = '０１２３４５６７８９';
        // Top border
        lines.push('□'.repeat(this.width * 2 + 1));
        for (let row = 0; row < this.height; row++) {
            let line = '□';
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num !== null) {
                    const numStr = String(num);
                    const index = HALF_NUMS.indexOf(numStr);
                    if (index === 0 && num === -1) {
                        line += '・';
                    }
                    else if (index >= 0 && index < FULL_NUMS.length) {
                        line += FULL_NUMS[index];
                    }
                    else {
                        line += numStr;
                    }
                }
                else {
                    const state = this.masu.get(row, col);
                    if (state === CellState.BLACK)
                        line += '■';
                    else if (state === CellState.WHITE)
                        line += '  ';
                    else
                        line += '・';
                }
                if (col !== this.width - 1) {
                    const wall = this.yokoWall.get(row, col);
                    if (wall === WallState.WALL)
                        line += '｜';
                    else if (wall === WallState.NO_WALL)
                        line += ' ';
                    else
                        line += '・';
                }
            }
            line += '□';
            lines.push(line);
            if (row !== this.height - 1) {
                let wallLine = '□';
                for (let col = 0; col < this.width; col++) {
                    const wall = this.tateWall.get(row, col);
                    if (wall === WallState.WALL)
                        wallLine += '━';
                    else if (wall === WallState.NO_WALL)
                        wallLine += ' ';
                    else
                        wallLine += '・';
                    if (col !== this.width - 1) {
                        wallLine += '□';
                    }
                }
                wallLine += '□';
                lines.push(wallLine);
            }
        }
        // Bottom border
        lines.push('□'.repeat(this.width * 2 + 1));
        return lines.join('\n');
    }
}
// ============================================
// Pencils Solver
// ============================================
export class PencilsSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzv.jp URL format */
    static fromString(height, width, param) {
        const field = new PencilsField(height, width);
        const ALPHABET_FROM_K = 'klmnopqrstuvwxyz';
        let index = 0;
        for (let i = 0; i < param.length; i++) {
            const ch = param.charAt(i);
            const interval = ALPHABET_FROM_K.indexOf(ch);
            if (interval !== -1) {
                // Letter indicates skip
                index = index + interval + 1;
            }
            else {
                const row = Math.floor(index / width);
                const col = index % width;
                if (ch === '.') {
                    // White cell with -1 capacity
                    field.setMasu(row, col, CellState.WHITE);
                    field.setNumber(row, col, -1);
                }
                else if (ch === 'g' || ch === 'h' || ch === 'i' || ch === 'j') {
                    // Fixed lead position (direction hint)
                    const dirNum = ch.charCodeAt(0) - 'g'.charCodeAt(0); // 0=UP, 1=RIGHT, 2=DOWN, 3=LEFT
                    const directions = [Direction.UP, Direction.RIGHT, Direction.DOWN, Direction.LEFT];
                    const lead = directions[dirNum];
                    field.setMasu(row, col, CellState.BLACK);
                    // Set opposite direction white and no-wall
                    if (lead === Direction.UP) {
                        field.setTateWall(row, col, WallState.NO_WALL);
                        field.setMasu(row + 1, col, CellState.WHITE);
                    }
                    else if (lead === Direction.RIGHT) {
                        field.setYokoWall(row, col - 1, WallState.NO_WALL);
                        field.setMasu(row, col - 1, CellState.WHITE);
                    }
                    else if (lead === Direction.DOWN) {
                        field.setTateWall(row - 1, col, WallState.NO_WALL);
                        field.setMasu(row - 1, col, CellState.WHITE);
                    }
                    else if (lead === Direction.LEFT) {
                        field.setYokoWall(row, col, WallState.NO_WALL);
                        field.setMasu(row, col + 1, CellState.WHITE);
                    }
                }
                else {
                    // Number clue
                    let capacity;
                    if (ch === '-') {
                        // 16-255: '-' followed by 2 hex digits
                        capacity = parseInt(param.charAt(i + 1) + param.charAt(i + 2), 16);
                        i += 2;
                    }
                    else if (ch === '+') {
                        // 256-999: '+' followed by 3 hex digits
                        capacity = parseInt(param.charAt(i + 1) + param.charAt(i + 2) + param.charAt(i + 3), 16);
                        i += 3;
                    }
                    else {
                        // Single hex digit (0-15)
                        capacity = parseInt(ch, 16);
                    }
                    field.setMasu(row, col, CellState.WHITE);
                    field.setNumber(row, col, capacity);
                }
                index++;
            }
        }
        return new PencilsSolver(field);
    }
    getBranchCandidates(state) {
        // Try branching on horizontal walls first
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width - 1; col++) {
                if (state.getYokoWall(row, col) === WallState.UNKNOWN) {
                    return [
                        {
                            apply: (s) => {
                                const cloned = s.clone();
                                cloned.setYokoWall(row, col, WallState.WALL);
                                return cloned;
                            },
                            description: `YokoWall[${row},${col}] = WALL`,
                        },
                        {
                            apply: (s) => {
                                const cloned = s.clone();
                                cloned.setYokoWall(row, col, WallState.NO_WALL);
                                return cloned;
                            },
                            description: `YokoWall[${row},${col}] = NO_WALL`,
                        },
                    ];
                }
            }
        }
        // Try branching on vertical walls
        for (let row = 0; row < state.height - 1; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.getTateWall(row, col) === WallState.UNKNOWN) {
                    return [
                        {
                            apply: (s) => {
                                const cloned = s.clone();
                                cloned.setTateWall(row, col, WallState.WALL);
                                return cloned;
                            },
                            description: `TateWall[${row},${col}] = WALL`,
                        },
                        {
                            apply: (s) => {
                                const cloned = s.clone();
                                cloned.setTateWall(row, col, WallState.NO_WALL);
                                return cloned;
                            },
                            description: `TateWall[${row},${col}] = NO_WALL`,
                        },
                    ];
                }
            }
        }
        // Try branching on cell states
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.getMasu(row, col) === CellState.UNKNOWN) {
                    return [
                        {
                            apply: (s) => {
                                const cloned = s.clone();
                                cloned.setMasu(row, col, CellState.BLACK);
                                return cloned;
                            },
                            description: `Masu[${row},${col}] = BLACK`,
                        },
                        {
                            apply: (s) => {
                                const cloned = s.clone();
                                cloned.setMasu(row, col, CellState.WHITE);
                                return cloned;
                            },
                            description: `Masu[${row},${col}] = WHITE`,
                        },
                    ];
                }
            }
        }
        return [];
    }
}
//# sourceMappingURL=pencils.js.map