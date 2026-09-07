import React from 'react';
import { SegmentedToggle } from '../common';
import { INPUT_MODE_ICONS } from '../toolbar/RibbonIcons';
import { PAINT_COLOR_SWATCHES } from './constants';
import { PaintFreehandIcon, PaintLineIcon, PaintNumberIcon, PaintSurfaceIcon, PaintSymbolIcon, PaintWordIcon } from './PaintIcons';
import type { PaintCategory, TranslateFn } from './types';
import type { InputMode } from '../../constraints/types';

const PAINT_CATEGORY_ICONS: Record<PaintCategory, React.FC<{ size?: number }>> = {
  surface: PaintSurfaceIcon,
  number: PaintNumberIcon,
  symbol: PaintSymbolIcon,
  line: PaintLineIcon,
  word: PaintWordIcon,
  freehand: PaintFreehandIcon,
};

export type PaintGenreToolbarProps = {
  t: TranslateFn;
  paintModes: InputMode[];
  isAnswerMode: boolean;
  availableCategories: Array<{ id: PaintCategory; labelKey: string }>;
  activeCategory: PaintCategory;
  onCategorySelect: (category: PaintCategory) => void;
  selectedSwatchId: string;
  onSwatchSelect: (swatchId: string, color: string) => void;
  currentInputMode: InputMode | null;
  categoryModes: Record<PaintCategory, InputMode[]>;
  lineAnchor: 'cell' | 'vertex';
  onLineAnchorChange: (next: 'cell' | 'vertex') => void;
  onInputModeSelect: (mode: InputMode) => void;
  wordDirection: 'horizontal' | 'vertical';
  onWordDirectionChange: (direction: 'horizontal' | 'vertical') => void;
};

type PaintToolButtonsProps = Pick<
  PaintGenreToolbarProps,
  'categoryModes' | 'currentInputMode' | 'onInputModeSelect' | 'activeCategory' | 't'
> & {
  iconSize: number;
  buttonClassName: string;
  labelClassName: string;
  layout?: 'inline' | 'stacked';
};

const PaintToolButtons: React.FC<PaintToolButtonsProps> = ({
  categoryModes,
  currentInputMode,
  onInputModeSelect,
  activeCategory,
  t,
  iconSize,
  buttonClassName,
  labelClassName,
  layout = 'inline',
}) => (
  <>
    {((activeCategory === 'line' || activeCategory === 'freehand')
      ? (categoryModes[activeCategory] ?? []).filter((mode) => mode !== 'line')
      : categoryModes[activeCategory] ?? []
    ).map((mode) => {
      const IconComponent = INPUT_MODE_ICONS[mode];
      return (
        <button
          key={mode}
          className={`${layout === 'stacked' ? 'flex flex-col items-center gap-1' : 'flex items-center gap-1'} rounded-sm border transition-colors ${buttonClassName} ${
            currentInputMode === mode
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-white border-office-border hover:bg-office-ribbon-hover'
          }`}
          onClick={() => onInputModeSelect(mode)}
          title={t(`inputMode.${mode}.desc`, t(`inputMode.${mode}`))}
          aria-label={t(`inputMode.${mode}`)}
        >
          {IconComponent ? <IconComponent size={iconSize} /> : <span>?</span>}
          <span className={labelClassName}>{t(`inputMode.${mode}`)}</span>
        </button>
      );
    })}
  </>
);

type PaintColorSwatchesProps = Pick<PaintGenreToolbarProps, 'selectedSwatchId' | 'onSwatchSelect' | 't'> & {
  size: 'sm' | 'lg';
};

const PaintColorSwatches: React.FC<PaintColorSwatchesProps> = ({ selectedSwatchId, onSwatchSelect, t, size }) => {
  const buttonClass = size === 'lg' ? 'h-9 w-9' : 'h-5 w-5';
  return (
    <div className="flex items-center gap-1">
      {PAINT_COLOR_SWATCHES.map((swatch) => {
        const isActive = selectedSwatchId === swatch.id;
        return (
          <button
            key={swatch.id}
            type="button"
            className={`${buttonClass} rounded-sm border transition-colors ${
              isActive
                ? 'border-office-accent ring-1 ring-office-accent'
                : 'border-office-border hover:border-office-accent'
            }`}
            style={{ backgroundColor: swatch.color }}
            onClick={() => onSwatchSelect(swatch.id, swatch.color)}
            title={t(swatch.labelKey, swatch.fallback)}
            aria-label={t(swatch.labelKey, swatch.fallback)}
          />
        );
      })}
    </div>
  );
};

