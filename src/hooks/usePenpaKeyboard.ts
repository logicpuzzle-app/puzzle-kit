/**
 * Penpa-compatible Keyboard Shortcuts
 *
 * Implements keyboard shortcuts matching Penpa-edit behavior
 */

import { useEffect, useCallback, useRef, useMemo } from 'react';
import { usePuzzleStore } from '../store/puzzleStoreContext';
import type { PenpaEditMode, PenpaLayerMode } from '../types/penpaModes';
import {
  shouldIgnoreKeyEvent,
  type KeyboardShortcut,
  executeMatchingShortcut,
} from './keyboardUtils';

// Mode shortcuts (matches Penpa-edit)
const MODE_SHORTCUTS: Record<string, PenpaEditMode> = {
  s: 'surface',
  l: 'line',
  e: 'lineE',
  w: 'wall',
  n: 'number',
  y: 'symbol',
  p: 'special',
  c: 'cage',
  b: 'combi',
  u: 'sudoku',
  d: 'board',
  m: 'move',
};

// Submode cycle order for each mode
const SUBMODE_CYCLES: Record<PenpaEditMode, string[]> = {
  surface: ['surface', 'dot', 'multicolor'],
  line: ['line', 'lineox', 'linedir', 'freeline', 'midline'],
  lineE: ['lineE', 'lineEox', 'freelineE', 'lineEdir'],
  wall: ['wall', 'cross'],
  number: ['number', 'numberS', 'sudoku', 'arrow'],
  symbol: ['circle', 'square', 'diamond', 'triangle', 'star', 'cross', 'ox', 'arrow'],
  special: ['thermo', 'nobulbthermo', 'arrows', 'direction', 'squareframe', 'polygon'],
  cage: ['cage', 'killercages', 'deletelineE'],
  combi: ['battleship', 'star', 'tents', 'magnets', 'akari', 'mines', 'masyu', 'yajilin'],
  sudoku: [],
  board: ['addline', 'delline', 'frame', 'white', 'black'],
  move: [],
};

// Color shortcuts (1-9, 0) - applies to surface mode
const COLOR_SHORTCUTS: Record<string, number> = {
  '1': 1,  // Light grey
  '2': 2,  // Grey
  '3': 3,  // Black
  '4': 4,  // Red
  '5': 5,  // Blue
  '6': 6,  // Green
  '7': 7,  // Yellow
  '8': 8,  // Purple
  '9': 9,  // Orange
  '0': 0,  // Transparent (delete)
};

// Style shortcuts for line modes (line, lineE, wall)
const STYLE_SHORTCUTS: Record<string, number> = {
  '1': 1, // Normal
  '2': 2, // Dotted
  '3': 3, // Dashed
  '4': 4, // Bold
  '5': 5, // Very Bold
  '6': 6, // X mark
  '7': 7, // Double
  '8': 8, // Delete
};

// Modes where color shortcuts apply
const COLOR_MODES: Set<PenpaEditMode> = new Set(['surface']);

// Modes where style shortcuts apply
const STYLE_MODES: Set<PenpaEditMode> = new Set(['line', 'lineE', 'wall']);

export interface PenpaKeyboardState {
  editMode: PenpaEditMode;
  layerMode: PenpaLayerMode;
  submode: string;
  styleIndex: number;
  colorIndex: number;
  secondaryColorIndex: number; // For color swap
  sizeIndex: number; // 0=L, 1=M, 2=S, 3=SS
}

const DEFAULT_STATE: PenpaKeyboardState = {
  editMode: 'surface',
  layerMode: 'question',
  submode: 'surface',
  styleIndex: 1,
  colorIndex: 1,
  secondaryColorIndex: 0, // Transparent/delete by default
  sizeIndex: 0,
};

// ============================================================================
// Pure Helper Functions
// ============================================================================

/**
 * Cycle through submodes for a given edit mode
 */
export function cycleSubmodeValue(
  editMode: PenpaEditMode,
  currentSubmode: string,
  direction: 1 | -1
): string {
  const submodes = SUBMODE_CYCLES[editMode];
  if (submodes.length === 0) return currentSubmode;

  const currentIndex = submodes.indexOf(currentSubmode);
  const nextIndex = (currentIndex + direction + submodes.length) % submodes.length;
  return submodes[nextIndex];
}

/**
 * Get default submode for an edit mode
 */
export function getDefaultSubmode(mode: PenpaEditMode): string {
  const submodes = SUBMODE_CYCLES[mode];
  return submodes[0] || mode;
}

/**
 * Parse size from key (1-4)
 */
export function parseSizeKey(key: string): number | null {
  const num = parseInt(key, 10);
  if (num >= 1 && num <= 4) {
    return num - 1;
  }
  return null;
}

/**
 * Parse size from letter (l, m, s)
 */
export function parseSizeLetter(key: string): number | null {
  const map: Record<string, number> = { l: 0, m: 1, s: 2 };
  return map[key] ?? null;
}

/**
 * Swap primary and secondary color indices
 */
