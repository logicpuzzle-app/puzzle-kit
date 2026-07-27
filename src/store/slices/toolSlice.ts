/**
 * Tool Slice - Tool settings and selection
 */

import type { ToolSlice, SliceCreator } from './types';
import type { LineGridPoint } from '../../types';
import { DEFAULT_TOOL_SETTINGS } from './types';
import { isLineToolCategory } from '../../utils/lineRender';

export const createToolSlice: SliceCreator<ToolSlice> = (set, get) => ({
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

      // Keep symbol submode consistent with the actual symbol tool.
      // This avoids cases where UI shows multicolor while clicks place symbols (or vice versa).
      const nextSymbolSubMode =
        category === 'symbol'
          ? tool === 'multicolor-surface'
            ? 'multicolor'
            : tool.startsWith('symbol-arrow')
              ? 'direction'
              : tool.startsWith('symbol')
                ? 'icon'
                : state.toolSettings.symbolSubMode
          : state.toolSettings.symbolSubMode;
      const nextSymbolGridPoints: LineGridPoint[] = tool.startsWith('symbol-arrow')
        ? ['cell']
        : state.toolSettings.symbolGridPoints;

      // Save tool per-layer for normal mode (problem/answer), so layer switches restore correctly.
      const activeLayer = get().activeLayer;
      const showConstraintLayer = get().showConstraintLayer;
      const currentSchemaId = get().currentSchemaId;
      const isConstraintEnabled = showConstraintLayer && Boolean(currentSchemaId) && currentSchemaId !== '__custom__';
      const shouldSaveNormalTool =
        !isConstraintEnabled && (activeLayer === 'problem' || activeLayer === 'answer');

      return {
        toolSettings: {
          ...state.toolSettings,
          currentTool: tool,
          currentCategory: category,
          ...(nextSymbolGridPoints !== state.toolSettings.symbolGridPoints ? { symbolGridPoints: nextSymbolGridPoints } : {}),
          ...(nextSymbolSubMode !== state.toolSettings.symbolSubMode ? { symbolSubMode: nextSymbolSubMode } : {}),
        },
        numberSelection: newNumberSelection,
        // Clear highlighted lines when leaving line mode
        ...(shouldClearHighlight ? { highlightedLineIds: [] } : {}),
        ...(shouldSaveNormalTool
          ? {
              savedNormalToolSettings: {
                ...state.savedNormalToolSettings,
                [activeLayer]: { tool, category },
              },
            }
          : {}),
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
