import pako from 'pako';
import type { GridConfig, PuzzleState, PuzzleElements } from '../types';
import { SurfaceColorPalette, LineColorPalette, SymbolColorPalette, PenpaColors } from '../constants/colors';

/**
 * Penpa-edit URL compatibility layer
 * Parses and converts Penpa-edit URL format to PuzzleKit format
 */

// ========================================
// Exported Types
// ========================================

/** Result type for parsing puzz.link URLs */
export interface PuzzlinkData {
  grid: GridConfig;
  state: PuzzleState;
  puzzleType?: string; // puzz.link puzzle type (e.g., 'yajilin', 'slitherlink')
}

// Penpa URL parameter names
const PENPA_PARAMS = {
  MODE: 'm',
  PUZZLE: 'p',
  EDIT: 'edit',
  SOLVE: 'solve',
};

// Penpa's COMPRESS substitution table (from opt.js)
const COMPRESS_SUB: Record<string, string> = {
  '"qa"': 'Qa',
  '"pu_q"': 'Qb',
  '"pu_a"': 'Qc',
  '"command_pu"': 'Qd',
  '"command_redo"': 'Qe',
  '"centerlist"': 'Qf',
  '"surface"': 'Qg',
  '"line"': 'Qh',
  '"lineE"': 'Qi',
  '"wall"': 'Qj',
  '"cage"': 'Qk',
  '"number"': 'Ql',
  '"numberS"': 'Qm',
  '"symbol"': 'Qn',
  '"special"': 'Qo',
  '"board"': 'Qp',
  '"command"': 'Qq',
  '"freeline"': 'Qr',
  '"freelineE"': 'Qs',
  '"thermo"': 'Qt',
  '"arrows"': 'Qu',
  '"direction"': 'Qv',
  '"squareframe"': 'Qw',
  '"polygon"': 'Qx',
  '"deletelineE"': 'Qy',
  '"killercages"': 'Qz',
  '"nobulbthermo"': 'QA',
  '"frame"': 'QB',
};

// Reverse mapping
const DECOMPRESS_SUB: Record<string, string> = Object.fromEntries(
  Object.entries(COMPRESS_SUB).map(([k, v]) => [v, k])
);

interface PenpaData {
  gridtype?: string;
  nx?: number;
  ny?: number;
  cellsize?: number;
  pu_q?: PenpaPuData;
  pu_a?: PenpaPuData;
  mode?: PenpaMode;
  centerlist?: number[];
}

interface PenpaPuData {
  surface?: Record<number, number>;
  line?: Record<string, number>;
  lineE?: Record<string, number>;
  wall?: Record<string, number>;
  cage?: Record<string, { cells: number[]; value?: string; color?: string }>;
  number?: Record<number, (string | number)[]>;
  numberS?: Record<number, (string | number)[]>;
  symbol?: Record<number, [number, string, number]>;
  thermo?: number[][];
  arrows?: number[][];
  qdir?: number[][];
  qnum?: number[][];
  polygon?: number[][];
  deletelineE?: Record<string, number>;
}

interface PenpaMode {
  qa?: string;
  grid?: string[];
  edit_mode?: string;
  surface?: number;
  line?: number;
  lineE?: number;
  wall?: number;
  number?: number;
  symbol?: number;
}

/**
 * Decode Penpa URL parameter
 */
function decodePenpaUrl(encoded: string): string | null {
  try {
    // Check if it starts with zL (new format) or raw base64
    let data = encoded;

    // Remove URL encoding
    data = decodeURIComponent(data);

    // Restore standard base64
    data = data.replace(/-/g, '+').replace(/_/g, '/');

    // Add padding if needed
    while (data.length % 4) {
      data += '=';
    }

    // Decode base64
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Try to decompress with zlib
    try {
      const inflated = pako.inflate(bytes, { to: 'string' });
      return inflated;
    } catch {
      // If decompression fails, it might be uncompressed
      return binary;
    }
  } catch (error) {
    console.error('Failed to decode Penpa URL:', error);
    return null;
  }
}

/**
 * Expand compressed Penpa JSON keys
 */
function expandPenpaKeys(json: string): string {
  let expanded = json;

  // Replace compressed keys with full keys
  for (const [compressed, full] of Object.entries(DECOMPRESS_SUB)) {
    expanded = expanded.split(compressed).join(full);
  }

  return expanded;
}

/**
 * Parse Penpa puzzle data from URL
 */
export function parsePenpaUrl(url: string): PuzzlinkData | null {
  try {
    const urlObj = new URL(url);
    const puzzleParam = urlObj.searchParams.get(PENPA_PARAMS.PUZZLE);

    if (!puzzleParam) {
      console.error('No puzzle parameter found in URL');
      return null;
    }

    const decoded = decodePenpaUrl(puzzleParam);
    if (!decoded) {
      console.error('Failed to decode puzzle parameter');
      return null;
    }

    // Expand compressed keys
    const expanded = expandPenpaKeys(decoded);

    // Parse JSON
    let penpaData: PenpaData;
    try {
      penpaData = JSON.parse(expanded);
    } catch {
      console.error('Failed to parse Penpa JSON');
      return null;
    }

    // Convert to PuzzleKit format
    return convertPenpaToPuzzleKit(penpaData);
  } catch (error) {
    console.error('Failed to parse Penpa URL:', error);
    return null;
  }
}

/**
 * Convert Penpa data structure to PuzzleKit format
 */
function convertPenpaToPuzzleKit(penpa: PenpaData): PuzzlinkData {
  // Extract grid dimensions
  const rows = penpa.ny || 10;
  const cols = penpa.nx || 10;
  const cellSize = penpa.cellsize || 40;

  const grid: GridConfig = {
    rows,
    cols,
    cellSize,
    outerPadding: 20,
    showGrid: true,
    gridStyle: 'normal',
    gridType: 'square',
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    frameStyle: 'normal',
    frameColor: '#000000',
    gridColor: '#000000',
    backgroundColor: '#ffffff',
  };

  const createEmptyElements = (): PuzzleElements => ({
    surfaces: {},
    lines: {},
    edges: {},
    walls: {},
    numbers: {},
    symbols: {},
    cages: {},
    specials: {},
    boxLines: {},
    directionalClues: {},
  });

  const state: PuzzleState = {
    problem: createEmptyElements(),
    answer: createEmptyElements(),
  };

  // Convert problem layer (pu_q)
  if (penpa.pu_q) {
    convertPenpaLayer(penpa.pu_q, state.problem, grid, 'problem');
  }

  // Convert answer layer (pu_a)
  if (penpa.pu_a) {
    convertPenpaLayer(penpa.pu_a, state.answer, grid, 'answer');
  }

  return { grid, state };
}

/**
 * Convert a Penpa layer to PuzzleKit elements
 */
