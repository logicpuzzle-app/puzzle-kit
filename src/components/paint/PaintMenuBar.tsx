import React from 'react';
import { CollapseIcon, ExpandIcon } from './PaintIcons';
import type { PaintMenu, TranslateFn } from './types';

export type PaintMenuBarProps = {
  t: TranslateFn;
  paintMenus: PaintMenu[];
  activeMenu: string | null;
  setActiveMenu: React.Dispatch<React.SetStateAction<string | null>>;
  menuRef: React.RefObject<HTMLDivElement | null>;
  isJa: boolean;
  isEn: boolean;
  onLanguageChange: (lang: 'ja' | 'en') => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
};

export const PaintMenuBar: React.FC<PaintMenuBarProps> = ({
  t,
  paintMenus,
  activeMenu,
  setActiveMenu,
  menuRef,
  isJa,
  isEn,
  onLanguageChange,
  isExpanded,
  onToggleExpand,
}) => (
  <div
    ref={menuRef}
    className="flex flex-wrap items-center gap-1 bg-office-ribbon border border-office-border px-1 py-1 -mx-2 sm:-mx-3 sm:h-7 sm:py-0"
  >
    <div className="flex items-center px-2 mr-1 sm:mr-2">
      <span className="font-semibold text-xs sm:text-sm text-office-accent">
        {t('app.paintTitle', 'PuzzleKit Paint')}
      </span>
    </div>
    {paintMenus.map((menu) => (
      <div key={menu.labelKey} className="relative">
        <button
          className={`px-2 sm:px-3 py-1 text-xs sm:text-sm hover:bg-office-ribbon-hover transition-colors ${
            activeMenu === menu.labelKey ? 'bg-office-ribbon-hover' : ''
          }`}
          onClick={() => setActiveMenu(activeMenu === menu.labelKey ? null : menu.labelKey)}
          onMouseEnter={() => activeMenu && setActiveMenu(menu.labelKey)}
        >
          {t(menu.labelKey)}
        </button>

        {activeMenu === menu.labelKey && (
          <div className="absolute top-full left-0 bg-white border border-office-border shadow-lg min-w-[200px] py-1 z-40">
            {menu.items.map((item, index) =>
              item.divider ? (
                <div key={`${menu.labelKey}-divider-${index}`} className="border-t border-office-border my-1" />
              ) : (
                <button
                  key={item.labelKey}
                  className={`w-full text-left px-4 py-1.5 text-sm flex justify-between items-center ${
                    item.disabled
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'hover:bg-office-ribbon-hover'
                  }`}
                  onClick={() => !item.disabled && item.action?.()}
                  disabled={item.disabled}
                >
                  <span className="flex items-center gap-2">
                    {item.checked !== undefined && (
                      <span className="w-4 text-center">
                        {item.checked ? '✓' : ''}
                      </span>
                    )}
                    {t(item.labelKey)}
                  </span>
                </button>
              )
            )}
          </div>
        )}
      </div>
    ))}
    <div className="ml-auto flex items-center gap-1 pr-1">
      <button
        type="button"
        className="rounded-sm border border-office-border bg-white px-2 py-0.5 text-[10px] font-semibold text-office-text hover:bg-office-ribbon-hover transition-colors"
        onClick={() => onLanguageChange(isJa ? 'en' : 'ja')}
        title={isJa ? 'EN' : 'JA'}
        aria-label={isJa ? 'EN' : 'JA'}
      >
        {isJa ? 'JA' : 'EN'}
      </button>
      <button
        className="h-6 w-6 flex items-center justify-center rounded-sm hover:bg-office-ribbon-hover"
        onClick={onToggleExpand}
        type="button"
        title={isExpanded ? t('action.collapse', 'Collapse') : t('action.expand', 'Expand')}
        aria-label={isExpanded ? t('action.collapse', 'Collapse') : t('action.expand', 'Expand')}
      >
        {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
      </button>
    </div>
  </div>
);
