/**
 * Component Constraint Plugin
 *
 * Handles connectivity constraints found in puzzles like:
 * - Nurikabe (black connected, white islands)
 * - Fillomino (polyomino sizes)
 * - Hitori (white connectivity)
 * - LITS (tetromino shapes)
 */
import { DIRECTIONS, DIRECTIONS_8, adjacent, adjacent8, posKey } from '../../core/types.js';
import { PropagationResult } from '../../core/field.js';
/**
 * Find all connected components in a grid
 */
export function findComponents(grid, matches, diagonal = false) {
    const visited = new Set();
    const components = [];
    let componentId = 0;
    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            const pos = { row, col };
            const key = posKey(pos);
            if (visited.has(key))
                continue;
            if (!matches(grid.get(pos), pos))
                continue;
            // BFS to find component
            const component = [];
            const queue = [pos];
            visited.add(key);
            while (queue.length > 0) {
                const current = queue.shift();
                component.push(current);
                const directions = diagonal ? DIRECTIONS_8 : DIRECTIONS;
                for (const dir of directions) {
                    const next = diagonal ? adjacent8(current, dir) : adjacent(current, dir);
                    const nextKey = posKey(next);
                    if (visited.has(nextKey))
                        continue;
                    if (!grid.inBounds(next))
                        continue;
                    if (!matches(grid.get(next), next))
                        continue;
                    visited.add(nextKey);
                    queue.push(next);
                }
            }
            components.push({
                positions: component,
                id: componentId++,
                size: component.length,
            });
        }
    }
    return components;
}
/**
 * Check if all matching cells are connected
 */
export function isConnected(grid, matches, diagonal = false) {
    const components = findComponents(grid, matches, diagonal);
    const matchingCount = grid.findAll((v, p) => matches(v, p)).length;
    if (matchingCount === 0)
        return true;
    return components.length === 1 && components[0].size === matchingCount;
}
/**
 * Get the component containing a specific position
 */
export function getComponentAt(grid, pos, matches, diagonal = false) {
    if (!grid.inBounds(pos) || !matches(grid.get(pos), pos)) {
        return null;
    }
    const visited = new Set();
    const component = [];
    const queue = [pos];
    visited.add(posKey(pos));
    while (queue.length > 0) {
        const current = queue.shift();
        component.push(current);
        const directions = diagonal ? DIRECTIONS_8 : DIRECTIONS;
        for (const dir of directions) {
            const next = diagonal ? adjacent8(current, dir) : adjacent(current, dir);
            const nextKey = posKey(next);
            if (visited.has(nextKey))
                continue;
            if (!grid.inBounds(next))
                continue;
            if (!matches(grid.get(next), next))
                continue;
            visited.add(nextKey);
            queue.push(next);
        }
    }
    return {
        positions: component,
        id: 0,
        size: component.length,
    };
}
/**
 * Check if a position is an articulation point (removing it disconnects the component)
 */
export function isArticulationPoint(grid, pos, matches, diagonal = false) {
    // Get neighbors that match
    const directions = diagonal ? DIRECTIONS_8 : DIRECTIONS;
    const matchingNeighbors = [];
    for (const dir of directions) {
        const next = diagonal ? adjacent8(pos, dir) : adjacent(pos, dir);
        if (grid.inBounds(next) && matches(grid.get(next), next)) {
            matchingNeighbors.push(next);
        }
    }
    if (matchingNeighbors.length <= 1)
        return false;
    // Check if removing this cell disconnects neighbors
    const visited = new Set();
    visited.add(posKey(pos)); // Mark current cell as visited (removed)
    const queue = [matchingNeighbors[0]];
    visited.add(posKey(matchingNeighbors[0]));
    while (queue.length > 0) {
        const current = queue.shift();
        for (const dir of directions) {
            const next = diagonal ? adjacent8(current, dir) : adjacent(current, dir);
            const nextKey = posKey(next);
            if (visited.has(nextKey))
                continue;
            if (!grid.inBounds(next))
                continue;
            if (!matches(grid.get(next), next))
                continue;
            visited.add(nextKey);
            queue.push(next);
        }
    }
    // Check if all matching neighbors were reached
    for (const neighbor of matchingNeighbors) {
        if (!visited.has(posKey(neighbor))) {
            return true; // Neighbor not reachable = articulation point
        }
    }
    return false;
}
/**
 * Generic component constraint
 */
export class ComponentConstraint {
    type = 'component';
    name;
    grid = null;
    matches;
    diagonal;
    expectedCount;
    expectedSize;
    minSize;
    maxSize;
    requireConnected;
    constructor(params) {
        this.matches = params.matches;
        this.diagonal = params.diagonal ?? false;
        this.expectedCount = params.expectedCount ?? null;
        this.expectedSize = params.expectedSize ?? null;
        this.minSize = params.minSize ?? null;
        this.maxSize = params.maxSize ?? null;
        this.requireConnected = params.requireConnected ?? false;
        this.name = 'Component';
    }
    setGrid(grid) {
        this.grid = grid;
    }
    propagate(_state) {
        // Component constraints are typically check-only
        // Propagation would require puzzle-specific logic
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(_state) {
        if (!this.grid)
            return true;
        const matchFn = (_v, p) => this.matches(p.row, p.col);
        const components = findComponents(this.grid, matchFn, this.diagonal);
        // Check connectivity requirement
        if (this.requireConnected) {
            const matchingCount = this.grid.findAll((_v, p) => this.matches(p.row, p.col)).length;
            if (matchingCount > 0 && (components.length !== 1 || components[0].size !== matchingCount)) {
                return false;
            }
        }
        // Check expected count
        if (this.expectedCount !== null && components.length !== this.expectedCount) {
            return false;
        }
        // Check size constraints
        for (const comp of components) {
            if (this.expectedSize !== null && comp.size !== this.expectedSize) {
                return false;
            }
            if (this.minSize !== null && comp.size < this.minSize) {
                return false;
            }
            if (this.maxSize !== null && comp.size > this.maxSize) {
                return false;
            }
        }
        return true;
    }
}
/**
 * Factory for component constraints
 */
export function createComponentConstraint(params) {
    return new ComponentConstraint(params);
}
//# sourceMappingURL=component.js.map