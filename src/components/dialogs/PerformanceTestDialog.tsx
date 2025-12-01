import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  generateSurfaceId,
  generateNumberId,
  generateSymbolId,
  generateLineId,
  resetIdCounters,
} from '../../utils/idGenerator';
import { usePuzzleStore } from '../../store/puzzleStore';
import { gridConfigToTopology, applyTopologyPreset } from '../../utils/gridTopology';
import { getCellId } from '../../utils/gridUtils';
import type { GridConfig, PuzzleState, SurfaceElement, NumberElement, SymbolElement, LineElement } from '../../types';

interface PerformanceTestDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TestResult {
  rows: number;
  cols: number;
  totalCells: number;
  totalElements: number;
  surfaceCount: number;
  numberCount: number;
  symbolCount: number;
  lineCount: number;
  generationTime: number;
}

export const PerformanceTestDialog: React.FC<PerformanceTestDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const { useTopology, topologyPreset, topologyIntensity } = usePuzzleStore();

  const [rows, setRows] = useState(20);
  const [cols, setCols] = useState(20);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && !isRunning) {
      handleRunTest();
    }
  };

  const handleRunTest = () => {
    setIsRunning(true);
    setResult(null);

    // Defer execution to allow UI to update
    requestAnimationFrame(() => {
      const startTime = performance.now();

      // Colors and symbols for random generation
      const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#808080'];
      const symbols = ['circle', 'square', 'triangle', 'diamond', 'star', 'cross'] as const;

      // Build grid config
      const baseGrid: GridConfig = {
        rows,
        cols,
        cellSize: 30,
        outerPadding: 20,
        showGrid: true,
        gridStyle: 'normal',
        gridType: 'square',
        marginTop: 0,
        marginBottom: 0,
        marginLeft: 0,
        marginRight: 0,
        frameStyle: 'normal',
        frameColor: '#000000',
        gridColor: '#000000',
        backgroundColor: '#ffffff',
      };

      // Build topology
      const baseTopology = gridConfigToTopology(baseGrid);
      const topology = useTopology
        ? applyTopologyPreset(baseTopology, {
            preset: topologyPreset,
            intensity: topologyIntensity,
          })
        : baseTopology;

      // Reset ID counters before generating new elements
      resetIdCounters();

      // Build puzzle state with all elements pre-generated
      const surfaces: Record<string, SurfaceElement> = {};
      const numbers: Record<string, NumberElement> = {};
      const symbolElements: Record<string, SymbolElement> = {};
      const lines: Record<string, LineElement> = {};

      // Add surfaces (fill ~30% of cells)
      const surfaceCount = Math.floor(rows * cols * 0.3);
      for (let i = 0; i < surfaceCount; i++) {
        const row = Math.floor(Math.random() * rows);
        const col = Math.floor(Math.random() * cols);
        const color = colors[Math.floor(Math.random() * colors.length)];
        const id = generateSurfaceId();
        const cellId = getCellId(row, col);
        surfaces[id] = {
          id,
          cellId,
          color,
          layer: 'problem',
        };
      }

      // Add numbers (fill ~20% of cells)
      const numberCount = Math.floor(rows * cols * 0.2);
      for (let i = 0; i < numberCount; i++) {
        const row = Math.floor(Math.random() * rows);
        const col = Math.floor(Math.random() * cols);
        const value = String(Math.floor(Math.random() * 9) + 1);
        const id = generateNumberId();
        const cellId = getCellId(row, col);
        numbers[id] = {
          id,
          cellId,
          value,
          size: 'large',
          position: 'center',
          color: '#000000',
          layer: 'problem',
        };
      }

      // Add symbols (fill ~10% of cells)
      const symbolCount = Math.floor(rows * cols * 0.1);
      for (let i = 0; i < symbolCount; i++) {
        const row = Math.floor(Math.random() * rows);
        const col = Math.floor(Math.random() * cols);
        const symbolType = symbols[Math.floor(Math.random() * symbols.length)];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const id = generateSymbolId();
        const cellId = getCellId(row, col);
        symbolElements[id] = {
          id,
          cellId,
          symbolType,
          color,
          size: 'medium',
          rotation: 0,
          layer: 'problem',
        };
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
          const id = generateLineId();
          const fromCellId = getCellId(row, col);
          const toCellId = getCellId(toRow, toCol);
          lines[id] = {
            id,
            from: fromCellId,
            to: toCellId,
            color,
            style: 'solid',
            thickness: 'normal',
            layer: 'problem',
          };
        }
      }

      // Build the complete puzzle state
      const puzzleState: PuzzleState = {
        problem: {
          surfaces,
          lines,
          edges: {},
          walls: {},
          numbers,
          symbols: symbolElements,
          cages: {},
          specials: {},
          boxLines: {},
          directionalClues: {},
        },
        answer: {
          surfaces: {},
          lines: {},
          edges: {},
          walls: {},
          numbers: {},
          symbols: {},
          cages: {},
          specials: {},
          boxLines: {},
          directionalClues: {},
        },
        multicolorSurfaces: {},
      };

      // Set the entire state at once
      usePuzzleStore.setState({
        grid: baseGrid,
        puzzle: puzzleState,
        topology,
        canvas: {
          zoom: 1,
          panX: 0,
          panY: 0,
          isDragging: false,
          isDrawing: false,
          selection: [],
          panMode: false,
        },
        selectedElements: [],
        hoverCell: null,
      });

      const endTime = performance.now();
      const totalElements = surfaceCount + numberCount + symbolCount + lineCount;

      setResult({
        rows,
        cols,
        totalCells: rows * cols,
        totalElements,
        surfaceCount,
        numberCount,
        symbolCount,
        lineCount: Object.keys(lines).length,
        generationTime: endTime - startTime,
      });
      setIsRunning(false);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div
        className="bg-white border border-office-border shadow-lg rounded-sm p-4 min-w-[360px]"
        onKeyDown={handleKeyDown}
      >
        <h2 className="text-lg font-semibold mb-4 border-b border-office-border pb-2">
          {t('help.performanceTest')}
        </h2>

        {/* Grid Size Input */}
        <div className="mb-4">
          <label className="block text-xs text-office-text-secondary mb-2">
            {t('grid.size')}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-office-text-secondary mb-1">
                {t('grid.rows')}
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  className="input-office flex-1 w-16"
                  value={rows}
                  onChange={(e) => {
                    const num = parseInt(e.target.value, 10);
                    if (!isNaN(num) && num >= 5 && num <= 200) setRows(num);
                  }}
                  min={5}
                  max={200}
                  disabled={isRunning}
                />
                <button
                  type="button"
                  className="btn-office px-2 text-xs"
                  onClick={() => setRows(Math.max(5, rows - 10))}
                  disabled={isRunning || rows <= 5}
                >
                  -10
                </button>
                <button
                  type="button"
                  className="btn-office px-2 text-xs"
                  onClick={() => setRows(Math.min(200, rows + 10))}
                  disabled={isRunning || rows >= 200}
                >
                  +10
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-office-text-secondary mb-1">
                {t('grid.cols')}
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  className="input-office flex-1 w-16"
                  value={cols}
                  onChange={(e) => {
                    const num = parseInt(e.target.value, 10);
                    if (!isNaN(num) && num >= 5 && num <= 200) setCols(num);
                  }}
                  min={5}
                  max={200}
                  disabled={isRunning}
                />
                <button
                  type="button"
                  className="btn-office px-2 text-xs"
                  onClick={() => setCols(Math.max(5, cols - 10))}
                  disabled={isRunning || cols <= 5}
                >
                  -10
                </button>
                <button
                  type="button"
                  className="btn-office px-2 text-xs"
                  onClick={() => setCols(Math.min(200, cols + 10))}
                  disabled={isRunning || cols >= 200}
                >
                  +10
                </button>
              </div>
            </div>
          </div>
          {/* Quick size presets */}
          <div className="flex gap-1 mt-2">
            {[10, 20, 50, 100, 200].map((size) => (
              <button
                key={size}
                type="button"
                className={`btn-office px-2 py-1 text-xs flex-1 ${rows === size && cols === size ? 'bg-office-accent text-white' : ''}`}
                onClick={() => { setRows(size); setCols(size); }}
                disabled={isRunning}
              >
                {size}x{size}
              </button>
            ))}
          </div>
        </div>

        {/* Element counts info */}
        <div className="mb-4 text-xs text-office-text-secondary bg-gray-50 p-2 rounded">
          <p>{t('help.performanceTestInfo') || 'This will generate:'}</p>
          <ul className="mt-1 ml-4 list-disc">
            <li>~{Math.floor(rows * cols * 0.3)} {t('tool.surface') || 'surfaces'} (30%)</li>
            <li>~{Math.floor(rows * cols * 0.2)} {t('tool.number') || 'numbers'} (20%)</li>
            <li>~{Math.floor(rows * cols * 0.1)} {t('tool.symbol') || 'symbols'} (10%)</li>
            <li>~{Math.floor(rows * cols * 0.15)} {t('tool.line') || 'lines'} (15%)</li>
          </ul>
        </div>

        {/* Results */}
        {result && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm">
            <h3 className="font-semibold text-green-800 mb-2">
              {t('help.performanceTestResult')}
            </h3>
            <div className="text-green-700 space-y-1">
              <p>
                <span className="font-medium">{t('grid.size')}:</span> {result.cols}x{result.rows} ({result.totalCells} {t('grid.cells') || 'cells'})
              </p>
              <p>
                <span className="font-medium">{t('help.totalElements') || 'Total elements'}:</span> {result.totalElements}
              </p>
              <ul className="ml-4 text-xs">
                <li>• {t('tool.surface') || 'Surfaces'}: {result.surfaceCount}</li>
                <li>• {t('tool.number') || 'Numbers'}: {result.numberCount}</li>
                <li>• {t('tool.symbol') || 'Symbols'}: {result.symbolCount}</li>
                <li>• {t('tool.line') || 'Lines'}: {result.lineCount}</li>
              </ul>
              <p className="mt-2 font-medium">
                {t('help.generationTime') || 'Generation time'}: {result.generationTime.toFixed(2)}ms
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 justify-end border-t border-office-border pt-3">
          <button type="button" className="btn-office" onClick={onClose} disabled={isRunning}>
            {t('action.close') || t('action.cancel')}
          </button>
          <button
            type="button"
            className="btn-office-primary"
            onClick={handleRunTest}
            disabled={isRunning}
          >
            {isRunning ? (t('help.running') || 'Running...') : (t('help.runTest') || 'Run Test')}
          </button>
        </div>
      </div>
    </div>
  );
};
