import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../../store/puzzleStoreContext';

export function SurfaceTargetControl({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { toolSettings, setToolSettings } = usePuzzleStore();
  if (!['surface-fill', 'surface-dot'].includes(toolSettings.currentTool)) return null;
  return <fieldset className={compact ? 'w-fit shrink-0' : 'mb-2'}>
    <legend className={compact ? 'sr-only' : 'text-xs text-office-text-secondary mb-1'}>{t('surface.target')}</legend>
    <div className="flex gap-1">
      {(['cell', 'vertex'] as const).map(target => <button key={target} type="button"
        title={target === 'vertex' ? t('surface.vertexHint') : undefined}
        aria-pressed={(toolSettings.surfaceTarget ?? 'cell') === target}
        className={`flex-1 h-8 px-2 text-xs border rounded-sm ${(toolSettings.surfaceTarget ?? 'cell') === target ? 'bg-office-accent text-white border-office-accent' : 'border-office-border hover:bg-office-ribbon-hover'}`}
        onClick={() => setToolSettings({ surfaceTarget: target })}>{t(`surface.target.${target}`)}</button>)}
    </div>
    {!compact && toolSettings.surfaceTarget === 'vertex' && <p className="text-xs text-office-text-secondary mt-1">{t('surface.vertexHint')}</p>}
  </fieldset>;
}
