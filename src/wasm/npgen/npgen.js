/* @ts-self-types="./npgen.d.ts" */

/**
 * JavaScript-facing engine result. Vector getters become Int32Array values.
 */
export class WasmEngineResult {
    static __wrap(ptr) {
        const obj = Object.create(WasmEngineResult.prototype);
        obj.__wbg_ptr = ptr;
        WasmEngineResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmEngineResultFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmengineresult_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get answer_kind() {
        const ret = wasm.wasmengineresult_answer_kind(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {Int32Array}
     */
    block_labels() {
        const ret = wasm.wasmengineresult_block_labels(this.__wbg_ptr);
        var v1 = getArrayI32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {boolean}
     */
    get default_block() {
        const ret = wasm.wasmengineresult_default_block(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {boolean}
     */
    get diagonal() {
        const ret = wasm.wasmengineresult_diagonal(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    get difficulty() {
        const ret = wasm.wasmengineresult_difficulty(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Int32Array}
     */
    group_labels() {
        const ret = wasm.wasmengineresult_group_labels(this.__wbg_ptr);
        var v1 = getArrayI32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {boolean}
     */
    get horizontal() {
        const ret = wasm.wasmengineresult_horizontal(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {Int32Array}
     */
    pattern() {
        const ret = wasm.wasmengineresult_pattern(this.__wbg_ptr);
        var v1 = getArrayI32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {Int32Array}
     */
    problem() {
        const ret = wasm.wasmengineresult_problem(this.__wbg_ptr);
        var v1 = getArrayI32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {Int32Array}
     */
    solution() {
        const ret = wasm.wasmengineresult_solution(this.__wbg_ptr);
        var v1 = getArrayI32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {boolean}
     */
    get vertical() {
        const ret = wasm.wasmengineresult_vertical(this.__wbg_ptr);
        return ret !== 0;
    }
}
if (Symbol.dispose) WasmEngineResult.prototype[Symbol.dispose] = WasmEngineResult.prototype.free;

export class WasmXmlPuzzle {
    static __wrap(ptr) {
        const obj = Object.create(WasmXmlPuzzle.prototype);
        obj.__wbg_ptr = ptr;
        WasmXmlPuzzleFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmXmlPuzzleFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmxmlpuzzle_free(ptr, 0);
    }
    /**
     * @returns {Int32Array}
     */
    block_labels() {
        const ret = wasm.wasmxmlpuzzle_block_labels(this.__wbg_ptr);
        var v1 = getArrayI32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {string}
     */
    get comment() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmxmlpuzzle_comment(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {boolean}
     */
    get default_block() {
        const ret = wasm.wasmxmlpuzzle_default_block(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {boolean}
     */
    get diagonal() {
        const ret = wasm.wasmxmlpuzzle_diagonal(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    get difficulty() {
        const ret = wasm.wasmxmlpuzzle_difficulty(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get group_count() {
        const ret = wasm.wasmxmlpuzzle_group_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {Int32Array}
     */
    group_labels() {
        const ret = wasm.wasmxmlpuzzle_group_labels(this.__wbg_ptr);
        var v1 = getArrayI32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {boolean}
     */
    get has_hint() {
        const ret = wasm.wasmxmlpuzzle_has_hint(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {Int32Array}
     */
    hidden() {
        const ret = wasm.wasmxmlpuzzle_hidden(this.__wbg_ptr);
        var v1 = getArrayI32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {boolean}
     */
    get horizontal() {
        const ret = wasm.wasmxmlpuzzle_horizontal(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {Int32Array}
     */
    pattern() {
        const ret = wasm.wasmxmlpuzzle_pattern(this.__wbg_ptr);
        var v1 = getArrayI32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {Int32Array}
     */
    problem() {
        const ret = wasm.wasmxmlpuzzle_problem(this.__wbg_ptr);
        var v1 = getArrayI32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {Int32Array}
     */
    seed() {
        const ret = wasm.wasmxmlpuzzle_seed(this.__wbg_ptr);
        var v1 = getArrayI32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {number}
     */
    get size() {
        const ret = wasm.wasmxmlpuzzle_size(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {Int32Array}
     */
    solution() {
        const ret = wasm.wasmxmlpuzzle_solution(this.__wbg_ptr);
        var v1 = getArrayI32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {boolean}
     */
    get vertical() {
        const ret = wasm.wasmxmlpuzzle_vertical(this.__wbg_ptr);
        return ret !== 0;
    }
}
if (Symbol.dispose) WasmXmlPuzzle.prototype[Symbol.dispose] = WasmXmlPuzzle.prototype.free;

/**
 * @returns {number}
 */
export function all_techniques_mask() {
    const ret = wasm.all_techniques_mask();
    return ret >>> 0;
}

/**
 * @returns {number}
 */
export function all_uniqueness_mask() {
    const ret = wasm.all_uniqueness_mask();
    return ret >>> 0;
}

/**
 * @param {number} count
 * @param {bigint} seed
 * @returns {number}
 */
export function benchmark(count, seed) {
    const ret = wasm.benchmark(count, seed);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] >>> 0;
}

/**
 * @param {number} size
 * @param {Int32Array} pattern
 * @param {Int32Array} hidden
 * @param {Int32Array} problem
 * @param {Int32Array} solution
 * @param {Int32Array} block_labels
 * @param {boolean} vertical
 * @param {boolean} horizontal
 * @param {boolean} diagonal
 * @param {boolean} default_block
 * @param {number} difficulty
 * @param {string} comment
 * @returns {string}
 */
export function format_npgen_xml(size, pattern, hidden, problem, solution, block_labels, vertical, horizontal, diagonal, default_block, difficulty, comment) {
    let deferred8_0;
    let deferred8_1;
    try {
        const ptr0 = passArray32ToWasm0(pattern, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray32ToWasm0(hidden, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray32ToWasm0(problem, wasm.__wbindgen_malloc);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passArray32ToWasm0(solution, wasm.__wbindgen_malloc);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passArray32ToWasm0(block_labels, wasm.__wbindgen_malloc);
        const len4 = WASM_VECTOR_LEN;
        const ptr5 = passStringToWasm0(comment, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len5 = WASM_VECTOR_LEN;
        const ret = wasm.format_npgen_xml(size, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4, vertical, horizontal, diagonal, default_block, difficulty, ptr5, len5);
        var ptr7 = ret[0];
        var len7 = ret[1];
        if (ret[3]) {
            ptr7 = 0; len7 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred8_0 = ptr7;
        deferred8_1 = len7;
        return getStringFromWasm0(ptr7, len7);
    } finally {
        wasm.__wbindgen_free(deferred8_0, deferred8_1, 1);
    }
}

/**
 * @param {number} size
 * @param {Int32Array} pattern
 * @param {Int32Array} hidden
 * @param {Int32Array} initial_seed
 * @param {number} block_kind
 * @param {number} block_width
 * @param {number} block_height
 * @param {Int32Array} block_labels
 * @param {Int32Array} additional_group_labels
 * @param {boolean} vertical
 * @param {boolean} horizontal
 * @param {boolean} diagonal
 * @param {boolean} diagonal_last
 * @param {bigint} seed
 * @param {number} technique_mask
 * @param {number} uniqueness_mask
 * @param {number} dp_min
 * @param {number} dp_max
 * @param {number} forbidden
 * @param {number} retry_limit
 * @returns {WasmEngineResult}
 */
export function generate_puzzle(size, pattern, hidden, initial_seed, block_kind, block_width, block_height, block_labels, additional_group_labels, vertical, horizontal, diagonal, diagonal_last, seed, technique_mask, uniqueness_mask, dp_min, dp_max, forbidden, retry_limit) {
    const ptr0 = passArray32ToWasm0(pattern, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray32ToWasm0(hidden, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray32ToWasm0(initial_seed, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passArray32ToWasm0(block_labels, wasm.__wbindgen_malloc);
    const len3 = WASM_VECTOR_LEN;
    const ptr4 = passArray32ToWasm0(additional_group_labels, wasm.__wbindgen_malloc);
    const len4 = WASM_VECTOR_LEN;
    const ret = wasm.generate_puzzle(size, ptr0, len0, ptr1, len1, ptr2, len2, block_kind, block_width, block_height, ptr3, len3, ptr4, len4, vertical, horizontal, diagonal, diagonal_last, seed, technique_mask, uniqueness_mask, dp_min, dp_max, forbidden, retry_limit);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return WasmEngineResult.__wrap(ret[0]);
}

/**
 * @param {number} size
 * @param {number} hints
 * @param {number} symmetry
 * @param {number} block_kind
 * @param {number} block_width
 * @param {number} block_height
 * @param {Int32Array} block_labels
 * @param {Int32Array} additional_group_labels
 * @param {boolean} vertical
 * @param {boolean} horizontal
 * @param {boolean} diagonal
 * @param {boolean} diagonal_last
 * @param {bigint} seed
 * @param {number} technique_mask
 * @param {number} uniqueness_mask
 * @param {number} dp_min
 * @param {number} dp_max
 * @param {number} forbidden
 * @param {number} retry_limit
 * @returns {WasmEngineResult}
 */
export function generate_random_puzzle(size, hints, symmetry, block_kind, block_width, block_height, block_labels, additional_group_labels, vertical, horizontal, diagonal, diagonal_last, seed, technique_mask, uniqueness_mask, dp_min, dp_max, forbidden, retry_limit) {
    const ptr0 = passArray32ToWasm0(block_labels, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray32ToWasm0(additional_group_labels, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.generate_random_puzzle(size, hints, symmetry, block_kind, block_width, block_height, ptr0, len0, ptr1, len1, vertical, horizontal, diagonal, diagonal_last, seed, technique_mask, uniqueness_mask, dp_min, dp_max, forbidden, retry_limit);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return WasmEngineResult.__wrap(ret[0]);
}

/**
 * @param {string} xml
 * @returns {WasmXmlPuzzle}
 */
export function parse_npgen_xml(xml) {
    const ptr0 = passStringToWasm0(xml, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.parse_npgen_xml(ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return WasmXmlPuzzle.__wrap(ret[0]);
}

/**
 * @param {number} size
 * @param {Int32Array} problem
 * @param {number} block_kind
 * @param {number} block_width
 * @param {number} block_height
 * @param {Int32Array} block_labels
 * @param {Int32Array} additional_group_labels
 * @param {boolean} vertical
 * @param {boolean} horizontal
 * @param {boolean} diagonal
 * @param {boolean} diagonal_last
 * @param {bigint} seed
 * @param {number} technique_mask
 * @param {number} uniqueness_mask
 * @returns {WasmEngineResult}
 */
export function solve_puzzle(size, problem, block_kind, block_width, block_height, block_labels, additional_group_labels, vertical, horizontal, diagonal, diagonal_last, seed, technique_mask, uniqueness_mask) {
    const ptr0 = passArray32ToWasm0(problem, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray32ToWasm0(block_labels, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray32ToWasm0(additional_group_labels, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.solve_puzzle(size, ptr0, len0, block_kind, block_width, block_height, ptr1, len1, ptr2, len2, vertical, horizontal, diagonal, diagonal_last, seed, technique_mask, uniqueness_mask);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return WasmEngineResult.__wrap(ret[0]);
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_Error_92b29b0548f8b746: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg___wbindgen_throw_344f42d3211c4765: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./npgen_bg.js": import0,
    };
}

const WasmEngineResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmengineresult_free(ptr, 1));
const WasmXmlPuzzleFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmxmlpuzzle_free(ptr, 1));

function getArrayI32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getInt32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

let cachedInt32ArrayMemory0 = null;
function getInt32ArrayMemory0() {
    if (cachedInt32ArrayMemory0 === null || cachedInt32ArrayMemory0.byteLength === 0) {
        cachedInt32ArrayMemory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArray32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getUint32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedInt32ArrayMemory0 = null;
    cachedUint32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('npgen_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
