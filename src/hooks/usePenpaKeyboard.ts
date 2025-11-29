/**
 * Penpa-compatible Keyboard Shortcuts
 *
 * Implements keyboard shortcuts matching Penpa-edit behavior
 */

import { useEffect, useCallback, useRef } from 'react';
import { usePuzzleStore } from '../store/puzzleStore';
import type { PenpaEditMode, PenpaLayerMode } from '../types/penpaModes';
import { getModeShortcut } from '../types/penpaModes';

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

// Color shortcuts (1-9, 0)
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

// Style shortcuts for line modes
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

export interface PenpaKeyboardState {
  editMode: PenpaEditMode;
  layerMode: PenpaLayerMode;
  submode: string;
  styleIndex: number;
  colorIndex: number;
  sizeIndex: number; // 0=L, 1=M, 2=S, 3=SS
}

const DEFAULT_STATE: PenpaKeyboardState = {
  editMode: 'surface',
  layerMode: 'question',
  submode: 'surface',
  styleIndex: 1,
  colorIndex: 1,
  sizeIndex: 0,
};

export function usePenpaKeyboard(
  onModeChange?: (state: PenpaKeyboardState) => void
) {
  const stateRef = useRef<PenpaKeyboardState>(DEFAULT_STATE);
  const {
    undo,
    redo,
    setZoom,
    setPan,
    canvas,
    setActiveLayer,
    activeLayer,
  } = usePuzzleStore();

  const setState = useCallback((updates: Partial<PenpaKeyboardState>) => {
    stateRef.current = { ...stateRef.current, ...updates };
    onModeChange?.(stateRef.current);
  }, [onModeChange]);

  const cycleSubmode = useCallback((direction: 1 | -1 = 1) => {
    const { editMode, submode } = stateRef.current;
    const submodes = SUBMODE_CYCLES[editMode];
    if (submodes.length === 0) return;

    const currentIndex = submodes.indexOf(submode);
    const nextIndex = (currentIndex + direction + submodes.length) % submodes.length;
    setState({ submode: submodes[nextIndex] });
  }, [setState]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if in input element
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    ) {
      return;
    }

    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const alt = e.altKey;
    const key = e.key.toLowerCase();

    // ===============================
    // Undo/Redo (Ctrl+Z, Ctrl+Y)
    // ===============================
    if (ctrl && key === 'z') {
      e.preventDefault();
      if (shift) {
        redo();
      } else {
        undo();
      }
      return;
    }

    if (ctrl && key === 'y') {
      e.preventDefault();
      redo();
      return;
    }

    // ===============================
    // Zoom (Ctrl+/-/0)
    // ===============================
    if (ctrl && (key === '=' || key === '+')) {
      e.preventDefault();
      setZoom(Math.min(canvas.zoom * 1.2, 5));
      return;
    }

    if (ctrl && key === '-') {
      e.preventDefault();
      setZoom(Math.max(canvas.zoom / 1.2, 0.2));
      return;
    }

    if (ctrl && key === '0') {
      e.preventDefault();
      setZoom(1);
      setPan(0, 0);
      return;
    }

    // ===============================
    // Layer mode (Q/A/Tab)
    // ===============================
    if (!ctrl && !shift && key === 'q') {
      e.preventDefault();
      setState({ layerMode: 'question' });
      setActiveLayer('problem');
      return;
    }

    // 'A' without modifiers conflicts with mode shortcut in some setups
    // Use shift+A for answer layer to avoid conflicts
    if (!ctrl && shift && key === 'a') {
      e.preventDefault();
      setState({ layerMode: 'answer' });
      setActiveLayer('answer');
      return;
    }

    if (!ctrl && key === 'tab') {
      e.preventDefault();
      const newLayer = stateRef.current.layerMode === 'question' ? 'answer' : 'question';
      setState({ layerMode: newLayer });
      setActiveLayer(newLayer === 'question' ? 'problem' : 'answer');
      return;
    }

    // ===============================
    // Mode switching (single letter)
    // ===============================
    if (!ctrl && !alt && MODE_SHORTCUTS[key]) {
      e.preventDefault();
      const newMode = MODE_SHORTCUTS[key];

      // If same mode, cycle submode
      if (newMode === stateRef.current.editMode) {
        cycleSubmode(shift ? -1 : 1);
      } else {
        // Switch to new mode with first submode
        const submodes = SUBMODE_CYCLES[newMode];
        setState({
          editMode: newMode,
          submode: submodes[0] || newMode,
        });
      }
      return;
    }

    // ===============================
    // Color selection (number keys without modifiers)
    // ===============================
    if (!ctrl && !shift && !alt && COLOR_SHORTCUTS[key] !== undefined) {
      // Only apply to surface mode
      if (stateRef.current.editMode === 'surface') {
        e.preventDefault();
        setState({ colorIndex: COLOR_SHORTCUTS[key] });
        return;
      }
    }

    // ===============================
    // Style selection (number keys in line modes)
    // ===============================
    if (!ctrl && !shift && !alt && STYLE_SHORTCUTS[key] !== undefined) {
      const { editMode } = stateRef.current;
      if (editMode === 'line' || editMode === 'lineE' || editMode === 'wall') {
        e.preventDefault();
        setState({ styleIndex: STYLE_SHORTCUTS[key] });
        return;
      }
    }

    // ===============================
    // Size selection (L/M/S keys in symbol mode)
    // ===============================
    if (!ctrl && !shift && !alt && stateRef.current.editMode === 'symbol') {
      if (key === 'l') {
        e.preventDefault();
        setState({ sizeIndex: 0 }); // L
        return;
      }
      if (key === 'm') {
        e.preventDefault();
        setState({ sizeIndex: 1 }); // M
        return;
      }
      if (key === 's') {
        e.preventDefault();
        setState({ sizeIndex: 2 }); // S
        return;
      }
    }

    // ===============================
    // Space - color swap / right-click behavior toggle
    // ===============================
    if (key === ' ' && !ctrl) {
      e.preventDefault();
      // Toggle between primary and secondary color
      return;
    }

    // ===============================
    // Escape - cancel current operation
    // ===============================
    if (key === 'escape') {
      e.preventDefault();
      return;
    }

    // ===============================
    // Arrow keys - pan view
    // ===============================
    if (!ctrl && (key === 'arrowup' || key === 'arrowdown' || key === 'arrowleft' || key === 'arrowright')) {
      const panStep = shift ? 50 : 20;
      e.preventDefault();
      switch (key) {
        case 'arrowup':
          setPan(canvas.panX, canvas.panY + panStep);
          break;
        case 'arrowdown':
          setPan(canvas.panX, canvas.panY - panStep);
          break;
        case 'arrowleft':
          setPan(canvas.panX + panStep, canvas.panY);
          break;
        case 'arrowright':
          setPan(canvas.panX - panStep, canvas.panY);
          break;
      }
      return;
    }

    // ===============================
    // Delete/Backspace - clear
    // ===============================
    if (key === 'delete' || key === 'backspace') {
      e.preventDefault();
      // Would clear selection or current element
      return;
    }
  }, [undo, redo, setZoom, setPan, canvas, setActiveLayer, cycleSubmode, setState]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    state: stateRef.current,
    setState,
    cycleSubmode,
  };
}

export default usePenpaKeyboard;
