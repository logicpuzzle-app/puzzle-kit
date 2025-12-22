/**
 * puzz.link exporter
 * Encodes puzzle-kit state into puzz.link URLs for supported puzzles.
 * Currently supports: nurikabe, slitherlink, masyu, yajilin, heyawake,
 * akari, ayeheya, akichi, lits, norinori, cbanana, nurimisaki, simpleloop, nanro.
 */
import type { GridConfig, PuzzleState } from '../types';
import { getCellIndexById, getEdgeIndexById } from './gridUtils';
import {
  getDirectionalCluesFromElements,
  isDirectionalNumber,
} from './numberEntries';
import { mergeDirectionalCluesIntoNumbersForLayer } from './legacyDirectionalClues';

export type PuzzlinkType =
  | 'nurikabe'
  | 'slither'
  | 'masyu'
  | 'yajilin'
  | 'heyawake'
  | 'akari'
  | 'ayeheya'
  | 'akichi'
  | 'lits'
  | 'norinori'
  | 'cbanana'
  | 'nurimisaki'
  | 'simpleloop'
  | 'nanro';

/**
 * Encode blanks using puzz.link decodeNumber16 scheme.
 * g=1 empty, h=2, ..., z=20. Use multiple letters if needed.
 */
function encodeBlanks(count: number): string {
  let res = '';
  while (count > 0) {
    const chunk = Math.min(count, 20);
    res += String.fromCharCode('f'.charCodeAt(0) + chunk); // g = f+1
    count -= chunk;
  }
  return res;
}

/**
 * Encode a single number for puzz.link decodeNumber16.
 */
function encodeNumber(value: number): string {
  if (value >= 0 && value <= 15) {
    return value.toString(16);
  }
  if (value >= 16 && value <= 0xff) {
    return `-${value.toString(16).padStart(2, '0')}`;
  }
  // 256 - 4095
  return `+${value.toString(16).padStart(3, '0')}`;
}

/**
 * Encode 0-4 clues (with optional black cells) using encode4Cell format.
 * qnums: -1 = empty, -2 = black cell, 0-4 = number clue.
 */
function encode4CellData(qnums: number[]): string {
  let data = '';
  let blankCount = 0;

  for (let c = 0; c < qnums.length; c++) {
    const qn = qnums[c];

    if (qn >= 0) {
      if (qn > 4) {
        throw new Error('encode4Cell supports only 0-4 clues');
      }

      while (blankCount > 0) {
        const chunk = Math.min(blankCount, 20);
        data += String.fromCharCode('f'.charCodeAt(0) + chunk);
        blankCount -= chunk;
      }

      const next1 = c + 1 < qnums.length ? qnums[c + 1] : -1;
      const next2 = c + 2 < qnums.length ? qnums[c + 2] : -1;

      if (next1 !== -1) {
        data += qn.toString(16);
      } else if (next2 !== -1) {
        data += (5 + qn).toString(16);
        c++;
      } else {
        data += (10 + qn).toString(16);
        c += 2;
      }
    } else if (qn === -2) {
      while (blankCount > 0) {
        const chunk = Math.min(blankCount, 20);
        data += String.fromCharCode('f'.charCodeAt(0) + chunk);
        blankCount -= chunk;
      }
      data += '.';
    } else {
      blankCount++;
    }
  }

  while (blankCount > 0) {
    const chunk = Math.min(blankCount, 20);
    data += String.fromCharCode('f'.charCodeAt(0) + chunk);
    blankCount -= chunk;
  }

  return data;
}

/**
 * Generate puzz.link URL for Nurikabe using numbers in problem.
 * Throws if no clues are found.
 */
function encodeNumber16(value: number): string {
  if (value === -2) {
    return '.';
  }
  if (value >= 0 && value <= 15) {
    return value.toString(16);
  }
  if (value >= 16 && value <= 0xff) {
    return `-${value.toString(16).padStart(2, '0')}`;
  }
  return `+${value.toString(16).padStart(3, '0')}`;
}

