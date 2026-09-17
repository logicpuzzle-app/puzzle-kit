import type { KakuroClueElement, LayerType } from '../types';

export const isKakuroSum = (value: unknown): value is number | null =>
  value === null || (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 45);

export function findKakuroClue(clues: Record<string, KakuroClueElement> | undefined, cellId: string) {
  return Object.values(clues ?? {}).find(clue => clue.cellId === cellId);
}

export function restoreKakuroClues(value: unknown): Record<string, KakuroClueElement> {
  const clues: Record<string, KakuroClueElement> = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return clues;
  for (const [id, entry] of Object.entries(value)) {
    if (!entry || typeof entry !== 'object' || typeof entry.cellId !== 'string') continue;
    const horizontal = entry.horizontal ?? null, vertical = entry.vertical ?? null;
    if (!isKakuroSum(horizontal) || !isKakuroSum(vertical)) continue;
    clues[id] = { id, cellId: entry.cellId, horizontal, vertical };
  }
  return clues;
}

export function isKakuroClueInput(tool: string, layer: LayerType | null, schema: string | null, constraints: boolean) {
  return layer === 'problem' && (tool === 'number-kakuro' ||
    (constraints && schema === 'kakuro' && tool.startsWith('number')));
}
