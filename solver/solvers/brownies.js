import { BaseSolver } from '../core/solver.js';
import { SolveStatus } from '../core/types.js';
function posToKey(pos) {
    return `${pos.y},${pos.x}`;
}
// Field state for Brownies
export class BrowniesField {
    height;
    width;
    // Fixed numbers (from clues). -1 means blank.
    numbers;
    // Current brownie positions (list of positions in reading order)
    brownies;
    // Candidate target positions for each brownie start
    candidates;
    constructor(height, width, numbers, brownies, candidates) {
        this.height = height;
        this.width = width;
        this.numbers = numbers;
        this.brownies = brownies;
        this.candidates = candidates;
    }
    static fromInput(input) {
        const numbers = Array.from({ length: input.height }, () => Array(input.width).fill(-1));
        const brownies = [];
        input.clues.forEach((c) => {
            numbers[c.y][c.x] = c.value;
            if (c.value === 9) {
                brownies.push({ y: c.y, x: c.x });
            }
        });
        // Build candidates: each 9 can move orthogonally until another clue
        const candidates = new Map();
        for (const b of brownies) {
            const key = posToKey(b);
            const set = new Set();
            set.add(key); // staying put is allowed
            const deltas = [
                { dy: -1, dx: 0 },
                { dy: 1, dx: 0 },
                { dy: 0, dx: -1 },
                { dy: 0, dx: 1 },
            ];
            for (const d of deltas) {
                let y = b.y + d.dy;
                let x = b.x + d.dx;
                while (y >= 0 && y < input.height && x >= 0 && x < input.width) {
                    if (numbers[y][x] !== -1)
                        break; // stop at other clue
                    set.add(posToKey({ y, x }));
                    y += d.dy;
                    x += d.dx;
                }
            }
            candidates.set(key, set);
        }
        return new BrowniesField(input.height, input.width, numbers, brownies, candidates);
    }
    clone() {
        const clonedCandidates = new Map();
        this.candidates.forEach((set, k) => clonedCandidates.set(k, new Set(set)));
        return new BrowniesField(this.height, this.width, this.numbers.map((r) => [...r]), [...this.brownies], clonedCandidates);
    }
    isSolved() {
        // Solved if each brownie has a single candidate (fixed position) and constraints hold
        for (const set of this.candidates.values()) {
            if (set.size !== 1)
                return false;
        }
        return this.check();
    }
    getStateDump() {
        const assignments = [...this.candidates.entries()]
            .map(([from, set]) => `${from}:${[...set].sort().join('|')}`)
            .sort();
        return assignments.join(',');
    }
    // Constraint: after assigning positions, number brownies by reading order and each must see its number
    check() {
        // Build set of occupied cells
        const occupied = new Set();
        const fixed = [];
        for (const [, set] of this.candidates.entries()) {
            if (set.size === 1) {
                const posKey = [...set][0];
                if (occupied.has(posKey))
                    return false; // collision
                occupied.add(posKey);
                const [y, x] = posKey.split(',').map(Number);
                fixed.push({ y, x });
            }
        }
        if (fixed.length !== this.brownies.length)
            return true; // not all placed yet
        // Sort brownies by reading order and assign numbers starting from 0
        fixed.sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
        for (let i = 0; i < fixed.length; i++) {
            const targetNum = i;
            const pos = fixed[i];
            if (!this.seesNumber(pos, targetNum, occupied)) {
                return false;
            }
        }
        return true;
    }
    seesNumber(pos, target, occupied) {
        // Look in four directions until boundary or occupied brownie or fixed clue number (non -1)
        const deltas = [
            { dy: -1, dx: 0 },
            { dy: 1, dx: 0 },
            { dy: 0, dx: -1 },
            { dy: 0, dx: 1 },
        ];
        for (const d of deltas) {
            let y = pos.y + d.dy;
            let x = pos.x + d.dx;
            while (y >= 0 && y < this.height && x >= 0 && x < this.width) {
                const key = posToKey({ y, x });
                if (occupied.has(key))
                    break;
                const clue = this.numbers[y][x];
                if (clue !== -1) {
                    if (clue === target)
                        return true;
                    break;
                }
                y += d.dy;
                x += d.dx;
            }
        }
        return false;
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            changed = false;
            // Remove candidates that collide with fixed placements
            const fixed = new Set();
            this.candidates.forEach((set) => {
                if (set.size === 1)
                    fixed.add([...set][0]);
            });
            this.candidates.forEach((set, from) => {
                const before = set.size;
                for (const pos of [...set]) {
                    if (fixed.has(pos) && set.size > 1) {
                        set.delete(pos);
                    }
                }
                if (set.size === 0) {
                    set.add(from); // avoid empty; will fail later
                }
                if (set.size !== before)
                    changed = true;
            });
            // If all fixed, check constraints
            if ([...this.candidates.values()].every((s) => s.size === 1)) {
                return this.check();
            }
        }
        return true;
    }
    // Branch on a candidate with multiple options
    candSolve() {
        // pick a brownie with largest candidate set
        let targetKey = null;
        let maxSize = 1;
        this.candidates.forEach((set, key) => {
            if (set.size > maxSize) {
                maxSize = set.size;
                targetKey = key;
            }
        });
        if (!targetKey)
            return [];
        const set = this.candidates.get(targetKey);
        return [...set].map((posKey) => {
            const clone = this.clone();
            clone.candidates.set(targetKey, new Set([posKey]));
            return clone;
        });
    }
}
export class BrowniesSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    getBranchCandidates(state) {
        return state.candSolve().map((nextState) => ({
            apply: () => nextState,
        }));
    }
}
export function solveBrownies(input) {
    const field = BrowniesField.fromInput(input);
    const solver = new BrowniesSolver(field);
    const result = solver.solve();
    if (result.status === SolveStatus.SOLVED) {
        return result;
    }
    return result;
}
//# sourceMappingURL=brownies.js.map