export const PaintGenreToolbarDesktop: React.FC<PaintGenreToolbarProps> = ({
  t,
  paintModes,
  isAnswerMode,
  availableCategories,
  activeCategory,
  onCategorySelect,
  selectedSwatchId,
  onSwatchSelect,
  currentInputMode,
  categoryModes,
  lineAnchor,
  onLineAnchorChange,
  onInputModeSelect,
  wordDirection,
  onWordDirectionChange,
}) => (
  <footer className="border-t border-office-border bg-white px-2 sm:px-3 py-2">
    {paintModes.length > 0 ? (
      <fieldset
        disabled={!isAnswerMode}
        aria-disabled={!isAnswerMode}
        className={`min-w-0 border-0 p-0 m-0 overflow-x-hidden ${
          !isAnswerMode ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        <div className="w-full flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-office-text-secondary">{t('paint.genre', 'Genre')}</span>
            <SegmentedToggle
              value={activeCategory}
              options={availableCategories.map((category) => {
                const Icon = PAINT_CATEGORY_ICONS[category.id];
                const label = t(category.labelKey);
                return {
                  value: category.id,
                  label: (
                    <span className="inline-flex items-center gap-1">
                      <Icon size={14} />
                      <span>{label}</span>
                    </span>
                  ),
                  title: label,
                  ariaLabel: label,
                };
              })}
              onChange={onCategorySelect}
              className="flex-wrap sm:flex-nowrap"
              buttonClassName="px-2 py-1 text-xs"
            />
            <div className="flex items-center gap-1 w-full pt-1 sm:pt-0 sm:w-auto sm:pl-1 sm:border-l border-office-border">
              <PaintColorSwatches size="sm" selectedSwatchId={selectedSwatchId} onSwatchSelect={onSwatchSelect} t={t} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-office-text-secondary">&gt;</span>
              <span className="font-semibold text-office-text">
                {t(availableCategories.find((category) => category.id === activeCategory)?.labelKey ?? 'tool.surface')}
              </span>
            </div>
            {activeCategory === 'line' && (
              <div className="flex items-center gap-1">
                <button
                  className={`px-2 py-1 text-xs rounded-sm border transition-colors ${
                    currentInputMode === 'line' && lineAnchor === 'cell'
                      ? 'bg-office-accent text-white border-office-accent'
                      : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                  }`}
                  onClick={() => onLineAnchorChange('cell')}
                >
                  {t('paint.lineTarget.line', 'Line')}
                </button>
                <button
                  className={`px-2 py-1 text-xs rounded-sm border transition-colors ${
                    currentInputMode === 'line' && lineAnchor === 'vertex'
                      ? 'bg-office-accent text-white border-office-accent'
                      : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                  }`}
                  onClick={() => onLineAnchorChange('vertex')}
                >
                  {t('paint.lineTarget.edge', 'Edge')}
                </button>
              </div>
            )}
            {activeCategory === 'word' && (
              <SegmentedToggle
                value={wordDirection}
                options={[
                  {
                    value: 'horizontal',
                    label: t('panel.wordDirection.horizontal', 'Across'),
                  },
                  {
                    value: 'vertical',
                    label: t('panel.wordDirection.vertical', 'Down'),
                  },
                ]}
                onChange={onWordDirectionChange}
                buttonClassName="px-2 py-1 text-xs"
              />
            )}
            <div className="flex flex-wrap items-center gap-1">
              <PaintToolButtons
                categoryModes={categoryModes}
                currentInputMode={currentInputMode}
                onInputModeSelect={onInputModeSelect}
                activeCategory={activeCategory}
                t={t}
                iconSize={26}
                layout="stacked"
                buttonClassName="px-2 py-2 text-[10px] min-h-[56px] min-w-[60px]"
                labelClassName="text-[10px] leading-tight"
              />
            </div>
          </div>
        </div>
      </fieldset>
    ) : (
      <div className="text-xs text-office-text-secondary">{t('constraint.noPreset')}</div>
    )}
  </footer>
);

export const PaintGenreToolbarMobile: React.FC<PaintGenreToolbarProps> = ({
  t,
  paintModes,
  isAnswerMode,
  availableCategories,
  activeCategory,
  onCategorySelect,
  selectedSwatchId,
  onSwatchSelect,
  currentInputMode,
  categoryModes,
  lineAnchor,
  onLineAnchorChange,
  onInputModeSelect,
  wordDirection,
  onWordDirectionChange,
}) => (
  <footer className="border-t border-office-border bg-white px-2 py-2">
    {paintModes.length > 0 ? (
      <fieldset
        disabled={!isAnswerMode}
        aria-disabled={!isAnswerMode}
        className={`min-w-0 border-0 p-0 m-0 ${
          !isAnswerMode ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        <div className="w-full flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedToggle
              value={activeCategory}
              options={availableCategories.map((category) => {
                const Icon = PAINT_CATEGORY_ICONS[category.id];
                const label = t(category.labelKey);
                return {
                  value: category.id,
                  label: (
                    <span className="inline-flex flex-col items-center gap-1">
                      <Icon size={48} />
                      <span className="text-[10px] leading-tight">{label}</span>
                    </span>
                  ),
                  title: label,
                  ariaLabel: label,
                };
              })}
              onChange={onCategorySelect}
              className="flex-wrap"
              buttonClassName="px-2 py-2 text-[10px] min-h-[72px]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-office-text-secondary">&gt;</span>
              <span className="font-semibold text-office-text">
                {t(availableCategories.find((category) => category.id === activeCategory)?.labelKey ?? 'tool.surface')}
              </span>
            </div>
            {activeCategory === 'line' && (
              <div className="flex items-center gap-1">
                <button
                  className={`px-2 py-2 text-[11px] rounded-sm border transition-colors ${
                    currentInputMode === 'line' && lineAnchor === 'cell'
                      ? 'bg-office-accent text-white border-office-accent'
                      : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                  }`}
                  onClick={() => onLineAnchorChange('cell')}
                >
                  {t('paint.lineTarget.line', 'Line')}
                </button>
                <button
                  className={`px-2 py-2 text-[11px] rounded-sm border transition-colors ${
                    currentInputMode === 'line' && lineAnchor === 'vertex'
                      ? 'bg-office-accent text-white border-office-accent'
                      : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                  }`}
                  onClick={() => onLineAnchorChange('vertex')}
                >
                  {t('paint.lineTarget.edge', 'Edge')}
                </button>
              </div>
            )}
            {activeCategory === 'word' && (
              <SegmentedToggle
                value={wordDirection}
                options={[
                  {
                    value: 'horizontal',
                    label: t('panel.wordDirection.horizontal', 'Across'),
                  },
                  {
                    value: 'vertical',
                    label: t('panel.wordDirection.vertical', 'Down'),
                  },
                ]}
                onChange={onWordDirectionChange}
                buttonClassName="px-2 py-2 text-[11px]"
              />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PaintColorSwatches size="lg" selectedSwatchId={selectedSwatchId} onSwatchSelect={onSwatchSelect} t={t} />
            <div className="flex flex-wrap items-center gap-1">
              <PaintToolButtons
                categoryModes={categoryModes}
                currentInputMode={currentInputMode}
                onInputModeSelect={onInputModeSelect}
                activeCategory={activeCategory}
                t={t}
                iconSize={48}
                layout="stacked"
                buttonClassName="px-2 py-2 text-[10px] min-h-[82px] min-w-[72px]"
                labelClassName="text-[10px] leading-tight"
              />
            </div>
          </div>
        </div>
      </fieldset>
    ) : (
      <div className="text-xs text-office-text-secondary">{t('constraint.noPreset')}</div>
    )}
  </footer>
);
