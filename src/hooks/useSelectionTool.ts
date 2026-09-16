import { useCallback, useRef, useState, useEffect } from 'react';
import { usePuzzleStore, usePuzzleStoreApi } from '../store/puzzleStoreContext';
import { annotationScope, sameAnnotationScope, selectedAnnotations, selectableAnnotations, sameAnnotation } from '../utils/annotationSelection';
import type { AnnotationSelection, AnnotationRef } from '../utils/annotationSelection';
import type { Point } from '../types';

export interface SelectionRect { startX: number; startY: number; endX: number; endY: number }
interface PendingSelection {
  start: Point;
  scope: Omit<AnnotationSelection, 'refs'>;
  previous: AnnotationRef[];
  add: boolean;
}

/** Point annotations retain record kinds and board scope through mouse/touch selection. */
export function useSelectionTool({ getMousePosition }: { getMousePosition: (e: MouseEvent) => Point }) {
  const state = usePuzzleStore();
  const store = usePuzzleStoreApi();
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const pending = useRef<PendingSelection | null>(null);
  const pointers = useRef(new Set<number>());
  const captured = useRef<Element | null>(null);
  const cancelled = useRef(false);
  const cancelSelection = useCallback(() => { pending.current = null; setSelectionRect(null); }, []);

  useEffect(() => {
    cancelSelection();
    const current = store.getState();
    if (current.annotationSelection && !sameAnnotationScope(current.annotationSelection, annotationScope(current))) current.clearAnnotationSelection();
    for (const id of pointers.current) if (captured.current?.hasPointerCapture(id)) captured.current.releasePointerCapture(id);
    pointers.current.clear(); cancelled.current = false;
    return cancelSelection;
  }, [state.grid, state.topology, state.useTopology, state.activeLayer, state.isPlayerMode,
    state.showProblemLayer, state.showAnswerLayer, state.toolSettings.currentTool, state.canvas.panMode, store, cancelSelection]);

  const handleSelectTool = useCallback((point: Point, add: boolean) => {
    const current = store.getState(), scope = annotationScope(current);
    if (!scope) return;
    pending.current = { start: point, scope, previous: selectedAnnotations(current), add };
    setSelectionRect({ startX: point.x, startY: point.y, endX: point.x, endY: point.y });
  }, [store]);
  const handleSelectMove = useCallback((point: Point) => {
    const gesture = pending.current;
    if (!gesture) return;
    if (!sameAnnotationScope(gesture.scope, annotationScope(store.getState()))) { cancelSelection(); return; }
    setSelectionRect({ startX: gesture.start.x, startY: gesture.start.y, endX: point.x, endY: point.y });
  }, [store, cancelSelection]);
  const handleSelectEnd = useCallback((point: Point) => {
    const gesture = pending.current, current = store.getState();
    cancelSelection();
    if (!gesture || !sameAnnotationScope(gesture.scope, annotationScope(current))) return;
    const candidates = selectableAnnotations(current);
    let hits: AnnotationRef[] = [];
    if (Math.hypot(point.x - gesture.start.x, point.y - gesture.start.y) * current.canvas.zoom > 5) {
      const minX = Math.min(point.x, gesture.start.x), maxX = Math.max(point.x, gesture.start.x);
      const minY = Math.min(point.y, gesture.start.y), maxY = Math.max(point.y, gesture.start.y);
      hits = candidates.filter(a => a.position.x >= minX && a.position.x <= maxX && a.position.y >= minY && a.position.y <= maxY);
    } else {
      const distances = candidates.map(a => ({ ...a, distance: Math.hypot(a.position.x - point.x, a.position.y - point.y) }));
      const distance = Math.min(...distances.map(a => a.distance));
      if (distance <= current.grid.cellSize * 0.55) {
        const closest = distances.filter(a => Math.abs(a.distance - distance) < 1e-7);
        const position = closest[0]?.position;
        // Different equidistant targets are ambiguous; same-position notes can be selected together.
        if (position && closest.every(a => Math.hypot(a.position.x - position.x, a.position.y - position.y) < 1e-7)) hits = closest;
      }
    }
    current.setAnnotationSelection(gesture.add ? [...gesture.previous, ...hits.filter(a => !gesture.previous.some(b => sameAnnotation(a, b)))] : hits);
  }, [store, cancelSelection]);

  const handleSelectionPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    pointers.current.add(e.pointerId);
    captured.current = e.currentTarget;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (pointers.current.size > 1) { cancelled.current = true; cancelSelection(); return; }
    cancelled.current = false;
    if (e.button === 0) handleSelectTool(getMousePosition(e as unknown as MouseEvent), e.shiftKey || e.ctrlKey || e.metaKey);
  }, [getMousePosition, handleSelectTool, cancelSelection]);
  const handleSelectionPointerMove = useCallback((e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId) && !cancelled.current) handleSelectMove(getMousePosition(e as unknown as MouseEvent));
  }, [handleSelectMove, getMousePosition]);
  const handleSelectionPointerUp = useCallback((e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    if (e.type === 'pointercancel') { cancelled.current = true; cancelSelection(); }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    pointers.current.delete(e.pointerId);
    if (!pointers.current.size) {
      if (!cancelled.current) handleSelectEnd(getMousePosition(e as unknown as MouseEvent));
      cancelled.current = false;
    }
  }, [cancelSelection, handleSelectEnd, getMousePosition]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && store.getState().toolSettings.currentTool === 'select') {
        cancelSelection(); store.getState().clearAnnotationSelection();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [store, cancelSelection]);

  return { isSelecting: selectionRect !== null, selectionRect, handleSelectTool,
    handleSelectionPointerDown, handleSelectionPointerMove, handleSelectionPointerUp };
}
