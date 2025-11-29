/**
 * Penpa-edit Compatible Serializer
 *
 * Implements full compatibility with Penpa-edit URL format:
 * - Compression substitution (30 pairs)
 * - Base64 URL-safe encoding
 * - Optional zlib compression
 * - Backward compatibility with old formats
 */

import pako from 'pako';

// ========================================
// Constants
// ========================================

/**
 * Maximum export length for puzzle URLs
 */
export const MAX_EXPORT_LENGTH = 7360;

/**
 * Compression substitution pairs for puzzle data.
 * The first entry escapes 'z' characters to prevent spurious substitutions.
 * Order matters: 'z' must be escaped first, and unescaped last.
 */
export const COMPRESS_SUBSTITUTIONS: [string, string][] = [
  ['z', 'zZ'],
  ['"qa"', 'z9'],
  ['"pu_q"', 'zQ'],
  ['"pu_a"', 'zA'],
  ['"grid"', 'zG'],
  ['"edit_mode"', 'zM'],
  ['"surface"', 'zS'],
  ['"line"', 'zL'],
  ['"lineE"', 'zE'],
  ['"wall"', 'zW'],
  ['"cage"', 'zC'],
  ['"number"', 'zN'],
  ['"symbol"', 'zY'],
  ['"special"', 'zP'],
  ['"board"', 'zB'],
  ['"command_redo"', 'zR'],
  ['"command_undo"', 'zU'],
  ['"command_replay"', 'z8'],
  ['"numberS"', 'z1'],
  ['"freeline"', 'zF'],
  ['"freelineE"', 'z2'],
  ['"thermo"', 'zT'],
  ['"arrows"', 'z3'],
  ['"direction"', 'zD'],
  ['"squareframe"', 'z0'],
  ['"polygon"', 'z5'],
  ['"deletelineE"', 'z4'],
  ['"killercages"', 'z6'],
  ['"nobulbthermo"', 'z7'],
  ['"__a"', 'z_'],
  ['null', 'zO'],
];

// ========================================
// Types
// ========================================

/**
 * Grid types supported by Penpa
 */
export type PenpaGridType =
  | 'square'
  | 'sudoku'
  | 'kakuro'
  | 'hex'
  | 'tri'
  | 'pyramid'
  | 'iso'
  | 'tetrakis_square'
  | 'truncated_square'
  | 'snub_square'
  | 'cairo_pentagonal'
  | 'rhombitrihexagonal'
  | 'deltoidal_trihexagonal'
  | 'penrose_P3';

/**
 * Edit modes in Penpa
 */
export type PenpaEditMode =
  | 'surface'
  | 'multicolor'
  | 'line'
  | 'lineE'
  | 'wall'
  | 'number'
  | 'symbol'
  | 'special'
  | 'cage'
  | 'combi'
  | 'sudoku'
  | 'board'
  | 'move';

/**
 * Question/Answer mode
 */
export type PenpaQAMode = 'pu_q' | 'pu_a';

/**
 * Surface value (single color or multicolor array)
 */
export type PenpaSurfaceValue = number | number[];

/**
 * Stack data for undo/redo
 */
export interface PenpaStackData<T = unknown> {
  __a: T[];
}

/**
 * Puzzle data structure for each Q/A mode
 */
export interface PenpaPuzzleData {
  command_redo?: PenpaStackData;
  command_undo?: PenpaStackData;
  command_replay?: PenpaStackData;
  surface?: Record<string, PenpaSurfaceValue>;
  number?: Record<string, unknown>;
  numberS?: Record<string, unknown>;
  symbol?: Record<string, unknown>;
  thermo?: unknown[];
  arrows?: unknown[];
  direction?: unknown[];
  squareframe?: unknown[];
  polygon?: unknown[];
  line?: Record<string, number>;
  lineE?: Record<string, number>;
  freeline?: Record<string, number>;
  freelineE?: Record<string, number>;
  wall?: Record<string, number>;
  cage?: Record<string, unknown>;
  deletelineE?: Record<string, number>;
  killercages?: unknown[];
  nobulbthermo?: unknown[];
}

/**
 * Mode state for each Q/A mode
 */
