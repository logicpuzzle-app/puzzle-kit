import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { usePuzzleStore } from '../../store/puzzleStore';
import { useModalStore } from '../../store/modalStore';
import {
  downloadAsJson,
  exportToPng,
  downloadAsPng,
  autoSave,
  loadAutoSave,
} from '../../utils/serialization';
import { gridConfigToTopology, applyTopologyPreset } from '../../utils/gridTopology';
import { parsePenpaUrl, isPenpaUrl, parsePuzzlinkUrl, isPuzzlinkUrl, generatePuzzlinkUrl } from '../../utils/penpaCompat';
import { NewPuzzleDialog } from '../dialogs/NewPuzzleDialog';
import { PerformanceTestDialog } from '../dialogs/PerformanceTestDialog';
import { ShareUrlDialog } from '../dialogs/ShareUrlDialog';
import { getStorageAdapter, isStorageAvailable } from '../../modules/storage';
import { syncCountersFromPuzzleState } from '../../utils/idGenerator';
import { optimizePuzzleStateForExport } from '../../utils/puzzleExport';

interface MenuItem {
  labelKey: string;
  shortcut?: string;
  action?: () => void;
  divider?: boolean;
  disabled?: boolean;
  strikethrough?: boolean;
  suffix?: string;
}

interface MenuDefinition {
  labelKey: string;
  items: MenuItem[];
}

