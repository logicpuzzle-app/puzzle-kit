/**
 * Tool Slice - Tool settings and selection
 */

import type { ToolSlice, SliceCreator } from './types';
import { DEFAULT_TOOL_SETTINGS } from './types';

export const createToolSlice: SliceCreator<ToolSlice> = (set) => ({
  toolSettings: { ...DEFAULT_TOOL_SETTINGS },

  setToolSettings: (settings) =>
    set((state) => ({
      toolSettings: { ...state.toolSettings, ...settings },
    })),

  setTool: (tool, category) =>
    set((state) => {
      const isNumberTool = tool.startsWith('number');
      const wasNumberTool = state.toolSettings.currentTool.startsWith('number');

      // When switching TO number tool and not already a number tool,
      // set default cursor to top-left cell (0, 0)
      const newNumberSelection =
        isNumberTool && !wasNumberTool && !state.numberSelection
          ? { row: 0, col: 0 }
          : state.numberSelection;

      return {
        toolSettings: {
          ...state.toolSettings,
          currentTool: tool,
          currentCategory: category,
        },
        numberSelection: newNumberSelection,
      };
    }),

  // Grid mode
  isGridMode: true,
  setGridMode: (isGridMode) => set({ isGridMode }),
  gridSubTab: 'shape' as const,
  setGridSubTab: (tab) => set({ gridSubTab: tab }),
  gridEditMode: 'preset' as const,
  setGridEditMode: (mode) => set({ gridEditMode: mode }),

  // UI panels
  isPropertiesPanelOpen: true,
  setPropertiesPanelOpen: (open) => set({ isPropertiesPanelOpen: open }),
  togglePropertiesPanel: () => set((state) => ({ isPropertiesPanelOpen: !state.isPropertiesPanelOpen })),
});
