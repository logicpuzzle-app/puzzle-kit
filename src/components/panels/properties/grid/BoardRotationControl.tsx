import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../../../store/puzzleStoreContext';
import { normalizeBoardRotation } from '../../../../utils/boardLayout';

export function BoardRotationControl() {
  const { t } = useTranslation();
  const { grid, setBoardRotation } = usePuzzleStore();
  const angle = normalizeBoardRotation(grid.boardRotation);
  const [draft, setDraft] = useState(String(angle));
  const id = useId();
  useEffect(() => setDraft(String(angle)), [angle]);
  const valid = draft.trim() !== '' && Number.isFinite(Number(draft));
  const apply = () => {
    if (!valid) return;
    setBoardRotation(Number(draft));
    setDraft(String(normalizeBoardRotation(Number(draft))));
  };
  const buttonClass = 'h-8 px-2 text-xs border border-office-border rounded-sm hover:bg-office-ribbon-hover disabled:opacity-50';
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs text-office-text-secondary">{t('grid.boardRotation')}</label>
      <div className="flex gap-1 items-center">
        <button type="button" className={buttonClass} aria-label={t('grid.rotateMinus')} onClick={() => setBoardRotation(angle - 15)}>−15°</button>
        <input id={id} type="number" step="any" value={draft}
          className="min-w-0 w-16 h-8 px-1 text-xs border border-office-border rounded-sm text-center"
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); apply(); } }} />
        <button type="button" className={buttonClass} aria-label={t('grid.rotatePlus')} onClick={() => setBoardRotation(angle + 15)}>+15°</button>
      </div>
      <div className="flex gap-1">
        <button type="button" className={buttonClass} disabled={!valid} onClick={apply}>{t('grid.applyRotation')}</button>
        <button type="button" className={buttonClass} onClick={() => { setBoardRotation(0); setDraft('0'); }}>{t('grid.resetRotation')}</button>
      </div>
    </div>
  );
}