export interface PenpaModeState {
  edit_mode: PenpaEditMode;
  surface: [string, number];
  multicolor: [string, number];
  line: [string, number];
  lineE: [string, number];
  wall: [string, number];
  cage: [string, number];
  number: [string, number];
  symbol: [string, number];
  special: [string, string];
  board: [string, string];
  solution_area?: [string, string];
  move: [string, string];
  combi: [string, number];
  sudoku: [string, number];
}

/**
 * Full mode configuration
 */
export interface PenpaModeConfig {
  qa: PenpaQAMode;
  grid: [string, string, string];
  pu_q: PenpaModeState;
  pu_a: PenpaModeState;
}

/**
 * Full puzzle export data structure
 */
export interface PenpaExportData {
  // Grid configuration
  gridtype: PenpaGridType;
  nx: number;
  ny: number;
  size?: number;
  space?: [number, number, number, number];

  // Mode configuration
  mode?: PenpaModeConfig;

  // Puzzle data
  pu_q?: Partial<PenpaPuzzleData>;
  pu_q_col?: Partial<PenpaPuzzleData>;
  pu_a?: Partial<PenpaPuzzleData>;
  pu_a_col?: Partial<PenpaPuzzleData>;

  // Solution data
  solution?: string;
  solution_area?: number[];

  // Metadata
  version?: [number, number, number];
  theta?: number;
  reflect?: [number, number];
  rules?: string;
  user_tags?: string[];
}

// ========================================
// Compression Functions
// ========================================

/**
 * Apply compression substitutions to data string
 */
export function compressSubstitutions(data: string): string {
  let result = data;
  for (const [original, compressed] of COMPRESS_SUBSTITUTIONS) {
    result = result.split(original).join(compressed);
  }
  return result;
}

/**
 * Apply decompression substitutions (reverse order)
 */
export function decompressSubstitutions(data: string): string {
  let result = data;
  // Apply substitutions in reverse order
  for (let i = COMPRESS_SUBSTITUTIONS.length - 1; i >= 0; i--) {
    const [original, compressed] = COMPRESS_SUBSTITUTIONS[i];
    result = result.split(compressed).join(original);
  }
  return result;
}

/**
 * Encode string to URL-safe Base64
 */
export function encodeBase64UrlSafe(data: string): string {
  // Handle Unicode characters
  const encoded = btoa(unescape(encodeURIComponent(data)));
  // Make URL-safe: replace + with -, / with _, remove trailing =
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decode URL-safe Base64 to string
 */
export function decodeBase64UrlSafe(data: string): string {
  // Restore standard Base64
  let base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  while (base64.length % 4) {
    base64 += '=';
  }
  return decodeURIComponent(escape(atob(base64)));
}

/**
 * Compress data using zlib
 */
export function zlibCompress(data: string): Uint8Array {
  const encoder = new TextEncoder();
  return pako.deflate(encoder.encode(data));
}

/**
 * Decompress zlib data
 */
export function zlibDecompress(data: Uint8Array): string {
  const decoder = new TextDecoder();
  return decoder.decode(pako.inflate(data));
}

/**
 * Convert Uint8Array to binary string
 */
function uint8ArrayToBinaryString(arr: Uint8Array): string {
  let result = '';
  for (let i = 0; i < arr.length; i++) {
    result += String.fromCharCode(arr[i]);
  }
  return result;
}

/**
 * Convert binary string to Uint8Array
 */
function binaryStringToUint8Array(str: string): Uint8Array {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i);
  }
  return arr;
}

// ========================================
// Main Serialization Functions
// ========================================

export interface SerializeOptions {
  useZlib?: boolean;
  includeHistory?: boolean;
  includeAnswer?: boolean;
  includeColors?: boolean;
}

/**
 * Serialize puzzle data to Penpa-compatible URL format
 */
