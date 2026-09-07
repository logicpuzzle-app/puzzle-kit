/**
 * Nurikabe Solver using Plugin Architecture
 *
 * This demonstrates how to use constraint plugins to build a solver.
 * Uses:
 * - ComponentConstraint: for black connectivity and island regions
 * - PatternMatchConstraint: for 2x2 pool check (has2x2Pool)
 */
import { CellState, } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { isConnected, getComponentAt, } from '../constraints/plugins/component.js';
import { has2x2Pool, would2x2Pool, } from '../constraints/plugins/pattern-match.js';
// ============================================
// Nurikabe Constraints using Plugins
// ============================================
/**
 * Constraint: No 2x2 black pool allowed
 */
export class No2x2PoolConstraint {
    type = 'no-2x2-pool';
    name = 'No 2x2 Black Pool';
    propagate(state) {
        const pool = has2x2Pool(state.cells, v => v === CellState.BLACK);
        if (pool) {
            return PropagationResult.CONTRADICTION;
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        return has2x2Pool(state.cells, v => v === CellState.BLACK) === null;
    }
}
/**
 * Constraint: All black cells must be connected
 */
export class BlackConnectedConstraint {
    type = 'black-connected';
    name = 'Black Connectivity';
    propagate(_state) {
        // Check only, no propagation
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        // Get all black cells
        const blackCells = state.cells.findAll(v => v === CellState.BLACK);
        if (blackCells.length === 0)
            return true;
        // Use component plugin to check connectivity
        // For black cells, we check if they form a single component
        // We also allow UNKNOWN cells to be part of the potential black region
        return isConnected(state.cells, v => v !== CellState.WHITE, false);
    }
}
/**
 * Constraint: Each numbered cell defines an island of that size
 */
export class IslandSizeConstraint {
    type = 'island-size';
    name = 'Island Size';
    propagate(_state) {
        // Propagation handled by solver
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        // Check each numbered cell
        for (const [pos, num] of state.numbers.entries()) {
            if (num === null)
                continue;
            // Get white region containing this number
            const component = getComponentAt(state.cells, pos, v => v === CellState.WHITE, false);
            if (!component)
                return false;
            // Check exact size match
            if (component.size !== num)
                return false;
            // Check no other number in same region
            for (const p of component.positions) {
                const n = state.numbers.get(p);
                if (n !== null && (p.row !== pos.row || p.col !== pos.col)) {
                    return false; // Two numbers in same island
                }
            }
        }
        return true;
    }
}
/**
 * Constraint: White cells must belong to exactly one numbered island
 */
export class WhiteBelongsToIslandConstraint {
    type = 'white-belongs-to-island';
    name = 'White Belongs to Island';
    propagate(_state) {
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        // Each white cell must be able to reach exactly one numbered cell
        for (const [pos, cellState] of state.cells.entries()) {
            if (cellState !== CellState.WHITE)
                continue;
            if (state.numbers.get(pos) !== null)
                continue; // Has its own number
            // Get white region
            const component = getComponentAt(state.cells, pos, v => v === CellState.WHITE, false);
            if (!component)
                return false;
            // Count numbers in region
            let numberCount = 0;
            for (const p of component.positions) {
                if (state.numbers.get(p) !== null)
                    numberCount++;
            }
            if (numberCount !== 1)
                return false;
        }
        return true;
    }
}
// ============================================
// Solver using ConstraintRunner
// ============================================
export function createNurikabeRunner() {
    const runner = new ConstraintRunner();
    runner.addConstraints([
        new No2x2PoolConstraint(),
        new BlackConnectedConstraint(),
        new IslandSizeConstraint(),
        new WhiteBelongsToIslandConstraint(),
    ]);
    return runner;
}
/**
 * Check if state has any UNKNOWN cells
 */
export function hasUnknown(state) {
    for (const [, v] of state.cells.entries()) {
        if (v === CellState.UNKNOWN)
            return true;
    }
    return false;
}
/**
 * Get unknown cells
 */
export function getUnknownCells(state) {
    return state.cells.findAll(v => v === CellState.UNKNOWN);
}
/**
 * Clone state
 */
export function cloneState(state) {
    return {
        cells: state.cells.clone(),
        numbers: state.numbers.clone(),
    };
}
/**
 * Simple solver example using plugin constraints
 */
export function solveNurikabe(state) {
    const runner = createNurikabeRunner();
    // Run propagation
    const { result } = runner.run(state);
    if (result === PropagationResult.CONTRADICTION) {
        return null;
    }
    // Check if solved
    if (!hasUnknown(state) && runner.checkAll(state)) {
        return state;
    }
    // Branch on first unknown
    const unknowns = getUnknownCells(state);
    if (unknowns.length === 0) {
        return runner.checkAll(state) ? state : null;
    }
    const pos = unknowns[0];
    // Try BLACK first
    const blackState = cloneState(state);
    blackState.cells.set(pos, CellState.BLACK);
    if (!would2x2Pool(blackState.cells, pos, CellState.BLACK, v => v === CellState.BLACK)) {
        const blackResult = solveNurikabe(blackState);
        if (blackResult)
            return blackResult;
    }
    // Try WHITE
    const whiteState = cloneState(state);
    whiteState.cells.set(pos, CellState.WHITE);
    const whiteResult = solveNurikabe(whiteState);
    if (whiteResult)
        return whiteResult;
    return null;
}
/**
 * Create initial state from puzzle
 */
export function createNurikabeState(height, width, puzzle) {
    const cells = new Grid(height, width, () => CellState.UNKNOWN);
    const numbers = new Grid(height, width, () => null);
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            const ch = puzzle[row]?.[col];
            if (ch && ch >= '1' && ch <= '9') {
                const num = parseInt(ch);
                numbers.set(row, col, num);
                cells.set(row, col, CellState.WHITE);
            }
            else if (ch && ch.toLowerCase() >= 'a' && ch.toLowerCase() <= 'z') {
                const num = ch.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0) + 10;
                numbers.set(row, col, num);
                cells.set(row, col, CellState.WHITE);
            }
        }
    }
    return { cells, numbers };
}
//# sourceMappingURL=nurikabe-plugin.js.map