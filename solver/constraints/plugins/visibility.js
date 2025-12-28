/**
 * Visibility Constraint Plugin
 *
 * Handles line-of-sight constraints found in puzzles like:
 * - Akari (light beams)
 * - Skyscrapers (viewing buildings)
 * - Kurodoko (visibility counts)
 * - View (sight lines)
 */
import { Direction, DIRECTIONS, adjacent } from '../../core/types.js';
import { PropagationResult } from '../../core/field.js';
/**
 * Get all cells visible from a position
 */
export function getVisiblePositions(grid, pos, directions, isBlocker) {
    const visible = [];
    for (const dir of directions) {
        let current = adjacent(pos, dir);
        while (grid.inBounds(current)) {
            const value = grid.get(current);
            if (isBlocker(value, current))
                break;
            visible.push({ ...current });
            current = adjacent(current, dir);
        }
    }
    return visible;
}
/**
 * Count visible cells matching a predicate
 */
export function countVisible(grid, pos, directions, isBlocker, isTarget) {
    let count = 0;
    let possible = 0;
    for (const dir of directions) {
        let current = adjacent(pos, dir);
        while (grid.inBounds(current)) {
            const value = grid.get(current);
            if (isBlocker(value, current))
                break;
            if (isTarget(value, current)) {
                count++;
                possible++;
            }
            else {
                // Unknown cell - could become target
                possible++;
            }
            current = adjacent(current, dir);
        }
    }
    return { count, possible };
}
/**
 * Generic visibility constraint
 * Can be configured for different puzzle types
 */
export class VisibilityConstraint {
    type = 'visibility';
    name;
    grid = null;
    directions;
    isBlocker;
    isTarget;
    expectedCount;
    position;
    constructor(params) {
        this.directions = params.directions ?? DIRECTIONS;
        this.isBlocker = params.isBlocker;
        this.isTarget = params.isTarget ?? (() => true);
        this.expectedCount = params.expectedCount ?? null;
        this.position = params.position ?? null;
        this.name = `Visibility${this.position ? ` at (${this.position.row},${this.position.col})` : ''}`;
    }
    /**
     * Set the grid for this constraint
     * Must be called before propagate/isSatisfied
     */
    setGrid(grid) {
        this.grid = grid;
    }
    propagate(_state) {
        // This is a checking constraint, not a propagating one
        // Subclasses can override for specific propagation logic
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(_state) {
        if (!this.grid || !this.position || this.expectedCount === null) {
            return true; // No constraint to check
        }
        let count = 0;
        for (const dir of this.directions) {
            let current = adjacent(this.position, dir);
            while (this.grid.inBounds(current)) {
                if (this.isBlocker(current.row, current.col))
                    break;
                if (this.isTarget(current.row, current.col)) {
                    count++;
                }
                current = adjacent(current, dir);
            }
        }
        return count === this.expectedCount;
    }
}
/**
 * Factory function for visibility constraints
 */
export function createVisibilityConstraint(params) {
    return new VisibilityConstraint(params);
}
/**
 * Check if two positions can see each other
 */
export function canSee(grid, from, to, isBlocker) {
    // Must be on same row or column
    if (from.row !== to.row && from.col !== to.col) {
        return false;
    }
    // Determine direction
    let dir;
    if (from.row === to.row) {
        dir = from.col < to.col ? Direction.RIGHT : Direction.LEFT;
    }
    else {
        dir = from.row < to.row ? Direction.DOWN : Direction.UP;
    }
    // Walk from 'from' toward 'to'
    let current = adjacent(from, dir);
    while (!positionEquals(current, to)) {
        if (!grid.inBounds(current))
            return false;
        if (isBlocker(grid.get(current), current))
            return false;
        current = adjacent(current, dir);
    }
    return true;
}
function positionEquals(a, b) {
    return a.row === b.row && a.col === b.col;
}
//# sourceMappingURL=visibility.js.map