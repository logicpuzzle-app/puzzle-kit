/**
 * Constraint Runner
 *
 * Manages constraint execution with dependency tracking and caching.
 * Implements the propagate-until-fixpoint pattern.
 */
import { PropagationResult } from './registry.js';
const DEFAULT_OPTIONS = {
    maxRounds: 1000,
    debug: false,
    timeout: 30000,
};
/**
 * Runs constraints until fixpoint or contradiction
 */
export class ConstraintRunner {
    constraints = [];
    views = [];
    viewCache = new Map();
    options;
    constructor(options) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }
    /**
     * Add a constraint to the runner
     */
    addConstraint(constraint) {
        this.constraints.push(constraint);
        return this;
    }
    /**
     * Add multiple constraints
     */
    addConstraints(constraints) {
        this.constraints.push(...constraints);
        return this;
    }
    /**
     * Add a view to the runner
     */
    addView(view) {
        this.views.push(view);
        return this;
    }
    /**
     * Get a cached view value, computing if necessary
     */
    getView(state, viewType) {
        const view = this.views.find(v => v.type === viewType);
        if (!view)
            return undefined;
        const cached = this.viewCache.get(viewType);
        const currentKeys = view.getDependencyKeys(state);
        // Check if cache is valid
        if (cached && this.arraysEqual(cached.keys, currentKeys)) {
            return cached.value;
        }
        // Compute and cache
        const value = view.compute(state);
        this.viewCache.set(viewType, { value, keys: currentKeys });
        return value;
    }
    /**
     * Invalidate all view caches
     */
    invalidateCache() {
        this.viewCache.clear();
    }
    /**
     * Run all constraints until fixpoint
     * @param state The field state (will be mutated)
     * @returns Propagation result and statistics
     */
    run(state) {
        const startTime = Date.now();
        const constraintsFired = new Map();
        let rounds = 0;
        // Initialize counters
        for (const c of this.constraints) {
            constraintsFired.set(c.type, 0);
        }
        while (rounds < this.options.maxRounds) {
            // Check timeout
            if (Date.now() - startTime > this.options.timeout) {
                return {
                    result: PropagationResult.NO_CHANGE,
                    stats: {
                        rounds,
                        constraintsFired,
                        timeMs: Date.now() - startTime,
                        result: PropagationResult.NO_CHANGE,
                    },
                };
            }
            rounds++;
            let changed = false;
            // Invalidate view cache at start of each round
            this.invalidateCache();
            // Run each constraint
            for (const constraint of this.constraints) {
                const result = constraint.propagate(state);
                if (this.options.debug) {
                    console.log(`[${constraint.type}] ${result}`);
                }
                if (result === PropagationResult.CONTRADICTION) {
                    return {
                        result: PropagationResult.CONTRADICTION,
                        stats: {
                            rounds,
                            constraintsFired,
                            timeMs: Date.now() - startTime,
                            result: PropagationResult.CONTRADICTION,
                        },
                    };
                }
                if (result === PropagationResult.CHANGED) {
                    changed = true;
                    constraintsFired.set(constraint.type, (constraintsFired.get(constraint.type) || 0) + 1);
                }
            }
            // Fixpoint reached
            if (!changed) {
                return {
                    result: PropagationResult.NO_CHANGE,
                    stats: {
                        rounds,
                        constraintsFired,
                        timeMs: Date.now() - startTime,
                        result: PropagationResult.NO_CHANGE,
                    },
                };
            }
        }
        // Max rounds exceeded
        if (this.options.debug) {
            console.warn(`Max rounds (${this.options.maxRounds}) exceeded`);
        }
        return {
            result: PropagationResult.CHANGED, // Still changing, might not be at fixpoint
            stats: {
                rounds,
                constraintsFired,
                timeMs: Date.now() - startTime,
                result: PropagationResult.CHANGED,
            },
        };
    }
    /**
     * Check if all constraints are satisfied
     */
    checkAll(state) {
        for (const constraint of this.constraints) {
            if (!constraint.isSatisfied(state)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Get list of unsatisfied constraints
     */
    getUnsatisfied(state) {
        return this.constraints.filter(c => !c.isSatisfied(state));
    }
    /**
     * Clone runner with same constraints but fresh cache
     */
    clone() {
        const runner = new ConstraintRunner(this.options);
        runner.constraints = [...this.constraints];
        runner.views = [...this.views];
        return runner;
    }
    arraysEqual(a, b) {
        if (a.length !== b.length)
            return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i])
                return false;
        }
        return true;
    }
}
/**
 * Create a constraint runner with the given constraints
 */
export function createRunner(constraints, options) {
    const runner = new ConstraintRunner(options);
    runner.addConstraints(constraints);
    return runner;
}
//# sourceMappingURL=constraint-runner.js.map