function convertPenpaLayer(
  pu: PenpaPuData,
  elements: PuzzleElements,
  grid: GridConfig,
  layer: 'problem' | 'answer'
): void {
  const { cols } = grid;
  const width = cols + 4;

  // Convert point index to row/col
  // Penpa uses a linear index with padding
  const indexToRowCol = (index: number): { row: number; col: number } | null => {
    // Penpa's point numbering includes margin cells
    // The formula depends on grid type, but for standard square:
    // point = (row + 2) * (cols + 4) + (col + 2)
    const row = Math.floor(index / width) - 2;
    const col = (index % width) - 2;

    if (row >= 0 && row < grid.rows && col >= 0 && col < grid.cols) {
      return { row, col };
    }
    return null;
  };

  // Parse a line/edge key "from,to" to get two indices
  const parseLineKey = (key: string): { from: number; to: number } | null => {
    const parts = key.split(',');
    if (parts.length !== 2) return null;
    const from = parseInt(parts[0]);
    const to = parseInt(parts[1]);
    if (isNaN(from) || isNaN(to)) return null;
    return { from, to };
  };

  // Use standardized color palettes from constants
  const surfaceColorMap = SurfaceColorPalette;
  const lineColorMap = LineColorPalette;

  // Convert surfaces
  if (pu.surface) {
    Object.entries(pu.surface).forEach(([indexStr, colorIndex]) => {
      const index = parseInt(indexStr);
      const pos = indexToRowCol(index);
      if (pos) {
        const id = `surface-${pos.row}-${pos.col}`;
        elements.surfaces[id] = {
          id,
          cellId: `cell-${pos.row}-${pos.col}`,
          color: surfaceColorMap[colorIndex] || PenpaColors.GREY,
          layer,
        };
      }
    });
  }

  // Convert numbers
  if (pu.number) {
    Object.entries(pu.number).forEach(([indexStr, data]) => {
      const index = parseInt(indexStr);
      const pos = indexToRowCol(index);
      if (pos && Array.isArray(data) && data.length >= 1) {
        const id = `number-${pos.row}-${pos.col}`;
        const value = String(data[0]);
        const style = Number(data[1]) || 1;

        // Penpa number styles:
        // 1: normal center
        // 2: corner (small)
        // 3: side
        // 4: candidates
        // etc.

        let position: 'center' | 'corner' | 'side' | 'candidates' = 'center';
        let size: 'large' | 'medium' | 'small' = 'medium';

        if (style === 2 || style === 4) {
          position = 'corner';
          size = 'small';
        } else if (style === 3) {
          position = 'side';
          size = 'small';
        } else if (style >= 10) {
          position = 'candidates';
          size = 'small';
        }

        elements.numbers[id] = {
          id,
          cellId: `cell-${pos.row}-${pos.col}`,
          value,
          size,
          position,
          color: '#000000',
          layer,
        };
      }
    });
  }

  // Convert Yajilin-style directional clues (qdir/qnum)
  if (pu.qdir && pu.qnum) {
    const height = pu.qdir.length;
    const width = height > 0 ? pu.qdir[0].length : grid.cols;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dir = pu.qdir[y][x];
        const num = pu.qnum[y][x];
        if (dir && num !== undefined && num !== -1 && num !== null) {
          const id = `dirclue-${y}-${x}`;
          elements.directionalClues = elements.directionalClues || {};
          elements.directionalClues[id] = {
            id,
            cell: y * width + x,
            direction: dir as 1 | 2 | 3 | 4,
            value: num as number,
            layer,
          };
        }
      }
    }
  }

  // Convert lines (cell-to-cell)
  if (pu.line) {
    Object.entries(pu.line).forEach(([key, colorIndex]) => {
      const parsed = parseLineKey(key);
      if (!parsed) return;

      const fromPos = indexToRowCol(parsed.from);
      const toPos = indexToRowCol(parsed.to);

      if (fromPos && toPos) {
        const id = `line-${fromPos.row}-${fromPos.col}-${toPos.row}-${toPos.col}`;
        elements.lines[id] = {
          id,
          from: `cell-${fromPos.row}-${fromPos.col}`,
          to: `cell-${toPos.row}-${toPos.col}`,
          style: 'solid',
          thickness: 'normal',
          color: lineColorMap[colorIndex] || PenpaColors.BLACK,
          layer,
        };
      }
    });
  }

  // Convert edges (vertex-to-vertex / lineE)
  if (pu.lineE) {
    Object.entries(pu.lineE).forEach(([key, colorIndex]) => {
      const parsed = parseLineKey(key);
      if (!parsed) return;

      // Vertices use the same index system in Penpa
      const fromRow = Math.floor(parsed.from / width) - 2;
      const fromCol = (parsed.from % width) - 2;
      const toRow = Math.floor(parsed.to / width) - 2;
      const toCol = (parsed.to % width) - 2;

      // Check bounds (vertices can be at row/col boundaries)
      if (fromRow >= 0 && fromRow <= grid.rows && fromCol >= 0 && fromCol <= grid.cols &&
          toRow >= 0 && toRow <= grid.rows && toCol >= 0 && toCol <= grid.cols) {
        const id = `edge-${fromRow}-${fromCol}-${toRow}-${toCol}`;
        elements.edges[id] = {
          id,
          from: `vertex-${fromRow}-${fromCol}`,
          to: `vertex-${toRow}-${toCol}`,
          style: 'solid',
          thickness: 'normal',
          color: lineColorMap[colorIndex] || PenpaColors.BLACK,
          layer,
        };
      }
    });
  }

  // Convert walls
  if (pu.wall) {
    Object.entries(pu.wall).forEach(([key, colorIndex]) => {
      const parsed = parseLineKey(key);
      if (!parsed) return;

      const fromRow = Math.floor(parsed.from / width) - 2;
      const fromCol = (parsed.from % width) - 2;
      const toRow = Math.floor(parsed.to / width) - 2;
      const toCol = (parsed.to % width) - 2;

      // Determine if horizontal or vertical wall
      if (fromRow === toRow) {
        // Horizontal wall
        const row = fromRow;
        const col = Math.min(fromCol, toCol);
        const id = `wall-h-${row}-${col}`;
        elements.walls[id] = {
          id,
          position: `edge-h-${row}-${col}`,
          style: 'solid',
          color: lineColorMap[colorIndex] || PenpaColors.BLACK,
          layer,
        };
      } else if (fromCol === toCol) {
        // Vertical wall
        const row = Math.min(fromRow, toRow);
        const col = fromCol;
        const id = `wall-v-${row}-${col}`;
        elements.walls[id] = {
          id,
          position: `edge-v-${row}-${col}`,
          style: 'solid',
          color: lineColorMap[colorIndex] || PenpaColors.BLACK,
          layer,
        };
      }
    });
  }

  // Convert symbols
  if (pu.symbol) {
    const symbolTypeMap: Record<number, string> = {
      1: 'circle',
      2: 'circle-filled',
      3: 'square',
      4: 'square-filled',
      5: 'triangle',
      6: 'triangle-filled',
      7: 'diamond',
      8: 'star',
      9: 'cross',
    };

    Object.entries(pu.symbol).forEach(([indexStr, data]) => {
      const index = parseInt(indexStr);
      const pos = indexToRowCol(index);
      if (pos && Array.isArray(data) && data.length >= 2) {
        const id = `symbol-${pos.row}-${pos.col}`;
        const styleNum = data[0] as number;
        const symbolType = symbolTypeMap[styleNum] || 'circle';

        elements.symbols[id] = {
          id,
          cellId: `cell-${pos.row}-${pos.col}`,
          symbolType,
          size: 'medium',
          rotation: 0,
          color: '#000000',
          layer,
        };
      }
    });
  }

  // Convert thermos
  if (pu.thermo && Array.isArray(pu.thermo)) {
    pu.thermo.forEach((thermoPoints, i) => {
      if (Array.isArray(thermoPoints) && thermoPoints.length > 1) {
        const id = `thermo-${i}`;
        const points: string[] = [];

        for (const pointIndex of thermoPoints) {
          const pos = indexToRowCol(pointIndex);
          if (pos) {
            points.push(`cell-${pos.row}-${pos.col}`);
          }
        }

        if (points.length > 1) {
          elements.specials[id] = {
            id,
            type: 'thermo',
            points,
            color: '#c0c0c0',
            layer,
          };
        }
      }
    });
  }

  // Convert arrows
  if (pu.arrows && Array.isArray(pu.arrows)) {
    pu.arrows.forEach((arrowPoints, i) => {
      if (Array.isArray(arrowPoints) && arrowPoints.length > 1) {
        const id = `arrow-${i}`;
        const points: string[] = [];

        for (const pointIndex of arrowPoints) {
          const pos = indexToRowCol(pointIndex);
          if (pos) {
            points.push(`cell-${pos.row}-${pos.col}`);
          }
        }

        if (points.length > 1) {
          elements.specials[id] = {
            id,
            type: 'arrow',
            points,
            color: '#000000',
            layer,
          };
        }
      }
    });
  }

  // Convert cages
  if (pu.cage) {
    Object.entries(pu.cage).forEach(([key, cageData]) => {
      if (cageData.cells && cageData.cells.length > 0) {
        const id = `cage-${key}`;
        const cells: string[] = [];

        for (const cellIndex of cageData.cells) {
          const pos = indexToRowCol(cellIndex);
          if (pos) {
            cells.push(`cell-${pos.row}-${pos.col}`);
          }
        }

        if (cells.length > 0) {
          elements.cages[id] = {
            id,
            cells,
            style: 'dashed',
            color: cageData.color || '#000000',
            label: cageData.value,
            layer,
          };
        }
      }
    });
  }
}

