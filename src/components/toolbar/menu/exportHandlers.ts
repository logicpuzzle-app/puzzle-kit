/**
 * Export handlers for MenuBar
 * Handles JSON, SVG, and PNG exports
 */
import type { StoreApi, UseBoundStore } from 'zustand';
import {
  downloadAsJson,
  exportToPng,
  downloadAsPng,
} from '../../../utils/serialization';
import { optimizePuzzleStateForExport } from '../../../utils/puzzleExport';
import { getDefaultStorageAdapter } from '../../../modules/storage';
import type { GridConfig, PuzzleState } from '../../../types';
import type { GridTopology } from '../../../utils/topology/types';
import type { ModalStore } from '../../../store/modalStore';

type ModalStoreHook = UseBoundStore<StoreApi<ModalStore>>;

/**
 * Convert nested SVG elements to group elements for proper export
 */
export const flattenNestedSvgs = (container: Element) => {
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

/**
 * Get export dimensions from grid/topology configuration
 */
export const getExportDimensions = (
  grid: GridConfig,
  topology: GridTopology | null,
  useTopology: boolean
): { width: number; height: number } => {
  if (useTopology && topology) {
    const exportPaddingLeft = grid.exportPaddingLeft ?? 0;
    const exportPaddingRight = grid.exportPaddingRight ?? 0;
    const exportPaddingTop = grid.exportPaddingTop ?? 0;
    const exportPaddingBottom = grid.exportPaddingBottom ?? 0;
    return {
      width: topology.bounds.width + exportPaddingLeft + exportPaddingRight,
      height: topology.bounds.height + exportPaddingTop + exportPaddingBottom,
    };
  }

  const { outerPadding, cellSize, rows, cols, marginTop = 0, marginBottom = 0, marginLeft = 0, marginRight = 0 } = grid;
  const totalRows = rows + marginTop + marginBottom;
  const totalCols = cols + marginLeft + marginRight;
  return {
    width: totalCols * cellSize + outerPadding * 2,
    height: totalRows * cellSize + outerPadding * 2,
  };
};

/**
 * Prepare SVG clone for export (remove UI elements, flatten nested SVGs)
 */
export const prepareSvgForExport = (
  svg: SVGSVGElement,
  width: number,
  height: number
): SVGSVGElement => {
  const clone = svg.cloneNode(true) as SVGSVGElement;

  // Set proper dimensions and viewBox
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.setAttribute('viewBox', `0 0 ${width} ${height}`);

  // Reset pan/zoom transforms (only top-level transforms)
  const topLevelGroups = clone.querySelectorAll(':scope > g[transform]');
  topLevelGroups.forEach(g => {
    g.removeAttribute('transform');
  });

  // Flatten nested SVGs (icons)
  flattenNestedSvgs(clone);

  // Remove UI-only elements (cursors, previews, etc.)
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

  return clone;
};

interface ExportHandlersOptions {
  modalStore: ModalStoreHook;
  grid: GridConfig;
  puzzle: PuzzleState;
  topology: GridTopology | null;
  useTopology: boolean;
  topologyPreset: string;
  topologyIntensity: number;
  setActiveMenu: (menu: string | null) => void;
  t: (key: string) => string;
}

/**
 * Create export handlers for the MenuBar
 */
export const createExportHandlers = (options: ExportHandlersOptions) => {
  const {
    modalStore,
    grid,
    puzzle,
    topology,
    useTopology,
    topologyPreset,
    topologyIntensity,
    setActiveMenu,
    t,
  } = options;

  const { showAlert } = modalStore.getState();

  const handleExportJson = () => {
    const topologySettings = {
      useTopology,
      topologyPreset,
      topologyIntensity,
    };
    downloadAsJson(grid, puzzle, { title: 'Puzzle' }, topologySettings);
    setActiveMenu(null);
  };

  const handleExportSvg = () => {
    const svg = document.getElementById('puzzle-canvas') as SVGSVGElement | null;
    if (!svg) return;

    const { width, height } = getExportDimensions(grid, topology, useTopology);
    const clone = prepareSvgForExport(svg, width, height);

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

    const { width, height } = getExportDimensions(grid, topology, useTopology);
    const clone = prepareSvgForExport(svg, width, height);

    const blob = await exportToPng(clone, 1);
    if (blob) {
      downloadAsPng(blob, 'puzzle.png');
    }
    setActiveMenu(null);
  };

  const handleExportPngHQ = async (scale: number) => {
    const svg = document.getElementById('puzzle-canvas') as SVGSVGElement | null;
    if (!svg) return;

    const { width, height } = getExportDimensions(grid, topology, useTopology);
    const clone = prepareSvgForExport(svg, width, height);

    const blob = await exportToPng(clone, scale);
    if (blob) {
      downloadAsPng(blob, `puzzle_${scale}x.png`);
    }
    setActiveMenu(null);
  };

  const handleShareUrl = async (
    setShareUrl: (url: string) => void,
    setShareUrlDialogOpen: (open: boolean) => void
  ) => {
    const adapter = getDefaultStorageAdapter();

    if (!adapter || !adapter.isAvailable()) {
      showAlert({
        title: t('error.storageNotAvailable'),
        message: t('error.storageNotAvailable'),
        variant: 'error',
      });
      setActiveMenu(null);
      return;
    }

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

  return {
    handleExportJson,
    handleExportSvg,
    handleExportPng,
    handleExportPngHQ,
    handleShareUrl,
  };
};
