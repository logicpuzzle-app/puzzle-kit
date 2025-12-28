/**
 * Cave (Corral) Solver using Plugin Architecture
 *
 * Demonstrates how to use visibility and connectivity constraints.
 * Rules:
 * - Shade some cells to form a cave (unshaded region)
 * - The cave must be connected
 * - Shaded cells must connect to the border
 * - Numbers indicate total visible cells in 4 directions (including itself)
 */
import { CellState, DIRECTIONS, adjacent, posKey, } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { isConnected } from '../constraints/plugins/component.js';
// ============================================
// Helper functions
// ============================================
/**
 * Count visible cells in 4 directions from a cave cell
 */
function countVisible(state, row, col) {
    let min = 1; // The cell itself
    let max = 1;
    const directions = [
        { dr: -1, dc: 0 },
        { dr: 1, dc: 0 },
        { dr: 0, dc: -1 },
        { dr: 0, dc: 1 },
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
                // Unknown - could be wall (stops) or cave (continues)
                max++;
            }
            r += dr;
            c += dc;
        }
    }
    return { min, max };
}
/**
 * Check if cell is on border
 */
function isOnBorder(state, row, col) {
    return row === 0 || row === state.height - 1 || col === 0 || col === state.width - 1;
}
// ============================================
// Cave Constraints
// ============================================
/**
 * Constraint: Numbers show visibility count
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
                if (max < num)
                    return PropagationResult.CONTRADICTION;
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
                if (min !== num || max !== num)
                    return false;
            }
        }
        return true;
    }
}
/**
 * Constraint: Number cells must be in the cave (white)
 */
export class NumberInCaveConstraint {
    type = 'number-in-cave';
    name = 'Number In Cave';
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
 * Constraint: Cave (white cells) must be connected
 */
export class CaveConnectedConstraint {
    type = 'cave-connected';
    name = 'Cave Connected';
    propagate(_state) {
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        const caveGrid = new Grid(state.height, state.width, () => false);
        let hasAny = false;
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.cells.get(row, col) !== CellState.BLACK) {
                    caveGrid.set(row, col, true);
                    hasAny = true;
                }
            }
        }
        if (!hasAny)
            return true;
        return isConnected(caveGrid, v => v === true, false);
    }
}
/**
 * Constraint: Wall cells (black) must connect to border
 */
export class WallConnectsToBorderConstraint {
    type = 'wall-connects-border';
    name = 'Wall Connects To Border';
    propagate(_state) {
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        // Find all black cells
        const blackCells = [];
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.cells.get(row, col) === CellState.BLACK) {
                    blackCells.push({ row, col });
                }
            }
        }
        if (blackCells.length === 0)
            return true;
        // Each black cell must be able to reach border through other black cells
        for (const start of blackCells) {
            const visited = new Set();
            const queue = [start];
            visited.add(posKey(start));
            let reachesBorder = isOnBorder(state, start.row, start.col);
            while (queue.length > 0 && !reachesBorder) {
                const pos = queue.shift();
                for (const dir of DIRECTIONS) {
                    const next = adjacent(pos, dir);
                    const key = posKey(next);
                    if (!visited.has(key) && state.cells.inBounds(next) &&
                        state.cells.get(next) === CellState.BLACK) {
                        visited.add(key);
                        queue.push(next);
                        if (isOnBorder(state, next.row, next.col)) {
                            reachesBorder = true;
                            break;
                        }
                    }
                }
            }
            if (!reachesBorder)
                return false;
        }
        return true;
    }
}
// ============================================
// Solver
// ============================================
export function createCaveRunner() {
    const runner = new ConstraintRunner();
    runner.addConstraints([
        new VisibilityConstraint(),
        new NumberInCaveConstraint(),
        new CaveConnectedConstraint(),
        new WallConnectsToBorderConstraint(),
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
export function solveCave(state) {
    const runner = createCaveRunner();
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
    // Try WHITE first (cave)
    const whiteState = cloneState(state);
    whiteState.cells.set(pos, CellState.WHITE);
    const whiteResult = solveCave(whiteState);
    if (whiteResult)
        return whiteResult;
    // Try BLACK (wall)
    const blackState = cloneState(state);
    blackState.cells.set(pos, CellState.BLACK);
    const blackResult = solveCave(blackState);
    if (blackResult)
        return blackResult;
    return null;
}
/**
 * Create initial state from puzzle
 */
export function createCaveState(height, width, numbers) {
    const cells = new Grid(height, width, () => CellState.UNKNOWN);
    const numGrid = new Grid(height, width, () => null);
    for (const num of numbers) {
        numGrid.set(num.row, num.col, num.value);
        cells.set(num.row, num.col, CellState.WHITE);
    }
    return { height, width, cells, numbers: numGrid };
}
//# sourceMappingURL=cave-plugin.js.map