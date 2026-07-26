export const NPGEN_TECHNIQUES = [
  'localization',
  'naked-pair',
  'hidden-pair',
  'naked-triple',
  'hidden-triple',
  'x-wing',
  'swordfish',
] as const;

export const NPGEN_UNIQUENESS = ['vh', 'cell', 'block'] as const;

export type NpgenOperation = 'solve' | 'generate' | 'random' | 'benchmark';
export type NpgenBlockKind = 'default' | 'rectangle' | 'random' | 'custom';
export type NpgenAnswerKind =
  | 'unique'
  | 'no-answer'
  | 'multiple'
  | 'irregular'
  | 'not-judged';

export interface NpgenOptions {
  size: number;
  blockKind: NpgenBlockKind;
  blockWidth: number;
  blockHeight: number;
  blockLabels: number[];
  diagonal: boolean;
  seed: string;
  techniqueMask: number;
  uniquenessMask: number;
  difficultyMin: number;
  difficultyMax: number;
  forbidden: number;
}

export interface NpgenEngineResult {
  pattern: number[];
  problem: number[];
  solution: number[];
  blockLabels: number[];
  difficulty: number;
  answerKind: NpgenAnswerKind;
  diagonal: boolean;
  defaultBlock: boolean;
}

export interface NpgenXmlPuzzle {
  size: number;
  pattern: number[];
  hidden: number[];
  problem: number[];
  solution: number[];
  blockLabels: number[];
  difficulty: number;
  diagonal: boolean;
  defaultBlock: boolean;
}

export type NpgenWorkerRequest =
  | {
      id: number;
      type: 'solve';
      options: NpgenOptions;
      problem: number[];
    }
  | {
      id: number;
      type: 'generate';
      options: NpgenOptions;
      pattern: number[];
      hidden: number[];
    }
  | {
      id: number;
      type: 'random';
      options: NpgenOptions;
      hints: number;
    }
  | {
      id: number;
      type: 'benchmark';
      count: number;
      seed: string;
    }
  | {
      id: number;
      type: 'parse-xml';
      xml: string;
    }
  | {
      id: number;
      type: 'format-xml';
      puzzle: NpgenXmlPuzzle;
    };

export type NpgenWorkerResult =
  | NpgenEngineResult
  | NpgenXmlPuzzle
  | { count: number; succeeded: number; elapsedMs: number }
  | { xml: string };

export type NpgenWorkerResponse =
  | { id: number; ok: true; result: NpgenWorkerResult }
  | { id: number; ok: false; error: string };

export const DEFAULT_NPGEN_OPTIONS: NpgenOptions = {
  size: 9,
  blockKind: 'default',
  blockWidth: 3,
  blockHeight: 3,
  blockLabels: [],
  diagonal: false,
  seed: '0',
  techniqueMask: 0b1111111,
  uniquenessMask: 0b111,
  difficultyMin: 0,
  difficultyMax: -1,
  forbidden: -1,
};