function collectNumberClues(grid: GridConfig, problem: PuzzleState['problem']): Map<number, number> {
  const width = grid.cols;
  const clues = new Map<number, number>();

  const directionalNumbers = getDirectionalCluesFromElements(problem);
  if (directionalNumbers.length > 0) {
    for (const clue of directionalNumbers) {
      if (typeof clue.value !== 'number' || clue.value < 0) continue;
      let cellIndex: number;
      if (clue.cell !== undefined) {
        cellIndex = clue.cell;
      } else {
        const index = getCellIndexById(clue.cellId, grid);
        if (!index) continue;
        cellIndex = index.row * width + index.col;
      }
      clues.set(cellIndex, clue.value);
    }
  }

  if (problem.numbers) {
    for (const num of Object.values(problem.numbers)) {
      if (isDirectionalNumber(num)) continue;
      const index = getCellIndexById(num.cellId, grid);
      if (!index) continue;
      const rawValue = String(num.value).trim();
      const value = parseInt(rawValue, 10);
      if (Number.isNaN(value)) {
        if (rawValue === '?' || rawValue === '？') {
          clues.set(index.row * width + index.col, -2);
        }
        continue;
      }
      if (value === -2) {
        clues.set(index.row * width + index.col, -2);
        continue;
      }
      if (value < 0) continue;
      clues.set(index.row * width + index.col, value);
    }
  }

  return clues;
}

function encodeNumber16GridData(
  grid: GridConfig,
  problem: PuzzleState['problem'],
  requireClues: boolean,
  puzzleTypeLabel: string
): string {
  const width = grid.cols;
  const height = grid.rows;
  const clues = collectNumberClues(grid, problem);

  if (requireClues && clues.size === 0) {
    throw new Error(`No clues found to export as puzz.link ${puzzleTypeLabel}`);
  }

  let data = '';
  let blankCount = 0;
  for (let idx = 0; idx < width * height; idx++) {
    const clue = clues.get(idx);
    if (clue === undefined) {
      blankCount++;
      continue;
    }
    if (blankCount > 0) {
      data += encodeBlanks(blankCount);
      blankCount = 0;
    }
    data += encodeNumber16(clue);
  }
  if (blankCount > 0) {
    data += encodeBlanks(blankCount);
  }

  return data;
}

function generateNumber16GridUrl(
  puzzleType: PuzzlinkType,
  grid: GridConfig,
  problem: PuzzleState['problem'],
  requireClues: boolean
): string {
  const width = grid.cols;
  const height = grid.rows;
  const data = encodeNumber16GridData(grid, problem, requireClues, puzzleType);
  return `https://puzz.link/p?${puzzleType}/${width}/${height}/${data}`;
}

export function generateNurikabePuzzlinkUrl(
  grid: GridConfig,
  problem: PuzzleState['problem']
): string {
  return generateNumber16GridUrl('nurikabe', grid, problem, true);
}

/**
 * Generate slitherlink URL using encode4Cell format
 *
 * encode4Cell format (used by puzz.link for slitherlink):
 * - '0'-'4': number 0-4, no skip
 * - '5'-'9': number 0-4 (value - 5), skip next cell
 * - 'a'-'e': number 0-4 (value - 10), skip next 2 cells
 * - 'g'-'z': skip cells (g=1, h=2, ..., z=20)
 */
function generateSlitherlinkUrl(grid: GridConfig, problem: PuzzleState['problem']): string {
  const width = grid.cols;
  const height = grid.rows;
  const total = width * height;

  // Build clue array: -1 = empty, 0-4 = clue value
  const clues: number[] = new Array(total).fill(-1);

  const directionalNumbers = getDirectionalCluesFromElements(problem);
  if (directionalNumbers.length > 0) {
    for (const clue of directionalNumbers) {
      if (clue.value >= 0 && clue.value <= 4) {
        // Use cell index if available, otherwise parse from cellId
        let cellIndex: number;
        if (clue.cell !== undefined) {
          cellIndex = clue.cell;
        } else {
          const index = getCellIndexById(clue.cellId, grid);
          if (!index) continue;
          cellIndex = index.row * width + index.col;
        }
        clues[cellIndex] = clue.value;
      }
    }
  }
  if (problem.numbers) {
    for (const num of Object.values(problem.numbers)) {
      if (isDirectionalNumber(num)) continue;
      const index = getCellIndexById(num.cellId, grid);
      if (!index) continue;
      const val = parseInt(String(num.value), 10);
      if (!isNaN(val) && val >= 0 && val <= 4) {
        clues[index.row * width + index.col] = val;
      }
    }
  }

  const data = encode4CellData(clues);
  return `https://puzz.link/p?slither/${width}/${height}/${data}`;
}

