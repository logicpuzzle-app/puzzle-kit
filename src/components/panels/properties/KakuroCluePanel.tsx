import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../../store/puzzleStoreContext';
import { findKakuroClue } from '../../../utils/kakuro';
import type { KakuroClueElement } from '../../../types';
import { useCellFinder } from '../../../hooks/useCellFinder';
import { kakuroCellCorners } from '../../../utils/kakuroGeometry';

export function KakuroCluePanel({ onLayoutChange }: { onLayoutChange?: (height: number) => void }) {
  const { t } = useTranslation();
  const { numberSelection, puzzle, grid, topology, useTopology, setKakuroClue } = usePuzzleStore();
  const { resolveSelection } = useCellFinder();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !onLayoutChange) return;
    const observer = new ResizeObserver(() => onLayoutChange(ref.current!.getBoundingClientRect().height));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [onLayoutChange]);
  const cellId = numberSelection ? resolveSelection(numberSelection) : null;
  const clue = cellId ? findKakuroClue(puzzle.problem.clueCells, cellId) : undefined;
  const canEdit = cellId && kakuroCellCorners({ grid, topology, useTopology }, cellId);
  return <div ref={ref} className="space-y-2 text-sm">
    <p className="font-medium">{t('kakuro.clue')}</p>
    {canEdit ? <ClueForm key={`${cellId}:${JSON.stringify(clue)}`} clue={clue}
      onApply={values => setKakuroClue(cellId, values)} onRemove={() => setKakuroClue(cellId, null)} />
      : <p>{t('kakuro.selectCell')}</p>}
  </div>;
}

function ClueForm({ clue, onApply, onRemove }: {
  clue?: KakuroClueElement;
  onApply: (values: { horizontal: number | null; vertical: number | null }) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const [horizontal, setHorizontal] = useState(String(clue?.horizontal ?? ''));
  const [vertical, setVertical] = useState(String(clue?.vertical ?? ''));
  return <form className="space-y-2" onSubmit={e => {
    e.preventDefault();
    onApply({ horizontal: horizontal === '' ? null : Number(horizontal), vertical: vertical === '' ? null : Number(vertical) });
  }}>
    <label className="block">{t('kakuro.across')}
      <input type="number" min="0" max="45" step="1" inputMode="numeric" value={horizontal}
        onChange={e => setHorizontal(e.target.value)} className="w-full border rounded-sm px-2 py-1" />
    </label>
    <label className="block">{t('kakuro.down')}
      <input type="number" min="0" max="45" step="1" inputMode="numeric" value={vertical}
        onChange={e => setVertical(e.target.value)} className="w-full border rounded-sm px-2 py-1" />
    </label>
    <p className="text-xs text-office-text-secondary">{t('kakuro.blankHint')}</p>
    <div className="flex gap-2">
      <button type="submit" className="border rounded-sm px-2 py-1">{t('kakuro.apply')}</button>
      <button type="button" disabled={!clue} onClick={onRemove} className="border rounded-sm px-2 py-1 disabled:opacity-50">{t('kakuro.remove')}</button>
    </div>
  </form>;
}
