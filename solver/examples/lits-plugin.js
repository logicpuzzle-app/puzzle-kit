/**
 * LITS Solver using Plugin Architecture
 *
 * Demonstrates how to use tetromino and region constraints.
 * Rules:
 * - Paint exactly one tetromino (L, I, T, or S shape) in each region
 * - All painted cells must be connected
 * - No 2x2 black areas
 * - Same-shaped tetrominoes cannot touch orthogonally
 */
import { CellState, DIRECTIONS, adjacent, posKey, } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { isConnected } from '../constraints/plugins/component.js';
// ============================================
// Helper functions
// ============================================
/**
 * Get black cells in a region
 */
function getBlackCellsInRegion(state, regionId) {
    const cells = [];
    for (let row = 0; row < state.height; row++) {
        for (let col = 0; col < state.width; col++) {
            if (state.regions.get(row, col) === regionId &&
                state.cells.get(row, col) === CellState.BLACK) {
                cells.push({ row, col });
            }
        }
    }
    return cells;
}
/**
 * Count cells by state in a region
 */
function countCellsInRegion(state, regionId) {
    let black = 0, white = 0, unknown = 0;
    for (let row = 0; row < state.height; row++) {
        for (let col = 0; col < state.width; col++) {
            if (state.regions.get(row, col) !== regionId)
                continue;
            const cell = state.cells.get(row, col);
            if (cell === CellState.BLACK)
                black++;
            else if (cell === CellState.WHITE)
                white++;
            else
                unknown++;
        }
    }
    return { black, white, unknown };
}
// ============================================
// LITS Constraints
// ============================================
/**
 * Constraint: Each region must have exactly 4 black cells
 */
export class RegionTetrominoConstraint {
    type = 'region-tetromino';
    name = 'Region Tetromino';
    propagate(state) {
        for (let regionId = 0; regionId < state.regionCount; regionId++) {
            const { black, unknown } = countCellsInRegion(state, regionId);
            // Too many black cells
            if (black > 4)
                return PropagationResult.CONTRADICTION;
            // Can't reach 4 black cells
            if (black + unknown < 4)
                return PropagationResult.CONTRADICTION;
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let regionId = 0; regionId < state.regionCount; regionId++) {
            const { black } = countCellsInRegion(state, regionId);
            if (black !== 4)
                return false;
        }
        return true;
    }
}
/**
 * Constraint: Black cells in each region must be connected (form a tetromino)
 */
export class RegionConnectedConstraint {
    type = 'region-connected';
    name = 'Region Connected';
    propagate(_state) {
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let regionId = 0; regionId < state.regionCount; regionId++) {
            const blackCells = getBlackCellsInRegion(state, regionId);
            if (blackCells.length === 0)
                continue;
            if (blackCells.length !== 4)
                return false;
            // Check connectivity among black cells
            const blackSet = new Set(blackCells.map(p => posKey(p)));
            const visited = new Set();
            const queue = [blackCells[0]];
            visited.add(posKey(blackCells[0]));
            while (queue.length > 0) {
                const pos = queue.shift();
                for (const dir of DIRECTIONS) {
                    const next = adjacent(pos, dir);
                    const key = posKey(next);
                    if (blackSet.has(key) && !visited.has(key)) {
                        visited.add(key);
                        queue.push(next);
                    }
                }
            }
            if (visited.size !== blackCells.length)
                return false;
        }
        return true;
    }
}
/**
 * Constraint: All black cells must be connected globally
 */
export class GlobalConnectedConstraint {
    type = 'global-connected';
    name = 'Global Connected';
    propagate(_state) {
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        const blackGrid = new Grid(state.height, state.width, () => false);
        let hasAny = false;
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.cells.get(row, col) === CellState.BLACK) {
                    blackGrid.set(row, col, true);
                    hasAny = true;
                }
            }
        }
        if (!hasAny)
            return true;
        return isConnected(blackGrid, v => v === true, false);
    }
}
/**
 * Constraint: No 2x2 black areas
 */
export class No2x2BlackConstraint {
    type = 'no-2x2-black';
    name = 'No 2x2 Black';
    propagate(state) {
        for (let row = 0; row < state.height - 1; row++) {
            for (let col = 0; col < state.width - 1; col++) {
                const cells = [
                    state.cells.get(row, col),
                    state.cells.get(row, col + 1),
                    state.cells.get(row + 1, col),
                    state.cells.get(row + 1, col + 1),
                ];
                if (cells.every(c => c === CellState.BLACK)) {
                    return PropagationResult.CONTRADICTION;
                }
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        return this.propagate(state) !== PropagationResult.CONTRADICTION;
    }
}
// ============================================
// Solver
// ============================================
export function createLITSRunner() {
    const runner = new ConstraintRunner();
    runner.addConstraints([
        new RegionTetrominoConstraint(),
        new RegionConnectedConstraint(),
        new GlobalConnectedConstraint(),
        new No2x2BlackConstraint(),
    ]);
    return runner;
}
/**
 * Check if state has unknown cells
 */
export function hasUnknownCells(state) {
    for (let row = 0; row < state.height; row++) {
        for (let col = 0; col < state.width; col++) {
            if (state.cells.get(row, col) === CellState.UNKNOWN) {
                return true;
            }
        }
    }
    return false;
}
/**
 * Get unknown cells for branching
 */
export function getUnknownCells(state) {
    const unknowns = [];
    for (let row = 0; row < state.height; row++) {
        for (let col = 0; col < state.width; col++) {
            if (state.cells.get(row, col) === CellState.UNKNOWN) {
                unknowns.push({ row, col });
            }
        }
    }
    return unknowns;
}
/**
 * Clone state
 */
export function cloneState(state) {
    return {
        height: state.height,
        width: state.width,
        cells: state.cells.clone(),
        regions: state.regions.clone(),
        regionCount: state.regionCount,
    };
}
/**
 * Simple solver using plugin constraints
 */
export function solveLITS(state) {
    const runner = createLITSRunner();
    // Run propagation
    const { result } = runner.run(state);
    if (result === PropagationResult.CONTRADICTION) {
        return null;
    }
    // Check if solved
    if (!hasUnknownCells(state) && runner.checkAll(state)) {
        return state;
    }
    // Branch on first unknown cell
    const unknowns = getUnknownCells(state);
    if (unknowns.length === 0) {
        return runner.checkAll(state) ? state : null;
    }
    const pos = unknowns[0];
    // Try BLACK first
    const blackState = cloneState(state);
    blackState.cells.set(pos, CellState.BLACK);
    const blackResult = solveLITS(blackState);
    if (blackResult)
        return blackResult;
    // Try WHITE
    const whiteState = cloneState(state);
    whiteState.cells.set(pos, CellState.WHITE);
    const whiteResult = solveLITS(whiteState);
    if (whiteResult)
        return whiteResult;
    return null;
}
/**
 * Create initial state from puzzle
 */
export function createLITSState(height, width, regionGrid) {
    const cells = new Grid(height, width, () => CellState.UNKNOWN);
    const regions = new Grid(height, width, (r, c) => regionGrid[r][c]);
    // Count regions
    let maxRegion = 0;
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            maxRegion = Math.max(maxRegion, regionGrid[row][col]);
        }
    }
    return { height, width, cells, regions, regionCount: maxRegion + 1 };
}
//# sourceMappingURL=lits-plugin.js.map