export const MenuBar: React.FC = () => {
  const { t } = useTranslation();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isNewPuzzleOpen, setIsNewPuzzleOpen] = useState(false);
  const [isPerformanceTestOpen, setIsPerformanceTestOpen] = useState(false);
  const [shareUrlDialogOpen, setShareUrlDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    grid,
    puzzle,
    undo,
    redo,
    clearLayer,
    clearAll,
    topology,
    useTopology,
    topologyPreset,
    topologyIntensity,
    showConstraintLayer,
    currentSchemaId,
  } = usePuzzleStore();

  // Check if constraint mode is enabled (constraint layer visible + preset selected)
  const isConstraintEnabled = showConstraintLayer && currentSchemaId !== null && currentSchemaId !== '__custom__';

  const { showAlert, showShortcuts } = useModalStore();

  // Auto-save on changes
  useEffect(() => {
    const timer = setTimeout(() => {
      // Save topology settings without customTopology - it will be regenerated on load
      const topologySettings = {
        useTopology,
        topologyPreset,
        topologyIntensity,
      };
      autoSave(grid, puzzle, undefined, topologySettings);
    }, 2000);
    return () => clearTimeout(timer);
  }, [grid, puzzle, useTopology, topologyPreset, topologyIntensity]);

  // Helper to load puzzle data with topology
  const loadPuzzleData = (data: {
    grid: typeof grid;
    state: typeof puzzle;
    topologySettings?: {
      useTopology: boolean;
      topologyPreset: string;
      topologyIntensity: number;
    };
  }) => {
    const storeState = usePuzzleStore.getState();

    // Sync ID counters to avoid collisions
    syncCountersFromPuzzleState(data.state);

    // Use saved settings or fall back to current store settings
    const loadedUseTopology = data.topologySettings?.useTopology ?? storeState.useTopology;
    const loadedTopologyPreset = (data.topologySettings?.topologyPreset ?? storeState.topologyPreset) as typeof storeState.topologyPreset;
    const loadedTopologyIntensity = data.topologySettings?.topologyIntensity ?? storeState.topologyIntensity;

    // Always regenerate topology from grid config (includes mergedCells, splitLines)
    const baseTopology = gridConfigToTopology(data.grid);
    const loadedTopology = loadedUseTopology
      ? applyTopologyPreset(baseTopology, {
          preset: loadedTopologyPreset,
          intensity: loadedTopologyIntensity,
        })
      : baseTopology;

    usePuzzleStore.setState({
      grid: data.grid,
      puzzle: data.state,
      topology: loadedTopology,
      useTopology: loadedUseTopology,
      topologyPreset: loadedTopologyPreset,
      topologyIntensity: loadedTopologyIntensity,
    });
  };

  // Load from URL or auto-save on mount
  useEffect(() => {
    const loadFromUrl = async () => {
      const urlParams = new URLSearchParams(window.location.search);

      // Check for puzzle ID (new format)
      const puzzleId = urlParams.get('id');
      if (puzzleId) {
        const adapter = getStorageAdapter();
        if (adapter && adapter.isAvailable()) {
          try {
            const result = await adapter.load(puzzleId);
            if (result) {
              loadPuzzleData({
                grid: result.data.grid,
                state: result.data.state,
                topologySettings: result.data.topologySettings,
              });
              // Clear URL params
              window.history.replaceState({}, '', window.location.pathname);
              return;
            }
          } catch (error) {
            console.error('[Load URL] Failed to load puzzle:', error);
          }
        }
      }

      // Try to load auto-save
      const saved = loadAutoSave();
      if (saved) {
        loadPuzzleData({
          grid: saved.grid,
          state: saved.state,
          topologySettings: saved.topologySettings,
        });
      }
    };

    loadFromUrl();
  }, []);

  const handleExportJson = () => {
    // Save topology settings without customTopology - it will be regenerated on load
    const topologySettings = {
      useTopology,
      topologyPreset,
      topologyIntensity,
    };
    downloadAsJson(grid, puzzle, { title: 'Puzzle' }, topologySettings);
    setActiveMenu(null);
  };

  const handleImportJson = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            const data = JSON.parse(content);
            if (data.grid && data.state) {
              loadPuzzleData({
                grid: data.grid,
                state: data.state,
                topologySettings: data.topologySettings,
              });
            }
          } catch {
            showAlert({
              title: t('error.invalidFile'),
              message: t('error.invalidFile'),
              variant: 'error',
            });
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
    setActiveMenu(null);
  };

  // Convert nested SVG elements to group elements for proper export
  const flattenNestedSvgs = (container: Element) => {
    const nestedSvgs = container.querySelectorAll('svg svg');
    nestedSvgs.forEach(nestedSvg => {
      const parent = nestedSvg.parentElement;
      if (!parent) return;

      // Get the nested SVG's attributes
      const width = parseFloat(nestedSvg.getAttribute('width') || '24');
      const height = parseFloat(nestedSvg.getAttribute('height') || '24');
      const viewBox = nestedSvg.getAttribute('viewBox') || '0 0 24 24';
      const [, , vbWidth, vbHeight] = viewBox.split(/\s+/).map(Number);

      // Calculate scale
      const scaleX = width / (vbWidth || 24);
      const scaleY = height / (vbHeight || 24);

      // Create a group element to replace the nested SVG
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

      // Copy stroke/fill attributes
      const stroke = nestedSvg.getAttribute('stroke');
      const fill = nestedSvg.getAttribute('fill');
      const strokeWidth = nestedSvg.getAttribute('stroke-width');
      const strokeLinecap = nestedSvg.getAttribute('stroke-linecap');
      const strokeLinejoin = nestedSvg.getAttribute('stroke-linejoin');

      if (stroke) g.setAttribute('stroke', stroke);
      if (fill) g.setAttribute('fill', fill);
      if (strokeWidth) g.setAttribute('stroke-width', strokeWidth);
      if (strokeLinecap) g.setAttribute('stroke-linecap', strokeLinecap);
      if (strokeLinejoin) g.setAttribute('stroke-linejoin', strokeLinejoin);

      // Apply scale transform
      g.setAttribute('transform', `scale(${scaleX}, ${scaleY})`);

      // Move all children to the group
      while (nestedSvg.firstChild) {
        g.appendChild(nestedSvg.firstChild);
      }

      // Replace the nested SVG with the group
      parent.replaceChild(g, nestedSvg);
    });
  };

  const handleExportSvg = () => {
    const svg = document.getElementById('puzzle-canvas') as SVGSVGElement | null;
    if (!svg) return;

    // Get dimensions: prefer topology bounds for non-square grids
    let width: number;
    let height: number;

    if (useTopology && topology) {
      // For topology grids (isometric, hex, etc.), use bounds
      const exportPaddingLeft = grid.exportPaddingLeft ?? 0;
      const exportPaddingRight = grid.exportPaddingRight ?? 0;
      const exportPaddingTop = grid.exportPaddingTop ?? 0;
      const exportPaddingBottom = grid.exportPaddingBottom ?? 0;
      width = topology.bounds.width + exportPaddingLeft + exportPaddingRight;
      height = topology.bounds.height + exportPaddingTop + exportPaddingBottom;
    } else {
      // For standard square grids
      const { outerPadding, cellSize, rows, cols, marginTop = 0, marginBottom = 0, marginLeft = 0, marginRight = 0 } = grid;
      const totalRows = rows + marginTop + marginBottom;
      const totalCols = cols + marginLeft + marginRight;
      width = totalCols * cellSize + outerPadding * 2;
      height = totalRows * cellSize + outerPadding * 2;
    }

    // Clone SVG
    const clone = svg.cloneNode(true) as SVGSVGElement;

    // Set proper dimensions and viewBox
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(width));
    clone.setAttribute('height', String(height));
    clone.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // Reset pan/zoom transforms to show original grid position (only top-level transforms)
    // We need to do this BEFORE flattening nested SVGs, so icon transforms are preserved
    const topLevelGroups = clone.querySelectorAll(':scope > g[transform]');
    topLevelGroups.forEach(g => {
      g.removeAttribute('transform');
    });

    // Flatten nested SVGs (icons) - this adds scale transforms that we want to keep
    flattenNestedSvgs(clone);

    // Remove UI-only elements (cursors, previews, etc.)
    const uiElements = clone.querySelectorAll('[data-cursor], [data-preview]');
    uiElements.forEach(el => el.remove());

    // Remove the large background rect used for panning (the -1000,-1000 one)
    const rects = clone.querySelectorAll('rect');
    rects.forEach(rect => {
      const x = parseFloat(rect.getAttribute('x') || '0');
      const y = parseFloat(rect.getAttribute('y') || '0');
      if (x < -500 || y < -500) {
        rect.remove();
      }
    });

    const svgData = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'puzzle.svg';
    a.click();
    URL.revokeObjectURL(url);
    setActiveMenu(null);
  };

  const handleExportPng = async () => {
    const svg = document.getElementById('puzzle-canvas') as SVGSVGElement | null;
    if (!svg) return;

    // Get dimensions: prefer topology bounds for non-square grids
    let width: number;
    let height: number;

    if (useTopology && topology) {
      // For topology grids (isometric, hex, etc.), use bounds
      const exportPaddingLeft = grid.exportPaddingLeft ?? 0;
      const exportPaddingRight = grid.exportPaddingRight ?? 0;
      const exportPaddingTop = grid.exportPaddingTop ?? 0;
      const exportPaddingBottom = grid.exportPaddingBottom ?? 0;
      width = topology.bounds.width + exportPaddingLeft + exportPaddingRight;
      height = topology.bounds.height + exportPaddingTop + exportPaddingBottom;
    } else {
      // For standard square grids
      const { outerPadding, cellSize, rows, cols, marginTop = 0, marginBottom = 0, marginLeft = 0, marginRight = 0 } = grid;
      const totalRows = rows + marginTop + marginBottom;
      const totalCols = cols + marginLeft + marginRight;
      width = totalCols * cellSize + outerPadding * 2;
      height = totalRows * cellSize + outerPadding * 2;
    }

    // Clone SVG and set proper dimensions
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(width));
    clone.setAttribute('height', String(height));
    clone.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // Reset pan/zoom transforms to show original grid position (only top-level transforms)
    // We need to do this BEFORE flattening nested SVGs, so icon transforms are preserved
    const topLevelGroups = clone.querySelectorAll(':scope > g[transform]');
    topLevelGroups.forEach(g => {
      g.removeAttribute('transform');
    });

    // Flatten nested SVGs (icons) - this adds scale transforms that we want to keep
    flattenNestedSvgs(clone);

    // Remove UI-only elements (cursors, previews, invisible pan area)
    const uiElements = clone.querySelectorAll('[data-cursor], [data-preview]');
    uiElements.forEach(el => el.remove());

    // Remove the large background rect used for panning (the -1000,-1000 one)
    const rects = clone.querySelectorAll('rect');
    rects.forEach(rect => {
      const x = parseFloat(rect.getAttribute('x') || '0');
      const y = parseFloat(rect.getAttribute('y') || '0');
      if (x < -500 || y < -500) {
        rect.remove();
      }
    });

    const blob = await exportToPng(clone, 1);
    if (blob) {
      downloadAsPng(blob, 'puzzle.png');
    }
    setActiveMenu(null);
  };

  const handleExportPngHQ = async (scale: number) => {
    const svg = document.getElementById('puzzle-canvas') as SVGSVGElement | null;
    if (!svg) return;

    // Get dimensions: prefer topology bounds for non-square grids
    let width: number;
    let height: number;

    if (useTopology && topology) {
      // For topology grids (isometric, hex, etc.), use bounds
      const exportPaddingLeft = grid.exportPaddingLeft ?? 0;
      const exportPaddingRight = grid.exportPaddingRight ?? 0;
      const exportPaddingTop = grid.exportPaddingTop ?? 0;
      const exportPaddingBottom = grid.exportPaddingBottom ?? 0;
      width = topology.bounds.width + exportPaddingLeft + exportPaddingRight;
      height = topology.bounds.height + exportPaddingTop + exportPaddingBottom;
    } else {
      // For standard square grids
      const { outerPadding, cellSize, rows, cols, marginTop = 0, marginBottom = 0, marginLeft = 0, marginRight = 0 } = grid;
      const totalRows = rows + marginTop + marginBottom;
      const totalCols = cols + marginLeft + marginRight;
      width = totalCols * cellSize + outerPadding * 2;
      height = totalRows * cellSize + outerPadding * 2;
    }

    // Clone SVG and set proper dimensions
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(width));
    clone.setAttribute('height', String(height));
    clone.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // Reset pan/zoom transforms to show original grid position (only top-level transforms)
    const topLevelGroups = clone.querySelectorAll(':scope > g[transform]');
    topLevelGroups.forEach(g => {
      g.removeAttribute('transform');
    });

    // Flatten nested SVGs (icons)
    flattenNestedSvgs(clone);

    // Remove UI-only elements (cursors, previews, invisible pan area)
    const uiElements = clone.querySelectorAll('[data-cursor], [data-preview]');
    uiElements.forEach(el => el.remove());

    // Remove the large background rect used for panning
    const rects = clone.querySelectorAll('rect');
    rects.forEach(rect => {
      const x = parseFloat(rect.getAttribute('x') || '0');
      const y = parseFloat(rect.getAttribute('y') || '0');
      if (x < -500 || y < -500) {
        rect.remove();
      }
    });

    const blob = await exportToPng(clone, scale);
    if (blob) {
      downloadAsPng(blob, `puzzle_${scale}x.png`);
    }
    setActiveMenu(null);
  };

  const handleShareUrl = async () => {
    const adapter = getStorageAdapter();

    if (!adapter || !adapter.isAvailable()) {
      showAlert({
        title: t('error.storageNotAvailable'),
        message: t('error.storageNotAvailable'),
        variant: 'error',
      });
      setActiveMenu(null);
      return;
    }

    // Build puzzle export data - topology will be regenerated on load
    const topologySettings = {
      useTopology,
      topologyPreset,
      topologyIntensity,
    };

    const puzzleData = {
      version: '1.1.0',
      grid,
      state: optimizePuzzleStateForExport(puzzle),
      metadata: {
        modified: new Date().toISOString(),
      },
      topologySettings,
    };

    try {
      const result = await adapter.save(puzzleData);
      await navigator.clipboard.writeText(result.url);
      // Show success modal with URL
      setShareUrl(result.url);
      setShareUrlDialogOpen(true);
    } catch (error) {
      console.error('[Share URL] Failed to save puzzle:', error);
      showAlert({
        title: t('error.shareFailed'),
        message: t('error.shareFailed'),
        variant: 'error',
      });
    }

    setActiveMenu(null);
  };

  const handlePerformanceTest = () => {
    setIsPerformanceTestOpen(true);
    setActiveMenu(null);
  };

  const handleImportPenpaUrl = () => {
    const url = prompt(t('file.importPenpaUrl') || 'Enter Penpa or puzz.link URL:');
    if (!url) return;

    let result = null;

    // Try puzz.link format first
    if (isPuzzlinkUrl(url)) {
      result = parsePuzzlinkUrl(url);
    } else if (isPenpaUrl(url)) {
      result = parsePenpaUrl(url);
    } else {
      showAlert({
        title: t('error.invalidPenpaUrl'),
        message: t('error.invalidPenpaUrl'),
        variant: 'error',
      });
      return;
    }

    if (result) {
      // Sync ID counters to avoid collisions
      syncCountersFromPuzzleState(result.state);
      usePuzzleStore.setState({
        grid: result.grid,
        puzzle: result.state,
      });
      showAlert({
        title: t('file.importSuccess'),
        message: t('file.importSuccess'),
        variant: 'success',
      });
    } else {
      showAlert({
        title: t('error.importFailed'),
        message: t('error.importFailed'),
        variant: 'error',
      });
    }
    setActiveMenu(null);
  };

  const handleExportPuzzlink = () => {
    const puzzleType = prompt('Enter puzzle type (e.g., sudoku, nurikabe, edit):', 'edit');
    if (!puzzleType) return;

    const url = generatePuzzlinkUrl(grid, puzzle, puzzleType);
    navigator.clipboard.writeText(url).then(() => {
      showAlert({
        title: t('share.copied'),
        message: t('share.copied'),
        variant: 'success',
      });
    });
    setActiveMenu(null);
  };

  const menus: MenuDefinition[] = [
    {
      labelKey: 'menu.file',
      items: [
        { labelKey: 'file.new', shortcut: 'Ctrl+N', action: () => { setIsNewPuzzleOpen(true); setActiveMenu(null); } },
        { labelKey: 'file.open', shortcut: 'Ctrl+O', action: handleImportJson },
        { labelKey: 'file.save', shortcut: 'Ctrl+S', action: handleExportJson },
        { divider: true, labelKey: '' },
        { labelKey: 'file.importPenpa', action: handleImportPenpaUrl },
        { labelKey: 'file.exportPuzzlink', action: handleExportPuzzlink, strikethrough: true, disabled: true },
        { labelKey: 'file.shareUrl', action: handleShareUrl, suffix: '(beta)' },
        { divider: true, labelKey: '' },
        { labelKey: 'file.exportPng', action: handleExportPng },
        { labelKey: 'file.exportPng2x', action: () => handleExportPngHQ(2) },
        { labelKey: 'file.exportPng4x', action: () => handleExportPngHQ(4) },
        { labelKey: 'file.exportSvg', action: handleExportSvg },
      ],
    },
    {
      labelKey: 'menu.edit',
      items: [
        { labelKey: 'edit.undo', shortcut: 'Ctrl+Z', action: () => { undo(); setActiveMenu(null); } },
        { labelKey: 'edit.redo', shortcut: 'Ctrl+Y', action: () => { redo(); setActiveMenu(null); } },
        { divider: true, labelKey: '' },
        { labelKey: 'edit.clearProblem', action: () => { clearLayer('problem'); setActiveMenu(null); } },
        { labelKey: 'edit.clearAnswer', action: () => { clearLayer('answer'); setActiveMenu(null); } },
        { labelKey: 'edit.clearAll', action: () => { clearAll(); setActiveMenu(null); } },
      ],
    },
    {
      labelKey: 'menu.view',
      items: [
        { labelKey: 'help.shortcuts', action: () => { showShortcuts(); setActiveMenu(null); } },
      ],
    },
    {
      labelKey: 'menu.help',
      items: [
        { labelKey: 'Language: 日本語', action: () => { i18n.changeLanguage('ja'); setActiveMenu(null); } },
        { labelKey: 'Language: English', action: () => { i18n.changeLanguage('en'); setActiveMenu(null); } },
        { divider: true, labelKey: '' },
        { labelKey: 'help.shortcuts', action: () => { showShortcuts(); setActiveMenu(null); } },
        { divider: true, labelKey: '' },
        { labelKey: 'help.performanceTest', action: handlePerformanceTest },
      ],
    },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleExportJson();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        handleImportJson();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setIsNewPuzzleOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, grid, puzzle]);

  return (
    <div
      ref={menuRef}
      className="flex items-center bg-office-ribbon border-b border-office-border h-7 px-1"
    >
      {/* App icon/title */}
      <div className="flex items-center px-2 mr-2">
        <span className={`font-semibold text-sm ${isConstraintEnabled ? 'text-purple-600' : 'text-office-accent'}`}>
          {t('app.title')}
        </span>
      </div>

      {/* Menu items */}
      {menus.map((menu) => (
        <div key={menu.labelKey} className="relative">
          <button
            className={`px-3 py-1 text-sm hover:bg-office-ribbon-hover transition-colors ${
              activeMenu === menu.labelKey ? 'bg-office-ribbon-hover' : ''
            }`}
            onClick={() =>
              setActiveMenu(activeMenu === menu.labelKey ? null : menu.labelKey)
            }
            onMouseEnter={() => activeMenu && setActiveMenu(menu.labelKey)}
          >
            {t(menu.labelKey)}
          </button>

          {/* Dropdown */}
          {activeMenu === menu.labelKey && (
            <div className="absolute top-full left-0 bg-white border border-office-border shadow-lg min-w-[200px] py-1 z-50">
              {menu.items.map((item, index) =>
                item.divider ? (
                  <div
                    key={index}
                    className="border-t border-office-border my-1"
                  />
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
                    <span className={item.strikethrough ? 'line-through' : ''}>
                      {t(item.labelKey)}{item.suffix ? ` ${item.suffix}` : ''}
                    </span>
                    {item.shortcut && (
                      <span className="text-office-text-secondary text-xs ml-4">
                        {item.shortcut}
                      </span>
                    )}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}

      {/* Right side - language indicator */}
      <div className="ml-auto flex items-center gap-2 px-2">
        <span className="text-xs text-office-text-secondary">
          {i18n.language === 'ja' ? '日本語' : 'English'}
        </span>
      </div>

      {/* New Puzzle Dialog */}
      <NewPuzzleDialog
        isOpen={isNewPuzzleOpen}
        onClose={() => setIsNewPuzzleOpen(false)}
      />

      {/* Performance Test Dialog */}
      <PerformanceTestDialog
        isOpen={isPerformanceTestOpen}
        onClose={() => setIsPerformanceTestOpen(false)}
      />

      <ShareUrlDialog
        isOpen={shareUrlDialogOpen}
        onClose={() => setShareUrlDialogOpen(false)}
        url={shareUrl}
      />
    </div>
  );
};

function getShortcutsHelp(): string {
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
}
