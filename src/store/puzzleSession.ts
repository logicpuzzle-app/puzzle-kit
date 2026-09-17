import type { PuzzleStore } from './slices/types';

/** Fresh editing state to apply together with a successfully replaced puzzle.
 * Viewport/tool preferences survive imports. New may override the viewport.
 * Clear the history manager only after the replacement has succeeded.
 */
export function freshPuzzleSession(state: Pick<PuzzleStore, 'canvas'>) {
  return {
    previewTopology: null,
    previewGrid: null,
    previewState: null,
    canvas: { ...state.canvas, isDrawing: false, isDragging: false, selection: [] },
    selectedElements: [],
    annotationSelection: null,
    hoverCell: null,
    cursorCell: null,
    numberSelection: null,
    highlightedLineIds: [],
    drawingLineIds: [],
    lastValidationResult: null,
    isValidationModalOpen: false,
    showCorrectMessage: false,
    hasShownCorrectMessage: false,
    trialStage: 0,
    trialStack: [],
  } satisfies Partial<PuzzleStore>;
}
