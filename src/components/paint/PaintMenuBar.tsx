import React from 'react';
import { CollapseIcon, ExpandIcon } from './PaintIcons';
import type { PaintMenu, TranslateFn } from './types';
import { OfficeMenuBar } from '../toolbar';

export type PaintMenuBarProps = {
  t: TranslateFn;
  paintMenus: PaintMenu[];
  activeMenu: string | null;
  setActiveMenu: React.Dispatch<React.SetStateAction<string | null>>;
  menuRef: React.RefObject<HTMLDivElement | null>;
  isJa: boolean;
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
  onLanguageChange,
  isExpanded,
  onToggleExpand,
}) => (
  <OfficeMenuBar
    menuRef={menuRef}
    menus={paintMenus}
    activeMenu={activeMenu}
    setActiveMenu={setActiveMenu}
    containerClassName="flex flex-wrap items-center gap-1 bg-office-ribbon border border-office-border px-1 py-1 -mx-2 sm:-mx-3 sm:h-7 sm:py-0"
    menuButtonClassName="px-2 sm:px-3 py-1 text-xs sm:text-sm hover:bg-office-ribbon-hover transition-colors"
    dropdownClassName="absolute top-full left-0 bg-white border border-office-border shadow-lg min-w-[200px] py-1 z-40"
    rightSlotClassName="ml-auto flex items-center gap-1 pr-1"
    title={(
      <span className="font-semibold text-xs sm:text-sm text-office-accent">
        {t('app.paintTitle', 'PuzzleKit Paint')}
      </span>
    )}
    rightSlot={(
      <>
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
      </>
    )}
  />
);
