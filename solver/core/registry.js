/**
 * Plugin Registry System
 *
 * Provides type-safe registries for constraints, views, heuristics, and generators.
 * Each plugin type can be registered with a unique ID and factory function.
 */
// ============================================
// Base Registry
// ============================================
/**
 * Generic plugin registry with type-safe registration and retrieval
 */
export class PluginRegistry {
    plugins = new Map();
    /**
     * Register a plugin factory
     * @param id Unique plugin identifier
     * @param factory Function that creates plugin instances
     */
    register(id, factory) {
        if (this.plugins.has(id)) {
            throw new Error(`Plugin '${id}' is already registered`);
        }
        this.plugins.set(id, factory);
    }
    /**
     * Create a plugin instance
     * @param id Plugin identifier
     * @param params Parameters to pass to the factory
     */
    create(id, params) {
        const factory = this.plugins.get(id);
        if (!factory) {
            throw new Error(`Plugin '${id}' not found. Available: ${this.list().join(', ')}`);
        }
        return factory(params);
    }
    /**
     * Check if a plugin is registered
     */
    has(id) {
        return this.plugins.has(id);
    }
    /**
     * List all registered plugin IDs
     */
    list() {
        return Array.from(this.plugins.keys());
    }
    /**
     * Unregister a plugin
     */
    unregister(id) {
        return this.plugins.delete(id);
    }
    /**
     * Clear all registered plugins
     */
    clear() {
        this.plugins.clear();
    }
}
// ============================================
// Constraint Plugin System
// ============================================
// Re-export PropagationResult from field.js for convenience
export { PropagationResult } from './field.js';
/**
 * Registry for constraint plugins
 */
export class ConstraintRegistry extends PluginRegistry {
    /**
     * Create multiple constraints from specifications
     */
    createAll(specs) {
        return specs.map(spec => this.create(spec.type, spec.params));
    }
}
/**
 * Registry for view plugins
 */
export class ViewRegistry extends PluginRegistry {
}
/**
 * Registry for heuristic plugins
 */
export class HeuristicRegistry extends PluginRegistry {
}
/**
 * Registry for generator plugins
 */
export class GeneratorRegistry extends PluginRegistry {
}
// ============================================
// Global Registries
// ============================================
/**
 * Global constraint registry (generic, use createConstraintRegistry for typed version)
 */
export const constraintRegistry = new ConstraintRegistry();
/**
 * Global view registry
 */
export const viewRegistry = new ViewRegistry();
/**
 * Global heuristic registry
 */
export const heuristicRegistry = new HeuristicRegistry();
/**
 * Global generator registry
 */
export const generatorRegistry = new GeneratorRegistry();
// ============================================
// Factory Functions for Typed Registries
// ============================================
/**
 * Create a typed constraint registry
 */
export function createConstraintRegistry() {
    return new ConstraintRegistry();
}
/**
 * Create a typed view registry
 */
export function createViewRegistry() {
    return new ViewRegistry();
}
/**
 * Create a typed heuristic registry
 */
export function createHeuristicRegistry() {
    return new HeuristicRegistry();
}
/**
 * Create a typed generator registry
 */
export function createGeneratorRegistry() {
    return new GeneratorRegistry();
}
//# sourceMappingURL=registry.js.map