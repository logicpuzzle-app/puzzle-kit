/**
 * Import/Export Dialog Component
 *
 * Provides UI for importing and exporting puzzles in various formats:
 * - Penpa URL
 * - puzz.link URL
 * - JSON file
 * - Image (PNG/SVG)
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  parsePenpaUrl,
  generatePenpaUrl,
  isPenpaUrl,
  type PenpaExportData,
} from '../../utils/penpaSerializer';
import { parsePuzzlinkUrl, type PuzzlinkData } from '../../utils/penpaCompat';
import {
  exportToJson,
  exportSvgToPng,
  exportSvgToSvg,
  downloadDataUrl,
  copyToClipboard,
  copyImageToClipboard,
} from '../../utils/export';
import type { PuzzleState, GridConfig } from '../../types';

export type DialogMode = 'import' | 'export';
export type ImportFormat = 'penpa' | 'puzzlink' | 'json' | 'auto';
export type ExportFormat = 'penpa' | 'png' | 'svg' | 'json';

interface ImportExportDialogProps {
  isOpen: boolean;
  mode: DialogMode;
  puzzleState: PuzzleState;
  gridConfig: GridConfig;
  svgRef?: React.RefObject<SVGSVGElement>;
  onClose: () => void;
  onImport?: (data: PenpaExportData | PuzzlinkData) => void;
  onExport?: (format: ExportFormat, data: string) => void;
}

export const ImportExportDialog: React.FC<ImportExportDialogProps> = ({
  isOpen,
  mode,
  puzzleState,
  gridConfig,
  svgRef,
  onClose,
  onImport,
  onExport,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('penpa');
  const [exportUrl, setExportUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear messages on mode change
  React.useEffect(() => {
    setError(null);
    setSuccess(null);
    setInputValue('');
    setExportUrl('');
  }, [mode, isOpen]);

  // Handle import
  const handleImport = useCallback(async () => {
    setError(null);
    setSuccess(null);
    setIsProcessing(true);

    try {
      const input = inputValue.trim();

      if (!input) {
        setError('Please enter a URL or paste puzzle data');
        return;
      }

      // Try to detect format
      if (input.startsWith('{')) {
        // JSON format
        const data = JSON.parse(input);
        if (data.format === 'puzzle-kit') {
          onImport?.(data);
          setSuccess('Puzzle imported successfully!');
        } else {
          setError('Invalid JSON format');
        }
      } else if (input.includes('puzz.link') || input.includes('pzv.jp')) {
        // puzz.link URL
        const data = parsePuzzlinkUrl(input);
        if (data) {
          onImport?.(data);
          setSuccess('Puzzle imported from puzz.link!');
        } else {
          setError('Failed to parse puzz.link URL');
        }
      } else if (isPenpaUrl(input) || input.includes('penpa')) {
        // Penpa URL
        const data = parsePenpaUrl(input);
        if (data) {
          onImport?.(data);
          setSuccess('Puzzle imported from Penpa!');
        } else {
          setError('Failed to parse Penpa URL');
        }
      } else {
        // Try as raw Penpa data
        try {
          const { deserializePenpa } = await import('../../utils/penpaSerializer');
          const data = deserializePenpa(input);
          onImport?.(data);
          setSuccess('Puzzle imported successfully!');
        } catch {
          setError('Could not recognize puzzle format. Please check the URL or data.');
        }
      }
    } catch (err) {
      setError(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  }, [inputValue, onImport]);

  // Handle file import
  const handleFileImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInputValue(content);
    };
    reader.readAsText(file);
  }, []);

  // Handle export
  const handleExport = useCallback(async () => {
    setError(null);
    setSuccess(null);
    setIsProcessing(true);

    try {
      switch (exportFormat) {
        case 'penpa': {
          const penpaData: PenpaExportData = {
            gridtype: gridConfig.gridType === 'square' ? 'square' : gridConfig.gridType as any,
            nx: gridConfig.cols,
            ny: gridConfig.rows,
            space: [
              gridConfig.marginTop,
              gridConfig.marginRight,
              gridConfig.marginBottom,
              gridConfig.marginLeft,
            ],
            // Convert puzzle state to Penpa format
            pu_q: convertStateToPenpa(puzzleState.problem),
            pu_a: convertStateToPenpa(puzzleState.answer),
          };

          const url = generatePenpaUrl('https://swaroopg92.github.io/penpa-edit/', penpaData);
          setExportUrl(url);
          onExport?.('penpa', url);
          setSuccess('Penpa URL generated!');
          break;
        }

        case 'png': {
          if (!svgRef?.current) {
            setError('SVG element not available');
            return;
          }
          const dataUrl = await exportSvgToPng(svgRef.current, { scale: 2 });
          downloadDataUrl(dataUrl, 'puzzle.png');
          onExport?.('png', dataUrl);
          setSuccess('PNG downloaded!');
          break;
        }

        case 'svg': {
          if (!svgRef?.current) {
            setError('SVG element not available');
            return;
          }
          const svgUrl = exportSvgToSvg(svgRef.current);
          downloadDataUrl(svgUrl, 'puzzle.svg');
          onExport?.('svg', svgUrl);
          setSuccess('SVG downloaded!');
          break;
        }

        case 'json': {
          const json = exportToJson(puzzleState, gridConfig);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          downloadDataUrl(url, 'puzzle.json');
          URL.revokeObjectURL(url);
          onExport?.('json', json);
          setSuccess('JSON downloaded!');
          break;
        }
      }
    } catch (err) {
      setError(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  }, [exportFormat, gridConfig, puzzleState, svgRef, onExport]);

  // Copy URL to clipboard
  const handleCopyUrl = useCallback(async () => {
    if (exportUrl) {
      const success = await copyToClipboard(exportUrl);
      if (success) {
        setSuccess('URL copied to clipboard!');
      } else {
        setError('Failed to copy to clipboard');
      }
    }
  }, [exportUrl]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            {mode === 'import' ? 'Import Puzzle' : 'Export Puzzle'}
          </h2>
          <button style={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div style={styles.content}>
          {mode === 'import' ? (
            <>
              <div style={styles.section}>
                <label style={styles.label}>Paste URL or puzzle data:</label>
                <textarea
                  style={styles.textarea}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Paste Penpa URL, puzz.link URL, or JSON data..."
                  rows={5}
                />
              </div>

              <div style={styles.section}>
                <label style={styles.label}>Or import from file:</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.txt"
                  onChange={handleFileImport}
                  style={styles.fileInput}
                />
              </div>

              <div style={styles.hint}>
                Supported formats: Penpa URL, puzz.link URL, PuzzleKit JSON
              </div>
            </>
          ) : (
            <>
              <div style={styles.section}>
                <label style={styles.label}>Export format:</label>
                <div style={styles.formatButtons}>
                  {(['penpa', 'png', 'svg', 'json'] as ExportFormat[]).map((format) => (
                    <button
                      key={format}
                      style={{
                        ...styles.formatButton,
                        ...(exportFormat === format ? styles.formatButtonActive : {}),
                      }}
                      onClick={() => setExportFormat(format)}
                    >
                      {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {exportUrl && exportFormat === 'penpa' && (
                <div style={styles.section}>
                  <label style={styles.label}>Generated URL:</label>
                  <div style={styles.urlContainer}>
                    <input
                      type="text"
                      style={styles.urlInput}
                      value={exportUrl}
                      readOnly
                    />
                    <button style={styles.copyButton} onClick={handleCopyUrl}>
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {error && <div style={styles.error}>{error}</div>}
          {success && <div style={styles.success}>{success}</div>}
        </div>

        <div style={styles.footer}>
          <button style={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button
            style={styles.actionButton}
            onClick={mode === 'import' ? handleImport : handleExport}
            disabled={isProcessing}
          >
            {isProcessing
              ? 'Processing...'
              : mode === 'import'
              ? 'Import'
              : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Convert PuzzleKit state to Penpa puzzle data format
 */
