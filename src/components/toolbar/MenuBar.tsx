import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { usePuzzleStore } from '../../store/puzzleStore';
import {
  generateShareUrl,
  parseShareUrl,
  downloadAsJson,
  exportToPng,
  downloadAsPng,
  autoSave,
  loadAutoSave,
  serializeTopology,
  deserializeTopology,
} from '../../utils/serialization';
import { gridConfigToTopology, applyTopologyPreset } from '../../utils/gridTopology';
import { parsePenpaUrl, isPenpaUrl, parsePuzzlinkUrl, isPuzzlinkUrl, generatePuzzlinkUrl } from '../../utils/penpaCompat';
import { NewPuzzleDialog } from '../dialogs/NewPuzzleDialog';

interface MenuItem {
  labelKey: string;
  shortcut?: string;
  action?: () => void;
  divider?: boolean;
}

interface MenuDefinition {
  labelKey: string;
  items: MenuItem[];
}

export const MenuBar: React.FC = () => {
  const { t } = useTranslation();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isNewPuzzleOpen, setIsNewPuzzleOpen] = useState(false);
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
    newPuzzle,
    addSurface,
    addLine,
    addNumber,
    addSymbol,
  } = usePuzzleStore();

  // Auto-save on changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const topologySettings = topology ? {
        useTopology,
        topologyPreset,
        topologyIntensity,
        customTopology: serializeTopology(topology),
      } : undefined;
      autoSave(grid, puzzle, undefined, topologySettings);
    }, 2000);
    return () => clearTimeout(timer);
  }, [grid, puzzle, topology, useTopology, topologyPreset, topologyIntensity]);

  // Helper to load puzzle data with topology
  const loadPuzzleData = (data: {
    grid: typeof grid;
    state: typeof puzzle;
    topologySettings?: {
      useTopology: boolean;
      topologyPreset: string;
      topologyIntensity: number;
      customTopology?: unknown;
    };
  }) => {
    const storeState = usePuzzleStore.getState();

    // Use saved topology if available, otherwise regenerate
    let loadedTopology;
    let loadedUseTopology = storeState.useTopology;
    let loadedTopologyPreset = storeState.topologyPreset;
    let loadedTopologyIntensity = storeState.topologyIntensity;

    if (data.topologySettings) {
      loadedUseTopology = data.topologySettings.useTopology;
      loadedTopologyPreset = data.topologySettings.topologyPreset as typeof storeState.topologyPreset;
      loadedTopologyIntensity = data.topologySettings.topologyIntensity;

      if (data.topologySettings.customTopology) {
        // Use saved custom topology
        loadedTopology = deserializeTopology(data.topologySettings.customTopology as any);
      } else {
        // Regenerate from settings
        const baseTopology = gridConfigToTopology(data.grid);
        loadedTopology = loadedUseTopology
          ? applyTopologyPreset(baseTopology, {
              preset: loadedTopologyPreset,
              intensity: loadedTopologyIntensity,
            })
          : baseTopology;
      }
    } else {
      // No topology settings - regenerate with current store settings
      const baseTopology = gridConfigToTopology(data.grid);
      loadedTopology = storeState.useTopology
        ? applyTopologyPreset(baseTopology, {
            preset: storeState.topologyPreset,
            intensity: storeState.topologyIntensity,
          })
        : baseTopology;
    }

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
    const urlParams = new URLSearchParams(window.location.search);
    const encoded = urlParams.get('p');

    if (encoded) {
      const data = parseShareUrl(window.location.href);
      if (data) {
        loadPuzzleData({
          grid: data.grid,
          state: data.state,
          topologySettings: data.topologySettings,
        });
        // Clear URL params
        window.history.replaceState({}, '', window.location.pathname);
        return;
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
  }, []);

  const handleExportJson = () => {
    downloadAsJson(grid, puzzle, { title: 'Puzzle' });
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
              usePuzzleStore.setState({
                grid: data.grid,
                puzzle: data.state,
              });
            }
          } catch {
            alert(t('error.invalidFile') || 'Invalid file');
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

    // Get grid dimensions for proper viewBox
    const { outerPadding, cellSize, rows, cols, marginTop = 0, marginBottom = 0, marginLeft = 0, marginRight = 0 } = grid;
    const totalRows = rows + marginTop + marginBottom;
    const totalCols = cols + marginLeft + marginRight;
    const width = totalCols * cellSize + outerPadding * 2;
    const height = totalRows * cellSize + outerPadding * 2;

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

    // Get grid dimensions for proper sizing
    const { outerPadding, cellSize, rows, cols, marginTop = 0, marginBottom = 0, marginLeft = 0, marginRight = 0 } = grid;
    const totalRows = rows + marginTop + marginBottom;
    const totalCols = cols + marginLeft + marginRight;
    const width = totalCols * cellSize + outerPadding * 2;
    const height = totalRows * cellSize + outerPadding * 2;

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

    // Get grid dimensions for proper sizing
    const { outerPadding, cellSize, rows, cols, marginTop = 0, marginBottom = 0, marginLeft = 0, marginRight = 0 } = grid;
    const totalRows = rows + marginTop + marginBottom;
    const totalCols = cols + marginLeft + marginRight;
    const width = totalCols * cellSize + outerPadding * 2;
    const height = totalRows * cellSize + outerPadding * 2;

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

  const handleShareUrl = () => {
    // Build topology settings
    const topologySettings = topology ? {
      useTopology,
      topologyPreset,
      topologyIntensity,
      customTopology: serializeTopology(topology),
    } : undefined;

    const url = generateShareUrl(grid, puzzle, undefined, topologySettings);
    navigator.clipboard.writeText(url).then(() => {
      alert(t('share.copied') || 'URL copied to clipboard!');
    });
    setActiveMenu(null);
  };

  // Performance test: generate a grid with random elements
  const handlePerformanceTest = () => {
    const sizeInput = prompt(
      t('help.performanceTestPrompt') || 'Enter grid size (e.g., 20 for 20x20, or 30x40 for width x height):',
      '20'
    );
    if (!sizeInput) return;

    let rows: number, cols: number;
    if (sizeInput.includes('x')) {
      const parts = sizeInput.split('x').map(s => parseInt(s.trim(), 10));
      cols = parts[0] || 20;
      rows = parts[1] || 20;
    } else {
      rows = cols = parseInt(sizeInput, 10) || 20;
    }

    // Limit size for safety
    rows = Math.min(Math.max(rows, 5), 100);
    cols = Math.min(Math.max(cols, 5), 100);

    const startTime = performance.now();

    // Create new puzzle
    newPuzzle({ rows, cols, gridType: 'square', cellSize: 30 });

    // Generate random elements
    const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#808080'];
    const symbols = ['circle', 'square', 'triangle', 'diamond', 'star', 'cross'] as const;

    // Add surfaces (fill ~30% of cells)
    const surfaceCount = Math.floor(rows * cols * 0.3);
    for (let i = 0; i < surfaceCount; i++) {
      const row = Math.floor(Math.random() * rows);
      const col = Math.floor(Math.random() * cols);
      const color = colors[Math.floor(Math.random() * colors.length)];
      addSurface({ cellId: `${row},${col}`, color, layer: 'problem' });
    }

    // Add numbers (fill ~20% of cells)
    const numberCount = Math.floor(rows * cols * 0.2);
    for (let i = 0; i < numberCount; i++) {
      const row = Math.floor(Math.random() * rows);
      const col = Math.floor(Math.random() * cols);
      const value = String(Math.floor(Math.random() * 9) + 1);
      addNumber({ cellId: `${row},${col}`, value, size: 'large', position: 'center', color: '#000000', layer: 'problem' });
    }

    // Add symbols (fill ~10% of cells)
    const symbolCount = Math.floor(rows * cols * 0.1);
    for (let i = 0; i < symbolCount; i++) {
      const row = Math.floor(Math.random() * rows);
      const col = Math.floor(Math.random() * cols);
      const symbolType = symbols[Math.floor(Math.random() * symbols.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];
      addSymbol({ cellId: `${row},${col}`, symbolType, color, size: 'medium', rotation: 0, layer: 'problem' });
    }

    // Add lines (create ~15% of possible edges)
    const lineCount = Math.floor(rows * cols * 0.15);
    for (let i = 0; i < lineCount; i++) {
      const row = Math.floor(Math.random() * rows);
      const col = Math.floor(Math.random() * cols);
      const directions = [
        { dr: 0, dc: 1 },  // right
        { dr: 1, dc: 0 },  // down
      ];
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const toRow = row + dir.dr;
      const toCol = col + dir.dc;
      if (toRow < rows && toCol < cols) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        addLine({ from: `${row},${col}`, to: `${toRow},${toCol}`, color, style: 'solid', thickness: 'normal', layer: 'problem' });
      }
    }

    const endTime = performance.now();
    const totalElements = surfaceCount + numberCount + symbolCount + lineCount;

    alert(
      `${t('help.performanceTestResult') || 'Performance Test Result'}\n\n` +
      `Grid: ${cols}x${rows} (${rows * cols} cells)\n` +
      `Elements: ${totalElements}\n` +
      `  - Surfaces: ${surfaceCount}\n` +
      `  - Numbers: ${numberCount}\n` +
      `  - Symbols: ${symbolCount}\n` +
      `  - Lines: ${lineCount}\n\n` +
      `Generation time: ${(endTime - startTime).toFixed(2)}ms`
    );

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
      alert(t('error.invalidPenpaUrl') || 'Invalid Penpa/puzz.link URL');
      return;
    }

    if (result) {
      usePuzzleStore.setState({
        grid: result.grid,
        puzzle: result.state,
      });
      alert(t('file.importSuccess') || 'Puzzle imported successfully!');
    } else {
      alert(t('error.importFailed') || 'Failed to import puzzle');
    }
    setActiveMenu(null);
  };

  const handleExportPuzzlink = () => {
    const puzzleType = prompt('Enter puzzle type (e.g., sudoku, nurikabe, edit):', 'edit');
    if (!puzzleType) return;

    const url = generatePuzzlinkUrl(grid, puzzle, puzzleType);
    navigator.clipboard.writeText(url).then(() => {
      alert(t('share.copied') || 'puzz.link URL copied to clipboard!');
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
        { labelKey: 'file.exportPuzzlink', action: handleExportPuzzlink },
        { labelKey: 'file.shareUrl', action: handleShareUrl },
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
        { labelKey: 'help.shortcuts', action: () => { alert(getShortcutsHelp()); setActiveMenu(null); } },
      ],
    },
    {
      labelKey: 'menu.help',
      items: [
        { labelKey: 'Language: 日本語', action: () => { i18n.changeLanguage('ja'); setActiveMenu(null); } },
        { labelKey: 'Language: English', action: () => { i18n.changeLanguage('en'); setActiveMenu(null); } },
        { divider: true, labelKey: '' },
        { labelKey: 'help.shortcuts', action: () => { alert(getShortcutsHelp()); setActiveMenu(null); } },
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
        <span className="text-office-accent font-semibold text-sm">
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
                    className="w-full text-left px-4 py-1.5 text-sm hover:bg-office-ribbon-hover flex justify-between items-center"
                    onClick={() => item.action?.()}
                  >
                    <span>{t(item.labelKey)}</span>
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
