/**
 * Hashiwokakero (Bridges) Solver using Plugin Architecture
 *
 * Demonstrates how to use bridge/edge constraints.
 * Rules:
 * - Islands are connected by bridges (1 or 2 bridges per connection)
 * - Bridges run horizontally or vertically
 * - Bridges cannot cross
 * - Each island has a number showing total bridges connecting to it
 * - All islands must be connected in a single network
 */
import { posKey, } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
// ============================================
// Helper functions
// ============================================
/**
 * Find next island in a direction from a position
 */
function findNextIsland(state, row, col, dr, dc) {
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < state.height && c >= 0 && c < state.width) {
        if (state.islands.get(r, c) !== null) {
            return { row: r, col: c };
        }
        // Check for crossing bridges
        if (dr === 0) {
            // Moving horizontally, check vertical bridges
            if (r > 0 && state.vBridges.get(r - 1, c) > 0) {
                return null; // Bridge crosses
            }
        }
        else {
            // Moving vertically, check horizontal bridges
            if (c > 0 && state.hBridges.get(r, c - 1) > 0) {
                return null; // Bridge crosses
            }
        }
        r += dr;
        c += dc;
    }
    return null;
}
/**
 * Get bridge count between two islands
 */
function getBridgeCount(state, from, to) {
    if (from.row === to.row) {
        // Horizontal bridge
        const minCol = Math.min(from.col, to.col);
        return state.hBridges.get(from.row, minCol);
    }
    else {
        // Vertical bridge
        const minRow = Math.min(from.row, to.row);
        return state.vBridges.get(minRow, from.col);
    }
}
/**
 * Count total bridges connected to an island
 */
function countBridges(state, row, col) {
    let current = 0;
    let possible = 0;
    // Check all 4 directions
    const directions = [
        { dr: 0, dc: 1 }, // right
        { dr: 0, dc: -1 }, // left
        { dr: 1, dc: 0 }, // down
        { dr: -1, dc: 0 }, // up
    ];
    for (const { dr, dc } of directions) {
        const neighbor = findNextIsland(state, row, col, dr, dc);
        if (neighbor) {
            const bridges = getBridgeCount(state, { row, col }, neighbor);
            if (bridges > 0) {
                current += bridges;
                possible += bridges;
            }
            else if (bridges === 0) {
                possible += 2; // Unknown, could be 0-2
            }
            // bridges === -1 means no bridge possible
        }
    }
    return { current, possible };
}
// ============================================
// Hashiwokakero Constraints
// ============================================
/**
 * Constraint: Island bridge count matches its number
 */
export class IslandBridgeCountConstraint {
    type = 'island-bridge-count';
    name = 'Island Bridge Count';
    propagate(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                const num = state.islands.get(row, col);
                if (num === null)
                    continue;
                const { current, possible } = countBridges(state, row, col);
                // Too many bridges
                if (current > num)
                    return PropagationResult.CONTRADICTION;
                // Can't reach required number
                if (possible < num)
                    return PropagationResult.CONTRADICTION;
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                const num = state.islands.get(row, col);
                if (num === null)
                    continue;
                const { current } = countBridges(state, row, col);
                if (current !== num)
                    return false;
            }
        }
        return true;
    }
}
/**
 * Constraint: All islands must be connected
 */
export class AllConnectedConstraint {
    type = 'all-connected';
    name = 'All Connected';
    propagate(_state) {
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        // Find all islands
        const islands = [];
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.islands.get(row, col) !== null) {
                    islands.push({ row, col });
                }
            }
        }
        if (islands.length === 0)
            return true;
        // BFS from first island
        const visited = new Set();
        const queue = [islands[0]];
        visited.add(posKey(islands[0]));
        while (queue.length > 0) {
            const pos = queue.shift();
            // Check all 4 directions
            const directions = [
                { dr: 0, dc: 1 },
                { dr: 0, dc: -1 },
                { dr: 1, dc: 0 },
                { dr: -1, dc: 0 },
            ];
            for (const { dr, dc } of directions) {
                const neighbor = findNextIsland(state, pos.row, pos.col, dr, dc);
                if (neighbor) {
                    const bridges = getBridgeCount(state, pos, neighbor);
                    if (bridges > 0) {
                        const key = posKey(neighbor);
                        if (!visited.has(key)) {
                            visited.add(key);
                            queue.push(neighbor);
                        }
                    }
                }
            }
        }
        return visited.size === islands.length;
    }
}
/**
 * Constraint: Bridges cannot cross
 */
