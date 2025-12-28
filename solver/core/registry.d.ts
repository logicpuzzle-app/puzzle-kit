/**
 * Plugin Registry System
 *
 * Provides type-safe registries for constraints, views, heuristics, and generators.
 * Each plugin type can be registered with a unique ID and factory function.
 */
import { PropagationResult } from './field.js';
/**
 * Generic plugin registry with type-safe registration and retrieval
 */
export declare class PluginRegistry<TParams, TPlugin> {
    private plugins;
    /**
     * Register a plugin factory
     * @param id Unique plugin identifier
     * @param factory Function that creates plugin instances
     */
    register(id: string, factory: (params: TParams) => TPlugin): void;
    /**
     * Create a plugin instance
     * @param id Plugin identifier
     * @param params Parameters to pass to the factory
     */
    create(id: string, params: TParams): TPlugin;
    /**
     * Check if a plugin is registered
     */
    has(id: string): boolean;
    /**
     * List all registered plugin IDs
     */
    list(): string[];
    /**
     * Unregister a plugin
     */
    unregister(id: string): boolean;
    /**
     * Clear all registered plugins
     */
    clear(): void;
}
export { PropagationResult } from './field.js';
/**
 * Base interface for all constraints
 */
export interface Constraint<TState> {
    /** Unique constraint type identifier */
    readonly type: string;
    /** Human-readable name */
    readonly name: string;
    /**
     * Apply constraint propagation
     * @param state Current field state
     * @returns Propagation result
     */
    propagate(state: TState): PropagationResult;
    /**
     * Check if constraint is satisfied
     * @param state Current field state
     */
    isSatisfied(state: TState): boolean;
}
/**
 * Parameters for creating constraints
 */
export interface ConstraintParams {
    [key: string]: unknown;
}
/**
 * Constraint factory function type
 */
export type ConstraintFactory<TState, TParams extends ConstraintParams = ConstraintParams> = (params: TParams) => Constraint<TState>;
/**
 * Registry for constraint plugins
 */
export declare class ConstraintRegistry<TState> extends PluginRegistry<ConstraintParams, Constraint<TState>> {
    /**
     * Create multiple constraints from specifications
     */
    createAll(specs: Array<{
        type: string;
        params: ConstraintParams;
    }>): Constraint<TState>[];
}
/**
 * Derived view that can be computed from field state
 * Views are cached and invalidated based on dependency keys
 */
export interface View<TState, TValue> {
    /** Unique view type identifier */
    readonly type: string;
    /**
     * Compute the view value
     * @param state Current field state
     */
    compute(state: TState): TValue;
    /**
     * Get cache dependency keys
     * Used to invalidate cache when dependencies change
     */
    getDependencyKeys(state: TState): string[];
}
/**
 * Parameters for creating views
 */
export interface ViewParams {
    [key: string]: unknown;
}
/**
 * View factory function type
 */
export type ViewFactory<TState, TValue, TParams extends ViewParams = ViewParams> = (params: TParams) => View<TState, TValue>;
/**
 * Registry for view plugins
 */
export declare class ViewRegistry<TState> extends PluginRegistry<ViewParams, View<TState, unknown>> {
}
/**
 * Branch candidate with score for prioritization
 */
export interface ScoredBranch<TState> {
    /** Function to apply this branch choice */
    apply: (state: TState) => TState;
    /** Score for prioritization (higher = try first) */
    score: number;
    /** Description for debugging */
    description?: string;
}
/**
 * Heuristic for choosing branch order
 */
export interface Heuristic<TState> {
    /** Unique heuristic type identifier */
    readonly type: string;
    /** Human-readable name */
    readonly name: string;
    /**
     * Score and order branch candidates
     * @param state Current field state
     * @param candidates Raw branch candidates
     * @returns Scored and ordered candidates
     */
    orderBranches(state: TState, candidates: Array<{
        apply: (s: TState) => TState;
        description?: string;
    }>): ScoredBranch<TState>[];
}
/**
 * Parameters for creating heuristics
 */
export interface HeuristicParams {
    [key: string]: unknown;
}
/**
 * Heuristic factory function type
 */
export type HeuristicFactory<TState, TParams extends HeuristicParams = HeuristicParams> = (params: TParams) => Heuristic<TState>;
/**
 * Registry for heuristic plugins
 */
export declare class HeuristicRegistry<TState> extends PluginRegistry<HeuristicParams, Heuristic<TState>> {
}
/**
 * Result of puzzle generation (extended version for plugin system)
 */
export interface PluginGeneratorResult<TState> {
    /** Generated puzzle state (with clues only) */
    puzzle: TState;
    /** Solution state */
    solution: TState;
    /** Generation metadata */
    metadata: {
        attempts: number;
        clueCount: number;
        difficulty?: string;
    };
}
/**
 * Puzzle generator interface
 */
export interface Generator<TState> {
    /** Unique generator type identifier */
    readonly type: string;
    /** Human-readable name */
    readonly name: string;
    /**
     * Generate a puzzle
     * @param width Grid width
     * @param height Grid height
     * @param options Generation options
     */
    generate(width: number, height: number, options?: GeneratorOptions): PluginGeneratorResult<TState> | null;
}
/**
 * Options for puzzle generation
 */
export interface GeneratorOptions {
    /** Target difficulty */
    difficulty?: 'easy' | 'medium' | 'hard' | 'extreme';
    /** Maximum attempts before giving up */
    maxAttempts?: number;
    /** Minimum clue count */
    minClues?: number;
    /** Maximum clue count */
    maxClues?: number;
    /** Random seed for reproducibility */
    seed?: number;
}
/**
 * Parameters for creating generators
 */
export interface GeneratorParams {
    [key: string]: unknown;
}
/**
 * Generator factory function type
 */
export type GeneratorFactory<TState, TParams extends GeneratorParams = GeneratorParams> = (params: TParams) => Generator<TState>;
/**
 * Registry for generator plugins
 */
export declare class GeneratorRegistry<TState> extends PluginRegistry<GeneratorParams, Generator<TState>> {
}
/**
 * Global constraint registry (generic, use createConstraintRegistry for typed version)
 */
export declare const constraintRegistry: ConstraintRegistry<unknown>;
/**
 * Global view registry
 */
export declare const viewRegistry: ViewRegistry<unknown>;
/**
 * Global heuristic registry
 */
export declare const heuristicRegistry: HeuristicRegistry<unknown>;
/**
 * Global generator registry
 */
export declare const generatorRegistry: GeneratorRegistry<unknown>;
/**
 * Create a typed constraint registry
 */
export declare function createConstraintRegistry<TState>(): ConstraintRegistry<TState>;
/**
 * Create a typed view registry
 */
export declare function createViewRegistry<TState>(): ViewRegistry<TState>;
/**
 * Create a typed heuristic registry
 */
export declare function createHeuristicRegistry<TState>(): HeuristicRegistry<TState>;
/**
 * Create a typed generator registry
 */
export declare function createGeneratorRegistry<TState>(): GeneratorRegistry<TState>;
//# sourceMappingURL=registry.d.ts.map