export function swapColors(
  colorIndex: number,
  secondaryColorIndex: number
): { colorIndex: number; secondaryColorIndex: number } {
  return {
    colorIndex: secondaryColorIndex,
    secondaryColorIndex: colorIndex,
  };
}

// ============================================================================
// Hook Context Type
// ============================================================================

interface PenpaKeyboardContext {
  stateRef: React.MutableRefObject<PenpaKeyboardState>;
  setState: (updates: Partial<PenpaKeyboardState>) => void;
  cycleSubmode: (direction: 1 | -1) => void;
  swapColorIndices: () => void;
  undo: () => void;
  redo: () => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setActiveLayer: (layer: 'problem' | 'answer') => void;
  clearSelection: () => void;
  cancelOperation: () => void;
  canvas: { zoom: number; panX: number; panY: number };
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export interface UsePenpaKeyboardOptions {
  onModeChange?: (state: PenpaKeyboardState) => void;
  onClearSelection?: () => void;
  onCancelOperation?: () => void;
}

export function usePenpaKeyboard(
  optionsOrCallback?: UsePenpaKeyboardOptions | ((state: PenpaKeyboardState) => void)
) {
  // Support both old callback-only API and new options API
  const options: UsePenpaKeyboardOptions = typeof optionsOrCallback === 'function'
    ? { onModeChange: optionsOrCallback }
    : optionsOrCallback ?? {};

  const { onModeChange, onClearSelection, onCancelOperation } = options;

  const stateRef = useRef<PenpaKeyboardState>(DEFAULT_STATE);
  const {
    undo,
    redo,
    setZoom,
    setPan,
    canvas,
    setActiveLayer,
  } = usePuzzleStore();

  const setState = useCallback((updates: Partial<PenpaKeyboardState>) => {
    stateRef.current = { ...stateRef.current, ...updates };
    onModeChange?.(stateRef.current);
  }, [onModeChange]);

  const cycleSubmode = useCallback((direction: 1 | -1 = 1) => {
    const { editMode, submode } = stateRef.current;
    const newSubmode = cycleSubmodeValue(editMode, submode, direction);
    if (newSubmode !== submode) {
      setState({ submode: newSubmode });
    }
  }, [setState]);

  const swapColorIndices = useCallback(() => {
    const { colorIndex, secondaryColorIndex } = stateRef.current;
    const swapped = swapColors(colorIndex, secondaryColorIndex);
    setState(swapped);
  }, [setState]);

  const clearSelection = useCallback(() => {
    onClearSelection?.();
  }, [onClearSelection]);

  const cancelOperation = useCallback(() => {
    onCancelOperation?.();
  }, [onCancelOperation]);

  // ============================================================================
  // Shortcut Definitions
  // ============================================================================

  const shortcuts = useMemo((): KeyboardShortcut<PenpaKeyboardContext>[] => [
    // Undo/Redo
    {
      keys: ['z'],
      ctrl: true,
      preventDefault: true,
      run: (ctx) => ctx.shift ? ctx.redo() : ctx.undo(),
    },
    {
      keys: ['y'],
      ctrl: true,
      preventDefault: true,
      run: (ctx) => ctx.redo(),
    },

    // Zoom
    {
      keys: ['=', '+'],
      ctrl: true,
      preventDefault: true,
      run: (ctx) => ctx.setZoom(Math.min(ctx.canvas.zoom * 1.2, 5)),
    },
    {
      keys: ['-'],
      ctrl: true,
      preventDefault: true,
      run: (ctx) => ctx.setZoom(Math.max(ctx.canvas.zoom / 1.2, 0.2)),
    },
    {
      keys: ['0'],
      ctrl: true,
      preventDefault: true,
      run: (ctx) => {
        ctx.setZoom(1);
        ctx.setPan(0, 0);
      },
    },

    // Layer switching
    {
      keys: ['q'],
      ctrl: false,
      shift: false,
      preventDefault: true,
      run: (ctx) => {
        ctx.setState({ layerMode: 'question' });
        ctx.setActiveLayer('problem');
      },
    },
    {
      keys: ['a'],
      ctrl: false,
      shift: true,
      preventDefault: true,
      run: (ctx) => {
        ctx.setState({ layerMode: 'answer' });
        ctx.setActiveLayer('answer');
      },
    },
    {
      keys: ['tab'],
      preventDefault: true,
      run: (ctx) => {
        const newLayer = ctx.stateRef.current.layerMode === 'question' ? 'answer' : 'question';
        ctx.setState({ layerMode: newLayer });
        ctx.setActiveLayer(newLayer === 'question' ? 'problem' : 'answer');
      },
    },

    // Mode shortcuts
    ...Object.entries(MODE_SHORTCUTS).map(([k, mode]) => ({
      keys: [k],
      ctrl: false,
      alt: false,
      preventDefault: true,
      run: (ctx: PenpaKeyboardContext) => {
        if (mode === ctx.stateRef.current.editMode) {
          ctx.cycleSubmode(ctx.shift ? -1 : 1);
        } else {
          ctx.setState({
            editMode: mode,
            submode: getDefaultSubmode(mode),
          });
        }
      },
    })),

    // Space key behavior depends on mode:
    // - In surface mode: swap primary/secondary colors
    // - In other modes: cycle submode
    {
      keys: [' '],
      ctrl: false,
      alt: false,
      preventDefault: true,
      when: (ctx) => COLOR_MODES.has(ctx.stateRef.current.editMode),
      run: (ctx) => ctx.swapColorIndices(),
    },
    {
      keys: [' '],
      ctrl: false,
      alt: false,
      shift: true,
      preventDefault: true,
      when: (ctx) => !COLOR_MODES.has(ctx.stateRef.current.editMode),
      run: (ctx) => ctx.cycleSubmode(1),
    },
    {
      keys: [' '],
      ctrl: false,
      alt: false,
      shift: false,
      preventDefault: true,
      when: (ctx) => !COLOR_MODES.has(ctx.stateRef.current.editMode),
      run: (ctx) => ctx.cycleSubmode(-1),
    },

    // Escape: cancel current operation
    {
      keys: ['escape'],
      preventDefault: true,
      run: (ctx) => ctx.cancelOperation(),
    },

    // Delete/Backspace: clear selection
    {
      keys: ['delete', 'backspace'],
      ctrl: false,
      preventDefault: true,
      run: (ctx) => ctx.clearSelection(),
    },

    // Color shortcuts (number keys in surface mode)
    ...Object.keys(COLOR_SHORTCUTS).map((k) => ({
      keys: [k],
      ctrl: false,
      alt: false,
      shift: false,
      preventDefault: true,
      when: (ctx: PenpaKeyboardContext) => COLOR_MODES.has(ctx.stateRef.current.editMode),
      run: (ctx: PenpaKeyboardContext) => ctx.setState({ colorIndex: COLOR_SHORTCUTS[k] }),
    })),

    // Style shortcuts (number keys in line/lineE/wall modes)
    ...Object.keys(STYLE_SHORTCUTS).map((k) => ({
      keys: [k],
      ctrl: false,
      alt: false,
      shift: false,
      preventDefault: true,
      when: (ctx: PenpaKeyboardContext) => STYLE_MODES.has(ctx.stateRef.current.editMode),
      run: (ctx: PenpaKeyboardContext) => ctx.setState({ styleIndex: STYLE_SHORTCUTS[k] }),
    })),

    // Size shortcuts (Shift + 1-4)
    {
      keys: ['1', '2', '3', '4'],
      ctrl: false,
      shift: true,
      preventDefault: true,
      run: (ctx: PenpaKeyboardContext, key: string) => {
        const sizeIndex = parseSizeKey(key);
        if (sizeIndex !== null) {
          ctx.setState({ sizeIndex });
        }
      },
    },

    // Size shortcuts for symbol mode (l, m, s)
    {
      keys: ['l', 'm', 's'],
      ctrl: false,
      shift: false,
      alt: false,
      preventDefault: true,
      when: (ctx) => ctx.stateRef.current.editMode === 'symbol',
      run: (ctx: PenpaKeyboardContext, key: string) => {
        const sizeIndex = parseSizeLetter(key);
        if (sizeIndex !== null) {
          ctx.setState({ sizeIndex });
        }
      },
    },

    // Arrow key pan
    {
      keys: ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'],
      ctrl: false,
      preventDefault: true,
      run: (ctx: PenpaKeyboardContext, key: string) => {
        const panStep = ctx.shift ? 50 : 20;
        switch (key) {
          case 'arrowup':
            ctx.setPan(ctx.canvas.panX, ctx.canvas.panY + panStep);
            break;
          case 'arrowdown':
            ctx.setPan(ctx.canvas.panX, ctx.canvas.panY - panStep);
            break;
          case 'arrowleft':
            ctx.setPan(ctx.canvas.panX + panStep, ctx.canvas.panY);
            break;
          case 'arrowright':
            ctx.setPan(ctx.canvas.panX - panStep, ctx.canvas.panY);
            break;
        }
      },
    },
  ], []);

  // ============================================================================
  // Event Handler
  // ============================================================================

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (shouldIgnoreKeyEvent(e)) {
        return;
      }

      const context: PenpaKeyboardContext = {
        stateRef,
        setState,
        cycleSubmode,
        swapColorIndices,
        undo,
        redo,
        setZoom,
        setPan,
        setActiveLayer,
        clearSelection,
        cancelOperation,
        canvas,
        ctrl: e.ctrlKey || e.metaKey,
        shift: e.shiftKey,
        alt: e.altKey,
      };

      executeMatchingShortcut(shortcuts, e, context);
    },
    [undo, redo, setZoom, setPan, canvas, setActiveLayer, cycleSubmode, setState, swapColorIndices, clearSelection, cancelOperation, shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    state: stateRef.current,
    setState,
    cycleSubmode,
    swapColorIndices,
  };
}

export default usePenpaKeyboard;
