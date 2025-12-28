/**
 * Minesweeper Solver using Plugin Architecture
 *
 * Demonstrates how to use neighbor counting constraints.
 * Rules:
 * - Place mines in some cells
 * - Numbers show how many mines are in the 8 adjacent cells
 * - Number cells cannot contain mines
 */
import { CellState, } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
// ============================================
// Helper functions
// ============================================
/**
 * Get 8 neighbors
 */
function getNeighbors8(state, row, col) {
    const neighbors = [];
    const offsets = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1],
    ];
    for (const [dr, dc] of offsets) {
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < state.height && c >= 0 && c < state.width) {
            neighbors.push({ row: r, col: c });
        }
    }
    return neighbors;
}
/**
 * Count mines around a cell
 */
function countMines(state, row, col) {
    const neighbors = getNeighbors8(state, row, col);
    let mines = 0;
    let unknown = 0;
    for (const pos of neighbors) {
        const cell = state.cells.get(pos);
        if (cell === CellState.BLACK)
            mines++;
        else if (cell === CellState.UNKNOWN)
            unknown++;
    }
    return { mines, unknown };
}
// ============================================
// Minesweeper Constraints
// ============================================
/**
 * Constraint: Number cells show adjacent mine count
 */
export class MineCountConstraint {
    type = 'mine-count';
    name = 'Mine Count';
    propagate(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                const num = state.numbers.get(row, col);
                if (num === null)
                    continue;
                const { mines, unknown } = countMines(state, row, col);
                // Too many mines
                if (mines > num)
                    return PropagationResult.CONTRADICTION;
                // Can't reach required mines
                if (mines + unknown < num)
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
                const { mines, unknown } = countMines(state, row, col);
                if (mines !== num || unknown !== 0)
                    return false;
            }
        }
        return true;
    }
}
/**
 * Constraint: Number cells cannot be mines
 */
export class NumberSafeConstraint {
    type = 'number-safe';
    name = 'Number Safe';
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
// ============================================
// Solver
// ============================================
export function createMinesweeperRunner() {
    const runner = new ConstraintRunner();
    runner.addConstraints([
        new MineCountConstraint(),
        new NumberSafeConstraint(),
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
        numbers: state.numbers.clone(),
    };
}
/**
 * Simple solver using plugin constraints
 */
export function solveMinesweeper(state) {
    const runner = createMinesweeperRunner();
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
    // Try SAFE first (more common)
    const safeState = cloneState(state);
    safeState.cells.set(pos, CellState.WHITE);
    const safeResult = solveMinesweeper(safeState);
    if (safeResult)
        return safeResult;
    // Try MINE
    const mineState = cloneState(state);
    mineState.cells.set(pos, CellState.BLACK);
    const mineResult = solveMinesweeper(mineState);
    if (mineResult)
        return mineResult;
    return null;
}
/**
 * Create initial state from puzzle
 */
export function createMinesweeperState(height, width, numbers) {
    const cells = new Grid(height, width, () => CellState.UNKNOWN);
    const numGrid = new Grid(height, width, () => null);
    for (const num of numbers) {
        numGrid.set(num.row, num.col, num.value);
        cells.set(num.row, num.col, CellState.WHITE);
    }
    return { height, width, cells, numbers: numGrid };
}
//# sourceMappingURL=minesweeper-plugin.js.map