import React, { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../../store/puzzleStoreContext';
import type { SymbolSize } from '../../../types';
import { getEditableDataLayer } from '../../../utils/editPolicy';
import { isSymbolSize, resolveSymbolSize, SYMBOL_SIZE_PRESETS } from '../../../utils/symbolSize';
import { renderSymbol } from '../../canvas/symbols';

export const SymbolSizePanel: React.FC = () => {
  const { t } = useTranslation();
  const { puzzle, activeLayer, isPlayerMode, toolSettings, setToolSettings, resizeSymbol, grid } = usePuzzleStore();
  const layer = getEditableDataLayer(activeLayer, isPlayerMode);
  const [selectedId, setSelectedId] = useState('');
  const objects = layer ? Object.values(puzzle[layer].symbols).sort((a, b) => a.id.localeCompare(b.id)) : [];
  const selected = objects.find(s => s.id === selectedId);
  const size = selected?.size ?? toolSettings.symbolSize;
  const [draft, setDraft] = useState(String(Math.round(resolveSymbolSize(size) * 100)));
  const id = useId();
  useEffect(() => { setSelectedId(''); }, [layer, toolSettings.currentTool]);
  useEffect(() => { setDraft(String(Math.round(resolveSymbolSize(size) * 100))); }, [size, selected?.id, layer]);
  const percent = Number(draft);
  const valid = draft.trim() !== '' && Number.isInteger(percent) && isSymbolSize(percent / 100);
  const apply = (value: SymbolSize) => {
    setDraft(String(Math.round(resolveSymbolSize(value) * 100)));
    if (selected) resizeSymbol(selected.id, value);
    else setToolSettings({ symbolSize: value });
  };
  const cell = grid.cellSize;
  const previewWidth = Math.max(1, resolveSymbolSize(size)) * cell * 1.6;
  const button = 'min-h-11 px-2 py-2 text-xs border border-office-border rounded-sm disabled:opacity-50 disabled:cursor-not-allowed';
  return (
    <div className="space-y-2">
      <label htmlFor={`${id}-object`} className="block text-xs text-office-text-secondary">{t('symbol.size.object')}</label>
      <select id={`${id}-object`} value={selected?.id ?? ''} disabled={!layer}
        onChange={event => setSelectedId(event.target.value)}
        className="w-full min-h-11 min-w-0 border border-office-border rounded-sm bg-white p-2 text-xs">
        <option value="">{t('symbol.size.new')}</option>
        {objects.map((symbol, index) => <option key={symbol.id} value={symbol.id}>
          {t(`tool.symbol.${symbol.symbolType}`, { defaultValue: t('symbol.size.generic') })} {index + 1}
        </option>)}
      </select>
      <p className="text-xs text-office-text-secondary">{t('symbol.size.hint')}</p>
      {selected && <svg role="img" aria-label={t('symbol.size.preview')}
        className="w-full h-36 border border-office-border rounded-sm bg-white"
        viewBox={`${-previewWidth / 2} ${-previewWidth / 2} ${previewWidth} ${previewWidth}`}>
        <rect x={-cell / 2} y={-cell / 2} width={cell} height={cell} fill="none" stroke="#cbd5e1" strokeWidth="1" />
        {renderSymbol(selected.symbolType, { x: 0, y: 0, size: cell * resolveSymbolSize(size), color: selected.color,
          fillColor: selected.fillColor, rotation: selected.rotation, directions: selected.directions, directionAngles: selected.directionAngles })}
      </svg>}
      <div className="grid grid-cols-2 gap-1" role="group" aria-label={t('prop.size')}>
        {(Object.keys(SYMBOL_SIZE_PRESETS) as (keyof typeof SYMBOL_SIZE_PRESETS)[]).map(preset =>
          <button key={preset} disabled={!layer} aria-pressed={resolveSymbolSize(size) === SYMBOL_SIZE_PRESETS[preset]}
            className={`${button} ${resolveSymbolSize(size) === SYMBOL_SIZE_PRESETS[preset] ? 'bg-office-accent text-white' : 'bg-white hover:bg-office-ribbon-hover'}`}
            onClick={() => apply(preset)}>{t(`size.${preset}`)}</button>)}
      </div>
      <label htmlFor={`${id}-percent`} className="block text-xs text-office-text-secondary">{t('symbol.size.percent')}</label>
      <div className="flex gap-2">
        <input id={`${id}-percent`} type="number" min="10" max="300" step="1" value={draft} disabled={!layer}
          aria-invalid={!valid} aria-describedby={`${id}-range`}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); if (layer && valid) apply(percent / 100); } }}
          className="min-h-11 w-20 min-w-0 flex-1 border border-office-border rounded-sm p-2 text-sm" />
        <button className={`${button} bg-white hover:bg-office-ribbon-hover`} disabled={!layer || !valid}
          onClick={() => apply(percent / 100)}>{t('symbol.size.apply')}</button>
      </div>
      <p id={`${id}-range`} className="text-xs text-office-text-secondary">{t('symbol.size.range')}</p>
    </div>
  );
};
