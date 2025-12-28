/**
 * Kurodoko (Where is Black Cells) Solver using Plugin Architecture
 *
 * Demonstrates how to use visibility/line-of-sight constraints.
 * Rules:
 * - Paint some cells black
 * - Numbers indicate visible white cells in 4 directions (including itself)
 * - Black cells cannot be adjacent
 * - White cells must be connected
 */
import { CellState, DIRECTIONS, adjacent, } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { isConnected } from '../constraints/plugins/component.js';
// ============================================
// Helper functions
// ============================================
/**
 * Count visible cells from a position in 4 directions
 */
function countVisible(state, row, col) {
    let min = 1; // The cell itself
    let max = 1;
    const directions = [
        { dr: -1, dc: 0 }, // up
        { dr: 1, dc: 0 }, // down
        { dr: 0, dc: -1 }, // left
        { dr: 0, dc: 1 }, // right
    ];
    for (const { dr, dc } of directions) {
        let r = row + dr;
        let c = col + dc;
        while (r >= 0 && r < state.height && c >= 0 && c < state.width) {
            const cell = state.cells.get(r, c);
            if (cell === CellState.BLACK) {
                break;
            }
            else if (cell === CellState.WHITE) {
                min++;
                max++;
            }
            else {
                // Unknown - could be black (stops) or white (continues)
                max++;
            }
            r += dr;
            c += dc;
        }
    }
    return { min, max };
}
// ============================================
// Kurodoko Constraints
// ============================================
/**
 * Constraint: Number cells show visible count
 */
export class VisibilityConstraint {
    type = 'visibility';
    name = 'Visibility';
    propagate(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                const num = state.numbers.get(row, col);
                if (num === null)
                    continue;
                const { min, max } = countVisible(state, row, col);
                // Can't reach required number
                if (max < num)
                    return PropagationResult.CONTRADICTION;
                // Already exceeded
                if (min > num)
                    return PropagationResult.CONTRADICTION;
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                const num = state.numbers.get(row, col);
                if (num === null)
                    continue;
                const { min, max } = countVisible(state, row, col);
                // All cells should be determined, so min === max
                if (min !== num || max !== num)
                    return false;
            }
        }
        return true;
    }
}
/**
 * Constraint: Number cells cannot be black
 */
export class NumberCellWhiteConstraint {
    type = 'number-cell-white';
    name = 'Number Cell White';
    propagate(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.numbers.get(row, col) !== null &&
                    state.cells.get(row, col) === CellState.BLACK) {
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
/**
 * Constraint: Black cells cannot be adjacent
 */
export class NoAdjacentBlackConstraint {
    type = 'no-adjacent-black';
    name = 'No Adjacent Black';
    propagate(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.cells.get(row, col) !== CellState.BLACK)
                    continue;
                for (const dir of DIRECTIONS) {
                    const adj = adjacent({ row, col }, dir);
                    if (state.cells.inBounds(adj) && state.cells.get(adj) === CellState.BLACK) {
                        return PropagationResult.CONTRADICTION;
                    }
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
 * Constraint: White cells must be connected
 */
export class WhiteConnectedConstraint {
    type = 'white-connected';
    name = 'White Connected';
    propagate(_state) {
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        const whiteGrid = new Grid(state.height, state.width, () => false);
        let hasAny = false;
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.cells.get(row, col) !== CellState.BLACK) {
                    whiteGrid.set(row, col, true);
                    hasAny = true;
                }
            }
        }
        if (!hasAny)
            return true;
        return isConnected(whiteGrid, v => v === true, false);
    }
}
// ============================================
// Solver
// ============================================
export function createKurodokoRunner() {
    const runner = new ConstraintRunner();
    runner.addConstraints([
        new VisibilityConstraint(),
        new NumberCellWhiteConstraint(),
        new NoAdjacentBlackConstraint(),
        new WhiteConnectedConstraint(),
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
            if (state.cells.get(row, col) === CellState.UNKNOWN && state.numbers.get(row, col) === null) {
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
        numbers: state.numbers.clone(),
    };
}
/**
 * Simple solver using plugin constraints
 */
export function solveKurodoko(state) {
    const runner = createKurodokoRunner();
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
    // Try WHITE first (more common)
    const whiteState = cloneState(state);
    whiteState.cells.set(pos, CellState.WHITE);
    const whiteResult = solveKurodoko(whiteState);
    if (whiteResult)
        return whiteResult;
    // Try BLACK
    const blackState = cloneState(state);
    blackState.cells.set(pos, CellState.BLACK);
    const blackResult = solveKurodoko(blackState);
    if (blackResult)
        return blackResult;
    return null;
}
/**
 * Create initial state from puzzle
 */
export function createKurodokoState(height, width, numbers) {
    const cells = new Grid(height, width, () => CellState.UNKNOWN);
    const numGrid = new Grid(height, width, () => null);
    for (const num of numbers) {
        numGrid.set(num.row, num.col, num.value);
        cells.set(num.row, num.col, CellState.WHITE);
    }
    return { height, width, cells, numbers: numGrid };
}
//# sourceMappingURL=kurodoko-plugin.js.map