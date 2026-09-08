/**
 * Export Utilities
 *
 * Functions for exporting puzzles to various formats:
 * - PNG image
 * - SVG image
 * - Penpa URL
 * - JSON data
 */

import type { PuzzleState, GridConfig } from '../types';
import { PUZZLE_EXPORT_VERSION } from '../constants/version';

export interface ExportOptions {
  /** Include problem layer */
  includeProblem?: boolean;
  /** Include answer layer */
  includeAnswer?: boolean;
  /** Scale factor for image export */
  scale?: number;
  /** Background color */
  backgroundColor?: string;
  /** Padding around the puzzle */
  padding?: number;
  /** Image format */
  format?: 'png' | 'svg' | 'jpeg';
  /** JPEG quality (0-1) */
  quality?: number;
  /** Explicit width for export (overrides auto-detection) */
  width?: number;
  /** Explicit height for export (overrides auto-detection) */
  height?: number;
}

const DEFAULT_OPTIONS: Required<ExportOptions> = {
  includeProblem: true,
  includeAnswer: false,
  scale: 2,
  backgroundColor: '#ffffff',
  padding: 20,
  format: 'png',
  quality: 0.92,
  width: 0,
  height: 0,
};

/**
 * Export SVG element to PNG data URL
 */
export async function exportSvgToPng(
  svgElement: SVGSVGElement,
  options: Partial<ExportOptions> = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Get SVG dimensions - prefer explicit dimensions, then viewBox, then getBBox
  let contentWidth: number;
  let contentHeight: number;

  if (opts.width > 0 && opts.height > 0) {
    // Use explicit dimensions
    contentWidth = opts.width;
    contentHeight = opts.height;
  } else {
    // Try to get from viewBox attribute
    const viewBoxAttr = svgElement.getAttribute('viewBox');
    if (viewBoxAttr) {
      const parts = viewBoxAttr.split(' ').map(Number);
      contentWidth = parts[2];
      contentHeight = parts[3];
    } else {
      // Fallback to getBBox (less reliable for transformed content)
      const bbox = svgElement.getBBox();
      contentWidth = bbox.width;
      contentHeight = bbox.height;
    }
  }

  // Output canvas size (with padding and scale)
  const canvasWidth = (contentWidth + opts.padding * 2) * opts.scale;
  const canvasHeight = (contentHeight + opts.padding * 2) * opts.scale;

  // Clone SVG and prepare for export
  const clonedSvg = svgElement.cloneNode(true) as SVGElement;
  clonedSvg.querySelectorAll('[data-preview]').forEach(element => element.remove());
  clonedSvg.setAttribute('width', String(canvasWidth));
  clonedSvg.setAttribute('height', String(canvasHeight));

  // viewBox: start at (-padding, -padding) to add padding around content at (0,0)
  // Content spans from (0, 0) to (contentWidth, contentHeight)
  clonedSvg.setAttribute(
    'viewBox',
    `${-opts.padding} ${-opts.padding} ${contentWidth + opts.padding * 2} ${contentHeight + opts.padding * 2}`
  );

  // Find the root transform group (pan/zoom) and reset it
  const rootGroup = clonedSvg.querySelector('g[transform]');
  if (rootGroup) {
    // Remove the pan/zoom transform but keep the group structure
    rootGroup.removeAttribute('transform');

    // Remove the large background rect used for panning (x=-1000)
    const bgRects = rootGroup.querySelectorAll('rect');
    bgRects.forEach((rect) => {
      const x = parseFloat(rect.getAttribute('x') || '0');
      if (x < 0) {
        rect.remove();
      }
    });
  }

  // Add export background rect (covers the viewBox area including padding)
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('x', String(-opts.padding));
  bgRect.setAttribute('y', String(-opts.padding));
  bgRect.setAttribute('width', String(contentWidth + opts.padding * 2));
  bgRect.setAttribute('height', String(contentHeight + opts.padding * 2));
  bgRect.setAttribute('fill', opts.backgroundColor);
  // Insert after defs if present, otherwise at the beginning
  const defs = clonedSvg.querySelector('defs');
  if (defs && defs.nextSibling) {
    clonedSvg.insertBefore(bgRect, defs.nextSibling);
  } else {
    clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);
  }

  // Debug log
  console.log('[Export PNG] contentWidth:', contentWidth, 'contentHeight:', contentHeight, 'padding:', opts.padding);

  // Convert to data URL
  const svgData = new XMLSerializer().serializeToString(clonedSvg);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.fillStyle = opts.backgroundColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.drawImage(img, 0, 0);

      URL.revokeObjectURL(svgUrl);

      const format = opts.format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const dataUrl = canvas.toDataURL(format, opts.quality);
      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error('Failed to load SVG'));
    };

    img.src = svgUrl;
  });
}

/**
 * Export SVG element to SVG data URL
 */
