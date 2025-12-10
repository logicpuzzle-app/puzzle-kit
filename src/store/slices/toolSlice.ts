/**
 * Tool Slice - Tool settings and selection
 */

import type { ToolSlice, SliceCreator } from './types';
import { DEFAULT_TOOL_SETTINGS } from './types';
import { isLineToolCategory } from '../../utils/lineRender';

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

      // Clear line highlight when switching away from line-related categories
      const isLineCategory = isLineToolCategory(category);
      const wasLineCategory = isLineToolCategory(state.toolSettings.currentCategory);
      const shouldClearHighlight = wasLineCategory && !isLineCategory;

      return {
        toolSettings: {
          ...state.toolSettings,
          currentTool: tool,
          currentCategory: category,
        },
        numberSelection: newNumberSelection,
        // Clear highlighted lines when leaving line mode
        ...(shouldClearHighlight ? { highlightedLineIds: [] } : {}),
      };
    }),

  // Grid mode subtabs (only used when activeLayer === 'grid')
  gridSubTab: 'shape' as const,
  setGridSubTab: (tab) => set({ gridSubTab: tab }),
  gridEditMode: 'preset' as const,
  setGridEditMode: (mode) => set({ gridEditMode: mode }),

  // Saved tool settings for normal mode (separate from constraint mode)
  savedNormalToolSettings: {
    problem: { tool: 'surface-fill', category: 'surface' },
    answer: { tool: 'surface-fill', category: 'surface' },
  },
  setSavedNormalToolSettings: (layer, tool, category) =>
    set((state) => ({
      savedNormalToolSettings: {
        ...state.savedNormalToolSettings,
        [layer]: { tool, category },
      },
    })),

  // UI panels
  isPropertiesPanelOpen: true,
  setPropertiesPanelOpen: (open) => set({ isPropertiesPanelOpen: open }),
  togglePropertiesPanel: () => set((state) => ({ isPropertiesPanelOpen: !state.isPropertiesPanelOpen })),
});