/**
 * Check if a URL is a Penpa URL
 */
export function isPenpaUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.hostname.includes('puzz.link') ||
      urlObj.hostname.includes('penpa') ||
      urlObj.searchParams.has(PENPA_PARAMS.PUZZLE)
    );
  } catch {
    return false;
  }
}

/**
 * Check if a URL is a puzz.link URL (puzzle-specific format)
 */
export function isPuzzlinkUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'puzz.link' || urlObj.hostname.endsWith('.puzz.link');
  } catch {
    return false;
  }
}

/**
 * Check if a URL is a puzsq (Puzzle Square) URL
 * Format: https://puzsq.logicpuzzle.app/puzzle/{id}
 */
export function isPuzsqUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'puzsq.logicpuzzle.app' && urlObj.pathname.startsWith('/puzzle/');
  } catch {
    return false;
  }
}

/**
 * Extract puzzle ID from puzsq URL
 */
export function extractPuzsqId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/^\/puzzle\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Fetch puzzle data from puzsq API and parse it
 * Uses CORS proxy to bypass browser restrictions
 * @param url puzsq puzzle URL (e.g., https://puzsq.logicpuzzle.app/puzzle/166830)
 * @returns Promise of PuzzlinkData or null if failed
 */
export async function fetchPuzsqPuzzle(url: string): Promise<PuzzlinkData | null> {
  const puzzleId = extractPuzsqId(url);
  if (!puzzleId) {
    console.error('[fetchPuzsqPuzzle] Invalid puzsq URL:', url);
    return null;
  }

  try {
    const apiUrl = `https://puzsq.logicpuzzle.app/api/problem/prob/${puzzleId}`;

    // Try direct fetch first (works if CORS is enabled on server)
    let response: Response;
    try {
      response = await fetch(apiUrl);
    } catch {
      // If direct fetch fails due to CORS, try with a CORS proxy
      // Using corsproxy.io as a fallback
      console.log('[fetchPuzsqPuzzle] Direct fetch failed, trying CORS proxy...');
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(apiUrl)}`;
      response = await fetch(proxyUrl);
    }

    if (!response.ok) {
      console.error('[fetchPuzsqPuzzle] API request failed:', response.status);
      return null;
    }

    const data = await response.json();

    // API returns { "puzzleId": { ...puzzleData } }
    const puzzleData = data[puzzleId];
    if (!puzzleData) {
      console.error('[fetchPuzsqPuzzle] Puzzle not found in response');
      return null;
    }

    // Check if url field exists
    if (!puzzleData.url) {
      console.error('[fetchPuzsqPuzzle] No puzz.link URL in response');
      return null;
    }

    // Parse the puzz.link URL
    return parsePuzzlinkUrl(puzzleData.url);
  } catch (error) {
    console.error('[fetchPuzsqPuzzle] Error fetching puzzle:', error);
    return null;
  }
}

/**
 * Parse puzz.link URL format
 * Format: https://puzz.link/p?{type}/{width}/{height}/{data}
 * or: https://puzz.link/p/{type}/{width}/{height}/{data}
 */
export function parsePuzzlinkUrl(url: string): PuzzlinkData | null {
  try {
    const urlObj = new URL(url);

    // Extract puzzle data from path or query
    // puzz.link can use either /p?type/w/h/data or /p/type/w/h/data
    let puzzleData = '';

    if (urlObj.search && urlObj.search.length > 1) {
      // Format: /p?type/width/height/data
      puzzleData = urlObj.search.slice(1); // Remove leading '?'
    } else if (urlObj.pathname.startsWith('/p/')) {
      // Format: /p/type/width/height/data
      puzzleData = urlObj.pathname.slice(3); // Remove '/p/'
    } else if (urlObj.pathname.startsWith('/p?')) {
      // Format: /p?type... in pathname (unusual but handle it)
      puzzleData = urlObj.pathname.slice(3);
    }

    if (!puzzleData) {
      console.error('No puzzle data found in URL');
      return null;
    }

    const parts = puzzleData.split('/');
    if (parts.length < 3) {
      console.error('Invalid puzz.link URL format: need at least type/width/height');
      return null;
    }

    const puzzleType = parts[0];

    // Handle variant flags (e.g., yajilin/b/10/10/data where 'b' is a flag)
    // pzprjs uses single-letter flags between type and dimensions
    // Check if parts[1] is a number or a variant flag
    let partIndex = 1;
    let variantFlags = '';
    while (partIndex < parts.length && isNaN(parseInt(parts[partIndex]))) {
      variantFlags += parts[partIndex];
      partIndex++;
    }

    if (partIndex + 1 >= parts.length) {
      console.error('Invalid puzz.link URL format: need dimensions after type/flags');
      return null;
    }

    const width = parseInt(parts[partIndex]);
    const height = parseInt(parts[partIndex + 1]);
    const data = parts.slice(partIndex + 2).join('/');

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      console.error('Invalid dimensions in puzz.link URL');
      return null;
    }

    // Determine grid style and frame style based on puzzle type
    const getGridStyles = (type: string): { gridStyle: GridConfig['gridStyle']; frameStyle: GridConfig['frameStyle'] } => {
      switch (type) {
        case 'slither':
        case 'slitherlink':
          return { gridStyle: 'dots', frameStyle: 'none' };
        case 'mashu':
        case 'masyu':
        case 'nurikabe':
        case 'heyawake':
        case 'yajilin':
          return { gridStyle: 'normal', frameStyle: 'thick' };
        case 'sudoku':
          return { gridStyle: 'sudoku', frameStyle: 'thick' };
        default:
          return { gridStyle: 'normal', frameStyle: 'normal' };
      }
    };
    const styles = getGridStyles(puzzleType);

    const grid: GridConfig = {
      rows: height,
      cols: width,
      cellSize: 40,
      outerPadding: 20,
      showGrid: true,
      gridStyle: styles.gridStyle,
      gridType: 'square',
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      frameStyle: styles.frameStyle,
      frameColor: '#000000',
      gridColor: '#000000',
      backgroundColor: '#ffffff',
    };

    const createEmptyElements = (): PuzzleElements => ({
      surfaces: {},
      lines: {},
      edges: {},
      walls: {},
      numbers: {},
      symbols: {},
      cages: {},
      specials: {},
      boxLines: {},
      directionalClues: {},
    });

    const state: PuzzleState = {
      problem: createEmptyElements(),
      answer: createEmptyElements(),
    };

    // Parse puzzle-type specific data
    if (data) {
      parsePuzzlinkData(puzzleType, data, width, height, state);
    }

    return { grid, state, puzzleType };
  } catch (error) {
    console.error('Failed to parse puzz.link URL:', error);
    return null;
  }
}

/**
 * Parse puzz.link data string for specific puzzle types
 */
function parsePuzzlinkData(
  puzzleType: string,
  data: string,
  width: number,
  height: number,
  state: PuzzleState
): void {
  // puzz.link uses a base64-like encoding with run-length compression
  // Different puzzle types have different data formats

  switch (puzzleType) {
    case 'sudoku':
      parseSudokuData(data, state);
      break;
    case 'yajilin':
    case 'lixloop':
      parseYajilinData(data, width, height, state);
      break;
    case 'slitherlink':
    case 'slither':
      // Slitherlink uses decode4Cell encoding (0-4 values)
      parseSlitherlinkData(data, width, height, state);
      break;
    case 'nurikabe':
      // Nurikabe uses decodeNumber16 encoding
      parseNurikabeData(data, width, height, state);
      break;
    case 'masyu':
    case 'mashu':
      // Masyu uses decode4Cell encoding (1=white, 2=black)
      parseMasyuData(data, width, height, state);
      break;
    case 'heyawake':
    case 'ayeheya':
      // Heyawake uses decodeBorder + decodeRoomNumber16
      parseHeyawakeData(data, width, height, state);
      break;
    case 'shakashaka':
    case 'akari':
      // These puzzles use similar number-based encoding
      parseGenericNumberData(data, state);
      break;
    default:
      // Try generic parsing for unknown types
      parseGenericNumberData(data, state);
  }
}

/**
 * Parse Yajilin data from puzz.link
 * Format: decodeArrowNumber16 from pzprjs
 *
 * URL format: yajilin/{width}/{height}/{data}
 * Data encoding:
 * - 'a'-'z': skip cells (a=1, b=2, ... z=26)
 * - '0'-'4': direction (0=none, 1=↑, 2=↓, 3=←, 4=→), next char is number (0-f or '.')
 * - '5'-'9': direction (0-4), next 2 chars are hex number
 * - '-': direction in next char, next 3 chars are hex number
 * - '+': no direction marker (qnum=-3)
 *
 * Direction mapping (pzprjs): 1=UP, 2=DOWN, 3=LEFT, 4=RIGHT
 * Direction mapping (puzzle-kit): 1=UP, 2=DOWN, 3=LEFT, 4=RIGHT
 */
function parseYajilinData(data: string, width: number, height: number, state: PuzzleState): void {
  const totalCells = width * height;
  let cellIndex = 0;
  let i = 0;

  while (i < data.length && cellIndex < totalCells) {
    const ca = data.charAt(i);

    if (ca >= 'a' && ca <= 'z') {
      // Skip cells: pzprjs uses c += parseInt(ca, 36) - 10
      // 'a' = 10 in base36, so 'a' = 0 skip, 'b' = 1 skip, etc.
      const skip = parseInt(ca, 36) - 10;
      cellIndex += skip;
    } else if (ca === '+') {
      // No direction marker (qnum = -3 in pzprjs, skip for now)
      // This is a special marker, not a regular arrow clue
    } else if (ca >= '0' && ca <= '4') {
      // Direction 0-4, next char is number (single hex digit or '.')
      const dir = parseInt(ca, 10);
      const ca1 = data.charAt(i + 1);
      let num: number;

      if (ca1 === '.') {
        num = -2; // Unknown number (hatena/?)
      } else {
        num = parseInt(ca1, 16);
      }
      i++;

      // dir > 0 means has direction, num >= 0 OR num === -2 (hatena) are valid
      if (dir > 0 && (num >= 0 || num === -2)) {
        // Create directional clue
        const row = Math.floor(cellIndex / width);
        const col = cellIndex % width;
        const id = `dirclue-${row}-${col}`;

        state.problem.directionalClues = state.problem.directionalClues || {};
        state.problem.directionalClues[id] = {
          id,
          cell: cellIndex,
          direction: dir as 1 | 2 | 3 | 4,
          value: num, // -2 means "?" (hatena)
          layer: 'problem',
        };
      }
    } else if (ca >= '5' && ca <= '9') {
      // Direction (char - 5), next 2 chars are hex number
      const dir = parseInt(ca, 10) - 5;
      const num = parseInt(data.substr(i + 1, 2), 16);
      i += 2;

      if (dir > 0 && num >= 0) {
        const row = Math.floor(cellIndex / width);
        const col = cellIndex % width;
        const id = `dirclue-${row}-${col}`;

        state.problem.directionalClues = state.problem.directionalClues || {};
        state.problem.directionalClues[id] = {
          id,
          cell: cellIndex,
          direction: dir as 1 | 2 | 3 | 4,
          value: num,
          layer: 'problem',
        };
      }
    } else if (ca === '-') {
      // Direction in next char, next 3 chars are hex number
      const dir = parseInt(data.charAt(i + 1), 16);
      const num = parseInt(data.substr(i + 2, 3), 16);
      i += 4;

      if (dir > 0 && num >= 0) {
        const row = Math.floor(cellIndex / width);
        const col = cellIndex % width;
        const id = `dirclue-${row}-${col}`;

        state.problem.directionalClues = state.problem.directionalClues || {};
        state.problem.directionalClues[id] = {
          id,
          cell: cellIndex,
          direction: dir as 1 | 2 | 3 | 4,
          value: num,
          layer: 'problem',
        };
      }
    }

    cellIndex++;
    i++;
  }
}

/**
 * Parse sudoku data from puzz.link
 */
function parseSudokuData(data: string, state: PuzzleState): void {
  // Sudoku uses a simple character-based encoding
  // '.' or '0' = empty, '1'-'9' = given numbers
  // Some variants use 'a'-'i' for 10-18 in larger puzzles

  let col = 0;
  let row = 0;

  for (const char of data) {
    if (char >= '1' && char <= '9') {
      const cellId = `cell-${row}-${col}`;
      const id = `number-${row}-${col}`;
      state.problem.numbers[id] = {
        id,
        cellId,
        value: char,
        size: 'medium',
        position: 'center',
        color: '#000000',
        layer: 'problem',
      };
      col++;
    } else if (char === '.' || char === '0') {
      col++;
    } else if (char >= 'a' && char <= 'z') {
      // Skip cells (run-length encoding)
      col += char.charCodeAt(0) - 'a'.charCodeAt(0) + 1;
    } else if (char >= 'g' && char <= 'z') {
      // Alternative: skip cells
      col += char.charCodeAt(0) - 'f'.charCodeAt(0);
    }

    // Handle row overflow
    while (col >= 9) {
      col -= 9;
      row++;
    }
  }
}

/**
 * Parse Slitherlink data from puzz.link
 * Format: decode4Cell from pzprjs
 *
 * Data encoding (decode4Cell):
 * - '0'-'4': cell value (0-4), advance 1
 * - '5'-'9': cell value (hex-5 = 0-4), skip 1 additional cell (total advance 2)
 * - 'a'-'e': cell value (hex-10 = 0-4), skip 2 additional cells (total advance 3)
 * - 'g'-'z': skip cells (base36 - 16), no value placed
 * - '.': question mark (-2), advance 1
 *
 * Important: In pzprjs, after placing a value, c++ happens at end of loop.
 * So '5'-'9' places value at c, then c++, then c++ at end = advance 2.
 * And 'a'-'e' places value at c, then c+=2, then c++ at end = advance 3.
 */
function parseSlitherlinkData(data: string, width: number, height: number, state: PuzzleState): void {
  const totalCells = width * height;
  let cellIndex = 0;
  let i = 0;

  while (i < data.length && cellIndex < totalCells) {
    const char = data[i];

    if (char >= '0' && char <= '4') {
      // Direct value 0-4, advance 1
      const value = parseInt(char, 16);
      if (value >= 0 && value <= 3) {
        const row = Math.floor(cellIndex / width);
        const col = cellIndex % width;

        const clueId = `clue-${row}-${col}`;
        if (!state.problem.directionalClues) {
          state.problem.directionalClues = {};
        }
        state.problem.directionalClues[clueId] = {
          id: clueId,
          cell: cellIndex,
          direction: 0,
          value: value,
          layer: 'problem',
        };
      }
      cellIndex++;
    } else if (char >= '5' && char <= '9') {
      // Value (hex - 5), then skip 1 extra cell (total advance 2)
      const value = parseInt(char, 16) - 5;
      if (value >= 0 && value <= 3) {
        const row = Math.floor(cellIndex / width);
        const col = cellIndex % width;

        const clueId = `clue-${row}-${col}`;
        if (!state.problem.directionalClues) {
          state.problem.directionalClues = {};
        }
        state.problem.directionalClues[clueId] = {
          id: clueId,
          cell: cellIndex,
          direction: 0,
          value: value,
          layer: 'problem',
        };
      }
      cellIndex += 2; // c++ in loop, then c++ at end
    } else if (char >= 'a' && char <= 'e') {
      // Value (hex - 10 = 0-4), then skip 2 extra cells (total advance 3)
      const value = parseInt(char, 16) - 10;
      if (value >= 0 && value <= 3) {
        const row = Math.floor(cellIndex / width);
        const col = cellIndex % width;

        const clueId = `clue-${row}-${col}`;
        if (!state.problem.directionalClues) {
          state.problem.directionalClues = {};
        }
        state.problem.directionalClues[clueId] = {
          id: clueId,
          cell: cellIndex,
          direction: 0,
          value: value,
          layer: 'problem',
        };
      }
      cellIndex += 3; // c+=2 in loop, then c++ at end
    } else if (char >= 'g' && char <= 'z') {
      // Skip cells: base36 value - 16, then +1 at end
      const skip = parseInt(char, 36) - 16;
      cellIndex += skip + 1;
    } else if (char === '.') {
      // Question mark (-2 in pzprjs), skip for now
      cellIndex++;
    } else if (char === 'f') {
      // 'f' is not used in decode4Cell, but handle as empty
      cellIndex++;
    }

    i++;
  }
}

/**
 * Parse Nurikabe data from puzz.link
 * Format: decodeNumber16 from pzprjs
 *
 * Data encoding:
 * - 'a'-'z': skip cells (a=0, b=1, ... z=25)
 * - '0'-'9','a'-'f': single hex digit (0-15)
 * - '-': followed by 2 hex digits for numbers 16-255
 * - '+': followed by 3 hex digits for larger numbers
 * - '.': question mark (unknown number)
 */
function parseNurikabeData(data: string, width: number, height: number, state: PuzzleState): void {
  const totalCells = width * height;
  let cellIndex = 0;
  let i = 0;

  while (i < data.length && cellIndex < totalCells) {
    const char = data[i];

    if (char >= 'g' && char <= 'z') {
      // Skip cells: 'g'=0, 'h'=1, ... 'z'=19 (but pzprjs uses different offset)
      // Actually in decodeNumber16: letters skip cells
      const skip = char.charCodeAt(0) - 'f'.charCodeAt(0);
      cellIndex += skip;
    } else if (char >= '0' && char <= '9') {
      // Single digit number
      const value = parseInt(char, 10);
      const row = Math.floor(cellIndex / width);
      const col = cellIndex % width;

      const clueId = `clue-${row}-${col}`;
      if (!state.problem.directionalClues) {
        state.problem.directionalClues = {};
      }
      state.problem.directionalClues[clueId] = {
        id: clueId,
        cell: cellIndex,
        direction: 0,
        value: value,
        layer: 'problem',
      };
      cellIndex++;
    } else if (char >= 'a' && char <= 'f') {
      // Hex digit 10-15
      const value = parseInt(char, 16);
      const row = Math.floor(cellIndex / width);
      const col = cellIndex % width;

      const clueId = `clue-${row}-${col}`;
      if (!state.problem.directionalClues) {
        state.problem.directionalClues = {};
      }
      state.problem.directionalClues[clueId] = {
        id: clueId,
        cell: cellIndex,
        direction: 0,
        value: value,
        layer: 'problem',
      };
      cellIndex++;
    } else if (char === '-') {
      // 2-digit hex number (16-255)
      const hex = data.substring(i + 1, i + 3);
      const value = parseInt(hex, 16);
      i += 2;

      const row = Math.floor(cellIndex / width);
      const col = cellIndex % width;

      const clueId = `clue-${row}-${col}`;
      if (!state.problem.directionalClues) {
        state.problem.directionalClues = {};
      }
      state.problem.directionalClues[clueId] = {
        id: clueId,
        cell: cellIndex,
        direction: 0,
        value: value,
        layer: 'problem',
      };
      cellIndex++;
    } else if (char === '+') {
      // 3-digit hex number
      const hex = data.substring(i + 1, i + 4);
      const value = parseInt(hex, 16);
      i += 3;

      const row = Math.floor(cellIndex / width);
      const col = cellIndex % width;

      const clueId = `clue-${row}-${col}`;
      if (!state.problem.directionalClues) {
        state.problem.directionalClues = {};
      }
      state.problem.directionalClues[clueId] = {
        id: clueId,
        cell: cellIndex,
        direction: 0,
        value: value,
        layer: 'problem',
      };
      cellIndex++;
    } else if (char === '.') {
      // Question mark - skip for now
      cellIndex++;
    }

    i++;
  }
}

/**
 * Parse Masyu data from puzz.link
 * Format: decodeCircle from pzprjs (base-27, 3 cells per character)
 *
 * Values: 0=empty, 1=white circle, 2=black circle
 * Each character encodes 3 cells using base-27:
 * - val = parseInt(char, 27)
 * - cell0 = floor(val / 9) % 3
 * - cell1 = floor(val / 3) % 3
 * - cell2 = val % 3
 */
function parseMasyuData(data: string, width: number, height: number, state: PuzzleState): void {
  const totalCells = width * height;
  const tri = [9, 3, 1]; // Divisors for extracting 3 values from base-27
  let cellIndex = 0;

  for (let i = 0; i < data.length && cellIndex < totalCells; i++) {
    const char = data[i];
    const ca = parseInt(char, 27); // base-27

    // Each character encodes up to 3 cells
    for (let w = 0; w < 3 && cellIndex < totalCells; w++) {
      const val = Math.floor(ca / tri[w]) % 3;

      if (val > 0) {
        const row = Math.floor(cellIndex / width);
        const col = cellIndex % width;
        const cellId = `cell-${row}-${col}`;
        const symId = `sym-${row}-${col}`;

        state.problem.symbols[symId] = {
          id: symId,
          cellId,
          symbolType: val === 1 ? 'circle-empty' : 'circle-filled',
          size: 'large',
          color: '#000000',
          rotation: 0,
          layer: 'problem',
        };
      }
      cellIndex++;
    }
  }
}

/**
 * Parse Heyawake data from puzz.link
 * Format: decodeBorder + decodeRoomNumber16 from pzprjs
 *
 * Data structure:
 * 1. Border data (base-32 encoded, 5 borders per character)
 *    - Vertical borders: (cols-1)*rows borders
 *    - Horizontal borders: cols*(rows-1) borders
 * 2. Room numbers (decodeNumber16 format after border data)
 */
function parseHeyawakeData(data: string, width: number, height: number, state: PuzzleState): void {
  // Calculate border data length
  const verticalBorderCount = (width - 1) * height;
  const horizontalBorderCount = width * (height - 1);
  const verticalChars = Math.ceil(verticalBorderCount / 5);
  const horizontalChars = Math.ceil(horizontalBorderCount / 5);
  const borderChars = verticalChars + horizontalChars;

  // Parse border data
  const borderData = data.substring(0, Math.min(borderChars, data.length));
  const numberData = data.substring(borderChars);

  // Decode borders (base-32, 5 bits per character)
  const twi = [16, 8, 4, 2, 1]; // Bit weights for extracting 5 values

  // Vertical borders (between columns): stored as array [row][col]
  // There are (width-1) vertical borders per row
  const verticalBorders: boolean[][] = Array.from({ length: height }, () =>
    Array(width - 1).fill(false)
  );

  let borderIndex = 0;
  for (let i = 0; i < verticalChars && i < borderData.length; i++) {
    const ca = parseInt(borderData.charAt(i), 32);
    for (let w = 0; w < 5; w++) {
      if (borderIndex < verticalBorderCount) {
        const row = Math.floor(borderIndex / (width - 1));
        const col = borderIndex % (width - 1);
        verticalBorders[row][col] = (ca & twi[w]) !== 0;
        borderIndex++;
      }
    }
  }

  // Horizontal borders (between rows): stored after vertical borders
  // There are width horizontal borders per inter-row gap
  const horizontalBorders: boolean[][] = Array.from({ length: height - 1 }, () =>
    Array(width).fill(false)
  );

  borderIndex = 0;
  for (let i = verticalChars; i < verticalChars + horizontalChars && i < borderData.length; i++) {
    const ca = parseInt(borderData.charAt(i), 32);
    for (let w = 0; w < 5; w++) {
      if (borderIndex < horizontalBorderCount) {
        const row = Math.floor(borderIndex / width);
        const col = borderIndex % width;
        horizontalBorders[row][col] = (ca & twi[w]) !== 0;
        borderIndex++;
      }
    }
  }

  // Convert borders to walls
  let wallId = 1;

  // Add vertical walls (between column col and col+1)
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width - 1; col++) {
      if (verticalBorders[row][col]) {
        const id = `wall-${wallId++}`;
        state.problem.walls[id] = {
          id,
          position: `edge-v-${row}-${col + 1}`,
          style: 'solid',
          color: '#000000',
          layer: 'problem',
        };
      }
    }
  }

  // Add horizontal walls (between row r and r+1)
  for (let row = 0; row < height - 1; row++) {
    for (let col = 0; col < width; col++) {
      if (horizontalBorders[row][col]) {
        const id = `wall-${wallId++}`;
        state.problem.walls[id] = {
          id,
          position: `edge-h-${row + 1}-${col}`,
          style: 'solid',
          color: '#000000',
          layer: 'problem',
        };
      }
    }
  }

  // Build rooms from borders using flood fill
  const cellRoom: number[][] = Array.from({ length: height }, () =>
    Array(width).fill(-1)
  );
  let roomId = 0;
  const roomTopLeftCells: { row: number; col: number }[] = [];

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (cellRoom[row][col] === -1) {
        // Found unvisited cell - flood fill to find room
        const queue: { r: number; c: number }[] = [{ r: row, c: col }];
        cellRoom[row][col] = roomId;
        roomTopLeftCells.push({ row, col });

        while (queue.length > 0) {
          const { r, c } = queue.shift()!;

          // Check up (no horizontal border above)
          if (r > 0 && !horizontalBorders[r - 1][c] && cellRoom[r - 1][c] === -1) {
            cellRoom[r - 1][c] = roomId;
            queue.push({ r: r - 1, c });
          }
          // Check down (no horizontal border below)
          if (r < height - 1 && !horizontalBorders[r][c] && cellRoom[r + 1][c] === -1) {
            cellRoom[r + 1][c] = roomId;
            queue.push({ r: r + 1, c });
          }
          // Check left (no vertical border to the left)
          if (c > 0 && !verticalBorders[r][c - 1] && cellRoom[r][c - 1] === -1) {
            cellRoom[r][c - 1] = roomId;
            queue.push({ r, c: c - 1 });
          }
          // Check right (no vertical border to the right)
          if (c < width - 1 && !verticalBorders[r][c] && cellRoom[r][c + 1] === -1) {
            cellRoom[r][c + 1] = roomId;
            queue.push({ r, c: c + 1 });
          }
        }
        roomId++;
      }
    }
  }

  // Parse room numbers using decodeNumber16 (same as genericDecodeNumber16)
  const roomNumbers: (number | null)[] = Array(roomId).fill(null);
  let roomIndex = 0;
  let i = 0;

  while (i < numberData.length && roomIndex < roomId) {
    const ca = numberData.charAt(i);

    // readNumber16 equivalent
    if ((ca >= '0' && ca <= '9') || (ca >= 'a' && ca <= 'f')) {
      // Single hex digit (0-15)
      roomNumbers[roomIndex] = parseInt(ca, 16);
      roomIndex++;
      i++;
    } else if (ca === '-') {
      // 2-digit hex number (16-255)
      roomNumbers[roomIndex] = parseInt(numberData.substring(i + 1, i + 3), 16);
      roomIndex++;
      i += 3;
    } else if (ca === '+') {
      // 3-digit hex number (256-4095)
      roomNumbers[roomIndex] = parseInt(numberData.substring(i + 1, i + 4), 16);
      roomIndex++;
      i += 4;
    } else if (ca === '.') {
      // Question mark (-2 in pzprjs)
      roomNumbers[roomIndex] = -2;
      roomIndex++;
      i++;
    } else if (ca >= 'g' && ca <= 'z') {
      // Skip rooms: 'g'=1, 'h'=2, ... 'z'=20 (base36 - 15)
      const skip = parseInt(ca, 36) - 15;
      roomIndex += skip;
      i++;
    } else {
      i++;
    }
  }

  // Place room numbers at top-left cell of each room
  for (let r = 0; r < roomId; r++) {
    const num = roomNumbers[r];
    if (num !== null && num >= 0) {
      const { row, col } = roomTopLeftCells[r];
      const id = `number-${row}-${col}`;
      state.problem.numbers[id] = {
        id,
        cellId: `cell-${row}-${col}`,
        value: String(num),
        size: 'medium',
        position: 'center',
        color: '#000000',
        layer: 'problem',
      };
    }
  }
}

/**
 * Parse generic number data from puzz.link (for puzzles with clue numbers)
 */
function parseGenericNumberData(data: string, state: PuzzleState): void {
  // Many puzzles use similar encoding:
  // Numbers are placed in cells, with run-length encoding for empty cells

  let col = 0;
  let row = 0;
  let i = 0;

  while (i < data.length) {
    const char = data[i];

    if (char >= '0' && char <= '9') {
      // Read full number (could be multi-digit)
      let numStr = char;
      while (i + 1 < data.length && data[i + 1] >= '0' && data[i + 1] <= '9') {
        i++;
        numStr += data[i];
      }

      // Place number at current position
      const cellId = `cell-${row}-${col}`;
      const id = `number-${row}-${col}`;
      state.problem.numbers[id] = {
        id,
        cellId,
        value: numStr,
        size: 'medium',
        position: 'center',
        color: '#000000',
        layer: 'problem',
      };
      col++;
    } else if (char === '-' || char === '.') {
      // Empty cell marker
      col++;
    } else if (char >= 'a' && char <= 'z') {
      // Skip cells (run-length): 'a'=1, 'b'=2, etc.
      col += char.charCodeAt(0) - 'a'.charCodeAt(0) + 1;
    } else if (char >= 'A' && char <= 'Z') {
      // Alternative encoding or special markers
      col++;
    }

    i++;

    // Assuming a square grid for simplicity (could be improved with actual dimensions)
    if (col >= 100) {
      col = 0;
      row++;
    }
  }
}

/**
 * Generate puzz.link URL from PuzzleKit data
 */
export function generatePuzzlinkUrl(
  grid: GridConfig,
  state: PuzzleState,
  puzzleType: string = 'edit'
): string {
  const { cols, rows } = grid;

  // Encode numbers
  let data = '';
  let skipCount = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cellId = `cell-${row}-${col}`;
      const number = Object.values(state.problem.numbers).find(
        (n) => n.cellId === cellId && n.position === 'center'
      );

      if (number) {
        // Flush skip count
        if (skipCount > 0) {
          data += encodeSkipCount(skipCount);
          skipCount = 0;
        }
        data += number.value;
      } else {
        skipCount++;
      }
    }
  }

  // Flush remaining skip count
  if (skipCount > 0) {
    data += encodeSkipCount(skipCount);
  }

  return `https://puzz.link/p?${puzzleType}/${cols}/${rows}/${data}`;
}

/**
 * Encode skip count for puzz.link format
 */
function encodeSkipCount(count: number): string {
  if (count <= 0) return '';
  if (count <= 26) {
    return String.fromCharCode('a'.charCodeAt(0) + count - 1);
  }
  // For larger counts, use multiple letters
  let result = '';
  while (count > 26) {
    result += 'z';
    count -= 26;
  }
  if (count > 0) {
    result += String.fromCharCode('a'.charCodeAt(0) + count - 1);
  }
  return result;
}

/**
 * Export PuzzleKit data to Penpa-compatible format (enhanced support)
 */
export function exportToPenpaFormat(
  grid: GridConfig,
  state: PuzzleState
): string | null {
  try {
    const { rows, cols, cellSize } = grid;
    const width = cols + 4;

    // Cell index calculation (Penpa's linear index with 2-cell padding)
    const rowColToIndex = (row: number, col: number): number => {
      return (row + 2) * width + (col + 2);
    };

    // Vertex index calculation (for edge/line endpoints)
    // Vertices are at half-integer positions in Penpa's coordinate system
    const vertexToKey = (row: number, col: number): string => {
      // Penpa uses string keys for line endpoints: "from,to"
      // Each vertex is at position (row + 2, col + 2) in the expanded grid
      return String((row + 2) * width + (col + 2));
    };

    // Line key calculation (cell-to-cell)
    const lineKey = (fromRow: number, fromCol: number, toRow: number, toCol: number): string => {
      const from = rowColToIndex(fromRow, fromCol);
      const to = rowColToIndex(toRow, toCol);
      return from < to ? `${from},${to}` : `${to},${from}`;
    };

    // Edge key calculation (vertex-to-vertex)
    const edgeKey = (fromRow: number, fromCol: number, toRow: number, toCol: number): string => {
      const from = vertexToKey(fromRow, fromCol);
      const to = vertexToKey(toRow, toCol);
      return parseInt(from) < parseInt(to) ? `${from},${to}` : `${to},${from}`;
    };

    // Build reverse lookup from color palettes
    const surfaceColorToNum: Record<string, number> = {};
    Object.entries(SurfaceColorPalette).forEach(([index, color]) => {
      if (typeof color === 'string' && color !== 'transparent') {
        surfaceColorToNum[color.toLowerCase()] = parseInt(index);
      }
    });

    const lineColorToNum: Record<string, number> = {};
    Object.entries(LineColorPalette).forEach(([index, color]) => {
      if (typeof color === 'string' && color !== 'transparent') {
        lineColorToNum[color.toLowerCase()] = parseInt(index);
      }
    });

    const convertLayer = (elements: PuzzleElements): PenpaPuData => {
      const pu: PenpaPuData = {};

      // Convert surfaces
      if (Object.keys(elements.surfaces).length > 0) {
        pu.surface = {};
        Object.values(elements.surfaces).forEach((surface) => {
          const match = surface.cellId.match(/^cell-(\d+)-(\d+)$/);
          if (match) {
            const row = parseInt(match[1]);
            const col = parseInt(match[2]);
            const index = rowColToIndex(row, col);
            pu.surface![index] = surfaceColorToNum[surface.color.toLowerCase()] || 2;
          }
        });
      }

      // Convert numbers
      if (Object.keys(elements.numbers).length > 0) {
        pu.number = {};
        Object.values(elements.numbers).forEach((num) => {
          const match = num.cellId.match(/^cell-(\d+)-(\d+)$/);
          if (match) {
            const row = parseInt(match[1]);
            const col = parseInt(match[2]);
            const index = rowColToIndex(row, col);

            let style = 1;
            if (num.position === 'corner') style = 2;
            if (num.position === 'side') style = 3;
            if (num.position === 'candidates') style = 4;

            pu.number![index] = [num.value, style, '1'];
          }
        });
      }

      // Convert lines (cell-to-cell)
      if (Object.keys(elements.lines).length > 0) {
        pu.line = {};
        Object.values(elements.lines).forEach((line) => {
          const fromMatch = line.from.match(/^cell-(\d+)-(\d+)$/);
          const toMatch = line.to.match(/^cell-(\d+)-(\d+)$/);
          if (fromMatch && toMatch) {
            const fromRow = parseInt(fromMatch[1]);
            const fromCol = parseInt(fromMatch[2]);
            const toRow = parseInt(toMatch[1]);
            const toCol = parseInt(toMatch[2]);
            const key = lineKey(fromRow, fromCol, toRow, toCol);

            // Penpa line style: 1=black, 2=grey, 3=green, etc.
            pu.line![key] = lineColorToNum[line.color.toLowerCase()] || 1;
          }
        });
      }

      // Convert edges (vertex-to-vertex)
      if (Object.keys(elements.edges).length > 0) {
        pu.lineE = {};
        Object.values(elements.edges).forEach((edge) => {
          const fromMatch = edge.from.match(/^vertex-(\d+)-(\d+)$/);
          const toMatch = edge.to.match(/^vertex-(\d+)-(\d+)$/);
          if (fromMatch && toMatch) {
            const fromRow = parseInt(fromMatch[1]);
            const fromCol = parseInt(fromMatch[2]);
            const toRow = parseInt(toMatch[1]);
            const toCol = parseInt(toMatch[2]);
            const key = edgeKey(fromRow, fromCol, toRow, toCol);

            pu.lineE![key] = lineColorToNum[edge.color.toLowerCase()] || 1;
          }
        });
      }

      // Convert walls
      if (Object.keys(elements.walls).length > 0) {
        pu.wall = {};
        Object.values(elements.walls).forEach((wall) => {
          // Walls are on edge positions (edge-h or edge-v)
          const hMatch = wall.position.match(/^edge-h-(\d+)-(\d+)$/);
          const vMatch = wall.position.match(/^edge-v-(\d+)-(\d+)$/);

          if (hMatch) {
            // Horizontal edge between (row-1, col) and (row, col)
            const row = parseInt(hMatch[1]);
            const col = parseInt(hMatch[2]);
            const key = edgeKey(row, col, row, col + 1);
            pu.wall![key] = lineColorToNum[wall.color.toLowerCase()] || 1;
          } else if (vMatch) {
            // Vertical edge between (row, col-1) and (row, col)
            const row = parseInt(vMatch[1]);
            const col = parseInt(vMatch[2]);
            const key = edgeKey(row, col, row + 1, col);
            pu.wall![key] = lineColorToNum[wall.color.toLowerCase()] || 1;
          }
        });
      }

      // Convert symbols
      if (Object.keys(elements.symbols).length > 0) {
        pu.symbol = {};
        const symbolToNum: Record<string, number> = {
          'circle': 1,
          'circle-filled': 2,
          'square': 3,
          'square-filled': 4,
          'triangle': 5,
          'triangle-filled': 6,
          'diamond': 7,
          'star': 8,
          'cross': 9,
        };

        Object.values(elements.symbols).forEach((symbol) => {
          const match = symbol.cellId.match(/^cell-(\d+)-(\d+)$/);
          if (match) {
            const row = parseInt(match[1]);
            const col = parseInt(match[2]);
            const index = rowColToIndex(row, col);
            const styleNum = symbolToNum[symbol.symbolType] || 1;
            pu.symbol![index] = [styleNum, symbol.symbolType, 1];
          }
        });
      }

      // Convert thermos
      const thermos = Object.values(elements.specials).filter(s => s.type === 'thermo');
      if (thermos.length > 0) {
        pu.thermo = thermos.map((thermo) => {
          return thermo.points.map((pointId) => {
            const match = pointId.match(/^cell-(\d+)-(\d+)$/);
            if (match) {
              const row = parseInt(match[1]);
              const col = parseInt(match[2]);
              return rowColToIndex(row, col);
            }
            return 0;
          }).filter(i => i > 0);
        });
      }

      // Convert arrows
      const arrows = Object.values(elements.specials).filter(s => s.type === 'arrow');
      if (arrows.length > 0) {
        pu.arrows = arrows.map((arrow) => {
          return arrow.points.map((pointId) => {
            const match = pointId.match(/^cell-(\d+)-(\d+)$/);
            if (match) {
              const row = parseInt(match[1]);
              const col = parseInt(match[2]);
              return rowColToIndex(row, col);
            }
            return 0;
          }).filter(i => i > 0);
        });
      }

      // Convert directional clues (Yajilin qdir/qnum)
      if (elements.directionalClues && Object.keys(elements.directionalClues).length > 0) {
        const clues = Object.values(elements.directionalClues);
        const maxCell = Math.max(...clues.map((c) => c.cell));
        const widthGuess = cols; // grid.cols from outer scope
        const width = widthGuess > 0 ? widthGuess : Math.floor(Math.sqrt(maxCell + 1));
        const height = Math.ceil((maxCell + 1) / width);
        const qdir: number[][] = Array.from({ length: height }, () => Array(width).fill(0));
        const qnum: number[][] = Array.from({ length: height }, () => Array(width).fill(-1));

        clues.forEach((clue) => {
          const y = Math.floor(clue.cell / width);
          const x = clue.cell % width;
          if (y < height && x < width) {
            qdir[y][x] = clue.direction;
            qnum[y][x] = clue.value;
          }
        });

        pu.qdir = qdir;
        pu.qnum = qnum;
      }

      // Convert cages
      if (Object.keys(elements.cages).length > 0) {
        pu.cage = {};
        Object.values(elements.cages).forEach((cage, idx) => {
          const cells = cage.cells.map((cellId) => {
            const match = cellId.match(/^cell-(\d+)-(\d+)$/);
            if (match) {
              const row = parseInt(match[1]);
              const col = parseInt(match[2]);
              return rowColToIndex(row, col);
            }
            return 0;
          }).filter(i => i > 0);

          if (cells.length > 0) {
            pu.cage![String(idx)] = {
              cells,
              value: cage.label,
              color: cage.color,
            };
          }
        });
      }

      return pu;
    };

    const pu_q = convertLayer(state.problem);
    const pu_a = convertLayer(state.answer);

    const penpaData = {
      gridtype: grid.gridType === 'hex' ? 'hex' : 'square',
      nx: cols,
      ny: rows,
      cellsize: cellSize,
      pu_q,
      pu_a,
    };

    // Compress to Penpa format
    const json = JSON.stringify(penpaData);

    // Apply Penpa's key compression
    let compressed = json;
    for (const [full, short] of Object.entries(COMPRESS_SUB)) {
      compressed = compressed.split(full).join(short);
    }

    // Compress with zlib
    const deflated = pako.deflate(compressed, { level: 9 });

    // Convert to URL-safe base64
    const base64 = btoa(String.fromCharCode(...deflated));
    const urlSafe = base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return urlSafe;
  } catch (error) {
    console.error('Failed to export to Penpa format:', error);
    return null;
  }
}
