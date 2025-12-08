/**
 * Common types for puzzle import functionality
 */

import type { GridConfig, PuzzleState } from '../../types';

/** Result type for parsing puzzle URLs */
export interface PuzzlinkData {
  grid: GridConfig;
  state: PuzzleState;
  puzzleType?: string; // puzz.link puzzle type (e.g., 'yajilin', 'slitherlink')
}

/** Internal Penpa data structures */
export interface PenpaData {
  gridtype?: string;
  nx?: number;
  ny?: number;
  cellsize?: number;
  pu_q?: PenpaPuData;
  pu_a?: PenpaPuData;
  mode?: PenpaMode;
  centerlist?: number[];
}

export interface PenpaPuData {
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

export interface PenpaMode {
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

/** Penpa URL parameter names */
export const PENPA_PARAMS = {
  MODE: 'm',
  PUZZLE: 'p',
  EDIT: 'edit',
  SOLVE: 'solve',
} as const;

/** Penpa's COMPRESS substitution table (from opt.js) */
export const COMPRESS_SUB: Record<string, string> = {
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

/** Reverse mapping for decompression */
export const DECOMPRESS_SUB: Record<string, string> = Object.fromEntries(
  Object.entries(COMPRESS_SUB).map(([k, v]) => [v, k])
);