function generateAkariUrl(grid: GridConfig, problem: PuzzleState['problem']): string {
  const width = grid.cols;
  const height = grid.rows;
  const total = width * height;
  const qnums: number[] = new Array(total).fill(-1);
  const wallCells = new Set<string>();
  const wallColors = new Set(['#000000', '#444444', '#808080']);

  if (problem.surfaces) {
    for (const surface of Object.values(problem.surfaces)) {
      if (surface.color && wallColors.has(surface.color)) {
        wallCells.add(surface.cellId);
      }
    }
  }

  const numberClues = collectNumberClues(grid, problem);
  for (const [cellIndex, value] of numberClues.entries()) {
    if (value < 0 || value > 4) {
      throw new Error('Akari clues must be between 0 and 4');
    }
    qnums[cellIndex] = value;
    const row = Math.floor(cellIndex / width);
    const col = cellIndex % width;
    wallCells.add(`cell-${row}-${col}`);
  }

  wallCells.forEach((cellId) => {
    const index = getCellIndexById(cellId, grid);
    if (!index) return;
    const cellIndex = index.row * width + index.col;
    if (qnums[cellIndex] === -1) {
      qnums[cellIndex] = -2;
    }
  });

  const data = encode4CellData(qnums);
  return `https://puzz.link/p?akari/${width}/${height}/${data}`;
}

function generateMasyuUrl(grid: GridConfig, problem: PuzzleState['problem']): string {
  const width = grid.cols;
  const height = grid.rows;
  const total = width * height;
  // encode 3 cells per char, val: 0=empty,1=white,2=black
  const valAt = (idx: number): number => {
    const row = Math.floor(idx / width);
    const col = idx % width;
    const cellId = `cell-${row}-${col}`;
    const sym = problem.symbols
      ? Object.values(problem.symbols).find((s) => s.cellId === cellId)
      : null;
    if (!sym) return 0;
    if (sym.symbolType === 'circle-empty') return 1;
    if (sym.symbolType === 'circle-filled') return 2;
    return 0;
  };

  const digits = '0123456789abcdefghijklmnopq'; // base-27
  let data = '';
  for (let idx = 0; idx < total; idx += 3) {
    const v0 = valAt(idx);
    const v1 = idx + 1 < total ? valAt(idx + 1) : 0;
    const v2 = idx + 2 < total ? valAt(idx + 2) : 0;
    const packed = v0 * 9 + v1 * 3 + v2;
    data += digits[packed];
  }

  return `https://puzz.link/p?masyu/${width}/${height}/${data}`;
}

function generateYajilinUrl(grid: GridConfig, problem: PuzzleState['problem']): string {
  const width = grid.cols;
  const height = grid.rows;
  const total = width * height;
  const clues = new Map<number, { dir: number; num: number }>();

  const directionalNumbers = getDirectionalCluesFromElements(problem);
  if (directionalNumbers.length > 0) {
    for (const clue of directionalNumbers) {
      if (clue.direction && clue.value !== undefined) {
        // Use cell index if available, otherwise parse from cellId
        let cellIndex: number;
        if (clue.cell !== undefined) {
          cellIndex = clue.cell;
        } else {
          const index = getCellIndexById(clue.cellId, grid);
          if (!index) continue;
          cellIndex = index.row * width + index.col;
        }
        clues.set(cellIndex, { dir: clue.direction, num: clue.value });
      }
    }
  }

  let data = '';
  let blankCount = 0;
  for (let idx = 0; idx < total; idx++) {
    const clue = clues.get(idx);
    if (!clue) {
      blankCount++;
      continue;
    }
    // flush blanks via a-z skip (a=1 skip)
    while (blankCount > 0) {
      const chunk = Math.min(blankCount, 26);
      data += String.fromCharCode('a'.charCodeAt(0) + (chunk - 1));
      blankCount -= chunk;
    }

    const dir = clue.dir;
    const num = clue.num;
    if (num <= 15) {
      data += dir.toString();
      data += num.toString(16);
    } else if (num <= 0xff) {
      data += (dir + 5).toString(); // 5-9
      data += num.toString(16).padStart(2, '0');
    } else {
      data += '-';
      data += dir.toString(16);
      data += num.toString(16).padStart(3, '0');
    }
  }
  while (blankCount > 0) {
    const chunk = Math.min(blankCount, 26);
    data += String.fromCharCode('a'.charCodeAt(0) + (chunk - 1));
    blankCount -= chunk;
  }

  return `https://puzz.link/p?yajilin/${width}/${height}/${data}`;
}

