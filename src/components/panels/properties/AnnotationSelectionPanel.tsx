import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../../store/puzzleStoreContext';
import { selectableAnnotations, selectedAnnotations, sameAnnotation } from '../../../utils/annotationSelection';

export function AnnotationSelectionPanel() {
  const { t } = useTranslation();
  const state = usePuzzleStore();
  const annotations = selectableAnnotations(state), selected = selectedAnnotations(state);
  const button = 'min-h-11 px-2 py-2 text-xs border border-office-border rounded-sm bg-white hover:bg-office-ribbon-hover disabled:opacity-50';
  return <section aria-label={t('selection.annotations')} className="space-y-2">
    <p className="text-xs text-office-text-secondary">{t('selection.hint')}</p>
    <p role="status" className="text-xs">{t('selection.count', { count: selected.length })}</p>
    <div className="flex flex-wrap gap-2">
      <button className={button} disabled={!annotations.length} onClick={() => state.setAnnotationSelection(annotations)}>{t('selection.all')}</button>
      <button className={button} disabled={!selected.length} onClick={state.clearAnnotationSelection}>{t('selection.clear')}</button>
      <button className={button} disabled={!selected.length} onClick={state.removeSelectedAnnotations}>{t('selection.delete')}</button>
    </div>
    <div className="max-h-64 overflow-y-auto">
      {annotations.map((ref, index) => <label key={JSON.stringify([ref.kind, ref.id])} className="flex items-center gap-2 min-h-11 text-xs">
        <input type="checkbox" checked={selected.some(s => sameAnnotation(s, ref))}
          onChange={event => state.setAnnotationSelection(event.target.checked ? [...selected, ref] : selected.filter(s => !sameAnnotation(s, ref)))} />
        {t(`selection.kind.${ref.kind}`)} {index + 1}
      </label>)}
    </div>
  </section>;
}
