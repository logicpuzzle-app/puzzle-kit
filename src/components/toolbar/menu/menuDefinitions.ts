/**
 * Menu definitions for MenuBar
 */
import type { GridConfig } from '../../../types';

export interface MenuItem {
  labelKey: string;
  shortcut?: string;
  action?: () => void;
  divider?: boolean;
  disabled?: boolean;
  strikethrough?: boolean;
  suffix?: string;
  checked?: boolean;
}

export interface MenuDefinition {
  labelKey: string;
  items: MenuItem[];
}

interface MenuDefinitionsOptions {
  // File menu handlers
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onImportPenpa: () => void;
  onExportPuzzlink: () => void;
  onShareUrl: () => void;
  onExportPng: () => void;
  onExportPng2x: () => void;
  onExportPng4x: () => void;
  onExportSvg: () => void;
  onExitToHome: () => void;
  // Edit menu handlers
  onUndo: () => void;
  onRedo: () => void;
  onToggleConstraintMode: () => void;
  onClearProblem: () => void;
  onClearAnswer: () => void;
  onClearAll: () => void;
  // View menu handlers
  onToggleGrid: () => void;
  onToggleAdjacency: () => void;
  onToggleProblem: () => void;
  onToggleAnswer: () => void;
  // Help menu handlers
  onLanguageJa: () => void;
  onLanguageEn: () => void;
  onShowShortcuts: () => void;
  onPerformanceTest: () => void;
  // State for checkmarks
  showConstraintLayer: boolean;
  showGrid: boolean;
  showAdjacency: boolean;
  showProblemLayer: boolean;
  showAnswerLayer: boolean;
}

/**
 * Create menu definitions for the MenuBar
 */
export const createMenuDefinitions = (options: MenuDefinitionsOptions): MenuDefinition[] => {
  const {
    onNew,
    onOpen,
    onSave,
    onImportPenpa,
    onExportPuzzlink,
    onShareUrl,
    onExportPng,
    onExportPng2x,
    onExportPng4x,
    onExportSvg,
    onExitToHome,
    onUndo,
    onRedo,
    onToggleConstraintMode,
    onClearProblem,
    onClearAnswer,
    onClearAll,
    onToggleGrid,
    onToggleAdjacency,
    onToggleProblem,
    onToggleAnswer,
    onLanguageJa,
    onLanguageEn,
    onShowShortcuts,
    onPerformanceTest,
    showConstraintLayer,
    showGrid,
    showAdjacency,
    showProblemLayer,
    showAnswerLayer,
  } = options;

  return [
    {
      labelKey: 'menu.file',
      items: [
        { labelKey: 'file.new', shortcut: 'Ctrl+N', action: onNew },
        { labelKey: 'file.open', shortcut: 'Ctrl+O', action: onOpen },
        { labelKey: 'file.save', shortcut: 'Ctrl+S', action: onSave },
        { divider: true, labelKey: '' },
        { labelKey: 'file.importPenpa', action: onImportPenpa },
        { labelKey: 'file.exportPuzzlink', action: onExportPuzzlink, strikethrough: true, disabled: true },
        { labelKey: 'file.shareUrl', action: onShareUrl, suffix: '(beta)' },
        { divider: true, labelKey: '' },
        { labelKey: 'file.exportPng', action: onExportPng },
        { labelKey: 'file.exportPng2x', action: onExportPng2x },
        { labelKey: 'file.exportPng4x', action: onExportPng4x },
        { labelKey: 'file.exportSvg', action: onExportSvg },
        { divider: true, labelKey: '' },
        { labelKey: 'file.exitToHome', action: onExitToHome },
      ],
    },
    {
      labelKey: 'menu.edit',
      items: [
        { labelKey: 'edit.undo', shortcut: 'Ctrl+Z', action: onUndo },
        { labelKey: 'edit.redo', shortcut: 'Ctrl+Y', action: onRedo },
        { divider: true, labelKey: '' },
        {
          labelKey: 'edit.constraintMode',
          checked: showConstraintLayer,
          action: onToggleConstraintMode,
        },
        { divider: true, labelKey: '' },
        { labelKey: 'edit.clearProblem', action: onClearProblem },
        { labelKey: 'edit.clearAnswer', action: onClearAnswer },
        { labelKey: 'edit.clearAll', action: onClearAll },
      ],
    },
    {
      labelKey: 'menu.view',
      items: [
        {
          labelKey: 'view.showGrid',
          checked: showGrid,
          action: onToggleGrid,
        },
        {
          labelKey: 'view.showAdjacency',
          checked: showAdjacency,
          action: onToggleAdjacency,
        },
        { divider: true, labelKey: '' },
        {
          labelKey: 'view.showProblem',
          checked: showProblemLayer,
          action: onToggleProblem,
        },
        {
          labelKey: 'view.showAnswer',
          checked: showAnswerLayer,
          action: onToggleAnswer,
        },
      ],
    },
    {
      labelKey: 'menu.help',
      items: [
        { labelKey: 'Language: 日本語', action: onLanguageJa },
        { labelKey: 'Language: English', action: onLanguageEn },
        { divider: true, labelKey: '' },
        { labelKey: 'help.shortcuts', action: onShowShortcuts },
        { divider: true, labelKey: '' },
        { labelKey: 'help.performanceTest', action: onPerformanceTest },
      ],
    },
  ];
};

/**
 * Get keyboard shortcuts help text
 */
export const getShortcutsHelp = (): string => {
  return `
Keyboard Shortcuts:
━━━━━━━━━━━━━━━━━━━━
Primary Tools:
  S - Surface fill     Shift+S - Surface dot
  L - Line normal      Shift+L - Line diagonal
  E - Edge normal      Shift+E - Edge diagonal
  W - Wall
  N - Number normal    Shift+N - Number corner
  O - Circle symbol    Shift+O - Triangle
  X - Cross symbol
  V - Select
  T - Thermo
  C - Cage
  R - Square/Rectangle
  D - Diamond
  * - Star

Special:
  Shift+A - Arrow

Colors:
  Space - Swap primary/secondary color
  F1 - Grey     F2 - Green
  F3 - Black    F4 - Red

Number Tool Size:
  1 - Large   2 - Medium   3 - Small

Layers:
  Q - Problem layer
  A - Answer layer
  Tab - Toggle layer
  P - Toggle problem visibility

Edit:
  Ctrl+Z - Undo
  Ctrl+Shift+Z / Ctrl+Y - Redo
  Ctrl+S - Save
  Ctrl+O - Open
  Ctrl+N - New

View:
  Ctrl++ - Zoom in
  Ctrl+- - Zoom out
  Ctrl+0 - Reset zoom
  Mouse wheel - Pan
  Ctrl+wheel - Zoom
  Alt+drag - Pan
`.trim();
};