function encodeBordersFromWalls(grid: GridConfig, problem: PuzzleState['problem']): {
  borderData: string;
  vertical: boolean[][];
  horizontal: boolean[][];
} {
  const width = grid.cols;
  const height = grid.rows;

  const vertical: boolean[][] = Array.from({ length: height }, () => Array(width - 1).fill(false));
  const horizontal: boolean[][] = Array.from({ length: height - 1 }, () => Array(width).fill(false));

  const wallEdgeIds = new Set<string>();
  const wallLines = Object.values(problem.lines || {}).filter(
    (line) => line.lineTarget === 'wall' && line.edgeId
  );
  for (const wall of wallLines) {
    if (wall.edgeId) {
      wallEdgeIds.add(wall.edgeId);
    }
  }
  for (const wall of Object.values(problem.walls || {})) {
    if (wall.edgeId && !wallEdgeIds.has(wall.edgeId)) {
      wallEdgeIds.add(wall.edgeId);
    }
  }

  for (const edgeId of wallEdgeIds) {
    const idx = getEdgeIndexById(edgeId, grid);
    if (!idx) continue;

    if (idx.type === 'v') {
      const r = idx.row;
      const c = idx.col - 1;
      if (r >= 0 && r < height && c >= 0 && c < width - 1) {
        vertical[r][c] = true;
      }
    } else {
      const r = idx.row - 1;
      const c = idx.col;
      if (r >= 0 && r < height - 1 && c >= 0 && c < width) {
        horizontal[r][c] = true;
      }
    }
  }

  const alphabet32 = '0123456789abcdefghijklmnopqrstuv';
  const bits: number[] = [];
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width - 1; c++) {
      bits.push(vertical[r][c] ? 1 : 0);
    }
  }
  for (let r = 0; r < height - 1; r++) {
    for (let c = 0; c < width; c++) {
      bits.push(horizontal[r][c] ? 1 : 0);
    }
  }

  let borderData = '';
  for (let i = 0; i < bits.length; i += 5) {
    let v = 0;
    for (let k = 0; k < 5; k++) {
      if (i + k < bits.length && bits[i + k]) {
        v |= 1 << (4 - k);
      }
    }
    borderData += alphabet32[v];
  }

  return { borderData, vertical, horizontal };
}

function generateHeyawakeUrl(
  puzzleType: PuzzlinkType,
  grid: GridConfig,
  problem: PuzzleState['problem']
): string {
  const width = grid.cols;
  const height = grid.rows;

  const { borderData, vertical, horizontal } = encodeBordersFromWalls(grid, problem);

  // determine rooms via flood fill
  const roomId: number[][] = Array.from({ length: height }, () => Array(width).fill(-1));
  const topLeft: Array<{ row: number; col: number }> = [];
  let rid = 0;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (roomId[r][c] !== -1) continue;
      const queue: Array<{ r: number; c: number }> = [{ r, c }];
      roomId[r][c] = rid;
      topLeft.push({ row: r, col: c });
      while (queue.length) {
        const cur = queue.shift()!;
        const { r: rr, c: cc } = cur;
        // up
        if (rr > 0 && !horizontal[rr - 1][cc] && roomId[rr - 1][cc] === -1) {
          roomId[rr - 1][cc] = rid;
          queue.push({ r: rr - 1, c: cc });
        }
        // down
        if (rr < height - 1 && !horizontal[rr][cc] && roomId[rr + 1][cc] === -1) {
          roomId[rr + 1][cc] = rid;
          queue.push({ r: rr + 1, c: cc });
        }
        // left
        if (cc > 0 && !vertical[rr][cc - 1] && roomId[rr][cc - 1] === -1) {
          roomId[rr][cc - 1] = rid;
          queue.push({ r: rr, c: cc - 1 });
        }
        // right
        if (cc < width - 1 && !vertical[rr][cc] && roomId[rr][cc + 1] === -1) {
          roomId[rr][cc + 1] = rid;
          queue.push({ r: rr, c: cc + 1 });
        }
      }
      rid++;
    }
  }

  // map roomId -> number (from problem.numbers)
  const roomNumbers: number[] = Array(rid).fill(-1);
  const roomClues = collectNumberClues(grid, problem);
  for (const [cellIndex, value] of roomClues.entries()) {
    const row = Math.floor(cellIndex / width);
    const col = cellIndex % width;
    const id = roomId[row]?.[col];
    if (id === undefined || id < 0) continue;
    roomNumbers[id] = value;
  }

  // encode room numbers (number16), default '.' if none
  let numData = '';
  for (let i = 0; i < roomNumbers.length; i++) {
    const v = roomNumbers[i];
    if (v >= 0) {
      numData += encodeNumber16(v);
    } else {
      numData += '.';
    }
  }

  return `https://puzz.link/p?${puzzleType}/${width}/${height}/${borderData}${numData}`;
}