export function serializePenpa(
  data: PenpaExportData,
  options: SerializeOptions = {}
): string {
  const {
    useZlib = true,
    includeHistory = false,
    includeAnswer = true,
    includeColors = true,
  } = options;

  // Build export object
  const exportData: Record<string, unknown> = {
    gridtype: data.gridtype,
    nx: data.nx,
    ny: data.ny,
  };

  // Optional grid settings
  if (data.size !== undefined) {
    exportData.size = data.size;
  }
  if (data.space !== undefined) {
    exportData.space = data.space;
  }
  if (data.mode !== undefined) {
    exportData.mode = data.mode;
  }
  if (data.version !== undefined) {
    exportData.version = data.version;
  }

  // Puzzle data
  if (data.pu_q) {
    exportData.pu_q = cleanPuzzleData(data.pu_q, includeHistory);
  }
  if (includeColors && data.pu_q_col) {
    exportData.pu_q_col = cleanPuzzleData(data.pu_q_col, false);
  }
  if (includeAnswer) {
    if (data.pu_a) {
      exportData.pu_a = cleanPuzzleData(data.pu_a, includeHistory);
    }
    if (includeColors && data.pu_a_col) {
      exportData.pu_a_col = cleanPuzzleData(data.pu_a_col, false);
    }
  }

  // Optional fields
  if (data.solution) {
    exportData.solution = data.solution;
  }
  if (data.solution_area && data.solution_area.length > 0) {
    exportData.solution_area = data.solution_area;
  }
  if (data.theta !== undefined && data.theta !== 0) {
    exportData.theta = data.theta;
  }
  if (data.reflect && (data.reflect[0] !== 1 || data.reflect[1] !== 1)) {
    exportData.reflect = data.reflect;
  }
  if (data.rules) {
    exportData.rules = data.rules;
  }
  if (data.user_tags && data.user_tags.length > 0) {
    exportData.user_tags = data.user_tags;
  }

  // Convert to JSON and apply substitutions
  const jsonStr = JSON.stringify(exportData);
  const substituted = compressSubstitutions(jsonStr);

  if (useZlib) {
    // Compress with zlib
    const compressed = zlibCompress(substituted);
    const binaryStr = uint8ArrayToBinaryString(compressed);
    return encodeBase64UrlSafe(binaryStr);
  }

  return encodeBase64UrlSafe(substituted);
}

/**
 * Deserialize Penpa URL data to puzzle data
 */
export function deserializePenpa(
  encoded: string,
  useZlib: boolean = true
): PenpaExportData {
  let data: string;

  try {
    const decoded = decodeBase64UrlSafe(encoded);

    if (useZlib) {
      // Try zlib decompression
      const bytes = binaryStringToUint8Array(decoded);
      data = zlibDecompress(bytes);
    } else {
      data = decoded;
    }
  } catch (e) {
    // If zlib fails, try without compression
    if (useZlib) {
      return deserializePenpa(encoded, false);
    }
    throw e;
  }

  // Apply reverse substitutions
  const decompressed = decompressSubstitutions(data);

  // Parse JSON
  const parsed = JSON.parse(decompressed) as Record<string, unknown>;

  // Validate required fields
  if (!parsed.gridtype || parsed.nx === undefined || parsed.ny === undefined) {
    throw new Error('Invalid puzzle data: missing required fields (gridtype, nx, ny)');
  }

  return {
    gridtype: parsed.gridtype as PenpaGridType,
    nx: parsed.nx as number,
    ny: parsed.ny as number,
    size: parsed.size as number | undefined,
    space: parsed.space as [number, number, number, number] | undefined,
    mode: parsed.mode as PenpaModeConfig | undefined,
    pu_q: parsed.pu_q as Partial<PenpaPuzzleData> | undefined,
    pu_q_col: parsed.pu_q_col as Partial<PenpaPuzzleData> | undefined,
    pu_a: parsed.pu_a as Partial<PenpaPuzzleData> | undefined,
    pu_a_col: parsed.pu_a_col as Partial<PenpaPuzzleData> | undefined,
    solution: parsed.solution as string | undefined,
    solution_area: parsed.solution_area as number[] | undefined,
    version: parsed.version as [number, number, number] | undefined,
    theta: parsed.theta as number | undefined,
    reflect: parsed.reflect as [number, number] | undefined,
    rules: parsed.rules as string | undefined,
    user_tags: parsed.user_tags as string[] | undefined,
  };
}

