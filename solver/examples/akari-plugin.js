/**
 * Akari (Light Up) Solver using Plugin Architecture
 *
 * Demonstrates how to use visibility constraint plugins.
 * Uses:
 * - VisibilityConstraint utilities: for light rays
 * - Custom constraints for wall numbers and light conflicts
 */
import { CellState, DIRECTIONS, adjacent, posKey, } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { getVisiblePositions } from '../constraints/plugins/visibility.js';
// ============================================
// Akari State
// ============================================
export var AkariCellType;
(function (AkariCellType) {
    AkariCellType[AkariCellType["EMPTY"] = 0] = "EMPTY";
    AkariCellType[AkariCellType["WALL"] = 1] = "WALL";
    AkariCellType[AkariCellType["LIGHT"] = 2] = "LIGHT";
})(AkariCellType || (AkariCellType = {}));
// ============================================
// Helper functions
// ============================================
function isLight(state, pos) {
    return state.cellTypes.get(pos) === AkariCellType.LIGHT;
}
function updateLighting(state) {
    state.litCells.clear();
    for (let row = 0; row < state.height; row++) {
        for (let col = 0; col < state.width; col++) {
            const pos = { row, col };
            if (isLight(state, pos)) {
                // Mark cells visible from this light as lit
                const visible = getVisiblePositions(state.cellTypes, pos, DIRECTIONS, (v) => v === AkariCellType.WALL);
                for (const lit of visible) {
                    state.litCells.add(posKey(lit));
                }
            }
        }
    }
}
// ============================================
// Akari Constraints using Plugins
// ============================================
/**
 * Constraint: No two lights can see each other
 */
export class NoLightConflictConstraint {
    type = 'no-light-conflict';
    name = 'No Light Conflict';
    propagate(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                const pos = { row, col };
                if (!isLight(state, pos))
                    continue;
                // Check if this light can see another light
                const visible = getVisiblePositions(state.cellTypes, pos, DIRECTIONS, (v) => v === AkariCellType.WALL);
                for (const v of visible) {
                    if (isLight(state, v)) {
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
 * Constraint: All empty cells must be lit
 */
export class AllCellsLitConstraint {
    type = 'all-cells-lit';
    name = 'All Cells Lit';
    propagate(_state) {
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        updateLighting(state);
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                const pos = { row, col };
                if (state.cellTypes.get(pos) === AkariCellType.EMPTY) {
                    if (!state.litCells.has(posKey(pos))) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
}
/**
 * Constraint: Wall numbers must be satisfied
 */
export class WallNumberConstraint {
    type = 'wall-number';
    name = 'Wall Numbers';
    propagate(state) {
        for (const [key, number] of state.wallNumbers) {
            const pos = parsePosition(key);
            const { lights, empties } = this.countAdjacent(state, pos);
            if (lights > number)
                return PropagationResult.CONTRADICTION;
            if (lights + empties < number)
                return PropagationResult.CONTRADICTION;
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (const [key, number] of state.wallNumbers) {
            const pos = parsePosition(key);
            const { lights, empties } = this.countAdjacent(state, pos);
            if (lights !== number || empties !== 0)
                return false;
        }
        return true;
    }
    countAdjacent(state, pos) {
        let lights = 0;
        let empties = 0;
        for (const dir of DIRECTIONS) {
            const adj = adjacent(pos, dir);
            if (!state.cellTypes.inBounds(adj))
                continue;
            if (isLight(state, adj)) {
                lights++;
            }
            else if (state.cellTypes.get(adj) === AkariCellType.EMPTY &&
                state.cellStates.get(adj) !== CellState.WHITE) {
                empties++;
            }
        }
        return { lights, empties };
    }
}
// ============================================
// Solver
// ============================================
export function createAkariRunner() {
    const runner = new ConstraintRunner();
    runner.addConstraints([
        new NoLightConflictConstraint(),
        new AllCellsLitConstraint(),
        new WallNumberConstraint(),
    ]);
    return runner;
}
/**
 * Check if state has unknown cells
 */
export function hasUnknownCells(state) {
    for (let row = 0; row < state.height; row++) {
        for (let col = 0; col < state.width; col++) {
            const pos = { row, col };
            if (state.cellTypes.get(pos) === AkariCellType.EMPTY &&
                state.cellStates.get(pos) === CellState.UNKNOWN) {
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
            const pos = { row, col };
            if (state.cellTypes.get(pos) === AkariCellType.EMPTY &&
                state.cellStates.get(pos) === CellState.UNKNOWN) {
                unknowns.push(pos);
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
        cellTypes: state.cellTypes.clone(),
        cellStates: state.cellStates.clone(),
        wallNumbers: new Map(state.wallNumbers),
        litCells: new Set(state.litCells),
    };
}
/**
 * Place a light
 */
export function placeLight(state, pos) {
    state.cellTypes.set(pos, AkariCellType.LIGHT);
    state.cellStates.set(pos, CellState.WHITE);
    updateLighting(state);
}
/**
 * Mark cell as no light
 */
export function markNoLight(state, pos) {
    state.cellStates.set(pos, CellState.WHITE);
}
/**
 * Simple solver using plugin constraints
 */
export function solveAkari(state) {
    const runner = createAkariRunner();
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
    // Try placing light
    const lightState = cloneState(state);
    placeLight(lightState, pos);
    const lightResult = solveAkari(lightState);
    if (lightResult)
        return lightResult;
    // Try no light
    const noLightState = cloneState(state);
    markNoLight(noLightState, pos);
    const noLightResult = solveAkari(noLightState);
    if (noLightResult)
        return noLightResult;
    return null;
}
/**
 * Create initial state from puzzle
 */
export function createAkariState(height, width, puzzle) {
    const cellTypes = new Grid(height, width, () => AkariCellType.EMPTY);
    const cellStates = new Grid(height, width, () => CellState.UNKNOWN);
    const wallNumbers = new Map();
    const litCells = new Set();
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            const ch = puzzle[row]?.[col] ?? '.';
            if (ch === '#' || ch === '█') {
                cellTypes.set(row, col, AkariCellType.WALL);
            }
            else if (ch >= '0' && ch <= '4') {
                cellTypes.set(row, col, AkariCellType.WALL);
                wallNumbers.set(posKey({ row, col }), parseInt(ch));
            }
        }
    }
    return { height, width, cellTypes, cellStates, wallNumbers, litCells };
}
// ============================================
// Helpers
// ============================================
function parsePosition(key) {
    const [row, col] = key.split(',').map(Number);
    return { row, col };
}
//# sourceMappingURL=akari-plugin.js.map