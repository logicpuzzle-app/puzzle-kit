import { useEffect, useCallback } from 'react';
import { usePuzzleStore } from '../store/puzzleStore';

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
    canvas,
  } = usePuzzleStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if focus is on input element
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const key = e.key.toLowerCase();

      // Undo/Redo
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

      // Zoom shortcuts
      if (ctrl && (key === '=' || key === '+')) {
        e.preventDefault();
        setZoom(canvas.zoom * 1.2);
        return;
      }

      if (ctrl && key === '-') {
        e.preventDefault();
        setZoom(canvas.zoom / 1.2);
        return;
      }

      if (ctrl && key === '0') {
        e.preventDefault();
        setZoom(1);
        setPan(0, 0);
        return;
      }

      // Tab to toggle layer
      if (key === 'tab' && !ctrl) {
        e.preventDefault();
        setActiveLayer(activeLayer === 'problem' ? 'answer' : 'problem');
        return;
      }

      // Color swap with Space
      if (key === ' ' && !ctrl) {
        e.preventDefault();
        setToolSettings({
          color: toolSettings.secondaryColor,
          secondaryColor: toolSettings.color,
        });
        return;
      }

      // Delete/Backspace - clear selection or current layer content
      if (key === 'delete' || key === 'backspace') {
        // This would require selection support to be useful
        return;
      }

      // Escape - deselect / cancel
      if (key === 'escape') {
        e.preventDefault();
        // Could clear selection here
        return;
      }
    },
    [undo, redo, setToolSettings, toolSettings, activeLayer, setActiveLayer, setZoom, setPan, canvas.zoom]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