/**
 * Clean puzzle data for export (remove empty objects/arrays and optionally history)
 */
function cleanPuzzleData(
  data: Partial<PenpaPuzzleData>,
  includeHistory: boolean
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    // Skip history unless requested
    if (
      !includeHistory &&
      ['command_redo', 'command_undo', 'command_replay'].includes(key)
    ) {
      continue;
    }

    // Skip empty objects/arrays
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          cleaned[key] = value;
        }
      } else if (Object.keys(value).length > 0) {
        cleaned[key] = value;
      }
    } else if (value !== undefined && value !== null) {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

// ========================================
// URL Handling Functions
// ========================================

/**
 * Generate a Penpa-compatible puzzle URL
 */
export function generatePenpaUrl(
  baseUrl: string,
  data: PenpaExportData,
  options: SerializeOptions = {}
): string {
  const encoded = serializePenpa(data, options);

  if (encoded.length > MAX_EXPORT_LENGTH) {
    throw new Error(
      `Puzzle data too large for URL (${encoded.length} > ${MAX_EXPORT_LENGTH})`
    );
  }

  // Use m=edit for edit mode
  return `${baseUrl}?m=edit&p=${encoded}`;
}

/**
 * Parse puzzle data from a Penpa URL
 */
export function parsePenpaUrl(url: string): PenpaExportData | null {
  try {
    const urlObj = new URL(url);

    // Check for hash-based data (penpa format: #m=edit&p=...)
    const hashData = urlObj.hash.slice(1);
    if (hashData) {
      const hashParams = new URLSearchParams(hashData);
      const puzzleParam = hashParams.get('p');
      if (puzzleParam) {
        return deserializePenpa(puzzleParam);
      }
    }

    // Check for query-based data (?p=...)
    const params = new URLSearchParams(urlObj.search);
    const puzzleParam = params.get('p');
    if (puzzleParam) {
      return deserializePenpa(puzzleParam);
    }

    return null;
  } catch (error) {
    console.error('Failed to parse Penpa URL:', error);
    return null;
  }
}

/**
 * Extract puzzle parameter from URL (handles various formats)
 */
export function extractPuzzleParam(url: string): string | null {
  try {
    // Handle full URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const urlObj = new URL(url);

      // Check hash
      if (urlObj.hash) {
        const hashParams = new URLSearchParams(urlObj.hash.slice(1));
        const p = hashParams.get('p');
        if (p) return p;
      }

      // Check query
      const params = new URLSearchParams(urlObj.search);
      const p = params.get('p');
      if (p) return p;

      return null;
    }

    // Handle raw encoded data
    if (url.includes('=')) {
      const params = new URLSearchParams(url);
      const p = params.get('p');
      if (p) return p;
    }

    // Assume it's raw encoded data
    return url;
  } catch {
    return url;
  }
}

// ========================================
// Validation Functions
// ========================================

/**
 * Validate Penpa export data structure
 */
export function validatePenpaData(data: unknown): data is PenpaExportData {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Required fields
  if (typeof obj.gridtype !== 'string') return false;
  if (typeof obj.nx !== 'number') return false;
  if (typeof obj.ny !== 'number') return false;

  // Validate gridtype
  const validGridTypes: PenpaGridType[] = [
    'square', 'sudoku', 'kakuro', 'hex', 'tri', 'pyramid', 'iso',
    'tetrakis_square', 'truncated_square', 'snub_square',
    'cairo_pentagonal', 'rhombitrihexagonal', 'deltoidal_trihexagonal',
    'penrose_P3',
  ];
  if (!validGridTypes.includes(obj.gridtype as PenpaGridType)) {
    return false;
  }

  return true;
}

/**
 * Check if URL is likely a Penpa puzzle URL
 */
export function isPenpaUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Check known Penpa domains
    if (
      hostname.includes('penpa') ||
      hostname.includes('puzz.link') ||
      hostname.includes('pzplus')
    ) {
      return true;
    }

    // Check for puzzle parameter
    const hasP =
      urlObj.searchParams.has('p') ||
      new URLSearchParams(urlObj.hash.slice(1)).has('p');

    return hasP;
  } catch {
    return false;
  }
}
