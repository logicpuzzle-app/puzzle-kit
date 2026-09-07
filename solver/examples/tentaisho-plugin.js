/**
 * Tentaisho (Spiral Galaxies) Solver using Plugin Architecture
 *
 * Demonstrates how to use point symmetry constraints.
 * Rules:
 * - Divide the grid into regions
 * - Each region contains exactly one star (center point)
 * - Each region must be 180° rotationally symmetric around its star
 */
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
// ============================================
// Helper functions
// ============================================
/**
 * Get symmetric position for a cell around a star
 */
function getSymmetricCell(star, row, col) {
    const cellRow2 = row * 2 + 1;
    const cellCol2 = col * 2 + 1;
    const symRow2 = 2 * star.row2 - cellRow2;
    const symCol2 = 2 * star.col2 - cellCol2;
    const symRow = (symRow2 - 1) / 2;
    const symCol = (symCol2 - 1) / 2;
    if (Number.isInteger(symRow) && Number.isInteger(symCol)) {
        return { row: symRow, col: symCol };
    }
    return null;
}
/**
 * Check if a region is connected using BFS
 */
function isRegionConnected(cells) {
    if (cells.length === 0)
        return true;
    if (cells.length === 1)
        return true;
    const cellSet = new Set(cells.map(c => `${c.row},${c.col}`));
    const visited = new Set();
    const queue = [cells[0]];
    visited.add(`${cells[0].row},${cells[0].col}`);
    while (queue.length > 0) {
        const current = queue.shift();
        const neighbors = [
            { row: current.row - 1, col: current.col },
            { row: current.row + 1, col: current.col },
            { row: current.row, col: current.col - 1 },
            { row: current.row, col: current.col + 1 },
        ];
        for (const n of neighbors) {
            const key = `${n.row},${n.col}`;
            if (cellSet.has(key) && !visited.has(key)) {
                visited.add(key);
                queue.push(n);
            }
        }
    }
    return visited.size === cells.length;
}
// ============================================
// Tentaisho Constraints
// ============================================
/**
 * Constraint: All cells must be assigned to a region
 */
export class AllCellsAssignedConstraint {
    type = 'all-assigned';
    name = 'All Cells Assigned';
    propagate(_state) {
        // No contradiction detection in propagation
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.regions.get(row, col) < 0)
                    return false;
            }
        }
        return true;
    }
}
/**
 * Constraint: Regions must be symmetric around their stars
 */
export class SymmetryConstraint {
    type = 'symmetry';
    name = 'Point Symmetry';
    propagate(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                const regionId = state.regions.get(row, col);
                if (regionId < 0)
                    continue;
                const star = state.stars[regionId];
                const sym = getSymmetricCell(star, row, col);
                if (!sym)
                    return PropagationResult.CONTRADICTION;
                if (sym.row < 0 || sym.row >= state.height ||
                    sym.col < 0 || sym.col >= state.width) {
                    return PropagationResult.CONTRADICTION;
                }
                const symRegion = state.regions.get(sym.row, sym.col);
                if (symRegion >= 0 && symRegion !== regionId) {
                    return PropagationResult.CONTRADICTION;
                }
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                const regionId = state.regions.get(row, col);
                if (regionId < 0)
                    return false;
                const star = state.stars[regionId];
                const sym = getSymmetricCell(star, row, col);
                if (!sym)
                    return false;
                if (state.regions.get(sym.row, sym.col) !== regionId)
                    return false;
            }
        }
        return true;
    }
}
/**
 * Constraint: Each region must be connected
 */
export class RegionConnectivityConstraint {
    type = 'connectivity';
    name = 'Region Connectivity';
    propagate(_state) {
        // Connectivity is checked in isSatisfied
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let i = 0; i < state.stars.length; i++) {
            const cells = [];
            for (let row = 0; row < state.height; row++) {
                for (let col = 0; col < state.width; col++) {
                    if (state.regions.get(row, col) === i) {
                        cells.push({ row, col });
                    }
                }
            }
            if (!isRegionConnected(cells))
                return false;
        }
        return true;
    }
}
// ============================================
// Solver
// ============================================
export function createTentaishoRunner() {
    const runner = new ConstraintRunner();
    runner.addConstraints([
        new AllCellsAssignedConstraint(),
        new SymmetryConstraint(),
        new RegionConnectivityConstraint(),
    ]);
    return runner;
}
/**
 * Get unassigned cells
 */
export function getUnassignedCells(state) {
    const cells = [];
    for (let row = 0; row < state.height; row++) {
        for (let col = 0; col < state.width; col++) {
            if (state.regions.get(row, col) < 0) {
                cells.push({ row, col });
            }
        }
    }
    return cells;
}
/**
 * Get possible star assignments for a cell
 */
export function getPossibleStars(state, row, col) {
    const possible = [];
    for (let i = 0; i < state.stars.length; i++) {
        const star = state.stars[i];
        const sym = getSymmetricCell(star, row, col);
        if (sym && sym.row >= 0 && sym.row < state.height &&
            sym.col >= 0 && sym.col < state.width) {
            // Check symmetric cell is either unassigned or already this region
            const symRegion = state.regions.get(sym.row, sym.col);
            if (symRegion < 0 || symRegion === i) {
                possible.push(i);
            }
        }
    }
    return possible;
}
/**
 * Clone state
 */
export function cloneState(state) {
    return {
        height: state.height,
        width: state.width,
        regions: state.regions.clone(),
        stars: state.stars.map(s => ({ ...s })),
    };
}
/**
 * Assign a cell and its symmetric partner to a region
 */
function assignCell(state, row, col, starId) {
    const star = state.stars[starId];
    const sym = getSymmetricCell(star, row, col);
    if (!sym)
        return false;
    state.regions.set(row, col, starId);
    state.regions.set(sym.row, sym.col, starId);
    return true;
}
/**
 * Simple solver using plugin constraints
 */
export function solveTentaisho(state) {
    const runner = createTentaishoRunner();
    // Run propagation
    const { result } = runner.run(state);
    if (result === PropagationResult.CONTRADICTION) {
        return null;
    }
    // Check if solved
    const unassigned = getUnassignedCells(state);
    if (unassigned.length === 0 && runner.checkAll(state)) {
        return state;
    }
    if (unassigned.length === 0) {
        return null;
    }
    // Branch on first unassigned cell
    const pos = unassigned[0];
    const possible = getPossibleStars(state, pos.row, pos.col);
    for (const starId of possible) {
        const newState = cloneState(state);
        if (assignCell(newState, pos.row, pos.col, starId)) {
            const solution = solveTentaisho(newState);
            if (solution)
                return solution;
        }
    }
    return null;
}
/**
 * Create initial state from puzzle
 * Stars are specified with half-integer coordinates (row2, col2)
 */
export function createTentaishoState(height, width, stars) {
    const regions = new Grid(height, width, () => -1);
    const starList = stars.map((s, i) => ({
        row2: s.row2,
        col2: s.col2,
        id: i,
    }));
    return { height, width, regions, stars: starList };
}
//# sourceMappingURL=tentaisho-plugin.js.map