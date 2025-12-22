// Runtime entrypoint: state store and command executor (UI-agnostic).
export { usePuzzleStore, createPuzzleStore } from '../store/puzzleStore';
export type { PuzzleStore } from '../store/slices/types';
export { actionExecutor } from '../store/actionExecutor';
export { createModalStore } from '../store/modalStore';
export type { ModalStore } from '../store/modalStore';
