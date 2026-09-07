import { compressToBase64 } from 'lz-string';
import type { NpgenEngineResult } from './types';

export const SUDOKUPAD_URL_PREFIX = 'https://sudokupad.app/fpuzzles';

export type SudokuPadExportDisabledReason =
  | 'size'
  | 'groups'
  | 'row-column-constraints';

export interface FpuzzlesCell {
  value?: number;
  given?: true;
  region?: number;
}

export interface FpuzzlesPuzzle {
  size: number;
  grid: FpuzzlesCell[][];
  'diagonal+'?: true;
  'diagonal-'?: true;
  title: string;
  author: string;
  solution?: number[];
}

function resultSize(result: NpgenEngineResult): number {
  return Math.sqrt(result.problem.length);
}

function hasStandardSquareRegions(
  blockLabels: number[],
  size: number,
): boolean {
  const root = Math.sqrt(size);
  if (
    !Number.isInteger(root) ||
    blockLabels.length !== size * size
  ) {
    return false;
  }

  const labelsByRegion = new Map<number, number>();
  const regionsByLabel = new Map<number, number>();
  return blockLabels.every((label, index) => {
    const row = Math.floor(index / size);
    const col = index % size;
    const region = Math.floor(row / root) * root + Math.floor(col / root);
    const expectedLabel = labelsByRegion.get(region);
    const expectedRegion = regionsByLabel.get(label);

    if (expectedLabel !== undefined || expectedRegion !== undefined) {
      return expectedLabel === label && expectedRegion === region;
    }
    labelsByRegion.set(region, label);
    regionsByLabel.set(label, region);
    return true;
  });
}

function zeroBasedRegions(blockLabels: number[]): number[] {
  const regions = new Map<number, number>();
  return blockLabels.map((label) => {
    let region = regions.get(label);
    if (region === undefined) {
      region = regions.size;
      regions.set(label, region);
    }
    return region;
  });
}

export function getSudokuPadExportDisabledReasons(
  result: NpgenEngineResult,
): SudokuPadExportDisabledReason[] {
  const reasons: SudokuPadExportDisabledReason[] = [];
  const size = resultSize(result);
  if (!Number.isInteger(size) || size > 16) reasons.push('size');
  if (result.groupLabels.length > 0) reasons.push('groups');
  if (!result.vertical || !result.horizontal) {
    reasons.push('row-column-constraints');
  }
  return reasons;
}

export function getSudokuPadExportDisabledReason(
  result: NpgenEngineResult,
): SudokuPadExportDisabledReason | null {
  return getSudokuPadExportDisabledReasons(result)[0] ?? null;
}

export function canExportToSudokuPad(result: NpgenEngineResult): boolean {
  return getSudokuPadExportDisabledReasons(result).length === 0;
}

export function npgenResultToFpuzzles(
  result: NpgenEngineResult,
  includeSolution = false,
): FpuzzlesPuzzle {
  const reasons = getSudokuPadExportDisabledReasons(result);
  if (reasons.length > 0) {
    throw new Error(`NPGenerator result cannot be exported to SudokuPad: ${reasons.join(', ')}`);
  }

  const size = resultSize(result);
  if (result.blockLabels.length !== size * size) {
    throw new Error('NPGenerator result has an invalid block label grid');
  }

  const regions = hasStandardSquareRegions(result.blockLabels, size)
    ? null
    : zeroBasedRegions(result.blockLabels);
  const grid = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => {
      const index = row * size + col;
      const value = result.problem[index];
      const cell: FpuzzlesCell =
        value > 0 ? { value, given: true } : {};
      if (regions) cell.region = regions[index];
      return cell;
    }),
  );

  return {
    size,
    grid,
    ...(result.diagonal
      ? { 'diagonal+': true as const, 'diagonal-': true as const }
      : {}),
    title: 'NPGenerator',
    author: 'NPGenerator 2007',
    ...(includeSolution ? { solution: [...result.solution] } : {}),
  };
}

export function createSudokuPadUrl(
  result: NpgenEngineResult,
  includeSolution = false,
): string {
  const json = JSON.stringify(npgenResultToFpuzzles(result, includeSolution));
  return `${SUDOKUPAD_URL_PREFIX}${encodeURIComponent(compressToBase64(json))}`;
}
