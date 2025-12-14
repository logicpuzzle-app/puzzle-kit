import { useEffect, useCallback } from 'react';
import { usePuzzleStore } from '../store/puzzleStore';
import { toDataLayer } from '../types';
import { getCellId, getCellIndexById } from '../utils/gridUtils';

type Shortcut = {
  keys: string[];
  ctrl?: boolean;
  shift?: boolean;
  preventDefault?: boolean;
  when?: () => boolean;
  run: () => void;
};

const isTextInputTarget = (target: EventTarget | null): boolean => {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (target.isContentEditable) return true;
  return false;
};

export function useKeyboardShortcuts() {
  const {
    undo,
    redo,
    setToolSettings,
    toolSettings,
    activeLayer,
    setActiveLayer,
    setZoom,
    setPan,
    setPanMode,
    canvas,
    cursorCell,
    setCursorCell,
    grid,
    topology,
    useTopology,
    puzzle,
    removeSymbol,
  } = usePuzzleStore();

  const moveCursorByDelta = useCallback(
    (dRow: number, dCol: number) => {
      let newCellId: string | null = null;

      if (useTopology && topology) {
        if (cursorCell) {
          const currentCell = topology.cells.get(cursorCell);
          if (currentCell) {
            const angle = Math.atan2(dRow, dCol);
            let bestNeighbor: string | null = null;
            let bestScore = -Infinity;

            for (const neighborId of currentCell.adjacentCells) {
              const neighbor = topology.cells.get(neighborId);
              if (neighbor && !neighbor.outboard) {
                const dx = neighbor.center.x - currentCell.center.x;
                const dy = neighbor.center.y - currentCell.center.y;
                const neighborAngle = Math.atan2(dy, dx);
                const angleDiff = Math.abs(neighborAngle - angle);
                const wrappedDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);
                const score = Math.cos(wrappedDiff);
                if (score > bestScore && score > 0.5) {
                  bestScore = score;
                  bestNeighbor = neighborId;
                }
              }
            }

            if (bestNeighbor) {
              newCellId = bestNeighbor;
            }
          }
        } else {
          for (const [cellId, cell] of topology.cells) {
            if (!cell.outboard) {
              newCellId = cellId;
              break;
            }
          }
        }
      } else {
        if (cursorCell) {
          const index = getCellIndexById(cursorCell, grid);
          if (index) {
            const { row, col } = index;
            const newRow = Math.max(0, Math.min(grid.rows - 1, row + dRow));
            const newCol = Math.max(0, Math.min(grid.cols - 1, col + dCol));
            newCellId = getCellId(newRow, newCol, grid.gridType);
          }
        } else {
          newCellId = getCellId(0, 0, grid.gridType);
        }
      }

      if (newCellId && newCellId !== cursorCell) {
        setCursorCell(newCellId);
      }
    },
    [cursorCell, grid.cols, grid.rows, setCursorCell, topology, useTopology]
  );

  const deleteSymbolAtCursor = useCallback(() => {
    if (!cursorCell) return;
    const dataLayer = toDataLayer(activeLayer);
    const layerData = puzzle[dataLayer];
    const symbolEntry = Object.entries(layerData.symbols).find(([, s]) => s.cellId === cursorCell);
    if (symbolEntry) {
      removeSymbol(symbolEntry[0]);
    }
  }, [activeLayer, cursorCell, puzzle, removeSymbol]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isTextInputTarget(e.target)) return;

      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const key = e.key.toLowerCase();
      const directionMode = toolSettings.symbolSubMode === 'direction';

      const shortcuts: Shortcut[] = [
        {
          keys: ['z'],
          ctrl: true,
          preventDefault: true,
          run: () => (shift ? redo() : undo()),
        },
        {
          keys: ['y'],
          ctrl: true,
          preventDefault: true,
          run: () => redo(),
        },
        {
          keys: ['=', '+'],
          ctrl: true,
          preventDefault: true,
          run: () => setZoom(canvas.zoom * 1.2),
        },
        {
          keys: ['-'],
          ctrl: true,
          preventDefault: true,
          run: () => setZoom(canvas.zoom / 1.2),
        },
        {
          keys: ['0'],
          ctrl: true,
          preventDefault: true,
          run: () => {
            setZoom(1);
            setPan(0, 0);
          },
        },
        {
          keys: ['tab'],
          preventDefault: true,
          run: () => setActiveLayer(activeLayer === 'problem' ? 'answer' : 'problem'),
        },
        {
          keys: [' '],
          preventDefault: true,
          run: () =>
            setToolSettings({
              color: toolSettings.secondaryColor,
              secondaryColor: toolSettings.color,
            }),
        },
        {
          keys: ['arrowup'],
          preventDefault: true,
          when: () => directionMode,
          run: () => moveCursorByDelta(-1, 0),
        },
        {
          keys: ['arrowdown'],
          preventDefault: true,
          when: () => directionMode,
          run: () => moveCursorByDelta(1, 0),
        },
        {
          keys: ['arrowleft'],
          preventDefault: true,
          when: () => directionMode,
          run: () => moveCursorByDelta(0, -1),
        },
        {
          keys: ['arrowright'],
          preventDefault: true,
          when: () => directionMode,
          run: () => moveCursorByDelta(0, 1),
        },
        {
          keys: ['delete', 'backspace'],
          preventDefault: true,
          when: () => Boolean(cursorCell),
          run: () => deleteSymbolAtCursor(),
        },
        {
          keys: ['escape'],
          preventDefault: true,
          run: () => {
            // Reserved for future deselect/cancel
          },
        },
        {
          keys: ['h'],
          preventDefault: true,
          run: () => setPanMode(!canvas.panMode),
        },
      ];

      for (const shortcut of shortcuts) {
        const matchesKey = shortcut.keys.includes(key);
        const matchesCtrl = shortcut.ctrl === undefined ? true : shortcut.ctrl === ctrl;
        const matchesShift = shortcut.shift === undefined ? true : shortcut.shift === shift;
        const enabled = shortcut.when ? shortcut.when() : true;

        if (matchesKey && matchesCtrl && matchesShift && enabled) {
          if (shortcut.preventDefault) e.preventDefault();
          shortcut.run();
          break;
        }
      }
    },
    [
      activeLayer,
      canvas.panMode,
      canvas.zoom,
      cursorCell,
      deleteSymbolAtCursor,
      moveCursorByDelta,
      redo,
      setActiveLayer,
      setPan,
      setPanMode,
      setToolSettings,
      setZoom,
      toolSettings.color,
      toolSettings.secondaryColor,
      toolSettings.symbolSubMode,
      undo,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
