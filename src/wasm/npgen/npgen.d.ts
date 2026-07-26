/* tslint:disable */
/* eslint-disable */

/**
 * JavaScript-facing engine result. Vector getters become Int32Array values.
 */
export class WasmEngineResult {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    block_labels(): Int32Array;
    pattern(): Int32Array;
    problem(): Int32Array;
    solution(): Int32Array;
    readonly answer_kind: number;
    readonly default_block: boolean;
    readonly diagonal: boolean;
    readonly difficulty: number;
}

export class WasmXmlPuzzle {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    block_labels(): Int32Array;
    hidden(): Int32Array;
    pattern(): Int32Array;
    problem(): Int32Array;
    solution(): Int32Array;
    readonly default_block: boolean;
    readonly diagonal: boolean;
    readonly difficulty: number;
    readonly size: number;
}

export function all_techniques_mask(): number;

export function all_uniqueness_mask(): number;

export function benchmark(count: number, seed: bigint): number;

export function format_npgen_xml(size: number, pattern: Int32Array, hidden: Int32Array, problem: Int32Array, solution: Int32Array, block_labels: Int32Array, diagonal: boolean, default_block: boolean, difficulty: number): string;

export function generate_puzzle(size: number, pattern: Int32Array, hidden: Int32Array, block_kind: number, block_width: number, block_height: number, block_labels: Int32Array, diagonal: boolean, seed: bigint, technique_mask: number, uniqueness_mask: number, dp_min: number, dp_max: number, forbidden: number): WasmEngineResult;

export function generate_random_puzzle(size: number, hints: number, block_kind: number, block_width: number, block_height: number, block_labels: Int32Array, diagonal: boolean, seed: bigint, technique_mask: number, uniqueness_mask: number, dp_min: number, dp_max: number, forbidden: number): WasmEngineResult;

export function parse_npgen_xml(xml: string): WasmXmlPuzzle;

export function solve_puzzle(size: number, problem: Int32Array, block_kind: number, block_width: number, block_height: number, block_labels: Int32Array, diagonal: boolean, seed: bigint, technique_mask: number, uniqueness_mask: number): WasmEngineResult;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_wasmengineresult_free: (a: number, b: number) => void;
    readonly wasmengineresult_difficulty: (a: number) => number;
    readonly wasmengineresult_answer_kind: (a: number) => number;
    readonly wasmengineresult_diagonal: (a: number) => number;
    readonly wasmengineresult_default_block: (a: number) => number;
    readonly wasmengineresult_pattern: (a: number) => [number, number];
    readonly wasmengineresult_problem: (a: number) => [number, number];
    readonly wasmengineresult_solution: (a: number) => [number, number];
    readonly wasmengineresult_block_labels: (a: number) => [number, number];
    readonly solve_puzzle: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: bigint, k: number, l: number) => [number, number, number];
    readonly generate_puzzle: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: bigint, m: number, n: number, o: number, p: number, q: number) => [number, number, number];
    readonly generate_random_puzzle: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: bigint, j: number, k: number, l: number, m: number, n: number) => [number, number, number];
    readonly benchmark: (a: number, b: bigint) => [number, number, number];
    readonly __wbg_wasmxmlpuzzle_free: (a: number, b: number) => void;
    readonly wasmxmlpuzzle_size: (a: number) => number;
    readonly wasmxmlpuzzle_difficulty: (a: number) => number;
    readonly wasmxmlpuzzle_diagonal: (a: number) => number;
    readonly wasmxmlpuzzle_default_block: (a: number) => number;
    readonly wasmxmlpuzzle_pattern: (a: number) => [number, number];
    readonly wasmxmlpuzzle_hidden: (a: number) => [number, number];
    readonly wasmxmlpuzzle_problem: (a: number) => [number, number];
    readonly wasmxmlpuzzle_solution: (a: number) => [number, number];
    readonly wasmxmlpuzzle_block_labels: (a: number) => [number, number];
    readonly parse_npgen_xml: (a: number, b: number) => [number, number, number];
    readonly format_npgen_xml: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number) => [number, number, number, number];
    readonly all_techniques_mask: () => number;
    readonly all_uniqueness_mask: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
