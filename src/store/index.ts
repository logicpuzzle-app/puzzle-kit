/**
 * Store Module Exports
 *
 * Central export point for all store-related functionality
 */

// Main puzzle store
export { usePuzzleStore } from './puzzleStore';

// Action system
export {
  type PuzzleAction,
  type AddSurfaceAction,
  type RemoveSurfaceAction,
  type AddLineAction,
  type RemoveLineAction,
  type AddEdgeAction,
  type RemoveEdgeAction,
  type AddWallAction,
  type RemoveWallAction,
  type AddNumberAction,
  type RemoveNumberAction,
  type UpdateNumberAction,
  type AddSymbolAction,
  type RemoveSymbolAction,
  type AddCageAction,
  type RemoveCageAction,
  type AddSpecialAction,
  type RemoveSpecialAction,
  type SetActiveLayerAction,
  type ClearLayerAction,
  type SetGridAction,
  type BatchAction,
  createAddSurfaceAction,
  createRemoveSurfaceAction,
  createAddLineAction,
  createRemoveLineAction,
  createAddEdgeAction,
  createRemoveEdgeAction,
  createAddWallAction,
  createRemoveWallAction,
  createAddNumberAction,
  createRemoveNumberAction,
  createUpdateNumberAction,
  createAddSymbolAction,
  createRemoveSymbolAction,
  createAddCageAction,
  createRemoveCageAction,
  createAddSpecialAction,
  createRemoveSpecialAction,
  createBatchAction,
  reverseAction,
  getActionDescription,
} from './actions';

// Action executor
export {
  ActionExecutor,
  actionExecutor,
  type PuzzleStateSlice,
  type StateMutator,
} from './actionExecutor';

// History manager
export {
  HistoryManager,
  historyManager,
  type HistoryEntry,
  type HistoryState,
  type HistoryListener,
} from './historyManager';

// Persistence
export {
  PersistenceManager,
  persistenceManager,
  usePersistence,
  type PersistedState,
  type PuzzleSlot,
} from './persistence';

// Store integration hooks
export {
  useStoreIntegration,
  useHistory,
  useHistoryKeyboard,
} from './useStoreIntegration';

// Penpa-compatible command stack
export {
  PenpaCommandStack,
  penpaCommandStack,
  createSetCommand,
  reverseCommand,
  reverseBatchCommand,
  reverseCommandEntry,
  flattenCommandEntry,
  actionToPenpaCommand,
  syncHistoryToCommandStack,
  isBatchCommand,
  type PenpaCommand,
  type PenpaBatchCommand,
  type PenpaCommandEntry,
} from './penpaCommandStack';
