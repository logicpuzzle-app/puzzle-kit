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
}

const DEFAULT_OPTIONS: Required<ExportOptions> = {
  includeProblem: true,
  includeAnswer: false,
  scale: 2,
  backgroundColor: '#ffffff',
  padding: 20,
  format: 'png',
  quality: 0.92,
};

/**
 * Export SVG element to PNG data URL
 */
export async function exportSvgToPng(
  svgElement: SVGSVGElement,
  options: Partial<ExportOptions> = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Get SVG dimensions
  const bbox = svgElement.getBBox();
  const viewBox = svgElement.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, bbox.width, bbox.height];
  const width = (viewBox[2] + opts.padding * 2) * opts.scale;
  const height = (viewBox[3] + opts.padding * 2) * opts.scale;

  // Clone SVG and add background
  const clonedSvg = svgElement.cloneNode(true) as SVGElement;
  clonedSvg.setAttribute('width', String(width));
  clonedSvg.setAttribute('height', String(height));
  clonedSvg.setAttribute(
    'viewBox',
    `${viewBox[0] - opts.padding} ${viewBox[1] - opts.padding} ${viewBox[2] + opts.padding * 2} ${viewBox[3] + opts.padding * 2}`
  );

  // Add background rect
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('x', String(viewBox[0] - opts.padding));
  bgRect.setAttribute('y', String(viewBox[1] - opts.padding));
  bgRect.setAttribute('width', String(viewBox[2] + opts.padding * 2));
  bgRect.setAttribute('height', String(viewBox[3] + opts.padding * 2));
  bgRect.setAttribute('fill', opts.backgroundColor);
  clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);

  // Convert to data URL
  const svgData = new XMLSerializer().serializeToString(clonedSvg);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.fillStyle = opts.backgroundColor;
      ctx.fillRect(0, 0, width, height);
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

  const bbox = svgElement.getBBox();
  const viewBox = svgElement.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, bbox.width, bbox.height];

  const clonedSvg = svgElement.cloneNode(true) as SVGElement;

  // Add background rect
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('x', String(viewBox[0] - opts.padding));
  bgRect.setAttribute('y', String(viewBox[1] - opts.padding));
  bgRect.setAttribute('width', String(viewBox[2] + opts.padding * 2));
  bgRect.setAttribute('height', String(viewBox[3] + opts.padding * 2));
  bgRect.setAttribute('fill', opts.backgroundColor);
  clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);

  clonedSvg.setAttribute(
    'viewBox',
    `${viewBox[0] - opts.padding} ${viewBox[1] - opts.padding} ${viewBox[2] + opts.padding * 2} ${viewBox[3] + opts.padding * 2}`
  );

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
    version: '1.0.0',
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
