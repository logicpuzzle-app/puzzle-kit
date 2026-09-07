/**
 * Aqre Solver using Plugin Architecture
 *
 * Demonstrates how to use region and consecutive constraints.
 * Rules:
 * - Shade some cells
 * - Each region contains a number showing how many shaded cells it has
 * - No more than 3 consecutive shaded cells in a row/column
 * - All shaded cells must be connected
 */
import { CellState, } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { isConnected } from '../constraints/plugins/component.js';
// ============================================
// Helper functions
// ============================================
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
/**
 * Get region number (the clue for that region)
 */
function getRegionNumber(state, regionId) {
    for (let row = 0; row < state.height; row++) {
        for (let col = 0; col < state.width; col++) {
            if (state.regions.get(row, col) === regionId) {
                const num = state.numbers.get(row, col);
                if (num !== null)
                    return num;
            }
        }
    }
    return null;
}
// ============================================
// Aqre Constraints
// ============================================
/**
 * Constraint: Region must have exactly the specified number of shaded cells
 */
export class RegionCountConstraint {
    type = 'region-count';
    name = 'Region Count';
    propagate(state) {
        for (let regionId = 0; regionId < state.regionCount; regionId++) {
            const num = getRegionNumber(state, regionId);
            if (num === null)
                continue;
            const { black, unknown } = countCellsInRegion(state, regionId);
            // Too many shaded
            if (black > num)
                return PropagationResult.CONTRADICTION;
            // Can't reach required number
            if (black + unknown < num)
                return PropagationResult.CONTRADICTION;
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let regionId = 0; regionId < state.regionCount; regionId++) {
            const num = getRegionNumber(state, regionId);
            if (num === null)
                continue;
            const { black } = countCellsInRegion(state, regionId);
            if (black !== num)
                return false;
        }
        return true;
    }
}
/**
 * Constraint: No more than 3 consecutive shaded cells in rows/columns
 */
export class NoFourConsecutiveConstraint {
    type = 'no-four-consecutive';
    name = 'No Four Consecutive';
    propagate(state) {
        // Check rows
        for (let row = 0; row < state.height; row++) {
            let consecutive = 0;
            for (let col = 0; col < state.width; col++) {
                if (state.cells.get(row, col) === CellState.BLACK) {
                    consecutive++;
                    if (consecutive > 3)
                        return PropagationResult.CONTRADICTION;
                }
                else {
                    consecutive = 0;
                }
            }
        }
        // Check columns
        for (let col = 0; col < state.width; col++) {
            let consecutive = 0;
            for (let row = 0; row < state.height; row++) {
                if (state.cells.get(row, col) === CellState.BLACK) {
                    consecutive++;
                    if (consecutive > 3)
                        return PropagationResult.CONTRADICTION;
                }
                else {
                    consecutive = 0;
                }
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        return this.propagate(state) !== PropagationResult.CONTRADICTION;
    }
}
/**
 * Constraint: All shaded cells must be connected
 */
export class ShadedConnectedConstraint {
    type = 'shaded-connected';
    name = 'Shaded Connected';
    propagate(_state) {
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        const shadedGrid = new Grid(state.height, state.width, () => false);
        let hasAny = false;
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.cells.get(row, col) === CellState.BLACK) {
                    shadedGrid.set(row, col, true);
                    hasAny = true;
                }
            }
        }
        if (!hasAny)
            return true;
        return isConnected(shadedGrid, v => v === true, false);
    }
}
// ============================================
// Solver
// ============================================
export function createAqreRunner() {
    const runner = new ConstraintRunner();
    runner.addConstraints([
        new RegionCountConstraint(),
        new NoFourConsecutiveConstraint(),
        new ShadedConnectedConstraint(),
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
        numbers: state.numbers.clone(),
        regionCount: state.regionCount,
    };
}
/**
 * Simple solver using plugin constraints
 */
export function solveAqre(state) {
    const runner = createAqreRunner();
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
    const blackResult = solveAqre(blackState);
    if (blackResult)
        return blackResult;
    // Try WHITE
    const whiteState = cloneState(state);
    whiteState.cells.set(pos, CellState.WHITE);
    const whiteResult = solveAqre(whiteState);
    if (whiteResult)
        return whiteResult;
    return null;
}
/**
 * Create initial state from puzzle
 */
export function createAqreState(height, width, regionGrid, numbers) {
    const cells = new Grid(height, width, () => CellState.UNKNOWN);
    const regions = new Grid(height, width, (r, c) => regionGrid[r][c]);
    const numGrid = new Grid(height, width, () => null);
    // Count regions
    let maxRegion = 0;
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            maxRegion = Math.max(maxRegion, regionGrid[row][col]);
        }
    }
    for (const num of numbers) {
        numGrid.set(num.row, num.col, num.value);
    }
    return { height, width, cells, regions, numbers: numGrid, regionCount: maxRegion + 1 };
}
//# sourceMappingURL=aqre-plugin.js.map