function convertStateToPenpa(elements: PuzzleState['problem']): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Convert surfaces
  if (Object.keys(elements.surfaces).length > 0) {
    const surface: Record<string, number> = {};
    for (const [id, el] of Object.entries(elements.surfaces)) {
      // Convert cell ID to Penpa index (simplified)
      surface[el.cellId] = parseInt(el.color.replace('#', ''), 16) || 1;
    }
    result.surface = surface;
  }

  // Convert lines
  if (Object.keys(elements.lines).length > 0) {
    const line: Record<string, number> = {};
    for (const [id, el] of Object.entries(elements.lines)) {
      const key = `${el.from},${el.to}`;
      line[key] = 1; // Style
    }
    result.line = line;
  }

  // Convert edges
  if (Object.keys(elements.edges).length > 0) {
    const lineE: Record<string, number> = {};
    for (const [id, el] of Object.entries(elements.edges)) {
      const key = `${el.from},${el.to}`;
      lineE[key] = 1;
    }
    result.lineE = lineE;
  }

  // Convert numbers
  if (Object.keys(elements.numbers).length > 0) {
    const number: Record<string, unknown> = {};
    for (const [id, el] of Object.entries(elements.numbers)) {
      number[el.cellId] = [el.value, 1, '1']; // [value, style, color]
    }
    result.number = number;
  }

  // Convert symbols
  if (Object.keys(elements.symbols).length > 0) {
    const symbol: Record<string, unknown> = {};
    for (const [id, el] of Object.entries(elements.symbols)) {
      symbol[el.cellId] = [el.symbolType, 1]; // [type, style]
    }
    result.symbol = symbol;
  }

  return result;
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
    width: '500px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #eee',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
    padding: '0 4px',
  },
  content: {
    padding: '20px',
    overflowY: 'auto',
    flex: 1,
  },
  section: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 500,
    fontSize: '14px',
  },
  textarea: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '13px',
    fontFamily: 'monospace',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  fileInput: {
    width: '100%',
  },
  hint: {
    fontSize: '12px',
    color: '#888',
    marginTop: '8px',
  },
  formatButtons: {
    display: 'flex',
    gap: '8px',
  },
  formatButton: {
    padding: '10px 20px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.15s ease',
  },
  formatButtonActive: {
    backgroundColor: '#4a90d9',
    borderColor: '#4a90d9',
    color: '#fff',
  },
  urlContainer: {
    display: 'flex',
    gap: '8px',
  },
  urlInput: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
  },
  copyButton: {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#4a90d9',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 500,
  },
  error: {
    padding: '10px',
    backgroundColor: '#fee',
    border: '1px solid #fcc',
    borderRadius: '4px',
    color: '#c00',
    fontSize: '14px',
    marginTop: '12px',
  },
  success: {
    padding: '10px',
    backgroundColor: '#efe',
    border: '1px solid #cfc',
    borderRadius: '4px',
    color: '#060',
    fontSize: '14px',
    marginTop: '12px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 20px',
    borderTop: '1px solid #eee',
  },
  cancelButton: {
    padding: '10px 20px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
  },
  actionButton: {
    padding: '10px 24px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#4a90d9',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
  },
};

export default ImportExportDialog;
