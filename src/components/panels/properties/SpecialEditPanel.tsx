import React, { useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../../store/puzzleStoreContext';
import { getEditableDataLayer } from '../../../utils/editPolicy';

/** Explicit object selection also works for overlapping paths and touch input. */
export const SpecialEditPanel: React.FC = () => {
  const { t } = useTranslation();
  const inputId = useId();
  const { puzzle, activeLayer, isPlayerMode, toolSettings, selectedElements,
    setSelection, clearSelection, shortenSpecial, removeSpecial } = usePuzzleStore();
  const layer = getEditableDataLayer(activeLayer, isPlayerMode);
  const type = toolSettings.currentTool === 'special-arrow' ? 'arrow' : 'thermo';
  useEffect(() => {
    clearSelection();
    return () => clearSelection();
  }, [activeLayer, type, clearSelection]);
  const objects = layer ? Object.values(puzzle[layer].specials).filter(s => s.type === type).sort((a, b) => a.id.localeCompare(b.id)) : [];
  const selected = objects.find(s => selectedElements.length === 1 && selectedElements[0] === s.id);
  const buttonStyle = 'px-2 py-2 text-xs border border-office-border rounded-sm bg-white hover:bg-office-ribbon-hover disabled:opacity-50 disabled:cursor-not-allowed';
  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-xs text-office-text-secondary">{t('special.edit.object')}</label>
      <select id={inputId} value={selected?.id ?? ''} disabled={!layer || !objects.length}
        className="w-full min-w-0 border border-office-border rounded-sm bg-white p-2 text-xs"
        onChange={event => setSelection(event.target.value ? [event.target.value] : [])}>
        <option value="">{t(objects.length ? 'special.edit.select' : 'special.edit.empty')}</option>
        {objects.map((s, index) => <option key={s.id} value={s.id}>
          {t(`tool.special.${s.type}`)} {index + 1} — {t('special.edit.points', { count: s.points.length })}
        </option>)}
      </select>
      <p className="text-xs text-office-text-secondary">{t('special.edit.hint')}</p>
      <div className="flex flex-wrap gap-2">
        <button className={buttonStyle} disabled={!selected || selected.points.length <= 2}
          onClick={() => selected && shortenSpecial(selected.id)}>{t('special.edit.shorten')}</button>
        <button className={buttonStyle} disabled={!selected} onClick={() => {
          if (selected) { removeSpecial(selected.id); clearSelection(); }
        }}>{t('special.edit.delete')}</button>
      </div>
      {selected && selected.points.length <= 2 && <p className="text-xs text-office-text-secondary">{t('special.edit.minimum')}</p>}
    </div>
  );
};
