/**
 * puzz.link exporter
 * Encodes puzzle-kit state into puzz.link URLs for supported puzzles.
 * Currently supports: nurikabe, slitherlink, masyu, yajilin, heyawake.
 */
import type { GridConfig, PuzzleState } from '../types';

export type PuzzlinkType = 'nurikabe' | 'slither' | 'masyu' | 'yajilin' | 'heyawake';

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
 * Generate puzz.link URL for Nurikabe using numbers in problem.
 * Throws if no clues are found.
 */
function encodeNumber16(value: number): string {
  if (value >= 0 && value <= 15) {
    return value.toString(16);
  }
  if (value >= 16 && value <= 0xff) {
    return `-${value.toString(16).padStart(2, '0')}`;
  }
  return `+${value.toString(16).padStart(3, '0')}`;
}

export function generateNurikabePuzzlinkUrl(
  grid: GridConfig,
  problem: PuzzleState['problem']
): string {
  const width = grid.cols;
  const height = grid.rows;

  // Collect clue map: cellIndex -> value
  const clues = new Map<number, number>();

  if (problem.directionalClues) {
    for (const clue of Object.values(problem.directionalClues)) {
      if (clue.value > 0) {
        clues.set(clue.cell, clue.value);
      }
    }
  }
  if (problem.numbers) {
    for (const num of Object.values(problem.numbers)) {
      const match = num.cellId.match(/cell-(\d+)-(\d+)/);
      if (!match) continue;
      const row = parseInt(match[1], 10);
      const col = parseInt(match[2], 10);
      const value = parseInt(String(num.value), 10);
      if (!isNaN(value) && value > 0) {
        clues.set(row * width + col, value);
      }
    }
  }

  if (clues.size === 0) {
    throw new Error('No clues found to export as puzz.link Nurikabe');
  }

  // Encode row-major
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

  return `https://puzz.link/p?nurikabe/${width}/${height}/${data}`;
}

function generateSlitherlinkUrl(grid: GridConfig, problem: PuzzleState['problem']): string {
  const width = grid.cols;
  const height = grid.rows;
  const clues = new Map<number, number>();

  if (problem.directionalClues) {
    for (const clue of Object.values(problem.directionalClues)) {
      if (clue.value >= 0 && clue.value <= 3) {
        clues.set(clue.cell, clue.value);
      }
    }
  }
  if (problem.numbers) {
    for (const num of Object.values(problem.numbers)) {
      const m = num.cellId.match(/cell-(\d+)-(\d+)/);
      if (!m) continue;
      const row = parseInt(m[1], 10);
      const col = parseInt(m[2], 10);
      const val = parseInt(String(num.value), 10);
      if (!isNaN(val) && val >= 0 && val <= 3) {
        clues.set(row * width + col, val);
      }
    }
  }

  let data = '';
  let blankCount = 0;
  for (let idx = 0; idx < width * height; idx++) {
    const val = clues.get(idx);
    if (val === undefined) {
      blankCount++;
      continue;
    }
    // flush blanks
    while (blankCount > 0) {
      const chunk = Math.min(blankCount, 20);
      data += String.fromCharCode('f'.charCodeAt(0) + chunk); // g..z
      blankCount -= chunk;
    }
    // encode number directly (0-3) using 0-4
    data += val.toString();
  }
  while (blankCount > 0) {
    const chunk = Math.min(blankCount, 20);
    data += String.fromCharCode('f'.charCodeAt(0) + chunk);
    blankCount -= chunk;
  }

  return `https://puzz.link/p?slither/${width}/${height}/${data}`;
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

  if (problem.directionalClues) {
    for (const clue of Object.values(problem.directionalClues)) {
      if (clue.direction && clue.value !== undefined) {
        clues.set(clue.cell, { dir: clue.direction, num: clue.value });
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

function generateHeyawakeUrl(grid: GridConfig, problem: PuzzleState['problem']): string {
  const width = grid.cols;
  const height = grid.rows;

  // build border arrays from walls
  const vertical: boolean[][] = Array.from({ length: height }, () => Array(width - 1).fill(false));
  const horizontal: boolean[][] = Array.from({ length: height - 1 }, () => Array(width).fill(false));

  const walls = problem.walls || {};
  for (const wall of Object.values(walls)) {
    const mV = wall.position.match(/edge-v-(\d+)-(\d+)/);
    if (mV) {
      const r = parseInt(mV[1], 10);
      const c = parseInt(mV[2], 10) - 1;
      if (r >= 0 && r < height && c >= 0 && c < width - 1) {
        vertical[r][c] = true;
      }
      continue;
    }
    const mH = wall.position.match(/edge-h-(\d+)-(\d+)/);
    if (mH) {
      const r = parseInt(mH[1], 10) - 1;
      const c = parseInt(mH[2], 10);
      if (r >= 0 && r < height - 1 && c >= 0 && c < width) {
        horizontal[r][c] = true;
      }
    }
  }

  // encode borders base32 5bit
  const alphabet32 = '0123456789abcdefghijklmnopqrstuv';
  const bits: number[] = [];
  // vertical first
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
  if (problem.numbers) {
    for (const num of Object.values(problem.numbers)) {
      const m = num.cellId.match(/cell-(\d+)-(\d+)/);
      if (!m) continue;
      const r = parseInt(m[1], 10);
      const c = parseInt(m[2], 10);
      const v = parseInt(String(num.value), 10);
      if (isNaN(v)) continue;
      const id = roomId[r][c];
      if (id >= 0) {
        roomNumbers[id] = v;
      }
    }
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

  return `https://puzz.link/p?heyawake/${width}/${height}/${borderData}${numData}`;
}

export function generatePuzzlinkUrl(
  puzzle: PuzzlinkType,
  grid: GridConfig,
  problem: PuzzleState['problem']
): string {
  switch (puzzle) {
    case 'nurikabe':
      return generateNurikabePuzzlinkUrl(grid, problem);
    case 'slither':
      return generateSlitherlinkUrl(grid, problem);
    case 'masyu':
      return generateMasyuUrl(grid, problem);
    case 'yajilin':
      return generateYajilinUrl(grid, problem);
    case 'heyawake':
      return generateHeyawakeUrl(grid, problem);
    default:
      throw new Error(`Unsupported puzz.link type: ${puzzle}`);
  }
}