function generateBorderOnlyUrl(
  puzzleType: PuzzlinkType,
  grid: GridConfig,
  problem: PuzzleState['problem']
): string {
  const width = grid.cols;
  const height = grid.rows;
  const { borderData } = encodeBordersFromWalls(grid, problem);
  return `https://puzz.link/p?${puzzleType}/${width}/${height}/${borderData}`;
}

function generateNanroUrl(grid: GridConfig, problem: PuzzleState['problem']): string {
  const width = grid.cols;
  const height = grid.rows;
  const { borderData } = encodeBordersFromWalls(grid, problem);
  const numberData = encodeNumber16GridData(grid, problem, false, 'nanro');
  return `https://puzz.link/p?nanro/${width}/${height}/${borderData}${numberData}`;
}

function generateSimpleloopUrl(grid: GridConfig, problem: PuzzleState['problem']): string {
  const width = grid.cols;
  const height = grid.rows;
  const totalCells = width * height;
  const weights = [16, 8, 4, 2, 1];
  const emptyCells = new Set<string>();

  for (const surface of Object.values(problem.surfaces || {})) {
    if (surface.displayMode === 'dot' || surface.color === '#000000') {
      emptyCells.add(surface.cellId);
    }
  }

  let data = '';
  for (let idx = 0; idx < totalCells; idx += 5) {
    let value = 0;
    for (let k = 0; k < 5; k++) {
      const cellIndex = idx + k;
      if (cellIndex >= totalCells) break;
      const row = Math.floor(cellIndex / width);
      const col = cellIndex % width;
      const cellId = `cell-${row}-${col}`;
      if (emptyCells.has(cellId)) {
        value += weights[k];
      }
    }
    data += value.toString(32);
  }

  return `https://puzz.link/p?simpleloop/${width}/${height}/${data}`;
}

export function generatePuzzlinkUrl(
  puzzle: PuzzlinkType,
  grid: GridConfig,
  problem: PuzzleState['problem']
): string {
  const normalizedProblem = mergeDirectionalCluesIntoNumbersForLayer(problem);
  switch (puzzle) {
    case 'nurikabe':
      return generateNurikabePuzzlinkUrl(grid, normalizedProblem);
    case 'slither':
      return generateSlitherlinkUrl(grid, normalizedProblem);
    case 'masyu':
      return generateMasyuUrl(grid, normalizedProblem);
    case 'yajilin':
      return generateYajilinUrl(grid, normalizedProblem);
    case 'heyawake':
      return generateHeyawakeUrl('heyawake', grid, normalizedProblem);
    case 'akari':
      return generateAkariUrl(grid, normalizedProblem);
    case 'ayeheya':
      return generateHeyawakeUrl('ayeheya', grid, normalizedProblem);
    case 'akichi':
      return generateHeyawakeUrl('akichi', grid, normalizedProblem);
    case 'lits':
      return generateBorderOnlyUrl('lits', grid, normalizedProblem);
    case 'norinori':
      return generateBorderOnlyUrl('norinori', grid, normalizedProblem);
    case 'cbanana':
      return generateNumber16GridUrl('cbanana', grid, normalizedProblem, false);
    case 'nurimisaki':
      return generateNumber16GridUrl('nurimisaki', grid, normalizedProblem, false);
    case 'simpleloop':
      return generateSimpleloopUrl(grid, normalizedProblem);
    case 'nanro':
      return generateNanroUrl(grid, normalizedProblem);
    default:
      throw new Error(`Unsupported puzz.link type: ${puzzle}`);
  }
}