export class NoCrossingConstraint {
    type = 'no-crossing';
    name = 'No Crossing';
    propagate(state) {
        // Check each cell for crossing bridges
        for (let row = 0; row < state.height - 1; row++) {
            for (let col = 0; col < state.width - 1; col++) {
                const hBridge = state.hBridges.get(row, col);
                const vBridge = state.vBridges.get(row, col);
                // Both bridges at same position means crossing
                if (hBridge > 0 && vBridge > 0) {
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
export function createHashiRunner() {
    const runner = new ConstraintRunner();
    runner.addConstraints([
        new IslandBridgeCountConstraint(),
        new AllConnectedConstraint(),
        new NoCrossingConstraint(),
    ]);
    return runner;
}
/**
 * Get possible bridge placements
 */
export function getPossibleBridges(state) {
    const bridges = [];
    // Find all island pairs that could have bridges
    for (let row = 0; row < state.height; row++) {
        for (let col = 0; col < state.width; col++) {
            if (state.islands.get(row, col) === null)
                continue;
            // Check right
            const rightNeighbor = findNextIsland(state, row, col, 0, 1);
            if (rightNeighbor && state.hBridges.get(row, col) === 0) {
                bridges.push({
                    row,
                    col,
                    horizontal: true,
                    from: { row, col },
                    to: rightNeighbor,
                });
            }
            // Check down
            const downNeighbor = findNextIsland(state, row, col, 1, 0);
            if (downNeighbor && state.vBridges.get(row, col) === 0) {
                bridges.push({
                    row,
                    col,
                    horizontal: false,
                    from: { row, col },
                    to: downNeighbor,
                });
            }
        }
    }
    return bridges;
}
/**
 * Clone state
 */
export function cloneState(state) {
    return {
        height: state.height,
        width: state.width,
        islands: state.islands.clone(),
        hBridges: state.hBridges.clone(),
        vBridges: state.vBridges.clone(),
    };
}
/**
 * Set bridge between two islands
 */
function setBridge(state, from, to, count) {
    if (from.row === to.row) {
        // Horizontal
        const minCol = Math.min(from.col, to.col);
        const maxCol = Math.max(from.col, to.col);
        for (let c = minCol; c < maxCol; c++) {
            state.hBridges.set(from.row, c, count);
        }
    }
    else {
        // Vertical
        const minRow = Math.min(from.row, to.row);
        const maxRow = Math.max(from.row, to.row);
        for (let r = minRow; r < maxRow; r++) {
            state.vBridges.set(r, from.col, count);
        }
    }
}
/**
 * Simple solver using plugin constraints
 */
export function solveHashi(state) {
    const runner = createHashiRunner();
    // Run propagation
    const { result } = runner.run(state);
    if (result === PropagationResult.CONTRADICTION) {
        return null;
    }
    // Check if solved
    if (runner.checkAll(state)) {
        return state;
    }
    // Find undecided bridge placement
    const possibleBridges = getPossibleBridges(state);
    if (possibleBridges.length === 0) {
        return null;
    }
    const bridge = possibleBridges[0];
    // Try 0, 1, 2 bridges
    for (const count of [1, 2, 0]) {
        const newState = cloneState(state);
        if (count === 0) {
            setBridge(newState, bridge.from, bridge.to, -1);
        }
        else {
            setBridge(newState, bridge.from, bridge.to, count);
        }
        const solution = solveHashi(newState);
        if (solution)
            return solution;
    }
    return null;
}
/**
 * Create initial state from puzzle
 */
export function createHashiState(height, width, islands) {
    const islandGrid = new Grid(height, width, () => null);
    const hBridges = new Grid(height, width, () => 0);
    const vBridges = new Grid(height, width, () => 0);
    for (const island of islands) {
        islandGrid.set(island.row, island.col, island.value);
    }
    return { height, width, islands: islandGrid, hBridges, vBridges };
}
//# sourceMappingURL=hashiwokakero-plugin.js.map