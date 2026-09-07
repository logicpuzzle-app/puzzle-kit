/**
 * Pattern Match Constraint Plugin
 *
 * Handles local pattern constraints found in puzzles like:
 * - Nurikabe (2x2 black pool forbidden)
 * - Tapa (run-length patterns)
 * - Masyu (turn/straight rules)
 * - Heyawake (region crossing limits)
 */
import { adjacent } from '../../core/types.js';
import { PropagationResult } from '../../core/field.js';
/**
 * Check if a 2x2 area contains all matching values (pool check)
 */
export function has2x2Pool(grid, matches) {
    for (let row = 0; row < grid.height - 1; row++) {
        for (let col = 0; col < grid.width - 1; col++) {
            if (matches(grid.get(row, col)) &&
                matches(grid.get(row + 1, col)) &&
                matches(grid.get(row, col + 1)) &&
                matches(grid.get(row + 1, col + 1))) {
                return { row, col };
            }
        }
    }
    return null;
}
/**
 * Check if placing a value would create a 2x2 pool
 */
export function would2x2Pool(grid, pos, newValue, matches) {
    if (!matches(newValue))
        return false;
    // Check all 4 possible 2x2 squares that include this position
    const offsets = [
        [0, 0], [-1, 0], [0, -1], [-1, -1]
    ];
    for (const [dRow, dCol] of offsets) {
        const topLeft = { row: pos.row + dRow, col: pos.col + dCol };
        // Check if this 2x2 is within bounds
        if (topLeft.row < 0 || topLeft.row >= grid.height - 1 ||
            topLeft.col < 0 || topLeft.col >= grid.width - 1) {
            continue;
        }
        // Check all 4 cells
        let allMatch = true;
        for (let r = 0; r < 2 && allMatch; r++) {
            for (let c = 0; c < 2 && allMatch; c++) {
                const checkPos = { row: topLeft.row + r, col: topLeft.col + c };
                const value = positionEquals(checkPos, pos) ? newValue : grid.get(checkPos);
                if (!matches(value)) {
                    allMatch = false;
                }
            }
        }
        if (allMatch)
            return true;
    }
    return false;
}
/**
 * Count consecutive matching cells in a direction
 */
export function countRun(grid, start, dir, matches) {
    let count = 0;
    let current = start;
    while (grid.inBounds(current) && matches(grid.get(current))) {
        count++;
        current = adjacent(current, dir);
    }
    return count;
}
/**
 * Get run lengths around a cell (for Tapa-like puzzles)
 */
export function getRunLengths(grid, center, matches) {
    const runs = [];
    const neighbors = [];
    // Get 8 neighbors in order
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0)
                continue;
            const pos = { row: center.row + dr, col: center.col + dc };
            if (grid.inBounds(pos)) {
                neighbors.push(pos);
            }
        }
    }
    // Count runs
    let currentRun = 0;
    let inRun = false;
    let firstInRun = false;
    for (let i = 0; i < neighbors.length; i++) {
        const pos = neighbors[i];
        if (matches(grid.get(pos))) {
            currentRun++;
            inRun = true;
            if (i === 0)
                firstInRun = true;
        }
        else {
            if (inRun && currentRun > 0) {
                runs.push(currentRun);
                currentRun = 0;
            }
            inRun = false;
        }
    }
    // Handle wrap-around for first run
    if (inRun && currentRun > 0) {
        if (firstInRun && runs.length > 0) {
            // Merge with first run
            runs[0] += currentRun;
        }
        else {
            runs.push(currentRun);
        }
    }
    return runs.sort((a, b) => a - b);
}
/**
 * Generic pattern match constraint
 */
export class PatternMatchConstraint {
    type = 'pattern-match';
    name;
    patterns;
    grid = null;
    constructor(params) {
        this.patterns = params.patterns;
        this.grid = params.grid ?? null;
        this.name = `PatternMatch(${params.patterns.map(p => p.name).join(', ')})`;
    }
    setGrid(grid) {
        this.grid = grid;
    }
    propagate(_state) {
        if (!this.grid)
            return PropagationResult.NO_CHANGE;
        // Check for forbidden patterns
        for (const pattern of this.patterns) {
            if (pattern.action === 'forbid') {
                for (let row = 0; row < this.grid.height; row++) {
                    for (let col = 0; col < this.grid.width; col++) {
                        const anchor = { row, col };
                        const values = this.getPatternValues(anchor, pattern);
                        if (values && pattern.matches(values)) {
                            return PropagationResult.CONTRADICTION;
                        }
                    }
                }
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(_state) {
        if (!this.grid)
            return true;
        for (const pattern of this.patterns) {
            for (let row = 0; row < this.grid.height; row++) {
                for (let col = 0; col < this.grid.width; col++) {
                    const anchor = { row, col };
                    const values = this.getPatternValues(anchor, pattern);
                    if (!values)
                        continue;
                    const matches = pattern.matches(values);
                    if (pattern.action === 'forbid' && matches) {
                        return false;
                    }
                    if (pattern.action === 'require' && !matches) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    getPatternValues(anchor, pattern) {
        if (!this.grid)
            return null;
        const values = [];
        for (const relPos of pattern.positions) {
            const absPos = {
                row: anchor.row + relPos.row,
                col: anchor.col + relPos.col,
            };
            if (!this.grid.inBounds(absPos)) {
                return null; // Pattern doesn't fit
            }
            values.push(this.grid.get(absPos));
        }
        return values;
    }
}
/**
 * Factory for pattern match constraints
 */
export function createPatternMatchConstraint(params) {
    return new PatternMatchConstraint(params);
}
/**
 * Pre-built pattern: 2x2 pool forbidden
 */
export function create2x2ForbiddenPattern(matches) {
    return {
        name: '2x2-pool',
        positions: [
            { row: 0, col: 0 },
            { row: 0, col: 1 },
            { row: 1, col: 0 },
            { row: 1, col: 1 },
        ],
        matches: (values) => values.every(v => matches(v)),
        action: 'forbid',
    };
}
function positionEquals(a, b) {
    return a.row === b.row && a.col === b.col;
}
//# sourceMappingURL=pattern-match.js.map