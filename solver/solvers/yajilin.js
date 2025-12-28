/**
 * Yajilin Solver
 *
 * Complete implementation based on SDVX's YajilinSolver.java
 *
 * Rules:
 * 1. Draw a single closed loop through the grid
 * 2. Black cells cannot be adjacent horizontally or vertically
 * 3. Arrow clues indicate the number of black cells in that direction
 * 4. The loop passes through all non-black, non-clue cells exactly once
 * 5. Each loop cell has exactly 2 edges (the loop enters and exits)
 */
import { CellState, Direction, posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
import { LoopEdgeState } from './simpleloop.js';
// ============================================
// Arrow Candidate Solver (from SDVX ArrowSolver)
// ============================================
const CANDMAX = 100;
/**
 * Generate all valid black cell placement candidates for an arrow
 */
function generateArrowCandidates(height, width, arrowRow, arrowCol, arrow) {
    const result = [];
    function solve(sb, nowRow, nowCol, nowBlack) {
        if (result.length >= CANDMAX)
            return;
        if (arrow.count === nowBlack) {
            // Fill remaining with white (NOT_BLACK = '・')
            let newSb = sb;
            if (arrow.direction === Direction.UP) {
                for (let y = nowRow - 1; y >= 0; y--) {
                    newSb += '・';
                }
            }
            else if (arrow.direction === Direction.RIGHT) {
                for (let x = nowCol + 1; x < width; x++) {
                    newSb += '・';
                }
            }
            else if (arrow.direction === Direction.DOWN) {
                for (let y = nowRow + 1; y < height; y++) {
                    newSb += '・';
                }
            }
            else if (arrow.direction === Direction.LEFT) {
                for (let x = nowCol - 1; x >= 0; x--) {
                    newSb += '・';
                }
            }
            result.push(newSb);
            return;
        }
        // Try placing black and white cells
        if (arrow.direction === Direction.UP) {
            if (nowRow === 0)
                return;
            if (nowRow !== 1) {
                // BLACK then NOT_BLACK (can't have adjacent blacks)
                solve(sb + '■・', nowRow - 2, nowCol, nowBlack + 1);
            }
            else {
                solve(sb + '■', nowRow - 1, nowCol, nowBlack + 1);
            }
            // NOT_BLACK
            solve(sb + '・', nowRow - 1, nowCol, nowBlack);
        }
        else if (arrow.direction === Direction.RIGHT) {
            if (nowCol === width - 1)
                return;
            if (nowCol !== width - 2) {
                solve(sb + '■・', nowRow, nowCol + 2, nowBlack + 1);
            }
            else {
                solve(sb + '■', nowRow, nowCol + 1, nowBlack + 1);
            }
            solve(sb + '・', nowRow, nowCol + 1, nowBlack);
        }
        else if (arrow.direction === Direction.DOWN) {
            if (nowRow === height - 1)
                return;
            if (nowRow !== height - 2) {
                solve(sb + '■・', nowRow + 2, nowCol, nowBlack + 1);
            }
            else {
                solve(sb + '■', nowRow + 1, nowCol, nowBlack + 1);
            }
            solve(sb + '・', nowRow + 1, nowCol, nowBlack);
        }
        else if (arrow.direction === Direction.LEFT) {
            if (nowCol === 0)
                return;
            if (nowCol !== 1) {
                solve(sb + '■・', nowRow, nowCol - 2, nowBlack + 1);
            }
            else {
                solve(sb + '■', nowRow, nowCol - 1, nowBlack + 1);
            }
            solve(sb + '・', nowRow, nowCol - 1, nowBlack);
        }
    }
    solve('', arrowRow, arrowCol, 0);
    return result.length >= CANDMAX ? null : result;
}
// ============================================
// Yajilin Field State
// ============================================
export class YajilinField {
    height;
    width;
    cells;
    arrows;
    yokoEdge; // Horizontal edges (between col and col+1)
    tateEdge; // Vertical edges (between row and row+1)
    arrowsInfo; // Arrow candidates
    outsideMode;
    constructor(height, width, outsideMode = false) {
        this.height = height;
        this.width = width;
        this.outsideMode = outsideMode;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.arrows = new Grid(height, width, () => null);
        this.yokoEdge = new Grid(height, width - 1, () => LoopEdgeState.UNKNOWN);
        this.tateEdge = new Grid(height - 1, width, () => LoopEdgeState.UNKNOWN);
        this.arrowsInfo = new Map();
    }
    /** Set an arrow clue at position */
    setArrow(row, col, direction, count) {
        const arrow = { direction, count };
        this.arrows.set(row, col, arrow);
        this.cells.set(row, col, CellState.WHITE); // Arrow cells are white (not part of loop)
        // Close all edges around arrow
        if (row > 0)
            this.setTateEdge(row - 1, col, LoopEdgeState.WALL);
        if (row < this.height - 1)
            this.setTateEdge(row, col, LoopEdgeState.WALL);
        if (col > 0)
            this.setYokoEdge(row, col - 1, LoopEdgeState.WALL);
        if (col < this.width - 1)
            this.setYokoEdge(row, col, LoopEdgeState.WALL);
        // Generate arrow candidates
        if (count !== -1) {
            const key = posKey({ row, col });
            this.arrowsInfo.set(key, generateArrowCandidates(this.height, this.width, row, col, arrow));
        }
    }
    getArrow(row, col) {
        return this.arrows.get(row, col);
    }
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    setCell(row, col, state) {
        this.cells.set(row, col, state);
    }
    getYokoEdge(row, col) {
        if (col < 0 || col >= this.width - 1)
            return LoopEdgeState.WALL;
        return this.yokoEdge.get(row, col);
    }
    getTateEdge(row, col) {
        if (row < 0 || row >= this.height - 1)
            return LoopEdgeState.WALL;
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
    // ========== Arrow constraint solving (SDVX arrowSolve) ==========
    arrowSolve() {
        for (let yIndex = 0; yIndex < this.height; yIndex++) {
            for (let xIndex = 0; xIndex < this.width; xIndex++) {
                const arrow = this.arrows.get(yIndex, xIndex);
                if (!arrow || arrow.count === -1)
                    continue;
                const key = posKey({ row: yIndex, col: xIndex });
                const candList = this.arrowsInfo.get(key);
                if (candList !== null && candList !== undefined) {
                    // Filter candidates based on current cell states
                    const filteredList = candList.filter(state => {
                        for (let idx = 0; idx < state.length; idx++) {
                            let pos;
                            if (arrow.direction === Direction.UP) {
                                pos = { row: yIndex - 1 - idx, col: xIndex };
                            }
                            else if (arrow.direction === Direction.RIGHT) {
                                pos = { row: yIndex, col: xIndex + 1 + idx };
                            }
                            else if (arrow.direction === Direction.DOWN) {
                                pos = { row: yIndex + 1 + idx, col: xIndex };
                            }
                            else {
                                pos = { row: yIndex, col: xIndex - 1 - idx };
                            }
                            const currentCell = this.cells.get(pos.row, pos.col);
                            const candChar = state.charAt(idx);
                            // Contradiction: current BLACK but candidate is white, or vice versa
                            if ((currentCell === CellState.BLACK && candChar === '・') ||
                                (currentCell === CellState.WHITE && candChar === '■')) {
                                return false;
                            }
                        }
                        return true;
                    });
                    this.arrowsInfo.set(key, filteredList);
                    if (filteredList.length === 0) {
                        return false;
                    }
                    // Find common states across all candidates
                    const fixState = filteredList[0].split('');
                    for (const cand of filteredList) {
                        for (let idx = 0; idx < fixState.length; idx++) {
                            const a = fixState[idx];
                            const b = cand.charAt(idx);
                            if ((a === '■' && b === '・') || (a === '・' && b === '■')) {
                                fixState[idx] = ' '; // Undetermined
                            }
                        }
                    }
                    // Apply fixed states
                    for (let idx = 0; idx < fixState.length; idx++) {
                        let pos;
                        if (arrow.direction === Direction.UP) {
                            pos = { row: yIndex - 1 - idx, col: xIndex };
                        }
                        else if (arrow.direction === Direction.RIGHT) {
                            pos = { row: yIndex, col: xIndex + 1 + idx };
                        }
                        else if (arrow.direction === Direction.DOWN) {
                            pos = { row: yIndex + 1 + idx, col: xIndex };
                        }
                        else {
                            pos = { row: yIndex, col: xIndex - 1 - idx };
                        }
                        if (fixState[idx] === '■') {
                            this.cells.set(pos.row, pos.col, CellState.BLACK);
                        }
                        else if (fixState[idx] === '・') {
                            this.cells.set(pos.row, pos.col, CellState.WHITE);
                        }
                    }
                }
                else {
                    // No candidate list - use simple counting
                    let blackCnt = 0;
                    let spaceCnt = 0;
                    let nextCanSpace = true;
                    let r = yIndex, c = xIndex;
                    while (true) {
                        if (arrow.direction === Direction.UP)
                            r--;
                        else if (arrow.direction === Direction.RIGHT)
                            c++;
                        else if (arrow.direction === Direction.DOWN)
                            r++;
                        else
                            c--;
                        if (r < 0 || r >= this.height || c < 0 || c >= this.width)
                            break;
                        const cell = this.cells.get(r, c);
                        if (cell === CellState.BLACK) {
                            blackCnt++;
                            if (arrow.count < blackCnt)
                                return false;
                            nextCanSpace = false;
                        }
                        else if (cell === CellState.UNKNOWN) {
                            if (nextCanSpace) {
                                spaceCnt++;
                                nextCanSpace = false;
                            }
                            else {
                                nextCanSpace = true;
                            }
                        }
                        else {
                            nextCanSpace = true;
                        }
                    }
                    if (arrow.count > blackCnt + spaceCnt)
                        return false;
                }
            }
        }
        return true;
    }
    // ========== Black cell / Edge constraint (SDVX nextSolve) ==========
    nextSolve() {
        for (let yIndex = 0; yIndex < this.height; yIndex++) {
            for (let xIndex = 0; xIndex < this.width; xIndex++) {
                if (this.arrows.get(yIndex, xIndex) !== null)
                    continue;
                const cell = this.cells.get(yIndex, xIndex);
                if (cell === CellState.BLACK) {
                    // Close all edges around black cell and check adjacency
                    let masuUp, masuRight, masuDown, masuLeft;
                    if (yIndex !== 0) {
                        if (this.getTateEdge(yIndex - 1, xIndex) === LoopEdgeState.LINE)
                            return false;
                        this.setTateEdge(yIndex - 1, xIndex, LoopEdgeState.WALL);
                        masuUp = this.cells.get(yIndex - 1, xIndex);
                    }
                    else {
                        masuUp = CellState.WHITE;
                    }
                    if (xIndex !== this.width - 1) {
                        if (this.getYokoEdge(yIndex, xIndex) === LoopEdgeState.LINE)
                            return false;
                        this.setYokoEdge(yIndex, xIndex, LoopEdgeState.WALL);
                        masuRight = this.cells.get(yIndex, xIndex + 1);
                    }
                    else {
                        masuRight = CellState.WHITE;
                    }
                    if (yIndex !== this.height - 1) {
                        if (this.getTateEdge(yIndex, xIndex) === LoopEdgeState.LINE)
                            return false;
                        this.setTateEdge(yIndex, xIndex, LoopEdgeState.WALL);
                        masuDown = this.cells.get(yIndex + 1, xIndex);
                    }
                    else {
                        masuDown = CellState.WHITE;
                    }
                    if (xIndex !== 0) {
                        if (this.getYokoEdge(yIndex, xIndex - 1) === LoopEdgeState.LINE)
                            return false;
                        this.setYokoEdge(yIndex, xIndex - 1, LoopEdgeState.WALL);
                        masuLeft = this.cells.get(yIndex, xIndex - 1);
                    }
                    else {
                        masuLeft = CellState.WHITE;
                    }
                    // Adjacent black cells are forbidden
                    if (masuUp === CellState.BLACK || masuRight === CellState.BLACK ||
                        masuDown === CellState.BLACK || masuLeft === CellState.BLACK) {
                        return false;
                    }
                    // Adjacent cells must be white
                    if (yIndex > 0 && masuUp === CellState.UNKNOWN) {
                        this.cells.set(yIndex - 1, xIndex, CellState.WHITE);
                    }
                    if (xIndex < this.width - 1 && masuRight === CellState.UNKNOWN) {
                        this.cells.set(yIndex, xIndex + 1, CellState.WHITE);
                    }
                    if (yIndex < this.height - 1 && masuDown === CellState.UNKNOWN) {
                        this.cells.set(yIndex + 1, xIndex, CellState.WHITE);
                    }
                    if (xIndex > 0 && masuLeft === CellState.UNKNOWN) {
                        this.cells.set(yIndex, xIndex - 1, CellState.WHITE);
                    }
                }
                else {
                    // Non-black cell: check edge constraints
                    let existsCount = 0;
                    let notExistsCount = 0;
                    const wallUp = yIndex === 0 ? LoopEdgeState.WALL : this.getTateEdge(yIndex - 1, xIndex);
                    if (wallUp === LoopEdgeState.WALL) {
                        existsCount++;
                    }
                    else if (wallUp === LoopEdgeState.LINE) {
                        if (yIndex > 0 && this.cells.get(yIndex - 1, xIndex) === CellState.BLACK)
                            return false;
                        if (yIndex > 0)
                            this.cells.set(yIndex - 1, xIndex, CellState.WHITE);
                        notExistsCount++;
                    }
                    const wallRight = xIndex === this.width - 1 ? LoopEdgeState.WALL : this.getYokoEdge(yIndex, xIndex);
                    if (wallRight === LoopEdgeState.WALL) {
                        existsCount++;
                    }
                    else if (wallRight === LoopEdgeState.LINE) {
                        if (xIndex < this.width - 1 && this.cells.get(yIndex, xIndex + 1) === CellState.BLACK)
                            return false;
                        if (xIndex < this.width - 1)
                            this.cells.set(yIndex, xIndex + 1, CellState.WHITE);
                        notExistsCount++;
                    }
                    const wallDown = yIndex === this.height - 1 ? LoopEdgeState.WALL : this.getTateEdge(yIndex, xIndex);
                    if (wallDown === LoopEdgeState.WALL) {
                        existsCount++;
                    }
                    else if (wallDown === LoopEdgeState.LINE) {
                        if (yIndex < this.height - 1 && this.cells.get(yIndex + 1, xIndex) === CellState.BLACK)
                            return false;
                        if (yIndex < this.height - 1)
                            this.cells.set(yIndex + 1, xIndex, CellState.WHITE);
                        notExistsCount++;
                    }
                    const wallLeft = xIndex === 0 ? LoopEdgeState.WALL : this.getYokoEdge(yIndex, xIndex - 1);
                    if (wallLeft === LoopEdgeState.WALL) {
                        existsCount++;
                    }
                    else if (wallLeft === LoopEdgeState.LINE) {
                        if (xIndex > 0 && this.cells.get(yIndex, xIndex - 1) === CellState.BLACK)
                            return false;
                        if (xIndex > 0)
                            this.cells.set(yIndex, xIndex - 1, CellState.WHITE);
                        notExistsCount++;
                    }
                    if (cell === CellState.WHITE) {
                        // White cell (loop cell): exactly 2 lines
                        if (existsCount > 2 || notExistsCount > 2)
                            return false;
                        if (notExistsCount === 2) {
                            // Close remaining edges
                            if (wallUp === LoopEdgeState.UNKNOWN && yIndex > 0) {
                                this.setTateEdge(yIndex - 1, xIndex, LoopEdgeState.WALL);
                            }
                            if (wallRight === LoopEdgeState.UNKNOWN && xIndex < this.width - 1) {
                                this.setYokoEdge(yIndex, xIndex, LoopEdgeState.WALL);
                            }
                            if (wallDown === LoopEdgeState.UNKNOWN && yIndex < this.height - 1) {
                                this.setTateEdge(yIndex, xIndex, LoopEdgeState.WALL);
                            }
                            if (wallLeft === LoopEdgeState.UNKNOWN && xIndex > 0) {
                                this.setYokoEdge(yIndex, xIndex - 1, LoopEdgeState.WALL);
                            }
                        }
                        else if (existsCount === 2) {
                            // Open remaining edges
                            if (wallUp === LoopEdgeState.UNKNOWN && yIndex > 0) {
                                if (this.cells.get(yIndex - 1, xIndex) === CellState.BLACK)
                                    return false;
                                this.setTateEdge(yIndex - 1, xIndex, LoopEdgeState.LINE);
                                this.cells.set(yIndex - 1, xIndex, CellState.WHITE);
                            }
                            if (wallRight === LoopEdgeState.UNKNOWN && xIndex < this.width - 1) {
                                if (this.cells.get(yIndex, xIndex + 1) === CellState.BLACK)
                                    return false;
                                this.setYokoEdge(yIndex, xIndex, LoopEdgeState.LINE);
                                this.cells.set(yIndex, xIndex + 1, CellState.WHITE);
                            }
                            if (wallDown === LoopEdgeState.UNKNOWN && yIndex < this.height - 1) {
                                if (this.cells.get(yIndex + 1, xIndex) === CellState.BLACK)
                                    return false;
                                this.setTateEdge(yIndex, xIndex, LoopEdgeState.LINE);
                                this.cells.set(yIndex + 1, xIndex, CellState.WHITE);
                            }
                            if (wallLeft === LoopEdgeState.UNKNOWN && xIndex > 0) {
                                if (this.cells.get(yIndex, xIndex - 1) === CellState.BLACK)
                                    return false;
                                this.setYokoEdge(yIndex, xIndex - 1, LoopEdgeState.LINE);
                                this.cells.set(yIndex, xIndex - 1, CellState.WHITE);
                            }
                        }
                    }
                    else if (cell === CellState.UNKNOWN) {
                        // Unknown cell: determine based on edges
                        if ((existsCount === 3 && notExistsCount === 1) || notExistsCount > 2) {
                            return false;
                        }
                        if (existsCount === 2) {
                            // Exit theory: cells opposite to walls must be white
                            if (wallUp !== LoopEdgeState.WALL && yIndex > 0) {
                                if (this.cells.get(yIndex - 1, xIndex) === CellState.BLACK)
                                    return false;
                                this.cells.set(yIndex - 1, xIndex, CellState.WHITE);
                            }
                            if (wallRight !== LoopEdgeState.WALL && xIndex < this.width - 1) {
                                if (this.cells.get(yIndex, xIndex + 1) === CellState.BLACK)
                                    return false;
                                this.cells.set(yIndex, xIndex + 1, CellState.WHITE);
                            }
                            if (wallDown !== LoopEdgeState.WALL && yIndex < this.height - 1) {
                                if (this.cells.get(yIndex + 1, xIndex) === CellState.BLACK)
                                    return false;
                                this.cells.set(yIndex + 1, xIndex, CellState.WHITE);
                            }
                            if (wallLeft !== LoopEdgeState.WALL && xIndex > 0) {
                                if (this.cells.get(yIndex, xIndex - 1) === CellState.BLACK)
                                    return false;
                                this.cells.set(yIndex, xIndex - 1, CellState.WHITE);
                            }
                        }
                        if (existsCount > 2) {
                            // More than 2 walls means this cell must be black
                            this.cells.set(yIndex, xIndex, CellState.BLACK);
                            if (wallUp === LoopEdgeState.UNKNOWN && yIndex > 0) {
                                this.setTateEdge(yIndex - 1, xIndex, LoopEdgeState.WALL);
                            }
                            if (wallRight === LoopEdgeState.UNKNOWN && xIndex < this.width - 1) {
                                this.setYokoEdge(yIndex, xIndex, LoopEdgeState.WALL);
                            }
                            if (wallDown === LoopEdgeState.UNKNOWN && yIndex < this.height - 1) {
                                this.setTateEdge(yIndex, xIndex, LoopEdgeState.WALL);
                            }
                            if (wallLeft === LoopEdgeState.UNKNOWN && xIndex > 0) {
                                this.setYokoEdge(yIndex, xIndex - 1, LoopEdgeState.WALL);
                            }
                        }
                        else if (notExistsCount !== 0) {
                            // Has some lines, must be white
                            this.cells.set(yIndex, xIndex, CellState.WHITE);
                            if (notExistsCount === 2) {
                                if (wallUp === LoopEdgeState.UNKNOWN && yIndex > 0) {
                                    this.setTateEdge(yIndex - 1, xIndex, LoopEdgeState.WALL);
                                }
                                if (wallRight === LoopEdgeState.UNKNOWN && xIndex < this.width - 1) {
                                    this.setYokoEdge(yIndex, xIndex, LoopEdgeState.WALL);
                                }
                                if (wallDown === LoopEdgeState.UNKNOWN && yIndex < this.height - 1) {
                                    this.setTateEdge(yIndex, xIndex, LoopEdgeState.WALL);
                                }
                                if (wallLeft === LoopEdgeState.UNKNOWN && xIndex > 0) {
                                    this.setYokoEdge(yIndex, xIndex - 1, LoopEdgeState.WALL);
                                }
                            }
                        }
                    }
                }
            }
        }
        return true;
    }
    // ========== Parity check (SDVX oddSolve) ==========
    oddSolve() {
        // Check horizontal lines (tateEdge) - each row crossing must have even lines
        for (let yIndex = 0; yIndex < this.height - 1; yIndex++) {
            let notExistsCount = 0;
            let hasUnknown = false;
            for (let xIndex = 0; xIndex < this.width; xIndex++) {
                const edge = this.tateEdge.get(yIndex, xIndex);
                if (edge === LoopEdgeState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                else if (edge === LoopEdgeState.LINE) {
                    notExistsCount++;
                }
            }
            if (!hasUnknown && notExistsCount % 2 !== 0)
                return false;
        }
        // Check vertical lines (yokoEdge) - each column crossing must have even lines
        for (let xIndex = 0; xIndex < this.width - 1; xIndex++) {
            let notExistsCount = 0;
            let hasUnknown = false;
            for (let yIndex = 0; yIndex < this.height; yIndex++) {
                const edge = this.yokoEdge.get(yIndex, xIndex);
                if (edge === LoopEdgeState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                else if (edge === LoopEdgeState.LINE) {
                    notExistsCount++;
                }
            }
            if (!hasUnknown && notExistsCount % 2 !== 0)
                return false;
        }
        return true;
    }
    // ========== Connectivity check (SDVX connectSolve) ==========
    connectSolve() {
        const whitePosSet = new Set();
        for (let yIndex = 0; yIndex < this.height; yIndex++) {
            for (let xIndex = 0; xIndex < this.width; xIndex++) {
                if (this.arrows.get(yIndex, xIndex) === null &&
                    this.cells.get(yIndex, xIndex) === CellState.WHITE) {
                    const pos = { row: yIndex, col: xIndex };
                    const key = posKey(pos);
                    if (whitePosSet.size === 0) {
                        whitePosSet.add(key);
                        this.collectConnected(pos, whitePosSet);
                    }
                    else {
                        if (!whitePosSet.has(key)) {
                            return false; // Found disconnected white cell
                        }
                    }
                }
            }
        }
        return true;
    }
    collectConnected(pos, visited) {
        const { row, col } = pos;
        // Up
        if (row > 0 && this.getTateEdge(row - 1, col) !== LoopEdgeState.WALL) {
            const next = { row: row - 1, col };
            const key = posKey(next);
            if (!visited.has(key)) {
                visited.add(key);
                this.collectConnected(next, visited);
            }
        }
        // Down
        if (row < this.height - 1 && this.getTateEdge(row, col) !== LoopEdgeState.WALL) {
            const next = { row: row + 1, col };
            const key = posKey(next);
            if (!visited.has(key)) {
                visited.add(key);
                this.collectConnected(next, visited);
            }
        }
        // Left
        if (col > 0 && this.getYokoEdge(row, col - 1) !== LoopEdgeState.WALL) {
            const next = { row, col: col - 1 };
            const key = posKey(next);
            if (!visited.has(key)) {
                visited.add(key);
                this.collectConnected(next, visited);
            }
        }
        // Right
        if (col < this.width - 1 && this.getYokoEdge(row, col) !== LoopEdgeState.WALL) {
            const next = { row, col: col + 1 };
            const key = posKey(next);
            if (!visited.has(key)) {
                visited.add(key);
                this.collectConnected(next, visited);
            }
        }
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new YajilinField(this.height, this.width, this.outsideMode);
        for (const [pos, cell] of this.cells.entries()) {
            cloned.cells.set(pos, cell);
        }
        for (const [pos, arrow] of this.arrows.entries()) {
            cloned.arrows.set(pos, arrow);
        }
        for (const [pos, edge] of this.yokoEdge.entries()) {
            cloned.yokoEdge.set(pos, edge);
        }
        for (const [pos, edge] of this.tateEdge.entries()) {
            cloned.tateEdge.set(pos, edge);
        }
        // Clone arrowsInfo (deep copy of arrays)
        for (const [key, value] of this.arrowsInfo.entries()) {
            cloned.arrowsInfo.set(key, value ? [...value] : null);
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
                dump += e === LoopEdgeState.LINE ? 'L' : e === LoopEdgeState.WALL ? 'W' : 'U';
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                const e = this.tateEdge.get(row, col);
                dump += e === LoopEdgeState.LINE ? 'L' : e === LoopEdgeState.WALL ? 'W' : 'U';
            }
        }
        return dump;
    }
    isSolved() {
        // All cells must be determined
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.UNKNOWN)
                    return false;
            }
        }
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
        const str = this.getStateDump();
        if (!this.arrowSolve())
            return false;
        if (!this.nextSolve())
            return false;
        if (!this.oddSolve())
            return false;
        if (!this.outsideSolve())
            return false;
        if (!this.hypothesisSolve())
            return false;
        if (this.getStateDump() !== str) {
            return this.solveAndCheck(); // Recursively continue if state changed
        }
        else {
            if (!this.connectSolve())
                return false;
        }
        return true;
    }
    // ========== Outside solve (SDVX outsideSolve) ==========
    /**
     * Identify cells that are definitely outside the loop
     * Cells reachable from the boundary through walls must be outside
     * Based on sdvx: ループの外側のセルを特定
     */
    outsideSolve() {
        if (!this.outsideMode)
            return true;
        // Find cells that are definitely outside the loop
        // Start from boundary cells that have walls on the outside
        const outsideCells = new Set();
        const queue = [];
        // Initialize with boundary cells that can be reached from outside
        // Cells with walls on the outer boundary can be starting points
        for (let col = 0; col < this.width; col++) {
            // Top row
            const topKey = posKey({ row: 0, col });
            if (!outsideCells.has(topKey)) {
                // Check if there's a wall on top (boundary)
                outsideCells.add(topKey);
                queue.push({ row: 0, col });
            }
            // Bottom row
            const bottomKey = posKey({ row: this.height - 1, col });
            if (!outsideCells.has(bottomKey)) {
                outsideCells.add(bottomKey);
                queue.push({ row: this.height - 1, col });
            }
        }
        for (let row = 0; row < this.height; row++) {
            // Left column
            const leftKey = posKey({ row, col: 0 });
            if (!outsideCells.has(leftKey)) {
                outsideCells.add(leftKey);
                queue.push({ row, col: 0 });
            }
            // Right column
            const rightKey = posKey({ row, col: this.width - 1 });
            if (!outsideCells.has(rightKey)) {
                outsideCells.add(rightKey);
                queue.push({ row, col: this.width - 1 });
            }
        }
        // BFS to find all cells reachable through WALLs from boundary
        while (queue.length > 0) {
            const current = queue.shift();
            const { row, col } = current;
            // Check each direction - can spread through WALLs (outside continues through walls)
            // Up
            if (row > 0 && this.getTateEdge(row - 1, col) === LoopEdgeState.WALL) {
                const nextKey = posKey({ row: row - 1, col });
                if (!outsideCells.has(nextKey)) {
                    outsideCells.add(nextKey);
                    queue.push({ row: row - 1, col });
                }
            }
            // Down
            if (row < this.height - 1 && this.getTateEdge(row, col) === LoopEdgeState.WALL) {
                const nextKey = posKey({ row: row + 1, col });
                if (!outsideCells.has(nextKey)) {
                    outsideCells.add(nextKey);
                    queue.push({ row: row + 1, col });
                }
            }
            // Left
            if (col > 0 && this.getYokoEdge(row, col - 1) === LoopEdgeState.WALL) {
                const nextKey = posKey({ row, col: col - 1 });
                if (!outsideCells.has(nextKey)) {
                    outsideCells.add(nextKey);
                    queue.push({ row, col: col - 1 });
                }
            }
            // Right
            if (col < this.width - 1 && this.getYokoEdge(row, col) === LoopEdgeState.WALL) {
                const nextKey = posKey({ row, col: col + 1 });
                if (!outsideCells.has(nextKey)) {
                    outsideCells.add(nextKey);
                    queue.push({ row, col: col + 1 });
                }
            }
        }
        // Outside cells must be BLACK (not part of loop)
        for (const key of outsideCells) {
            const [row, col] = key.split(',').map(Number);
            if (this.arrows.get(row, col) !== null)
                continue;
            const cell = this.cells.get(row, col);
            if (cell === CellState.WHITE) {
                // Contradiction: white cell is outside the loop
                return false;
            }
            if (cell === CellState.UNKNOWN) {
                this.cells.set(row, col, CellState.BLACK);
            }
        }
        return true;
    }
    // ========== Hypothesis solve (trial and error) ==========
    /**
     * Try both options for an unknown cell/edge and see if one leads to contradiction
     * Based on sdvx: 仮説テストによる推論
     */
    hypothesisSolve() {
        // Try unknown cells first
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) !== CellState.UNKNOWN)
                    continue;
                if (this.arrows.get(row, col) !== null)
                    continue;
                // Try BLACK
                const tryBlack = this.clone();
                tryBlack.setCell(row, col, CellState.BLACK);
                const blackValid = tryBlack.basicSolve();
                // Try WHITE
                const tryWhite = this.clone();
                tryWhite.setCell(row, col, CellState.WHITE);
                const whiteValid = tryWhite.basicSolve();
                if (!blackValid && !whiteValid) {
                    return false; // Both options fail - contradiction
                }
                if (blackValid && !whiteValid) {
                    this.cells.set(row, col, CellState.BLACK);
                    return true; // Continue solving
                }
                if (!blackValid && whiteValid) {
                    this.cells.set(row, col, CellState.WHITE);
                    return true; // Continue solving
                }
                // Both valid - can't determine yet
            }
        }
        return true;
    }
    /**
     * Basic solve without hypothesis (to avoid infinite recursion)
     */
    basicSolve() {
        let iterations = 0;
        const maxIterations = 100;
        while (iterations < maxIterations) {
            iterations++;
            const str = this.getStateDump();
            if (!this.arrowSolve())
                return false;
            if (!this.nextSolve())
                return false;
            if (!this.oddSolve())
                return false;
            if (this.getStateDump() === str) {
                // No changes, check connectivity
                if (!this.connectSolve())
                    return false;
                break;
            }
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let cellLine = '';
            for (let col = 0; col < this.width; col++) {
                const arrow = this.arrows.get(row, col);
                if (arrow) {
                    const dirChar = arrow.direction === Direction.UP ? '↑' :
                        arrow.direction === Direction.DOWN ? '↓' :
                            arrow.direction === Direction.LEFT ? '←' : '→';
                    cellLine += arrow.count === -1 ? dirChar + '?' : dirChar + arrow.count;
                }
                else {
                    const cell = this.cells.get(row, col);
                    cellLine += cell === CellState.BLACK ? '■■' : cell === CellState.WHITE ? '··' : '??';
                }
                if (col < this.width - 1) {
                    const edge = this.yokoEdge.get(row, col);
                    cellLine += edge === LoopEdgeState.LINE ? '─' : edge === LoopEdgeState.WALL ? ' ' : '?';
                }
            }
            lines.push(cellLine);
            if (row < this.height - 1) {
                let edgeLine = '';
                for (let col = 0; col < this.width; col++) {
                    const edge = this.tateEdge.get(row, col);
                    edgeLine += edge === LoopEdgeState.LINE ? ' │ ' : edge === LoopEdgeState.WALL ? '   ' : ' ? ';
                    if (col < this.width - 1)
                        edgeLine += ' ';
                }
                lines.push(edgeLine);
            }
        }
        return lines.join('\n');
    }
    /** Get branching candidates */
    getBranchingCandidates() {
        const candidates = [];
        // Prioritize cells near determined cells (like SDVX)
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.UNKNOWN && this.arrows.get(row, col) === null) {
                    const upCell = row === 0 ? CellState.BLACK : this.cells.get(row - 1, col);
                    const downCell = row === this.height - 1 ? CellState.BLACK : this.cells.get(row + 1, col);
                    const leftCell = col === 0 ? CellState.BLACK : this.cells.get(row, col - 1);
                    const rightCell = col === this.width - 1 ? CellState.BLACK : this.cells.get(row, col + 1);
                    let unknownCount = 0;
                    if (upCell === CellState.UNKNOWN)
                        unknownCount++;
                    if (downCell === CellState.UNKNOWN)
                        unknownCount++;
                    if (leftCell === CellState.UNKNOWN)
                        unknownCount++;
                    if (rightCell === CellState.UNKNOWN)
                        unknownCount++;
                    if (unknownCount <= 3) {
                        candidates.unshift({ type: 'cell', row, col });
                    }
                    else {
                        candidates.push({ type: 'cell', row, col });
                    }
                }
            }
        }
        // Add edge candidates (yokoEdge - horizontal edges)
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoEdge.get(row, col) === LoopEdgeState.UNKNOWN) {
                    candidates.push({ type: 'yokoEdge', row, col });
                }
            }
        }
        // Add edge candidates (tateEdge - vertical edges)
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateEdge.get(row, col) === LoopEdgeState.UNKNOWN) {
                    candidates.push({ type: 'tateEdge', row, col });
                }
            }
        }
        return candidates;
    }
}
// ============================================
// Yajilin Solver
// ============================================
export class YajilinSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from puzzle parameters */
    static fromString(height, width, puzzle, outsideMode = false) {
        const field = new YajilinField(height, width, outsideMode);
        for (let row = 0; row < height; row++) {
            const line = puzzle[row] || '';
            for (let col = 0; col < width; col++) {
                const idx = col * 2;
                if (idx + 1 < line.length) {
                    const dirChar = line[idx];
                    const countChar = line[idx + 1];
                    let direction = null;
                    if (dirChar === 'U' || dirChar === '↑')
                        direction = Direction.UP;
                    else if (dirChar === 'D' || dirChar === '↓')
                        direction = Direction.DOWN;
                    else if (dirChar === 'L' || dirChar === '←')
                        direction = Direction.LEFT;
                    else if (dirChar === 'R' || dirChar === '→')
                        direction = Direction.RIGHT;
                    if (direction !== null) {
                        const count = countChar === '?' ? -1 : parseInt(countChar);
                        if (!isNaN(count) || countChar === '?') {
                            field.setArrow(row, col, direction, count);
                        }
                    }
                }
            }
        }
        return new YajilinSolver(field);
    }
    /** Create solver from config object */
    static create(height, width, config) {
        const field = new YajilinField(height, width, config.outsideMode || false);
        if (config.arrows) {
            for (const arrow of config.arrows) {
                field.setArrow(arrow.row, arrow.col, arrow.direction, arrow.count);
            }
        }
        return new YajilinSolver(field);
    }
    getBranchCandidates(state) {
        const candidates = state.getBranchingCandidates();
        if (candidates.length === 0)
            return [];
        const cand = candidates[0];
        if (cand.type === 'cell') {
            return [
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setCell(cand.row, cand.col, CellState.BLACK);
                        return cloned;
                    },
                    description: `Set (${cand.row}, ${cand.col}) to BLACK`,
                },
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setCell(cand.row, cand.col, CellState.WHITE);
                        return cloned;
                    },
                    description: `Set (${cand.row}, ${cand.col}) to WHITE (loop)`,
                },
            ];
        }
        if (cand.type === 'yokoEdge') {
            return [
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setYokoEdge(cand.row, cand.col, LoopEdgeState.LINE);
                        return cloned;
                    },
                    description: `Set yokoEdge (${cand.row}, ${cand.col}) to LINE`,
                },
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setYokoEdge(cand.row, cand.col, LoopEdgeState.WALL);
                        return cloned;
                    },
                    description: `Set yokoEdge (${cand.row}, ${cand.col}) to WALL`,
                },
            ];
        }
        if (cand.type === 'tateEdge') {
            return [
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setTateEdge(cand.row, cand.col, LoopEdgeState.LINE);
                        return cloned;
                    },
                    description: `Set tateEdge (${cand.row}, ${cand.col}) to LINE`,
                },
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setTateEdge(cand.row, cand.col, LoopEdgeState.WALL);
                        return cloned;
                    },
                    description: `Set tateEdge (${cand.row}, ${cand.col}) to WALL`,
                },
            ];
        }
        return [];
    }
}
//# sourceMappingURL=yajilin.js.map