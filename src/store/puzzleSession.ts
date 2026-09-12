import type { PuzzleStore } from './slices/types';

/** Fresh editing state to apply together with a successfully replaced puzzle.
 * Viewport/tool preferences survive imports. New may override the viewport.
 * Clear the history manager only after the replacement has succeeded.
 */
export function freshPuzzleSession(state: Pick<PuzzleStore, 'canvas'>) {
  return {
    canvas: { ...state.canvas, isDrawing: false, isDragging: false, selection: [] },
    selectedElements: [],
    hoverCell: null,
    cursorCell: null,
    numberSelection: null,
    highlightedLineIds: [],
    drawingLineIds: [],
    trialStage: 0,
    trialStack: [],
  } satisfies Partial<PuzzleStore>;
}
