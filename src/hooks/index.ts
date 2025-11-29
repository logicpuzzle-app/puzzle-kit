/**
 * Hooks Index
 *
 * Re-exports all custom hooks for puzzle editing
 */

export { useKeyboardShortcuts } from './useKeyboardShortcuts';
export { useCanvasInteraction } from './useCanvasInteraction';
export {
  usePenpaKeyboard,
  type PenpaKeyboardState,
} from './usePenpaKeyboard';
export {
  usePenpaTouch,
  type TouchPoint,
  type TouchGesture,
  type UsePenpaTouchOptions,
} from './usePenpaTouch';
export {
  useRectangleSelect,
  findPointsInBounds,
  findCellsInBounds,
  type SelectionRect,
  type SelectionBounds,
  type UseRectangleSelectOptions,
  type SelectionOverlayProps,
} from './useRectangleSelect';
export {
  useRightClick,
  getRightClickAction,
  type RightClickAction,
  type RightClickEvent,
  type UseRightClickOptions,
} from './useRightClick';
export { useStoragePersistence } from './useStoragePersistence';
