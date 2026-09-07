/**
 * Fillomino Solver using Plugin Architecture
 *
 * Demonstrates how to use polyomino/region constraints.
 * Rules:
 * - Fill all cells with numbers
 * - Connected cells with the same number form a region (polyomino)
 * - Each region's size equals its number
 * - Different regions with the same number cannot touch orthogonally
 */
import { DIRECTIONS, adjacent, posKey, } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
// ============================================
// Helper functions
// ============================================
/**
 * Find connected region with same value starting from a cell
 */
function findRegion(state, startRow, startCol) {
    const value = state.cells.get(startRow, startCol);
    if (value === 0)
        return [];
    const visited = new Set();
    const region = [];
    const queue = [{ row: startRow, col: startCol }];
    visited.add(posKey({ row: startRow, col: startCol }));
    while (queue.length > 0) {
        const pos = queue.shift();
        region.push(pos);
        for (const dir of DIRECTIONS) {
            const next = adjacent(pos, dir);
            const key = posKey(next);
            if (!visited.has(key) &&
                state.cells.inBounds(next) &&
                state.cells.get(next) === value) {
                visited.add(key);
                queue.push(next);
            }
        }
    }
    return region;
}
/**
 * Count unknown neighbors of a region
 */
function countUnknownNeighbors(state, region) {
    const regionSet = new Set(region.map(p => posKey(p)));
    const unknownSet = new Set();
    for (const pos of region) {
        for (const dir of DIRECTIONS) {
            const next = adjacent(pos, dir);
            const key = posKey(next);
            if (!regionSet.has(key) &&
                state.cells.inBounds(next) &&
                state.cells.get(next) === 0) {
                unknownSet.add(key);
            }
        }
    }
    return unknownSet.size;
}
// ============================================
// Fillomino Constraints
// ============================================
/**
 * Constraint: Region size must equal its number
 */
export class RegionSizeConstraint {
    type = 'region-size';
    name = 'Region Size';
    propagate(state) {
        const visited = new Set();
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                const value = state.cells.get(row, col);
                if (value === 0)
                    continue;
                const key = posKey({ row, col });
                if (visited.has(key))
                    continue;
                const region = findRegion(state, row, col);
                for (const p of region) {
                    visited.add(posKey(p));
                }
                // Region too large
                if (region.length > value) {
                    return PropagationResult.CONTRADICTION;
                }
                // Region can't grow enough
                const unknowns = countUnknownNeighbors(state, region);
                if (region.length + unknowns < value) {
                    return PropagationResult.CONTRADICTION;
                }
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        const visited = new Set();
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                const value = state.cells.get(row, col);
                if (value === 0)
                    return false; // Has unknown cells
                const key = posKey({ row, col });
                if (visited.has(key))
                    continue;
                const region = findRegion(state, row, col);
                for (const p of region) {
                    visited.add(posKey(p));
                }
                if (region.length !== value) {
                    return false;
                }
            }
        }
        return true;
    }
}
/**
 * Constraint: Different regions with same number cannot touch
 */
export class NoSameNumberTouchConstraint {
    type = 'no-same-touch';
    name = 'No Same Number Touch';
    propagate(state) {
        const regionMap = new Map(); // posKey -> region ID
        const regionValues = new Map(); // region ID -> value
        let regionId = 0;
        // Assign region IDs
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                const value = state.cells.get(row, col);
                if (value === 0)
                    continue;
                const key = posKey({ row, col });
                if (regionMap.has(key))
                    continue;
                const region = findRegion(state, row, col);
                for (const p of region) {
                    regionMap.set(posKey(p), regionId);
                }
                regionValues.set(regionId, value);
                regionId++;
            }
        }
        // Check for same-number regions touching
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                const value = state.cells.get(row, col);
                if (value === 0)
                    continue;
                const myRegion = regionMap.get(posKey({ row, col }));
                for (const dir of DIRECTIONS) {
                    const next = adjacent({ row, col }, dir);
                    if (!state.cells.inBounds(next))
                        continue;
                    const nextValue = state.cells.get(next);
                    if (nextValue === 0 || nextValue !== value)
                        continue;
                    const nextRegion = regionMap.get(posKey(next));
                    if (nextRegion !== undefined && nextRegion !== myRegion) {
                        // Two different regions with same number are touching
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
 * Constraint: All cells must be filled
 */
export class AllFilledConstraint {
    type = 'all-filled';
    name = 'All Filled';
    propagate(_state) {
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.cells.get(row, col) === 0) {
                    return false;
                }
            }
        }
        return true;
    }
}
// ============================================
// Solver
// ============================================
export function createFillominoRunner() {
    const runner = new ConstraintRunner();
    runner.addConstraints([
        new RegionSizeConstraint(),
        new NoSameNumberTouchConstraint(),
        new AllFilledConstraint(),
    ]);
    return runner;
}
/**
 * Get unknown cells for branching
 */
export function getUnknownCells(state) {
    const unknowns = [];
    for (let row = 0; row < state.height; row++) {
        for (let col = 0; col < state.width; col++) {
            if (state.cells.get(row, col) === 0) {
                unknowns.push({ row, col });
            }
        }
    }
    return unknowns;
}
/**
 * Get possible values for a cell based on neighbors
 */
function getPossibleValues(state, row, col) {
    const values = new Set();
    // Check neighbors for values to extend
    for (const dir of DIRECTIONS) {
        const next = adjacent({ row, col }, dir);
        if (state.cells.inBounds(next)) {
            const value = state.cells.get(next);
            if (value > 0) {
                const region = findRegion(state, next.row, next.col);
                if (region.length < value) {
                    values.add(value);
                }
            }
        }
    }
    // Also try starting new regions (1-9)
    for (let v = 1; v <= 9; v++) {
        values.add(v);
    }
    return Array.from(values).sort((a, b) => a - b);
}
/**
 * Clone state
 */
export function cloneState(state) {
    return {
        height: state.height,
        width: state.width,
        cells: state.cells.clone(),
        clues: state.clues.clone(),
    };
}
/**
 * Simple solver using plugin constraints
 */
export function solveFillomino(state) {
    const runner = createFillominoRunner();
    // Run propagation
    const { result } = runner.run(state);
    if (result === PropagationResult.CONTRADICTION) {
        return null;
    }
    // Check if solved
    const unknowns = getUnknownCells(state);
    if (unknowns.length === 0 && runner.checkAll(state)) {
        return state;
    }
    if (unknowns.length === 0) {
        return null;
    }
    // Branch on first unknown cell
    const pos = unknowns[0];
    const possibleValues = getPossibleValues(state, pos.row, pos.col);
    for (const value of possibleValues) {
        const newState = cloneState(state);
        newState.cells.set(pos, value);
        const solution = solveFillomino(newState);
        if (solution)
            return solution;
    }
    return null;
}
/**
 * Create initial state from puzzle
 */
export function createFillominoState(height, width, clues) {
    const cells = new Grid(height, width, () => 0);
    const clueGrid = new Grid(height, width, () => null);
    for (const clue of clues) {
        cells.set(clue.row, clue.col, clue.value);
        clueGrid.set(clue.row, clue.col, clue.value);
    }
    return { height, width, cells, clues: clueGrid };
}
//# sourceMappingURL=fillomino-plugin.js.map