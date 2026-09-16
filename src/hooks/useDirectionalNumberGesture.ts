import { useCallback, useEffect, useRef } from 'react';
import { usePuzzleStoreApi } from '../store/puzzleStoreContext';
import type { PuzzleStore } from '../store/slices/types';
import type { Point } from '../types';
import { getEditableDataLayer } from '../utils/editPolicy';
import { resolveCell } from '../utils/pointResolver';
import { resolveCellSelection } from '../utils/cellSelection';
import { shouldAllowOutboardForTool } from '../utils/outboardPolicy';
import { constraintCatalog } from '../constraints';
import { getAutoModeConfig } from '../constraints/inputModeMapping';
import { calculateFlickDirection } from './inputStrategies';
import { buildDirectionalClueIncrementPlan, findDirectionalNumberByCellId, findNumberEntry, getDirectionalClueValueFields, toPenpaDirectionalClue } from '../utils/numberEntries';

function mode(state: PuzzleStore) {
  if (state.canvas.panMode || !getEditableDataLayer(state.activeLayer, state.isPlayerMode)) return null;
  const schema = state.currentSchemaId ? constraintCatalog.getSchema(state.currentSchemaId) : null;
  const auto = getAutoModeConfig(schema, state.activeLayer === 'problem');
  if (state.showConstraintLayer && schema && (state.currentInputMode === 'direc' || (state.currentInputMode === 'auto' && auto.type === 'direc'))) return 'constraint';
  return state.toolSettings.currentTool === 'number-directional' && (state.toolSettings.numberInputMode ?? 'number') === 'number' ? 'tool' : null;
}

interface Gesture {
  board: PuzzleStore;
  cellId: string;
  center: Point;
  start: Point;
  right: boolean;
  inputted: boolean;
  ownsHistory: boolean;
}

function valid(gesture: Gesture, state: PuzzleStore) {
  const old = gesture.board;
  return old.grid === state.grid && old.topology === state.topology && old.useTopology === state.useTopology &&
    old.activeLayer === state.activeLayer && old.isPlayerMode === state.isPlayerMode &&
    old.toolSettings.currentTool === state.toolSettings.currentTool && old.toolSettings.numberInputMode === state.toolSettings.numberInputMode &&
    old.currentInputMode === state.currentInputMode && old.currentSchemaId === state.currentSchemaId && old.showConstraintLayer === state.showConstraintLayer &&
    old.canvas.panMode === state.canvas.panMode && old.canvas.zoom === state.canvas.zoom && old.canvas.panX === state.canvas.panX && old.canvas.panY === state.canvas.panY &&
    mode(state) !== null && resolveCellSelection(state, { cellId: gesture.cellId }) !== null;
}

/** Mouse, touch and pen use the same resolved target; no row/column identity. */
export function useDirectionalNumberGesture(handleNumberTool: (point: Point, right: boolean, options?: { cellId?: string }) => void) {
  const store = usePuzzleStoreApi();
  const pending = useRef<Gesture | null>(null);
  const cancel = useCallback(() => {
    const gesture = pending.current;
    pending.current = null;
    if (gesture?.ownsHistory) gesture.board.historyManager.endGroup();
  }, []);
  useEffect(() => {
    const unsubscribe = store.subscribe(state => {
      if (pending.current && !valid(pending.current, state)) cancel();
    });
    return () => { unsubscribe(); cancel(); };
  }, [store, cancel]);

  const begin = useCallback((point: Point, right = false, ownsHistory = true) => {
    cancel();
    const state = store.getState(), inputMode = mode(state);
    if (!inputMode) return false;
    const cell = resolveCell(point, state, { allowOutboard: inputMode === 'constraint' ? state.activeLayer === 'problem' : shouldAllowOutboardForTool(state.toolSettings.currentTool, state.activeLayer) });
    // This mode owns the event even outside the board; don't fall through to another tool.
    if (!cell?.center || !resolveCellSelection(state, { cellId: cell.cellId })) return true;
    state.setNumberSelection({ cellId: cell.cellId });
    pending.current = { board: state, cellId: cell.cellId, center: cell.center, start: point, right, inputted: false, ownsHistory };
    if (ownsHistory) state.startHistoryGroup();
    const layer = getEditableDataLayer(state.activeLayer, state.isPlayerMode)!;
    if (right && inputMode === 'tool') {
      const existing = findDirectionalNumberByCellId(state.puzzle[layer].numbers, cell.cellId);
      if (existing) state.removeDirectionalClue(existing.id);
      pending.current!.inputted = true;
    }
    return true;
  }, [store, cancel]);

  const move = useCallback((point: Point) => {
    const gesture = pending.current, state = store.getState();
    if (!gesture) return;
    if (!valid(gesture, state)) { cancel(); return; }
    if (gesture.right) return;
    const layer = getEditableDataLayer(state.activeLayer, state.isPlayerMode)!;
    const { direction, angle } = calculateFlickDirection(point.x - gesture.start.x, point.y - gesture.start.y, state.grid.cellSize * 0.3, gesture.cellId, state.useTopology ? state.topology : null);
    if (direction === 0 && angle === null) return;
    // Crossing the threshold is a drag even if the direction didn't change.
    gesture.inputted = true;
    const entry = findDirectionalNumberByCellId(state.puzzle[layer].numbers, gesture.cellId);
    const clue = entry ? toPenpaDirectionalClue(entry.number) : null;
    if (clue) {
      if (clue.direction !== direction || clue.angle !== angle) state.addDirectionalClue({ ...clue, direction, angle });
    } else {
      const number = findNumberEntry(state.puzzle[layer].numbers, gesture.cellId, 'center');
      if (number) state.addDirectionalClue({ cellId: gesture.cellId, ...getDirectionalClueValueFields(number.number.value), direction, angle, color: number.number.color, objectKey: number.number.objectKey, layer });
    }
  }, [store, cancel]);

  const finish = useCallback((point: Point, tap = true) => {
    const gesture = pending.current, state = store.getState();
    if (!gesture) return;
    try {
      if (!valid(gesture, state) || gesture.inputted || !tap) return;
      const inputMode = mode(state);
      const cell = resolveCell(point, state, { allowOutboard: inputMode === 'constraint' ? state.activeLayer === 'problem' : shouldAllowOutboardForTool(state.toolSettings.currentTool, state.activeLayer) });
      if (cell?.cellId !== gesture.cellId) return;
      if (inputMode === 'constraint') {
        handleNumberTool(gesture.center, gesture.right, { cellId: gesture.cellId });
      } else if (!gesture.right) {
        const layer = getEditableDataLayer(state.activeLayer, state.isPlayerMode)!;
        const entry = findDirectionalNumberByCellId(state.puzzle[layer].numbers, gesture.cellId);
        const plan = buildDirectionalClueIncrementPlan({ cellId: gesture.cellId, layer, existingClue: entry ? toPenpaDirectionalClue(entry.number) : null, existingNumber: findNumberEntry(state.puzzle[layer].numbers, gesture.cellId, 'center') });
        // addNumber replaces the existing center entry atomically; do not delete the replacement.
        if (plan.type !== 'noop') state.addDirectionalClue(plan.clue);
      }
    } finally { cancel(); }
  }, [store, cancel, handleNumberTool]);

  return { begin, move, finish, cancel };
}
export type DirectionalNumberGesture = ReturnType<typeof useDirectionalNumberGesture>;
