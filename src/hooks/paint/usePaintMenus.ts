import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import type { GridConfig } from '../../types';
import type { TranslateFn, PaintMenu } from '../../components/paint/types';
import type { DataLayerType } from '../../types';

type UsePaintMenusArgs = {
  t: TranslateFn;
  grid: GridConfig;
  setGrid: (updates: Partial<GridConfig>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  enterTrial: () => void;
  acceptTrial: () => void;
  rejectCurrentTrial: () => void;
  rejectTrial: () => void;
  trialStage: number;
  clearLayer: (layer: DataLayerType) => void;
  centerBoard: (forceFit: boolean) => void;
  showShortcuts: () => void;
};

export const usePaintMenus = ({
  t,
  grid,
  setGrid,
  fileInputRef,
  undo,
  redo,
  canUndo,
  canRedo,
  enterTrial,
  acceptTrial,
  rejectCurrentTrial,
  rejectTrial,
  trialStage,
  clearLayer,
  centerBoard,
  showShortcuts,
}: UsePaintMenusArgs) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const closeMenu = useCallback(() => setActiveMenu(null), []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const paintMenus = useMemo<PaintMenu[]>(() => [
    {
      labelKey: 'menu.file',
      items: [
        {
          labelKey: 'grid.selectImage',
          action: () => {
            fileInputRef.current?.click();
            closeMenu();
          },
        },
        { divider: true, labelKey: '' },
        {
          labelKey: 'file.exitToHome',
          action: () => {
            closeMenu();
            window.location.href = '/';
          },
        },
      ],
    },
    {
      labelKey: 'menu.edit',
      items: [
        {
          labelKey: 'edit.undo',
          action: () => {
            undo();
            closeMenu();
          },
          disabled: !canUndo(),
        },
        {
          labelKey: 'edit.redo',
          action: () => {
            redo();
            closeMenu();
          },
          disabled: !canRedo(),
        },
        { divider: true, labelKey: '' },
        {
          labelKey: 'trial.enter',
          action: () => {
            enterTrial();
            closeMenu();
          },
        },
        {
          labelKey: 'trial.accept',
          action: () => {
            acceptTrial();
            closeMenu();
          },
          disabled: trialStage === 0,
        },
        {
          labelKey: 'trial.reject',
          action: () => {
            rejectCurrentTrial();
            closeMenu();
          },
          disabled: trialStage === 0,
        },
        {
          labelKey: 'trial.rejectAll',
          action: () => {
            rejectTrial();
            closeMenu();
          },
          disabled: trialStage <= 1,
        },
        { divider: true, labelKey: '' },
        {
          labelKey: 'edit.clearAnswer',
          action: () => {
            clearLayer('answer');
            closeMenu();
          },
        },
      ],
    },
    {
      labelKey: 'menu.view',
      items: [
        {
          labelKey: 'view.showGrid',
          checked: grid.showGrid,
          action: () => {
            setGrid({ showGrid: !grid.showGrid });
            closeMenu();
          },
        },
        {
          labelKey: 'view.zoomFit',
          action: () => {
            centerBoard(true);
            closeMenu();
          },
        },
      ],
    },
    {
      labelKey: 'menu.help',
      items: [
        {
          labelKey: 'help.shortcuts',
          action: () => {
            showShortcuts();
            closeMenu();
          },
        },
      ],
    },
  ], [
    acceptTrial,
    canRedo,
    canUndo,
    centerBoard,
    clearLayer,
    closeMenu,
    enterTrial,
    fileInputRef,
    grid.showGrid,
    redo,
    rejectCurrentTrial,
    rejectTrial,
    setGrid,
    showShortcuts,
    trialStage,
    undo,
  ]);

  return {
    menuRef,
    activeMenu,
    setActiveMenu,
    paintMenus,
  };
};