export function exportSvgToSvg(
  svgElement: SVGSVGElement,
  options: Partial<ExportOptions> = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Get SVG dimensions - prefer explicit dimensions, then viewBox, then getBBox
  let contentWidth: number;
  let contentHeight: number;

  if (opts.width > 0 && opts.height > 0) {
    // Use explicit dimensions
    contentWidth = opts.width;
    contentHeight = opts.height;
  } else {
    // Try to get from viewBox attribute
    const viewBoxAttr = svgElement.getAttribute('viewBox');
    if (viewBoxAttr) {
      const parts = viewBoxAttr.split(' ').map(Number);
      contentWidth = parts[2];
      contentHeight = parts[3];
    } else {
      // Fallback to getBBox (less reliable for transformed content)
      const bbox = svgElement.getBBox();
      contentWidth = bbox.width;
      contentHeight = bbox.height;
    }
  }

  const clonedSvg = svgElement.cloneNode(true) as SVGElement;
  clonedSvg.querySelectorAll('[data-preview]').forEach(element => element.remove());

  // Set viewBox and dimensions
  clonedSvg.setAttribute(
    'viewBox',
    `${-opts.padding} ${-opts.padding} ${contentWidth + opts.padding * 2} ${contentHeight + opts.padding * 2}`
  );
  clonedSvg.setAttribute('width', String(contentWidth + opts.padding * 2));
  clonedSvg.setAttribute('height', String(contentHeight + opts.padding * 2));

  // Find the root transform group (pan/zoom) and reset it
  const rootGroup = clonedSvg.querySelector('g[transform]');
  if (rootGroup) {
    // Remove the pan/zoom transform but keep the group structure
    rootGroup.removeAttribute('transform');

    // Remove the large background rect used for panning (x=-1000)
    const bgRects = rootGroup.querySelectorAll('rect');
    bgRects.forEach((rect) => {
      const x = parseFloat(rect.getAttribute('x') || '0');
      if (x < 0) {
        rect.remove();
      }
    });
  }

  // Add export background rect
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('x', String(-opts.padding));
  bgRect.setAttribute('y', String(-opts.padding));
  bgRect.setAttribute('width', String(contentWidth + opts.padding * 2));
  bgRect.setAttribute('height', String(contentHeight + opts.padding * 2));
  bgRect.setAttribute('fill', opts.backgroundColor);
  // Insert after defs if present, otherwise at the beginning
  const defs = clonedSvg.querySelector('defs');
  if (defs && defs.nextSibling) {
    clonedSvg.insertBefore(bgRect, defs.nextSibling);
  } else {
    clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);
  }

  // Debug log
  console.log('[Export SVG] contentWidth:', contentWidth, 'contentHeight:', contentHeight, 'padding:', opts.padding);

  const svgData = new XMLSerializer().serializeToString(clonedSvg);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;
}

/**
 * Download a data URL as a file
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export puzzle to JSON
 */
export function exportToJson(
  state: PuzzleState,
  grid: GridConfig,
  metadata?: Record<string, unknown>
): string {
  const exportData = {
    version: PUZZLE_EXPORT_VERSION,
    format: 'puzzle-kit',
    grid,
    state,
    metadata: {
      exportedAt: new Date().toISOString(),
      ...metadata,
    },
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand('copy');
      return true;
    } catch (e) {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

/**
 * Copy image to clipboard (where supported)
 */
export async function copyImageToClipboard(dataUrl: string): Promise<boolean> {
  try {
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Use clipboard API
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob,
      }),
    ]);

    return true;
  } catch (err) {
    console.warn('Failed to copy image to clipboard:', err);
    return false;
  }
}

/**
 * Generate share URL (Penpa format)
 */
export function generateShareUrl(
  state: PuzzleState,
  grid: GridConfig,
  baseUrl: string = 'https://swaroopg92.github.io/penpa-edit/'
): string {
  // This would need to encode the puzzle in Penpa's URL format
  // For now, return a placeholder
  const data = {
    rows: grid.rows,
    cols: grid.cols,
    state,
  };

  // Simple base64 encoding (would need proper Penpa encoding)
  const encoded = btoa(JSON.stringify(data));
  return `${baseUrl}#m=edit&p=${encoded}`;
}

/**
 * Print puzzle
 */
export function printPuzzle(svgElement: SVGSVGElement): void {
  const svgUrl = exportSvgToSvg(svgElement);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Could not open print window');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Puzzle</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          img {
            max-width: 100%;
            max-height: 100vh;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <img src="${svgUrl}" onload="window.print(); window.close();" />
      </body>
    </html>
  `);

  printWindow.document.close();
}

export default {
  exportSvgToPng,
  exportSvgToSvg,
  downloadDataUrl,
  exportToJson,
  copyToClipboard,
  copyImageToClipboard,
  generateShareUrl,
  printPuzzle,
};
